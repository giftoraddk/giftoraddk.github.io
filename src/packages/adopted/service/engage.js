// src/packages/adopted/service/engage.js
//
// Ported from astro-micro's src/webs/socials/tools/service.js (phần engagement) — bộ đếm
// views/likes trên posts.meta + trạng thái đã like/xem cục bộ. Storager cũ → cacheGet/cacheSet
// của crud.js (TTL 0 = không hết hạn, cùng ngữ nghĩa Storager.set(key, state, 0)).

import { createService, db, cacheGet, cacheSet } from '@/services/core/crud';

const POSTS_TABLE = 'posts';

function _parseMeta(row) {
    return typeof row.meta === 'string' ? JSON.parse(row.meta || '{}') : (row.meta ?? {});
}

// Cộng/trừ nguyên tử phía server (auth _bump) — khách chưa đăng nhập vẫn tăng được views/likes
export async function bumpMeta(postId, field, delta) {
    return db().bump(POSTS_TABLE, postId, `meta.${field}`, delta);
}

// Trang tĩnh chỉ có snapshot lúc build — đọc số thật khi mount để sửa số cũ đã bake vào HTML
export async function fetchCounts(postId) {
    const row = await createService(POSTS_TABLE).findById(postId);
    if (!row) return null;
    const meta = _parseMeta(row);
    return { views: Number(meta.views || 0), likes: Number(meta.likes || 0) };
}

// ── Trạng thái cục bộ — 1 key "engage": { liked: { [postId]: true }, viewed: { [postId]: ms } } ──

const ENGAGE_KEY       = 'engage';
const VIEW_COOLDOWN_MS = 30_000;

async function _loadState() {
    return (await cacheGet(ENGAGE_KEY)) ?? { liked: {}, viewed: {} };
}

export async function isLiked(postId) {
    return !!(await _loadState()).liked[postId];
}

export async function markLiked(postId) {
    const state = await _loadState();
    state.liked[postId] = true;
    await cacheSet(ENGAGE_KEY, state, 0);
}

export async function canTrackView(postId) {
    const last = (await _loadState()).viewed[postId];
    return !last || (Date.now() - last >= VIEW_COOLDOWN_MS);
}

export async function markViewed(postId) {
    const state = await _loadState();
    state.viewed[postId] = Date.now();
    await cacheSet(ENGAGE_KEY, state, 0);
}
