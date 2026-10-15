import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFaces, faceTitle, type FaceRow } from './faces.ts';
import { sectorFaces } from './registry.ts';

const row = (p: Partial<FaceRow>): FaceRow => ({
  id: 'x', title: '', description: '', pics: '', status: 'active', lang: 'vi', sector: 'ecommerce', fn: 'marketing', owner: '', ...p,
});
const marketingOf = (sectors: ReturnType<typeof mergeFaces>) => sectors[0].functions.find(f => f.fn === 'marketing')!;

test('no rows: every department is active with its base title', () => {
  const mk = marketingOf(mergeFaces(sectorFaces(), [], ''));
  assert.deepEqual([mk.name, mk.pics, mk.status, mk.lang], ['', '', 'active', 'vi']);
  assert.equal(faceTitle(mk, 'en'), 'Marketing & Growth');
});

test('the platform row names a department; an owner row wins field by field', () => {
  const rows = [row({ title: 'Marketing', pics: 'https://a/p.png', status: 'inactive' }), row({ owner: 'hub1', title: 'Tiếp thị' })];
  const platform = marketingOf(mergeFaces(sectorFaces(), rows, ''));
  assert.deepEqual([platform.name, platform.pics, platform.status], ['Marketing', 'https://a/p.png', 'inactive']);
  const hub = marketingOf(mergeFaces(sectorFaces(), rows, 'hub1'));
  assert.deepEqual([hub.name, hub.pics, hub.status], ['Tiếp thị', 'https://a/p.png', 'active']);
  assert.equal(faceTitle(hub), 'Tiếp thị');
});

test("another owner's row is never used", () => {
  assert.equal(marketingOf(mergeFaces(sectorFaces(), [row({ owner: 'hub2', title: 'X' })], 'hub1')).name, '');
});
