import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toOutline, allFieldKeys, waitsForProduct } from './outline.ts';
import type { FnSpec } from './types.ts';
import { resolveSpec } from './registry.ts';

const SECRET = 'SECRET-METHOD';
const spec: FnSpec = {
  fn: 'marketing', kind: 'pipeline', title: { vi: 'Marketing', en: 'Marketing' }, inputs: ['productContext'], needs: ['product'],
  role: SECRET, principles: [SECRET],
  output: { table: 'posts', fields: ['title'] },
  steps: [
    { id: 1, key: 'analysis', vi: 'Phân tích', en: 'Analysis', type: 'text', role: SECRET, task: SECRET, calls: [
      { key: 'g1', role: SECRET, task: SECRET, dependsOn: [], fields: [{ key: 'topicAnalysis', vi: 'Chủ đề', en: 'Topic', desc: SECRET }] },
      { key: 'g2', dependsOn: ['g1'], fields: [{ key: 'content', desc: SECRET, html: true }] },
    ] },
    { id: 2, key: 'image', type: 'image', concept: { contextKeys: ['topicAnalysis'] } },
  ],
};

test('no persona, task or field description ever reaches the outline', () => {
  const outline = toOutline(spec);
  assert.ok(!JSON.stringify(outline).includes(SECRET));
  assert.deepEqual(outline.steps[0].calls[1], { key: 'g2', vi: undefined, en: undefined, dependsOn: ['g1'], fields: [{ key: 'content', vi: undefined, en: undefined, html: true }] });
  assert.deepEqual(outline.steps[1].calls, []);
  assert.deepEqual(outline.needs, ['product']);
});

test('field keys of every step, image steps add imagePrompt + pics', () => {
  assert.deepEqual(allFieldKeys(spec), ['topicAnalysis', 'content', 'imagePrompt', 'pics']);
});

test('handoffs reach the outline as kinds + field keys (never their objective); a product handoff still reads as needing "product" for Phase 2 clients', () => {
  const o = toOutline({ ...spec, needs: ['context'], uses: ['product.value'], produces: [{ kind: 'marketing.demand', dest: ['commercial'], objective: SECRET, fields: ['topicAnalysis'] }] });
  assert.deepEqual(o.needs, ['context', 'product']);
  assert.deepEqual(o.uses, ['product.value']);
  assert.deepEqual(o.produces, [{ kind: 'marketing.demand', dest: ['commercial'], fields: ['topicAnalysis'] }]);
  assert.ok(!JSON.stringify(o).includes(SECRET));
  assert.equal(waitsForProduct(resolveSpec('ecommerce', 'marketing')!), true);
  assert.equal(waitsForProduct(resolveSpec('ecommerce', 'finance')!), false);
  assert.equal(waitsForProduct(resolveSpec('ecommerce', 'product')!), false);
});

test('only the spec the Phase 2 wake-up fed (productContext) keeps the legacy "product" need — finance using product.spec does not', () => {
  const finance = resolveSpec('ecommerce', 'finance')!;
  assert.ok((finance.uses ?? []).includes('product.spec'));
  assert.deepEqual(toOutline(finance).needs, ['context']);
  assert.deepEqual(toOutline(resolveSpec('ecommerce', 'marketing')!).needs, ['context', 'product']);
  assert.equal(waitsForProduct(resolveSpec('ecommerce', 'marketing')!), true);
});
