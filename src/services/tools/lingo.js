// src/services/tools/lingo.js
//
// Đa ngôn ngữ — MỘT chỗ cho mọi nơi (component, schema, trang Astro, svc-node). Hai dạng dữ liệu:
//   - text song ngữ { vi, en } (title, tooltip, nhãn…) → lingo() / pickTxt() / pickLang()
//   - bộ chữ của component TXT_STD = { vi: {…}, en: {…} } → txtLingo() (prop `txt` ghi đè) / pickTxt()
//
//   lingo(v, lang)            chặt: chỉ đổi khi `v` đúng là { vi, en } (isLingo), không thì trả nguyên `v` — config node
//   pickTxt(obj, lang)        lỏng: obj[lang] → vi → en (undefined khi không có) — bộ chữ, nhãn có thêm field khác
//   txtLingo(txt, std, lang)  bộ chữ của component: `txt` prop (nếu có) hoặc TXT_STD → lang → vi → {}
//   pickLang(pair, lang)      chuỗi cho chỗ KHÔNG dual-render được (SEO: <title>, meta, JSON-LD) — mặc định
//                             site.defaultLang, fallback en (bản chuẩn) rồi vi, luôn trả string
//   localizeNode(node, lang)  mọi text { vi, en } của 1 node svc-node (title/tooltip/group/overlay…) — preset/mount.js
import { site } from './site.ts';

export const LANGS = ['vi', 'en'];

/** A { vi, en } text: a plain object of known languages → strings (so `txt` bundles or data objects never count). */
export function isLingo(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const entries = Object.entries(v);
    return entries.length > 0 && entries.every(([k, s]) => LANGS.includes(k) && typeof s === 'string');
}

/** `v` in `lang` when it is a { vi, en } text (falling back to vi, then en), else `v` as it is. */
export const lingo = (v, lang = 'vi') => (isLingo(v) ? v[lang] ?? v.vi ?? v.en ?? '' : v);

/** `obj[lang]`, falling back to vi then en — a TXT bundle or any { vi, en, …other } label; undefined when none. */
export const pickTxt = (obj, lang = 'vi') => obj?.[lang] ?? obj?.vi ?? obj?.en;

/**
 * Resolve a component's i18n text object: `txt` prop override (nếu có) -> lang hiện tại ->
 * fallback 'vi' -> object rỗng. Dùng cho pattern `get _txt()`/`get _t()` lặp lại ở hầu hết
 * svc-*.js (mỗi component tự có `TXT_STD` module-level, chỉ truyền vào đây).
 */
export const txtLingo = (txt, defaultTxt, lang) => {
    const d = txt ?? defaultTxt;
    return d[lang] ?? d.vi ?? {};
};

// Chọn 1 chuỗi từ cặp song ngữ { vi, en } cho những chỗ KHÔNG dual-render được bằng I18nText —
// <title>/meta description/JSON-LD là plain string, không phải DOM content nên CSS ([lang] +
// .i18n-vi/.i18n-en, xem I18nText.astro) không toggle được. English luôn là bản chuẩn (fallback
// cuối cùng) — xem site.defaultLang (services/tools/site.ts).
export const pickLang = (pair, lang = site.defaultLang) => {
    if (!pair || typeof pair !== 'object') return pair ?? '';
    return pair[lang] ?? pair.en ?? pair.vi ?? '';
};

// ── Node (svc-node) ──────────────────────────────────────────────────────────────────────────────────────────────────
// A node's words in the page's language. Config may write any text a node shows as { vi, en } — its title, tooltip,
// description, iconAlt, its group's title, its panel's title / loadingText / content, and string props of a component
// panel (e.g. svc-records's `heading`). packages/node/preset/mount.js resolves them with the page's lang (the cookie)
// before the nodes reach the canvas, so everything downstream — the canvas, <svc-ask>, the AI router, Node Builder —
// only sees strings.

const NODE_TEXT = ['title', 'tooltip', 'description', 'iconAlt'];
const GROUP_TEXT = ['title'];
const OVERLAY_TEXT = ['title', 'loadingText', 'content'];

// The value `live[key]` should show now, or undefined to leave it. `prev` = the lang it was last shown in: a field
// that no longer reads as the config said then was changed since (e.g. the account node wearing your name) — kept.
function pick(raw, live, lang, prev) {
    if (!isLingo(raw)) return undefined;
    const want = lingo(raw, lang);
    if (live === want) return undefined;
    if (prev === undefined || isLingo(live) || live === lingo(raw, prev)) return want;
    return undefined;
}

function patch(live, raw, keys, lang, prev) {
    let out = live;
    for (const key of keys) {
        const value = pick(raw?.[key], live?.[key], lang, prev);
        if (value === undefined) continue;
        if (out === live) out = { ...live };
        out[key] = value;
    }
    return out;
}

/**
 * `node` with its { vi, en } texts in `lang` — the same object when there is nothing to change. `raw` = its config
 * (default: the node itself), `prev` = the lang `node` was shown in so far: re-localizing a node already on the canvas
 * keeps where it drifted and any text changed at runtime.
 */
export function localizeNode(node, lang, { raw = node, prev } = {}) {
    let out = patch(node, raw, NODE_TEXT, lang, prev);
    if (node.group && raw.group) {
        const group = patch(node.group, raw.group, GROUP_TEXT, lang, prev);
        if (group !== node.group) out = { ...out, group };
    }
    if (node.overlay && raw.overlay) {
        let overlay = patch(node.overlay, raw.overlay, OVERLAY_TEXT, lang, prev);
        const props = node.overlay.properties, rawProps = raw.overlay.properties;
        if (props && rawProps) {
            const next = patch(props, rawProps, Object.keys(rawProps), lang, prev);
            if (next !== props) overlay = { ...overlay, properties: next };
        }
        if (overlay !== node.overlay) out = { ...out, overlay };
    }
    return out;
}
