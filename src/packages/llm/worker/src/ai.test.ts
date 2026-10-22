import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFreeChain, clampOpts, validMessages, AI_LIMITS } from './ai.ts';

const env = { OPER_KEY: 'sk-or-b', CLOU_KEY: 'cfut_a', NVID_KEY: 'nvapi-c' };

test('the client can only name symbols — raw keys it sends are ignored', () => {
  const quiet = console.warn; console.warn = () => {};
  try {
    assert.equal(resolveFreeChain('@default', env), 'sk-or-b|nvapi-c|cfut_a');
    assert.equal(resolveFreeChain('sk-or-stolen|@default', env), 'sk-or-b|nvapi-c|cfut_a');
    assert.equal(resolveFreeChain('sk-or-stolen', env), 'sk-or-b|nvapi-c|cfut_a'); // falls back to the default chain
    assert.equal(resolveFreeChain('', env), 'sk-or-b|nvapi-c|cfut_a');
  } finally { console.warn = quiet; }
});

test('opts are clamped and unknown opts dropped', () => {
  assert.deepEqual(clampOpts({ maxTokens: 999999, temperature: 9, freeTimeoutMs: 600000, system: 's' }),
    { system: 's', maxTokens: AI_LIMITS.maxTokens, temperature: 1.5 });
  assert.deepEqual(clampOpts({}), { system: undefined, maxTokens: 1024, temperature: 0.7 });
  assert.deepEqual(clampOpts({ maxTokens: -5, temperature: 'x' }), { system: undefined, maxTokens: 1024, temperature: 0.7 });
});

test('messages must be a short list of user/assistant strings within the char budget', () => {
  assert.equal(validMessages([{ role: 'user', content: 'hi' }], 's'), true);
  assert.equal(validMessages([], ''), false);
  assert.equal(validMessages([{ role: 'system', content: 'x' }], ''), false);
  assert.equal(validMessages([{ role: 'user', content: 'x'.repeat(AI_LIMITS.chars + 1) }], ''), false);
  assert.equal(validMessages(Array(AI_LIMITS.messages + 1).fill({ role: 'user', content: 'a' }), ''), false);
  assert.equal(validMessages([{ role: 'user', content: 'a' }], 'x'.repeat(AI_LIMITS.chars)), false); // system counts toward the budget
  assert.equal(validMessages([{ role: 'user', content: {} }], ''), false);
  assert.equal(validMessages([null], ''), false);
});
