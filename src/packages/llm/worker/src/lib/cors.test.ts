import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicRoute } from './cors.ts';

function req(method: string, headers: Record<string, string> = {}): Request {
  return new Request('https://worker.example/x', { method, headers });
}

test('GET /v1/data/know is public', () => {
  assert.equal(isPublicRoute(req('GET'), '/v1/data/know'), true);
});

test('OPTIONS preflighting a GET on /v1/data/know is public', () => {
  assert.equal(isPublicRoute(req('OPTIONS', { 'Access-Control-Request-Method': 'GET' }), '/v1/data/know'), true);
});

test('OPTIONS preflighting a PATCH on /v1/data/know is not public', () => {
  assert.equal(isPublicRoute(req('OPTIONS', { 'Access-Control-Request-Method': 'PATCH' }), '/v1/data/know'), false);
});

test('POST /v1/data/know is not public', () => {
  assert.equal(isPublicRoute(req('POST'), '/v1/data/know'), false);
});

test('GET /v1/data/knowledge (not an exact table match) is not public', () => {
  assert.equal(isPublicRoute(req('GET'), '/v1/data/knowledge'), false);
});

test('POST /v1/hubs/issue is not public', () => {
  assert.equal(isPublicRoute(req('POST'), '/v1/hubs/issue'), false);
});

test('POST /v1/search is public', () => {
  assert.equal(isPublicRoute(req('POST'), '/v1/search'), true);
});

test('POST /mcp is public', () => {
  assert.equal(isPublicRoute(req('POST'), '/mcp'), true);
});

test('POST /v1/ai/image is not public', () => {
  assert.equal(isPublicRoute(req('POST'), '/v1/ai/image'), false);
});
