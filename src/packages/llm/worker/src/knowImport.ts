/**
 * Knowledge import, scoped to one owner (a hub — see hubs.ts). Used by the MCP server (mcp.ts) and by
 * the hub settings route (POST /v1/hubs/import, from <svc-division> inside svc-aide).
 *
 * `know` is INDEPENDENT: every row is a self-contained copy of the data it came from, with no foreign
 * key or reference to any other table. The assistant answers only from these rows. `owner` scopes them:
 * each hub writes, lists and deletes only its own rows, and svc-aide's search filters on owner. Ids are
 * prefixed with the owner, so two hubs can import the same external ids without colliding.
 *
 * Two ways in:
 *   - readUrl(): any JSON API. The caller may give the item array path and field paths; missing ones are
 *     guessed (first array found, then common names like title/name/question, description/content/answer).
 *   - upsertKnow(): items the caller shaped itself (an MCP agent that read some other API).
 *
 * After writing, rows of the same owner that share a tag are linked in `rel` (`related_to`, one
 * undirected edge per pair, same scheme as service/rel-sync.js) so search can expand one hop.
 */
import { D1Client } from './d1';
import { syncKnowIndex, removeKnowIndex, normalizeTags, type VectorizeEnv, type KnowRow } from './vectorize';
import { parseKnowScope, type KnowScope } from './fn/registry';
import { SECTORS } from './fn/sectors/index';
import { FUNCTIONS } from './fn/types';

export interface KnowImportEnv extends VectorizeEnv {
  LLM_DB: D1Database;
}

export const MAX_ITEMS = 200;
const ID_PARAMS = 90; // D1 caps bound parameters per statement at 100
const REL_TYPE = 'related_to';
const MAX_TAG_GROUP = 40; // a tag shared by more rows than this is too generic to mean "related"
const MAX_EDGES = 500;
const OWNER_SCAN = 1000; // existing rows of the owner considered for tag links

// Suggested know.type values — same list as services/presets/admin/know.js; any other string works too.
export const KNOW_TYPES = ['product', 'law', 'faq', 'medical', 'technical', 'finance', 'post', 'other'];

export class ToolError extends Error {}

/** Which sector / department a row serves ('' = all) — what an import or MCP call may pass. */
export const KNOW_SECTORS = SECTORS.map(s => s.id);
export const KNOW_FNS = [...FUNCTIONS, 'consult'];

/** sector / fn of an import or MCP call, validated (fn/registry.ts parseKnowScope) — a typo is an error, never widened to ''. */
export function knowScopeOf(args: Rec | null | undefined): KnowScope {
  const scope = parseKnowScope(args?.sector, args?.fn);
  if (!scope) throw new ToolError(`Unknown sector or fn — sector: one of ${KNOW_SECTORS.join(', ')} or ''; fn: one of ${KNOW_FNS.join(', ')} or ''.`);
  return scope;
}

export interface KnowItem {
  id?: string;
  type?: string;
  title: string;
  description?: string;
  tags?: string | string[];
  meta?: Record<string, unknown>;
  status?: 'active' | 'draft';
}

type Rec = Record<string, any>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const plainText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object') return Array.isArray(value) ? value.map(plainText).filter(Boolean).join(', ') : '';
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};
// Tags may come as "a,b", ["a","b"] or [{ name: "a" }] (category objects) depending on the API.
const tagName = (t: unknown) => (t && typeof t === 'object' ? String((t as Rec).name ?? (t as Rec).title ?? (t as Rec).slug ?? '') : String(t ?? ''));
const tagsOf = (tags: unknown) => (Array.isArray(tags) ? tags.map(tagName).filter(Boolean).join(',') : tagName(tags));
const parseTags = (tags: unknown) => tagsOf(tags).split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean);
// exported: fn/jobs.ts needs the same id a keepIds upsert will land on, to read that row's prior status/meta first.
export const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 200);
const unique = <T>(list: T[]) => [...new Set(list)];

/** Row id for an item of `owner` — the owner prefix keeps hubs from overwriting each other. */
export const knowId = (owner: string, itemId: string) => safeId(`${owner || 'shared'}_${itemId}`);

/** Dot path into a JSON value — 'data.items', 'attributes.name'. */
function pick(obj: unknown, path?: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<any>((v, k) => (v == null ? undefined : v[k]), obj);
}

// ── Writes ───────────────────────────────────────────────────────────────────

export interface UpsertResult {
  created: number;
  updated: number;
  skipped: number; // ids already owned by someone else
  indexed: number; // rows (re)embedded
  unchanged: number; // rows whose content didn't change — index kept, no embedding spent
  related: number;
  ids: string[];
}

export async function upsertKnow(
  env: KnowImportEnv,
  owner: string,
  items: KnowItem[],
  opts: { type?: string; status?: 'active' | 'draft'; source?: string; keepIds?: boolean; app?: string; sector?: string; fn?: string } = {},
): Promise<UpsertResult> {
  if (!Array.isArray(items) || !items.length) throw new ToolError('`items` is empty.');
  if (items.length > MAX_ITEMS) throw new ToolError(`At most ${MAX_ITEMS} items per call — split the rest into more calls.`);
  const client = new D1Client(env.LLM_DB);

  const docs = items.map((item, i) => {
    const title = String(item?.title ?? '').trim();
    const type = String(item?.type || opts.type || '').trim().toLowerCase();
    if (!title) throw new ToolError(`items[${i}] has no title.`);
    if (!type) throw new ToolError(`items[${i}] has no type — pass \`type\` (e.g. ${KNOW_TYPES.slice(0, 3).join(', ')}).`);
    // keepIds: the item id already is a globally unique record id (an approved post/product) — the same id the
    // client's know-sync.js writes for that record, so a later admin edit updates this row instead of duplicating it.
    const id = opts.keepIds && item.id ? safeId(String(item.id)) : knowId(owner, item.id ? String(item.id) : crypto.randomUUID());
    return { id, item, title, type };
  });

  // Existing rows keep created_at and bump version; a row owned by someone else is never touched.
  const existing = new Map<string, Rec>();
  const ids = unique(docs.map(d => d.id));
  for (let i = 0; i < ids.length; i += ID_PARAMS) {
    const chunk = ids.slice(i, i + ID_PARAMS);
    const { results } = await env.LLM_DB
      .prepare(`SELECT id, version, created_at, owner, hash, embedded_at FROM know WHERE id IN (${chunk.map(() => '?').join(', ')})`)
      .bind(...chunk)
      .all();
    for (const r of results ?? []) existing.set(String((r as Rec).id), r as Rec);
  }

  const now = client.now();
  let skipped = 0;
  const rows: { id: string; data: Rec }[] = [];
  for (const { id, item, title, type } of docs) {
    const prev = existing.get(id);
    if (prev && (prev.owner ?? '') !== owner) { skipped++; continue; }
    const meta: Rec = { ...(item.meta ?? {}) };
    if (item.tags != null) meta.tags = tagsOf(item.tags);
    rows.push({
      id,
      data: {
        type, title,
        description: String(item.description ?? '').trim(),
        meta,
        version: (Number(prev?.version) || 0) + 1,
        status: (item.status || opts.status) === 'draft' ? 'draft' : 'active',
        owner,
        source: opts.source ?? '',
        sector: opts.sector ?? '',
        fn: opts.fn ?? '',
        tags: normalizeTags(meta.tags),
        created_at: prev?.created_at || now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  if (rows.length) await client.setMany('know', rows);
  // prev hash/embedded_at let the index skip rows a re-import didn't actually change.
  const { indexed, unchanged } = await syncKnowIndex(env, rows.map(r => {
    const prev = existing.get(r.id);
    return { id: r.id, ...r.data, hash: prev?.hash, embedded_at: prev?.embedded_at } as KnowRow;
  }));
  const related = await linkByTags(env, owner, rows.map(r => r.id));
  const updated = rows.filter(r => existing.has(r.id)).length;

  return { created: rows.length - updated, updated, skipped, indexed, unchanged, related, ids: rows.map(r => r.id) };
}

/** `related_to` edges between rows of `owner` sharing a tag, for pairs touching one of `changedIds`. */
async function linkByTags(env: KnowImportEnv, owner: string, changedIds: string[]): Promise<number> {
  if (!changedIds.length) return 0;
  try {
    const { results } = await env.LLM_DB
      .prepare(`SELECT id, tags FROM know WHERE owner = ? AND status = 'active' AND deleted_at IS NULL AND tags != '' ORDER BY updated_at DESC LIMIT ?`)
      .bind(owner, OWNER_SCAN)
      .all();
    const byTag = new Map<string, string[]>();
    for (const r of (results ?? []) as Rec[]) {
      for (const tag of parseTags(r.tags)) byTag.set(tag, [...(byTag.get(tag) ?? []), r.id]);
    }
    const changed = new Set(changedIds);
    const pairs = new Map<string, Set<string>>(); // "a|b" (sorted) → shared tags
    for (const [tag, ids] of byTag) {
      if (ids.length < 2 || ids.length > MAX_TAG_GROUP) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          if (!changed.has(ids[i]) && !changed.has(ids[j])) continue;
          const key = [ids[i], ids[j]].sort().join('|');
          pairs.set(key, (pairs.get(key) ?? new Set()).add(tag));
        }
      }
    }
    const now = new Date().toISOString();
    const statements = [...pairs].slice(0, MAX_EDGES).map(([key, tags]) => {
      const [from, to] = key.split('|');
      return env.LLM_DB
        // weight = shared tag count — search expands through the strongest links first
        .prepare(`INSERT INTO rel (id, from_id, to_id, type, meta, owner, weight, created_at, updated_at, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET meta = excluded.meta, weight = excluded.weight, updated_at = excluded.updated_at, deleted_at = NULL`)
        .bind(`${from}_${to}_${REL_TYPE}`, from, to, REL_TYPE, JSON.stringify({ tags: [...tags] }), owner, tags.size, now, now);
    });
    if (statements.length) await env.LLM_DB.batch(statements);
    return statements.length;
  } catch (err) {
    console.error('[worker-llm/knowImport] linkByTags failed:', err);
    return 0;
  }
}

/** Soft-deletes rows of `owner` (ids of other owners are ignored) + their vectors and edges. */
export async function deleteKnow(env: KnowImportEnv, owner: string, ids: string[]): Promise<number> {
  if (!Array.isArray(ids) || !ids.length) throw new ToolError('`ids` is empty.');
  const now = new Date().toISOString();
  let deleted = 0;
  for (const id of ids) {
    const res = await env.LLM_DB
      .prepare(`UPDATE know SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner = ? AND deleted_at IS NULL`)
      .bind(now, now, id, owner)
      .run();
    if (!res.meta.changes) continue;
    deleted++;
    await env.LLM_DB.prepare(`UPDATE rel SET deleted_at = ?, updated_at = ? WHERE (from_id = ? OR to_id = ?) AND deleted_at IS NULL`).bind(now, now, id, id).run();
    await removeKnowIndex(env, [id]);
  }
  return deleted;
}

/**
 * Soft-deletes `owner`'s rows written by `source` that a full re-sync did not touch (updated_at < `before`, the sync's
 * start) — e.g. products removed from the shop since the last sync. upsertKnow stamps updated_at on every row it
 * writes, unchanged content included, so "not written since `before`" = "no longer sent by the source".
 */
export async function pruneKnow(env: KnowImportEnv, owner: string, source: string, before: string): Promise<number> {
  if (!source) return 0;
  const { results } = await env.LLM_DB
    .prepare(`SELECT id FROM know WHERE owner = ? AND source = ? AND updated_at < ? AND deleted_at IS NULL`)
    .bind(owner, source, before)
    .all();
  const ids = ((results ?? []) as Rec[]).map(r => String(r.id));
  return ids.length ? deleteKnow(env, owner, ids) : 0;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listKnow(env: KnowImportEnv, owner: string, opts: { type?: string; status?: string; limit?: number; sector?: string; fn?: string } = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), MAX_ITEMS);
  const where = ['owner = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [owner];
  if (opts.type) { where.push('type = ?'); params.push(opts.type); }
  if (opts.status) { where.push('status = ?'); params.push(opts.status); }
  if (opts.sector) { where.push('sector = ?'); params.push(opts.sector); }
  if (opts.fn) { where.push('fn = ?'); params.push(opts.fn); }
  const { results } = await env.LLM_DB
    .prepare(`SELECT id, type, title, description, status, source, sector, fn, updated_at FROM know WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`)
    .bind(...params, limit)
    .all();
  return ((results ?? []) as Rec[]).map(r => ({ ...r, description: undefined, excerpt: String(r.description ?? '').slice(0, 160) }));
}

/**
 * (Re)builds the search index of `owner`'s rows, `limit` at a time — rows never indexed with chunks
 * (embedded_at = '', e.g. written before the chunked index existed), or every row with `force`. Callers
 * loop while `remaining` > 0 (one call stays well inside a request's time budget).
 */
export async function reindexKnow(env: KnowImportEnv, owner: string, opts: { limit?: number; force?: boolean; after?: string } = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100);
  // force walks by id (cursor `after`) since embedded_at no longer tells done from pending
  const pending = opts.force ? `id > ?` : `embedded_at = '' AND status = 'active'`; // drafts have no index to build
  const params = opts.force ? [owner, opts.after ?? ''] : [owner];
  const { results } = await env.LLM_DB
    .prepare(`SELECT * FROM know WHERE owner = ? AND deleted_at IS NULL AND ${pending} ORDER BY id LIMIT ?`)
    .bind(...params, limit)
    .all();
  const rows = (results ?? []) as unknown as KnowRow[];
  const index = await syncKnowIndex(env, rows, { force: opts.force });
  const left = await env.LLM_DB
    .prepare(`SELECT COUNT(*) AS n FROM know WHERE owner = ? AND deleted_at IS NULL AND ${opts.force ? 'id > ?' : `embedded_at = '' AND status = 'active'`}`)
    .bind(owner, ...(opts.force ? [rows.at(-1)?.id ?? '\uffff'] : []))
    .first<{ n: number }>();
  return { processed: rows.length, ...index, remaining: Number(left?.n) || 0, after: rows.at(-1)?.id ?? null };
}

/** Active rows of `owner` not yet in the chunked index — reindex them (reindexKnow) to make them searchable. */
export async function pendingIndex(env: KnowImportEnv, owner: string): Promise<number> {
  const row = await env.LLM_DB
    .prepare(`SELECT COUNT(*) AS n FROM know WHERE owner = ? AND deleted_at IS NULL AND status = 'active' AND embedded_at = ''`)
    .bind(owner)
    .first<{ n: number }>();
  return Number(row?.n) || 0;
}

/** Row counts of `owner` by type — hub summaries. */
export async function countKnow(env: KnowImportEnv, owner: string): Promise<Record<string, number>> {
  const { results } = await env.LLM_DB
    .prepare(`SELECT type, COUNT(*) AS n FROM know WHERE owner = ? AND deleted_at IS NULL GROUP BY type`)
    .bind(owner)
    .all();
  return Object.fromEntries(((results ?? []) as Rec[]).map(r => [r.type, Number(r.n)]));
}

// ── Fetching ─────────────────────────────────────────────────────────────────

export interface UrlMapping {
  url: string;
  itemsPath?: string;
  headers?: Record<string, string>;
  fields?: { title?: string; description?: string | string[]; id?: string; tags?: string; url?: string };
  type?: string;
  limit?: number;
}

const GUESS = {
  title: ['title', 'name', 'question', 'label', 'heading', 'subject'],
  description: ['description', 'content', 'body', 'answer', 'summary', 'text', 'details', 'excerpt'],
  id: ['id', '_id', 'uuid', 'slug', 'sku', 'code', 'key'],
  tags: ['tags', 'categories', 'category', 'keywords'],
  // the item's own page — appended as a "Link:" line, so the assistant can hand it to the visitor (it only gives links found in the knowledge)
  url: ['url', 'link', 'href', 'permalink', 'product_url', 'page_url'],
};

/** An item's page as an absolute http(s) URL ("chatzui.com/x" → https), or '' — never javascript: / data: / credentials. */
const pageUrl = (v: unknown): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s || s.length > 500) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? `https://${s}` : 'x:');
    return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
};

/** First array in the response, breadth-first (root, then data/items/results…), with its path. */
function findArray(body: unknown): { list: unknown[]; path: string } | null {
  const queue: { value: unknown; path: string; depth: number }[] = [{ value: body, path: '', depth: 0 }];
  while (queue.length) {
    const { value, path, depth } = queue.shift()!;
    if (Array.isArray(value)) return { list: value, path };
    if (value && typeof value === 'object' && depth < 3) {
      for (const [k, v] of Object.entries(value)) queue.push({ value: v, path: path ? `${path}.${k}` : k, depth: depth + 1 });
    }
  }
  return null;
}

const guessField = (sample: Rec, names: string[]) => names.find(n => sample?.[n] != null && sample[n] !== '');

// S11: a URL someone else controls can answer slowly or endlessly — both are bounded before anything is parsed.
export const URL_MAX_BYTES = 5 * 1024 * 1024;
export const URL_TIMEOUT_MS = 15_000;

/** The body as text, read as a stream and stopped once it passes `max` bytes (Content-Length can lie or be absent). */
async function readCapped(res: Response, max: number, host: string): Promise<string> {
  const declared = Number(res.headers.get('Content-Length'));
  if (declared > max) throw new ToolError(`${host} answered more than ${Math.round(max / 1048576)} MB — narrow the request.`);
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      throw new ToolError(`${host} answered more than ${Math.round(max / 1048576)} MB — narrow the request.`);
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

/** Resolved mapping (given or guessed) + mapped items, so callers can show what was used. */
export async function readUrl(m: UrlMapping): Promise<{ items: KnowItem[]; mapping: Required<Pick<UrlMapping, 'itemsPath'>> & { fields: Rec } }> {
  let parsed: URL;
  try { parsed = new URL(m?.url); } catch { throw new ToolError(`Invalid URL: ${m?.url}`); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new ToolError('Only http(s) URLs can be imported.');
  let res: Response;
  try {
    res = await fetch(parsed.toString(), { headers: { Accept: 'application/json', ...(m.headers ?? {}) }, signal: AbortSignal.timeout(URL_TIMEOUT_MS) });
  } catch (err) {
    const timedOut = (err as Error)?.name === 'TimeoutError' || (err as Error)?.name === 'AbortError';
    throw new ToolError(timedOut ? `${parsed.host} did not answer within ${URL_TIMEOUT_MS / 1000}s.` : `${parsed.host} could not be reached.`);
  }
  if (!res.ok) throw new ToolError(`${parsed.host} answered ${res.status} ${res.statusText}`);
  const text = await readCapped(res, URL_MAX_BYTES, parsed.host);
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new ToolError(`${parsed.host} did not return JSON.`); }

  const found = m.itemsPath != null && m.itemsPath !== '' ? { list: pick(body, m.itemsPath), path: m.itemsPath } : findArray(body);
  if (!found || !Array.isArray(found.list)) throw new ToolError(`No item array found${m.itemsPath ? ` at "${m.itemsPath}"` : ''} — pass itemsPath.`);
  const sample = (found.list.find(v => v && typeof v === 'object') ?? {}) as Rec;
  const fields = {
    title: m.fields?.title || guessField(sample, GUESS.title),
    description: m.fields?.description ?? GUESS.description.filter(n => sample[n] != null),
    id: m.fields?.id || guessField(sample, GUESS.id),
    tags: m.fields?.tags || guessField(sample, GUESS.tags),
    url: m.fields?.url || guessField(sample, GUESS.url),
  };
  if (!fields.title) throw new ToolError(`Couldn't guess the title field (tried ${GUESS.title.join(', ')}) — pass fields.title.`);
  const descPaths = Array.isArray(fields.description) ? fields.description : [fields.description];

  const limit = Math.min(Number(m.limit) || MAX_ITEMS, MAX_ITEMS);
  const items = found.list.slice(0, limit).map(raw => {
    const externalId = fields.id ? pick(raw, fields.id) : undefined;
    const link = fields.url ? pageUrl(pick(raw, fields.url)) : '';
    return {
      // host prefix: the same external id from two different APIs stays two rows
      id: externalId != null && externalId !== '' ? `${parsed.hostname}-${externalId}` : undefined,
      type: m.type,
      title: plainText(pick(raw, fields.title)),
      description: [...descPaths.map(p => plainText(pick(raw, p))), link && `Link: ${link}`].filter(Boolean).join('\n\n'),
      tags: fields.tags ? (pick(raw, fields.tags) as string | string[]) : undefined,
    } as KnowItem;
  }).filter(item => item.title);
  return { items, mapping: { itemsPath: found.path, fields } };
}
