// src/webs/underlay/tools/constant.js
// Demo/testing fixtures for <svc-underlay> — a spread of preset prop combos
// covering all five concepts plus the quality/theme/debug/push/limit
// overrides, meant to be dropped into a test page (see
// src/pages/ui/underlay.astro) so every case can be eyeballed side by side,
// grouped by concept. Not consumed by the component itself.

/**
 * @typedef {Object} UnderlayPreset
 * @property {string} id - stable key, safe to use as a DOM/loop key
 * @property {string} label - short human-readable caption shown on the demo card
 * @property {string} concept - 'bubbles' | 'stars' | 'dots' | 'leaf' | 'snowflake'
 * @property {string} [theme] - '' (follow global) | 'light' | 'dark' — omitted presets follow the page's global data-theme
 * @property {string} tint - seed color (hex) for the particle palette
 * @property {number} [total] - number of colors (1-7), shared by the particle palette and the gradient-blob layer — 1 = mono regardless of `colorful`
 * @property {boolean} [colorful] - false (default) = tonal range (same hue, lightness only) | true = hue-spread across `total` colors
 * @property {number} [deg] - drift direction for bubbles/stars/leaf/snowflake, degrees
 * @property {number} [density] - particle count multiplier — omit to use the concept's automatic default (AUTO_DENSITY, tools/context.js: dots=2, everything else=1); only set this to intentionally go denser/sparser than that default
 * @property {number} [limit] - absolute particle count cap, overrides density × tier base if lower (0/omitted = no cap) — e.g. bubbles look better with just a handful
 * @property {number} [speed] - motion speed multiplier
 * @property {string} [size] - "min~max" px particle size range
 * @property {string} [quality] - '' (auto) | 'low' | 'medium' | 'high'
 * @property {boolean} [debug] - show the shared FPS badge
 * @property {boolean} [push] - enable the pointer-repel push effect (works for any concept, default off)
 * @property {number} [pushRadius] - push effect radius, CSS px (only relevant when push is true)
 * @property {number} [pushStrength] - push effect max displacement, CSS px (only relevant when push is true)
 * @property {number} [trail] - 0-100, 0/omitted = off. >0 enables a comet-style trail (fades the previous frame instead of clearing it, so moving particles streak) — works for any concept; higher = longer trail
 * @property {boolean} [blur] - glassmorphism backdrop-blur wrapper (ported from web-bg-old.js), independent of the particle system
 * @property {boolean} [gradient] - enable the CSS gradient-blob layer behind the particle canvas (ported from web-bg-old.js)
 * @property {string} [blobType] - 'circleOverlap' | 'ellipse' — blob layout when gradient is true (default 'circleOverlap')
 * @property {number} [distance] - % spread of blobs around center, only relevant for blobType 'circleOverlap'
 * @property {string} [blobMove] - '' (off) | 'swap' | 'pulse' — motion for the gradient-blob layer, only relevant when gradient is true (ported from web-bg-old.js `move`)
 */

/** @type {UnderlayPreset[]} */
export const UNDERLAY_PRESETS = [
    // ── Bubbles ──────────────────────────────────────────────────────────
    {
        id: 'bubbles-default',
        label: 'Bubbles — default',
        concept: 'bubbles',
        tint: '#0000ff', // violet #8800ff | blue #0000ff | sky #0093ff
        total: 7,
        deg: 270,
        size: '10~80',
        limit: 60,
    },
    {
        id: 'bubbles-colorful-7',
        label: 'Bubbles — colorful, 7 colors',
        concept: 'bubbles',
        tint: '#489b93',
        total: 7,
        colorful: true,
        deg: 70,
        speed: 0.5,
        size: '30~70',
        quality: 'medium',
    },
    {
        id: 'bubbles-showcase',
        label: 'Bubbles — polished showcase',
        concept: 'bubbles',
        tint: '#8b5cf6',
        deg: 175,
        limit: 80,
        speed: 0.6,
        size: '30~70',
        push: true,
        pushRadius: 80,
        pushStrength: 10,
    },
    {
        id: 'bubbles-mono-angled',
        label: 'Bubbles — mono, angled drift (deg=45)',
        concept: 'bubbles',
        tint: '#2ebd85',
        total: 1,
        deg: 45,
        density: 1.4, // nhỏ (1-4px, gần như dots) nên vượt auto-default (1) để đủ dày
        speed: 0.7,
        size: '1~4',
        limit: 200,
    },
    {
        id: 'bubbles-push',
        label: 'Bubbles — push enabled (move pointer over it)',
        concept: 'bubbles',
        tint: '#ff8fa3',
        deg: 180,
        speed: 0.9,
        size: '2~7',
        push: true,
        pushRadius: 180,
        pushStrength: 60,
    },
    {
        id: 'bubbles-quality-low',
        label: 'Bubbles — quality pinned "low" (weak-device simulation)',
        concept: 'bubbles',
        tint: '#fbbf24',
        quality: 'low',
        size: '2~5',
    },
    {
        id: 'bubbles-theme-light-mono',
        label: 'Bubbles — forced theme="light", mono',
        concept: 'bubbles',
        theme: 'light',
        tint: '#2ebd85',
        total: 1,
    },
    {
        id: 'bubbles-gradient-spatial',
        label: 'Bubbles — gradient blob (circleOverlap, swap move) + spatial glass',
        concept: 'bubbles',
        tint: '#f472b6',
        total: 3,
        deg: 0,
        limit: 15,
        speed: 0.4,
        size: '4~10',
        blur: true,
        gradient: true,
        blobType: 'circleOverlap',
        distance: 70,
        blobMove: 'swap',
    },

    // ── Stars ────────────────────────────────────────────────────────────
    {
        id: 'stars-default',
        label: 'Stars — default twinkle',
        concept: 'stars',
        tint: '#ffe9a8',
        deg: 0,
        speed: 1,
        size: '1~3',
    },
    {
        id: 'stars-comet-debug',
        label: 'Stars — comet trail (deg=150), debug FPS on',
        concept: 'stars',
        tint: '#a855f7',
        deg: 150,
        speed: 6,
        size: '1~4',
        limit: 40,
        trail: 70,
        debug: true,
    },
    {
        id: 'stars-push',
        label: 'Stars — push enabled (pointer flares nearby stars)',
        concept: 'stars',
        tint: '#38bdf8',
        deg: 180,
        density: 1.4, // hơi dày hơn auto-default (1) để pointer luôn có sao gần để "thắp sáng"
        push: true,
        size: '1~4',
    },
    {
        id: 'stars-mono-dense',
        label: 'Stars — mono, dense field, comet trail (deg=45)',
        quality: 'medium',
        concept: 'stars',
        total: 1,
        tint: '#ffbb24',
        deg: 45,
        speed: 5,
        size: '1~5',
        limit: 30,
        trail: 60,
    },
    {
        id: 'stars-theme-dark',
        label: 'Stars — forced theme="dark"',
        concept: 'stars',
        theme: 'dark',
        tint: '#ffffff',
        push: true,
    },
    {
        id: 'stars-gradient-ellipse-spatial',
        label: 'Stars — gradient blob (ellipse, pulse move) + spatial glass',
        concept: 'stars',
        theme: 'dark',
        tint: '#38bdf8',
        deg: 45,
        speed: 0.5,
        blur: true,
        gradient: true,
        blobType: 'ellipse',
        total: 3,
        colorful: true,
        blobMove: 'pulse',
    },

    // ── Dots ─────────────────────────────────────────────────────────────
    {
        id: 'dots-static',
        label: 'Dots — push disabled (static faint field)',
        concept: 'dots',
        tint: '#94a3b8',
        quality: 'low',
        size: '2~5',
    },
    {
        id: 'dots-push',
        label: 'Dots — push enabled (move pointer over it)',
        concept: 'dots',
        tint: '#00c7d4',
        size: '1~5',
        push: true,
    },
    {
        id: 'dots-dense-quality-high',
        label: 'Dots — push, high density, quality pinned "high"',
        concept: 'dots',
        tint: '#f5465c',
        density: 2.5, // dày hơn auto-default cho dots (2) — demo mật độ cao
        size: '1~2',
        quality: 'high',
        push: true,
        pushRadius: 200,
        pushStrength: 70,
    },
    {
        id: 'dots-mono-grid',
        label: 'Dots — mono, tight grid, push enabled',
        concept: 'dots',
        tint: '#a3e635',
        total: 1,
        density: 4, // dày hơn nhiều so với auto-default (2) — demo lưới dày đặc
        size: '1~1.5',
        push: true,
    },

    // ── Leaf ─────────────────────────────────────────────────────────────
    {
        id: 'leaf-default',
        label: 'Leaf — default fall',
        concept: 'leaf',
        tint: '#4d9c3f',
        deg: 180,
        speed: 0.6,
        size: '60~120',
        quality: 'low',
        limit: 20
    },
    {
        id: 'leaf-colorful-autumn',
        label: 'Leaf — autumn, colorful spread',
        concept: 'leaf',
        tint: '#d97706',
        total: 5,
        colorful: true,
        deg: 165,
        speed: 0.5,
        size: '16~32',
    },
    {
        id: 'leaf-sparse-showcase',
        label: 'Leaf — sparse showcase, angled drift (deg=200)',
        concept: 'leaf',
        tint: '#c57928',
        deg: 160,
        density: 0.6, // thưa hơn auto-default (1) — chủ ý để từng lá nổi bật riêng lẻ
        speed: 0.45,
        size: '40~160',
        quality: 'medium',
    },
    {
        id: 'leaf-push',
        label: 'Leaf — push enabled (move pointer over it)',
        concept: 'leaf',
        tint: '#22c55e',
        deg: 180,
        speed: 0.7,
        size: '40~160',
        push: true,
        pushRadius: 120,
        pushStrength: 20,
        quality: 'low',
    },
    {
        id: 'leaf-mono-dense',
        label: 'Leaf — mono, dense field',
        concept: 'leaf',
        tint: '#16a34a',
        total: 1,
        density: 2, // dày hơn auto-default (1) — demo trường lá dày đặc
        speed: 0.5,
        size: '18~36',
        limit: 120,
    },
    {
        id: 'leaf-quality-low',
        label: 'Leaf — quality pinned "low" (weak-device simulation)',
        concept: 'leaf',
        tint: '#84cc16',
        quality: 'low',
        size: '30~80',
    },

    // ── Snowflake ────────────────────────────────────────────────────────
    {
        id: 'snowflake-default',
        label: 'Snowflake — default fall',
        concept: 'snowflake',
        tint: '#e0f2fe',
        deg: 160,
        limit: 50,
        speed: 0.4,
        size: '20~90',
        push: true,
        pushRadius: 90,
        pushStrength: 15,
    },
    {
        id: 'snowflake-sparse-showcase',
        label: 'Snowflake — sparse showcase, angled drift (deg=20)',
        concept: 'snowflake',
        tint: '#bae6fd',
        deg: 30,
        limit: 50,
        speed: 0.4,
        size: '20~90',
        push: true,
        pushRadius: 90,
        pushStrength: 15,
    },
];

export default UNDERLAY_PRESETS;
