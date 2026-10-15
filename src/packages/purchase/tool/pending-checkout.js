// src/packages/purchase/tool/pending-checkout.js
//
// A checkout waiting on a sign-in that leaves the page: Google sign-in and the sign-up email link both land back on a
// freshly loaded page, where the open checkout — and the plan it was for — are gone. <svc-purchase> keeps the plan here
// while it asks you to sign in; whoever hosts the checkout (the svc-node purchase preset) takes it on the next load and
// opens the checkout on it again. Only the plan id and interval, for 30 minutes — nothing that needs guarding.
// localStorage, not sessionStorage: the email link may open in a new tab.
import { findPrice } from './plans.js'

const KEY = 'purchase:pending-checkout'
const TTL_MS = 30 * 60 * 1000

/** Keeps `intent` ({ planId, interval }) until the page comes back signed in. */
export function savePendingCheckout(intent) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ planId: intent.planId, interval: intent.interval, at: Date.now() }))
    } catch { /* storage off (private mode) — the checkout just won't come back by itself */ }
}

export function clearPendingCheckout() {
    try { localStorage.removeItem(KEY) } catch { /* nothing kept */ }
}

/** The plan a checkout was waiting on — once (it is cleared), and only when fresh and still on sale. */
export function takePendingCheckout() {
    let saved = null
    try {
        saved = JSON.parse(localStorage.getItem(KEY) || 'null')
        localStorage.removeItem(KEY)
    } catch { return null }
    if (!saved || typeof saved.planId !== 'string' || typeof saved.interval !== 'string') return null
    if (!(Date.now() - Number(saved.at) < TTL_MS)) return null
    if (!findPrice(saved.planId, saved.interval)) return null
    return { planId: saved.planId, interval: saved.interval }
}
