// src/packages/node/service/custom-nodes.js
//
// A user's own canvas nodes (<svc-node-builder>): each one is a copy of a node — its `base`, on the canvas or in the
// presets' catalogue — with some of that node's fields changed. Kept in the user's `profiles.notes` as JSON
// { nodes: [{ id, base, patch }], show: [id], hide: [id] } — `show` / `hide` are the preset nodes / sets the user turned
// on or off for themselves (preset/mount.js). Any other key in `notes` is kept as it is. Only what the user typed goes into the row — plain strings, numbers,
// booleans, keyed like the builder's form ('title', 'group', 'overlay.url', 'props.dataTable'…) and only where it
// differs from the base. A node's code (a schema, an MCP server, a render function, its `roles`) always comes from the
// base on this canvas, so a saved node can never widen what its base may do — nor can the props that say *what* its
// panel opens (LOCKED_PROPS: its table, division, site…), so the base's `roles` still describe it.
//
// The row is not trusted: anyone who can write `notes` (the user through the Worker, an admin) could put anything in
// it. applyCustomNodes() runs every saved patch through the same checks as the form (patchFrom) before it builds.
import { saveProfile } from '@/packages/auth/service/profile.js';
import { isIconName } from '../tool/icon.js';
import { httpUrl, isSameSite } from '../tool/url.js';

export const CUSTOM_PREFIX = 'custom-';
export const MAX_NODES = 40;
const ID = /^custom-[a-z0-9]{4,40}$/;
const isId = (id) => typeof id === 'string' && ID.test(id); // test() would turn ['custom-x'] into a string
const VIEW_ID = /^[\w:.-]{1,80}$/; // a node or preset id in show / hide
const MAX_VIEW = 200;
// Panel props a copy keeps from its base. A base locks more of its own with `overlay.locked: ['prop', …]`.
const LOCKED_PROPS = new Set(['dataTable', 'server', 'division', 'sector', 'value', 'for', 'perms', 'intent', 'schema']);
const MAX_TEXT = 300;
const MAX_LONG = 2000;
const PAGE_PROPS = new Set(['theme', 'lang', 'ui']); // the page sets these on every panel
const NODE_KEYS = ['title', 'tooltip', 'initials', 'description', 'icon', 'x', 'y', 'moving'];

// Node / preset ids from before the AI-<Sector> groups → what took their place, so a saved show / hide / copy keeps
// pointing at the same thing. An id with no successor passes through and is simply not found in the catalogue.
export const LEGACY_NODE_IDS = {
    ai: 'ai-ecommerce',
    aide: 'consult-ecommerce',
    talk: 'secretary-ecommerce',
    // The Coordinator node became the Secretary (one per sector group).
    'coordinator-ecommerce': 'secretary-ecommerce',
    'coordinator-education': 'secretary-education',
    'coordinator-fnb': 'secretary-fnb',
    'coordinator-healthcare': 'secretary-healthcare',
    'coordinator-realestate': 'secretary-realestate',
    'division-production': 'fn-ecommerce-product',
    'division-marketing': 'fn-ecommerce-marketing',
    'division-finance': 'fn-ecommerce-finance',
};
const currentId = (id) => (Object.hasOwn(LEGACY_NODE_IDS, id) ? LEGACY_NODE_IDS[id] : id);

export const isCustom = (n) => typeof n?.id === 'string' && n.id.startsWith(CUSTOM_PREFIX);
export const newCustomId = () => `${CUSTOM_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function parseNotes(notes) {
    try {
        const value = JSON.parse(notes || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
        return {}; // free text an admin typed — left alone until the user saves nodes over it
    }
}

/** The user's saved nodes — [{ id, base, patch }], well-formed ones only (their patch is checked on apply). */
export function customNodesOf(user) {
    const list = parseNotes(user?.notes).nodes;
    if (!Array.isArray(list)) return [];
    const ids = new Set();
    return list.filter((e) => {
        const ok = e && isId(e.id) && !ids.has(e.id) && typeof e.base === 'string' && !isCustom({ id: e.base })
            && e.patch && typeof e.patch === 'object' && !Array.isArray(e.patch);
        if (ok) ids.add(e.id);
        return ok;
    }).slice(0, MAX_NODES).map((e) => ({ ...e, base: currentId(e.base) }));
}

/** What the user turned on / off for themselves: { show, hide } — node or preset ids (checked against the catalogue
 *  where they are used, preset/mount.js). */
export function viewOf(user) {
    const notes = parseNotes(user?.notes);
    const ids = (list) => (Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === 'string' && VIEW_ID.test(id)).map(currentId))].slice(0, MAX_VIEW) : []);
    return { show: ids(notes.show), hide: ids(notes.hide) };
}

/**
 * Writes the user's own nodes — and, when given, their view — into `notes`, keeping its other keys. `mine`: the
 * entries, or { nodes, show?, hide? }. → the updated user.
 */
export function saveCustomNodes(user, mine) {
    const { nodes, show, hide } = Array.isArray(mine) ? { nodes: mine } : mine;
    const notes = { ...parseNotes(user.notes), nodes: nodes.slice(0, MAX_NODES) };
    if (show) notes.show = show.slice(0, MAX_VIEW);
    if (hide) notes.hide = hide.slice(0, MAX_VIEW);
    return saveProfile(user, { notes: JSON.stringify(notes) });
}

/** Group types on the canvas → their titles (a group's title sits on one of its members). */
export function groupsOf(nodes) {
    const groups = new Map();
    for (const n of nodes) {
        const type = n.group?.type;
        if (type && (!groups.has(type) || n.group.title)) groups.set(type, n.group.title || groups.get(type) || type);
    }
    return groups;
}

/**
 * The fields of `node` the builder lets you change, with the values it has: [{ key, type, value, options? }].
 * type: 'text' | 'textarea' | 'number' | 'boolean' | 'position' ('120' or '50%') | 'url' | 'icon' | 'select'.
 */
export function editableFields(node, groups = new Map()) {
    const o = node.overlay ?? {};
    const fields = [
        { key: 'title', type: 'text', value: node.title ?? '' },
        { key: 'tooltip', type: 'text', value: node.tooltip ?? '' },
        { key: 'initials', type: 'text', value: node.initials ?? '', max: 3 },
        { key: 'description', type: 'textarea', value: node.description ?? '' },
        { key: 'icon', type: 'icon', value: node.icon ?? '' },
        { key: 'group', type: 'select', value: node.group?.type ?? '', options: ['', ...groups.keys()] },
        // A grouped node's own x / y mean nothing (its tile places it): blank = the middle, once out of the group.
        { key: 'x', type: 'position', value: node.group ? '' : String(typeof node.x === 'number' ? Math.round(node.x) : node.x ?? '') },
        { key: 'y', type: 'position', value: node.group ? '' : String(typeof node.y === 'number' ? Math.round(node.y) : node.y ?? '') },
        { key: 'moving', type: 'boolean', value: node.moving !== false },
    ];
    if (o.type) fields.push({ key: 'overlay.title', type: 'text', value: o.title ?? '' });
    // A page of this site framed with allow-same-origin acts as this page: only a base that already frames one may.
    if (o.type === 'iframe') fields.push({ key: 'overlay.url', type: 'url', value: o.url ?? '', local: isSameSite(o.url) });
    if (o.type === 'content' && typeof o.content === 'string') fields.push({ key: 'overlay.content', type: 'textarea', value: o.content });
    const locked = new Set([...LOCKED_PROPS, ...(Array.isArray(o.locked) ? o.locked : [])]);
    for (const [key, value] of Object.entries(o.properties ?? {})) {
        if (PAGE_PROPS.has(key) || locked.has(key) || /^on/i.test(key) || /HTML$|^(textContent|innerText|srcdoc)$/.test(key) || !/^[a-z][a-zA-Z0-9]*$/.test(key)) continue;
        const type = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : typeof value === 'string' ? 'text' : null;
        if (type) fields.push({ key: `props.${key}`, type, value });
    }
    return fields;
}

// An http(s) URL as stored: a page of this site by its path (so the row works on any of its hosts), others in full.
const storeUrl = (u) => (isSameSite(u.href) ? `${u.pathname}${u.search}${u.hash}` : u.href);

// One field's value as typed → what may be stored, or undefined (dropped).
function clean(field, raw) {
    switch (field.type) {
        case 'boolean': return Boolean(raw);
        case 'number': {
            const n = Number(raw);
            return raw === '' || !Number.isFinite(n) ? undefined : n;
        }
        case 'position': {
            const s = String(raw ?? '').trim();
            if (/^\d{1,3}(\.\d+)?%$/.test(s) && parseFloat(s) <= 100) return s;
            const n = Number(s);
            return s !== '' && Number.isFinite(n) ? Math.round(n) : undefined;
        }
        case 'url': {
            const u = httpUrl(String(raw ?? ''));
            return !u || (isSameSite(u.href) && !field.local) ? undefined : storeUrl(u);
        }
        case 'icon': {
            const s = String(raw ?? '').trim();
            if (s === '' || isIconName(s)) return s;
            const u = httpUrl(s);
            return u ? storeUrl(u) : undefined;
        }
        case 'select': return typeof raw === 'string' && field.options.includes(raw) ? raw : undefined;
        case 'textarea': return String(raw ?? '').slice(0, MAX_LONG);
        default: return String(raw ?? '').slice(0, field.max ?? MAX_TEXT);
    }
}

/** The form's values → the patch to store: only fields the base has, cleaned, and only where they differ from it. */
export function patchFrom(base, values, groups) {
    const patch = {};
    for (const field of editableFields(base, groups)) {
        if (!(field.key in values)) continue;
        const value = clean(field, values[field.key]);
        if (value !== undefined && value !== clean(field, field.value)) patch[field.key] = value;
    }
    return patch;
}

/** The node an entry makes out of its base. `placed` records where it was put, for applyCustomNodes. */
export function buildCustomNode(entry, base) {
    const p = entry.patch;
    const o = base.overlay;
    const props = Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith('props.')).map(([k, v]) => [k.slice(6), v]));
    const overlay = o && {
        ...o,
        ...('overlay.title' in p && { title: p['overlay.title'] }),
        ...('overlay.url' in p && { url: p['overlay.url'] }),
        ...('overlay.content' in p && { content: p['overlay.content'] }),
        ...(Object.keys(props).length && { properties: { ...o.properties, ...props } }),
    };
    const group = 'group' in p ? (p.group ? { type: p.group } : undefined) : base.group && { type: base.group.type };
    const node = { ...base, id: entry.id, custom: entry.base, overlay, group };
    for (const key of NODE_KEYS) if (key in p) node[key] = p[key];
    // Out of a group, a node needs a place of its own — the middle of the canvas, unless one was typed.
    if (!group && base.group) {
        node.x = p.x ?? '50%';
        node.y = p.y ?? '50%';
    }
    node.placed = `${node.x}|${node.y}`;
    return node;
}

/**
 * The nodes `entries` make. `find(baseId)` → the base's config, or null (not available — a base not loaded yet, a plan
 * that doesn't cover it): that entry is skipped. Every patch goes through the form's checks — the row may hold
 * anything. `taken` — ids already on the canvas; `groups` — the group types a patch may move a copy into; `before` —
 * the copies on the canvas now: one whose place did not change stays where it drifted.
 */
export function buildCustomNodes(entries, { find, taken = new Set(), groups = new Map(), before = new Map() }) {
    const ids = new Set(taken);
    const built = [];
    for (const entry of entries) {
        if (!isId(entry?.id) || ids.has(entry.id) || typeof entry.base !== 'string' || isCustom({ id: entry.base })) continue;
        const base = find(entry.base);
        if (!base) continue;
        ids.add(entry.id);
        const patch = entry.patch && typeof entry.patch === 'object' ? entry.patch : {};
        const node = buildCustomNode({ ...entry, patch: patchFrom(base, patch, groups) }, base);
        const was = before.get(entry.id);
        if (was?.placed === node.placed) Object.assign(node, { x: was.x, y: was.y });
        built.push(node);
    }
    return built;
}

/**
 * Puts `entries` on a canvas without presets, in place of the custom nodes it has — bases from the canvas itself. (A
 * canvas with presets builds them with the rest of its nodes: preset/mount.js.)
 */
export function applyCustomNodes(flow, entries) {
    const own = flow.nodes.filter((n) => !isCustom(n));
    const onCanvas = new Set(own.map((n) => n.id));
    flow.nodes = [...own, ...buildCustomNodes(entries, {
        find: (id) => (onCanvas.has(id) ? flow.configOf?.(id) ?? own.find((n) => n.id === id) : null),
        taken: onCanvas,
        groups: groupsOf(own),
        before: new Map(flow.nodes.filter(isCustom).map((n) => [n.id, n])),
    })];
}
