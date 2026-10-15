// src/packages/node/preset/index.js
//
// Presets — ready-made sets of nodes for a <svc-node> canvas, one file each (account, purchase, sector — one AI-<Sector>
// group per sector —, system, everyday, builder): its nodes, the edges between them, the events they answer, what they load later and what they do
// on sign-in. The canvas mounts them itself:
//
//     <svc-node id="flow" presets></svc-node>          ← preset/config.js: which sets / nodes are on, tiers, settings
//
// or from JS, laid over config.js:  flow.presets = { presets: { ...config.presets, crm: myCrmPreset }, nodes: { tv: false } }
//
// Node Builder offers every node of every listed set — on the canvas or not — to turn on / off for yourself or copy,
// within what your plan covers (config.js `tiers`). This file is the public face: helpers for writing a preset, the
// factories (for their options) and the pieces mount.js is made of.
export * from './shared.js';
export { PRESETS } from './registry.js';
export { mountPresets, changeNode } from './mount.js';
export { plansOf, planOfUser, planLabel } from './tiers.js';
export { pagePrefs } from './page.js';
export { accountPreset } from './account.js';
export { builderPreset } from './builder.js';
export { purchasePreset } from './purchase.js';
export { sectorPreset, sectorPresetId, secretaryNodeId, consultNodeId, fnNodeId } from './sector.js';
export { systemPreset, SYSTEM_TABLES, tableNode, rolesNode, financeNode } from './system.js';
export { everydayPreset, everydayNodes } from './everyday.js';
export { default as PRESET_CONFIG } from './config.js';
