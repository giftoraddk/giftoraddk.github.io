/**
 * firestore.js — Firebase app init only. Every table's actual Firestore access now goes through
 * the Cloudflare Worker (see firestore.worker.js's WorkerAdapter, registered in crud.js) — this
 * file no longer implements a DbAdapter itself. The one deliberate exception still calling
 * `firebase/firestore` straight from the browser is webs/bay/tools/service.js's `listenBayPings`
 * (needs a `documentId() IN [...]` query the Worker doesn't support, and true low-latency push for
 * pings) — it imports `getFirebaseApp()` from here for that.
 *
 * (Previously also held `FirestoreAdapter`/`repoFirestoreAdapter`/`llmFirestoreAdapter` — dead code
 * once crud.js's registry switched to the Worker-proxied adapters; removed. See hook/WORKER.rst.)
 */

// ── Firebase apps — 2 kết nối độc lập (knowledge base LLM / repo — mọi bảng còn lại, kể cả
// invoices) ─── users/profiles giờ sống ở Supabase Postgres qua Worker (server='DB_ACC', xem
// firestore.worker.js), không còn project Firebase riêng cho auth nữa.
// Mỗi kết nối đọc 1 env var riêng (tilde-separated), tách bằng named app của Firebase
// (initializeApp(config, name)) — các project cùng sống trong 1 client mà không đụng nhau.

import { initializeApp, getApps } from 'firebase/app';

const ENV_KEYS = { DB_ALL: 'PUBLIC_DB_ALL', DB_LLM: 'PUBLIC_DB_LLM' };

// Masking marker: `~k!t@d~` can be spliced anywhere into the env value (e.g.
// into the middle of apiKey) to defeat plaintext greps in a shipped bundle —
// every occurrence is stripped, collapsing the two surrounding tildes back
// into a seamless string, before splitting into fields.
const _MASK_MARKER = '~k!t@d~';
const _unmask = (raw) => raw.includes(_MASK_MARKER) ? raw.split(_MASK_MARKER).join('') : raw;

const _apps = new Map();

/** Firebase app cho 1 kết nối theo tên ('DB_ALL' | 'DB_LLM') — lazy + cached. */
export function getFirebaseApp(name = 'DB_ALL') {
    if (_apps.has(name)) return _apps.get(name);
    const envKey = ENV_KEYS[name] ?? ENV_KEYS.DB_ALL;
    const [apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, databaseURL] =
        _unmask(import.meta.env[envKey] ?? '').split('~');
    // getApps().find (không getApp, tránh throw) — an toàn khi HMR re-run module này.
    const app = getApps().find(a => a.name === name)
        ?? initializeApp({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, databaseURL }, name);
    _apps.set(name, app);
    return app;
}
