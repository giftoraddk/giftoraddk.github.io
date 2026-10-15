import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowAi, ipKey } from './rateLimit.ts';

function fakeLimit(success: boolean) {
  const keys: string[] = [];
  return { keys, limit: async ({ key }: { key: string }) => { keys.push(key); return { success }; } };
}

test('a signed-in caller is counted by user id, a guest by IP', async () => {
  const env = { AI_USER_LIMIT: fakeLimit(true), AI_GUEST_LIMIT: fakeLimit(true) };
  const req = new Request('https://w/v1/ai/stream', { headers: { 'CF-Connecting-IP': '1.2.3.4' } });
  assert.equal(await allowAi(env as any, req, 'u1'), true);
  assert.equal(await allowAi(env as any, req, ''), true);
  assert.deepEqual(env.AI_USER_LIMIT.keys, ['user:u1']);
  assert.deepEqual(env.AI_GUEST_LIMIT.keys, ['ip:1.2.3.4']);
});

test('over the limit → refused', async () => {
  const env = { AI_USER_LIMIT: fakeLimit(false), AI_GUEST_LIMIT: fakeLimit(false) };
  assert.equal(await allowAi(env as any, new Request('https://w/'), 'u1'), false);
  assert.equal(await allowAi(env as any, new Request('https://w/'), ''), false);
  assert.deepEqual(env.AI_GUEST_LIMIT.keys, ['ip:unknown']);
});

test('an IPv6 guest is bucketed by /64 prefix, an IPv4 guest by its exact address', () => {
  assert.equal(ipKey('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(ipKey('1.2.3.4'), '1.2.3.4');
});
