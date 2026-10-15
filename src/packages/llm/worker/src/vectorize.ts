/**
 * The search index behind `know` — everything here is DERIVED data, rebuilt from the `know` row at will:
 *   - know_chunks : the row split into ~CHUNK_CHARS passages (the unit search returns and the prompt quotes)
 *   - Vectorize   : one vector per chunk, in namespace = owner (so a hub's query never competes with other
 *                   hubs' vectors for topK), id = chunk id (≤ 64 bytes — Vectorize's id limit)
 *   - know_fts    : one FTS5 row per chunk (rowid = know_chunks.seq), diacritics-folded, for exact terms
 *
 * syncKnowIndex() is the single entry point (data.ts after a write, knowImport.ts after a bulk import,
 * hubs.ts's reindex). It skips rows whose content hash hasn't changed since the last index, drops the index
 * of drafts/deleted rows, and never throws — an embedding hiccup must not undo a D1 write that succeeded.
 * `know.hash / chunks / embedded_at` record the state; embedded_at = '' marks a row still on the old
 * one-vector-per-row scheme (vector id = know.id, no namespace), which the first sync also cleans up.
 */
import { embedTexts, type EmbedEnv } from './embed';

export interface VectorizeEnv extends EmbedEnv {
  VEC: VectorizeIndex;
  LLM_DB: D1Database;
}

export interface KnowRow {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  owner?: string;
  tags?: string;
  meta?: Record<string, any> | string;
  hash?: string;        // hash from the LAST index (as read from D1) — compared, never written from here
  embedded_at?: string;
  deleted_at?: string | null;
}

const CHUNK_CHARS = 900;
const CHUNK_OVERLAP = 120;
const MAX_CHUNKS = 24; // ≈ 20k characters of one row are searchable; the rest is still stored
const EMBED_BATCH = 20;
const ID_PARAMS = 90; // D1 caps bound parameters per statement at 100

export const SHARED_NAMESPACE = '__shared';
/** Vectorize namespace of an owner ('' = shared platform knowledge). */
export const namespaceOf = (owner?: string | null) => (owner ? owner.slice(0, 64) : SHARED_NAMESPACE);

type Rec = Record<string, any>;

// ── Text helpers ─────────────────────────────────────────────────────────────

/** Lowercase, no Vietnamese diacritics (đ → d) — what know_fts stores and what queries are folded to. */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Comma list of lowercase tags from a tags column / meta.tags value. */
export function normalizeTags(tags: unknown): string {
  const list = Array.isArray(tags) ? tags.map(String) : String(tags ?? '').split(/[,;]/);
  return [...new Set(list.map(t => t.trim().toLowerCase()).filter(Boolean))].join(',');
}

function tagsOfRow(row: KnowRow): string {
  if (row.tags) return normalizeTags(row.tags);
  const meta = typeof row.meta === 'string' ? safeJson(row.meta) : row.meta ?? {};
  return normalizeTags(meta?.tags);
}

const safeJson = (s: string) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const contentHash = (row: KnowRow) => sha256([row.type, row.title, row.description ?? '', tagsOfRow(row)].join('␟'));

/**
 * Splits `text` into passages of at most CHUNK_CHARS, cutting at paragraph, then sentence, then word
 * boundaries; each passage after the first repeats the last CHUNK_OVERLAP characters of the previous one so a
 * fact straddling a cut is still whole somewhere. Empty text → one empty chunk (the title alone is indexed).
 */
export function chunkText(text: string): string[] {
  const clean = String(text ?? '').replace(/\r/g, '').trim();
  if (clean.length <= CHUNK_CHARS) return [clean];
  const units = clean.split(/\n{2,}/).flatMap(p =>
    p.length <= CHUNK_CHARS ? [p] : p.split(/(?<=[.!?…;:])\s+/).flatMap(s =>
      s.length <= CHUNK_CHARS ? [s] : s.match(new RegExp(`.{1,${CHUNK_CHARS}}(\\s|$)`, 'gs')) ?? [s]));
  const chunks: string[] = [];
  let current = '';
  for (const unit of units) {
    const piece = unit.trim();
    if (!piece) continue;
    if (current && current.length + piece.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      if (chunks.length >= MAX_CHUNKS) return chunks;
      const tail = current.slice(-CHUNK_OVERLAP);
      current = `${tail.slice(tail.indexOf(' ') + 1)} ${piece}`.trim();
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current && chunks.length < MAX_CHUNKS) chunks.push(current);
  return chunks;
}

// ── Index maintenance ────────────────────────────────────────────────────────

async function chunkIdsOf(db: D1Database, knowIds: string[]): Promise<{ seq: number; id: string }[]> {
  const out: { seq: number; id: string }[] = [];
  for (let i = 0; i < knowIds.length; i += ID_PARAMS) {
    const part = knowIds.slice(i, i + ID_PARAMS);
    const { results } = await db.prepare(`SELECT seq, id FROM know_chunks WHERE know_id IN (${part.map(() => '?').join(',')})`).bind(...part).all();
    out.push(...((results ?? []) as { seq: number; id: string }[]));
  }
  return out;
}

/** Drops chunks, their vectors and FTS rows (+ an old-scheme vector named after the row id). */
async function dropIndex(env: VectorizeEnv, knowIds: string[]): Promise<void> {
  if (!knowIds.length) return;
  const old = await chunkIdsOf(env.LLM_DB, knowIds);
  const legacy = knowIds.filter(id => new TextEncoder().encode(id).length <= 64);
  const vectorIds = [...old.map(c => c.id), ...legacy];
  for (let i = 0; i < vectorIds.length; i += 1000) await env.VEC.deleteByIds(vectorIds.slice(i, i + 1000));
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < old.length; i += ID_PARAMS) {
    const seqs = old.slice(i, i + ID_PARAMS).map(c => c.seq);
    statements.push(env.LLM_DB.prepare(`DELETE FROM know_fts WHERE rowid IN (${seqs.map(() => '?').join(',')})`).bind(...seqs));
  }
  for (let i = 0; i < knowIds.length; i += ID_PARAMS) {
    const part = knowIds.slice(i, i + ID_PARAMS);
    statements.push(env.LLM_DB.prepare(`DELETE FROM know_chunks WHERE know_id IN (${part.map(() => '?').join(',')})`).bind(...part));
  }
  if (statements.length) await env.LLM_DB.batch(statements);
}

export interface IndexResult {
  indexed: number; // rows (re)embedded
  unchanged: number; // rows skipped — same content hash as the last index
  removed: number; // drafts / deleted rows whose index was dropped
}

/** Brings the search index of `rows` in line with their content. `force` re-embeds unchanged rows too. */
export async function syncKnowIndex(env: VectorizeEnv, rows: KnowRow[], opts: { force?: boolean } = {}): Promise<IndexResult> {
  const result: IndexResult = { indexed: 0, unchanged: 0, removed: 0 };
  try {
    const dead = rows.filter(r => r.deleted_at || r.status !== 'active');
    const live = rows.filter(r => !dead.includes(r));
    await dropIndex(env, dead.map(r => r.id));
    result.removed = dead.length;
    if (dead.length) {
      await env.LLM_DB.batch(dead.map(r => env.LLM_DB.prepare(`UPDATE know SET hash = '', chunks = 0, embedded_at = '' WHERE id = ?`).bind(r.id)));
    }

    const todo: { row: KnowRow; hash: string; tags: string }[] = [];
    for (const row of live) {
      const hash = await contentHash(row);
      if (!opts.force && row.embedded_at && row.hash === hash) { result.unchanged++; continue; }
      todo.push({ row, hash, tags: tagsOfRow(row) });
    }
    if (!todo.length) return result;
    await dropIndex(env, todo.map(t => t.row.id));

    const now = new Date().toISOString();
    for (let i = 0; i < todo.length; i += EMBED_BATCH) {
      const batch = todo.slice(i, i + EMBED_BATCH);
      const pieces: { chunkId: string; t: (typeof todo)[number]; idx: number; text: string }[] = [];
      for (const t of batch) {
        const prefix = (await sha256(t.row.id)).slice(0, 40);
        chunkText(t.row.description).forEach((text, idx) => pieces.push({ chunkId: `${prefix}_${idx}`, t, idx, text }));
      }
      // Title in every chunk's embedding: a passage alone often doesn't say what it is about.
      const inputs = pieces.map(p => `${p.t.row.title}\n${p.text}`.slice(0, 2000));
      const values: number[][] = [];
      for (let j = 0; j < inputs.length; j += EMBED_BATCH) values.push(...(await embedTexts(env, inputs.slice(j, j + EMBED_BATCH))));
      await env.VEC.upsert(pieces.map((p, j) => ({
        id: p.chunkId, values: values[j], namespace: namespaceOf(p.t.row.owner),
        metadata: { know_id: p.t.row.id, type: p.t.row.type },
      })));

      const inserts = pieces.map(p => env.LLM_DB
        .prepare(`INSERT INTO know_chunks (id, know_id, owner, idx, text, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING seq`)
        .bind(p.chunkId, p.t.row.id, p.t.row.owner ?? '', p.idx, p.text, now));
      const seqs = (await env.LLM_DB.batch(inserts)).map(r => (r.results?.[0] as Rec | undefined)?.seq as number);
      const follow = pieces.map((p, j) => env.LLM_DB
        .prepare(`INSERT INTO know_fts (rowid, title, text, tags) VALUES (?, ?, ?, ?)`)
        .bind(seqs[j], foldText(p.t.row.title), foldText(p.text), foldText(p.t.tags.replace(/,/g, ' '))));
      for (const t of batch) {
        const n = pieces.filter(p => p.t === t).length;
        follow.push(env.LLM_DB.prepare(`UPDATE know SET hash = ?, chunks = ?, tags = ?, embedded_at = ? WHERE id = ?`).bind(t.hash, n, t.tags, now, t.row.id));
      }
      await env.LLM_DB.batch(follow);
      result.indexed += batch.length;
    }
  } catch (err) {
    console.error('[worker-llm/vectorize] syncKnowIndex failed:', err);
  }
  return result;
}

/** Index of rows deleted outright (ids only — the rows may already be gone from reads). Never throws. */
export async function removeKnowIndex(env: VectorizeEnv, knowIds: string[]): Promise<void> {
  try {
    await dropIndex(env, knowIds);
  } catch (err) {
    console.error('[worker-llm/vectorize] removeKnowIndex failed:', err);
  }
}
