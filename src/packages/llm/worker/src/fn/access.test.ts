import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRunPlatformJobs, embedOwnerOk, HUB_JOBS_PER_DAY, sinceIso } from './access.ts';

test('platform staff need a write-capable talks grant over all records', () => {
  assert.equal(canRunPlatformJobs(['talks.MANAGE']), true);
  assert.equal(canRunPlatformJobs(['talks.EDIT', 'posts.VIEW']), true);
  assert.equal(canRunPlatformJobs(['talks.admin']), true);
  assert.equal(canRunPlatformJobs(['talks.VIEW']), false);
  assert.equal(canRunPlatformJobs(['talks.read', 'talks.list']), false);
  assert.equal(canRunPlatformJobs(['talks.EDIT~own']), false);
  assert.equal(canRunPlatformJobs(['talksx.MANAGE', 'admin']), false);
});

test('a hub answers guests elsewhere only while active and not opted out', () => {
  assert.equal(embedOwnerOk({ meta: '{}' }, true), true);
  assert.equal(embedOwnerOk({ meta: '{"embed":false}' }, true), false);
  assert.equal(embedOwnerOk({ meta: { embed: true } }, false), false);
  assert.equal(embedOwnerOk(null, true), false);
  assert.equal(embedOwnerOk({ meta: 'not json' }, true), true);
});

test('the hub job budget window is the last 24 hours', () => {
  assert.equal(sinceIso(Date.parse('2026-09-28T12:00:00.000Z')), '2026-09-27T12:00:00.000Z');
  assert.equal(HUB_JOBS_PER_DAY, 100);
});
