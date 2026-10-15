import { test } from 'node:test'
import assert from 'node:assert/strict'
import { INTERVALS, PURCHASE, findByPlanId, findPlan, findPrice, trialDaysOf } from './plans.js'

test('every plan has a unique id and a price for each interval', () => {
    const ids = PURCHASE.plans.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const plan of PURCHASE.plans) {
        for (const interval of INTERVALS) {
            const price = plan.prices[interval]
            assert.ok(Number.isInteger(price?.amount) && price.amount > 0, `${plan.id}.${interval}.amount`)
            assert.ok(price.planIds && 'sandbox' in price.planIds && 'live' in price.planIds, `${plan.id}.${interval}.planIds`)
        }
        if (plan.featuresFrom) assert.ok(findPlan(plan.featuresFrom), `${plan.id}.featuresFrom`)
    }
})

test('findPrice rejects unknown plans and intervals', () => {
    assert.ok(findPrice('starter', 'year'))
    assert.equal(findPrice('starter', 'week'), null)
    assert.equal(findPrice('nope', 'month'), null)
    assert.equal(findPrice(undefined, undefined), null)
})

test('findByPlanId matches sandbox and live ids, ignores empty', () => {
    const price = PURCHASE.plans[0].prices.month
    const saved = { ...price.planIds }
    price.planIds.sandbox = 'P-sandbox'
    price.planIds.live = 'P-live'
    try {
        assert.deepEqual(findByPlanId('P-sandbox'), { plan: PURCHASE.plans[0], interval: 'month' })
        assert.deepEqual(findByPlanId('P-live'), { plan: PURCHASE.plans[0], interval: 'month' })
        assert.equal(findByPlanId(''), null)
        assert.equal(findByPlanId('P-other'), null)
    } finally {
        Object.assign(price.planIds, saved)
    }
})

test('trialDaysOf falls back to the global trial length', () => {
    assert.equal(trialDaysOf({}), PURCHASE.trialDays)
    assert.equal(trialDaysOf({ trialDays: 0 }), 0)
    assert.equal(trialDaysOf({ trialDays: 30 }), 30)
})
