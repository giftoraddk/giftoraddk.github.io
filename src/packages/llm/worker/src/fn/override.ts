import type { CallSpec, FieldSpec, FnSpec, Rec, StepSpec } from './types.ts';
import { mergeSpec } from './merge.ts';
import { callsOf, orderCallWaves } from './state.ts';

/**
 * What an admin may change in a department through POST /v1/fn/override. Code owns output (where approved content
 * is written), inputs/needs/produces, kind and the html flag (which fields get sanitized) — never overridable.
 * Steps can be tuned or removed, not invented; the merged result must still order into waves.
 */
export const OVERRIDE_MAX = 64_000;
const KEY = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const RESERVED_FIELDS = new Set(['pics', 'imagePrompt']);
const ALLOWED = {
  top: new Set(['title', 'description', 'role', 'principles', 'steps']),
  step: new Set(['key', 'vi', 'en', 'role', 'task', 'calls', 'remove']),
  call: new Set(['key', 'vi', 'en', 'role', 'task', 'maxTokens', 'temperature', 'contextKeys', 'dependsOn', 'fields', 'remove']),
  field: new Set(['key', 'vi', 'en', 'desc', 'max', 'remove']),
};
const FACE_TEXT: Record<string, number> = { title: 200, description: 1000, pics: 2000 };

const isObj = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const strList = (v: unknown, n: number, max: number) => Array.isArray(v) && v.length <= n && v.every(x => str(x, max));
const intIn = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

function unknownKey(obj: Rec, allowed: Set<string>, where: string): string | null {
  const bad = Object.keys(obj).find(k => !allowed.has(k));
  return bad ? `${where}: "${bad}" cannot be overridden` : null;
}

function checkLabel(v: unknown, max: number, where: string): string | null {
  if (v === undefined) return null;
  if (!isObj(v) || Object.keys(v).some(k => k !== 'vi' && k !== 'en') || !Object.values(v).every(x => str(x, max))) return `${where} must be { vi, en } text`;
  return null;
}

// vi/en labels, role/task text and `remove: true` are shared by steps and calls.
function checkCommon(o: Rec, where: string): string | null {
  if (o.remove !== undefined && o.remove !== true) return `${where}.remove must be true`;
  for (const k of ['vi', 'en']) if (o[k] !== undefined && !str(o[k], 200)) return `${where}.${k} too long`;
  for (const k of ['role', 'task']) if (o[k] !== undefined && !str(o[k], 4000)) return `${where}.${k} must be text up to 4000 characters`;
  return null;
}

function checkField(f: unknown, where: string, knownField?: FieldSpec): string | null {
  if (!isObj(f) || typeof f.key !== 'string' || !KEY.test(f.key)) return `${where}: every field needs a key`;
  if (RESERVED_FIELDS.has(f.key)) return `${where}: "${f.key}" is reserved`;
  const bad = unknownKey(f, ALLOWED.field, where);
  if (bad) return bad;
  if (f.remove !== undefined && f.remove !== true) return `${where}.remove must be true`;
  // html is code-owned (never a settable override key above) — the only way to lose it would be removing the field outright.
  if (f.remove === true && knownField?.html) return `${where}: "${f.key}" is an HTML field and cannot be removed`;
  for (const k of ['vi', 'en']) if (f[k] !== undefined && !str(f[k], 200)) return `${where}.${k} too long`;
  if (f.desc !== undefined && !str(f.desc, 2000)) return `${where}.desc must be text up to 2000 characters`;
  if (f.max !== undefined && !intIn(f.max, 1, 20_000)) return `${where}.max must be 1..20000`;
  return null;
}

function checkCall(c: unknown, where: string, knownCall?: CallSpec): string | null {
  if (!isObj(c) || typeof c.key !== 'string' || !KEY.test(c.key)) return `${where}: every call needs a key`;
  const bad = unknownKey(c, ALLOWED.call, where) ?? checkCommon(c, where);
  if (bad) return bad;
  if (c.maxTokens !== undefined && !intIn(c.maxTokens, 1, 4096)) return `${where}.maxTokens must be 1..4096`;
  if (c.temperature !== undefined && !(typeof c.temperature === 'number' && c.temperature >= 0 && c.temperature <= 1.5)) return `${where}.temperature must be 0..1.5`;
  for (const k of ['contextKeys', 'dependsOn']) if (c[k] !== undefined && !strList(c[k], 30, 64)) return `${where}.${k} must be a list of keys`;
  if (c.fields === undefined) return null;
  if (!Array.isArray(c.fields)) return `${where}.fields must be a list`;
  for (const [i, f] of c.fields.entries()) {
    const key = isObj(f) ? f.key : undefined;
    const knownField = typeof key === 'string' ? knownCall?.fields.find(bf => bf.key === key) : undefined;
    const e = checkField(f, `${where}.fields[${i}]`, knownField);
    if (e) return e;
  }
  return null;
}

// A step/call's produced output keys: its declared call fields, plus 'pics' for the image step — assigned by the
// image() route handler outside the call system, but still the key an image step exists to fill.
const producedKeys = (step: StepSpec): string[] => {
  const fields = callsOf(step).flatMap(c => c.fields).map(f => f.key);
  return step.type === 'image' ? [...fields, 'pics'] : fields;
};

// pics is always exempt: the image step is optional/skippable by design (state.ts), so losing it must never block a removal.
const droppedOutputField = (keys: string[], base: FnSpec): string | null =>
  keys.find(k => k !== 'pics' && (base.output?.fields ?? []).includes(k)) ?? null;

function checkStep(s: unknown, base: FnSpec, where: string): string | null {
  if (!isObj(s) || typeof s.key !== 'string') return `${where}: every step needs a key`;
  const known = (base.steps ?? []).find(b => b.key === s.key);
  if (!known) return `${where}: unknown step "${s.key}" — steps can be tuned or removed, not added`;
  const bad = unknownKey(s, ALLOWED.step, where) ?? checkCommon(s, where);
  if (bad) return bad;
  if (s.remove === true) {
    const dropped = droppedOutputField(producedKeys(known), base);
    if (dropped) return `${where}: removing step "${s.key}" would drop output field "${dropped}"`;
  }
  if (s.calls === undefined) return null;
  if (known.type === 'image') return `${where}: the image step has no calls to override`;
  if (!Array.isArray(s.calls)) return `${where}.calls must be a list`;
  for (const [i, c] of s.calls.entries()) {
    const key = isObj(c) ? c.key : undefined;
    const knownCall = typeof key === 'string' ? known.calls?.find(bc => bc.key === key) : undefined;
    if (isObj(c) && c.remove === true && knownCall) {
      const dropped = droppedOutputField(knownCall.fields.map(f => f.key), base);
      if (dropped) return `${where}.calls[${i}]: removing call "${knownCall.key}" would drop output field "${dropped}"`;
    }
    const e = checkCall(c, `${where}.calls[${i}]`, knownCall);
    if (e) return e;
  }
  return null;
}

function checkMerged(base: FnSpec, spec: FnSpec): string | null {
  if (!(spec.steps ?? []).length) return 'a pipeline needs at least one step';
  const declaredBy = new Map<string, string>(); // field key -> "step.key/call.key" of the first call that declares it
  for (const s of spec.steps ?? []) {
    if (s.type === 'image') continue;
    const calls = s.calls ?? [];
    if (!calls.length) return `step "${s.key}" has no calls`;
    for (const c of calls) {
      if (!c.fields?.length) return `call "${c.key}" has no fields`;
      // approve()'s html-sanitize set is built by scanning every call's fields by KEY alone — two calls sharing a
      // key would let one shadow the other's `html` flag, so the merged spec must keep every field key unique.
      // Keyed by step+call (not call key alone): reusing a call key in a DIFFERENT step must still collide here.
      const id = `${s.key}/${c.key}`;
      for (const f of c.fields) {
        const owner = declaredBy.get(f.key);
        if (owner && owner !== id) return `field "${f.key}" is declared by both "${owner}" and "${id}"`;
        declaredBy.set(f.key, id);
      }
    }
    try { orderCallWaves(calls); } catch { return `step "${s.key}": dependsOn names a missing call or loops`; }
  }
  // Every output field (but pics, filled outside the call system) must still be produced by some surviving call —
  // catches a field-level `remove: true` that drops one quietly, not just a whole step/call removal (checkStep above).
  const missing = (base.output?.fields ?? []).find(k => k !== 'pics' && !declaredBy.has(k));
  if (missing) return `output field "${missing}" is no longer declared by any call`;
  return null;
}

/** null when `patch` is a safe override of `base` (the department's base ⊕ sector spec), else why not. */
export function validateOverride(base: FnSpec, patch: unknown): string | null {
  if (!isObj(patch)) return 'patch must be an object';
  // .length is UTF-16 code units, not bytes — Vietnamese text would undercount and let a patch past D1's real column cost.
  if (new TextEncoder().encode(JSON.stringify(patch)).length > OVERRIDE_MAX) return 'patch is too large';
  const top = unknownKey(patch, ALLOWED.top, 'patch');
  if (top) return top;
  const label = checkLabel(patch.title, 200, 'title') ?? checkLabel(patch.description, 1000, 'description');
  if (label) return label;
  if (base.kind === 'chat') {
    if (patch.steps !== undefined) return 'a chat department has no steps';
    if (patch.role !== undefined && !str(patch.role, 2000)) return 'role must be text up to 2000 characters';
    if (patch.principles !== undefined && !strList(patch.principles, 20, 500)) return 'principles must be up to 20 lines of 500 characters';
    return null;
  }
  if (patch.role !== undefined || patch.principles !== undefined) return 'a pipeline department has no persona — override its steps';
  if (patch.steps !== undefined) {
    if (!Array.isArray(patch.steps)) return 'steps must be a list';
    for (const [i, s] of patch.steps.entries()) {
      const e = checkStep(s, base, `steps[${i}]`);
      if (e) return e;
    }
  }
  return checkMerged(base, mergeSpec(base, patch));
}

/** The face columns of a division row an admin may set: bounded text, an https avatar ('' clears), status, language. */
export function parseFace(v: unknown): { face: Rec; error: string | null } {
  if (v === undefined) return { face: {}, error: null };
  if (!isObj(v)) return { face: {}, error: 'face must be an object' };
  const face: Rec = {};
  for (const [k, val] of Object.entries(v)) {
    if (Object.hasOwn(FACE_TEXT, k)) {
      if (typeof val !== 'string' || val.length > FACE_TEXT[k]) return { face: {}, error: `face.${k} must be text up to ${FACE_TEXT[k]} characters` };
      face[k] = val.trim();
    } else if (k === 'status') {
      if (val !== 'active' && val !== 'inactive') return { face: {}, error: "face.status must be 'active' or 'inactive'" };
      face.status = val;
    } else if (k === 'lang') {
      if (val !== 'vi' && val !== 'en') return { face: {}, error: "face.lang must be 'vi' or 'en'" };
      face.lang = val;
    } else {
      return { face: {}, error: `face.${k} cannot be set` };
    }
  }
  if (face.pics && !/^https:\/\//i.test(face.pics)) return { face: {}, error: 'face.pics must be an https URL' };
  return { face, error: null };
}

// Code owns these — never a settable key in ALLOWED.top above, but a pre-Task-16 raw admin write (generic
// /v1/data/divisions) could still have smuggled one into `meta` before the patch was ever run through validateOverride.
const CODE_OWNED = ['output', 'inputs', 'needs', 'uses', 'produces', 'fn', 'kind'] as const;

/** A division row's stored `meta` (the override patch) as a safe plain object — any other shape becomes {}. */
export function parsePatch(meta: unknown): Rec {
  try {
    const v = JSON.parse(String(meta || '{}'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** Drops code-owned keys from an already-parsed patch — see CODE_OWNED above. */
export function stripCodeOwned(patch: Rec): Rec {
  const out = { ...patch };
  for (const k of CODE_OWNED) delete out[k];
  return out;
}
