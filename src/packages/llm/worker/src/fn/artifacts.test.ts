import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, normalizeTagged, claims, tagCounts, taggedKeys } from './artifacts.ts';
import type { FnSpec } from './types.ts';

test('a line tag is read in its usual shapes, English or Vietnamese', () => {
  assert.deepEqual(parseLine('- [HYPOTHESIS] Corporate buyers order in bulk'), { prefix: '- ', tag: 'HYPOTHESIS', text: 'Corporate buyers order in bulk' });
  assert.deepEqual(parseLine('(Inference) Gift season peaks in September'), { prefix: '', tag: 'INFERENCE', text: 'Gift season peaks in September' });
  assert.deepEqual(parseLine('FACT: the boss wants a Mid-Autumn gift'), { prefix: '', tag: 'FACT', text: 'the boss wants a Mid-Autumn gift' });
  assert.deepEqual(parseLine('2. [Giả thuyết] Khách doanh nghiệp mua số lượng lớn'), { prefix: '2. ', tag: 'HYPOTHESIS', text: 'Khách doanh nghiệp mua số lượng lớn' });
  assert.deepEqual(parseLine('[SUY LUẬN] Mùa quà tặng'), { prefix: '', tag: 'INFERENCE', text: 'Mùa quà tặng' });
  assert.deepEqual(parseLine('Budget: 500k per box'), { prefix: '', tag: null, text: 'Budget: 500k per box' });
  assert.deepEqual(parseLine('-5% margin'), { prefix: '', tag: null, text: '-5% margin' });
});

test('normalizing gives every line one canonical tag; an untagged line takes the fallback', () => {
  const raw = '[fact] Boss wants gifts\n\n- corporate buyers\n(Giả định) 500 hộp';
  assert.equal(normalizeTagged(raw, 'HYPOTHESIS'), '[FACT] Boss wants gifts\n- [HYPOTHESIS] corporate buyers\n[HYPOTHESIS] 500 hộp');
  assert.equal(normalizeTagged('[INFERENCE] a\nadded by the boss', 'FACT'), '[INFERENCE] a\n[FACT] added by the boss');
});

test('claims are the tagged lines only; counts per tag', () => {
  assert.deepEqual(claims('[FACT] a\nplain line\n- [HYPOTHESIS] b'), [{ text: 'a', tag: 'FACT' }, { text: 'b', tag: 'HYPOTHESIS' }]);
  assert.deepEqual(tagCounts(['[FACT] a\n[INFERENCE] b', '[INFERENCE] c\nnone']), { FACT: 1, INFERENCE: 2, HYPOTHESIS: 0 });
});

test('tagged field keys come from the spec', () => {
  const spec = { fn: 'context', kind: 'pipeline', title: { vi: '', en: '' }, steps: [
    { id: 1, key: 's', type: 'text', calls: [{ key: 'c', fields: [{ key: 'intent', tagged: true }, { key: 'gaps' }] }] },
  ] } as FnSpec;
  assert.deepEqual([...taggedKeys(spec)], ['intent']);
});

test('the field cap applies AFTER the tags are added — whole lines kept, never a cut tag', () => {
  const out = normalizeTagged('a\nb\nc', 'FACT', 20);
  assert.equal(out, '[FACT] a\n[FACT] b');
  const long = normalizeTagged('x'.repeat(50), 'FACT', 20);
  assert.equal(long.length, 20);
  assert.ok(long.startsWith('[FACT] x'));
  assert.equal(normalizeTagged('a\nb', 'FACT'), '[FACT] a\n[FACT] b');
});

test('"Thực tế:" is an ordinary Vietnamese opener, not a FACT tag', () => {
  assert.equal(parseLine('Thực tế: khách thích quà').tag, null);
  assert.equal(parseLine('Thực tế: khách thích quà').text, 'Thực tế: khách thích quà');
  assert.equal(parseLine('[Sự thật] khách thích quà').tag, 'FACT');
});
