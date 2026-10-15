/**
 * fetcher.server.js — Server-side reader cho Astro frontmatter / getStaticPaths / route ISR.
 * KHÔNG import trong Lit components (client đọc qua conductor → crud.js).
 *
 * Thay firestore.server.ts của astro-micro: cùng API fetchCollection/fetchDoc, đọc bảng public
 * (posts/products) của auth D1 qua HTTP — không import crud.js (nó kéo storager/IndexedDB).
 * Build production cần PUBLIC_AUTH_URL trỏ Worker đã deploy (.env.production).
 */

const _base = () => import.meta.env.PUBLIC_AUTH_URL;

async function _get(path) {
    const base = _base();
    if (!base) {
        console.warn('[fetcher.server] PUBLIC_AUTH_URL chưa cấu hình — trả dữ liệu rỗng');
        return null;
    }
    const res = await fetch(`${base}/v1/data/${path}`, { signal: AbortSignal.timeout(15_000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

const _isActive = (r) => r.deleted_at == null && r.status === 'active';

// Nhiều trang trong CÙNG 1 lần build gọi cùng collection → chia sẻ đúng 1 fetch. Chỉ khi build: `astro dev` giữ module
// suốt vòng đời server — memo ở đây sẽ đóng băng dữ liệu (thêm/sửa sản phẩm không hiện cho tới khi restart).
const _buildCache = new Map();

/**
 * Tất cả row của 1 table.
 * @param {string} table
 * @param {{ activeOnly?: boolean }} [opts]  activeOnly (mặc định true): status='active' & deleted_at null
 * @returns {Promise<object[]>}
 */
export function fetchCollection(table, opts = {}) {
    const activeOnly = opts.activeOnly ?? true;
    if (import.meta.env.DEV) return _fetchAll(table, activeOnly);
    const key = `${table}::${activeOnly}`;
    if (!_buildCache.has(key)) _buildCache.set(key, _fetchAll(table, activeOnly));
    return _buildCache.get(key);
}

async function _fetchAll(table, activeOnly) {
    try {
        const rows = await _get(activeOnly ? `${table}?status=active` : table);
        return Array.isArray(rows) ? rows : [];
    } catch (e) {
        console.warn(`[fetcher.server] fetchCollection("${table}") lỗi:`, e?.message);
        return [];
    }
}

/**
 * Đúng 1 row theo id — cho route ISR (mỗi request 1 record, không memoize theo process).
 * @returns {Promise<object|null>} null nếu không tồn tại / không active / lỗi (caller tự 404)
 */
export async function fetchDoc(table, id) {
    if (!id) return null;
    try {
        const row = await _get(`${table}/${encodeURIComponent(id)}`);
        return row && _isActive(row) ? row : null;
    } catch (e) {
        console.warn(`[fetcher.server] fetchDoc("${table}", "${id}") lỗi:`, e?.message);
        return null;
    }
}
