import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderCallWaves, jobState, canRunCall, callsOf, imageGateOpen } from './state.ts';
import type { StepSpec } from './types.ts';

const steps: StepSpec[] = [
  { id: 1, key: 'analysis', type: 'text', calls: [{ key: 'g1', fields: [{ key: 'a' }] }] },
  { id: 2, key: 'content', type: 'text', calls: [
    { key: 'titleDesc', fields: [{ key: 'title' }] },
    { key: 'content', dependsOn: ['titleDesc'], fields: [{ key: 'content' }] },
  ] },
  { id: 3, key: 'image', type: 'image', concept: { contextKeys: ['a'] } },
];

test('waves follow dependsOn; a cycle throws', () => {
  assert.deepEqual(orderCallWaves(steps[1].calls!).map(w => w.map(c => c.key)), [['titleDesc'], ['content']]);
  assert.throws(() => orderCallWaves([{ key: 'x', dependsOn: ['y'], fields: [] }, { key: 'y', dependsOn: ['x'], fields: [] }]), /circular/);
});

test('fresh job runs step 1; a finished text step pauses for review', () => {
  assert.deepEqual(jobState(steps, {}, '', -1), { status: 'step1', pausedStepId: '' });
  assert.deepEqual(jobState(steps, { a: 'x' }, '', -1), { status: 'awaiting_review', pausedStepId: '1' });
  assert.deepEqual(jobState(steps, { a: 'x' }, '', 0), { status: 'step2', pausedStepId: '' });
});

test('image step: concept first, then wait for ai/skip; skip or pics finishes', () => {
  const f = { a: 'x', title: 't', content: 'c' };
  assert.deepEqual(jobState(steps, f, '', 1), { status: 'step3', pausedStepId: '' });
  assert.deepEqual(jobState(steps, { ...f, imagePrompt: 'p' }, '', 1), { status: 'awaiting_review', pausedStepId: '3' });
  assert.deepEqual(jobState(steps, { ...f, imagePrompt: 'p' }, 'skip', 1), { status: 'done', pausedStepId: '' });
  assert.deepEqual(jobState(steps, { ...f, imagePrompt: 'p', pics: 'https://x' }, 'ai', 1), { status: 'done', pausedStepId: '' });
  // 'ai' chosen before the pics URL exists (client saves the choice, generates elsewhere, attaches pics later) — must not get stuck.
  assert.deepEqual(jobState(steps, { ...f, imagePrompt: 'p' }, 'ai', 1), { status: 'step3', pausedStepId: '' });
  assert.deepEqual(jobState(steps, { ...f, imagePrompt: 'p', pics: 'https://x' }, 'ai', 1), { status: 'done', pausedStepId: '' });
  assert.deepEqual(jobState(steps, { ...f, imagePrompt: 'p' }, 'skip', 1), { status: 'done', pausedStepId: '' });
});

test('imageGateOpen: paused at the image step, or "ai" chosen early with no pics yet — never once done', () => {
  const f = { a: 'x', title: 't', content: 'c', imagePrompt: 'p' };
  assert.equal(imageGateOpen(steps, f, '', 1), true); // awaiting_review, paused at the image step
  assert.equal(imageGateOpen(steps, f, 'ai', 1), true); // step3 after 'ai' was chosen, imagePrompt already there
  assert.equal(imageGateOpen(steps, { a: 'x' }, '', -1), false); // step1 — nowhere near the image step
  assert.equal(imageGateOpen(steps, { ...f, pics: 'https://x' }, 'ai', 1), false); // done — re-upload exception lives in routes.ts
});

test('a single-step pipeline finishes without review', () => {
  assert.deepEqual(jobState([steps[0]], { a: 'x' }, '', -1), { status: 'done', pausedStepId: '' });
});

test('a call runs only after earlier steps were reviewed and its dependsOn have data', () => {
  const [titleDesc, content] = steps[1].calls!;
  assert.equal(canRunCall(steps, 1, titleDesc, { a: 'x' }, -1), false);
  assert.equal(canRunCall(steps, 1, titleDesc, { a: 'x' }, 0), true);
  assert.equal(canRunCall(steps, 1, content, { a: 'x' }, 0), false);
  assert.equal(canRunCall(steps, 1, content, { a: 'x', title: 't' }, 0), true);
  assert.equal(canRunCall(steps, 2, callsOf(steps[2])[0], {}, 0), false);
});

test('an image step exposes one concept call writing imagePrompt', () => {
  const [concept] = callsOf(steps[2]);
  assert.equal(concept.key, 'concept');
  assert.deepEqual(concept.fields.map(f => f.key), ['imagePrompt']);
  assert.deepEqual(concept.contextKeys, ['a']);
});
