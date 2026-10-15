// src/packages/purchase/service/service.js — /v1/billing/* on auth + PayPal JS SDK loader.
// requester() attaches the Supabase JWT itself for PUBLIC_AUTH_URL, so no token plumbing here.
import requester from '@/services/core/requester.js'

const API = import.meta.env.PUBLIC_AUTH_URL
const CLIENT_ID = import.meta.env.PUBLIC_PAYPAL_CLIENT_ID
// A sandbox client id talks to sandbox, a live one to live — the SDK URL itself is the same.
const PAYPAL_JS = 'https://www.paypal.com/sdk/js'

// Where buyers manage PayPal-side automatic payments (card, cancel) without going through us.
export const PAYPAL_AUTOPAY_URL = 'https://www.paypal.com/myaccount/autopay/'

export const billing = {
    checkout: (planId, interval) => requester().post(`${API}/v1/billing/checkout`, { planId, interval }),
    activate: (subscriptionId) => requester().post(`${API}/v1/billing/activate`, { subscriptionId }),
    subscription: () => requester().get(`${API}/v1/billing/subscription`),
    cancel: () => requester().post(`${API}/v1/billing/cancel`),
    // Quản trị (svc-purchase-manager) — worker kiểm quyền resource `billing` (list / update / cancel)
    all: () => requester().get(`${API}/v1/billing/all`),
    syncFor: (userId) => requester().post(`${API}/v1/billing/sync/${encodeURIComponent(userId)}`),
    cancelFor: (userId) => requester().post(`${API}/v1/billing/cancel/${encodeURIComponent(userId)}`),
}

/** Trang quản lý subscription trên PayPal (cho người bán) — sandbox / live theo `env` worker trả về. */
export const paypalSubscriptionUrl = (env, id) =>
    `https://www.${env === 'live' ? '' : 'sandbox.'}paypal.com/billing/subscriptions/${encodeURIComponent(id)}`

let _paypal = null

/** `window.paypal`, loading the subscription-mode SDK once. Must come from paypal.com — never bundled. */
export function loadPayPal() {
    if (!CLIENT_ID) return Promise.reject(new Error('PUBLIC_PAYPAL_CLIENT_ID is not set'))
    _paypal ??= new Promise((resolve, reject) => {
        if (window.paypal?.Buttons) { resolve(window.paypal); return }
        const params = new URLSearchParams({ 'client-id': CLIENT_ID, vault: 'true', intent: 'subscription', components: 'buttons' })
        const script = document.createElement('script')
        // A failed load must not stay cached — the next open retries from scratch.
        const fail = (message) => { _paypal = null; script.remove(); reject(new Error(message)) }
        script.src = `${PAYPAL_JS}?${params}`
        script.async = true
        script.onload = () => (window.paypal?.Buttons ? resolve(window.paypal) : fail('PayPal SDK loaded without Buttons'))
        script.onerror = () => fail('PayPal SDK failed to load')
        document.head.append(script)
    })
    return _paypal
}
