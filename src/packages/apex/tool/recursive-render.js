// src/packages/apex/tool/recursive-render.js
//
// OVERVIEW
// ─────────
// Pure, framework-free core for the web-board > web-boxs > web-box > web-cell
// recursive JSON schema (see hook/DESIGN.rst) + the i18n/color/url/filter helpers every level shares. One node shape describes every
// level — section, tier, group, cell — instead of the old parallel-array schema
// (tiers/makes/groupCol/groupRow/groupJustify/groupStyle). No Lit/DOM import here
// on purpose: every function is `node/ctx in → plain value out`, so it is testable
// standalone (`node --test`) before any component touches it.
//
// Node shape (all optional except at least one of each/children/render):
//   { type, source, value, each, when, render, preset, props, layout, style, bg, children }
//
// ctx shape passed through the recursion:
//   { record, item, index, records, lang }
//   - `record`  : the single "current" record — the DEFAULT binding target for every
//                 `source` path, even inside an `each` (see hook/DESIGN.rst's
//                 "Context binding gốc" callout — this does NOT shift to the loop item).
//   - `item`/`index` : current loop value/position, reached ONLY via the `$item`/`$index`
//                 tokens — the sole way to read the thing an `each` is iterating over.
//   - `records` : the section's top-level record list — the target of `each: '$records'`.

import { normText } from '../../../services/tools/util.js';

/** Any field may be a plain value OR a `{ vi, en, … }` bag: val[lang] → val.vi → first key → val itself. */
export function resolveLocale(val, lang = 'vi') {
    if (val && typeof val === 'object' && !Array.isArray(val) && (val.vi !== undefined || val.en !== undefined)) {
        return val[lang] ?? val.vi ?? Object.values(val)[0];
    }
    return val;
}

export function isObj(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Deep-merges plain objects; arrays/scalars replace wholesale. Skips `undefined` so a
 * node omitting a field never blanks out what a preset (or an earlier source) supplied. */
export function deepMerge(...sources) {
    const result = {};
    for (const source of sources) {
        if (!isObj(source)) continue;
        for (const [key, value] of Object.entries(source)) {
            if (value === undefined) continue;
            const current = result[key];
            result[key] = isObj(current) && isObj(value) ? deepMerge(current, value)
                : Array.isArray(value) ? [...value]
                : value;
        }
    }
    return result;
}

/** Clone cây node, deepMerge `patch` vào mọi node thoả `match` — override 1 node lồng sâu của
 * config dùng chung (vd đổi aspectRatio ảnh, reverse slider) mà không mutate bản gốc. */
export function patchNode(node, match, patch) {
    const next = match(node) ? deepMerge(node, patch) : { ...node };
    if (Array.isArray(node.children)) next.children = node.children.map(c => patchNode(c, match, patch));
    return next;
}

// presets registry → (name → resolved chain). Mount chạy cho MỌI item ở MỌI lần render — không deepMerge lại
// cùng 1 chuỗi `extends`. Registry mới (object khác) tự có cache mới; kết quả không bị mutate (resolveNode merge ra bản mới).
const _presetCache = new WeakMap();

/** Recursively resolves `extends` chains; throws on unknown name or circular inheritance. */
export function resolvePreset(name, presets = {}, stack = []) {
    if (!name) return {};
    if (stack.includes(name)) throw new Error(`Circular preset inheritance: ${[...stack, name].join(' → ')}`);
    const cache = _presetCache.get(presets) ?? new Map();
    if (cache.has(name)) return cache.get(name);
    const preset = presets[name];
    if (!preset) throw new Error(`Unknown preset: ${name}`);
    const parent = preset.extends ? resolvePreset(preset.extends, presets, [...stack, name]) : {};
    const resolved = deepMerge(parent, preset);
    cache.set(name, resolved);
    _presetCache.set(presets, cache);
    return resolved;
}

/** preset chain (by node.preset) deep-merged with the node's own render/style/props — node wins. */
export function resolveNode(node, presets = {}) {
    const preset = node.preset ? resolvePreset(node.preset, presets) : {};
    const merged = deepMerge(preset, { render: node.render, style: node.style, props: node.props });
    return { render: merged.render, style: merged.style || {}, props: merged.props || {} };
}

function nestedValue(obj, path) {
    return path.split('.').reduce((v, k) => v?.[k], obj);
}

/** `$item` / `$index` / `$item.<path>` read the loop context; any other path reads `ctx.record`. */
export function resolvePath(path, ctx = {}) {
    if (!path) return undefined;
    if (path === '$item') return ctx.item;
    if (path === '$index') return ctx.index;
    if (path === '$records') return ctx.records;
    if (path.startsWith('$item.')) return nestedValue(ctx.item, path.slice('$item.'.length));
    return nestedValue(ctx.record, path);
}

/** value/source → the real value, i18n-resolved (`value`/`source` are mutually exclusive by convention). */
export function resolveValue(node, ctx) {
    const raw = node.value !== undefined ? node.value : node.source !== undefined ? resolvePath(node.source, ctx) : undefined;
    return resolveLocale(raw, ctx.lang);
}

/** `each: '$records'` loops the section's own record list; any other path reads an array field off `ctx.record` (replaces the old `dataKey`). */
export function resolveEachSource(each, ctx) {
    const list = each === '$records' ? ctx.records : resolvePath(each, ctx);
    return Array.isArray(list) ? list : [];
}

/** `when` gates whether a node renders at all. String path (optionally `!`-negated) or a literal boolean. */
export function resolveWhen(node, ctx) {
    if (node.when === undefined) return true;
    if (typeof node.when === 'boolean') return node.when;
    const negate = node.when.startsWith('!');
    const value = resolvePath(negate ? node.when.slice(1) : node.when, ctx);
    return negate ? !value : !!value;
}

// Keys that affect the HOST element's position in its parent's flow/grid (must live on the
// wrapper tag's own `style=` attribute, not inside the component's Shadow DOM) — everything
// else is "inner" styling forwarded as a prop. Pre-rewrite `posKeys` + flex-item keys — ở schema cũ
// chính renderer (web-letters…) là flex/grid item; schema mới thì item là wrapper do cha bọc.
export const HOST_STYLE_KEYS = new Set([
    'overflow', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'zIndex',
    'alignSelf', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'order',
]);

export function splitHostInner(style = {}) {
    const host = {}, inner = {};
    // overflow đi cùng borderRadius — tách ra wrapper vuông thì nội dung không bị cắt theo góc bo
    // và boxShadow của inner còn bị wrapper cắt mất
    const clipsRounded = style.borderRadius !== undefined;
    for (const [k, v] of Object.entries(style)) {
        const toHost = HOST_STYLE_KEYS.has(k) && !(k === 'overflow' && clipsRounded);
        (toHost ? host : inner)[k] = v;
    }
    // width % tính theo cha → thuộc wrapper (item thật trong flex / box absolute); inner lấp đầy nó.
    // 100% giữ nguyên ở inner — web-box dùng nó làm tín hiệu gi-fill (flex-grow)
    if (/%$/.test(String(inner.width ?? '')) && inner.width !== '100%') {
        host.width = inner.width;
        inner.width = '100%';
    }
    return { host, inner };
}

/**
 * The one "mount a node" step every recursion boundary (web-boxs → web-box, web-box → its own
 * children/each-items) goes through: resolve preset+style/props, then split host/inner so the
 * caller can put `host` on the `<web-box>`/`<web-cell>` tag's own `style=` attribute (affects its
 * placement in the PARENT's layout) while `inner` rides along as the mounted node's own style.
 */
export function resolveMount(node, ctx, presets = {}) {
    const { render, style, props } = resolveNode(node, presets);
    const rawStyle = typeof style === 'string' ? (resolvePath(style, ctx) || {}) : (style || {});
    const { host, inner } = splitHostInner(rawStyle);
    return { host, inner, render, props };
}

// Root có children tĩnh (≙ tiers cũ) → bg là nền full-section do web-board render ngoài gi-container.
// Root là each-node → bg là nền từng item, web-box tự render (≙ card config cũ).
export function sectionBg(config) {
    return Array.isArray(config?.children) && config.each === undefined ? (config.bg || null) : null;
}

// ── Shared helpers of the stack (pure — web-boxs/web-box/web-cell all import from here) ──────────────

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'info', 'warning'];
const COLOR_DEFAULTS = ['#2ebd85', '#f5465c', '#a855f7', '#00c7d4', '#fbbf24'];

/** "p|s|a|i|w" → CSS custom properties. `??` (not `||`) on purpose: an empty segment stays '' so
 *  setProperty() drops it and the page theme's own value shows through (legacy behaviour). */
export function colorVars(mainColors = '', textColor = '') {
    const parts = String(mainColors ?? '').split('|').map(c => c.trim());
    const vars = {};
    COLOR_KEYS.forEach((key, i) => { vars[`--color-${key}`] = parts[i] ?? COLOR_DEFAULTS[i]; });
    vars['--color-base-content'] = textColor || 'inherit';
    return vars;
}

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/** href từ record/config là dữ liệu không tin cậy — chặn javascript:/data:/vbscript:… (kể cả khi chèn
 *  tab/newline giữa chữ, trình duyệt tự bỏ chúng trước khi đọc scheme). Relative/#/?… giữ nguyên. */
export function safeUrl(url, fallback = '#') {
    const raw = String(url ?? '').trim();
    if (!raw) return fallback;
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(raw.replace(/[\u0000- \u007f]/g, ''));
    return !scheme || SAFE_SCHEMES.has(scheme[1].toLowerCase()) ? raw : fallback;
}

/** item[field] là string[] hoặc chuỗi nối '|'. */
export function tagsOf(item, field = 'tags') {
    const val = item?.[field];
    return Array.isArray(val) ? val : typeof val === 'string' ? val.split('|').filter(Boolean) : [];
}

/** item[field] theo quy ước "price~cost~unit" — chỉ lấy đoạn price. */
export function priceOf(item, field = 'pricing') {
    const p = parseFloat(String(item?.[field] ?? '').split('~')[0]);
    return Number.isFinite(p) ? p : NaN;
}

// Chuỗi tìm kiếm của 1 record tính 1 lần rồi nhớ theo object — filter lại mỗi lần gõ phím không stringify lại.
const _searchText = new WeakMap();
function searchText(item) {
    if (!item || typeof item !== 'object') return normText(String(item ?? ''));
    let text = _searchText.get(item);
    if (text === undefined) { text = normText(JSON.stringify(item)); _searchText.set(item, text); }
    return text;
}

/** Text (search + query, accent-insensitive) → tag (any of `active`) → numeric price range [min, max). */
export function filterRecords(records, { search = '', query = '', active = [], field = 'tags', range = null, rangeField = 'pricing' } = {}) {
    let items = Array.isArray(records) ? records : [];
    const needles = [search, query].filter(Boolean).map(normText);
    if (needles.length) items = items.filter(it => needles.every(q => searchText(it).includes(q)));
    if (active.length) items = items.filter(it => { const tags = tagsOf(it, field); return active.some(a => tags.includes(a)); });
    if (range) {
        const { min = 0, max = Infinity } = range;
        items = items.filter(it => { const p = priceOf(it, rangeField); return Number.isFinite(p) && p >= (min ?? 0) && p < (max ?? Infinity); });
    }
    return items;
}
