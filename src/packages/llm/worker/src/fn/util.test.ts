import { test } from 'node:test';
import assert from 'node:assert/strict';
import { str, now, plain } from './util.ts';

test('str: trims + caps strings, anything else becomes empty', () => {
  assert.equal(str('  hi  ', 10), 'hi');
  assert.equal(str('a'.repeat(10), 3), 'aaa');
  assert.equal(str(5, 10), '');
  assert.equal(str(undefined, 10), '');
  assert.equal(str(null, 10), '');
});

test('now: an ISO timestamp', () => {
  assert.match(now(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test('plain: strips all markup and collapses whitespace', () => {
  assert.equal(plain('<h2>H</h2><p>Nội  dung</p>'), 'H Nội dung');
  assert.equal(plain(''), '');
  assert.equal(plain(null), '');
  assert.equal(plain(undefined), '');
});
