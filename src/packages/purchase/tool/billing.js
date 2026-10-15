// Pure PayPal ↔ billing-record mapping, shared by auth (checkout/webhook) and the client (plan state).
import { findByPlanId } from './plans.js'
import { toMinor } from './format.js'

// Statuses that still count as "has the plan" — `approved` is the short gap before PayPal activates it.
export const ACTIVE_STATUSES = new Set(['active', 'approved'])

export const hasActivePlan = (record) => Boolean(record && ACTIVE_STATUSES.has(record.status))

/** 'live' | 'sandbox' — PAYPAL_ENV picks the API host and which planIds a plan uses. */
export const paypalEnv = (value = '') => (value === 'live' ? 'live' : 'sandbox')

const _cycle = (plan, tenure) => plan?.billing_cycles?.find((c) => c.tenure_type === tenure) ?? null

/** What a PayPal Billing Plan actually charges — the checkout panel shows this, never our config. */
export function planSummary(paypalPlan) {
    const regular = _cycle(paypalPlan, 'REGULAR')
    const trial = _cycle(paypalPlan, 'TRIAL')
    const price = regular?.pricing_scheme?.fixed_price
    const currency = price?.currency_code?.toLowerCase() ?? null
    return {
        currency,
        amount: price && currency ? toMinor(price.value, currency) : null,
        interval: regular?.frequency?.interval_unit?.toLowerCase() ?? null,
        intervalCount: regular?.frequency?.interval_count ?? null,
        trialDays: trial?.frequency?.interval_unit === 'DAY' ? trial.frequency.interval_count * (trial.total_cycles || 1) : 0,
        trialFree: !trial || !Number(trial.pricing_scheme?.fixed_price?.value ?? 0),
    }
}

/** '' when the PayPal plan matches our config, otherwise the first mismatch — a stale config must never undercharge. */
export function planMismatch(paypalPlan, { amount, interval, currency, trialDays }) {
    if (paypalPlan?.status !== 'ACTIVE') return `status ${paypalPlan?.status ?? 'missing'}`
    const s = planSummary(paypalPlan)
    if (s.currency !== currency) return `currency ${s.currency} ≠ ${currency}`
    if (s.amount !== amount) return `amount ${s.amount} ≠ ${amount}`
    if (s.interval !== interval || s.intervalCount !== 1) return `interval ${s.intervalCount}×${s.interval} ≠ 1×${interval}`
    if (s.trialDays !== trialDays || !s.trialFree) return `trial ${s.trialDays}d${s.trialFree ? '' : ' (paid)'} ≠ ${trialDays}d free`
    return ''
}

/** Subscription id a webhook event is about, or null when it doesn't touch a subscription. */
export function subscriptionIdOf(event) {
    const r = event?.resource ?? {}
    if (event?.event_type?.startsWith('BILLING.SUBSCRIPTION.')) return r.id ?? null
    // Recurring charges arrive as sales that point back to their subscription.
    if (event?.event_type?.startsWith('PAYMENT.SALE.')) return r.billing_agreement_id ?? null
    return null
}

const _unix = (iso) => (iso ? Math.floor(Date.parse(iso) / 1000) || null : null)

/** PayPal Subscription → the `billing/{userId}` document (timestamps in Unix seconds). */
export function toBillingRecord(sub) {
    const known = findByPlanId(sub?.plan_id)
    const info = sub?.billing_info ?? {}
    const nextBilling = _unix(info.next_billing_time)
    const regular = info.cycle_executions?.find((c) => c.tenure_type === 'REGULAR')
    const hasTrial = info.cycle_executions?.some((c) => c.tenure_type === 'TRIAL')
    // Still in the trial while no paid cycle has run — the first charge lands on next_billing_time.
    const inTrial = Boolean(hasTrial && regular && !regular.cycles_completed)
    return {
        provider: 'paypal',
        subscription_id: sub?.id ?? null,
        status: sub?.status?.toLowerCase() ?? null,
        plan_id: known?.plan.id ?? null,
        interval: known?.interval ?? null,
        paypal_plan_id: sub?.plan_id ?? null,
        trial_end: inTrial ? nextBilling : null,
        current_period_end: nextBilling,
        payer_id: sub?.subscriber?.payer_id ?? null,
        failed_payments: info.failed_payments_count ?? 0,
    }
}
