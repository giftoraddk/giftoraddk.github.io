import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errors } from 'jose';
import { isInvalidToken } from './auth.ts';

test('a bad/expired/malformed token is invalid', () => {
  assert.equal(isInvalidToken(new errors.JWTExpired('x', {})), true);
  assert.equal(isInvalidToken(new errors.JWSSignatureVerificationFailed()), true);
});

test('a JWKS outage is not an invalid token', () => {
  assert.equal(isInvalidToken(new errors.JOSEError('Expected 200 OK')), false);
  assert.equal(isInvalidToken(new errors.JWKSTimeout()), false);
  assert.equal(isInvalidToken(new errors.JWKSInvalid()), false);
  assert.equal(isInvalidToken(new TypeError('fetch failed')), false);
});
