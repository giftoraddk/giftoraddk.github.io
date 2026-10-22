// src/packages/purchase/svc-purchase.js
//
// <svc-purchase> — PayPal checkout panel: plan summary + PayPal subscribe buttons, or the manage view
// (current plan / cancel). Spec: hook/PURCHASE.rst. Driven by one prop, `intent`:
//   null → idle hint · 'manage' → manage view · { planId, interval } → checkout for that price.
// The PayPal SDK refuses shadow roots, so this element must sit in the document's light tree (a page,
// or an svc-node overlay with `light: true`); the buttons render into its own light-DOM slot child.
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-button.js'
import '@/packages/auth/svc-auth.js'
import { auth } from '@/packages/auth/service/service.js'
import { PAYPAL_AUTOPAY_URL, billing, loadPayPal } from './service/service.js'
import { findPlan, findPrice } from './tool/plans.js'
import { clearPendingCheckout, savePendingCheckout } from './tool/pending-checkout.js'
import { hasActivePlan } from './tool/billing.js'
import { formatDate, formatMoney, localize } from './tool/format.js'
import styles from './css/svc-purchase.css?inline'
import { txtLingo } from '@/services/tools/lingo.js'

const TXT_STD = {
    vi: {
        plan: 'gói', freeTrial: 'Dùng thử miễn phí', close: 'Đóng',
        billedYearly: 'Thanh toán theo năm', billedMonthly: 'Thanh toán theo tháng',
        perMonth: 'mỗi tháng', perYear: '/năm', subtotal: 'Tạm tính',
        afterTrial: 'Tổng phải trả khi hết {n} ngày dùng thử', dueToday: 'Tổng phải trả hôm nay',
        legal: 'Khi đăng ký, bạn cho phép {brand} tự động trừ tiền mỗi kỳ qua PayPal cho tới khi bạn huỷ.',
        secure: 'Thanh toán an toàn qua PayPal',
        approving: 'Đang xác nhận với PayPal…',
        signinFirst: 'Đăng nhập để tiếp tục thanh toán',
        idleTitle: 'Chưa chọn gói', idleSub: 'Chọn một gói trong bảng giá để thanh toán.', pick: 'Chọn gói',
        subscribedTitle: 'Bạn đang có gói {plan}', subscribedSub: 'Muốn đổi gói, hãy huỷ gói hiện tại rồi chọn gói mới.',
        trialUntil: 'Dùng thử tới {date}', nextBilling: 'Kỳ thanh toán tiếp theo: {date}',
        cancel: 'Huỷ gói', cancelConfirm: 'Bấm lần nữa để huỷ', managePaypal: 'Quản lý trên PayPal',
        cancelledTitle: 'Đã huỷ gói', cancelledSub: 'PayPal sẽ không trừ tiền thêm. Bạn có thể chọn gói mới bất cứ lúc nào.',
        noPlanTitle: 'Bạn chưa có gói trả phí',
        doneTitle: 'Đã kích hoạt gói', doneTrial: 'Bạn được dùng thử tới {date}. Có thể huỷ bất cứ lúc nào trước ngày đó.', doneActive: 'Cảm ơn bạn — gói đã sẵn sàng sử dụng.',
        errLoad: 'Không tải được PayPal', errPay: 'PayPal chưa hoàn tất thanh toán. Vui lòng thử lại.', errUnknownPlan: 'Gói không tồn tại',
        errIneligible: 'PayPal không khả dụng trên trình duyệt này', errShadow: 'Không thể hiển thị PayPal ở vị trí này', brandFallback: 'chúng tôi',
    },
    en: {
        plan: 'plan', freeTrial: 'Free trial', close: 'Close',
        billedYearly: 'Billed annually', billedMonthly: 'Billed monthly',
        perMonth: 'per month', perYear: '/year', subtotal: 'Subtotal',
        afterTrial: 'Total due after trial ends in {n} days', dueToday: 'Total due today',
        legal: 'By subscribing, you allow {brand} to charge you through PayPal every billing period until you cancel.',
        secure: 'Secure payment with PayPal',
        approving: 'Confirming with PayPal…',
        signinFirst: 'Sign in to continue to checkout',
        idleTitle: 'No plan selected', idleSub: 'Pick a plan from the pricing table to check out.', pick: 'Pick a plan',
        subscribedTitle: 'You are on the {plan} plan', subscribedSub: 'To switch, cancel the current plan and pick a new one.',
        trialUntil: 'Trial until {date}', nextBilling: 'Next billing date: {date}',
        cancel: 'Cancel plan', cancelConfirm: 'Click again to cancel', managePaypal: 'Manage on PayPal',
        cancelledTitle: 'Plan cancelled', cancelledSub: 'PayPal will not charge you again. You can pick a new plan any time.',
        noPlanTitle: 'You have no paid plan yet',
        doneTitle: 'Your plan is active', doneTrial: 'Your trial runs until {date}. Cancel any time before then.', doneActive: 'Thank you — your plan is ready to use.',
        errLoad: 'Could not load PayPal', errPay: 'PayPal did not complete the payment. Please try again.', errUnknownPlan: 'Unknown plan',
        errIneligible: 'PayPal is not available in this browser', errShadow: 'PayPal cannot be shown in this spot', brandFallback: 'us',
    },
}

// PayPal only takes its own named colors — the button can't follow our CSS variables.
const BUTTON_STYLE = { layout: 'vertical', shape: 'rect', color: 'gold', label: 'subscribe', height: 40, tagline: false }

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const isCheckout = (intent) => Boolean(intent && typeof intent === 'object')

export class SvcPurchase extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        brand: { type: String }, // "you allow {brand} to charge you…"
        intent: { attribute: false }, // null | 'manage' | { planId, interval }
        _phase: { state: true }, // 'idle' | 'auth' | 'loading' | 'ready' | 'approving' | 'subscribed' | 'cancelled' | 'done' | 'error'
        _summary: { state: true }, // what the PayPal plan charges (worker reads it off the plan) — the only source for amounts
        _record: { state: true }, // billing record (manage view / after activation)
        _confirmCancel: { state: true },
        _error: { state: true },
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.brand = ''
        this.intent = null
        this._phase = 'idle'
        this._summary = null
        this._record = null
        this._confirmCancel = false
        this._error = ''
        this._buttons = null
        this._subscriptionId = null // pre-created on start, handed to the first PayPal click
        this._payHost = null
        this._syncedIntent = undefined
        this._run = 0 // bumps on every (re)start/disconnect — a stale async step checks it and bails
        this._onSignedIn = this._onSignedIn.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        // A sign-in anywhere on the page (the account panel, another tab's form…) carries a waiting checkout on — not
        // only the form rendered here. Both reach window: the events bubble, composed.
        window.addEventListener('login-success', this._onSignedIn)
        window.addEventListener('account-change', this._onSignedIn)
        this._dcSync() // also on reconnect — a suspended svc-node panel gets its buttons back
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener('login-success', this._onSignedIn)
        window.removeEventListener('account-change', this._onSignedIn)
        this._run++
        this._dfTeardown()
    }

    updated(changed) {
        if (changed.has('intent') && this.intent !== this._syncedIntent) this._dcSync()
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcSync() {
        this._dfTeardown()
        const intent = this._syncedIntent = this.intent
        const run = ++this._run
        this._error = ''
        this._summary = null
        this._record = null
        this._confirmCancel = false
        if (!intent) { this._phase = 'idle'; return }
        this._phase = 'loading'
        this._emit('purchase-open', { intent })
        if (isCheckout(intent) && !findPrice(intent.planId, intent.interval)) { this._fail(this._txt.errUnknownPlan); return }
        const user = await auth.get()
        if (run !== this._run) return
        if (!user) { this._dcAskSignIn(); return }
        if (isCheckout(intent)) this._dcStart(run)
        else this._dcManage(run)
    }

    /** true when `res` was a 401 and the panel went back to sign-in. */
    async _dcHandleAuth(res, run) {
        if (res.statusCode !== 401) return false
        // Expired session: clear the cached user first, or <svc-auth> would re-emit login-success from cache forever.
        await auth.clear()
        if (run === this._run) this._dcAskSignIn()
        return true
    }

    // Sign-in first. Google / the sign-up email reload the page — the plan is kept so the page can reopen this checkout.
    _dcAskSignIn() {
        this._phase = 'auth'
        if (isCheckout(this.intent)) savePendingCheckout(this.intent)
    }

    async _dcStart(run = this._run) {
        clearPendingCheckout() // signed in and on its way — nothing waits any more
        this._dfTeardown() // a retry must not render a second set of buttons into the same host
        this._phase = 'loading'
        this._error = ''
        if (this.getRootNode() !== document) { this._fail(this._txt.errShadow); return }
        const { planId, interval } = this.intent
        try {
            const [paypal, res] = await Promise.all([loadPayPal(), billing.checkout(planId, interval)])
            if (run !== this._run) return
            if (!res.ok) {
                if (res.statusCode === 409) { this._dcManage(run); return }
                if (await this._dcHandleAuth(res, run)) return
                this._fail(res.message || this._txt.errLoad)
                return
            }
            this._subscriptionId = res.data.subscriptionId
            this._summary = res.data.summary
            this._buttons = paypal.Buttons({
                style: BUTTON_STYLE,
                createSubscription: () => this._dfNextSubscription(planId, interval),
                onApprove: (data) => this._dfActivate(run, data.subscriptionID),
                onCancel: () => { if (run === this._run) this._emit('purchase-cancel', { intent: this.intent }) },
                onError: (err) => {
                    if (run !== this._run) return
                    console.error('[svc-purchase]', err)
                    this._error = this._txt.errPay
                    this._phase = 'ready'
                },
            })
            if (!this._buttons.isEligible()) { this._fail(this._txt.errIneligible); return }
            await this._buttons.render(this._dcPayHost())
            if (run === this._run) this._phase = 'ready'
        } catch (err) {
            if (run !== this._run) return
            console.error('[svc-purchase]', err)
            this._fail(err?.message || this._txt.errLoad)
        }
    }

    async _dcManage(run = this._run) {
        this._phase = 'loading'
        const res = await billing.subscription()
        if (run !== this._run) return
        if (!res.ok) {
            if (!(await this._dcHandleAuth(res, run))) this._fail(res.message || this._txt.errLoad)
            return
        }
        this._record = res.data
        this._phase = 'subscribed'
    }

    /** Light-DOM mount point, slotted into the shadow layout — the PayPal SDK needs a node outside any shadow root. */
    _dcPayHost() {
        if (!this._payHost) {
            this._payHost = document.createElement('div')
            this._payHost.slot = 'payment'
        }
        if (this._payHost.parentNode !== this) this.append(this._payHost)
        return this._payHost
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    // Only while this panel waits on a sign-in — its own form fires this twice (on the element and on window), and the
    // first call leaves 'auth' at once (_dcStart / _dcManage set 'loading' before their first await).
    _dhLoginSuccess() {
        if (this._phase !== 'auth' || !this.intent) return
        const run = this._run
        if (isCheckout(this.intent)) this._dcStart(run)
        else this._dcManage(run)
    }

    // login-success { profile } · account-change { user } (null on sign-out / a first check — nothing to carry on)
    _onSignedIn(e) {
        if (e.detail?.profile || e.detail?.user) this._dhLoginSuccess()
    }

    _dhPick() {
        this._emit('purchase-pick', {})
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    /** First click reuses the subscription made on start; after a cancelled popup a fresh one is created. */
    async _dfNextSubscription(planId, interval) {
        const ready = this._subscriptionId
        this._subscriptionId = null
        if (ready) return ready
        const res = await billing.checkout(planId, interval)
        if (!res.ok) throw new Error(res.message || this._txt.errPay)
        return res.data.subscriptionId
    }

    // Activation runs even if the panel closed mid-popup — the buyer already approved on PayPal.
    async _dfActivate(run, subscriptionId) {
        const intent = this.intent
        if (run === this._run) { this._phase = 'approving'; this._error = '' }
        const res = await billing.activate(subscriptionId)
        const stale = run !== this._run
        if (!res.ok || !hasActivePlan(res.data)) {
            if (!stale) { this._error = res.message || this._txt.errPay; this._phase = 'ready' }
            return
        }
        this._emit('purchase-complete', { intent, subscriptionId, record: res.data })
        if (stale) return
        this._record = res.data
        this._phase = 'done'
        this._dfTeardown()
    }

    async _dfCancel() {
        if (!this._confirmCancel) { this._confirmCancel = true; return }
        const run = this._run
        this._phase = 'approving'
        const res = await billing.cancel()
        if (run !== this._run) return
        this._confirmCancel = false
        if (!res.ok) { this._error = res.message || this._txt.errLoad; this._phase = 'subscribed'; return }
        this._record = res.data
        this._phase = 'cancelled'
        this._emit('subscription-change', { record: res.data })
    }

    _dfTeardown() {
        try { this._buttons?.close?.() } catch { /* already gone */ }
        this._buttons = null
        this._subscriptionId = null
        this._payHost?.replaceChildren()
        this._payHost?.remove()
    }

    _fail(message) {
        this._error = message
        this._phase = 'error'
    }

    // A detached panel (closed mid-popup) still reports — through window, where page listeners are.
    _emit(name, detail) {
        const event = new CustomEvent(name, { detail, bubbles: true, composed: true })
        if (this.isConnected) this.dispatchEvent(event)
        else window.dispatchEvent(event)
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    _comMoney(minor, opts) {
        return formatMoney(minor, this._summary.currency, this.lang, opts)
    }

    // ── Render Fragments ───────────────────────────────────────────────────────

    _rfRow(label, value, { cls = '', sub = '', valueSub = '' } = {}) {
        return html`
            <div class="pc-row ${cls}">
                <div class="pc-row-label">${label}${sub ? html`<div class="pc-row-sub">${sub}</div>` : nothing}</div>
                <div class="pc-row-value">${value}${valueSub ? html`<div class="pc-row-sub">${valueSub}</div>` : nothing}</div>
            </div>
        `
    }

    _rfNotice(icon, title, sub, action) {
        return html`
            <div class="pc-notice">
                <iconify-icon class="pc-notice-icon" icon=${icon}></iconify-icon>
                <div class="pc-notice-title">${title}</div>
                ${sub ? html`<div class="pc-notice-sub">${sub}</div>` : nothing}
                ${action ?? nothing}
            </div>
        `
    }

    _rfError() {
        return this._error ? html`<div class="pc-error" role="alert"><iconify-icon icon="ri:error-warning-line"></iconify-icon>${this._error}</div>` : nothing
    }

    _rfSkeleton() {
        return html`<div class="pc-summary pc-skeleton" aria-hidden="true"></div>`
    }

    // ── Render Body ────────────────────────────────────────────────────────────

    /** Plan name from our config; every amount from the PayPal plan (it's what gets charged). */
    _rbSummary() {
        const s = this._summary
        if (!s) return this._rfSkeleton()
        const t = this._txt
        const { plan } = findPrice(this.intent.planId, this.intent.interval)
        const yearly = s.interval === 'year'
        const perMonth = this._comMoney(yearly ? Math.round(s.amount / 12) : s.amount, { trim: false })
        const total = this._comMoney(s.amount, { trim: false })
        return html`
            <div class="pc-summary">
                ${this._rfRow(
                    html`<span class="pc-plan">${localize(plan.name, this.lang)} ${t.plan}</span>${s.trialDays ? html`<span class="pc-badge">${t.freeTrial}</span>` : nothing}`,
                    perMonth,
                    { cls: 'pc-row-plan', sub: yearly ? `${t.billedYearly} · ${total}${t.perYear}` : t.billedMonthly, valueSub: t.perMonth },
                )}
                <div class="pc-rule"></div>
                ${this._rfRow(t.subtotal, total, { cls: 'pc-row-sm' })}
                ${s.trialDays ? this._rfRow(fill(t.afterTrial, { n: s.trialDays }), total, { cls: 'pc-row-sm' }) : nothing}
                <div class="pc-rule"></div>
                ${this._rfRow(t.dueToday, html`<span class="pc-currency">${s.currency.toUpperCase()}</span> ${this._comMoney(s.trialDays ? 0 : s.amount, { trim: false })}`, { cls: 'pc-row-total' })}
            </div>
        `
    }

    _rbCheckout() {
        const t = this._txt
        const busy = this._phase === 'loading' || this._phase === 'approving'
        return html`
            ${this._rbSummary()}
            <div class="pc-pay ${busy ? 'is-loading' : ''}" aria-busy=${busy ? 'true' : 'false'}>
                <slot name="payment"></slot>
                ${this._phase === 'approving' ? html`<div class="pc-pay-status" role="status">${t.approving}</div>` : nothing}
            </div>
            ${this._rfError()}
            ${this._summary ? html`
                <p class="pc-legal">${fill(t.legal, { brand: this.brand || t.brandFallback })}</p>
                <div class="pc-secure"><iconify-icon icon="ri:lock-line"></iconify-icon>${t.secure}</div>
            ` : nothing}
        `
    }

    _rbManage() {
        const t = this._txt
        const r = this._record
        if (!hasActivePlan(r)) {
            return this._rfNotice('ri:vip-crown-line', t.noPlanTitle, '',
                html`<web-button type="outline" color="primary" width="100%" height="38px" @click=${this._dhPick}>${t.pick}</web-button>`)
        }
        const plan = localize(findPlan(r.plan_id)?.name, this.lang) || r.plan_id || ''
        const when = r.trial_end ? fill(t.trialUntil, { date: formatDate(r.trial_end, this.lang) })
            : r.current_period_end ? fill(t.nextBilling, { date: formatDate(r.current_period_end, this.lang) }) : ''
        const busy = this._phase === 'approving'
        return html`
            ${this._rfNotice('ri:vip-crown-line', fill(t.subscribedTitle, { plan }), [when, t.subscribedSub].filter(Boolean).join(' · '))}
            ${this._rfError()}
            <div class="pc-actions">
                <web-button type=${this._confirmCancel ? 'fill' : 'outline'} color="error" width="100%" height="38px"
                    ?loading=${busy} ?disabled=${busy} @click=${this._dfCancel}>${this._confirmCancel ? t.cancelConfirm : t.cancel}</web-button>
                <web-button type="outline" color="base-content" width="100%" height="38px"
                    @click=${() => window.open(PAYPAL_AUTOPAY_URL, '_blank', 'noopener')}>${t.managePaypal}</web-button>
            </div>
        `
    }

    _rbContent() {
        const t = this._txt
        const checkout = isCheckout(this.intent)
        switch (this._phase) {
            case 'idle':
                return this._rfNotice('ri:shopping-cart-2-line', t.idleTitle, t.idleSub,
                    html`<web-button type="fill" color="primary" width="100%" height="38px" @click=${this._dhPick}>${t.pick}</web-button>`)
            case 'auth':
                return html`
                    <div class="pc-auth-hint">${t.signinFirst}</div>
                    <svc-auth embedded guestOk lang=${this.lang} ui=${this.ui} theme=${this.theme} @login-success=${this._dhLoginSuccess}></svc-auth>
                `
            case 'subscribed':
                return this._rbManage()
            case 'cancelled':
                return this._rfNotice('ri:close-circle-line', t.cancelledTitle, t.cancelledSub,
                    html`<web-button type="fill" color="primary" width="100%" height="38px" @click=${this._dhPick}>${t.pick}</web-button>`)
            case 'done': {
                const trialEnd = this._record?.trial_end
                return this._rfNotice('ri:checkbox-circle-line', t.doneTitle,
                    trialEnd ? fill(t.doneTrial, { date: formatDate(trialEnd, this.lang) }) : t.doneActive)
            }
            case 'error':
                if (!this._summary) {
                    return this._rfNotice('ri:error-warning-line', this._error, '',
                        html`<web-button type="outline" color="base-content" width="100%" height="38px" @click=${() => this._dcSync()}>↻</web-button>`)
                }
                return this._rbCheckout()
            case 'approving':
                return checkout ? this._rbCheckout() : this._rbManage()
            default:
                return checkout ? this._rbCheckout() : this._rfSkeleton()
        }
    }

    render() {
        return html`<div class="pc-body">${this._rbContent()}</div>`
    }
}

if (!customElements.get('svc-purchase')) customElements.define('svc-purchase', SvcPurchase)
export default SvcPurchase
