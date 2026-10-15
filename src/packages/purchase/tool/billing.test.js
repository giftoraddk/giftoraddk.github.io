import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PURCHASE } from './plans.js'
import { hasActivePlan, paypalEnv, planMismatch, planSummary, subscriptionIdOf, toBillingRecord } from './billing.js'

// Shape of GET /v1/billing/plans/{id} — only the fields we read.
const paypalPlan = ({ value = '108.00', unit = 'YEAR', trialDays = 14, trialPrice = null, status = 'ACTIVE' } = {}) => ({
    status,
    billing_cycles: [
        ...(trialDays ? [{
            tenure_type: 'TRIAL', sequence: 1, total_cycles: 1,
            frequency: { interval_unit: 'DAY', interval_count: trialDays },
            ...(trialPrice ? { pricing_scheme: { fixed_price: { value: trialPrice, currency_code: 'USD' } } } : {}),
        }] : []),
        {
            tenure_type: 'REGULAR', sequence: trialDays ? 2 : 1, total_cycles: 0,
            frequency: { interval_unit: unit, interval_count: 1 },
            pricing_scheme: { fixed_price: { value, currency_code: 'USD' } },
        },
    ],
})

const starterYear = { amount: 10800, interval: 'year', currency: 'usd', trialDays: 14 }

test('paypalEnv only goes live when asked', () => {
    assert.equal(paypalEnv('live'), 'live')
    assert.equal(paypalEnv('sandbox'), 'sandbox')
    assert.equal(paypalEnv(''), 'sandbox')
    assert.equal(paypalEnv(undefined), 'sandbox')
})

test('hasActivePlan counts active/approved only', () => {
    for (const status of ['active', 'approved']) assert.equal(hasActivePlan({ status }), true)
    for (const status of ['approval_pending', 'suspended', 'cancelled', 'expired', undefined]) assert.equal(hasActivePlan({ status }), false)
    assert.equal(hasActivePlan(null), false)
})

test('planSummary reads the regular price and the trial length', () => {
    assert.deepEqual(planSummary(paypalPlan()), {
        currency: 'usd', amount: 10800, interval: 'year', intervalCount: 1, trialDays: 14, trialFree: true,
    })
    assert.equal(planSummary(paypalPlan({ trialDays: 0 })).trialDays, 0)
})

test('planMismatch accepts a matching plan and names the first difference', () => {
    assert.equal(planMismatch(paypalPlan(), starterYear), '')
    assert.match(planMismatch(paypalPlan({ status: 'INACTIVE' }), starterYear), /status/)
    assert.match(planMismatch(paypalPlan({ value: '99.00' }), starterYear), /amount/)
    assert.match(planMismatch(paypalPlan({ unit: 'MONTH' }), starterYear), /interval/)
    assert.match(planMismatch(paypalPlan({ trialDays: 7 }), starterYear), /trial/)
    assert.match(planMismatch(paypalPlan({ trialPrice: '1.00' }), starterYear), /paid/)
})

test('subscriptionIdOf finds the subscription for subscription and sale events', () => {
    assert.equal(subscriptionIdOf({ event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: { id: 'I-1' } }), 'I-1')
    assert.equal(subscriptionIdOf({ event_type: 'BILLING.SUBSCRIPTION.CANCELLED', resource: { id: 'I-2' } }), 'I-2')
    assert.equal(subscriptionIdOf({ event_type: 'PAYMENT.SALE.COMPLETED', resource: { id: 'SALE-1', billing_agreement_id: 'I-3' } }), 'I-3')
    assert.equal(subscriptionIdOf({ event_type: 'PAYMENT.SALE.COMPLETED', resource: { id: 'SALE-2' } }), null)
    assert.equal(subscriptionIdOf({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'O-1' } }), null)
})

const subscription = ({ status = 'ACTIVE', regularDone = 0, trial = true } = {}) => ({
    id: 'I-1',
    status,
    plan_id: 'P-starter-year',
    custom_id: 'u1',
    subscriber: { payer_id: 'PAYER1' },
    billing_info: {
        next_billing_time: '2030-03-17T10:00:00Z',
        failed_payments_count: 0,
        cycle_executions: [
            ...(trial ? [{ tenure_type: 'TRIAL', sequence: 1, cycles_completed: 1, cycles_remaining: 0, total_cycles: 1 }] : []),
            { tenure_type: 'REGULAR', sequence: trial ? 2 : 1, cycles_completed: regularDone, cycles_remaining: 0, total_cycles: 0 },
        ],
    },
})

test('toBillingRecord maps a trialing subscription back to our plan', () => {
    const price = PURCHASE.plans[0].prices.year
    const original = price.planIds.sandbox
    price.planIds.sandbox = 'P-starter-year'
    try {
        const nextBilling = Date.parse('2030-03-17T10:00:00Z') / 1000
        assert.deepEqual(toBillingRecord(subscription()), {
            provider: 'paypal', subscription_id: 'I-1', status: 'active', plan_id: 'starter', interval: 'year',
            paypal_plan_id: 'P-starter-year', trial_end: nextBilling, current_period_end: nextBilling,
            payer_id: 'PAYER1', failed_payments: 0,
        })
    } finally {
        price.planIds.sandbox = original
    }
})

test('toBillingRecord ends the trial once a paid cycle ran, and tolerates unknown plans', () => {
    const record = toBillingRecord(subscription({ regularDone: 1, status: 'CANCELLED' }))
    assert.equal(record.trial_end, null)
    assert.equal(record.status, 'cancelled')
    assert.equal(record.plan_id, null)
    assert.equal(record.paypal_plan_id, 'P-starter-year')
    assert.equal(toBillingRecord(subscription({ trial: false })).trial_end, null)
})
