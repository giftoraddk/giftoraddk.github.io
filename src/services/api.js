/**
 * api.js — Thin fetch helper for the 2 Cloudflare Worker gateways this app talks to. Attaches
 * the CURRENT Supabase access token (supabase.auth.getSession(), not the copy cached by
 * auth.set() in webs/auth/tools/service.js) so a Worker can verify who's calling. Reading
 * directly from supabase-js — rather than the app's own session cache — avoids a bootstrapping
 * problem (right after login, before auth.set() has run, a Worker call still needs to authenticate
 * as the just-signed-in user) and stays correct across supabase-js's own background token refresh.
 *
 * `worker/` is 1 pnpm workspace deployed as 2 separate Workers on 2 different Cloudflare accounts
 * (see hook/WORKER.rst) — `auth.ts`/`roles.ts`/`supabaseTable.ts` are shared source between them via
 * `@worker/shared`, but each is its own deployment/URL:
 *   - PUBLIC_WORKER_URL (db-worker, "micro-worker") — /v1/db/* (Firestore/Supabase proxy)
 *   - PUBLIC_LLM_URL (llm-worker, "mini-worker")     — /v1/data/* (D1 for webs/llm), /v1/ai/*
 *     (ALL AI processing app-wide — chat + image generation), /v1/search (semantic search over `know`)
 * `workerFetch`/`workerJson` and `llmFetch`/`llmJson` name which Worker a call site talks to —
 * services/tensor.js, every domain's tools/image.js, and webs/llm/svc-aide.js call `llmFetch`/
 * `llmJson`; services/firestore.worker.js's WorkerAdapter calls `workerFetch`/`workerJson` while its
 * D1WorkerAdapter calls `llmFetch`/`llmJson` — same file, 2 different backends, by design.
 */
import { supabase } from '@/services/supabase.js';

async function _headers(extra = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
}

/**
 * Builds a { fetch, json } pair bound to one Worker base URL — raw fetch returns the Response
 * as-is (caller decides json()/text()/body stream), throws with the Worker's own { message } body
 * on non-2xx; json() additionally unwraps to null on 204.
 */
function _makeClient(baseUrl) {
    const BASE_URL = (baseUrl || '').replace(/\/$/, '');

    async function workerFetch(path, { method = 'GET', body, headers } = {}) {
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: await _headers(headers),
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Worker request failed (${res.status})`);
        }
        return res;
    }

    async function workerJson(path, opts) {
        const res = await workerFetch(path, opts);
        return res.status === 204 ? null : res.json();
    }

    return { workerFetch, workerJson };
}

const _dbClient = _makeClient(import.meta.env.PUBLIC_WORKER_URL);
const _llmClient = _makeClient(import.meta.env.PUBLIC_LLM_URL);

export const workerFetch = _dbClient.workerFetch;
export const workerJson = _dbClient.workerJson;

export const llmFetch = _llmClient.workerFetch;
export const llmJson = _llmClient.workerJson;
