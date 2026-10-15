import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nodeAccess } from './access.js';

test('a node without roles is open to everyone', () => {
    assert.equal(nodeAccess({ id: 'a' }, null), 'ok');
    assert.equal(nodeAccess({ id: 'a', roles: [] }, ['user']), 'ok');
});

test('signed out → signin; signed in without the role → role', () => {
    assert.equal(nodeAccess({ roles: ['admin'] }, null), 'signin');
    assert.equal(nodeAccess({ roles: ['admin', 'products'] }, ['user']), 'role');
});

test('a listed role, or one namespaced under it, grants', () => {
    assert.equal(nodeAccess({ roles: ['admin', 'products'] }, ['admin']), 'ok');
    assert.equal(nodeAccess({ roles: ['admin', 'products'] }, ['user', 'products.read']), 'ok');
    assert.equal(nodeAccess({ roles: ['products'] }, ['productsx.read']), 'role');
});

test("'*' = any signed-in user", () => {
    assert.equal(nodeAccess({ roles: ['*'] }, ['user']), 'ok');
    assert.equal(nodeAccess({ roles: ['*'] }, []), 'ok');
    assert.equal(nodeAccess({ roles: ['*'] }, null), 'signin');
});

test('plans: the user\'s plan (none = free) must be listed', () => {
    const pro = { plans: ['pro'] };
    assert.equal(nodeAccess(pro, null), 'plan');
    assert.equal(nodeAccess(pro, ['user'], 'starter'), 'plan');
    assert.equal(nodeAccess(pro, ['user'], 'pro'), 'ok');
    assert.equal(nodeAccess({ plans: ['free', 'pro'] }, null), 'ok');
    assert.equal(nodeAccess({ plans: [] }, ['user'], 'pro'), 'plan');
});

test('plans: Super Admin and a staff role skip them; sign-in still comes first', () => {
    assert.equal(nodeAccess({ plans: ['pro'] }, ['admin']), 'ok');
    assert.equal(nodeAccess({ roles: ['admin', 'products'], plans: ['pro'] }, ['products.read'], 'free'), 'ok');
    assert.equal(nodeAccess({ roles: ['*'], plans: ['pro'] }, null), 'signin');
    assert.equal(nodeAccess({ roles: ['*'], plans: ['pro'] }, ['user'], 'free'), 'plan');
    assert.equal(nodeAccess({ roles: ['*'], plans: ['pro'] }, ['user'], 'pro'), 'ok');
});
