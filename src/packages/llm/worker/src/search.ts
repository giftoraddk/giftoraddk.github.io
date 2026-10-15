/**
 * POST /v1/search — hybrid retrieval over one owner's `know`, for svc-aide's answers. Public (guest widget),
 * same trust level as GET /v1/data/know|rel (see tablePolicy.ts).
 *
 *   body: { query, owner?: '' (hub id; '' = shared platform knowledge; '@<host>' = one platform site's own — accepted
 *           only when fn/owner.ts ownerAccess() — else 403 { code }),
 *           types?: string[], sector?, fn? (scope — rows of that sector / department plus the ones shared by all),
 *           limit?: 5, maxExtra?: 3 }
 *   →     { evidence: [{ id, title, type, meta, description, score, viaRelation? }] }
 *
 * Two arms over the chunk index (see vectorize.ts), fused with Reciprocal Rank Fusion:
 *   1. semantic — embed the query, Vectorize.query() in namespace = owner (a hub never competes with other
 *      hubs for topK)
 *   2. keyword  — FTS5 BM25 over the diacritics-folded chunks: exact codes, names, "Điều 12"… that
 *      embeddings blur
 * Chunk scores roll up to their row; each row's `description` in the evidence is its best matching chunks
 * (in document order), not the whole text — shorter prompts, and the part that actually answers. Then 1-hop
 * expansion through `rel` (same owner, heaviest edges first). D1 rows are the source of truth; Vectorize is
 * only trusted for ordering.
 *
 * Migration: rows written before the chunk index exist only as one old-scheme vector (id = know.id, no
 * namespace). While an owner still has such rows (embedded_at = ''), a third "legacy" arm queries them too,
 * and each search indexes a few more in the background (waitUntil) — so answers never go blank after the
 * deploy, and the owner converges without anyone pressing "Build search index".
 */
import { embedText, type EmbedEnv } from './embed';
import { foldText, namespaceOf, type VectorizeEnv } from './vectorize';
import { pendingIndex, reindexKnow } from './knowImport';
import { ownerAccess, deniedResponse } from './fn/owner';
import { parseKnowScope, type KnowScope } from './fn/registry';
import { requireAuth } from './lib/auth';
import { allowAi, AI_LIMIT_PERIOD_S, type RateLimitEnv } from './rateLimit';
import { readBody } from './lib/body';
import { redactPricing } from './columns';
import type { DataEnv } from './data';

export interface SearchEnv extends EmbedEnv, VectorizeEnv {
  LLM_DB: D1Database;
  VEC: VectorizeIndex;
}

const BACKGROUND_REINDEX = 20; // rows indexed per search while an owner still has old-scheme rows

interface KnowRow {
  id: string;
  title: string;
  description: string;
  type: string;
  owner: string;
  meta: Record<string, any>;
}

export interface Evidence extends KnowRow {
  score?: number;
  viaRelation?: string;
}

type Rec = Record<string, any>;

const RRF_K = 60;
const ARM_K = 30; // candidates per arm
const SCOPED_ARM_K = 60; // a scoped search drops other sectors' / departments' rows after ranking — reach further first
// Vectorize can't filter by sector / department (no metadata index) — a scoped semantic arm asks for its maximum
// (topK ≤ 100 with returnMetadata 'none'); the keyword arm is narrowed in SQL instead (keywordArm)
const SCOPED_SEMANTIC_K = 100;
const CHUNKS_PER_ROW = 2; // best passages quoted per row
const EXTRA_CHARS = 1200; // a related (expanded) row contributes its opening only

const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) } });
const placeholders = (n: number) => Array(n).fill('?').join(',');
const parseMeta = (m: unknown) => { try { return JSON.parse(String(m || '{}')); } catch { return {}; } };

/** FTS5 MATCH expression: folded query words (≥ 2 chars), each quoted, OR-ed — BM25 ranks the overlap. */
function ftsQuery(query: string): string {
  const words = [...new Set(foldText(query).match(/[\p{L}\p{N}]+/gu) ?? [])].filter(w => w.length >= 2).slice(0, 12);
  return words.map(w => `"${w}"`).join(' OR ');
}

async function semanticArm(env: SearchEnv, vector: number[], owner: string, k: number): Promise<string[]> {
  const result = await env.VEC.query(vector, { topK: k, namespace: namespaceOf(owner), returnMetadata: 'none' });
  return (result.matches ?? []).map(m => m.id);
}

/** Old-scheme vectors (id = know.id, no namespace) of this owner's not-yet-reindexed rows. */
async function legacyArm(env: SearchEnv, vector: number[], owner: string, k: number): Promise<string[]> {
  const result = await env.VEC.query(vector, { topK: 100, returnMetadata: 'none' });
  const ids = (result.matches ?? []).map(m => m.id);
  if (!ids.length) return [];
  const { results } = await env.LLM_DB
    .prepare(`SELECT id FROM know WHERE id IN (${placeholders(ids.length)}) AND owner = ? AND embedded_at = '' AND deleted_at IS NULL AND status = 'active'`)
    .bind(...ids, owner)
    .all();
  const found = new Set(((results ?? []) as Rec[]).map(r => r.id as string));
  return ids.filter(id => found.has(id)).slice(0, k);
}

/** Keyword arm, already narrowed to the rows of the scope — so other sectors' rows in a shared owner ('' holds every
 *  sector's) can't crowd the ones that answer out of the top k. */
async function keywordArm(env: SearchEnv, query: string, owner: string, k: number, scope: KnowScope): Promise<string[]> {
  const match = ftsQuery(query);
  if (!match) return [];
  try {
    const { results } = await env.LLM_DB
      .prepare(`SELECT c.id FROM know_fts JOIN know_chunks c ON c.seq = know_fts.rowid JOIN know k ON k.id = c.know_id
        WHERE know_fts MATCH ? AND c.owner = ? AND k.deleted_at IS NULL AND k.status = 'active'${scopeSql(scope, 'k.')}
        ORDER BY bm25(know_fts, 3.0, 1.0, 2.0) LIMIT ?`)
      .bind(match, owner, ...scopeArgs(scope), k)
      .all();
    return ((results ?? []) as Rec[]).map(r => r.id as string);
  } catch (err) {
    console.error('[worker-llm/search] keyword arm failed:', err); // bad MATCH syntax must not kill the answer
    return [];
  }
}

/** Scope = the rows of that sector / department plus the ones shared by every sector / department ('' columns). */
const scopeSql = (scope: KnowScope, t = '') =>
  `${scope.sector ? ` AND ${t}sector IN ('', ?)` : ''}${scope.fn ? ` AND ${t}fn IN ('', ?)` : ''}`;
const scopeArgs = (scope: KnowScope) => [...(scope.sector ? [scope.sector] : []), ...(scope.fn ? [scope.fn] : [])];

async function fetchRows(db: D1Database, ids: string[], owner: string, excludeFinance: boolean, scope: KnowScope): Promise<Map<string, KnowRow>> {
  if (!ids.length) return new Map();
  const { results } = await db
    .prepare(`SELECT id, title, description, type, owner, meta FROM know
      WHERE id IN (${placeholders(ids.length)}) AND owner = ? AND deleted_at IS NULL AND status = 'active'${excludeFinance ? " AND fn != 'finance' AND type != 'finance'" : ''}${scopeSql(scope)}`)
    .bind(...ids, owner, ...scopeArgs(scope))
    .all();
  return new Map(((results ?? []) as Rec[]).map(r => [r.id, { ...r, meta: parseMeta(r.meta) } as KnowRow]));
}

/** 1-hop expansion through `rel` — up to `maxExtra` rows linked (either direction) to the evidence. */
async function expandViaRelations(db: D1Database, evidence: Evidence[], maxExtra: number, owner: string, types: string[], excludeFinance: boolean, scope: KnowScope): Promise<Evidence[]> {
  if (!evidence.length || maxExtra <= 0) return evidence;
  const seen = new Set(evidence.map(e => e.id));
  const anchors = [...seen];
  const { results } = await db
    .prepare(`SELECT from_id, to_id, type FROM rel WHERE deleted_at IS NULL AND owner = ?
      AND (from_id IN (${placeholders(anchors.length)}) OR to_id IN (${placeholders(anchors.length)}))
      ORDER BY weight DESC LIMIT 50`)
    .bind(owner, ...anchors, ...anchors)
    .all();
  const candidates: { id: string; via: string }[] = [];
  for (const r of (results ?? []) as Rec[]) {
    const other = seen.has(r.from_id) ? r.to_id : seen.has(r.to_id) ? r.from_id : null;
    if (!other || seen.has(other)) continue;
    seen.add(other);
    candidates.push({ id: other, via: r.type });
    if (candidates.length >= maxExtra) break;
  }
  const rows = await fetchRows(db, candidates.map(c => c.id), owner, excludeFinance, scope);
  const extra = candidates.flatMap(c => {
    const row = rows.get(c.id);
    if (!row || (types.length && !types.includes(row.type))) return [];
    return [{ ...row, description: row.description.slice(0, EXTRA_CHARS), viaRelation: c.via }];
  });
  return [...evidence, ...extra];
}

export interface SearchParams {
  query: string; owner: string; types?: string[]; limit?: number; maxExtra?: number;
  // An untrusted/guest caller (handleSearch) never sees finance-fn rows — an internal caller (fn/talk.ts's
  // chat/aide, which never returns raw `meta`/`fn` to its own caller) keeps the default (false).
  excludeFinance?: boolean;
  scope?: KnowScope; // already validated (parseKnowScope) — '' parts = no filter
}

/** Ranked evidence from ONE owner's knowledge. Whose knowledge a caller may read is the route's decision (ownerAccess / JWT). */
export async function searchKnow(env: SearchEnv, p: SearchParams, ctx?: ExecutionContext): Promise<Evidence[]> {
  const query = String(p.query ?? '').trim();
  if (!query) return [];
  const limit = Math.min(Math.max(Number(p.limit) || 5, 1), 20);
  const maxExtra = Math.min(Math.max(Number(p.maxExtra ?? 3) || 0, 0), 10);
  const types = (p.types ?? []).filter((t): t is string => typeof t === 'string' && !!t);
  const owner = p.owner;
  const excludeFinance = !!p.excludeFinance;
  const scope: KnowScope = { sector: p.scope?.sector ?? '', fn: p.scope?.fn ?? '' };
  const k = scope.sector || scope.fn ? SCOPED_ARM_K : ARM_K;

  const [vector, pending] = await Promise.all([embedText(env, query), pendingIndex(env, owner)]);
  if (pending && ctx) ctx.waitUntil(reindexKnow(env, owner, { limit: BACKGROUND_REINDEX }).catch(() => undefined));
  const [semantic, keyword, legacy] = await Promise.all([
    semanticArm(env, vector, owner, k === ARM_K ? k : SCOPED_SEMANTIC_K),
    keywordArm(env, query, owner, k, scope),
    pending ? legacyArm(env, vector, owner, k) : Promise.resolve([] as string[]),
  ]);
  const chunkScore = new Map<string, number>();
  for (const arm of [semantic, keyword]) arm.forEach((id, rank) => chunkScore.set(id, (chunkScore.get(id) ?? 0) + 1 / (RRF_K + rank + 1)));
  const legacyScore = new Map(legacy.map((id, rank) => [id, 1 / (RRF_K + rank + 1)]));
  if (!chunkScore.size && !legacyScore.size) return [];

  const chunkIds = [...chunkScore.keys()];
  const { results } = chunkIds.length
    ? await env.LLM_DB
      .prepare(`SELECT id, know_id, idx, text FROM know_chunks WHERE id IN (${placeholders(chunkIds.length)}) AND owner = ?`)
      .bind(...chunkIds, owner)
      .all()
    : { results: [] };

  // Row score = best chunk + a little for every other matching chunk (a row that matches in several places wins ties).
  const perRow = new Map<string, { score: number; chunks: { idx: number; text: string; score: number }[] }>();
  for (const c of (results ?? []) as Rec[]) {
    const score = chunkScore.get(c.id) ?? 0;
    const entry = perRow.get(c.know_id) ?? { score: 0, chunks: [] };
    entry.chunks.push({ idx: c.idx, text: c.text, score });
    perRow.set(c.know_id, entry);
  }
  for (const entry of perRow.values()) {
    const sorted = entry.chunks.map(c => c.score).sort((a, b) => b - a);
    entry.score = sorted[0] + sorted.slice(1).reduce((a, b) => a + b, 0) * 0.25;
  }
  // Legacy rows have no chunks: whole-row score, description quoted from the row itself (cut below).
  for (const [id, score] of legacyScore) if (!perRow.has(id)) perRow.set(id, { score, chunks: [] });

  const ranked = [...perRow.entries()].sort((a, b) => b[1].score - a[1].score);
  const rows = await fetchRows(env.LLM_DB, ranked.map(([id]) => id), owner, excludeFinance, scope);
  const evidence: Evidence[] = [];
  for (const [id, entry] of ranked) {
    const row = rows.get(id);
    if (!row || (types.length && !types.includes(row.type))) continue; // stale chunk / filtered out
    const best = entry.chunks.sort((a, b) => b.score - a.score).slice(0, CHUNKS_PER_ROW).sort((a, b) => a.idx - b.idx);
    const passage = best.map(c => c.text).filter(Boolean).join('\n…\n');
    evidence.push({ ...row, description: passage || row.description.slice(0, EXTRA_CHARS), score: Number(entry.score.toFixed(4)) });
    if (evidence.length >= limit) break;
  }

  return expandViaRelations(env.LLM_DB, evidence, maxExtra, owner, types, excludeFinance, scope);
}

const LINE_MAX = 600; // one passage inside a prompt

/**
 * Ranked evidence as prompt lines ("- title: passage") for the Worker's own prompts — the chat heads and a step with
 * `knowledge: true`. Never throws: an answer without knowledge beats no answer. The caller fences the text (prompt.ts).
 */
export async function knowledgeText(env: SearchEnv, p: { query: string; owner: string; scope: KnowScope; limit: number }, where: string): Promise<string> {
  try {
    const evidence = await searchKnow(env, { query: p.query, owner: p.owner, limit: p.limit, maxExtra: 0, scope: p.scope });
    return evidence.map(e => `- ${e.title}: ${String(e.description ?? '').slice(0, LINE_MAX)}`).join('\n');
  } catch (err) {
    console.warn(`[${where}] knowledge search failed:`, err);
    return '';
  }
}

export async function handleSearch(
  request: Request,
  env: SearchEnv & Pick<DataEnv, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'> & RateLimitEnv,
  ctx?: ExecutionContext,
): Promise<Response> {
  // Public (guest-allowed) but spends Workers AI (it embeds the query) — same per-IP/per-user budget as /v1/ai/stream.
  const userId = await requireAuth(request, env.SUPABASE_URL).then(u => u.userId, () => '');
  if (!(await allowAi(env, request, userId))) {
    return json({ message: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(AI_LIMIT_PERIOD_S) } });
  }
  const body = await readBody(request); // 64 KB cap — was an uncapped request.json()
  const owner = typeof body.owner === 'string' ? body.owner : '';
  // S12: a hub's knowledge is public only while that hub allows embedding — or the hub itself / an admin asks.
  // userId (possibly '' for a guest) was already verified above — ownerAccess reuses it instead of re-verifying the JWT.
  const denied = await ownerAccess(request, env, owner, userId, ctx);
  if (denied) return deniedResponse(denied);
  const scope = parseKnowScope(body.sector, body.fn);
  if (!scope) return json({ message: 'Unknown sector or department' }, { status: 400 });
  const evidence = await searchKnow(env, {
    query: typeof body.query === 'string' ? body.query : '', owner,
    types: Array.isArray(body.types) ? body.types : [], limit: body.limit, maxExtra: body.maxExtra, scope,
    excludeFinance: true, // this endpoint returns raw evidence straight to the caller — never finance-fn rows
  }, ctx);
  // Same caller-facing response as data.ts's GET /v1/data/know: cost never reaches an untrusted reader.
  return json({ evidence: evidence.map(e => ({ ...e, meta: redactPricing(e.meta) })) });
}
