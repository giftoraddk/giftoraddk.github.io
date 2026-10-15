import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpec, promptVars } from './registry.ts';
import { toOutline } from './outline.ts';
import { validateOverride } from './override.ts';
import { buildCallPrompt } from './prompt.ts';
import { taggedKeys } from './artifacts.ts';
import { orderCallWaves } from './state.ts';
import { FUNCTIONS } from './types.ts';

test('context: 2 steps, every derived-context field tagged except the information gaps, produces the shared context', () => {
  const spec = resolveSpec('ecommerce', 'context')!;
  assert.deepEqual(spec.steps!.map(s => s.key), ['interpretation', 'derived']);
  assert.deepEqual([...taggedKeys(spec)], ['topicCategory', 'domain', 'intent', 'taskType', 'customerHypotheses', 'useCases',
    'problems', 'coreNeeds', 'desiredOutcomes', 'constraints', 'assumptions', 'successCriteria']);
  assert.deepEqual(spec.produces!.map(p => p.kind), ['context']);
  assert.deepEqual(spec.needs, []);
  assert.deepEqual(orderCallWaves(spec.steps![1].calls!).map(w => w.map(c => c.key)), [['customers', 'problems'], ['frame']]);
});

test('router: one call reading the context handoff, four fields, produces routing', () => {
  const spec = resolveSpec('ecommerce', 'router')!;
  const call = spec.steps![0].calls![0];
  assert.deepEqual(call.fields.map(f => f.key), ['activation', 'lead', 'complexity', 'rationale']);
  assert.deepEqual(call.contextKeys, ['artifact.context']);
  assert.deepEqual(spec.needs, ['context']);
  assert.deepEqual(spec.produces!.map(p => p.kind), ['routing']);
});

test('the prompts carry the tag rule and all 9 functions; the outline carries none of it', () => {
  const ctx = resolveSpec('ecommerce', 'context')!;
  const c = buildCallPrompt(ctx.steps![0], ctx.steps![0].calls![0], { topic: 't', languageName: 'Vietnamese', fields: {}, vars: promptVars('ecommerce') });
  assert.match(c.system, /\[HYPOTHESIS\] = a guess that must be verified/);
  assert.match(c.system, /D2C, marketplace/);
  const router = resolveSpec('ecommerce', 'router')!;
  const r = buildCallPrompt(router.steps![0], router.steps![0].calls![0], { topic: 't', languageName: 'English', fields: {}, vars: promptVars('ecommerce') });
  for (const fn of FUNCTIONS) assert.match(r.system, new RegExp(`${fn}:LEVEL`));
  const outline = JSON.stringify([toOutline(ctx), toOutline(router)]);
  assert.ok(!outline.includes('HYPOTHESIS') && !outline.includes('NOT_MATERIAL') && !outline.includes('Business Analyst'));
});

test('an admin may tune the new steps but never their tag flag; the coordinator takes a label patch', () => {
  const ctx = resolveSpec('ecommerce', 'context')!;
  assert.equal(validateOverride(ctx, { steps: [{ key: 'derived', calls: [{ key: 'frame', temperature: 0.2 }] }] }), null);
  assert.match(validateOverride(ctx, { steps: [{ key: 'derived', calls: [{ key: 'frame', fields: [{ key: 'assumptions', tagged: false }] }] }] })!,
    /"tagged" cannot be overridden/);
  assert.equal(validateOverride(resolveSpec('ecommerce', 'coordinator')!, { description: { vi: 'Điều phối viên' } }), null);
});
