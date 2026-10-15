import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    resolveLocale, resolvePreset, resolveMount, colorVars, safeUrl, tagsOf, priceOf, filterRecords,
} from './recursive-render.js'

test('resolveLocale picks lang → vi → first key, passes plain values through', () => {
    assert.equal(resolveLocale({ vi: 'Xin chào', en: 'Hello' }, 'en'), 'Hello')
    assert.equal(resolveLocale({ vi: 'Xin chào' }, 'en'), 'Xin chào')
    assert.equal(resolveLocale('plain', 'en'), 'plain')
    assert.deepEqual(resolveLocale({ a: 1 }, 'en'), { a: 1 })
})

test('resolvePreset caches per registry, still detects cycles and unknown names', () => {
    const presets = { base: { style: { padding: '1rem' } }, card: { extends: 'base', style: { color: 'red' } } }
    const first = resolvePreset('card', presets)
    assert.deepEqual(first.style, { padding: '1rem', color: 'red' })
    assert.equal(resolvePreset('card', presets), first)
    assert.throws(() => resolvePreset('a', { a: { extends: 'b' }, b: { extends: 'a' } }), /Circular/)
    assert.throws(() => resolvePreset('nope', {}), /Unknown preset/)
})

test('resolveMount splits host/inner and a node overrides its preset', () => {
    const presets = { box: { style: { position: 'absolute', padding: '1rem' } } }
    const { host, inner } = resolveMount({ preset: 'box', style: { padding: '2rem', width: '50%' } }, {}, presets)
    assert.deepEqual(host, { position: 'absolute', width: '50%' })
    assert.deepEqual(inner, { padding: '2rem', width: '100%' })
})

test('colorVars keeps the legacy "empty segment inherits the page theme" rule', () => {
    const vars = colorVars('', '')
    assert.equal(vars['--color-primary'], '')
    assert.equal(vars['--color-secondary'], '#f5465c')
    assert.equal(vars['--color-base-content'], 'inherit')
    assert.equal(colorVars('#111|#222', '#fff')['--color-secondary'], '#222')
})

test('safeUrl blocks script-capable schemes even when obfuscated with whitespace', () => {
    for (const ok of ['/product/a-1/', '#top', '?q=1', 'https://x.com', 'mailto:a@b.c', 'tel:+84', '//cdn.x.com/a']) {
        assert.equal(safeUrl(ok), ok)
    }
    for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', ' java\tscript:alert(1)', 'data:text/html,<b>', 'vbscript:x']) {
        assert.equal(safeUrl(bad), '#')
    }
    assert.equal(safeUrl(''), '#')
    assert.equal(safeUrl(undefined, '/'), '/')
})

test('tagsOf / priceOf follow the "a|b" and "price~cost~unit" conventions', () => {
    assert.deepEqual(tagsOf({ tags: 'a|b|' }), ['a', 'b'])
    assert.deepEqual(tagsOf({ tags: ['x'] }), ['x'])
    assert.deepEqual(tagsOf(null), [])
    assert.equal(priceOf({ pricing: '120000~90000~đ' }), 120000)
    assert.ok(Number.isNaN(priceOf({ pricing: 'n/a' })))
})

test('filterRecords: accent-insensitive text, any-of tags, [min, max) price range', () => {
    const rows = [
        { id: 1, title: 'Quà Sinh Nhật', tags: 'birthday|gift', pricing: '100~0' },
        { id: 2, title: 'Hoa cưới', tags: 'wedding', pricing: '500~0' },
        { id: 3, title: 'Thiệp', tags: 'gift', pricing: '50~0' },
    ]
    assert.equal(filterRecords(rows), rows)
    assert.deepEqual(filterRecords(rows, { search: 'sinh nhat' }).map(r => r.id), [1])
    assert.deepEqual(filterRecords(rows, { active: ['gift'] }).map(r => r.id), [1, 3])
    assert.deepEqual(filterRecords(rows, { range: { min: 50, max: 500 } }).map(r => r.id), [1, 3])
    assert.deepEqual(filterRecords(rows, { active: ['gift'], query: 'thiep' }).map(r => r.id), [3])
})
