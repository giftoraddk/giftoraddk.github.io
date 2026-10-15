import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateInitials } from './initials.js';

test('single word takes first two chars uppercased', () => {
    assert.equal(generateInitials('Mailchimp'), 'MA');
    assert.equal(generateInitials('Stripe'), 'ST');
});

test('two+ words takes first letter of first two words', () => {
    assert.equal(generateInitials('Open AI'), 'OA');
    assert.equal(generateInitials('  Open   AI Processor '), 'OA');
});

test('empty/missing title returns empty string', () => {
    assert.equal(generateInitials(''), '');
    assert.equal(generateInitials(undefined), '');
});

test('single-character title still produces exactly 2 characters', () => {
    assert.equal(generateInitials('A'), 'AA');
});
