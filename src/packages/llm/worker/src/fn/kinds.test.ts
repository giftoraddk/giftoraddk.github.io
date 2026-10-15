import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, FN_TITLES, kindLabels } from './kinds.ts';
import { FUNCTIONS, SYSTEM_FNS, CHAT_FNS, isSystemFn } from './types.ts';
import { BASE } from './base/index.ts';
import { resolveSpec } from './registry.ts';
import { callsOf } from './state.ts';
import type { FnKey } from './types.ts';

const KEYS = new Set<string>([...FUNCTIONS, ...SYSTEM_FNS, ...CHAT_FNS]);

test('every handoff kind names a real function as its one producer', () => {
  for (const [kind, info] of Object.entries(KINDS)) assert.ok(KEYS.has(info.source), `${kind} → ${info.source}`);
  assert.equal(KINDS['product.value'].source, 'product');
  assert.equal(KINDS['ops.package'].source, 'operations');
  assert.deepEqual(kindLabels().context, { vi: 'Bối cảnh dẫn xuất', en: 'Derived context' });
});

test('all 9 functions have a public name; a built one matches its base title', () => {
  for (const fn of FUNCTIONS) assert.ok(FN_TITLES[fn]?.vi && FN_TITLES[fn]?.en, fn);
  for (const [fn, spec] of Object.entries(BASE)) if (FN_TITLES[fn]) assert.deepEqual(FN_TITLES[fn], spec!.title, fn);
});

test('system functions = the context/router/integration steps and the coordinator', () => {
  assert.deepEqual(['context', 'router', 'integration', 'coordinator', 'product', 'consult'].map(isSystemFn), [true, true, true, true, false, false]);
});

const pipelines = () => (Object.keys(BASE) as FnKey[]).map(fn => resolveSpec('ecommerce', fn)!).filter(s => s.kind === 'pipeline');

test('every kind a spec needs, uses or produces is registered, and produced only by its registered source', () => {
  for (const s of pipelines()) {
    for (const k of [...(s.needs ?? []), ...(s.uses ?? [])]) assert.ok(KINDS[k], `${s.fn} reads unknown ${k}`);
    for (const p of s.produces ?? []) assert.equal(KINDS[p.kind]?.source, s.fn, p.kind);
  }
});

test('produced fields exist in the spec; artifact.* context keys only name kinds the spec reads', () => {
  for (const s of pipelines()) {
    const calls = (s.steps ?? []).flatMap(st => callsOf(st));
    const keys = new Set(calls.flatMap(c => c.fields).map(f => f.key));
    for (const p of s.produces ?? []) {
      for (const f of p.fields) assert.ok(keys.has(f), `${p.kind}.${f}`);
      for (const list of Object.values(p.sections ?? {})) for (const f of list ?? []) assert.ok(p.fields.includes(f), `${p.kind} section ${f}`);
    }
    const reads = new Set([...(s.needs ?? []), ...(s.uses ?? [])]);
    for (const c of calls) for (const k of c.contextKeys ?? []) {
      if (k.startsWith('artifact.')) assert.ok(reads.has(k.slice('artifact.'.length)), `${s.fn}.${c.key} → ${k}`);
    }
  }
});

test('needs + uses never loop (feedback between functions is a re-run, never a wait)', () => {
  const graph = pipelines().map(s => ({ fn: s.fn as string, reads: [...(s.needs ?? []), ...(s.uses ?? [])].map(k => KINDS[k].source as string) }));
  const built = new Set(graph.map(g => g.fn));
  const done = new Set<string>();
  let left = graph;
  while (left.length) {
    const ready = left.filter(n => n.reads.every(src => done.has(src) || !built.has(src) || src === n.fn));
    assert.ok(ready.length, `cycle among ${left.map(n => n.fn).join(', ')}`);
    ready.forEach(n => done.add(n.fn));
    left = left.filter(n => !ready.includes(n));
  }
});

test('Phase 3 handoffs: product → value/spec/quality, marketing → insight/demand, finance → economics', () => {
  const kinds = (fn: FnKey) => resolveSpec('ecommerce', fn)!.produces!.map(p => p.kind);
  assert.deepEqual(kinds('product'), ['product.value', 'product.spec', 'product.quality']);
  assert.deepEqual(kinds('marketing'), ['marketing.insight', 'marketing.demand']);
  assert.deepEqual(kinds('finance'), ['finance.economics']);
  assert.deepEqual([resolveSpec('ecommerce', 'marketing')!.needs, resolveSpec('ecommerce', 'marketing')!.uses], [['context'], ['product.value']]);
});
