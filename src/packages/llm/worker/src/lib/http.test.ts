import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickOrigin, handleWorkerError, HttpError } from './http.ts';

const ALLOWED = 'https://app.example.com, http://localhost:5000';

test('an allowlisted origin is echoed back', () => {
  assert.equal(pickOrigin('http://localhost:5000', ALLOWED, false), 'http://localhost:5000');
});

test('a stranger on an authenticated route gets the first allowed origin, never itself', () => {
  assert.equal(pickOrigin('https://evil.example', ALLOWED, false), 'https://app.example.com');
  assert.equal(pickOrigin(null, ALLOWED, false), 'https://app.example.com');
});

test('public routes (embedded widgets on customer sites) answer any origin', () => {
  assert.equal(pickOrigin('https://customer.shop', ALLOWED, true), '*');
});

test('an empty allowlist leaves no origin to fall back to', () => {
  assert.equal(pickOrigin('https://x', '', false), '');
});

test('unexpected errors hide their message; HttpError keeps status + message', async () => {
  const quiet = console.error; console.error = () => {};
  try {
    const hidden = handleWorkerError(new Error('SELECT * FROM hubs failed'));
    assert.equal(hidden.status, 500);
    assert.deepEqual(await hidden.json(), { message: 'Internal error' });
    const shown = handleWorkerError(new HttpError(409, 'This call cannot run yet'));
    assert.equal(shown.status, 409);
    assert.deepEqual(await shown.json(), { message: 'This call cannot run yet' });
  } finally { console.error = quiet; }
});

test('a non-Error thrown value is still hidden', async () => {
  const quiet = console.error; console.error = () => {};
  try {
    const hidden = handleWorkerError('boom');
    assert.equal(hidden.status, 500);
    assert.deepEqual(await hidden.json(), { message: 'Internal error' });
  } finally { console.error = quiet; }
});
