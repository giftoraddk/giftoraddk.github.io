/**
 * /v1/fn/* — the chat side of a sector (Phase 2). routes.ts asks this file first; the pipeline routes stay there.
 *   GET  /v1/fn/sectors[?owner=]  public — sector groups + departments + their editable faces (name, avatar, on/off)
 *   POST /v1/fn/log               { sector, from, content } → the chat row ('boss' or a department of that sector)
 *   POST /v1/fn/chat              { division, content, lang? } → { lang, reply, isTask, topic } — one head's decision, no write
 *   POST /v1/fn/aide              public { division, content, history?, owner?, types?, lang? } → { lang, reply, sources }
 *   GET  /v1/fn/jobs/:id          one job of the caller (the client's runner re-reads it after each step)
 *   GET  /v1/fn/trial?sector=     what the caller has left of trial use in one sector (fn/trial.ts)
 * The client writes chat rows itself — the boss line first, a head's reply only once it decides to show it (a head
 * about to wait for a product stays quiet). Owner + sector of every row come from the JWT / the route, never the body.
 */
import { json, HttpError } from '../lib/http';
import { requireAuth } from '../lib/auth';
import { D1Client } from '../d1';
import { allowAi, AI_LIMIT_PERIOD_S } from '../rateLimit';
import { readBody, JOB_BODY_MAX } from '../lib/body.ts';
import { searchKnow, knowledgeText, type Evidence } from '../search';
import { resolveCaller, ownerAccess, deniedResponse, isPlatformStaff, isActiveAccount, type Caller } from './owner';
import { isPlatformOwner } from './access.ts';
import { generateJson } from './generate';
import { specFor, overrideOf, loadJob, type FnEnv } from './routes';
import { parseDivisionId, resolveSpec, sectorFaces, sectorOf, promptVars, lensOf } from './registry.ts';
import { requireMode, trialAsked, trialOpen, trialUsage, withTrial } from './trial.ts';
import { fill } from './prompt.ts';
import { mergeFaces, faceTitle, type FaceRow, type FnView } from './faces.ts';
import {
  buildChatterPrompt, buildAidePrompt, chatHistory, guestHistory, personaOf, pickChatReply, pickAideReply, takesTasks, CHAT_HISTORY, CONTENT_MAX,
} from './chatPrompt.ts';
import { str, now } from './util.ts';
import { retentionCutoff } from './retention.ts';
import { LANGS, isSystemFn, type FnKey, type FnSpec, type Rec } from './types.ts';

const TALK_PATH = /^\/v1\/fn\/(sectors|log|chat|aide|jobs|trial)(?:\/([A-Za-z0-9._-]{1,128}))?$/;
const GUEST_MAX = 2000;

// A Response (not a thrown HttpError) so Retry-After survives — handleWorkerError's generic catch drops extra headers.
const rateLimited = () => json({ message: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(AI_LIMIT_PERIOD_S) } });

/** Face rows of the platform ('') and, when given, of one owner — raw SQL: D1Client.find() skips '' filters. */
export async function faceRows(env: FnEnv, owner: string): Promise<FaceRow[]> {
  const { results } = await env.LLM_DB
    .prepare("SELECT id, title, description, pics, status, lang, sector, fn, owner FROM divisions WHERE deleted_at IS NULL AND sector != '' AND (owner = '' OR owner = ?)")
    .bind(owner).all<FaceRow>();
  return results ?? [];
}

async function facesOf(env: FnEnv, sector: string, owner: string): Promise<FnView[]> {
  return mergeFaces(sectorFaces().filter(s => s.id === sector), await faceRows(env, owner), owner)[0]?.functions ?? [];
}

async function appendLog(env: FnEnv, request: Request, caller: Caller, b: Rec): Promise<Response> {
  const sector = str(b.sector, 64);
  if (!sectorOf(sector)) throw new HttpError(404, 'Unknown sector');
  const mode = requireMode(env, caller, sector);
  const raw = str(b.from, 128);
  const parsed = raw === 'boss' ? null : parseDivisionId(raw);
  if (raw !== 'boss' && parsed?.sector !== sector) throw new HttpError(400, 'from must be boss or a department of this sector');
  const content = str(b.content, CONTENT_MAX);
  if (!content) throw new HttpError(400, 'content required');
  if (!(await allowAi(env, request, caller.userId))) return rateLimited();
  const add = () => {
    const at = now();
    return new D1Client(env.LLM_DB).add('talks', {
      kind: 'chat', from: parsed ? `${parsed.sector}.${parsed.fn}` : 'boss', content,
      owner: caller.owner, user_id: caller.userId, sector, created_at: at, updated_at: at, deleted_at: null,
    });
  };
  // Trial: one of the account's chat rows in this sector.
  const row = mode === 'trial' ? await withTrial(env, caller.userId, sector, 'log', add) : await add();
  return json(row, { status: 201 });
}

async function chat(env: FnEnv, request: Request, caller: Caller, b: Rec): Promise<Response> {
  const { spec, sector, fn, id, mode } = await specFor(env, caller, str(b.division, 128));
  const content = str(b.content, CONTENT_MAX);
  if (!content) throw new HttpError(400, 'content required');
  if (!(await allowAi(env, request, caller.userId))) return rateLimited();
  const reply = () => headReply(env, caller, { spec, sector, fn, id }, content, b.lang === 'en' ? 'en' : 'vi');
  // Trial: one of the account's chat messages in this sector, given back if the AI fails.
  return json(mode === 'trial' ? await withTrial(env, caller.userId, sector, 'chat', reply) : await reply());
}

/** One head's decision on the boss's message: its sector lens, the recent chat and its own knowledge in the prompt. */
async function headReply(env: FnEnv, caller: Caller, d: { spec: FnSpec; sector: string; fn: FnKey; id: string }, content: string, lang: 'vi' | 'en') {
  const { spec, sector, fn, id } = d;
  const faces = await facesOf(env, sector, caller.owner);
  const self = faces.find(f => f.id === id);
  // The secretary's own lines in the history are named too — it is a system face, not a department (P3-2).
  const hosts = sectorFaces().find(s => s.id === sector)?.system ?? [];
  const titleOf = (fid: string) => {
    const f = faces.find(x => x.id === fid) ?? hosts.find(x => x.id === fid);
    return f ? faceTitle(f, lang) : fid;
  };
  const { results } = await env.LLM_DB
    .prepare(`SELECT "from", content FROM talks WHERE owner = ? AND user_id = ? AND sector = ? AND kind = 'chat' AND created_at >= ?
              AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?`)
    .bind(caller.owner, caller.userId, sector, retentionCutoff(), CHAT_HISTORY).all<Rec>();
  const langName = LANGS[self?.lang ?? 'vi'] ?? 'Vietnamese';
  // A department head knows what it is in THIS sector (its lens) — so it recognises the sector's own work requests.
  const lens = lensOf(sector, fn);
  const about = self?.about || spec.description?.vi || '';
  const { system, user } = buildChatterPrompt({
    title: self ? faceTitle(self, 'vi') : spec.title.vi,
    specialty: lens ? `${about}${about ? ' — ' : ''}here working as ${fill(lens.role, promptVars(sector))}` : about,
    langName,
    history: chatHistory((results ?? []).reverse(), titleOf, lang),
    message: content,
    // Its sector's + its own department's rows, plus the shared ones; the secretary speaks for the whole sector.
    knowledge: await knowledgeText(env, { query: content, owner: caller.owner, scope: { sector, fn: isSystemFn(fn) ? '' : fn }, limit: 4 }, 'fn/chat'),
  });
  const obj = await generateJson(env, { system, user, maxTokens: 450, temperature: 0.9, languageName: langName });
  return pickChatReply(obj, takesTasks(spec));
}

async function aide(env: FnEnv, request: Request, ctx: ExecutionContext): Promise<Response> {
  // Rate-limit BEFORE touching the body — a guest endpoint must not spend a body-parse/read on a caller already over budget.
  const userId = await requireAuth(request, env.SUPABASE_URL).then(u => u.userId, () => '');
  if (!(await allowAi(env, request, userId))) return rateLimited();
  const b = await readBody(request);
  const parsed = parseDivisionId(str(b.division, 128));
  if (!parsed || parsed.fn !== 'consult') throw new HttpError(404, 'Unknown consult division');
  const content = str(b.content, GUEST_MAX);
  if (!content) throw new HttpError(400, 'content required');
  // `owner` from the body is only ever READ here (the widget embedded on a hub's site) — S12: the hub must allow it
  // (active plan, embedding on, this site among its domains). Refused = no answer at all — never a knowledge-less one
  // on the platform's AI budget; the widget hides itself on the code. userId (possibly '' for a guest) was already
  // verified above — ownerAccess reuses it instead of re-verifying the JWT.
  const owner = str(b.owner, 128);
  const denied = await ownerAccess(request, env, owner, userId, ctx);
  if (denied) return deniedResponse(denied);
  // A sector not released yet answers platform staff only — they review its prompts — never a hub's widget or a guest;
  // or a signed-in account trying it (fn/trial.ts) on the platform's knowledge or its own hub's (never another hub's —
  // no widget), counted against its trial messages.
  let trial = false;
  const platform = isPlatformOwner(owner);
  if (!sectorOf(parsed.sector)?.released && !(platform && (await isPlatformStaff(env, userId)))) {
    trial = !!userId && (platform || owner === userId) && trialAsked(request) && trialOpen(env, parsed.sector)
      && (await isActiveAccount(env, userId));
    if (!trial) throw new HttpError(403, 'This sector is not open yet');
  }
  const answer = () => consultReply(env, ctx, parsed.sector, owner, b, content);
  return json(trial ? await withTrial(env, userId, parsed.sector, 'chat', answer) : await answer());
}

/** The Consult's answer: its sector's knowledge of `owner` (never finance rows), its persona, the guest's own history. */
async function consultReply(env: FnEnv, ctx: ExecutionContext, sector: string, owner: string, b: Rec, content: string) {
  const parsed = { sector, fn: 'consult' as const };
  // The owner's persona (a hub's, or a platform site's own — '@<host>') over the platform's.
  const spec = resolveSpec(parsed.sector, parsed.fn,
    await overrideOf(env, '', parsed.sector, parsed.fn),
    owner ? await overrideOf(env, owner, parsed.sector, parsed.fn) : null);
  if (!spec) throw new HttpError(404, 'Unknown consult division');
  const types: string[] = Array.isArray(b.types) ? b.types.filter((t: unknown) => typeof t === 'string' && t).slice(0, 10) : [];
  let evidence: Evidence[] = [];
  try {
    // Guest widget: its sector's knowledge (+ shared rows) of every public department — never finance rows.
    evidence = await searchKnow(env, { query: content, owner, types, limit: 5, maxExtra: 3, excludeFinance: true, scope: { sector: parsed.sector, fn: '' } }, ctx);
  } catch (err) {
    console.warn('[fn/aide] knowledge search failed:', err); // an answer without knowledge beats none at all
  }
  const lang = b.lang === 'en' ? 'en' : 'vi';
  const self = (await facesOf(env, parsed.sector, owner)).find(f => f.fn === 'consult');
  const { system, user } = buildAidePrompt({
    persona: personaOf(spec, promptVars(parsed.sector)), langName: LANGS[lang], evidence,
    history: guestHistory(b.history, self ? faceTitle(self, lang) : 'Aide'), message: content,
  });
  const obj = await generateJson(env, { system, user, maxTokens: 700, temperature: 0.6, languageName: LANGS[lang] });
  return { ...pickAideReply(obj), sources: evidence.map(e => e.title).filter(Boolean) };
}

export async function handleTalkRoute(request: Request, env: FnEnv, url: URL, ctx: ExecutionContext): Promise<Response | null> {
  const m = url.pathname.match(TALK_PATH);
  if (!m) return null;
  const [, area, id] = m;
  const method = request.method;
  if (area === 'sectors' && method === 'GET' && !id) {
    // The widget's first call — a hub it may not use (expired / embedding off / another site) answers the code here,
    // so the widget hides before any visitor sees it.
    const owner = str(url.searchParams.get('owner'), 128);
    const denied = await ownerAccess(request, env, owner, undefined, ctx);
    if (denied) return deniedResponse(denied);
    return json(mergeFaces(sectorFaces(), await faceRows(env, owner), owner));
  }
  if (area === 'aide' && method === 'POST' && !id) return aide(env, request, ctx);
  const mine = (area === 'log' && method === 'POST' && !id) || (area === 'chat' && method === 'POST' && !id) || (area === 'jobs' && method === 'GET' && !!id)
    || (area === 'trial' && method === 'GET' && !id);
  if (!mine) return null; // GET log, POST jobs, job actions — routes.ts
  const caller = await resolveCaller(request, env);
  if (area === 'trial') return json(await trialUsage(env, caller, str(url.searchParams.get('sector'), 64)));
  if (area === 'log') return appendLog(env, request, caller, await readBody(request, JOB_BODY_MAX));
  if (area === 'chat') return chat(env, request, caller, await readBody(request, JOB_BODY_MAX));
  return json(await loadJob(env, caller, id!));
}
