/**
 * D1Client — SQL engine behind /v1/data/:table (data.ts). Implements the same 6-operation shape
 * (now/find/findById/add/set/put/batch) as worker/src/firestore.ts's FirestoreClient, so the
 * client-side D1WorkerAdapter (src/services/d1.worker.js) exposes an identical DbAdapter surface
 * and every `createService(table, '', 'DB_LLMD1')` call site works exactly like the existing
 * Firestore-backed adapters.
 *
 * Every identifier (table/column name) built into a query is double-quoted via qid() — this
 * schema deliberately keeps camelCase/reserved-word column names ("from", "index") to avoid a
 * snake_case<->camelCase mapping table at the JS<->SQL boundary (see db/schema.sql),
 * so quoting isn't optional, it's what makes those columns legal SQL at all.
 */
import { TABLES, type TableName } from './tablePolicy';

export interface QueryOpts {
  filters?: Record<string, unknown>;
  // Always applied, even when the value is '' — unlike `filters`, which silently drops an empty-string entry
  // (see the loop below). For a caller-enforced security lock (e.g. data.ts pinning `owner` to '' for a guest),
  // where "no restriction" and "restricted to the empty string" must never be confused.
  pin?: Record<string, string>;
  // Always applied as `!=`, even when the value is '' — e.g. excluding know.fn = 'finance' from an untrusted read.
  exclude?: Record<string, string>;
  searchField?: string;
  searchValue?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  maxCount?: number;
  // Cursor pagination (offset-based — a stringified integer offset, not a Firestore-style document
  // reference) — set opts.limit to get a paginated { data, hasMore, cursor } response, same as
  // worker/src/firestore.ts's FirestoreClient.find() when its own opts.limit is set.
  limit?: number;
  cursor?: string | null;
}

const qid = (name: string) => `"${name.replace(/"/g, '""')}"`;

export function coerceOut(table: TableName, row: Record<string, any>): Record<string, any> {
  const cfg = TABLES[table];
  const out: Record<string, any> = { ...row };
  for (const col of cfg.jsonCols) {
    if (typeof out[col] === 'string') {
      try { out[col] = JSON.parse(out[col]); } catch { out[col] = {}; }
    }
  }
  for (const col of cfg.boolCols) out[col] = out[col] === 1 || out[col] === true;
  return out;
}

function coerceIn(table: TableName, data: Record<string, any>): Record<string, any> {
  const cfg = TABLES[table];
  const out: Record<string, any> = { ...data };
  for (const col of cfg.jsonCols) {
    if (col in out && typeof out[col] !== 'string') out[col] = JSON.stringify(out[col] ?? {});
  }
  for (const col of cfg.boolCols) {
    if (col in out) out[col] = out[col] ? 1 : 0;
  }
  return out;
}

type PaginatedResult = { data: Record<string, any>[]; hasMore: boolean; cursor: string | null };

export class D1Client {
  constructor(private db: D1Database) {}

  now(): string {
    return new Date().toISOString();
  }

  async find(table: TableName, opts: QueryOpts = {}): Promise<Record<string, any>[] | PaginatedResult> {
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    const boolCols = TABLES[table].boolCols;

    for (const [k, v] of Object.entries(opts.filters ?? {})) {
      if (v == null || v === '') continue;
      where.push(`${qid(k)} = ?`);
      // D1's bind() has no native boolean param type — coerce the same way writes do (coerceIn),
      // otherwise filtering e.g. talks by { approved: true } throws at the driver level.
      params.push(boolCols.includes(k) && typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
    for (const [k, v] of Object.entries(opts.pin ?? {})) {
      where.push(`${qid(k)} = ?`);
      params.push(v);
    }
    for (const [k, v] of Object.entries(opts.exclude ?? {})) {
      where.push(`${qid(k)} != ?`);
      params.push(v);
    }
    if (opts.searchField && opts.searchValue) {
      where.push(`${qid(opts.searchField)} LIKE ?`);
      params.push(`${opts.searchValue}%`);
    }

    const sortBy = opts.sortBy || 'created_at';
    const order = opts.order === 'desc' ? 'DESC' : 'ASC';
    let sql = `SELECT * FROM ${qid(table)} WHERE ${where.join(' AND ')} ORDER BY ${qid(sortBy)} ${order}`;

    const paginated = opts.limit != null;
    if (paginated) {
      const offset = opts.cursor ? parseInt(opts.cursor, 10) || 0 : 0;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(opts.limit! + 1, offset); // fetch one extra row to detect hasMore without a COUNT(*)
      const { results } = await this.db.prepare(sql).bind(...params).all();
      const rows = (results ?? []).map(r => coerceOut(table, r as Record<string, any>));
      const hasMore = rows.length > opts.limit!;
      const data = hasMore ? rows.slice(0, opts.limit) : rows;
      return { data, hasMore, cursor: hasMore ? String(offset + data.length) : null };
    }

    if (opts.maxCount) {
      sql += ` LIMIT ?`;
      params.push(opts.maxCount);
    }
    const { results } = await this.db.prepare(sql).bind(...params).all();
    return (results ?? []).map(r => coerceOut(table, r as Record<string, any>));
  }

  async findById(table: TableName, id: string): Promise<Record<string, any> | null> {
    const row = await this.db
      .prepare(`SELECT * FROM ${qid(table)} WHERE id = ? AND deleted_at IS NULL`)
      .bind(id)
      .first();
    return row ? coerceOut(table, row as Record<string, any>) : null;
  }

  async add(table: TableName, data: Record<string, unknown>): Promise<Record<string, any>> {
    const id = crypto.randomUUID();
    const row = coerceIn(table, { ...data, id });
    const cols = Object.keys(row);
    const sql = `INSERT INTO ${qid(table)} (${cols.map(qid).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    await this.db.prepare(sql).bind(...cols.map(c => row[c])).run();
    return coerceOut(table, row);
  }

  /** Create or overwrite a document at a known id — used for divisions' meaningful slug ids
   *  (e.g. 'marketing', 'aide'), mirroring FirestoreService.set()'s "create or replace" semantics.
   *  Note: on conflict this only overwrites the columns present in `data`, not a true
   *  replace-the-whole-row (unlike Firestore's real PATCH-without-mask). Every call site in this
   *  app passes a complete doc to set() already, and every column here has a NOT NULL DEFAULT, so
   *  this is a distinction without a practical difference for a fixed-schema SQL table. */
  async set(table: TableName, id: string, data: Record<string, unknown>): Promise<void> {
    const row = coerceIn(table, { ...data, id });
    const cols = Object.keys(row).filter(c => c !== 'id');
    const insertCols = ['id', ...cols];
    const sql = `
      INSERT INTO ${qid(table)} (${insertCols.map(qid).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})
      ON CONFLICT(id) DO UPDATE SET ${cols.map(c => `${qid(c)} = excluded.${qid(c)}`).join(', ')}
    `;
    await this.db.prepare(sql).bind(id, ...cols.map(c => row[c])).run();
  }

  /** Partial update — only the keys present in `data` are touched. Soft-delete (FirestoreService's
   *  delete()) rides this with { deleted_at, updated_at }. */
  async put(table: TableName, id: string, data: Record<string, unknown>): Promise<void> {
    const row = coerceIn(table, data);
    const cols = Object.keys(row);
    if (!cols.length) return;
    const sql = `UPDATE ${qid(table)} SET ${cols.map(c => `${qid(c)} = ?`).join(', ')} WHERE id = ?`;
    await this.db.prepare(sql).bind(...cols.map(c => row[c]), id).run();
  }

  /** PATCH semantics — update only the sent columns if the row exists, else insert it. Not set(): SQLite
   *  checks NOT NULL (talks.kind, created_at…) on the INSERT half before ON CONFLICT, so partial upserts fail. */
  async upsert(table: TableName, id: string, data: Record<string, unknown>): Promise<void> {
    const row = coerceIn(table, data);
    delete row.id;
    const cols = Object.keys(row);
    if (cols.length) {
      const sql = `UPDATE ${qid(table)} SET ${cols.map(c => `${qid(c)} = ?`).join(', ')} WHERE id = ?`;
      const res = await this.db.prepare(sql).bind(...cols.map(c => row[c]), id).run();
      if (res.meta.changes > 0) return;
    } else if (await this.findById(table, id)) {
      return;
    }
    await this.set(table, id, data);
  }

  /** set() for many rows in one D1 batch — full docs, create-or-overwrite (bulk knowledge imports). */
  async setMany(table: TableName, items: { id: string; data: Record<string, unknown> }[]): Promise<void> {
    const statements = items.map(({ id, data }) => {
      const row = coerceIn(table, { ...data, id });
      const cols = Object.keys(row).filter(c => c !== 'id');
      const insertCols = ['id', ...cols];
      const sql = `INSERT INTO ${qid(table)} (${insertCols.map(qid).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})
        ON CONFLICT(id) DO UPDATE SET ${cols.map(c => `${qid(c)} = excluded.${qid(c)}`).join(', ')}`;
      return this.db.prepare(sql).bind(id, ...cols.map(c => row[c]));
    });
    if (statements.length) await this.db.batch(statements);
  }

  async batch(table: TableName, items: { id: string; data: Record<string, unknown> }[]): Promise<void> {
    const statements = items.flatMap(({ id, data }) => {
      const row = coerceIn(table, data);
      const cols = Object.keys(row);
      // An item whose data ended up empty (e.g. every key was a locked column dropped before this call) has
      // nothing to SET — `UPDATE … SET  WHERE` is invalid SQL (500). Skip it, same as put() guards above.
      if (!cols.length) return [];
      const sql = `UPDATE ${qid(table)} SET ${cols.map(c => `${qid(c)} = ?`).join(', ')} WHERE id = ?`;
      return [this.db.prepare(sql).bind(...cols.map(c => row[c]), id)];
    });
    if (statements.length) await this.db.batch(statements);
  }
}
