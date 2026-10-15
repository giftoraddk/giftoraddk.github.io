/**
 * /v1/fn/* — the departments' pipelines, run server-side so their method never reaches a browser.
 *   GET  /v1/fn/sectors                 public — sector groups + departments + faces   (fn/talk.ts)
 *   POST /v1/fn/log · /chat · /aide     chat log append, one head's reply, the guest consult (fn/talk.ts)
 *   GET  /v1/fn/jobs/:id                one job of the caller (fn/talk.ts)
 *   GET|POST /v1/fn/override[/:div]     admin — a department's platform override + face (fn/admin.ts)
 *   GET  /v1/fn/spec/:division          outline of one department (keys/labels/order, no role/task/desc)
 *   GET  /v1/fn/log?sector=             the caller's chat + jobs of one sector
 *   POST /v1/fn/jobs                    { division, topic, language?, colors?, inputs? } — no `task`
 *   *    /v1/fn/tasks[/:id[/next|rerun|verify]]  a sector + topic task: the secretary → the planned departments (fn/tasks.ts)
 *   POST /v1/fn/jobs/:id/call           { stepId, callKey, instruction? } → { fields, status, pausedStepId }
 *   POST /v1/fn/jobs/:id/resume         (no body read) approve the paused text step → the next one may run
 *   POST /v1/fn/jobs/:id/image          { choice: 'ai'|'skip', pics? } — approved: a new picture (pics) only
 *   POST /v1/fn/jobs/:id/fields         { fields } — the boss edits fields by hand; approved: its output fields only, and
 *                                       the record + knowledge its approve wrote follow (syncApproved)
 *   POST /v1/fn/jobs/:id/approve        { expertReview?: { confirmed, by } } done → platform table (owner '' only) + approved
 *                                       (+ a task job's handoffs); expertReview is required where the sector's review covers it
 * Owner = resolveCaller() (JWT); every job read checks it. Status is derived (state.ts jobState), never sent in.
 * Access per sector = fn/trial.ts modeOf (in specFor): full, or trial — a trial job (`trial`) runs each call once.
 */
import { json, HttpError } from '../lib/http';
import { D1Client, coerceOut } from '../d1';
import type { DataEnv } from '../data';
import type { AiEnv } from '../ai';
import type { SearchEnv } from '../search';
import { allowAi, AI_LIMIT_PERIOD_S, type RateLimitEnv } from '../rateLimit';
import { resolveCaller, type Caller } from './owner';
import { generateJson } from './generate';
import { handleTalkRoute } from './talk';
import { handleAdminRoute } from './admin';
import { handleTaskRoute, artifactInputs, writeArtifacts } from './tasks';
import { assertJobQuota, afterApprove, syncKnow } from './jobs';
import { parseDivisionId, resolveSpec, promptVars, lensOf, reviewOf } from './registry.ts';
import { requireMode, withTrial, type Mode, type TrialEnv } from './trial.ts';
import { toOutline } from './outline.ts';
import { buildCallPrompt } from './prompt.ts';
import { pickFields, plainText, FIELD_MAX } from './parse.ts';
import { callsOf, canRunCall, jobState, imageGateOpen, type JobState } from './state.ts';
import { figureHtml, stripLeadingFigure, sanitizeHtml } from './sanitize.ts';
import { parsePatch, stripCodeOwned } from './override.ts';
import { readBody, JOB_BODY_MAX } from '../lib/body.ts';
import { knowledgeText } from '../search';
import { stripTags, dataLabel, type SignOff } from './artifacts.ts';
import { initialFields, langOf, TOPIC_MAX, INPUT_MAX } from './jobRow.ts';
import { str, now, plain } from './util.ts';
import { retentionCutoff } from './retention.ts';
import { LANGS, isSystemFn, type FnKey, type FnSpec, type Rec, type StepSpec } from './types.ts';

export type FnEnv = DataEnv & AiEnv & RateLimitEnv & SearchEnv & TrialEnv & { AUTH_URL?: string };

// 'sectors' is handled entirely by fn/talk.ts (handleTalkRoute, dispatched before this regex ever runs).
const FN_PATH = /^\/v1\/fn\/(spec|log|jobs)(?:\/([A-Za-z0-9._-]{1,128}))?(?:\/(call|resume|image|fields|approve))?$/;
const NOTE_MAX = 2000;
const SIGNOFF_NAME_MAX = 120; // the reviewer's name as the approver types it
const STEP_KNOWLEDGE = 3; // passages a `knowledge: true` step's call reads
const COLORS = /^#[0-9a-f]{6}(\|#[0-9a-f]{6})*$/i;

// Raw SQL, not D1Client.find(): find() drops filters whose value is '' — and the platform owner is exactly ''.
export async function overrideOf(env: FnEnv, owner: string, sector: string, fn: string): Promise<Rec | null> {
  const row = await env.LLM_DB.prepare('SELECT meta FROM divisions WHERE owner = ? AND sector = ? AND fn = ? AND deleted_at IS NULL LIMIT 1')
    .bind(owner, sector, fn).first<{ meta: string }>();
  if (!row) return null;
  // A pre-Task-16 raw admin write (generic /v1/data/divisions) could still smuggle a code-owned key into meta.
  return stripCodeOwned(parsePatch(row.meta));
}

export async function specFor(env: FnEnv, caller: Caller, divisionId: string): Promise<{ spec: FnSpec; sector: string; fn: FnKey; id: string; mode: Mode }> {
  const parsed = parseDivisionId(divisionId);
  if (!parsed) throw new HttpError(404, 'Unknown division');
  // Every job / task / chat / outline route resolves its spec here — the one gate for a sector not open to the caller
  // (fn/trial.ts modeOf): full use, trial use, or 403.
  const mode = requireMode(env, caller, parsed.sector);
  const platform = await overrideOf(env, '', parsed.sector, parsed.fn);
  const own = caller.owner ? await overrideOf(env, caller.owner, parsed.sector, parsed.fn) : null;
  const spec = resolveSpec(parsed.sector, parsed.fn, platform, own);
  if (!spec) throw new HttpError(404, 'Unknown division');
  return { spec, sector: parsed.sector, fn: parsed.fn, id: `${parsed.sector}.${parsed.fn}`, mode };
}

/** specFor for one of the caller's jobs — trial use reaches trial jobs only: a job made under a plan that has since
 *  lapsed needs the plan back, never trial's door. */
async function jobSpec(env: FnEnv, caller: Caller, job: Rec) {
  const resolved = await specFor(env, caller, job.division);
  if (resolved.mode === 'trial' && !job.trial) throw new HttpError(402, 'This job needs an active plan');
  return resolved;
}

const callMark = (stepId: number, callKey: string) => `|${stepId}:${callKey}|`;

/** A trial job runs each call once (no regenerate — fn/trial.ts): claimed in `calls` by one guarded write, so neither
 *  two tabs nor clearing the fields by hand (/fields) gets a second run. */
async function claimCall(env: FnEnv, jobId: string, mark: string): Promise<void> {
  const res = await env.LLM_DB.prepare('UPDATE talks SET calls = calls || ? WHERE id = ? AND instr(calls, ?) = 0').bind(mark, jobId, mark).run();
  if (res.meta.changes !== 1) throw new HttpError(409, 'A trial job runs each step once — choose a plan to regenerate');
}

/** The call failed or came back empty — its one run is given back. */
async function releaseCall(env: FnEnv, jobId: string, mark: string): Promise<void> {
  await env.LLM_DB.prepare("UPDATE talks SET calls = replace(calls, ?, '') WHERE id = ?").bind(mark, jobId).run()
    .catch(err => console.warn('[fn/call] trial call release failed:', err));
}

/** One job of the caller — same owner AND the same signed-in account (staff sharing owner '' never reach each other's
 *  jobs), and still within the retention window (fn/retention.ts: past it, it is gone even before the cron runs). */
export async function loadJob(env: FnEnv, caller: Caller, id: string): Promise<Rec> {
  const job = await new D1Client(env.LLM_DB).findById('talks', id);
  if (!job || job.kind !== 'job' || (job.owner ?? '') !== caller.owner || (job.user_id ?? '') !== caller.userId
    || String(job.created_at) < retentionCutoff()) throw new HttpError(404, 'Job not found');
  return job;
}

/** Recompute + store the status from a fresh read. Guarded by the fields it read: a call that landed meanwhile writes its own, newer state. */
async function writeState(env: FnEnv, id: string, steps: StepSpec[]): Promise<JobState> {
  const row = await env.LLM_DB.prepare('SELECT fields, imageChoice, reviewed FROM talks WHERE id = ?').bind(id).first<Rec>();
  if (!row) throw new HttpError(404, 'Job not found');
  const state = jobState(steps, JSON.parse(row.fields || '{}'), row.imageChoice || '', Number(row.reviewed));
  // Guarded by every field this read used, not just `fields` — a resume/edit that landed meanwhile also invalidates this write.
  await env.LLM_DB.prepare("UPDATE talks SET status = ?, pausedStepId = ? WHERE id = ? AND fields = ? AND imageChoice = ? AND reviewed = ?")
    .bind(state.status, state.pausedStepId, id, row.fields, row.imageChoice, row.reviewed).run();
  return state;
}

async function patchFields(env: FnEnv, id: string, partial: Rec, extra: { imageChoice?: string } = {}) {
  const sets = ['fields = json_patch(fields, ?)', "error = ''", 'updated_at = ?'];
  const params: unknown[] = [JSON.stringify(partial), now()];
  if (extra.imageChoice) { sets.push('imageChoice = ?'); params.push(extra.imageChoice); }
  await env.LLM_DB.prepare(`UPDATE talks SET ${sets.join(', ')} WHERE id = ?`).bind(...params, id).run();
}

async function listLog(env: FnEnv, caller: Caller, sector: string): Promise<Response> {
  // The caller's own account, the last 30 days (fn/retention.ts) — the newest 500 of them, oldest first.
  const { results } = await env.LLM_DB
    .prepare(`SELECT * FROM (SELECT * FROM talks WHERE owner = ? AND user_id = ? AND sector = ? AND created_at >= ? AND deleted_at IS NULL
              ORDER BY created_at DESC LIMIT 500) ORDER BY created_at ASC`)
    .bind(caller.owner, caller.userId, sector, retentionCutoff()).all<Rec>();
  return json((results ?? []).map(r => coerceOut('talks', r)));
}

async function createJob(env: FnEnv, caller: Caller, b: Rec): Promise<Response> {
  const { spec, sector, fn, id, mode } = await specFor(env, caller, str(b.division, 128));
  if (spec.kind !== 'pipeline') throw new HttpError(400, 'This division has no pipeline');
  // A job joins a task only through /v1/fn/tasks, which takes `task` from the caller's own task (P3-1).
  if (typeof b.task === 'string' && b.task) throw new HttpError(400, 'Task jobs are created through /v1/fn/tasks');
  if (isSystemFn(fn)) throw new HttpError(400, 'This step only runs inside a task');
  const topic = str(b.topic, TOPIC_MAX);
  if (!topic) throw new HttpError(400, 'topic required');
  const colors = str(b.colors, 200);
  await assertJobQuota(env, caller);
  const trial = mode === 'trial';
  const add = () => {
    const at = now();
    return new D1Client(env.LLM_DB).add('talks', {
      kind: 'job', from: id, division: id, topic, language: langOf(b.language),
      colors: COLORS.test(colors) ? colors : '', status: 'queued', error: '',
      fields: initialFields(spec, b.inputs), approved: false,
      owner: caller.owner, user_id: caller.userId, sector, task: '', reviewed: -1, waitingOnJobId: '', trial, calls: '',
      created_at: at, updated_at: at, deleted_at: null,
    });
  };
  // Trial: this department's one standalone job in this sector.
  const job = trial ? await withTrial(env, caller.userId, sector, fn, add) : await add();
  return json(job, { status: 201 });
}

async function runCall(env: FnEnv, caller: Caller, jobId: string, b: Rec, request: Request): Promise<Response> {
  const job = await loadJob(env, caller, jobId);
  if (job.approved) throw new HttpError(409, 'Already approved');
  const { spec, sector, fn } = await jobSpec(env, caller, job);
  const steps = spec.steps ?? [];
  const stepIndex = steps.findIndex(s => s.id === Number(b.stepId));
  const call = stepIndex === -1 ? undefined : callsOf(steps[stepIndex]).find(c => c.key === b.callKey);
  if (!call) throw new HttpError(404, 'Unknown step or call');
  if (!canRunCall(steps, stepIndex, call, job.fields, Number(job.reviewed))) throw new HttpError(409, 'This call cannot run yet');
  // This call spends AI — per-user rate limit (Task 0.4's binding), same as /v1/ai/stream and /v1/ai/image.
  if (!(await allowAi(env, request, caller.userId))) {
    return json({ message: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(AI_LIMIT_PERIOD_S) } });
  }
  const step = steps[stepIndex];
  const mark = job.trial ? callMark(step.id, call.key) : '';
  if (mark) await claimCall(env, job.id, mark);
  const languageName = step.type === 'image' ? 'English' : LANGS[job.language] ?? 'Vietnamese';
  // Inside a task: the live handoffs this function reads, as `artifact.<kind>` prompt fields — never stored in the job (P3-17).
  const handoffs = job.task ? await artifactInputs(env, caller, String(job.task), spec, call) : {};
  // Phase 6.3: the base + sector spec decides which steps read knowledge (never an override) — the caller's own rows
  // of this sector / department + the shared ones, fenced as KNOWLEDGE by buildCallPrompt.
  const knowledge = resolveSpec(sector, fn)!.steps?.find(s => s.id === step.id)?.knowledge
    ? await knowledgeText(env, { query: `${job.topic}\n${step.en ?? step.key}`, owner: caller.owner, scope: { sector, fn }, limit: STEP_KNOWLEDGE }, 'fn/call')
    : '';
  const { system, user } = buildCallPrompt(step, call, {
    topic: job.topic, languageName, fields: { ...job.fields, ...handoffs }, vars: promptVars(sector), lens: lensOf(sector, fn),
    instruction: str(b.instruction, NOTE_MAX), knowledge,
  });
  try {
    const obj = await generateJson(env, { system, user, maxTokens: call.maxTokens, temperature: call.temperature, languageName });
    const partial = pickFields(obj, call.fields);
    const labels = (call.contextKeys ?? []).map(dataLabel);
    // A blank answer for a field that already had data would erase it — keep the old value instead of patching over it.
    for (const k of Object.keys(partial)) {
      if (partial[k] === '' && String(job.fields[k] ?? '').trim() !== '') delete partial[k];
      // No field carries evidence tags or data labels — one the model still wrote out of habit is dropped (P3-4).
      else if (!call.fields.find(f => f.key === k)?.html && partial[k]) partial[k] = stripTags(partial[k], labels);
    }
    // Nothing came back — the trial run is given back so the boss can try that step again.
    if (mark && !Object.values(partial).some(v => String(v ?? '').trim())) await releaseCall(env, job.id, mark);
    await patchFields(env, job.id, partial);
    return json({ fields: partial, ...(await writeState(env, job.id, steps)) });
  } catch (err) {
    if (mark) await releaseCall(env, job.id, mark);
    const message = err instanceof HttpError ? err.message : 'Internal error';
    // Only the error + timestamp — status stays derived from data (writeState), so a failed regenerate can't block resume/approve.
    await env.LLM_DB.prepare('UPDATE talks SET error = ?, updated_at = ? WHERE id = ?').bind(message, now(), job.id).run();
    await writeState(env, job.id, steps).catch(() => {}); // best-effort — never replaces the original error below
    throw err;
  }
}

async function resume(env: FnEnv, caller: Caller, jobId: string): Promise<Response> {
  const job = await loadJob(env, caller, jobId);
  if (job.approved) throw new HttpError(409, 'Already approved');
  if (job.status !== 'awaiting_review') throw new HttpError(409, 'Nothing to resume');
  const steps = (await jobSpec(env, caller, job)).spec.steps ?? [];
  const idx = steps.findIndex(s => String(s.id) === String(job.pausedStepId));
  if (idx === -1 || steps[idx].type !== 'text') throw new HttpError(409, 'Choose an image option instead');
  await env.LLM_DB.prepare('UPDATE talks SET reviewed = MAX(reviewed, ?), updated_at = ? WHERE id = ?').bind(idx, now(), job.id).run();
  return json(await writeState(env, job.id, steps));
}

async function image(env: FnEnv, caller: Caller, jobId: string, b: Rec, ctx: ExecutionContext): Promise<Response> {
  const choice = b.choice === 'ai' || b.choice === 'skip' ? b.choice : '';
  if (!choice) throw new HttpError(400, "choice must be 'ai' or 'skip'");
  const pics = str(b.pics, 2000);
  if (pics && !/^https:\/\//i.test(pics)) throw new HttpError(400, 'pics must be an https URL');
  const job = await loadJob(env, caller, jobId);
  const { spec } = await jobSpec(env, caller, job);
  const steps = spec.steps ?? [];
  if (steps.findIndex(s => s.type === 'image') === -1) throw new HttpError(409, 'This division has no image step');
  // Exception: the boss re-uploading a photo after the job already finished — never lets a call jump ahead of its turn otherwise.
  const reupload = jobState(steps, job.fields, job.imageChoice || '', Number(job.reviewed)).status === 'done' && choice === 'ai' && Boolean(pics);
  // Approved: only that — a new picture made or uploaded by hand later (e.g. one skipped while the task ran on).
  if (job.approved && !reupload) throw new HttpError(409, 'Already approved');
  if (!imageGateOpen(steps, job.fields, job.imageChoice || '', Number(job.reviewed)) && !reupload) throw new HttpError(409, 'This call cannot run yet');
  const partial: Rec = {};
  if (choice === 'ai' && pics) {
    partial.pics = pics;
    partial.content = figureHtml(pics, String(job.fields.title || job.topic)) + stripLeadingFigure(String(job.fields.content || ''));
  }
  if (job.approved) await syncApproved(env, ctx, caller, job, spec, partial);
  await patchFields(env, job.id, partial, { imageChoice: choice });
  return json({ fields: partial, ...(await writeState(env, job.id, steps)) });
}

async function editFields(env: FnEnv, caller: Caller, jobId: string, b: Rec, ctx: ExecutionContext): Promise<Response> {
  const job = await loadJob(env, caller, jobId);
  const { spec, sector, fn } = await jobSpec(env, caller, job);
  const steps = spec.steps ?? [];
  // Approved: only its output fields stay open (title, description, content, tags…) — the record it wrote follows
  // (syncApproved); inputs, working fields and handoffs keep what was approved. `pics` changes through /image only.
  const approved = Boolean(job.approved);
  const outputKeys = new Set((spec.output?.fields ?? []).filter(k => k !== 'pics'));
  if (approved && !outputKeys.size) throw new HttpError(409, 'Already approved');
  // Steps at/behind the boss's review point (reviewed+1) are still open for a hand edit; later ones have nothing generated yet.
  const editableSteps = approved ? steps : steps.slice(0, Number(job.reviewed) + 2);
  const fieldSpecs = new Map(editableSteps.flatMap(s => callsOf(s)).flatMap(c => c.fields).map(f => [f.key, f]));
  // Which keys sanitize as HTML is code's call alone — the base + sector spec, never an admin override (P2-11).
  const base = resolveSpec(sector, fn)!;
  const htmlKeys = new Set(base.steps?.flatMap(s => callsOf(s)).flatMap(c => c.fields).filter(f => f.html).map(f => f.key));
  const inputs = new Set(spec.inputs ?? []);
  const partial: Rec = {};
  for (const [k, v] of Object.entries(b.fields ?? {})) {
    if (typeof v !== 'string') continue;
    if (approved && !outputKeys.has(k)) continue;
    // Inputs are the boss's own context typed in at job creation — always fixable, not tied to any one step.
    if (inputs.has(k)) { partial[k] = plainText(v.trim().slice(0, INPUT_MAX)); continue; }
    const f = fieldSpecs.get(k);
    if (!f) continue;
    const max = f.max ?? FIELD_MAX;
    const trimmed = v.slice(0, max);
    partial[k] = htmlKeys.has(k) ? sanitizeHtml(trimmed) : plainText(trimmed);
  }
  if (approved) await syncApproved(env, ctx, caller, job, spec, partial);
  await patchFields(env, job.id, partial);
  return json({ fields: partial, ...(await writeState(env, job.id, steps)) });
}

/**
 * An approved job edited afterwards (its output fields, its picture) — BEFORE the job itself is written, so a refused
 * write leaves both as they were: the platform record its approve wrote follows (through auth as the caller, so
 * their own rights on that table are checked), then its knowledge, in the background. Its handoffs (artifacts) keep
 * the version that was approved. `partial` = the changed fields, already sanitized.
 */
async function syncApproved(env: FnEnv, ctx: ExecutionContext, caller: Caller, job: Rec, spec: FnSpec, partial: Rec): Promise<void> {
  const out = spec.output;
  if (!out) return;
  const changed = Object.fromEntries(Object.entries(partial).filter(([k]) => out.fields.includes(k)));
  if (!Object.keys(changed).length) return;
  const recordId = String(job.createdPostId ?? '');
  if (caller.owner === '' && recordId) await authWrite(env, caller, out.table, recordId, { ...changed, updated_at: now() });
  syncKnow(env, ctx, caller, job, out, { ...(job.fields ?? {}), ...changed }, recordId);
}

/** Writes through auth AS THE CALLER — it enforces the caller's own table permissions. */
async function authWrite(env: FnEnv, caller: Caller, table: string, id: string, data: Rec) {
  if (!env.AUTH_URL) throw new HttpError(500, 'AUTH_URL is not configured');
  const base = env.AUTH_URL.replace(/\/+$/, '');
  const res = await fetch(`${base}/v1/data/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: caller.bearer },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new HttpError(res.status === 403 ? 403 : 502, `Saving to ${table} failed (${res.status})`);
}

/**
 * The sign-off a sector's review asks of this department (SectorAdapter.review) — null when it needs none. When it does,
 * the approver must confirm the qualified person reviewed the result AND name them; otherwise 400 — clinical / legal
 * content never becomes an approved result or handoff on the AI's word alone.
 */
function signOffOf(sector: string, fn: string, b: Rec): SignOff | null {
  const who = reviewOf(sector, fn);
  if (!who) return null;
  const s: Rec = b.expertReview && typeof b.expertReview === 'object' ? b.expertReview : {};
  const by = plain(str(s.by, SIGNOFF_NAME_MAX));
  if (s.confirmed !== true || by.length < 2) {
    throw new HttpError(400, `This result must be signed off by ${who.en} before it is approved — confirm it and name who reviewed it`);
  }
  return { by, role: who.en, at: now() };
}

async function approve(env: FnEnv, caller: Caller, jobId: string, b: Rec, ctx: ExecutionContext): Promise<Response> {
  const job = await loadJob(env, caller, jobId);
  if (job.status !== 'done' || job.approved) throw new HttpError(409, 'Nothing to approve');
  // Resolved BEFORE the claim below — a throw here (e.g. an unknown division) must not leave the job stuck at approved=1.
  const { spec, sector, fn } = await jobSpec(env, caller, job);
  const signOff = signOffOf(sector, fn, b);
  // Claim first — status/approved re-checked in the WHERE, so 2 concurrent approves can't both write the platform record.
  // A sign-off is recorded on the job in the same write (a flat field, like every other — never one a model can fill).
  const claim = await env.LLM_DB.prepare(
    `UPDATE talks SET approved = 1, ${signOff ? "fields = json_set(fields, '$.expertReview', ?), " : ''}updated_at = ?
     WHERE id = ? AND approved = 0 AND status = 'done'`,
  ).bind(...(signOff ? [`${signOff.by} (${signOff.role}, ${signOff.at})`] : []), now(), job.id).run();
  if (claim.meta.changes !== 1) throw new HttpError(409, 'Nothing to approve');
  const out = spec.output;
  let recordId = '';
  let table = '';
  let artifacts: Rec[] = [];
  try {
    // Hubs never write the platform's tables (D9) — their result stays in the job (+ artifacts, Phase 3).
    if (out && caller.owner === '') {
      // Legacy jobs (created before html fields were sanitized on write) get sanitized here too. Which keys sanitize
      // is code's call alone — the base + sector spec, never an admin override (P2-11) — same rule as editFields.
      const base = resolveSpec(sector, fn)!;
      const html = new Set(base.steps?.flatMap(s => callsOf(s)).flatMap(c => c.fields).filter(f => f.html).map(f => f.key));
      const at = now();
      const payload = Object.fromEntries(out.fields.map(k => [k, html.has(k) ? sanitizeHtml(String(job.fields[k] ?? '')) : String(job.fields[k] ?? '')]));
      table = out.table;
      recordId = job.id; // deterministic — a retried approve upserts the same record instead of duplicating it
      // `sector` tags the new record with the sector that made it — posts from 5 sectors share one table, and knowledge
      // synced from a record later (client know-sync.js) keeps to that sector.
      await authWrite(env, caller, table, recordId, {
        status: out.status || 'draft', scope: 'public', secure: '', tags: '', index: 0, actors: '', user_id: null,
        ...payload, sector, created_at: at, updated_at: at, deleted_at: null,
      });
    }
    // Inside a task: this job's handoffs become their new versions (P3-8) — in the same try, so a failed write un-approves
    // the job and the boss simply approves again (the platform write above is an idempotent upsert on recordId = job.id).
    if (job.task && spec.produces?.length) artifacts = await writeArtifacts(env, caller, job, spec, signOff);
  } catch (err) {
    await env.LLM_DB.prepare('UPDATE talks SET approved = 0 WHERE id = ?').bind(job.id).run();
    throw err;
  }
  await afterApprove(env, ctx, caller, job, spec, recordId);
  return json({ approved: true, table, recordId, artifacts });
}

export async function handleFnRoute(request: Request, env: FnEnv, url: URL, ctx: ExecutionContext): Promise<Response | null> {
  const extra = (await handleTalkRoute(request, env, url, ctx)) ?? (await handleAdminRoute(request, env, url)) ?? (await handleTaskRoute(request, env, url));
  if (extra) return extra;
  const m = url.pathname.match(FN_PATH);
  if (!m) return null;
  const [, area, id, action] = m;
  const method = request.method;
  const caller = await resolveCaller(request, env);
  if (area === 'spec' && method === 'GET' && id) {
    const { spec, sector, fn } = await specFor(env, caller, id);
    return json(toOutline(spec, { review: reviewOf(sector, fn) }));
  }
  if (area === 'log' && method === 'GET' && !id) return listLog(env, caller, str(url.searchParams.get('sector'), 64));
  if (area === 'jobs' && method === 'POST' && !id) return createJob(env, caller, await readBody(request, JOB_BODY_MAX));
  if (area === 'jobs' && method === 'POST' && id) {
    if (action === 'call') return runCall(env, caller, id, await readBody(request, JOB_BODY_MAX), request);
    if (action === 'resume') return resume(env, caller, id);
    if (action === 'image') return image(env, caller, id, await readBody(request, JOB_BODY_MAX), ctx);
    if (action === 'fields') return editFields(env, caller, id, await readBody(request, JOB_BODY_MAX), ctx);
    if (action === 'approve') return approve(env, caller, id, await readBody(request), ctx); // a tiny body: the sign-off
  }
  throw new HttpError(405, 'Unsupported method/path combination');
}
