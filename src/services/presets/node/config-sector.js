// src/services/presets/node/config-sector.js
//
// What <svc-node> on /system/<sector> starts with (pages/system/[sector].astro — one page per sector of
// llm/tool/sectors.js) — laid over services/presets/node/config.js by the page (svc-node `presets`), so only what differs is here;
// tiers, locked and trace come from config.js, and so does the canvas (its <svc-ask> command bar) with two switches
// added below.
//
//   · AI-<Sector> as free-standing nodes (sector.js `layout: 'arc'`): the departments on a U fitted to the screen, a
//     little below its middle, the Secretary at the U's centre, Consult above it — each its own AI, each opened and
//     talked to on its own.
//   · Trial (sector.js `trial`): every AI node opens to any signed-in account — released or not, with or without a
//     plan — so a customer can try the whole sector here. The tiers below open the Secretary and the departments to
//     every plan; the Worker (llm fn/trial.ts) is what holds the line: one team task + one job per department
//     per account and sector, 30 messages, no regenerate. A Pro hub on a released sector still gets its full use.
//   · The account (pinned in its corner — departments run for a signed-in user) and paying as three small nodes
//     (purchase.js `grouped: false`): PL plans → PY checkout, and PM the plan manager. Beyond the trial below,
//     departments need an active plan; Consult is free.
//   · Moving: Consult, PL, PY and PM keep drifting across the canvas (`moving: 'always'` — opening or dragging one only
//     pauses it; it drifts on once its panel is closed). The Secretary and its U stay put, so the relay's links
//     read clearly.
//   · A panel the app opens itself (a command, the checkout after a plan, sign-in) brings its node to the centre near
//     the top first (svc-node `focusOpen`, `focusAt: 'top'`) and opens there; closing it sends the node home.
//   · <svc-ask> talks to every AI node (`chat`): a question goes to Consult, one focused task to its department, and a
//     command to do the whole job or make a plan to the Secretary — which routes it, and the links show it reaching
//     each department as that department starts work (sector-relay.js).
import config from './config.js';
import { sectorPresetId, consultNodeId } from './sector.js';

/** The page config for `sector` (an id of llm/tool/sectors.js SECTOR_FACES — sector.js throws on any other). */
export function sectorPageConfig(sector) {
    return {
        presets: {
            account: true,
            purchase: { grouped: false, plans: { x: 1250, y: 150 }, checkout: { x: 1250, y: 330 }, manager: { x: 1250, y: 510 } }, // right of the U — they drift from there
            [sectorPresetId(sector)]: { layout: 'arc', trial: true },
        },

        nodes: {
            [consultNodeId(sector)]: { moving: 'always' }, // the arc pins it — here it drifts like the paying nodes
            plans: { moving: 'always' },
            checkout: { moving: 'always' },
            manager: { moving: 'always' },
        },

        canvas: { ...config.canvas, focusOpen: true, focusAt: 'top' },

        // config.js tiers + the trial nodes on every plan (svc-node lays this object over config.js, key by key).
        tiers: Object.fromEntries(Object.entries(config.tiers).map(([plan, list]) => [plan, list === '*' ? list : [...list, 'secretary-*', 'fn-*']])),
    };
}
