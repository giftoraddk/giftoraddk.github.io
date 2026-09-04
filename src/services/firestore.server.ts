/**
 * firestore.server.ts — Server-side Firestore REST helper.
 *
 * Dùng trong Astro frontmatter / getStaticPaths để fetch data lúc build.
 * KHÔNG import trong Lit components (client-side).
 *
 * Đọc config từ PUBLIC_DB/PUBLIC_DB_AUTH/PUBLIC_DB_INVO env (tuỳ opts.connection):
 * apiKey~authDomain~projectId~… — khai lại literal (không import firestore.js, file đó là
 * client-side, còn file này build riêng cho server).
 * Raw fetch (headers, timeout, retry) đi qua requester.js — dùng chung với crud.js.
 */

import { requester } from '@/services/requester.js';

// Cùng bảng ENV_KEYS như firestore.js (client) — giữ đồng bộ tên kết nối khi thêm/đổi.
const ENV_KEYS: Record<string, string> = { firestore: 'PUBLIC_DB', auth: 'PUBLIC_DB_AUTH', invoices: 'PUBLIC_DB_INVO' };

// Cùng cơ chế mask như firestore.js (client) — `~k!t@d~` có thể chèn ở bất kỳ
// đâu trong env value để né grep plaintext; bóc ra trước khi split('~').
const _MASK_MARKER = '~k!t@d~';
const _unmask = (raw: string): string => raw.includes(_MASK_MARKER) ? raw.split(_MASK_MARKER).join('') : raw;

// ── Firestore REST value parser ──────────────────────────────────────────────

function fsVal(v: any): any {
    if (!v || typeof v !== 'object') return v;
    if ('stringValue'    in v) return v.stringValue;
    if ('integerValue'   in v) return Number(v.integerValue);
    if ('doubleValue'    in v) return Number(v.doubleValue);
    if ('booleanValue'   in v) return v.booleanValue;
    if ('nullValue'      in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('mapValue'       in v) {
        const f = v.mapValue?.fields ?? {};
        return Object.fromEntries(Object.entries(f).map(([k, fv]) => [k, fsVal(fv)]));
    }
    if ('arrayValue'     in v) return (v.arrayValue?.values ?? []).map(fsVal);
    return v;
}

function parseDoc(doc: any): Record<string, any> {
    const id     = (doc.name as string)?.split('/').pop() ?? '';
    const fields = doc.fields ?? {};
    const out: Record<string, any> = { id };
    for (const [k, v] of Object.entries(fields)) out[k] = fsVal(v);
    return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

// Build-time memoization — tương đương `unstable_cache` cho 1 hàm không dùng fetch gốc trực
// tiếp (đây dùng requester() qua fetch nhưng vẫn cần cache theo (collection, opts), không theo
// URL). Nhiều trang tĩnh gọi cùng 1 collection trong CÙNG 1 lần `astro build`
// (vd post/[id].astro + post/index.astro đều gọi fetchCollection('posts')) — không có tầng này
// mỗi trang tự fetch lại nguyên collection, tốn quota Firestore vô ích trong cùng 1 build.
// Sống trong đúng 1 process build — không cần TTL/invalidate như Next.js's unstable_cache vì
// "invalidate" ở đây tự nhiên là build mới (process mới, Map mới).
const _buildCache = new Map<string, Promise<Record<string, any>[]>>();

/**
 * Fetch tất cả documents từ một Firestore collection qua REST API.
 * Nhiều lời gọi cùng (collectionName, opts) trong 1 lần build chia sẻ đúng 1 fetch — xem
 * _buildCache phía trên.
 *
 * @param collectionName  Tên collection trong Firestore
 * @param opts.activeOnly  Lọc status='active' và deleted_at==null (mặc định: true)
 * @param opts.connection  'firestore' (mặc định) | 'auth' | 'invoices' — chọn env/project
 */
export function fetchCollection(
    collectionName: string,
    opts: { activeOnly?: boolean; connection?: string } = {}
): Promise<Record<string, any>[]> {
    const key = `${collectionName}::${opts.connection ?? 'firestore'}::${opts.activeOnly ?? true}`;
    const cached = _buildCache.get(key);
    if (cached) return cached;

    const promise = _fetchCollectionRaw(collectionName, opts);
    _buildCache.set(key, promise);
    return promise;
}

/**
 * Fetch ĐÚNG 1 document theo id qua Firestore REST API — dùng trong route ISR
 * (`export const prerender = false`), nơi mỗi request chỉ cần 1 record, không phải cả collection
 * như fetchCollection(). Không có build-time memoization (_buildCache) — mỗi request Vercel là 1
 * lần gọi mới, memoize theo process không giúp ích gì (caching thật nằm ở tầng ISR/CDN).
 *
 * @returns Record đã parse, hoặc `null` nếu không tồn tại/lỗi (caller tự quyết định 404).
 */
export async function fetchDoc(
    collectionName: string,
    id: string,
    opts: { connection?: string } = {}
): Promise<Record<string, any> | null> {
    if (!id) return null;

    const envKey = ENV_KEYS[opts.connection ?? 'firestore'] ?? ENV_KEYS.firestore;
    const [apiKey, , projectId] = _unmask(import.meta.env[envKey] ?? '').split('~');

    if (!apiKey || !projectId) {
        console.warn(`[firestore.server] ${envKey} chưa cấu hình — bỏ qua fetchDoc("${collectionName}", "${id}")`);
        return null;
    }

    try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${id}?key=${apiKey}`;
        const res = await requester('GET', url, {}, { retries: 1 });

        if (!res.ok || !res.data?.name) return null;

        const doc = parseDoc(res.data);
        if (doc.deleted_at != null || doc.status !== 'active') return null;
        return doc;
    } catch (e: any) {
        console.warn(`[firestore.server] fetchDoc("${collectionName}", "${id}") lỗi:`, e?.message);
        return null;
    }
}

async function _fetchCollectionRaw(
    collectionName: string,
    opts: { activeOnly?: boolean; connection?: string } = {}
): Promise<Record<string, any>[]> {
    const envKey = ENV_KEYS[opts.connection ?? 'firestore'] ?? ENV_KEYS.firestore;
    const [apiKey, , projectId] = _unmask(import.meta.env[envKey] ?? '').split('~');

    if (!apiKey || !projectId) {
        console.warn(`[firestore.server] ${envKey} chưa cấu hình — bỏ qua "${collectionName}"`);
        return [];
    }

    const { activeOnly = true } = opts;

    try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?key=${apiKey}`;
        // retries: 2 — fetch chạy 1 lần lúc build, 1 lần lỗi mạng không nên làm fail cả build.
        const res = await requester('GET', url, {}, { retries: 2 });

        if (!res.ok) {
            console.warn(`[firestore.server] fetchCollection("${collectionName}") lỗi:`, res.message);
            return [];
        }
        if (!res.data?.documents) return [];

        let docs = (res.data.documents as any[]).map(parseDoc);
        if (activeOnly) docs = docs.filter(r => r.deleted_at == null && r.status === 'active');
        return docs;
    } catch (e: any) {
        console.warn(`[firestore.server] fetchCollection("${collectionName}") lỗi:`, e?.message);
        return [];
    }
}
