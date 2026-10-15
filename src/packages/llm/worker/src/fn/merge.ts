import type { FnSpec, Rec } from './types.ts';

const isObj = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const isKeyedList = (v: unknown): v is Rec[] => Array.isArray(v) && v.length > 0 && v.every(x => isObj(x) && typeof x.key === 'string');

function withoutRemove(item: Rec): Rec {
  const { remove: _drop, ...rest } = item;
  return rest;
}

function mergeKeyed(base: Rec[], patch: Rec[]): Rec[] {
  const out = [...base];
  for (const p of patch) {
    const i = out.findIndex(b => b.key === p.key);
    if (p.remove) {
      if (i !== -1) out.splice(i, 1);
      continue;
    }
    if (i === -1) out.push(withoutRemove(p));
    else out[i] = mergeValue(out[i], withoutRemove(p)) as Rec;
  }
  return out;
}

/**
 * Deep merge for specs: objects merge key by key, lists of `{ key }` items merge by key (`remove: true` drops one,
 * a new key is appended), anything else — scalars, plain arrays — replaces. Never mutates its inputs.
 */
export function mergeValue(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base;
  if (isKeyedList(patch) && Array.isArray(base) && (base.length === 0 || isKeyedList(base))) return mergeKeyed(base, patch);
  if (isObj(patch) && isObj(base)) {
    const out: Rec = { ...base };
    for (const [k, v] of Object.entries(patch)) out[k] = mergeValue(base[k], v);
    return out;
  }
  return patch;
}

/** Base spec ⊕ sector patch ⊕ platform override ⊕ owner override — see plan §3. */
export function mergeSpec(base: FnSpec, ...patches: (Rec | null | undefined)[]): FnSpec {
  return patches.reduce<unknown>((acc, p) => (p ? mergeValue(acc, p) : acc), base) as FnSpec;
}
