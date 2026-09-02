/**
 * requester.js — Shared HTTP fetch layer: headers, auth token, timeout, retry.
 *
 * Single source for raw fetch mechanics — used by crud.js (SqlService REST calls,
 * pipe-separated dataSrc reads) and firestore.server.ts (Firestore REST API at build time).
 */

const _token = () =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

function _headers(custom = {}) {
    const token = _token();
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
 * @returns {Promise<{ok:true, statusCode:number, data:any} | {ok:false, statusCode?:number, message:string}>}
 */
export async function requester(method, endpoint, params = {}, customOptions = {}) {
    const { headers: customHeaders, retries = 0, timeoutMs = 10_000, ...rest } = customOptions;
    const verb   = method.toUpperCase();
    const isRead = verb === 'GET' || verb === 'DELETE';
    const url    = isRead && Object.keys(params).length ? `${endpoint}${_qs(params)}` : endpoint;

    const opts = { method: verb, headers: _headers(customHeaders), ...rest };
    if (!isRead) opts.body = JSON.stringify(params);

    const call = async () => {
        const res  = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
        const ct   = res.headers.get('content-type') ?? '';
        const data = ct.includes('application/json') ? await res.json() : null;
        if (!res.ok) {
            const err = new Error(data?.message || `HTTP ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return { ok: true, statusCode: res.status, data };
    };

    try {
        return retries ? await _retry(call, retries) : await call();
    } catch (e) {
        // Handle common HTTP errors with friendly messages
        switch (e?.status) {
            case 404: return { ok: false, statusCode: 404, message: 'Not found' };
            case 403: return { ok: false, statusCode: 403, message: 'Auth expired' };
            case 401: return { ok: false, statusCode: 401, message: 'Unauthorized' };
            default:  return { ok: false, statusCode: e?.status, message: e?.message };
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
