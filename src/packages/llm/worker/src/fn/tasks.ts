/**
 * /v1/fn/tasks — one sector + topic run end to end (spec §2.2, §4, §17–§19, §37, §42, §44):
 *   POST /v1/fn/tasks               { sector, topic, language? } → the task view + `created` (its secretary job), 201
 *   GET  /v1/fn/tasks/:id           stage, routing, plan, preview, fns (per-function state), next, light jobs/artifacts, labels
 *   POST /v1/fn/tasks/:id/next      { inputs?: { [fn]: {…} } } → opens a job for every function that may start now (idempotent)
 *   POST /v1/fn/tasks/:id/rerun     { fn, inputs? } → a new job for an approved function; approving it = new versions
 *   POST /v1/fn/tasks/:id/verify    { artifact } → keeps an artifact awaiting re-verification as it is (APPROVED again)
 * A task is the caller's own jobs sharing `task` (owner from the JWT) — no tasks table (D7); its state is derived (task.ts).
 * Trial (fn/trial.ts): an account's one task per sector, flagged on every job (`trial`, from its Secretary job — never
 * the body), capped at TRIAL_TASK_JOBS and with no rerun.
 * routes.ts also calls artifactInputs (before each /call) and writeArtifacts (inside /approve).
 */
import { json, HttpError } from '../lib/http';
import { coerceOut } from '../d1';
import { readBody, JOB_BODY_MAX } from '../lib/body.ts';
import { resolveCaller, type Caller } from './owner';
import { specFor, type FnEnv } from './routes';
import { assertJobQuota } from './jobs';
import { requireMode, withTrial, TRIAL_TASK_JOBS } from './trial.ts';
import { parseDivisionId, sectorOf, coreOf } from './registry.ts';
import { artifactFields, approveArtifacts, verifyArtifact, HANDOFF_PREFIX, type ArtifactRow, type SignOff } from './artifacts.ts';
import { buildTaskView, graphOf, availableOf, MAX_TASK_JOBS, SECRETARY, type TaskJob } from './task.ts';
import { taskJobRow, langOf, TOPIC_MAX } from './jobRow.ts';
import { FN_TITLES, kindLabels } from './kinds.ts';
import { str, now } from './util.ts';
import type { CallSpec, FnSpec, Rec } from './types.ts';

const TASK_PATH = /^\/v1\/fn\/tasks(?:\/([A-Za-z0-9-]{1,64}))?(?:\/(next|rerun|verify))?$/;
const isObj = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const fnOfJob = (j: Rec) => parseDivisionId(String(j.division))?.fn ?? '';

/** One task's jobs — only the caller's own (owner + account): another account never sees, runs or verifies them. */
async function taskJobs(env: FnEnv, caller: Caller, task: string): Promise<Rec[]> {
  const { results } = await env.LLM_DB
    .prepare("SELECT * FROM talks WHERE owner = ? AND user_id = ? AND task = ? AND kind = 'job' AND deleted_at IS NULL ORDER BY created_at ASC")
    .bind(caller.owner, caller.userId, task).all<Rec>();
  return (results ?? []).map(r => coerceOut('talks', r));
}

const toArtifact = (r: Rec): ArtifactRow => ({
  id: String(r.id), kind: String(r.kind), version: Number(r.version), status: r.status, source_fn: String(r.source_fn),
  dest_fns: String(r.dest_fns || '').split('|').filter(Boolean), job_id: String(r.job_id),
  depends_on: String(r.depends_on || '').split('|').filter(Boolean), supersedes: String(r.supersedes || ''),
  created_at: String(r.created_at), data: r.data,
});

async function taskArtifacts(env: FnEnv, owner: string, task: string): Promise<ArtifactRow[]> {
  const { results } = await env.LLM_DB
    .prepare('SELECT * FROM artifacts WHERE owner = ? AND task = ? AND deleted_at IS NULL')
    .bind(owner, task).all<Rec>();
  return (results ?? []).map(r => toArtifact(coerceOut('artifacts', r)));
}

const capOf = (trial: boolean) => (trial ? TRIAL_TASK_JOBS : MAX_TASK_JOBS);
const capError = (trial: boolean) => new HttpError(429, trial
  ? `A trial task runs at most ${TRIAL_TASK_JOBS} jobs — choose a plan to keep going`
  : `A task runs at most ${MAX_TASK_JOBS} jobs — start a new task`);

// INSERT … WHERE NOT EXISTS — two tabs asking /next at once can't both open a job for the same function (P3-14) — and
// the per-task job cap (P3-20) is checked in the same statement, so racing requests can't push a task past it.
async function insertTaskJob(env: FnEnv, row: Rec): Promise<Rec | null> {
  const cap = capOf(!!row.trial);
  const data: Rec = { ...row, id: crypto.randomUUID(), fields: JSON.stringify(row.fields), approved: 0, trial: row.trial ? 1 : 0 };
  const cols = Object.keys(data);
  const res = await env.LLM_DB.prepare(
    `INSERT INTO talks (${cols.map(c => `"${c}"`).join(', ')}) SELECT ${cols.map(() => '?').join(', ')}
     WHERE NOT EXISTS (SELECT 1 FROM talks WHERE owner = ? AND task = ? AND division = ? AND approved = 0 AND deleted_at IS NULL)
       AND (SELECT COUNT(*) FROM talks WHERE owner = ? AND task = ? AND kind = 'job' AND deleted_at IS NULL) < ?`,
  ).bind(...cols.map(c => data[c]), row.owner, row.task, row.division, row.owner, row.task, cap).run();
  if (res.meta.changes === 1) return coerceOut('talks', data);
  // 0 rows: an open job of that function already exists (idempotent → null), or the cap was hit meanwhile (429).
  const n = await env.LLM_DB
    .prepare("SELECT COUNT(*) AS n FROM talks WHERE owner = ? AND task = ? AND kind = 'job' AND deleted_at IS NULL")
    .bind(row.owner, row.task).first<{ n: number }>();
  if (Number(n?.n) >= cap) throw capError(!!row.trial);
  return null;
}

/** The task view (P3-21): derived state + light jobs (no fields) + light artifacts (no envelope) + labels. */
async function viewOf(env: FnEnv, caller: Caller, task: string): Promise<Rec> {
  const jobs = await taskJobs(env, caller, task);
  const anchor = jobs.find(j => fnOfJob(j) === SECRETARY);
  if (!anchor) throw new HttpError(404, 'Task not found');
  const sector = String(anchor.sector);
  const trial = !!anchor.trial;
  const rows = await taskArtifacts(env, caller.owner, task);
  const lite: TaskJob[] = jobs.map(j => ({
    id: String(j.id), fn: fnOfJob(j), status: String(j.status), approved: !!j.approved, created_at: String(j.created_at), fields: j.fields,
  }));
  return {
    id: task, sector, topic: String(anchor.topic), language: String(anchor.language), trial,
    ...buildTaskView({ graph: graphOf(sector), available: availableOf(sector), jobs: lite, rows, core: coreOf(sector) }),
    jobs: lite.map(({ fields: _fields, ...j }) => ({ ...j, division: `${sector}.${j.fn}` })),
    artifacts: rows.map(({ data: _data, ...a }) => a),
    titles: FN_TITLES, kinds: kindLabels(),
  };
}

/** The `artifact.<kind>` prompt fields ONE call of a task job reads (P3-17): the kinds its spec needs, then uses, that
 *  the call's contextKeys name. Budgeted per call, so a call reading few handoffs isn't starved by the spec's others —
 *  and an override's contextKeys can never pull in a kind outside the spec's code-owned needs/uses. routes.ts runCall. */
export async function artifactInputs(env: FnEnv, caller: Caller, task: string, spec: FnSpec, call: CallSpec): Promise<Rec> {
  const wanted = new Set(call.contextKeys ?? []);
  const kinds = [...(spec.needs ?? []), ...(spec.uses ?? [])].filter(k => wanted.has(`${HANDOFF_PREFIX}${k}`));
  if (!kinds.length) return {};
  return artifactFields(await taskArtifacts(env, caller.owner, task), kinds);
}

/** Approving a task job (P3-7, P3-8): its new versions, the superseded ones, downstream re-verification — ONE D1 batch
 *  (one transaction). A racing approve of the same kind trips UNIQUE(owner, task, kind, version) and fails whole.
 *  `signOff` = the expert sign-off routes.ts approve took (sector review), kept in every new envelope. */
export async function writeArtifacts(env: FnEnv, caller: Caller, job: Rec, spec: FnSpec, signOff: SignOff | null = null): Promise<Rec[]> {
  const task = String(job.task);
  const at = now();
  // graph: a kind approved for the first time flags the functions already approved without it (P3-8); by → created_by.
  const plan = approveArtifacts({
    spec, job: { id: String(job.id), fields: job.fields ?? {}, created_at: String(job.created_at) },
    rows: await taskArtifacts(env, caller.owner, task), at, newId: () => crypto.randomUUID(),
    graph: graphOf(String(job.sector)), by: caller.userId, signOff,
  });
  const db = env.LLM_DB;
  const stmts = [
    ...plan.inserts.map(a => db.prepare(
      `INSERT INTO artifacts (id, task, owner, sector, kind, source_fn, dest_fns, job_id, version, status, data, depends_on, supersedes, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).bind(a.id, task, caller.owner, String(job.sector), a.kind, a.source_fn, a.dest_fns.join('|'), a.job_id, a.version, a.status,
      JSON.stringify(a.data ?? {}), a.depends_on.join('|'), a.supersedes, at, at)),
    ...plan.superseded.map(id => db.prepare("UPDATE artifacts SET status = 'SUPERSEDED', updated_at = ? WHERE id = ? AND owner = ? AND status != 'SUPERSEDED'")
      .bind(at, id, caller.owner)),
    ...plan.toVerify.map(id => db.prepare("UPDATE artifacts SET status = 'REQUIRES_VERIFICATION', updated_at = ? WHERE id = ? AND owner = ? AND status = 'APPROVED'")
      .bind(at, id, caller.owner)),
  ];
  try {
    if (stmts.length) await db.batch(stmts);
  } catch (err) {
    // UNIQUE(owner, task, kind, version): a racing approve of the same kind won — the batch (one transaction) left no
    // row. approve() un-approves this job and runs no knowledge sync; the boss reloads and approves again.
    if (/UNIQUE/i.test(String((err as Error)?.message ?? err))) throw new HttpError(409, 'This handoff was just approved elsewhere — reload and approve again');
    throw err;
  }
  return plan.inserts.map(a => ({ id: a.id, kind: a.kind, version: a.version, status: a.status }));
}

// The friendly up-front check; insertTaskJob re-checks the cap atomically.
function roomFor(view: Rec, adding: number) {
  if ((view.jobs as unknown[]).length + adding > capOf(view.trial)) throw capError(view.trial);
}

/** Changing a task (next / rerun / verify) needs the caller's access to its sector now — and trial use reaches a trial
 *  task only (a task made under a plan that has since lapsed needs the plan back). */
function assertTaskMode(env: FnEnv, caller: Caller, view: Rec) {
  if (requireMode(env, caller, String(view.sector)) === 'trial' && !view.trial) throw new HttpError(402, 'This task needs an active plan');
}

async function createTask(env: FnEnv, caller: Caller, b: Rec): Promise<Response> {
  const sector = str(b.sector, 64);
  if (!sectorOf(sector)) throw new HttpError(404, 'Unknown sector');
  const topic = str(b.topic, TOPIC_MAX);
  if (!topic) throw new HttpError(400, 'topic required');
  const { spec, id: division, mode } = await specFor(env, caller, `${sector}.${SECRETARY}`);
  await assertJobQuota(env, caller);
  const task = crypto.randomUUID();
  const trial = mode === 'trial';
  const start = async () => {
    const job = await insertTaskJob(env, taskJobRow({
      spec, division, sector, owner: caller.owner, userId: caller.userId, topic, language: langOf(b.language), task, inputs: {}, at: now(), trial,
    }));
    if (!job) throw new HttpError(409, 'The task could not be started — please retry');
    return job;
  };
  // Trial: the account's one task in this sector.
  const job = trial ? await withTrial(env, caller.userId, sector, 'task', start) : await start();
  return json({ ...(await viewOf(env, caller, task)), created: [job] }, { status: 201 });
}

async function openJobs(env: FnEnv, caller: Caller, view: Rec, fns: string[], inputs: unknown): Promise<Rec[]> {
  const created: Rec[] = [];
  for (const fn of fns) {
    const { spec, id: division } = await specFor(env, caller, `${view.sector}.${fn}`);
    const job = await insertTaskJob(env, taskJobRow({
      spec, division, sector: view.sector, owner: caller.owner, userId: caller.userId, topic: view.topic, language: view.language, task: view.id,
      inputs: isObj(inputs) ? inputs[fn] : undefined, at: now(), trial: view.trial,
    }));
    if (job) created.push(job);
  }
  return created;
}

async function next(env: FnEnv, caller: Caller, task: string, b: Rec): Promise<Response> {
  const view = await viewOf(env, caller, task);
  assertTaskMode(env, caller, view);
  const fns: string[] = view.next;
  if (!fns.length) return json({ ...view, created: [] });
  roomFor(view, fns.length);
  await assertJobQuota(env, caller, fns.length);
  const created = await openJobs(env, caller, view, fns, b.inputs);
  return json({ ...(await viewOf(env, caller, task)), created });
}

async function rerun(env: FnEnv, caller: Caller, task: string, b: Rec): Promise<Response> {
  const view = await viewOf(env, caller, task);
  assertTaskMode(env, caller, view);
  if (view.trial) throw new HttpError(409, 'A trial task runs each department once — choose a plan to run it again');
  const fn = str(b.fn, 32);
  const s = (view.fns as Rec[]).find(x => x.fn === fn);
  if (!s) throw new HttpError(404, 'This function is not in the task plan');
  if (s.state !== 'approved' && s.state !== 'stale') throw new HttpError(409, 'Finish or approve its open job first');
  if (s.missing.length) throw new HttpError(409, 'Its upstream handoffs are not approved yet');
  roomFor(view, 1);
  await assertJobQuota(env, caller);
  const created = await openJobs(env, caller, view, [fn], isObj(b.inputs) ? { [fn]: b.inputs } : undefined);
  return json({ ...(await viewOf(env, caller, task)), created });
}

async function verify(env: FnEnv, caller: Caller, task: string, b: Rec): Promise<Response> {
  const id = str(b.artifact, 64);
  // The task must be the caller's own (its anchor job is theirs) — artifacts carry no account, the task does.
  const anchor = (await taskJobs(env, caller, task)).find(j => fnOfJob(j) === SECRETARY);
  if (!anchor) throw new HttpError(404, 'Task not found');
  assertTaskMode(env, caller, { sector: anchor.sector, trial: !!anchor.trial });
  const rows = await taskArtifacts(env, caller.owner, task);
  const target = rows.find(r => r.id === id);
  // What its producer reads (needs ∪ uses) — one flagged for a first-time upstream then records that upstream too.
  const node = target ? graphOf(String(anchor.sector)).find(n => n.fn === target.source_fn) : undefined;
  const result = verifyArtifact(rows, id, node ? [...node.needs, ...node.uses] : []);
  if ('error' in result) throw new HttpError(409, result.error);
  const deps = result.depends_on.join('|');
  // Every upstream written into depends_on must STILL be APPROVED at write time — an upstream approve/supersede racing
  // in between the read above and this UPDATE makes it change nothing (409) instead of recording a stale version.
  const res = await env.LLM_DB.prepare(
    `UPDATE artifacts SET status = 'APPROVED', depends_on = ?, data = json_set(data, '$.dependencies', json(?)), updated_at = ?
     WHERE id = ? AND owner = ? AND task = ? AND status = 'REQUIRES_VERIFICATION'
       AND NOT EXISTS (SELECT 1 FROM artifacts u WHERE u.owner = ? AND u.task = ? AND u.deleted_at IS NULL
                       AND instr('|' || ? || '|', '|' || u.id || '|') > 0 AND u.status != 'APPROVED')`,
  ).bind(deps, JSON.stringify(result.dependencies), now(), id, caller.owner, task, caller.owner, task, deps).run();
  if (res.meta.changes !== 1) throw new HttpError(409, 'The handoffs changed meanwhile — reload and try again');
  return json(await viewOf(env, caller, task));
}

export async function handleTaskRoute(request: Request, env: FnEnv, url: URL): Promise<Response | null> {
  const m = url.pathname.match(TASK_PATH);
  if (!m) return null;
  const [, id, action] = m;
  const method = request.method;
  const caller = await resolveCaller(request, env);
  if (method === 'POST' && !id) return createTask(env, caller, await readBody(request, JOB_BODY_MAX));
  if (method === 'GET' && id && !action) return json(await viewOf(env, caller, id));
  if (method === 'POST' && id && action === 'next') return next(env, caller, id, await readBody(request, JOB_BODY_MAX));
  if (method === 'POST' && id && action === 'rerun') return rerun(env, caller, id, await readBody(request, JOB_BODY_MAX));
  if (method === 'POST' && id && action === 'verify') return verify(env, caller, id, await readBody(request, JOB_BODY_MAX));
  throw new HttpError(405, 'Unsupported method/path combination');
}
