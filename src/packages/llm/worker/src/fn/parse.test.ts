import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonObject, hasForeignScript, pickFields, plainText } from './parse.ts';

test('finds the last JSON object even after reasoning text or a code fence', () => {
  assert.deepEqual(parseJsonObject('Let me think... {"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonObject('```json\n{"a":{"b":2}}\n```'), { a: { b: 2 } });
  assert.equal(parseJsonObject('no json here'), null);
  assert.equal(parseJsonObject('[1,2]'), null);
});

test('CJK leaking into a Latin-language answer is caught; emoji is not', () => {
  assert.equal(hasForeignScript({ a: 'Xin chào 你好' }, 'Vietnamese'), true);
  assert.equal(hasForeignScript({ a: 'Xin chào 😊🎉' }, 'Vietnamese'), false);
  assert.equal(hasForeignScript({ a: '你好' }, 'Chinese'), false);
});

test('only declared keys, trimmed, capped; html fields sanitized; non-strings become empty', () => {
  const out = pickFields(
    { title: '  Hộp quà  ', content: '<p>x</p><script>bad()</script>', extra: 'dropped', n: 5 },
    [{ key: 'title', max: 4 }, { key: 'content', html: true }, { key: 'n' }],
  );
  assert.deepEqual(out, { title: 'Hộp ', content: '<p>x</p>', n: '' });
});

test('plainText strips only tag-shaped markup, keeping "<"/">" used as comparison symbols', () => {
  assert.equal(plainText('a<img src=x onerror=alert(1)>b'), 'ab');
  assert.equal(plainText('x <script>y'), 'x y');
  assert.equal(plainText('1 < 2'), '1 < 2');
  assert.equal(plainText('Margin < 10% if cost > revenue; ok'), 'Margin < 10% if cost > revenue; ok');
});

test('a non-html field loses markup, not just gets it escaped', () => {
  const out = pickFields({ title: 'Hi <b>there</b>' }, [{ key: 'title' }]);
  assert.equal(out.title, 'Hi there');
});
