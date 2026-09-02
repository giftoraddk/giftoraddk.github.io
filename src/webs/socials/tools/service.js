// ── Engagement counters (views/likes) ───────────────────────────────────────

import { createService } from '@/services/crud';
const POSTS_TABLE = 'posts';

function _parseMeta(row) {
    return typeof row.meta === 'string' ? JSON.parse(row.meta || '{}') : (row.meta ?? {});
}

// Read-modify-write a single meta field on a posts doc, preserving other meta keys.
export async function bumpMeta(postId, field, delta) {
    const svc = createService(POSTS_TABLE);
    const row = await svc.findById(postId);
    if (!row) throw new Error(`[svc-engage] record not found: ${postId}`);

    const meta = _parseMeta(row);
    const next = Math.max(0, Number(meta[field] || 0) + delta);

    await svc.update(postId, {
        meta: { ...meta, [field]: next },
        updated_at: await svc.now(),
    });

    return next;
}

// Read-only fetch of the live views/likes — the static page only has a build-time snapshot,
// so the UI needs this on mount to correct any stale numbers baked into the HTML.
export async function fetchCounts(postId) {
    const svc = createService(POSTS_TABLE);
    const row = await svc.findById(postId);
    if (!row) return null;

    const meta = _parseMeta(row);
    return { views: Number(meta.views || 0), likes: Number(meta.likes || 0) };
}

// ── Engagement local state (IndexedDB via Storager) ─────────────────────────
// Single "engage" key: { liked: { [postId]: true }, viewed: { [postId]: timestampMs } }
// Kept centralized here (instead of one Storager key per post) for easy inspection/management.

const ENGAGE_KEY       = 'engage';
const VIEW_COOLDOWN_MS = 30_000;

async function _loadEngageState() {
    const { default: Storager } = await import('@/services/storager.js');
    const state = await Storager.get(ENGAGE_KEY);
    return { Storager, state: state ?? { liked: {}, viewed: {} } };
}

export async function isLiked(postId) {
    const { state } = await _loadEngageState();
    return !!state.liked[postId];
}

export async function markLiked(postId) {
    const { Storager, state } = await _loadEngageState();
    state.liked[postId] = true;
    await Storager.set(ENGAGE_KEY, state, 0);
}

export async function canTrackView(postId) {
    const { state } = await _loadEngageState();
    const last = state.viewed[postId];
    return !last || (Date.now() - last >= VIEW_COOLDOWN_MS);
}

export async function markViewed(postId) {
    const { Storager, state } = await _loadEngageState();
    state.viewed[postId] = Date.now();
    await Storager.set(ENGAGE_KEY, state, 0);
}

// ── Share URL builders ──────────────────────────────────────────────────────

const BUILDERS = {
    facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x:        (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    threads:  (url, title) => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`,
};

export function buildShareUrl(platform, { url, title }) {
    const build = BUILDERS[platform];
    return build ? build(url, title) : '';
}

export const PLATFORMS = [
    { key: 'facebook', icon: 'ri:facebook-fill' },
    { key: 'x',        icon: 'ri:twitter-x-fill' },
    { key: 'threads',  icon: 'simple-icons:threads' },
];
