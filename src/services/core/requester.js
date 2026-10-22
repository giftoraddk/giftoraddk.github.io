/**
 * requester.js — Shared HTTP fetch layer: headers, auth token, timeout, retry.
 *
 * Single source for raw fetch mechanics — used by crud.js (SqlService REST calls,
 * pipe-separated dataSrc reads).
 */

import { supabase } from '@/services/shared/supabase.js';

// Chỉ gắn token cho 3 Worker của app — không lộ JWT sang URL ngoài (dataSrc của crud.js)
const _AUTH_BASES = [
    import.meta.env.PUBLIC_AUTH_URL,
    import.meta.env.PUBLIC_LLM_URL,
    import.meta.env.PUBLIC_RADAR_URL,
].filter(Boolean);
// By origin, not by prefix — 'https://llm.example.dev' is a prefix of 'https://llm.example.dev.evil.tld' too.
const _originOf = (url) => { try { return new URL(url, globalThis.location?.href).origin } catch { return null } };
const _AUTH_ORIGINS = new Set(_AUTH_BASES.map(_originOf).filter(Boolean));

/** Access token lấy từ session Supabase (supabase-js tự refresh khi hết hạn) — null nếu url không phải Worker của app. */
export async function reqToken(url) {
    if (typeof window === 'undefined' || !_AUTH_ORIGINS.has(_originOf(url))) return null;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? `Bearer ${token}` : null;
}

/** Header chuẩn cho mọi request tới Worker của app (JSON + Bearer) — `custom` ghi đè từng key. */
export async function reqHeaders(url, custom = {}) {
    const token = await reqToken(url);
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: token } : {}),
        ...custom,
    };
}

function _qs(params) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== '') p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `?${s}` : '';
}

const _sleep = ms => new Promise(r => setTimeout(r, ms));

// Retry with exponential backoff: 500ms → 1s → 2s.
async function _retry(fn, retries) {
    let lastErr;
    for (let i = 0; i <= retries; i++) {
        try { return await fn(); }
        catch (err) { lastErr = err; if (i < retries) await _sleep(500 * 2 ** i); }
    }
    throw lastErr;
}

/**
 * General requester function for HTTP requests.
 * @param {string} method
 * @param {string} endpoint
 * @param {object} params        — query string cho GET/DELETE; body JSON cho các method khác
 * @param {object} customOptions — { headers?, retries?, timeoutMs?, ...other fetch opts }
 * @returns {Promise<{ok:true, statusCode:number, data:any} | {ok:false, statusCode?:number, message:string, code?:string}>}
 */
export async function requester(method, endpoint, params = {}, customOptions = {}) {
    const { headers: customHeaders, retries = 0, timeoutMs = 10_000, ...rest } = customOptions;
    const verb   = method.toUpperCase();
    const isRead = verb === 'GET' || verb === 'DELETE';
    const url    = isRead && Object.keys(params).length ? `${endpoint}${_qs(params)}` : endpoint;

    const opts = { method: verb, headers: await reqHeaders(url, customHeaders), ...rest };
    if (!isRead) opts.body = JSON.stringify(params);

    const call = async () => {
        const res  = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
        const ct   = res.headers.get('content-type') ?? '';
        const data = ct.includes('application/json') ? await res.json() : null;
        if (!res.ok) {
            const err = new Error(data?.message || `HTTP ${res.status}`);
            err.status = res.status;
            err.code = data?.code; // lý do máy-đọc-được của server (vd llm 'hub_expired') — giữ qua nhánh lỗi bên dưới
            throw err;
        }
        return { ok: true, statusCode: res.status, data };
    };

    try {
        return retries ? await _retry(call, retries) : await call();
    } catch (e) {
        // Handle common HTTP errors with friendly messages
        const code = e?.code;
        switch (e?.status) {
            case 404: return { ok: false, statusCode: 404, message: 'Not found', code };
            case 403: return { ok: false, statusCode: 403, message: 'Auth expired', code };
            case 401: return { ok: false, statusCode: 401, message: 'Unauthorized', code };
            default:  return { ok: false, statusCode: e?.status, message: e?.message, code };
        }
    }
}

/**
 * Factory function to create HTTP methods with custom options.
 * @param {object} customOptions - Custom fetch options
 * @returns {object} - HTTP method functions
 */
export default function (customOptions = {}) {
    return {
        get:    (endpoint, params = {}) => requester('GET',    endpoint, params, customOptions),
        post:   (endpoint, params = {}) => requester('POST',   endpoint, params, customOptions),
        put:    (endpoint, params = {}) => requester('PUT',    endpoint, params, customOptions),
        patch:  (endpoint, params = {}) => requester('PATCH',  endpoint, params, customOptions),
        delete: (endpoint, params = {}) => requester('DELETE', endpoint, params, customOptions),
    };
}
