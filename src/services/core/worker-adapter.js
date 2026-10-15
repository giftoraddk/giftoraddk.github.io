/**
 * worker-adapter.js — adapter crud.js cho 2 Cloudflare Worker (now/find/findById/add/set/put/batch/listen/bump/purge):
 *   'DB_ALL' / 'DB_ACC' → auth (PUBLIC_AUTH_URL) — D1 `ALL_DB` + Supabase `profiles`
 *   'DB_LLMD1'          → llm  (PUBLIC_LLM_URL)  — D1: divisions/talks/know/rel/…
 *
 * Contract chung: GET /v1/data/:table[/:id] (query string = lọc exact) + PATCH /v1/data/:table/:id (upsert).
 * Worker không sort/search/phân trang → áp phía client (applyQueryOpts).
 */
import { getPath, ulid } from '@/services/tools/util.js';
import { requester } from './requester.js';

const POLL_MS = 5000;

const _cmp = (a, b) => (a == null ? -1 : b == null ? 1 : a > b ? 1 : a < b ? -1 : 0);

/** filters (exact) → searchField/searchValue (prefix) → sortBy/order → page/limit|maxCount — cùng ngữ nghĩa find() của D1/Postgres. */
export function applyQueryOpts(rows, opts = {}) {
    const { filters = {}, searchField, searchValue, sortBy, order = 'asc', page, limit, maxCount } = opts;
    let out = rows.filter(r => !r?.deleted_at &&
        Object.entries(filters).every(([k, v]) => String(getPath(r, k) ?? '') === String(v)));
    if (searchField && searchValue) {
        const q = String(searchValue).toLowerCase();
        out = out.filter(r => String(getPath(r, searchField) ?? '').toLowerCase().startsWith(q));
    }
    if (sortBy) {
        const dir = order === 'desc' ? -1 : 1;
        out = [...out].sort((a, b) => dir * _cmp(getPath(a, sortBy), getPath(b, sortBy)));
    }
    const size = limit || maxCount;
    if (size) out = page ? out.slice((page - 1) * size, page * size) : out.slice(0, size);
    return out;
}

class WorkerAdapter {
    constructor(envKey) { this._envKey = envKey; }

    get _base() { return import.meta.env[this._envKey]; }

    async _req(method, path, body) {
        // Bearer token do requester tự gắn (session Supabase)
        const res = await requester(method, `${this._base}/v1/data/${path}`, body ?? {});
        if (!res.ok) {
            const err = new Error(res.message || `HTTP ${res.statusCode}`);
            err.status = res.statusCode;
            throw err;
        }
        return res.data;
    }

    now() { return new Date().toISOString(); }

    async find(table, opts = {}) {
        // Worker lọc exact-match theo query string (riêng profiles bỏ qua) — applyQueryOpts lọc lại cho chắc
        const rows = await this._req('GET', table, opts.filters);
        return applyQueryOpts(Array.isArray(rows) ? rows : [], opts);
    }

    async findById(table, id) {
        try {
            const row = await this._req('GET', `${table}/${id}`);
            return row && !row.deleted_at ? row : null;
        } catch (err) {
            if (err.status === 404) return null;
            throw err;
        }
    }

    // auth không có POST — tự sinh id rồi upsert, chạy được trên cả 2 Worker
    async add(table, data) {
        const id = data.id ?? ulid();
        await this.set(table, id, data);
        return { ...data, id };
    }

    async set(table, id, data) { await this._req('PATCH', `${table}/${id}`, data); }

    async put(table, id, data) { await this._req('PATCH', `${table}/${id}`, data); }

    // Bảng D1 có POST _batch (1 request, 1 transaction); riêng route profiles (Supabase) thì không
    async batch(table, items) {
        if (!items.length) return;
        if (table === 'profiles') { await Promise.all(items.map(({ id, data }) => this.put(table, id, data))); return; }
        await this._req('POST', `${table}/_batch`, { items });
    }

    /** Cộng/trừ nguyên tử 1 field số phía server (auth _bump, chỉ field khai trong tables.ts) — trả giá trị mới. */
    async bump(table, id, field, delta) {
        const res = await this._req('POST', `${table}/${id}/_bump`, { field, delta });
        return Number(res?.value ?? 0);
    }

    /** Xoá THẬT toàn bộ bảng — chỉ auth D1 hỗ trợ (DELETE /v1/data/:table), Worker khác trả 405. Trả số row đã xoá. */
    async purge(table) {
        const res = await this._req('DELETE', table);
        return Number(res?.deleted ?? 0);
    }

    /** HTTP không có push → poll find(), chỉ gọi onNext khi dữ liệu thật sự đổi. */
    async listen(table, opts = {}, onNext, onError) {
        let stopped = false, timer = null, last = null;
        const tick = async () => {
            if (stopped) return;
            try {
                const rows = await this.find(table, opts);
                const json = JSON.stringify(rows);
                if (json !== last) { last = json; onNext(rows); }
            } catch (err) {
                onError?.(err);
            } finally {
                if (!stopped) timer = setTimeout(tick, POLL_MS);
            }
        };
        await tick();
        return () => { stopped = true; clearTimeout(timer); };
    }
}

export const authWorkerAdapter = new WorkerAdapter('PUBLIC_AUTH_URL');
export const llmD1Adapter      = new WorkerAdapter('PUBLIC_LLM_URL');
