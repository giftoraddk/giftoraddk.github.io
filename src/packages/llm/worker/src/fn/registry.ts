import { FUNCTIONS, isSystemFn, type BusinessFn, type FnKey, type FnSpec, type Label, type Lens, type Rec, type SectorAdapter } from './types.ts';
import { mergeSpec } from './merge.ts';
import { BASE } from './base/index.ts';
import { SECTORS } from './sectors/index.ts';

/** Division ids from before sectors existed — all were e-commerce. */
export const LEGACY: Record<string, string> = {
  production: 'ecommerce.product', marketing: 'ecommerce.marketing', finance: 'ecommerce.finance',
  sale: 'ecommerce.consult', aide: 'ecommerce.consult',
};

export const sectorOf = (id: string): SectorAdapter | null => SECTORS.find(s => s.id === id) ?? null;

const offered = (s: SectorAdapter) => (Object.keys(BASE) as FnKey[]).filter(fn => s.functions[fn] !== false);

/** `<sector>.<fn>` (or a legacy id) → its parts, when that sector offers that function — same "offered" rule as
 *  sectorFaces (Object.hasOwn(BASE, fn) && functions[fn] !== false: a sector that doesn't patch a function still
 *  offers it unchanged, so checking Object.hasOwn(adapter.functions, fn) instead would wrongly reject it).
 *  Object.hasOwn(LEGACY, id) guards against an id like 'constructor'/'__proto__' resolving to an inherited
 *  Object.prototype member instead of undefined. */
export function parseDivisionId(id: string): { sector: string; fn: FnKey } | null {
  const [sector, fn] = (Object.hasOwn(LEGACY, id) ? LEGACY[id] : id).split('.');
  const adapter = sectorOf(sector);
  if (!adapter || !Object.hasOwn(BASE, fn) || adapter.functions[fn as FnKey] === false) return null;
  return { sector, fn: fn as FnKey };
}

export interface KnowScope { sector: string; fn: string }

/**
 * A knowledge scope from untrusted input (search, import, MCP, CSV): '' = every sector / every department, else a known
 * sector and a department (or the consult chat) that sector offers — never a system step; a function alone = that
 * department in every sector. null = invalid — the caller answers 400 rather than widening it to '': a mistyped
 * fn: 'finanse' must never turn finance-only rows into rows every department (and the guest consult) can read.
 */
export function parseKnowScope(sector: unknown, fn: unknown): KnowScope | null {
  const s = sector == null ? '' : sector;
  const f = fn == null ? '' : fn;
  if (typeof s !== 'string' || typeof f !== 'string') return null;
  if (s && !sectorOf(s)) return null;
  if (f && (!Object.hasOwn(BASE, f) || isSystemFn(f) || (s && sectorOf(s)!.functions[f as FnKey] === false))) return null;
  return { sector: s, fn: f };
}

/** BASE[fn] ⊕ sector patch ⊕ overrides (platform row, then the owner's row) — plan §3. */
export function resolveSpec(sector: string, fn: FnKey, ...overrides: (Rec | null | undefined)[]): FnSpec | null {
  const adapter = sectorOf(sector);
  const base = Object.hasOwn(BASE, fn) ? BASE[fn] : undefined;
  if (!adapter || !base || adapter.functions[fn] === false) return null;
  return mergeSpec(base, adapter.functions[fn] || null, ...overrides);
}

const isBusinessFn = (fn: string): fn is BusinessFn => (FUNCTIONS as readonly string[]).includes(fn);

/** {coreFunctions} = the sector's core departments (the secretary's routing step weighs them first). */
export function promptVars(sector: string): Record<string, string> {
  const adapter = sectorOf(sector);
  return adapter ? { ...adapter.vars, sectorName: adapter.name.en, coreFunctions: adapter.core.join(', ') } : {};
}

/** A department's specialist identity in this sector — null for a system step / chat. */
export function lensOf(sector: string, fn: string): Lens | null {
  const adapter = sectorOf(sector);
  return adapter && isBusinessFn(fn) ? adapter.lenses[fn] : null;
}

/** The sector's core departments — the routing floor (routing.ts normalizeRouting). */
export const coreOf = (sector: string): BusinessFn[] => sectorOf(sector)?.core ?? [];

/** Who must sign off this department's result before it is approved here — null = the boss approves alone. */
export function reviewOf(sector: string, fn: string): Label | null {
  const review = sectorOf(sector)?.review;
  return review && isBusinessFn(fn) && review.fns.includes(fn) ? review.who : null;
}

/** GET /v1/fn/sectors — what a node group shows; no method text. `system` = the secretary + integration (P3-2). */
export function sectorFaces() {
  const face = (s: SectorAdapter, fn: FnKey) => {
    const spec = resolveSpec(s.id, fn)!;
    return { id: `${s.id}.${fn}`, fn, kind: spec.kind, title: spec.title, description: spec.description };
  };
  return SECTORS.map(s => ({
    id: s.id, title: s.title, name: s.name, icon: s.icon, tints: s.tints ?? [], released: s.released,
    functions: offered(s).filter(fn => !isSystemFn(fn)).map(fn => face(s, fn)),
    system: offered(s).filter(isSystemFn).map(fn => face(s, fn)),
  }));
}
