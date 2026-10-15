import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDivisionId, resolveSpec, sectorFaces, promptVars } from './registry.ts';

test('ecommerce product = base steps + the products output + its own designer persona', () => {
  const spec = resolveSpec('ecommerce', 'product')!;
  assert.deepEqual(spec.steps!.map(s => s.key), ['discovery', 'concept', 'development', 'image']);
  assert.equal(spec.output!.table, 'products');
  assert.match(spec.steps![1].role!, /gift-set/);
  assert.equal(spec.steps![2].calls!.find(c => c.key === 'content')!.fields[0].html, true);
});

test('legacy ids resolve onto ecommerce; unknown sector or fn → null', () => {
  assert.deepEqual(parseDivisionId('production'), { sector: 'ecommerce', fn: 'product' });
  assert.deepEqual(parseDivisionId('ecommerce.marketing'), { sector: 'ecommerce', fn: 'marketing' });
  assert.equal(parseDivisionId('nowhere.product'), null);
  assert.equal(parseDivisionId('ecommerce.nothing'), null);
});

test('an id shadowing an Object.prototype member is rejected, not crashed on', () => {
  assert.equal(parseDivisionId('constructor'), null);
  assert.equal(parseDivisionId('__proto__'), null);
  assert.equal(parseDivisionId('ecommerce.constructor'), null);
});

test('platform then owner overrides patch one call and leave the rest', () => {
  const spec = resolveSpec('ecommerce', 'finance', { steps: [{ key: 'analysis', calls: [{ key: 'g1', temperature: 0.1 }] }] }, { title: { en: 'My finance' } })!;
  assert.equal(spec.steps![0].calls![0].temperature, 0.1);
  assert.equal(spec.steps![0].calls![1].key, 'g2');
  assert.equal(spec.title.en, 'My finance');
  assert.equal(spec.title.vi, 'Tài chính & Nhân sự');
});

test('public faces list sectors and their departments without any method text', () => {
  const [ecom] = sectorFaces();
  assert.equal(ecom.id, 'ecommerce');
  assert.deepEqual(ecom.functions.map(f => f.id), ['ecommerce.product', 'ecommerce.marketing', 'ecommerce.finance', 'ecommerce.consult']);
  assert.ok(!JSON.stringify(ecom).includes('Senior Product'));
  assert.equal(promptVars('ecommerce').sector, 'e-commerce');
});

test('the coordinator and the context/router steps are named per sector but never listed as departments', () => {
  const [ecom] = sectorFaces();
  assert.deepEqual(ecom.system.map(f => f.id), ['ecommerce.coordinator', 'ecommerce.context', 'ecommerce.router']);
  assert.deepEqual(parseDivisionId('ecommerce.context'), { sector: 'ecommerce', fn: 'context' });
  assert.ok(!JSON.stringify(ecom.system).includes('[FACT]'));
});
