// src/packages/purchase/svc-purchase-plans.js
//
// <svc-purchase-plans> — buy by plan: one Monthly / Yearly tab over every card (as on the /system pricing section), a
// Free card (PURCHASE.free — no price, no checkout) then the plans of tool/plans.js (glow + sparkle header in the plan's
// theme pair, "save %" tab, features in icon groups), current-plan badge + manage link. Picking emits cancelable
// `plan-select` / `plan-manage`; if nobody takes over, the <svc-purchase id="{checkout}"> of this document gets the
// matching `intent`. The Free card emits cancelable `plan-free`; untaken, it opens `freeHref` (the workspace trial).
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import 'iconify-icon'
import '@/packages/apex/web-slider.js'
import { auth } from '@/packages/auth/service/service.js'
import { billing } from './service/service.js'
import { PURCHASE, findPlan, trialDaysOf } from './tool/plans.js'
import { hasActivePlan } from './tool/billing.js'
import { formatMoney, localize, monthlyAmount, yearlySavings } from './tool/format.js'
import styles from './css/svc-purchase-plans.css?inline'
import { txtLingo } from '@/services/tools/util.js'

const TXT_STD = {
    vi: {
        heading: 'Bảng giá linh hoạt', headingBrand: 'Bảng giá linh hoạt từ {brand}', subheading: 'Dùng thử miễn phí {n} ngày, huỷ bất cứ lúc nào',
        perMonth: '/ tháng', billedYearly: 'Thanh toán theo năm', save: 'Tiết kiệm',
        monthly: 'Theo tháng', yearly: 'Theo năm', saveUpTo: 'tiết kiệm {n}%', interval: 'Kỳ thanh toán',
        billedYear: '*thanh toán {amount}/năm · dùng thử {n} ngày', billedMonth: '*thanh toán hằng tháng · dùng thử {n} ngày',
        freeNote: '*không cần thẻ, không ràng buộc',
        limits: 'Giới hạn gói', features: 'Tính năng', everything: 'Mọi thứ trong {plan}, cộng thêm…',
        startTrial: 'Dùng thử {n} ngày', subscribe: 'Đăng ký',
        freeStart: 'Bắt đầu miễn phí', freeOpen: 'Mở không gian làm việc',
        current: 'Gói hiện tại', manage: 'Quản lý gói', switchPlan: 'Đổi gói',
    },
    en: {
        heading: 'Flexible pricing', headingBrand: 'Tailor made pricing from {brand}', subheading: 'Free {n}-day trial, cancel any time',
        perMonth: '/ month', billedYearly: 'Billed annually', save: 'Save',
        monthly: 'Monthly', yearly: 'Yearly', saveUpTo: 'save {n}%', interval: 'Billing period',
        billedYear: '*billed {amount}/year · {n}-day trial', billedMonth: '*billed monthly · {n}-day trial',
        freeNote: '*no card, no commitment',
        limits: 'Plan limits', features: 'Features', everything: 'Everything in {plan} plus…',
        startTrial: 'Start {n}-day trial', subscribe: 'Subscribe',
        freeStart: 'Start for free', freeOpen: 'Open the workspace',
        current: 'Current plan', manage: 'Manage plan', switchPlan: 'Switch plan',
    },
}

// Card color pairs (theme names), cycled by position unless a plan sets its own `tints`.
const TINT_COLORS = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error']
const PLAN_TINTS = [['info', 'primary'], ['secondary', 'accent'], ['success', 'info']]
const FREE_TINTS = ['info', 'success']

// Sparkles are seeded by plan id — stable across renders, different per card.
const SPARKLE_COUNT = 16
const _sparkles = new Map()
function sparklesOf(id) {
    if (_sparkles.has(id)) return _sparkles.get(id)
    let seed = [...String(id)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0
    const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
    const dots = Array.from({ length: SPARKLE_COUNT }, () => {
        const y = 6 + rand() ** 1.6 * 60 // denser near the glow at the top
        return {
            x: (12 + rand() * 76).toFixed(1),
            y: y.toFixed(1),
            size: (1.2 + rand() * (y < 25 ? 2.6 : 1.4)).toFixed(1),
            alpha: (0.45 + rand() * 0.55).toFixed(2),
            delay: (rand() * 3).toFixed(2),
        }
    })
    _sparkles.set(id, dots)
    return dots
}

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

export class SvcPurchasePlans extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        brand: { type: String }, // "Tailor made pricing from {brand}"
        checkout: { type: String }, // id of the <svc-purchase> that handles picks by default
        heading: { type: String }, subheading: { type: String }, // override the default copy
        freeHref: { type: String, attribute: 'free-href' }, // where the Free card's button goes (the workspace trial)
        _yearly: { state: true }, // one Monthly / Yearly tab for every card (default yearly)
        _record: { state: true }, // caller's billing record (null = signed out / never bought)
        _signedIn: { state: true },
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.brand = ''
        this.checkout = ''
        this.heading = ''
        this.subheading = ''
        this.freeHref = '/system/ecommerce'
        this._yearly = true
        this._record = null
        this._signedIn = false
        this._dcRecord = this._dcRecord.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        this._dcRecord()
        // The checkout lives elsewhere (another panel or page section) — its events reach window, not this subtree.
        window.addEventListener('purchase-complete', this._dcRecord)
        window.addEventListener('login-success', this._dcRecord)
        window.addEventListener('subscription-change', this._dcRecord)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener('purchase-complete', this._dcRecord)
        window.removeEventListener('login-success', this._dcRecord)
        window.removeEventListener('subscription-change', this._dcRecord)
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcRecord() {
        this._signedIn = Boolean(await auth.get())
        if (!this._signedIn) { this._record = null; return }
        const res = await billing.subscription()
        this._record = res.ok ? res.data : null
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhInterval(yearly) {
        this._yearly = yearly
    }

    _dhSelect(plan) {
        this._dfIntent('plan-select', { planId: plan.id, interval: this._comInterval() })
    }

    /** Free: no checkout — hosts take over with preventDefault(), else the workspace trial opens. */
    _dhFree() {
        const event = new CustomEvent('plan-free', { detail: { href: this.freeHref }, bubbles: true, composed: true, cancelable: true })
        if (this.dispatchEvent(event) && this.freeHref) window.location.href = this.freeHref
    }

    _dhManage() {
        this._dfIntent('plan-manage', 'manage')
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    /** Hosts take over with preventDefault() (e.g. svc-node routing it to a checkout node's panel). */
    _dfIntent(name, intent) {
        const event = new CustomEvent(name, { detail: { intent }, bubbles: true, composed: true, cancelable: true })
        if (!this.dispatchEvent(event)) return
        const target = this.checkout ? document.getElementById(this.checkout) : null
        if (target) target.intent = intent
        else console.warn(`[svc-purchase-plans] ${name} unhandled — set "checkout" to an <svc-purchase> id or preventDefault() it`)
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }


    _comInterval() {
        return this._yearly ? 'year' : 'month'
    }

    /** The best yearly saving of any plan — the Yearly tab's "save n%". */
    get _comMaxSaving() {
        return Math.max(0, ...PURCHASE.plans.map((p) => yearlySavings(p.prices)))
    }

    /** "$9" in either language — the same figures as the /system pricing section (vi-VN would print "9 US$"). */
    _comMoney(minor) {
        return formatMoney(minor, PURCHASE.currency, 'en')
    }

    _comTints(plan, index) {
        const fallback = PLAN_TINTS[index % PLAN_TINTS.length]
        return fallback.map((c, i) => (TINT_COLORS.includes(plan.tints?.[i]) ? plan.tints[i] : c))
    }

    // ── Render Fragments ───────────────────────────────────────────────────────

    // "Starter · $9.00 / month · billed annually" — every card's buttons read alike, so their accessible name (what a
    // screen reader and svc-node's panel agent go by — "buy the $9 plan") says which plan, at what price, they are for.
    _comLabel(plan, interval = this._comInterval()) {
        const t = this._txt
        const price = this._comMoney(monthlyAmount(plan.prices[interval], interval))
        return [localize(plan.name, this.lang), `${price} ${t.perMonth}`, interval === 'year' ? t.billedYearly : ''].filter(Boolean).join(' · ')
    }

    _rfAction(plan) {
        const t = this._txt
        const active = hasActivePlan(this._record)
        const name = localize(plan.name, this.lang)
        if (active && this._record.plan_id === plan.id) {
            return html`
                <div class="pp-current"><iconify-icon icon="ri:checkbox-circle-fill"></iconify-icon>${t.current}</div>
                <button type="button" class="pp-cta" aria-label=${`${t.manage} — ${name}`} @click=${this._dhManage}>${t.manage}</button>
            `
        }
        // An active subscription can't open a second checkout (worker answers 409) — switching = cancel, then buy.
        if (active) return html`<button type="button" class="pp-cta" aria-label=${`${t.switchPlan} — ${name}`} @click=${this._dhManage}>${t.switchPlan}</button>`
        const days = trialDaysOf(plan)
        const cta = days ? fill(t.startTrial, { n: days }) : t.subscribe
        return html`
            <button type="button" class="pp-cta ${plan.featured ? 'is-featured' : ''}" aria-label=${`${cta} — ${this._comLabel(plan)}`}
                @click=${() => this._dhSelect(plan)}>${cta}</button>
        `
    }

    /** Header glow + sparkles, lit by the card's --pp-a/--pp-b. */
    _rfArt(id) {
        return html`
            <div class="pp-art" aria-hidden="true">
                ${sparklesOf(id).map((d) => html`<i class="pp-spark" style="left:${d.x}%; top:${d.y}%; --s:${d.size}px; --o:${d.alpha}; --d:${d.delay}s"></i>`)}
            </div>
        `
    }

    _rfList(title, items, icon = '') {
        if (!items?.length) return nothing
        return html`
            <section class="pp-section">
                <h4 class="pp-section-title">${icon ? html`<span class="pp-group-icon"><iconify-icon icon=${icon}></iconify-icon></span>` : nothing}${title}</h4>
                <ul class="pp-list">
                    ${items.map((f) => html`<li class="pp-item"><iconify-icon icon="ri:check-line"></iconify-icon><span>${f}</span></li>`)}
                </ul>
            </section>
        `
    }

    /** Limits, then the features — in icon groups (plan.groups) when the plan has them, else one plain list. */
    _rfFeatures(plan) {
        const t = this._txt
        const base = plan.featuresFrom ? findPlan(plan.featuresFrom) : null
        return html`
            ${this._rfList(t.limits, localize(plan.limits, this.lang), 'ri:dashboard-3-line')}
            ${base ? html`<p class="pp-from"><iconify-icon icon="ri:stack-line"></iconify-icon>${fill(t.everything, { plan: localize(base.name, this.lang) })}</p>` : nothing}
            ${plan.groups?.length
                ? plan.groups.map((g) => this._rfList(localize(g.title, this.lang), localize(g.items, this.lang), g.icon))
                : this._rfList(t.features, localize(plan.features, this.lang))}
        `
    }

    /** One Monthly / Yearly tab over every card — the yearly side says how much it saves. */
    _rfTabs() {
        const t = this._txt
        const save = this._comMaxSaving
        const tab = (yearly, label) => html`
            <button type="button" role="tab" class="pp-tab ${this._yearly === yearly ? 'is-active' : ''}" aria-selected=${this._yearly === yearly}
                @click=${() => this._dhInterval(yearly)}>
                ${label}${yearly && save ? html`<span class="pp-tab-save">${fill(t.saveUpTo, { n: save })}</span>` : nothing}
            </button>
        `
        return html`<div class="pp-tabs" role="tablist" aria-label=${t.interval}>${tab(false, t.monthly)}${tab(true, t.yearly)}</div>`
    }

    /** Free (PURCHASE.free): $0, no checkout — the current plan of anyone signed in without a paid one. */
    _rfFreeCard() {
        const t = this._txt
        const free = PURCHASE.free
        const current = this._signedIn && !hasActivePlan(this._record)
        const [a, b] = TINT_COLORS.includes(free.tints?.[0]) && TINT_COLORS.includes(free.tints?.[1]) ? free.tints : FREE_TINTS
        return html`
            <div class="pp-slide"><article class="pp-card ${current ? 'is-current' : ''}" style="--pp-a:var(--color-${a}); --pp-b:var(--color-${b})">
                ${this._rfArt(free.id)}
                <div class="pp-body">
                    <h3 class="pp-name">${localize(free.name, this.lang)}</h3>
                    <p class="pp-tagline">${localize(free.tagline, this.lang)}</p>
                    <div class="pp-price">
                        <span class="pp-amount">${this._comMoney(0)}</span>
                        <span class="pp-unit">${t.perMonth}</span>
                    </div>
                    <p class="pp-billing">${t.freeNote}</p>
                    <div class="pp-action">
                        ${current ? html`<div class="pp-current"><iconify-icon icon="ri:checkbox-circle-fill"></iconify-icon>${t.current}</div>` : nothing}
                        <button type="button" class="pp-cta" @click=${this._dhFree}>${this._signedIn ? t.freeOpen : t.freeStart}</button>
                    </div>
                    <hr class="pp-divider" />
                    ${this._rfFeatures(free)}
                </div>
            </article></div>
        `
    }

    _rfCard(plan, index) {
        const t = this._txt
        const interval = this._comInterval()
        const price = plan.prices[interval]
        const days = trialDaysOf(plan)
        const billingNote = interval === 'year'
            ? fill(t.billedYear, { amount: this._comMoney(price.amount), n: days })
            : fill(t.billedMonth, { n: days })
        const current = hasActivePlan(this._record) && this._record.plan_id === plan.id
        const save = interval === 'year' ? yearlySavings(plan.prices) : 0
        const [a, b] = this._comTints(plan, index)
        return html`
            <div class="pp-slide"><article class="pp-card ${current ? 'is-current' : ''} ${plan.featured ? 'is-featured' : ''}"
                style="--pp-a:var(--color-${a}); --pp-b:var(--color-${b})">
                ${this._rfArt(plan.id)}
                ${save ? html`<div class="pp-save"><span>${t.save}</span><strong>${save}%</strong></div>` : nothing}
                <div class="pp-body">
                    <h3 class="pp-name">${localize(plan.name, this.lang)}</h3>
                    <p class="pp-tagline">${localize(plan.tagline, this.lang)}</p>
                    <div class="pp-price">
                        <span class="pp-amount">${this._comMoney(monthlyAmount(price, interval))}</span>
                        <span class="pp-unit">${t.perMonth}</span>
                    </div>
                    <p class="pp-billing">${days ? billingNote : interval === 'year' ? t.billedYearly : ''}</p>
                    <div class="pp-action">${this._rfAction(plan)}</div>
                    <hr class="pp-divider" />
                    ${this._rfFeatures(plan)}
                </div>
            </article></div>
        `
    }

    render() {
        const t = this._txt
        const heading = this.heading || (this.brand ? fill(t.headingBrand, { brand: this.brand }) : t.heading)
        const sub = this.subheading || (PURCHASE.trialDays ? fill(t.subheading, { n: PURCHASE.trialDays }) : '')
        return html`
            <section class="pp-wrap">
                <header class="pp-head">
                    <h2 class="pp-heading">${heading}</h2>
                    ${sub ? html`<p class="pp-sub">${sub}</p>` : nothing}
                </header>
                ${this._rfTabs()}
                <web-slider class="pp-slider" ui=${this.ui} slides="1.5" spacing="16" offset="16" slide-max="360">
                    ${PURCHASE.free ? this._rfFreeCard() : nothing}
                    ${repeat(PURCHASE.plans, (p) => p.id, (p, i) => this._rfCard(p, i + 1))}
                </web-slider>
            </section>
        `
    }
}

if (!customElements.get('svc-purchase-plans')) customElements.define('svc-purchase-plans', SvcPurchasePlans)
export default SvcPurchasePlans
