import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatMoney, localize, monthlyAmount, toMinor, yearlySavings } from './format.js'

test('formatMoney drops ".00" on whole amounts unless trim is off', () => {
    assert.equal(formatMoney(900, 'usd', 'en'), '$9')
    assert.equal(formatMoney(950, 'usd', 'en'), '$9.50')
    assert.equal(formatMoney(900, 'usd', 'en', { trim: false }), '$9.00')
})

test('formatMoney respects zero-decimal currencies', () => {
    // VND has no minor unit — 50000 is already đồng, not 500.00
    assert.match(formatMoney(50000, 'vnd', 'vi'), /50\.000/)
})

test('monthlyAmount divides annual prices by 12', () => {
    assert.equal(monthlyAmount({ amount: 10800 }, 'year'), 900)
    assert.equal(monthlyAmount({ amount: 1200 }, 'month'), 1200)
})

test('localize picks lang, falls back to vi then en, passes strings through', () => {
    assert.equal(localize({ vi: 'Xin chào', en: 'Hello' }, 'en'), 'Hello')
    assert.equal(localize({ vi: 'Xin chào', en: 'Hello' }, 'fr'), 'Xin chào')
    assert.equal(localize({ en: 'Hello' }, 'vi'), 'Hello')
    assert.equal(localize('plain', 'en'), 'plain')
    assert.deepEqual(localize({ vi: ['a'], en: ['b'] }, 'en'), ['b'])
    assert.equal(localize(null), '')
})

test('toMinor parses PayPal decimal strings per currency', () => {
    assert.equal(toMinor('12.00', 'usd'), 1200)
    assert.equal(toMinor('19.99', 'usd'), 1999)
    assert.equal(toMinor('50000', 'vnd'), 50000)
})

test('yearlySavings compares the annual price with 12 monthly payments', () => {
    assert.equal(yearlySavings({ month: { amount: 1200 }, year: { amount: 10800 } }), 25)
    assert.equal(yearlySavings({ month: { amount: 2400 }, year: { amount: 22800 } }), 21)
    assert.equal(yearlySavings({ month: { amount: 1200 }, year: { amount: 14400 } }), 0)
    assert.equal(yearlySavings({ month: { amount: 1200 } }), 0)
})
