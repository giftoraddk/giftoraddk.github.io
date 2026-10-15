import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseActivation, fnOf, levelOf, complexityOf, normalizeRouting, planFunctions, type Routing } from './routing.ts';

test('activation parses the machine format and the usual drifts', () => {
  assert.deepEqual(parseActivation('strategy:NOT_MATERIAL|product:REQUIRED|marketing:RELEVANT|supply:not material'),
    { strategy: 'NOT_MATERIAL', product: 'REQUIRED', marketing: 'RELEVANT', supply: 'NOT_MATERIAL' });
  assert.deepEqual(parseActivation('- Product & Innovation: REQUIRED (lead)\n- Supply - NOT MATERIAL\n* **Finance**= relevant'),
    { product: 'REQUIRED', supply: 'NOT_MATERIAL', finance: 'RELEVANT' });
  assert.deepEqual(parseActivation('Sản phẩm: BẮT BUỘC; Công nghệ: CÓ ĐIỀU KIỆN; Cung ứng: KHÔNG LIÊN QUAN'),
    { product: 'REQUIRED', technology: 'CONDITIONAL', supply: 'NOT_MATERIAL' });
  assert.deepEqual(parseActivation('product:REQUIRED|product:NOT_MATERIAL|robots:REQUIRED|quality:MAYBE'), { product: 'REQUIRED' });
  assert.deepEqual(parseActivation(undefined), {});
});

test('a function is found by key, display name or Vietnamese name; the earliest mention wins', () => {
  assert.equal(fnOf('marketing leads, product supports'), 'marketing');
  assert.equal(fnOf('Operations & Delivery'), 'operations');
  assert.equal(fnOf('Tài chính'), 'finance');
  assert.equal(fnOf('technical debt'), null);
  assert.equal(levelOf('NOT_MATERIAL'), 'NOT_MATERIAL');
  assert.equal(levelOf('not relevant here'), 'NOT_MATERIAL');
  assert.equal(levelOf('relevant'), 'RELEVANT');
  assert.equal(levelOf('maybe'), null);
});

test('routing: an unrated function is NOT_MATERIAL, the lead is always REQUIRED, depth defaults to standard', () => {
  const r = normalizeRouting({ activation: 'product:RELEVANT|marketing:REQUIRED', lead: 'Product', complexity: 'Simple — one clear deliverable' });
  assert.equal(r.lead, 'product');
  assert.equal(r.levels.product, 'REQUIRED');
  assert.equal(r.levels.supply, 'NOT_MATERIAL');
  assert.equal(r.complexity, 'simple');
  assert.deepEqual(r.rated, ['product', 'marketing']);
  const fallback = normalizeRouting({ activation: 'finance:REQUIRED', lead: '???', complexity: 'phức tạp' });
  assert.equal(fallback.lead, 'finance');
  assert.equal(fallback.complexity, 'complex');
  assert.equal(normalizeRouting({}).lead, 'product');
  assert.equal(complexityOf('whatever'), 'standard');
});

const routing = (levels: Record<string, string>, lead: string, complexity: string): Routing =>
  normalizeRouting({ activation: Object.entries(levels).map(([k, v]) => `${k}:${v}`).join('|'), lead, complexity });
const AVAILABLE = ['product', 'marketing', 'finance'];

test('simple: REQUIRED + up to 2 support; an unbuilt one is reported, the rest skipped with a reason', () => {
  const plan = planFunctions(routing({ product: 'REQUIRED', marketing: 'RELEVANT', commercial: 'RELEVANT', finance: 'RELEVANT', supply: 'NOT_MATERIAL', technology: 'CONDITIONAL' }, 'product', 'simple'), AVAILABLE);
  assert.deepEqual(plan.run, ['product', 'marketing']);
  assert.deepEqual(plan.unavailable, ['commercial']);
  assert.deepEqual(plan.skipped.map(s => `${s.fn}:${s.reason}`),
    ['strategy:not_material', 'operations:not_material', 'supply:not_material', 'quality:not_material', 'finance:depth', 'technology:conditional']);
});

test('standard adds the quality review unless quality is not material; complex takes every REQUIRED + RELEVANT', () => {
  const std = planFunctions(routing({ marketing: 'REQUIRED', product: 'RELEVANT', quality: 'CONDITIONAL' }, 'marketing', 'standard'), AVAILABLE);
  assert.deepEqual(std.run, ['marketing', 'product']);
  assert.deepEqual(std.unavailable, ['quality']);
  assert.deepEqual(planFunctions(routing({ marketing: 'REQUIRED', quality: 'NOT_MATERIAL' }, 'marketing', 'standard'), AVAILABLE).unavailable, []);
  const all = planFunctions(routing({ product: 'REQUIRED', marketing: 'RELEVANT', commercial: 'RELEVANT', operations: 'RELEVANT', supply: 'RELEVANT', finance: 'RELEVANT' }, 'product', 'complex'), AVAILABLE);
  assert.deepEqual(all.run, ['product', 'marketing', 'finance']);
  assert.deepEqual(all.unavailable, ['commercial', 'operations', 'supply']);
});

test('activation finds the LEVEL wherever it sits in an entry; a two-function label keeps its rating', () => {
  assert.deepEqual(parseActivation('Supply - Procurement: RELEVANT\nMarketing & Product: REQUIRED\nFinance: people = NOT MATERIAL'),
    { supply: 'RELEVANT', marketing: 'REQUIRED', finance: 'NOT_MATERIAL' });
  assert.deepEqual(parseActivation('Quality | Performance: CONDITIONAL'), {});
  assert.deepEqual(parseActivation('Operations & Delivery - Required'), { operations: 'REQUIRED' });
});

test('complex tasks get the quality review too (spec §44: every depth but simple)', () => {
  const cx = planFunctions(routing({ marketing: 'REQUIRED' }, 'marketing', 'complex'), AVAILABLE);
  assert.deepEqual(cx.unavailable, ['quality']);
  const simple = planFunctions(routing({ marketing: 'REQUIRED' }, 'marketing', 'simple'), AVAILABLE);
  assert.deepEqual(simple.unavailable, []);
  const notMaterial = planFunctions(routing({ marketing: 'REQUIRED', quality: 'NOT_MATERIAL' }, 'marketing', 'complex'), AVAILABLE);
  assert.deepEqual(notMaterial.unavailable, []);
});

test('parseActivation ignores __proto__ / constructor keys and never pollutes the prototype', () => {
  const out = parseActivation('__proto__:REQUIRED|constructor:REQUIRED|toString = RELEVANT|product:REQUIRED');
  assert.deepEqual(out, { product: 'REQUIRED' });
  assert.equal(Object.getPrototypeOf(out), Object.prototype);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(normalizeRouting({ activation: '__proto__:REQUIRED' }).levels.product, 'REQUIRED');
});
