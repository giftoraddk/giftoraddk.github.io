// src/packages/node/preset/mount.js
//
// <svc-node presets> — what the canvas runs on once it asks for presets (svc-node loads this and preset/config.js on
// demand). mountPresets(flow, config) builds:
//   · the catalogue — every node of every preset the config lists, on or off at the start (Node Builder offers them
//     all), each tagged with its `preset` and the `plans` that cover it (preset/tiers.js);
//   · the canvas — the catalogue as this user sees it: on by default (config), then what the user turned on / off
//     for themselves (profiles.notes `show` / `hide`), then their own copies (`nodes`) — service/custom-nodes.js —
//     every { vi, en } text in the page's language (tool/lingo.js), re-said in place on 'lang-change';
//   · the page around it — panel props (theme / lang, which the canvas's own <svc-ask> reads too), canvas settings;
//   · events — every preset's handlers on one router (a copy answers like its base), plus theme / lang / sign-in;
//   · the session — `userRoles` from the profile, `userPlan` from billing.
// → the controller (svc-node `presetsReady`): Node Builder reads the catalogue from it and hands it what it saved.
import { createNodeEvents, ANY } from '@/services/node/node-events.js';
import { auth } from '@/packages/auth/service/service.js';
import { fetchProfile, saveProfile } from '@/packages/auth/service/profile.js';
import { parseRoles } from '@/packages/auth/tool/roles.js';
import { PRESETS } from './registry.js';
import { pagePrefs } from './page.js';
import { plansOf, planOfUser, planLabel } from './tiers.js';
import { nodeAccess } from '../tool/access.js';
import { buildCustomNodes, customNodesOf, groupsOf, isCustom, viewOf } from '../service/custom-nodes.js';
import { lingo, localizeNode } from '../tool/lingo.js';

/**
 * @typedef {Object} PresetContext
 * @property {HTMLElement & Record<string, any>} flow - the <svc-node>
 * @property {object | null} user - the signed-in user (null = signed out)
 * @property {string} lang - the page's language now ('vi' | 'en') — for text a preset writes onto a node at runtime
 * @property {(nodes: object[]) => void} addNodes - more nodes of this preset, later (divisions) — ids already known are skipped
 *
 * @typedef {Object} NodePreset
 * @property {string} id
 * @property {{ vi: string, en: string }} [title] - its section in Node Builder
 * @property {string} [icon]
 * @property {boolean} [pinned] - a user can't take its nodes off their canvas (account, builder)
 * @property {(ctx: PresetContext) => object[]} nodes
 * @property {(ctx: PresetContext) => object[]} [edges]
 * @property {(ctx: PresetContext) => Record<string, (e: any) => void>} [events] - '<nodeId>:<event-name>' → handler
 * @property {(ctx: PresetContext) => void} [setup] - once, after the first canvas (load more with ctx.addNodes)
 * @property {(user: object | null, ctx: PresetContext, info: { changed: boolean }) => void} [onUser] - sign-in, sign-out,
 *   a new profile row; `changed` = another user, or the Worker's fresh row (not a panel's echo of the one it had)
 * @property {(ctx: PresetContext) => void} [onNodes] - after ctx.addNodes()
 */

/** A node changed by `how`: a function returns the new one, an object merges in (overlay and its properties merge
 *  too, so `{ overlay: { title } }` keeps the rest). */
export function changeNode(node, how) {
    if (!how || how === true) return node;
    if (typeof how === 'function') return how(node) || node;
    const o = node.overlay;
    const overlay = how.overlay && o
        ? { ...o, ...how.overlay, ...((o.properties || how.overlay.properties) && { properties: { ...o.properties, ...how.overlay.properties } }) }
        : how.overlay ?? o;
    return { ...node, ...how, overlay };
}

// config.presets → [{ preset, on }] in their order: true / false / { options } for a known id, or a NodePreset object.
function resolvePresets(list = {}) {
    const out = [];
    for (const [id, value] of Object.entries(list)) {
        if (value && typeof value === 'object' && typeof value.nodes === 'function') {
            out.push({ preset: { ...value, id: value.id ?? id }, on: value.on !== false });
            continue;
        }
        const factory = PRESETS[id];
        if (!factory) {
            console.warn(`[node/preset] no preset "${id}" — known: ${Object.keys(PRESETS).join(', ')}`);
            continue;
        }
        const options = value && typeof value === 'object' ? value : {};
        out.push({ preset: factory(options), on: value !== false && options.on !== false });
    }
    return out;
}

// config.nodes[id] → { on?: boolean, how?: change }
function nodeSetting(value) {
    if (value === false) return { on: false };
    if (typeof value === 'function') return { how: value };
    if (!value || typeof value !== 'object') return {};
    const { on, ...how } = value;
    return { on: typeof on === 'boolean' ? on : undefined, how: Object.keys(how).length ? how : undefined };
}

/**
 * @param {HTMLElement & Record<string, any>} flow - the <svc-node>
 * @param {Object} config - preset/config.js (svc-node lays its `presets` object over it)
 */
export function mountPresets(flow, config = {}) {
    const cfg = { presets: {}, nodes: {}, tiers: null, locked: 'show', canvas: {}, edges: [], events: {}, trace: [], ...config };

    // ── The page ────────────────────────────────────────────────────────────
    const prefs = pagePrefs(cfg); // the CSS vars live on <html> (svc-node already ran this once)
    let lang = prefs.lang; // the language every node's { vi, en } text is said in
    let shownLang; // the one the canvas shows now — undefined until the first render
    let ready = false;
    Object.assign(flow, cfg.canvas);

    // ── Reveal — a signed-in user's canvas shows once, already theirs (own nodes, show / hide, zoom, drift), instead
    // of the defaults first and then a jump. Held until the session answers — and, for a user, until the Worker's
    // fresh row is in or FRESH_WAIT_MS passes (the row still lands after); never longer than REVEAL_MAX_MS.
    const FRESH_WAIT_MS = 600;
    const REVEAL_MAX_MS = 1500;
    let revealed = false;
    flow.pending = true;
    const reveal = () => {
        if (revealed) return;
        revealed = true;
        clearTimeout(revealCap);
        // After the canvas has painted what it was just given — the fade shows the final state, not the switch.
        flow.updateComplete.then(() => requestAnimationFrame(() => { flow.pending = false; }));
    };
    const revealCap = setTimeout(reveal, REVEAL_MAX_MS);
    const setPage = (props) => {
        flow.panelProps = { ...flow.panelProps, ...props };
        if (!props.lang) return;
        flow.lang = props.lang; // the panel chrome's own words (a gated panel's notice, the command bar)
        lang = props.lang;
        if (ready) render(); // the nodes' own words too — in place
    };
    setPage({ theme: prefs.theme, lang });

    // ── The catalogue ───────────────────────────────────────────────────────
    const presets = resolvePresets(cfg.presets);
    const ctx = { flow, user: null, get lang() { return lang; } };
    const catalogue = new Map(); // node id → { node, set, byDefault }
    const anchors = new Map(); // group type → { x, y, title, tints } of the member that places its tile

    const take = (set, list, later) => {
        for (const raw of list ?? []) {
            if (!raw?.id) continue;
            if (catalogue.has(raw.id)) {
                if (!later) console.warn(`[node/preset] two nodes "${raw.id}" — the second one is skipped`);
                continue;
            }
            const { on, how } = nodeSetting(cfg.nodes[raw.id]);
            const node = changeNode({ ...raw, preset: set.preset.id }, how);
            const plans = node.plans ?? plansOf(node, cfg.tiers); // a node's own `plans` (config.nodes) beats the tiers
            if (plans) node.plans = plans;
            else delete node.plans;
            catalogue.set(node.id, { node, set, byDefault: on ?? set.on });
            const g = node.group;
            if (g?.type && g.title && !anchors.has(g.type)) anchors.set(g.type, { x: node.x, y: node.y, title: g.title, tints: g.tints });
        }
    };
    const ctxOf = (set) => set.ctx ??= Object.create(ctx, { addNodes: { value: (list) => {
        take(set, list, true);
        render();
        for (const s of presets) s.preset.onNodes?.(ctxOf(s));
    } } });
    for (const set of presets) take(set, set.preset.nodes(ctxOf(set)), false);

    // ── What this user sees ─────────────────────────────────────────────────
    let entries = []; // their own copies
    let view = { show: new Set(), hide: new Set() }; // nodes / sets they turned on or off

    const locked = (rec) => nodeAccess(rec.node, flow.userRoles, flow.userPlan) === 'plan';
    const hidden = (rec) => cfg.locked === 'hide' && locked(rec);
    // The user's word on a node beats their word on its set, which beats the config.
    const visible = (rec, v = view, withNode = true) => {
        const { node, set } = rec;
        if (withNode && v.show.has(node.id)) return true;
        if (withNode && v.hide.has(node.id) && !set.preset.pinned) return false;
        if (v.show.has(set.preset.id)) return true;
        if (v.hide.has(set.preset.id) && !set.preset.pinned) return false;
        return rec.byDefault;
    };

    // A group whose own first member is off: the first one on takes its tile's place and title. The title follows the
    // language (the one borrowed from the anchor too); a member's own title is localizeNode's.
    const anchorGroups = (nodes) => {
        const seen = new Set();
        return nodes.map((n) => {
            const type = n.group?.type;
            if (!type || seen.has(type)) return n;
            seen.add(type);
            const a = anchors.get(type);
            if (!a || catalogue.get(n.id)?.node.group?.title || (!catalogue.has(n.id) && !isCustom(n))) return n;
            const title = lingo(a.title, lang);
            if (n.group.title === title) return n;
            return { ...n, ...(!n.group.title && { x: a.x, y: a.y }), group: { ...n.group, title, tints: a.tints } };
        });
    };

    const said = (node, l = lang) => localizeNode(node, l); // a catalogue node as the page's language says it

    function render() {
        const live = new Map(flow.nodes.map((n) => [n.id, n]));
        const own = [];
        for (const rec of catalogue.values()) {
            if (!visible(rec) || hidden(rec)) continue;
            const was = live.get(rec.node.id);
            // The live one keeps where it drifted and what changed it — only its config words switch language.
            own.push(was && !isCustom(was) ? localizeNode(was, lang, { raw: rec.node, prev: shownLang ?? lang }) : said(rec.node));
        }
        for (const n of flow.nodes) if (!catalogue.has(n.id) && !isCustom(n)) own.push(n); // put on by the page itself
        const onCanvas = new Set(own.map((n) => n.id));
        const copies = buildCustomNodes(entries, {
            // From its preset config, where it has one — on the canvas or not — unless this user may not see it.
            find: (id) => {
                const rec = catalogue.get(id);
                if (rec) return hidden(rec) ? null : said(rec.node);
                return onCanvas.has(id) ? flow.configOf?.(id) ?? null : null;
            },
            taken: new Set([...onCanvas, ...catalogue.keys()]),
            groups: groupsOf([...catalogue.values()].map((r) => said(r.node)).concat(own)),
            before: new Map(flow.nodes.filter(isCustom).map((n) => [n.id, n])),
        });
        flow.nodes = anchorGroups([...own, ...copies]);
        shownLang = lang;
    }

    render();
    ready = true;
    flow.edges = [...presets.flatMap((s) => s.preset.edges?.(ctxOf(s)) ?? []), ...cfg.edges];

    // ── Events ──────────────────────────────────────────────────────────────
    const router = createNodeEvents(flow, {}, {
        trace: cfg.trace,
        alias: (id) => flow.nodes.find((n) => n.id === id)?.custom, // a copy answers like the node it was made from
    });
    const has = (id) => flow.nodes.some((n) => n.id === id);
    const core = {
        // <svc-account> already applied it to <html> + cookie.
        [`${ANY}:theme-change`]: ({ detail }) => setPage({ theme: detail.theme }),
        [`${ANY}:lang-change`]: ({ detail }) => setPage({ lang: detail.lang }),
        'account:account-change': ({ detail }) => onUser(detail.user), // <svc-account> in the account node
        // A sign-in in any other panel (the checkout's own form…) is the canvas's session too — roles, plan, copies.
        [`${ANY}:login-success`]: ({ detail }) => { if (detail?.profile) onUser(detail.profile); },
        // A gated panel's button: a plan → the plans, else sign-in / the account.
        [`${ANY}:node-access`]: ({ detail }) => {
            const to = detail?.reason === 'plan' && has('plans') ? 'plans' : 'account';
            if (has(to)) flow.openPopover(to);
        },
    };
    for (const map of [...presets.map((s) => s.preset.events?.(ctxOf(s)) ?? {}), core, cfg.events]) {
        for (const [key, handler] of Object.entries(map)) router.on(key, handler);
    }

    for (const set of presets) set.preset.setup?.(ctxOf(set));

    // ── The session ─────────────────────────────────────────────────────────
    let userId; // the user onUser() last saw — undefined until the session answers
    let planSeq = 0;
    async function refreshPlan() {
        const seq = ++planSeq;
        const plan = await planOfUser(ctx.user, cfg.tiers);
        if (seq !== planSeq || flow.userPlan === plan) return;
        flow.userPlan = plan;
        if (cfg.locked === 'hide') render();
    }
    // ── Canvas prefs — profiles.meta.zoom / meta.moving: the zoom and the drift a user left the canvas at ──────
    // Saved (debounced) on 'viewport-change' (zoom buttons, Ctrl/⌘ + wheel) and 'animation-change' (the moving switch),
    // put back on sign-in and on the Worker's fresh row — unless the user already zoomed / switched since. `meta` is one
    // jsonb column replaced whole on save, so the row is re-read first and only these two keys change (svc-profile
    // writes meta.devices / meta.settings the same way).
    const PREFS_MS = 800;
    let prefsTimer = 0;
    let prefsTouched = false;
    let restoring = false;
    function applyPrefs(user) {
        const meta = user?.meta ?? {};
        if (prefsTouched) return;
        restoring = true;
        try {
            if (typeof meta.moving === 'boolean') flow.animation = meta.moving;
            if (Number.isFinite(meta.zoom) && flow.zoomable !== false) flow.zoomTo?.(meta.zoom);
        } finally {
            restoring = false;
        }
    }
    function savePrefs() {
        if (restoring || !ctx.user) return;
        prefsTouched = true;
        clearTimeout(prefsTimer);
        prefsTimer = setTimeout(async () => {
            const user = ctx.user;
            if (!user) return;
            const zoom = Math.round((flow.zoom ?? 1) * 100) / 100;
            const moving = Boolean(flow.animation);
            if (user.meta?.zoom === zoom && user.meta?.moving === moving) return;
            try {
                const latest = await fetchProfile(user).catch(() => user);
                const saved = await saveProfile(latest, { meta: { ...(latest.meta ?? {}), zoom, moving } });
                if (ctx.user?.id === saved.id) ctx.user = saved;
            } catch (err) {
                console.error('[node/preset] canvas prefs:', err);
            }
        }, PREFS_MS);
    }
    flow.addEventListener('viewport-change', savePrefs);
    flow.addEventListener('animation-change', savePrefs);

    function onUser(user, fresh = false) {
        const id = user?.id ?? null;
        const changed = fresh || id !== userId;
        if (id !== userId) prefsTouched = false; // another account — its own zoom / moving
        userId = id;
        ctx.user = user ?? null;
        flow.userRoles = user?.status === 'active' ? parseRoles(user).roles : null;
        if (changed) {
            entries = customNodesOf(user);
            const v = viewOf(user);
            view = { show: new Set(v.show), hide: new Set(v.hide) };
            applyPrefs(user);
        }
        render();
        for (const set of presets) set.preset.onUser?.(ctx.user, ctxOf(set), { changed });
        if (changed) refreshPlan();
    }
    auth.get().then(async (user) => {
        onUser(user);
        if (!user) return reveal(); // a visitor: nothing of theirs to wait for
        const fresh = fetchProfile(user).catch(() => user).then((u) => onUser(u, true));
        await Promise.race([fresh, new Promise((r) => setTimeout(r, FRESH_WAIT_MS))]);
        reveal();
        await fresh;
    }).catch((err) => {
        console.error('[node/preset] session:', err);
        reveal();
    });
    globalThis.addEventListener?.('subscription-change', refreshPlan); // bought / cancelled in the checkout panel

    // ── The controller ──────────────────────────────────────────────────────
    const titleOf = (set, l) => set.preset.title?.[l] ?? set.preset.title?.vi ?? set.preset.id;
    return {
        config: cfg,
        ctx,
        events: router,

        /** Every set with its nodes, as this user sees them — Node Builder's list. */
        catalogue(l = flow.lang) {
            return presets.map((set) => ({
                id: set.preset.id,
                title: titleOf(set, l),
                icon: set.preset.icon ?? '',
                pinned: Boolean(set.preset.pinned),
                nodes: [...catalogue.values()].filter((rec) => rec.set === set && !hidden(rec)).map((rec) => ({
                    node: said(rec.node, l),
                    on: visible(rec),
                    byDefault: rec.byDefault,
                    locked: locked(rec),
                    plan: rec.node.plans?.[0] ?? null, // the cheapest that covers it
                })),
            })).filter((s) => s.nodes.length);
        },

        /** A catalogue node's config (the base of a copy), whether it is on the canvas or not — in the page's language. */
        nodeOf: (id) => {
            const rec = catalogue.get(id);
            return rec ? said(rec.node) : null;
        },

        /** Whether this user may use the node (its plan) — Node Builder won't add one they can't. */
        canUse: (id) => {
            const rec = catalogue.get(id);
            return rec ? !locked(rec) : true;
        },

        planLabel: (id, l = flow.lang) => planLabel(id, l),

        /** The user's view with node / set `id` turned on or off → { show, hide } to save; null = not allowed (pinned). */
        toggled(id, on) {
            const show = new Set(view.show);
            const hide = new Set(view.hide);
            const set = presets.find((s) => s.preset.id === id);
            if (set) {
                if (!on && set.preset.pinned) return null;
                for (const rec of catalogue.values()) if (rec.set === set) { show.delete(rec.node.id); hide.delete(rec.node.id); }
                show.delete(id);
                hide.delete(id);
                if ([...catalogue.values()].some((rec) => rec.set === set && rec.byDefault !== on)) (on ? show : hide).add(id);
            } else {
                const rec = catalogue.get(id);
                if (!rec || (!on && rec.set.preset.pinned)) return null;
                show.delete(id);
                hide.delete(id);
                if (visible(rec, { show, hide }, false) !== on) (on ? show : hide).add(id);
            }
            return { show: [...show], hide: [...hide] };
        },

        /** What Node Builder saved — the user's copies and / or view — onto the canvas. */
        apply({ nodes, show, hide } = {}) {
            if (Array.isArray(nodes)) entries = nodes;
            if (Array.isArray(show)) view.show = new Set(show);
            if (Array.isArray(hide)) view.hide = new Set(hide);
            render();
        },

        refreshPlan,
    };
}
