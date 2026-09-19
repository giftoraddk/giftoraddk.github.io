/**
 * firestore.worker.js — DbAdapter implementations that proxy through the Cloudflare Worker
 * gateways instead of talking to Firestore/Supabase/D1 directly from the browser.
 *
 * Two backends, 2 SEPARATE Worker deployments (same worker/ pnpm workspace source, different
 * Cloudflare accounts — see hook/WORKER.rst), sharing one polling `listen()` (PollingAdapter base —
 * "kế thừa" instead of duplicating the polling loop twice):
 *   - WorkerAdapter   → db-worker gateway (services/api.js's workerFetch/workerJson),
 *     `/v1/db/:connection/:table[...]` — 'DB_ACC' (Supabase `profiles`), 'DB_ALL'/'DB_LLM' (the
 *     matching legacy Firebase project — 'DB_ALL' is the one shared project for every table that
 *     isn't DB_ACC/DB_LLM, invoices included, folded in from its former standalone connection).
 *   - D1WorkerAdapter → llm-worker gateway (services/api.js's llmFetch/llmJson),
 *     `/v1/data/:table[...]` — 'DB_LLMD1' (Cloudflare D1, webs/llm domain: divisions/talks/know/rel).
 *
 * Both implement the exact same interface — now/find/findById/add/set/put/batch/listen — so every
 * `createService(table, '', server)` call site in crud.js works identically no matter which
 * backend `server` resolves to.
 *
 * These are the DEFAULT adapters registered under their names in crud.js's `_registry` — every
 * `createService(table)` call in the app goes through a Worker, not just privileged writes. The
 * Workers themselves allow anonymous reads on the public-trust connections (worker/packages/db-worker/src/db.ts,
 * worker/packages/llm-worker/src/tablePolicy.ts) — routing reads through them too is about having one place all
 * data access goes through, not about newly restricting public data.
 *
 * `listen()` has no real push-based equivalent over plain HTTP without a WebSocket/Durable Object
 * relay (not built here) — emulated by polling `find()` on an interval and only calling `onNext`
 * when the result actually changed. Fine for admin dashboards/listings; genuinely bad for anything
 * needing sub-second updates (there isn't any such use case on these tables today).
 */
import { workerFetch, workerJson, llmFetch, llmJson } from '@/services/api.js';

const POLL_MS = 5000;

// Mirrors worker/packages/db-worker/src/db.ts's LEGACY_FIRESTORE_CONNECTIONS — these 2 connections
// (and every table under them: products/posts/bays/talents/... everything but `profiles`) already
// hold pre-existing documents with created_at/updated_at/deleted_at stored as a plain epoch-ms
// NUMBER (`Date.now()`) — see e.g. webs/bay/tools/service.js's mix of `svc.now()` and `Date.now()`
// writes into the SAME `bays` collection. Firestore's orderBy() ranks values by TYPE first
// (Timestamp < String < ...), so once `now()` here started returning an ISO STRING instead, any
// `sortBy: 'created_at'` query put every string-typed doc entirely before/after every number-typed
// one regardless of actual time — sort was silently broken, not just imprecise. Numeric is also
// simply correct for every direct arithmetic use of these fields (svc-bay.js's
// `a.created_at - b.created_at`, bitmap.js's block math, etc.) which a string would NaN on.
const LEGACY_FIRESTORE_CONNECTIONS = new Set(['DB_ALL', 'DB_LLM']);

class PollingAdapter {
    /** Server-clock-ish timestamp — see worker/packages/db-worker/src/firestore.ts's now() for why this doesn't need
     *  a round trip: it's an audit-trail field (created_at/updated_at), not security-critical. */
    async now() {
        return new Date().toISOString();
    }

    /** Polling emulation of Firestore's onSnapshot — same call shape/return value
     *  (`Promise<unsubscribe>`) as a direct client SDK adapter, so call sites don't change. */
    async listen(table, opts = {}, onNext, onError) {
        let stopped = false;
        let timer = null;
        let lastJson = null;

        const tick = async () => {
            if (stopped) return;
            try {
                const rows = await this.find(table, opts);
                const json = JSON.stringify(rows);
                if (json !== lastJson) {
                    lastJson = json;
                    onNext(rows);
                }
            } catch (err) {
                onError?.(err);
            } finally {
                if (!stopped) timer = setTimeout(tick, POLL_MS);
            }
        };

        await tick(); // fire immediately with current data, same as onSnapshot's initial callback
        return () => { stopped = true; if (timer) clearTimeout(timer); };
    }
}

/** One instance per Worker-side "connection" on `worker/`: 'DB_ACC' | 'DB_ALL' | 'DB_LLM'. */
export class WorkerAdapter extends PollingAdapter {
    constructor(connection) {
        super();
        this._connection = connection;
    }

    // DB_ALL/DB_LLM (legacy Firestore) → epoch-ms number, matching pre-existing documents there
    // (see LEGACY_FIRESTORE_CONNECTIONS' comment above). DB_ACC (Supabase Postgres,
    // `profiles.created_at TIMESTAMPTZ`) keeps the base class's ISO string — Postgres doesn't
    // implicitly cast a bare number into a timestamptz column.
    async now() {
        return LEGACY_FIRESTORE_CONNECTIONS.has(this._connection) ? Date.now() : super.now();
    }

    async find(table, opts = {}) {
        const qs = Object.keys(opts).length ? `?opts=${encodeURIComponent(JSON.stringify(opts))}` : '';
        return workerJson(`/v1/db/${this._connection}/${table}${qs}`);
    }

    async findById(table, id) {
        return workerJson(`/v1/db/${this._connection}/${table}/${id}`);
    }

    async add(table, data) {
        return workerJson(`/v1/db/${this._connection}/${table}`, { method: 'POST', body: data });
    }

    async set(table, id, data) {
        await workerFetch(`/v1/db/${this._connection}/${table}/${id}`, { method: 'PUT', body: data });
    }

    async put(table, id, data) {
        await workerFetch(`/v1/db/${this._connection}/${table}/${id}`, { method: 'PATCH', body: data });
    }

    async batch(table, items) {
        await workerFetch(`/v1/db/${this._connection}/${table}/_batch`, { method: 'POST', body: { items } });
    }
}

/** Backs the D1 tables on `worker/`: divisions/talks (admin-only) + know/rel (anonymous GET +
 *  admin write) — see worker/packages/llm-worker/src/tablePolicy.ts for the actual trust-level enforcement (this
 *  class has no opinion on it, the Worker does). Single instance — unlike WorkerAdapter there's
 *  only one D1 database, no per-connection variant. */
export class D1WorkerAdapter extends PollingAdapter {
    async find(table, opts = {}) {
        const qs = Object.keys(opts).length ? `?opts=${encodeURIComponent(JSON.stringify(opts))}` : '';
        return llmJson(`/v1/data/${table}${qs}`);
    }

    async findById(table, id) {
        return llmJson(`/v1/data/${table}/${id}`);
    }

    async add(table, data) {
        return llmJson(`/v1/data/${table}`, { method: 'POST', body: data });
    }

    async set(table, id, data) {
        await llmFetch(`/v1/data/${table}/${id}`, { method: 'PUT', body: data });
    }

    async put(table, id, data) {
        await llmFetch(`/v1/data/${table}/${id}`, { method: 'PATCH', body: data });
    }

    async batch(table, items) {
        await llmFetch(`/v1/data/${table}/_batch`, { method: 'POST', body: { items } });
    }
}

export const authWorkerAdapter = new WorkerAdapter('DB_ACC');
export const repoWorkerAdapter = new WorkerAdapter('DB_ALL');
export const llmWorkerAdapter = new WorkerAdapter('DB_LLM');
export const llmD1Adapter = new D1WorkerAdapter();
