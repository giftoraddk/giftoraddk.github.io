// src/packages/node/tool/lingo.js
//
// A node's words in the page's language. Config may write any text a node shows as { vi, en } — its title, tooltip,
// description, iconAlt, its group's title, its panel's title / loadingText / content, and string props of a component
// panel (e.g. svc-records's `heading`). preset/mount.js resolves them with the page's lang (the cookie) before the nodes
// reach the canvas, so everything downstream — the canvas, <svc-ask>, the AI router, Node Builder — only sees strings.

export const LANGS = ['vi', 'en'];

const NODE_TEXT = ['title', 'tooltip', 'description', 'iconAlt'];
const GROUP_TEXT = ['title'];
const OVERLAY_TEXT = ['title', 'loadingText', 'content'];

/** A { vi, en } text: a plain object of known languages → strings (so `txt` bundles or data objects never count). */
export function isLingo(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const entries = Object.entries(v);
    return entries.length > 0 && entries.every(([k, s]) => LANGS.includes(k) && typeof s === 'string');
}

/** `v` in `lang` when it is a { vi, en } text (falling back to vi, then en), else `v` as it is. */
export const lingo = (v, lang = 'vi') => (isLingo(v) ? v[lang] ?? v.vi ?? v.en ?? '' : v);

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
