/**
 * crud.js — Backend-agnostic data layer.
 *
 * Raw fetch mechanics (headers, auth token, timeout, retry) live in requester.js —
 * shared with firestore.server.ts. SqlService/`_fromApi` build on top of it here.
 *
 * Exports (read-only loader):
 *   loadData({ dataTable?, dataSrc?, cache?, server? })
 *   loadKey(dataSrc, dataTable, server)  — cache-key builder, shared with conductor
 *   withCache(key, ttlMin, fetchFn)      — generic IndexedDB cache wrapper
 *   cacheGet(key) / cacheSet(key, value, ttlMin) / cacheRemove(key) — raw cache read/write/remove,
 *                                         shared with conductor
 *   invalidate({ dataTable?, dataSrc?, server? }) — on-demand revalidation: purge the cache entry
 *                                         for 1 (dataTable, server) so the NEXT load is fresh
 *   dedupe(key, fn)                      — in-flight request dedup, shared with conductor
 *
 * Exports (services — primary API):
 *   createService(table, dataSrc?, server?)  → FirestoreService | SqlService
 *
 *   FirestoreService methods:
 *     now()                              → server timestamp
 *     findAll(opts?)                     → row[]
 *     findById(id)                       → row | null
 *     create(data)                       → { id, ...data }  (auto-ID)
 *     set(id, data)                      → void  (create or overwrite at known ID)
 *     update(id, data)                   → void  (partial update)
 *     delete(id)                         → void  (soft delete: sets deleted_at)
 *     batch([{id,data}])                 → void  (atomic multi-update)
 *     listen(opts, onNext, onError)      → Promise<unsubscribe>
 *
 *   SqlService methods:
 *     findAll(query?)                    → PaginatedResult
 *     findById(id)                       → row | null
 *     create(data)                       → row
 *     update(id, data)                   → row
 *     delete(id)                         → void
 *
 * Exports (adapter registry):
 *   registerAdapter(name, adapter)
 *   db(server?)                          → adapter
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

import { firestoreAdapter, authFirestoreAdapter, invoicesFirestoreAdapter } from '@/services/firestore.js';
import { requester } from '@/services/requester.js';
import { isObject } from '@/services/helper.js';

// Dot-path extractor: 'a.b.c' → obj?.a?.b?.c
const _get = (obj, path) => {
    if (!path) return obj;
    return String(path).split('.').reduce((cur, k) => cur?.[k] ?? null, obj);
};

// In-flight request dedup — 2 callers asking for the same key while a fetch is
// already pending share the same promise instead of firing a duplicate request.
// Exported so conductor.js can dedupe its own paginated fetches with the same map.
const _inflight = new Map();
export function dedupe(key, fn) {
    if (_inflight.has(key)) return _inflight.get(key);
    const p = fn().finally(() => _inflight.delete(key));
    _inflight.set(key, p);
    return p;
}

// Storager singleton — one dynamic import shared by withCache/cacheGet/cacheSet
// (and by conductor.js via cacheGet/cacheSet) instead of re-importing per call.
let _storagerPromise = null;
const _storager = () => _storagerPromise ??= import('@/services/storager.js').then(m => m.default);

/** Read a raw cache entry (null if missing/expired). */
export async function cacheGet(key) {
    return (await _storager()).get(key);
}

/** Write a cache entry. ttlMin — minutes until expiry. */
export async function cacheSet(key, value, ttlMin) {
    return (await _storager()).set(key, value, ttlMin * 60_000);
}

/** Remove a raw cache entry — no-op if missing. */
export async function cacheRemove(key) {
    return (await _storager()).remove(key);
}

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
 * Read one or more Firestore collections in parallel.
 * Supports pipe-separated tables and tilde-separated nested paths.
 */
async function _fromFirestore(dataTable, server) {
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
            console.warn(`[crud] Firestore "${name}" failed:`, err.message);
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
 * `server` chỉ ảnh hưởng nhánh Firestore (dataTable-only) — cùng dataTable trên 2 server
 * khác nhau không được đụng cache của nhau, dù thực tế tên bảng không trùng giữa các server.
 */
export const loadKey = (dataSrc, dataTable, server) => {
    if (dataSrc && dataTable) return _joinUrl(dataSrc, dataTable);
    if (dataTable) return `_fs_:${server || 'firestore'}:${dataTable}`;
    return dataSrc || '';
};

/**
 * On-demand revalidation cho tầng cache runtime (IndexedDB, xem withCache/loadData) — thay cho
 * việc chờ hết TTL (mặc định 5 phút, xem docs/SERVICES.rst). Gọi ngay sau khi 1 record của
 * (dataTable, server) này được ghi (create/update/delete) để lần load TIẾP THEO (reload trang,
 * tab mới) lấy dữ liệu mới ngay — KHÔNG đẩy dữ liệu mới vào các tab đang mở sẵn (section đã có
 * data trong RAM của conductor sẽ không tự re-fetch, xem docs/SERVICES.rst "state RAM đã có data
 * thì return ngay"), chỉ ảnh hưởng cache IndexedDB dùng cho lần load kế tiếp.
 * @param {{ dataTable?:string, dataSrc?:string, server?:string }} opts — cùng opts đã dùng để load
 */
export function invalidate({ dataTable = '', dataSrc = '', server = '' } = {}) {
    if (!dataSrc && !dataTable) return Promise.resolve();
    return cacheRemove(loadKey(dataSrc, dataTable, server));
}

async function _loadRaw(dataSrc, dataTable, server) {
    let res;
    if (dataSrc && dataTable) res = await _fromApi(_joinUrl(dataSrc, dataTable));
    else if (dataTable)       res = await _fromFirestore(dataTable, server);
    else if (dataSrc)         res = await _fromApi(dataSrc);
    else return [];
    return Array.isArray(res) ? res : isObject(res) ? [res] : [];
}

/**
 * Generic IndexedDB cache wrapper — shared by loadData and conductor.
 * ttlMin = 0 → bypass cache, call fetchFn directly.
 * Only caches non-empty results.
 * @template T
 * @param {string} key
 * @param {number} ttlMin
 * @param {() => Promise<T>} fetchFn
 * @returns {Promise<T>}
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
 * cache = minutes (default 5). Pass 0 to disable IndexedDB cache.
 * Concurrent calls for the same (dataSrc, dataTable, server) share one in-flight fetch.
 * @param {{ dataTable?:string, dataSrc?:string, cache?:number, server?:string }} opts
 *   server — chỉ áp dụng khi đọc Firestore (dataTable, không có dataSrc): 'firestore' (mặc
 *   định) | 'auth' | 'invoices' | tên adapter khác đã registerAdapter.
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
// Raw fetch/headers/retry/timeout mechanics live in requester.js — shared with
// firestore.server.ts. crud.js only shapes the response into PaginatedResult.

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

// ── Adapter registry ──────────────────────────────────────────────────────────

const _registry = { firestore: firestoreAdapter, auth: authFirestoreAdapter, invoices: invoicesFirestoreAdapter };

/**
 * Register a backend adapter under a name.
 *   registerAdapter('myapi', new MyAdapter());
 */
export function registerAdapter(name, adapter) {
    _registry[name] = adapter;
}

/**
 * Get the adapter for a backend name (falls back to 'firestore').
 *   db()           → firestoreAdapter
 *   db('myapi')    → MyAdapter (after registerAdapter)
 */
export function db(server = 'firestore') {
    return _registry[server] ?? _registry.firestore;
}

// ── SqlService ────────────────────────────────────────────────────────────────

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

// ── FirestoreService ──────────────────────────────────────────────────────────

/**
 * Firestore CRUD service — delegates to the registered adapter.
 * Construct via createService(), not directly.
 */
class FirestoreService {
    constructor(table, server = 'firestore') {
        this._table  = table;
        this._server = server;
    }

    _a() { return db(this._server); }

    /** Server-side timestamp sentinel. */
    now()                              { return this._a().now(); }

    /**
     * Query the collection. Soft-deleted records excluded.
     * @param {import('./firestore.js').QueryOpts} [opts]
     * @returns {Promise<object[]>}
     */
    findAll(opts = {})                 { return this._a().find(this._table, opts); }

    /** Single record by ID. Returns null if missing or soft-deleted. */
    findById(id)                       { return this._a().findById(this._table, id); }

    /** Insert with auto-generated ID. Returns { id, ...data }. */
    create(data)                       { return this._a().add(this._table, data); }

    /** Create or overwrite a document at a known ID. */
    set(id, data)                      { return this._a().set(this._table, id, data); }

    /** Partial-update fields on an existing document. */
    update(id, data)                   { return this._a().put(this._table, id, data); }

    /** Atomic batch partial-update. items = [{ id, data }]. */
    batch(items)                       { return this._a().batch(this._table, items); }

    /** Real-time listener — same opts as findAll(). Returns Promise<unsubscribe>. */
    listen(opts, onNext, onError)      { return this._a().listen(this._table, opts, onNext, onError); }

    /** Soft delete — sets deleted_at + updated_at. */
    async delete(id) {
        const now = await this.now();
        return this._a().put(this._table, id, { deleted_at: now, updated_at: now });
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a CRUD service bound to a table/collection.
 *
 *   createService('users')                         → FirestoreService
 *   createService('users', '', 'myapi')            → custom adapter service
 *   createService('products', 'https://api.com/')  → SqlService (REST)
 *
 * @param {string} table     Collection / resource name
 * @param {string} [dataSrc] Base REST API URL — when provided, returns SqlService
 * @param {string} [server]  Adapter name for Firestore-like adapters (default: 'firestore')
 * @returns {FirestoreService | SqlService}
 */
export function createService(table, dataSrc = '', server = 'firestore') {
    if (dataSrc) return new SqlService(dataSrc, table);
    return new FirestoreService(table, server);
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
