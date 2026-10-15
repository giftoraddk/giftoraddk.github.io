/**
 * crud.js — Backend-agnostic data layer.
 *
 * Raw fetch mechanics (headers, auth token, timeout, retry) live in requester.js.
 * Raw key/value cache (IndexedDB, driver auto-fallback) + in-flight dedup live in
 * storager.js — crud.js only adds the TTL envelope + fetch-shaping on top, it never
 * talks to localforage directly (giữ đúng layering conductor → crud → storager).
 *
 * Exports (read-only loader):
 *   loadData({ dataTable?, dataSrc?, cache?, server? })
 *   loadKey(dataSrc, dataTable, server)  — cache-key builder, shared with conductor
 *   withCache(key, ttlMin, fetchFn)      — TTL cache wrapper (0 = bypass)
 *   cacheGet(key) / cacheSet(key, value, ttlMin) / cacheRemove(key) — TTL-aware cache
 *                                         read/write/remove, shared with conductor
 *   invalidate({ dataTable?, dataSrc?, server? }) — on-demand revalidation: purge the cache entry
 *                                         for 1 (dataTable, server) so the NEXT load is fresh
 *   dedupe(key, fn)                      — in-flight request dedup (re-exported from storager.js)
 *
 * Exports (services — primary API):
 *   createService(table, dataSrc?, server?)  → TableService | SqlService
 *
 *   TableService methods (1 row = 1 doc, soft-delete via deleted_at — backend theo adapter `server`):
 *     now()                              → ISO timestamp
 *     findAll(opts?)                     → row[]
 *     findById(id)                       → row | null
 *     create(data)                       → row  (auto id)
 *     set(id, data)                      → void  (upsert at known id)
 *     update(id, data)                   → void  (partial update)
 *     delete(id)                         → void  (soft delete: sets deleted_at)
 *     batch([{id,data}])                 → void  (parallel partial-update — no cross-row transaction)
 *     purge()                            → number (xoá THẬT toàn bộ bảng — chỉ adapter có hỗ trợ)
 *     listen(opts, onNext, onError)      → Promise<unsubscribe>  (poll 5s — Worker không có push)
 *
 *   SqlService methods:
 *     findAll(query?)                    → PaginatedResult
 *     findById(id)                       → row | null
 *     create(data)                       → row
 *     update(id, data)                   → row
 *     delete(id)                         → void
 *
 * Exports (adapter registry — swap/add backends without touching call sites):
 *   registerAdapter(name, adapter)
 *   db(server?)                          → adapter (default 'DB_ALL' → auth D1;
 *                                         'DB_ACC' profiles, 'DB_LLMD1' llm — worker-adapter.js)
 *
 * Exports (standalone helpers — alternative to createService for one-off calls):
 *   dbNow, dbFind, dbAdd, dbSet, dbPut, dbSoftDelete, dbBatch, dbListen
 *
 * @typedef {{ page?:number, limit?:number, search?:string,
 *             sortBy?:string, order?:'asc'|'desc',
 *             filters?:Record<string,any> }} BaseQuery
 * @typedef {{ data:any[], total:number, page:number,
 *             limit:number, totalPages:number }} PaginatedResult
 */

import { isObject } from '@/services/tools/util.js';
import { requester } from './requester.js';
import { authWorkerAdapter, llmD1Adapter } from './worker-adapter.js';
import { cacheGet as _rawGet, cacheSet as _rawSet, cacheRemove as _rawRemove, dedupe } from './storager.js';

export { dedupe };

// Dot-path extractor: 'a.b.c' → obj?.a?.b?.c
const _get = (obj, path) => {
    if (!path) return obj;
    return String(path).split('.').reduce((cur, k) => cur?.[k] ?? null, obj);
};

// ── TTL cache — storager.js only stores forever, so the expiry envelope lives here ──

/** Read a cache entry; null if missing or past its TTL (auto-evicts on expiry). */
export async function cacheGet(key) {
    const entry = await _rawGet(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) { await _rawRemove(key); return null; }
    return entry.value;
}

/** Write a cache entry. ttlMin — minutes until expiry (0/undefined = never expires). */
export async function cacheSet(key, value, ttlMin) {
    return _rawSet(key, { value, expiresAt: ttlMin ? Date.now() + ttlMin * 60_000 : null });
}

/** Remove a cache entry — no-op if missing. */
export const cacheRemove = _rawRemove;

// ── Read-only data loading ────────────────────────────────────────────────────

/** Fetch one or more REST endpoints in parallel; returns a flat array. */
async function _fromApi(dataSrc) {
    const segments = String(dataSrc).split('|').map(seg => {
        const [url, nested = ''] = seg.trim().split('~');
        return { url: url.trim(), nested: nested.trim() };
    }).filter(s => s.url);

    const results = await Promise.all(segments.map(async ({ url, nested }) => {
        const res = await requester('GET', url, {}, { retries: 3 });
        if (!res.ok) {
            console.warn(`[crud] API "${url}" failed:`, res.message);
            return [];
        }
        const out = nested ? _get(res.data, nested) : res.data;
        return Array.isArray(out) ? out : isObject(out) ? [out] : [];
    }));

    return segments.length === 1 ? results[0] : results.flat();
}

/**
 * Read one or more tables (qua adapter `server`) in parallel.
 * Supports pipe-separated tables and tilde-separated nested field extraction.
 */
async function _fromTables(dataTable, server) {
    const entries = String(dataTable).split('|').map(seg => {
        const [name, nested = ''] = seg.trim().split('~');
        return { name: name.trim(), nested: nested.trim() };
    }).filter(e => e.name);

    const results = await Promise.all(entries.map(async ({ name, nested }) => {
        try {
            const rows = await db(server).find(name);
            if (!nested) return rows;
            return rows.flatMap(r => {
                const v = _get(r, nested);
                return Array.isArray(v) ? v : v != null ? [v] : [];
            });
        } catch (err) {
            console.warn(`[crud] table "${name}" failed:`, err.message);
            return [];
        }
    }));

    return entries.length === 1 ? results[0] : results.flat();
}

const _joinUrl = (base, resource) =>
    (base.endsWith('/') ? base : base + '/') + resource;

/**
 * Cache key for a (dataSrc, dataTable, server) combination — encodes all into one string.
 * Shared with conductor so section ids stay aligned with the underlying cache entry.
 */
export const loadKey = (dataSrc, dataTable, server) => {
    if (dataSrc && dataTable) return _joinUrl(dataSrc, dataTable);
    if (dataTable) return `_sb_:${server || 'DB_ALL'}:${dataTable}`;
    return dataSrc || '';
};

/**
 * On-demand revalidation cho tầng cache runtime (IndexedDB, xem withCache/loadData) — gọi ngay
 * sau khi 1 record của (dataTable, server) này được ghi (create/update/delete) để lần load TIẾP
 * THEO (reload trang, tab mới) lấy dữ liệu mới ngay — không ảnh hưởng tab đang mở (section đã có
 * data trong RAM của conductor sẽ không tự re-fetch), chỉ purge cache IndexedDB cho lần load kế.
 * @param {{ dataTable?:string, dataSrc?:string, server?:string }} opts
 */
export function invalidate({ dataTable = '', dataSrc = '', server = '' } = {}) {
    if (!dataSrc && !dataTable) return Promise.resolve();
    return cacheRemove(loadKey(dataSrc, dataTable, server));
}

async function _loadRaw(dataSrc, dataTable, server) {
    let res;
    if (dataSrc && dataTable) res = await _fromApi(_joinUrl(dataSrc, dataTable));
    else if (dataTable)       res = await _fromTables(dataTable, server);
    else if (dataSrc)         res = await _fromApi(dataSrc);
    else return [];
    return Array.isArray(res) ? res : isObject(res) ? [res] : [];
}

/**
 * Generic TTL cache wrapper — shared by loadData and conductor.
 * ttlMin = 0 → bypass cache, call fetchFn directly. Only caches non-empty results.
 * @template T
 * @param {string} key @param {number} ttlMin @param {() => Promise<T>} fetchFn @returns {Promise<T>}
 */
export async function withCache(key, ttlMin, fetchFn) {
    if (!ttlMin) return fetchFn();
    const hit = await cacheGet(key);
    if (hit !== null) return hit;
    const out = await fetchFn();
    if (Array.isArray(out) ? out.length : out != null)
        await cacheSet(key, out, ttlMin);
    return out;
}

/**
 * Unified read-only loader. Always resolves to an array.
 * cache = minutes (default 5). Pass 0 to disable the TTL cache.
 * Concurrent calls for the same (dataSrc, dataTable, server) share one in-flight fetch.
 * @param {{ dataTable?:string, dataSrc?:string, cache?:number, server?:string }} opts
 */
export async function loadData({ dataTable = '', dataSrc = '', cache = 5, server = '' } = {}) {
    try {
        if (!dataSrc && !dataTable) return [];
        const key = loadKey(dataSrc, dataTable, server);
        const out = await dedupe(key, () => withCache(key, cache, () => _loadRaw(dataSrc, dataTable, server)));
        return Array.isArray(out) ? out : [];
    } catch (err) {
        console.error('[crud] loadData failed:', err);
        return [];
    }
}

// ── Response shaping (for SqlService) ─────────────────────────────────────────

function _unwrap(res, { page, limit }) {
    if (Array.isArray(res)) {
        return { data: res, total: res.length, page, limit, totalPages: 1 };
    }
    const data  = Array.isArray(res?.data) ? res.data : [];
    const total = res?.total ?? data.length;
    return {
        data, total,
        page:       res?.page       ?? page,
        limit:      res?.limit      ?? limit,
        totalPages: res?.totalPages ?? Math.ceil(total / limit),
    };
}

// ── SqlService — plain REST backend (dataSrc set) ──────────────────────────────

/**
 * REST API service.
 *   GET    /endpoint        → findAll
 *   GET    /endpoint/:id    → findById
 *   POST   /endpoint        → create
 *   PATCH  /endpoint/:id    → update
 *   DELETE /endpoint/:id    → delete
 */
class SqlService {
    constructor(dataSrc, table = '') {
        this._endpoint = table ? _joinUrl(dataSrc, table) : dataSrc;
    }

    /** @param {BaseQuery} [query]  @returns {Promise<PaginatedResult>} */
    async findAll(query = {}) {
        const { page = 1, limit = 20, search = '', sortBy = '', order = 'asc', filters = {} } = query;
        const params = {
            page, limit,
            ...(search ? { search } : {}),
            ...(sortBy ? { sortBy, order } : {}),
            ...filters,
        };
        const res = await requester('GET', this._endpoint, params);
        if (!res.ok) return { data: [], total: 0, page, limit, totalPages: 0 };
        return _unwrap(res.data, { page, limit });
    }

    async findById(id) {
        const res = await requester('GET', `${this._endpoint}/${id}`);
        if (!res.ok) return null;
        return res.data?.data ?? res.data ?? null;
    }

    async create(data) {
        const res = await requester('POST', this._endpoint, data);
        if (!res.ok) throw new Error(res.message || `HTTP ${res.statusCode}`);
        return res.data?.data ?? res.data;
    }

    async update(id, data) {
        const res = await requester('PATCH', `${this._endpoint}/${id}`, data);
        if (!res.ok) throw new Error(res.message || `HTTP ${res.statusCode}`);
        return res.data?.data ?? res.data;
    }

    async delete(id) {
        const res = await requester('DELETE', `${this._endpoint}/${id}`);
        if (!res.ok) throw new Error(res.message || `HTTP ${res.statusCode}`);
    }
}

// ── Adapter registry ──────────────────────────────────────────────────────────

// Mọi backend đều là Cloudflare Worker (xem worker-adapter.js) — Supabase chỉ còn làm Auth:
//   DB_ALL   → auth D1 `ALL_DB` (posts/products/invoices/…)
//   DB_ACC   → auth, bảng Supabase `profiles`
//   DB_LLMD1 → llm D1 (divisions/talks/know/rel)
// DB_ALL và DB_ACC cùng 1 Worker, cùng route /v1/data/:table — chung 1 adapter.
const _registry = { DB_ALL: authWorkerAdapter, DB_ACC: authWorkerAdapter, DB_LLMD1: llmD1Adapter };

/**
 * Register a backend adapter under a name.
 *   registerAdapter('myapi', new MyAdapter());
 */
export function registerAdapter(name, adapter) {
    _registry[name] = adapter;
}

/**
 * Get the adapter for a backend name (falls back to 'DB_ALL').
 *   db()           → authWorkerAdapter (DB_ALL)
 *   db('myapi')    → MyAdapter (after registerAdapter)
 */
export function db(server = 'DB_ALL') {
    return _registry[server] ?? _registry.DB_ALL;
}

// ── TableService — table backend (no dataSrc) ───────────────────────────────

/**
 * Table CRUD service — delegates to the registered adapter.
 * Construct via createService(), not directly.
 */
class TableService {
    constructor(table, server = 'DB_ALL') {
        this._table  = table;
        this._server = server;
    }

    _a() { return db(this._server); }

    /** Server-side timestamp. */
    now()                              { return this._a().now(); }

    /** Query the table. Soft-deleted rows excluded. @returns {Promise<object[]>} */
    findAll(opts = {})                 { return this._a().find(this._table, opts); }

    /** Single row by id. Returns null if missing or soft-deleted. */
    findById(id)                       { return this._a().findById(this._table, id); }

    /** Insert with auto-generated id. Returns the inserted row. */
    create(data)                       { return this._a().add(this._table, data); }

    /** Create or overwrite a row at a known id. */
    set(id, data)                      { return this._a().set(this._table, id, data); }

    /** Partial-update fields on an existing row. */
    update(id, data)                   { return this._a().put(this._table, id, data); }

    /** Parallel batch partial-update. items = [{ id, data }]. */
    batch(items)                       { return this._a().batch(this._table, items); }

    /** Realtime listener — same opts as findAll(). Returns Promise<unsubscribe>. */
    listen(opts, onNext, onError)      { return this._a().listen(this._table, opts, onNext, onError); }

    /** Hard delete toàn bộ bảng — adapter không hỗ trợ thì ném lỗi, không âm thầm bỏ qua. */
    purge() {
        const a = this._a();
        if (!a.purge) throw new Error(`Backend "${this._server}" không hỗ trợ xoá toàn bộ`);
        return a.purge(this._table);
    }

    /** Soft delete — sets deleted_at + updated_at. */
    async delete(id) {
        const now = await this.now();
        return this._a().put(this._table, id, { deleted_at: now, updated_at: now });
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a CRUD service bound to a table.
 *   createService('products')                      → TableService
 *   createService('products', '', 'myapi')          → custom adapter service
 *   createService('products', 'https://api.com/')   → SqlService (REST)
 * @param {string} table     Table / resource name
 * @param {string} [dataSrc] Base REST API URL — when provided, returns SqlService
 * @param {string} [server]  Adapter name (default: 'DB_ALL')
 * @returns {TableService | SqlService}
 */
export function createService(table, dataSrc = '', server = 'DB_ALL') {
    if (dataSrc) return new SqlService(dataSrc, table);
    return new TableService(table, server);
}

// ── Standalone helpers (alternative to createService for one-off calls) ───────

export const dbNow    = (server)                            => db(server).now();
export const dbFind   = (table, opts = {}, server)          => db(server).find(table, opts);
export const dbAdd    = (table, data, server)               => db(server).add(table, data);
export const dbSet    = (table, id, data, server)           => db(server).set(table, id, data);
export const dbPut    = (table, id, data, server)           => db(server).put(table, id, data);
export const dbBatch  = (table, items, server)              => db(server).batch(table, items);
export const dbListen = (table, opts, onNext, onError, server) =>
    db(server).listen(table, opts, onNext, onError);

export async function dbSoftDelete(table, id, server) {
    const now = await dbNow(server);
    return dbPut(table, id, { deleted_at: now, updated_at: now }, server);
}
