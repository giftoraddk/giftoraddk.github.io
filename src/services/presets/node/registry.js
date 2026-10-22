// src/services/presets/node/registry.js
//
// Preset ids → their factory (call one yourself for its options, e.g. systemPreset({ tables })). services/presets/node/config.js turns
// them on / off by these ids.
import { accountPreset } from './account.js';
import { builderPreset } from './builder.js';
import { purchasePreset } from './purchase.js';
import { sectorPreset, sectorPresetId } from './sector.js';
import { SECTOR_FACES } from '@/packages/llm/tool/sectors.js';
import { systemPreset } from './system.js';
import { everydayPreset } from './everyday.js';

// One AI-<Sector> group per sector (llm/tool/sectors.js) — `ai-ecommerce`, `ai-education`, … — options pass through.
const SECTOR_PRESETS = Object.fromEntries(SECTOR_FACES.map(({ id }) => [sectorPresetId(id), (o = {}) => sectorPreset({ ...o, sector: id })]));

export const PRESETS = {
    account: accountPreset,
    purchase: purchasePreset,
    ...SECTOR_PRESETS,
    system: systemPreset,
    everyday: everydayPreset,
    builder: builderPreset,
};
