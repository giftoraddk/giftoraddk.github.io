import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unknownKeys, stripCols, dropLocked, keepKnown, ownerLockFor, rejectPrivateFilters, redactPricing } from './columns.ts';

test('keepKnown keeps only exact-case real columns — single body and each batch item', () => {
  const cols = new Set(['id', 'title', 'meta']);
  assert.deepEqual(keepKnown({ title: 'x', META: '{}', actors: 'u1' }, cols, false), { title: 'x' });
  assert.deepEqual(keepKnown({ items: [{ id: 'a', data: { title: 'y', Meta: 1, scope: 's' } }] }, cols, true), { items: [{ id: 'a', data: { title: 'y' } }] });
  assert.equal(keepKnown(null, cols, false), null);
});

test('filters naming a column outside the table are reported', () => {
  assert.deepEqual(unknownKeys(['type', 'status'], new Set(['id', 'type', 'status'])), []);
  assert.deepEqual(unknownKeys(['type', 'token_hash', 'x"y'], new Set(['id', 'type'])), ['token_hash', 'x"y']);
});

test('unknownKeys is exact-case — a body key differing only in case is still reported (write-time column check)', () => {
  assert.deepEqual(unknownKeys(['META', 'Ai', 'title'], new Set(['meta', 'ai', 'title'])), ['META', 'Ai']);
});

test('stripCols drops the named keys and passes null through', () => {
  assert.deepEqual(stripCols({ id: 'a', ai: 'k' }, ['ai']), { id: 'a' });
  assert.equal(stripCols(null, ['ai']), null);
});

test('locked columns never reach a generic write, single or batch', () => {
  assert.deepEqual(dropLocked({ title: 'x', meta: '{}', ai: 'k' }, ['meta', 'ai'], false), { title: 'x' });
  assert.deepEqual(dropLocked({ items: [{ id: 'a', data: { meta: 1, status: 'active' } }] }, ['meta'], true), { items: [{ id: 'a', data: { status: 'active' } }] });
  assert.equal(dropLocked(null, ['meta'], false), null);
});

test('ownerLockFor: a guest is pinned to shared knowledge, an allowed owner passes through, trust lifts the pin', () => {
  assert.equal(ownerLockFor(false, true, ''), ''); // no owner asked — shared platform knowledge only
  assert.equal(ownerLockFor(false, true, 'hub1'), 'hub1'); // already ownerAccess()-approved by the caller
  assert.equal(ownerLockFor(true, true, 'hub1'), null); // admin / table-scoped — no restriction
  assert.equal(ownerLockFor(false, false, 'hub1'), null); // not an owner-scoped table (e.g. divisions) — no pin
});

test('rejectPrivateFilters: only filter keys in the strip set are flagged', () => {
  assert.deepEqual(rejectPrivateFilters(['type', 'source'], ['source']), ['source']);
  assert.deepEqual(rejectPrivateFilters(['type', 'status'], ['source']), []);
  assert.deepEqual(rejectPrivateFilters(['meta', 'ai', 'title'], ['meta', 'ai']), ['meta', 'ai']);
});

test('redactPricing: keeps price + unit, drops cost; unparseable pricing is dropped entirely', () => {
  assert.deepEqual(redactPricing({ pricing: '1200000~800000~hộp', tags: 'a' }), { pricing: '1200000~~hộp', tags: 'a' });
  assert.deepEqual(redactPricing({ pricing: '1200000~800000' }), { pricing: '1200000' });
  assert.deepEqual(redactPricing({ pricing: '', tags: 'a' }), { tags: 'a' });
  assert.deepEqual(redactPricing({ pricing: 'not-a-price' }), {});
  assert.deepEqual(redactPricing({ tags: 'a' }), { tags: 'a' });
  assert.deepEqual(redactPricing(null), {});
});
