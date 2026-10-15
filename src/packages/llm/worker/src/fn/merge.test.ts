import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSpec, mergeValue } from './merge.ts';
import type { FnSpec } from './types.ts';

const base: FnSpec = {
  fn: 'product', kind: 'pipeline', title: { vi: 'Sản phẩm', en: 'Product' }, output: null,
  steps: [
    { id: 1, key: 'discovery', type: 'text', role: 'R1', task: 'T1', calls: [
      { key: 'g1', contextKeys: ['a'], fields: [{ key: 'customer', desc: 'who' }, { key: 'problem', desc: 'what' }] },
      { key: 'g2', fields: [{ key: 'risks', desc: 'risks' }] },
    ] },
    { id: 2, key: 'concept', type: 'text', calls: [{ key: 'c', fields: [{ key: 'concept' }] }] },
  ],
};

test('objects merge key by key, scalars replace', () => {
  assert.deepEqual(mergeValue({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 9 } }), { a: 1, b: { c: 9, d: 3 } });
});

test('keyed lists merge by key and keep their order', () => {
  const out = mergeSpec(base, { steps: [{ key: 'discovery', role: 'R1-ecom', calls: [{ key: 'g2', temperature: 0.2 }] }] });
  assert.equal(out.steps![0].role, 'R1-ecom');
  assert.equal(out.steps![0].task, 'T1');
  assert.deepEqual(out.steps!.map(s => s.key), ['discovery', 'concept']);
  assert.equal(out.steps![0].calls![1].temperature, 0.2);
  assert.equal(out.steps![0].calls![1].fields[0].key, 'risks');
});

test('an unknown key is appended, remove:true drops one', () => {
  const out = mergeSpec(base, { steps: [{ key: 'concept', remove: true }, { id: 3, key: 'image', type: 'image' }] });
  assert.deepEqual(out.steps!.map(s => s.key), ['discovery', 'image']);
  assert.equal('remove' in out.steps![1], false);
});

test('plain arrays replace, objects over null replace', () => {
  const out = mergeSpec(base, { output: { table: 'products', fields: ['title'] }, steps: [{ key: 'discovery', calls: [{ key: 'g1', contextKeys: ['x', 'y'] }] }] });
  assert.deepEqual(out.steps![0].calls![0].contextKeys, ['x', 'y']);
  assert.equal(out.output!.table, 'products');
});

test('patches apply in order, null/undefined are skipped, inputs are never mutated', () => {
  const snapshot = structuredClone(base);
  const out = mergeSpec(base, null, { title: { vi: 'A', en: 'A' } }, undefined, { title: { en: 'B' } });
  assert.deepEqual(out.title, { vi: 'A', en: 'B' });
  assert.deepEqual(base, snapshot);
});
