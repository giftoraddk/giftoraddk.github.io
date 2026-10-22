import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLingo, lingo, localizeNode } from './lingo.js';

test('isLingo accepts { vi, en } strings only — not txt bundles, data objects or arrays', () => {
    assert.equal(isLingo({ vi: 'Gói', en: 'Plans' }), true);
    assert.equal(isLingo({ en: 'Plans' }), true);
    assert.equal(isLingo({ vi: { a: 'x' }, en: { a: 'y' } }), false);
    assert.equal(isLingo({ id: 'd1', title: 'x' }), false);
    assert.equal(isLingo({}), false);
    assert.equal(isLingo(['vi']), false);
    assert.equal(isLingo('Plans'), false);
});

test('lingo picks the language, then vi, then en — and leaves plain values alone', () => {
    assert.equal(lingo({ vi: 'Gói', en: 'Plans' }, 'en'), 'Plans');
    assert.equal(lingo({ vi: 'Gói', en: 'Plans' }, 'fr'), 'Gói');
    assert.equal(lingo({ en: 'Plans' }, 'vi'), 'Plans');
    assert.equal(lingo('trivago', 'en'), 'trivago');
    assert.equal(lingo(undefined, 'en'), undefined);
});

test('localizeNode resolves node, group, overlay and prop texts; keeps plain nodes as the same object', () => {
    const raw = {
        id: 'plans', x: 1, title: { vi: 'Gói dịch vụ', en: 'Plans' }, tooltip: 'same',
        group: { type: 'g', title: { vi: 'Hệ thống', en: 'System' } },
        overlay: { type: 'component', title: { vi: 'Thanh toán', en: 'Checkout' }, properties: { heading: { vi: 'Sản phẩm', en: 'Products' }, txt: { vi: { a: 'x' } }, n: 3 } },
    };
    const en = localizeNode(raw, 'en');
    assert.equal(en.title, 'Plans');
    assert.equal(en.tooltip, 'same');
    assert.equal(en.group.title, 'System');
    assert.equal(en.overlay.title, 'Checkout');
    assert.equal(en.overlay.properties.heading, 'Products');
    assert.deepEqual(en.overlay.properties.txt, { vi: { a: 'x' } });
    assert.notEqual(en, raw);
    const plain = { id: 'x', title: 'trivago', overlay: { type: 'iframe', url: 'https://a' } };
    assert.equal(localizeNode(plain, 'en'), plain);
});

test('re-localizing a live node switches the config texts, keeps its place and what changed at runtime', () => {
    const raw = { id: 'account', title: { vi: 'Tài khoản', en: 'Account' }, tooltip: { vi: 'Đăng nhập', en: 'Sign in' } };
    const live = { ...localizeNode(raw, 'vi'), x: 420, tooltip: 'Ada Lovelace' }; // drifted, and wears the user's name
    const en = localizeNode(live, 'en', { raw, prev: 'vi' });
    assert.equal(en.title, 'Account');
    assert.equal(en.tooltip, 'Ada Lovelace');
    assert.equal(en.x, 420);
    assert.equal(localizeNode(en, 'en', { raw, prev: 'en' }), en); // same lang again → nothing to do
});
