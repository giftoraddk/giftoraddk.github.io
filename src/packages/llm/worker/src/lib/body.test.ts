import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBody, readBodyUnknown, readText } from './body.ts';

const post = (body: BodyInit, headers: Record<string, string> = {}) => new Request('https://x/v1/fn/jobs', { method: 'POST', body, headers });
const MCP_MAX = 256 * 1024;

test('readBody: parses a small JSON object body', async () => {
  const req = post(JSON.stringify({ a: 1 }), { 'Content-Type': 'application/json' });
  assert.deepEqual(await readBody(req), { a: 1 });
});

test('readBody: a non-object JSON value becomes {}', async () => {
  assert.deepEqual(await readBody(post('[1,2,3]')), {});
  assert.deepEqual(await readBody(post('"x"')), {});
  assert.deepEqual(await readBody(post('')), {});
});

test('readBody: invalid JSON is a 400 HttpError', async () => {
  await assert.rejects(readBody(post('{not json')), (err: any) => err.status === 400);
});

test('readBody: a declared Content-Length over 64 KB is refused before reading', async () => {
  const req = post('{}', { 'Content-Length': String(65 * 1024) });
  await assert.rejects(readBody(req), (err: any) => err.status === 413);
});

test('readBody: an actual body over 64 KB is refused even without a declared Content-Length', async () => {
  const big = JSON.stringify({ a: 'x'.repeat(70 * 1024) });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(big));
      controller.close();
    },
  });
  // duplex: 'half' is required by undici when a Request is given a streaming body.
  const req = new Request('https://x/v1/fn/jobs', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  await assert.rejects(readBody(req), (err: any) => err.status === 413);
});

test('readBody: a body right at the limit still parses', async () => {
  const padding = 'x'.repeat(64 * 1024 - 20);
  const body = JSON.stringify({ a: padding });
  assert.deepEqual(await readBody(post(body)), { a: padding });
});

test('readBody: a custom max overrides the default 64 KB cap', async () => {
  const padding = 'x'.repeat(100 * 1024); // over the 64 KB default, under a 128 KB job-route cap
  const body = JSON.stringify({ a: padding });
  await assert.rejects(readBody(post(body)), (err: any) => err.status === 413); // default still refuses it
  assert.deepEqual(await readBody(post(body), 128 * 1024), { a: padding }); // a larger max lets it through
});

test('readBodyUnknown: keeps an array or a primitive, unlike readBody', async () => {
  assert.deepEqual(await readBodyUnknown(post('[1,2,3]')), [1, 2, 3]);
  assert.equal(await readBodyUnknown(post('"x"')), 'x');
  assert.deepEqual(await readBodyUnknown(post('{"a":1}')), { a: 1 });
  assert.deepEqual(await readBodyUnknown(post('')), {});
});

test('readBodyUnknown: still capped and still rejects invalid JSON', async () => {
  await assert.rejects(readBodyUnknown(post('[not json')), (err: any) => err.status === 400);
  const req = post('[]', { 'Content-Length': String(300 * 1024) });
  await assert.rejects(readBodyUnknown(req, MCP_MAX), (err: any) => err.status === 413);
});

test('readText: raw decoded text, capped, no JSON parsing', async () => {
  assert.equal(await readText(post('not json at all')), 'not json at all');
  const req = post('x'.repeat(70 * 1024));
  await assert.rejects(readText(req), (err: any) => err.status === 413);
});
