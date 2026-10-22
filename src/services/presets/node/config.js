// src/services/presets/node/config.js
//
// What <svc-node presets> starts with, and what each user may add in Node Builder. The one place to change it.
//
//   presets — the sets, in the order they go on (services/presets/node/*.js; services/presets/node/registry.js has the ids):
//               true            on at the start
//               false           off at the start — still in Node Builder for a user to turn on
//               { …options }    on, with its factory's options (e.g. everyday: { x: 900, y: 500 })
//             A preset object of your own (see NodePreset in preset/mount.js) goes in the same way. A set left out of
//             this list isn't offered at all.
//   nodes   — one node by id: false = off at the start (still in Node Builder), { on: true } = on even though its set
//             is off, { … } = changed (merged in — `overlay` / `overlay.properties` too), a function = replaced.
//   tiers   — who may use what, by plan, cheapest first: 'free' (no active plan, or signed out), then the plan ids of
//             purchase/tool/plans.js. Each lists preset ids, node ids or 'prefix*'; '*' = everything. A node outside a
//             user's tier stays behind a "needs Pro" notice (Node Builder: a PRO badge, can't be added). Super Admin, and
//             anyone a node's own staff role lets in, skip tiers. It's packaging, not a security line — the Workers check
//             every call. `tiers: null` = no plans at all.
//   locked  — what a user sees of a node their plan doesn't cover: 'show' (the notice / badge) or 'hide' (nowhere).
//   canvas  — <svc-node> properties (`ask` = the command bar inside the canvas).
//   trace   — event names logged to the console (services/node/node-events.js).
// Theme / lang come from the cookies (the account panel sets them) — `theme` / `lang` here would fix them instead.
// A page with a canvas of its own lays its config over this one (svc-node `presets` = an object, key by key) — e.g.
// config-sector.js for pages/system/[sector].astro.

export default {
    presets: {
        account: true,
        purchase: true,
        // One group per sector, all on the canvas. A sector not released yet (worker fn/sectors/<id>.ts + llm/tool/
        // sectors.js `released: false`) shows its whole group, but every node in it opens to staff only (the panel says
        // why) — the Worker refuses everyone else anyway. Turn one off here to keep it out of the canvas.
        'ai-ecommerce': true,
        'ai-education': true,
        'ai-fnb': true,
        'ai-healthcare': true,
        'ai-realestate': true,
        system: true,
        everyday: true,
        builder: true,
    },

    nodes: {
        // tv: false,                      // TVmaze off at the start — a user can still turn it on in Node Builder
        // cars: { x: 200, y: 120 },
    },

    // = purchase/tool/plans.js `grants`: Starter is svc-aide (each sector's Consult — the plan adds the user's own
    // knowledge base, MCP and embedding behind it); the Secretary and the departments are Pro (the Worker answers 402
    // without it — llm fn/owner.ts). Free gets the Consult chat on the platform's knowledge.
    tiers: {
        free: ['account', 'builder', 'purchase', 'system', 'everyday', 'consult-*'],
        starter: ['account', 'builder', 'purchase', 'system', 'everyday', 'consult-*'],
        pro: '*', // everything, whatever comes next
    },

    locked: 'show',

    canvas: {
        ask: true, // <svc-ask> inside the canvas, pinned to its bottom center
        askTints: 'primary success',
        popoverConcurrency: 3,
        linkDuration: 2400, // links stay hidden until link() / runFlow() lights them
        flowHold: 800,
    },

    trace: ['node-click', 'nodes-change', 'groups-change', 'connection-created', 'flow-step', 'flow-end', 'plan-select', 'purchase-complete'],
};
