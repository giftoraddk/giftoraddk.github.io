// src/packages/purchase/svc-purchase-manager.js
//
// <svc-purchase-manager> — thay svc-purchase-complete, 2 chế độ (`mode`, bỏ trống = tự chọn theo URL):
//
//   complete  PayPal `return_url` / `cancel_url` (/system/pricing?subscription_id=…) — chỉ khi PayPal chuyển cả trang thay vì
//             popup. Nhờ worker đọc lại subscription từ PayPal, không bao giờ tin query string. Xong phát
//             `purchase-complete` lên window (llm/service/hub.js cấp token, svc-purchase-plans cập nhật badge).
//   manage    quản lý tổng quát mọi gói user đã mua: KPI (đang trả phí, dùng thử, doanh thu định kỳ / tháng, cần xử
//             lý), cơ cấu theo gói, lọc + tìm, mỗi thuê bao 1 thẻ — đồng bộ lại từ PayPal, mở trên PayPal, huỷ gói.
//             Quyền trên resource `billing` (hook/AUTH_V2.rst): xem = `list`, đồng bộ = `update`, huỷ = `cancel`
//             (MANAGE); Super Admin qua hết. Worker (auth billing.ts) kiểm lại đúng các quyền đó.
//             Không có quyền đó (người mua bình thường) → "Gói của tôi": chỉ bản ghi của chính họ, qua đúng các
//             route của người mua (`subscription` / `activate` để đồng bộ / `cancel`) — chưa mua thì mời xem gói
//             (phát `purchase-pick`, preset mở node plans).
//
//   <svc-purchase-manager></svc-purchase-manager>                 (trang /system/pricing — tự chọn complete / manage)
//   <svc-purchase-manager mode="manage"></svc-purchase-manager>   (node `manager` của group Purchase System)
//
// Mobile first, Shadow DOM — breakpoint là container query trên chính component (panel svc-node hẹp lẫn trang rộng).
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-button.js'
import { auth } from '@/packages/auth/service/service.js'
import { can } from '@/packages/auth/tool/roles.js'
import { PAYPAL_AUTOPAY_URL, billing, paypalSubscriptionUrl } from './service/service.js'
import { ACTIVE_STATUSES, hasActivePlan } from './tool/billing.js'
import { PURCHASE, findPlan, findPrice } from './tool/plans.js'
import { formatDate, formatMoney, localize, monthlyAmount } from './tool/format.js'
import styles from './css/svc-purchase-manager.css?inline'
import { txtLingo } from '@/services/tools/lingo.js'

const POLL_MS = 1500
const POLL_MAX = 8 // ~12s — PayPal normally moves an approved subscription to ACTIVE within seconds

const TXT_STD = {
    vi: {
        // complete
        loading: 'Đang xác nhận thanh toán…',
        successTitle: 'Đã kích hoạt gói {plan}', trialSub: 'Bạn được dùng thử tới {date}.', activeSub: 'Cảm ơn bạn — gói đã sẵn sàng.',
        pendingTitle: 'Đang xử lý thanh toán', pendingSub: 'PayPal đang xác nhận. Trang sẽ tự cập nhật, bạn cũng có thể quay lại sau.',
        failedTitle: 'Thanh toán chưa hoàn tất', failedSub: 'Bạn chưa duyệt trên PayPal hoặc đã huỷ. Chưa có khoản nào bị trừ.',
        signinTitle: 'Cần đăng nhập', signinSub: 'Đăng nhập bằng tài khoản đã dùng để thanh toán để xem kết quả.',
        missingTitle: 'Không tìm thấy gói đăng ký',
        next: 'Tiếp tục', back: 'Quay lại bảng giá',
        // manage
        title: 'Quản lý gói', subs: 'thuê bao', reload: 'Tải lại', retry: 'Thử lại', close: 'Đóng',
        loadingList: 'Đang tải thuê bao…', errLoad: 'Không tải được danh sách', empty: 'Chưa có ai mua gói',
        noMatch: 'Không có thuê bao phù hợp', search: 'Tìm tên, email, mã subscription…',
        noPerm: 'Cần quyền Xem trên bảng billing (hoặc Super Admin)', signinManage: 'Đăng nhập để quản lý gói',
        kpiPaying: 'Đang trả phí', kpiTrial: 'Dùng thử', kpiMrr: 'Doanh thu / tháng', kpiAttention: 'Cần xử lý',
        mix: 'Cơ cấu theo gói', month: 'tháng', year: 'năm', perMonth: '/tháng', perYear: '/năm',
        filters: { all: 'Tất cả', active: 'Đang trả phí', trial: 'Dùng thử', attention: 'Cần xử lý', pending: 'Chờ duyệt', ended: 'Đã kết thúc' },
        states: { active: 'Đang hoạt động', trial: 'Dùng thử', attention: 'Cần xử lý', pending: 'Chờ duyệt', ended: 'Đã kết thúc' },
        renews: 'Gia hạn {date}', trialUntil: 'Dùng thử tới {date}', ended: 'Trạng thái PayPal: {status}',
        failed: '{n} lần thu tiền lỗi', updated: 'Cập nhật {date}', unknownPlan: 'Gói không rõ',
        sync: 'Đồng bộ từ PayPal', openPaypal: 'Mở trên PayPal', cancel: 'Huỷ gói',
        cancelAsk: 'Huỷ gói của {name}? PayPal ngừng thu tiền ngay, không hoàn lại kỳ đang chạy.',
        confirm: 'Huỷ gói', keep: 'Giữ lại', errAction: 'Thao tác thất bại',
        // own
        myTitle: 'Gói của tôi', mySub: 'Gói bạn đã mua', loadingOwn: 'Đang tải gói của bạn…', errOwn: 'Không tải được gói của bạn',
        noPlanTitle: 'Bạn chưa có gói nào', noPlanSub: 'Chọn một gói để bắt đầu — được dùng thử {days} ngày miễn phí.',
        endedSub: 'Gói trước đã kết thúc. Chọn gói mới bất cứ lúc nào.',
        seePlans: 'Xem các gói', changePlan: 'Đổi gói', managePaypal: 'Quản lý trên PayPal',
        cancelOwnAsk: 'Huỷ gói của bạn? Gói dừng ngay và PayPal sẽ không trừ tiền thêm.',
    },
    en: {
        loading: 'Confirming your payment…',
        successTitle: '{plan} plan activated', trialSub: 'Your trial runs until {date}.', activeSub: 'Thank you — your plan is ready.',
        pendingTitle: 'Payment processing', pendingSub: 'PayPal is confirming it. This page updates on its own — you can also come back later.',
        failedTitle: 'Payment not completed', failedSub: 'The subscription was not approved on PayPal or you cancelled. Nothing was charged.',
        signinTitle: 'Sign in required', signinSub: 'Sign in with the account you paid with to see the result.',
        missingTitle: 'Subscription not found',
        next: 'Continue', back: 'Back to pricing',
        title: 'Plan manager', subs: 'subscriptions', reload: 'Reload', retry: 'Retry', close: 'Close',
        loadingList: 'Loading subscriptions…', errLoad: 'Could not load subscriptions', empty: 'Nobody has bought a plan yet',
        noMatch: 'No matching subscription', search: 'Search name, email, subscription id…',
        noPerm: 'Needs View access on the billing table (or Super Admin)', signinManage: 'Sign in to manage plans',
        kpiPaying: 'Paying', kpiTrial: 'On trial', kpiMrr: 'Monthly revenue', kpiAttention: 'Needs attention',
        mix: 'Plan mix', month: 'monthly', year: 'yearly', perMonth: '/mo', perYear: '/yr',
        filters: { all: 'All', active: 'Paying', trial: 'Trial', attention: 'Attention', pending: 'Pending', ended: 'Ended' },
        states: { active: 'Active', trial: 'Trial', attention: 'Needs attention', pending: 'Pending approval', ended: 'Ended' },
        renews: 'Renews {date}', trialUntil: 'Trial until {date}', ended: 'PayPal status: {status}',
        failed: '{n} failed payments', updated: 'Updated {date}', unknownPlan: 'Unknown plan',
        sync: 'Sync from PayPal', openPaypal: 'Open in PayPal', cancel: 'Cancel plan',
        cancelAsk: 'Cancel the plan of {name}? PayPal stops charging now; the running period is not refunded.',
        confirm: 'Cancel plan', keep: 'Keep it', errAction: 'Action failed',
        myTitle: 'My plan', mySub: 'The plan you bought', loadingOwn: 'Loading your plan…', errOwn: 'Could not load your plan',
        noPlanTitle: 'You have no plan yet', noPlanSub: 'Pick a plan to start — with a free {days}-day trial.',
        endedSub: 'Your last plan has ended. Pick a new one any time.',
        seePlans: 'See plans', changePlan: 'Change plan', managePaypal: 'Manage on PayPal',
        cancelOwnAsk: 'Cancel your plan? It stops now and PayPal will not charge you again.',
    },
}

const FILTERS = ['all', 'active', 'trial', 'attention', 'pending', 'ended']
// Thứ tự trong danh sách: việc cần làm trước, đã kết thúc sau cùng
const RANK = { attention: 0, pending: 1, trial: 2, active: 3, ended: 4 }
const TONE = { active: '--color-success', trial: '--color-info', attention: '--color-warning', pending: '--color-secondary', ended: '--color-neutral' }

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const unixOf = (v) => (typeof v === 'number' ? v : v ? Math.floor(Date.parse(v) / 1000) || null : null)

/** Trạng thái hiển thị của 1 bản ghi billing — gộp status PayPal + trial + lỗi thu tiền. */
function stateOf(r, now = Date.now() / 1000) {
    if (r.status === 'suspended') return 'attention'
    if (ACTIVE_STATUSES.has(r.status)) {
        if (r.failed_payments) return 'attention'
        return r.trial_end && r.trial_end > now ? 'trial' : 'active'
    }
    if (r.status === 'approval_pending') return 'pending'
    return 'ended' // cancelled / expired
}

/** Số tiền 1 tháng của bản ghi đang trả phí (minor units), 0 khi gói không còn trong plans.js. */
function monthlyOf(r) {
    const hit = findPrice(r.plan_id, r.interval)
    return hit ? monthlyAmount(hit.price, r.interval) : 0
}

export class SvcPurchaseManager extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        mode: { type: String }, // '' (tự chọn) | 'complete' | 'manage'
        nextLink: { type: String }, backLink: { type: String },
        // complete
        _state: { state: true }, // 'loading' | 'success' | 'pending' | 'failed' | 'signin' | 'missing'
        _record: { state: true },
        // manage
        _perm: { state: true }, // null = đang kiểm tra | { signedIn, list, update, cancel } — !list = "Gói của tôi"
        _own: { state: true }, // "Gói của tôi": undefined = chưa tải | null = chưa từng mua | bản ghi billing của mình
        _items: { state: true },
        _env: { state: true },
        _loading: { state: true },
        _error: { state: true },
        _notice: { state: true },
        _filter: { state: true },
        _query: { state: true },
        _busy: { state: true }, // Map<userId, 'sync' | 'cancel'>
        _confirm: { state: true }, // userId đang hỏi xác nhận huỷ
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.mode = ''
        this.nextLink = '/'
        this.backLink = '/system/pricing'
        this._state = 'loading'
        this._record = null
        this._perm = null
        this._own = undefined
        this._me = null
        this._items = []
        this._env = 'sandbox'
        this._loading = false
        this._error = ''
        this._notice = ''
        this._filter = 'all'
        this._query = ''
        this._busy = new Map()
        this._confirm = ''
        this._alive = false
        this._onPurchased = () => { if (this._perm?.list) this._dcLoad(); else if (this._perm?.signedIn) this._dcOwn() }
    }

    connectedCallback() {
        super.connectedCallback()
        this._alive = true
        if (this._mode === 'complete') this._dcResolve()
        else {
            window.addEventListener('purchase-complete', this._onPurchased)
            this._dcManage()
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._alive = false
        window.removeEventListener('purchase-complete', this._onPurchased)
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    // Bỏ trống `mode`: có subscription_id trên URL = PayPal vừa chuyển về → complete, ngược lại → manage
    get _mode() {
        if (this.mode === 'complete' || this.mode === 'manage') return this.mode
        return new URLSearchParams(window.location.search).has('subscription_id') ? 'complete' : 'manage'
    }

    // ==========================================
    // DATA CORE FUNCTIONS
    // ==========================================

    async _dcResolve() {
        const id = new URLSearchParams(window.location.search).get('subscription_id')
        if (!id) { this._state = 'missing'; return }
        if (!(await auth.get())) { this._state = 'signin'; return }

        for (let i = 0; i < POLL_MAX && this._alive; i++) {
            const res = await billing.activate(id)
            if (!res.ok) { this._state = res.statusCode === 401 ? 'signin' : 'missing'; return }
            if (hasActivePlan(res.data)) {
                this._record = res.data
                this._state = 'success'
                window.dispatchEvent(new CustomEvent('purchase-complete', { detail: { subscriptionId: id, record: res.data } }))
                return
            }
            // Anything but "still waiting for approval" is final (cancelled / expired / suspended).
            if (res.data?.status !== 'approval_pending') { this._state = 'failed'; return }
            this._state = 'pending'
            await sleep(POLL_MS)
        }
    }

    async _dcManage() {
        const user = await auth.get()
        const active = user?.status === 'active'
        const has = (action) => active && can(user, 'billing', action)
        this._me = user ?? null
        this._perm = { signedIn: !!user, list: has('list'), update: has('update'), cancel: has('cancel') }
        if (this._perm.list) this._dcLoad()
        else if (user) this._dcOwn()
    }

    /** "Gói của tôi" — bản ghi billing của chính người gọi (route của người mua, không cần quyền `billing`). */
    async _dcOwn() {
        this._loading = true
        this._error = ''
        const res = await billing.subscription()
        this._loading = false
        if (!res.ok) { this._error = `${this._txt.errOwn}: ${res.message || res.statusCode}`; return }
        this._own = res.data ? this._comWithMe(res.data) : null
    }

    async _dcLoad() {
        this._loading = true
        this._error = ''
        const res = await billing.all()
        this._loading = false
        if (!res.ok) { this._error = `${this._txt.errLoad}: ${res.message || res.statusCode}`; return }
        this._env = res.data?.env ?? 'sandbox'
        this._items = res.data?.items ?? []
    }

    // ==========================================
    // DATA HEAD FUNCTIONS
    // ==========================================

    /**
     * Flow thao tác 1 thuê bao: (userId, 'sync' | 'cancel') -> gọi worker -> thay bản ghi trong danh sách
     */
    async _dhAct(userId, kind) {
        // [1] CHECK: 1 thao tác / thuê bao một lúc; không có quyền `billing` = thao tác trên gói của chính mình
        if (this._busy.has(userId)) return
        const self = !this._perm?.list
        this._confirm = ''
        this._notice = ''
        this._busy = new Map(this._busy).set(userId, kind)

        // [3] EXECUTE: worker đọc lại từ PayPal sau cả 2 thao tác — giữ nguyên tên/email đã join
        const res = self
            ? kind === 'cancel' ? await billing.cancel() : await billing.activate(this._own?.subscription_id)
            : kind === 'cancel' ? await billing.cancelFor(userId) : await billing.syncFor(userId)
        if (res.ok && res.data && self) {
            this._own = this._comWithMe(res.data)
            // Như svc-purchase: plans badge + gói của canvas (preset/mount.js) theo kịp
            if (kind === 'cancel') this.dispatchEvent(new CustomEvent('subscription-change', { detail: { record: res.data }, bubbles: true, composed: true }))
        } else if (res.ok && res.data) {
            this._items = this._items.map((r) => (r.user_id === userId ? { ...r, ...res.data } : r))
        } else {
            this._notice = `${this._txt.errAction}: ${res.message || res.statusCode}`
        }

        const busy = new Map(this._busy)
        busy.delete(userId)
        this._busy = busy
    }

    // ==========================================
    // COMPUTED FUNCTIONS
    // ==========================================

    _comName(r) { return r.display_name || r.username || r.email || r.user_id }

    // Bản ghi của mình không có tên/email kèm (route người mua không join profiles) — lấy từ phiên
    _comWithMe(record) {
        const me = this._me ?? {}
        return { ...record, user_id: me.id, email: me.email, display_name: me.display_name, username: me.username, avatar: me.avatar }
    }

    _emitPick() {
        this.dispatchEvent(new CustomEvent('purchase-pick', { detail: {}, bubbles: true, composed: true }))
    }

    _comStats(items) {
        const now = Date.now() / 1000
        const counts = Object.fromEntries(FILTERS.map((f) => [f, 0]))
        const mix = Object.fromEntries(PURCHASE.plans.map((p) => [p.id, { month: 0, year: 0 }]))
        let mrr = 0
        for (const r of items) {
            const s = stateOf(r, now)
            counts.all++
            counts[s]++
            if (s === 'active') mrr += monthlyOf(r)
            if (ACTIVE_STATUSES.has(r.status) && mix[r.plan_id] && r.interval in mix[r.plan_id]) mix[r.plan_id][r.interval]++
        }
        return { counts, mix, mrr }
    }

    _comVisible() {
        const q = this._query.trim().toLowerCase()
        const now = Date.now() / 1000
        return this._items
            .map((r) => ({ r, s: stateOf(r, now) }))
            .filter(({ r, s }) => (this._filter === 'all' || s === this._filter)
                && (!q || [r.display_name, r.username, r.email, r.subscription_id, r.user_id].some((v) => (v || '').toLowerCase().includes(q))))
            .sort((a, b) => RANK[a.s] - RANK[b.s] || (unixOf(b.r.updated_at) ?? 0) - (unixOf(a.r.updated_at) ?? 0))
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    render() {
        return this._mode === 'complete' ? this._rbComplete() : this._rbManage()
    }

    // ── complete ─────────────────────────────────────────────────────────────

    _rbComplete() {
        const t = this._txt
        const back = html`<web-button type="outline" color="base-content" width="100%" height="38px" @click=${() => { window.location.href = this.backLink }}>${t.back}</web-button>`
        switch (this._state) {
            case 'success': return this._rbSuccess()
            case 'pending': return this._rfState('ri:time-line', t.pendingTitle, t.pendingSub, 'is-pending')
            case 'failed': return this._rfState('ri:close-circle-line', t.failedTitle, t.failedSub, 'is-failed', back)
            case 'signin': return this._rfState('ri:user-line', t.signinTitle, t.signinSub, '', back)
            case 'missing': return this._rfState('ri:question-line', t.missingTitle, '', '', back)
            default: return this._rfState('ri:loader-4-line', t.loading, '', 'is-loading')
        }
    }

    _rbSuccess() {
        const t = this._txt
        const r = this._record
        const plan = localize(findPlan(r.plan_id)?.name, this.lang) || r.plan_id
        const sub = r.trial_end ? fill(t.trialSub, { date: formatDate(r.trial_end, this.lang) }) : t.activeSub
        return this._rfState('ri:checkbox-circle-line', fill(t.successTitle, { plan }), sub, 'is-success',
            html`<web-button type="fill" color="primary" width="100%" height="38px" @click=${() => { window.location.href = this.nextLink }}>${t.next}</web-button>`)
    }

    _rfState(icon, title, sub, cls = '', action = nothing) {
        return html`
            <div class="pk-wrap">
                <div class="pk-card ${cls}" role="status">
                    <iconify-icon class="pk-icon" icon=${icon}></iconify-icon>
                    <div class="pk-title">${title}</div>
                    ${sub ? html`<div class="pk-sub">${sub}</div>` : nothing}
                    ${action}
                </div>
            </div>
        `
    }

    // ── manage ───────────────────────────────────────────────────────────────

    _rbManage() {
        const t = this._txt
        const p = this._perm
        if (!p) return html`<div class="pm">${this._rbNote('ri:loader-4-line', t.loadingList, true)}</div>`
        if (!p.list) return p.signedIn ? this._rbOwn() : html`<div class="pm">${this._rbNote('ri:lock-line', t.signinManage)}</div>`
        const stats = this._comStats(this._items)
        const sub = html`${this._items.length} ${t.subs} · PayPal <span class="pm-env is-${this._env}">${this._env}</span>`
        return html`
            <div class="pm">
                ${this._rbHead(t.title, sub, () => this._dcLoad())}
                ${this._items.length ? html`${this._rbKpis(stats)}${this._rbMix(stats.mix)}` : nothing}
                <div class="pm-bar">
                    ${this._rbFilters(stats.counts)}
                    <label class="pm-search">
                        <iconify-icon icon="ri:search-line"></iconify-icon>
                        <input type="search" .value=${this._query} placeholder=${t.search} aria-label=${t.search}
                            @input=${(e) => { this._query = e.target.value }}>
                    </label>
                </div>
                ${this._rbNotice()}
                ${this._rbBody()}
            </div>
        `
    }

    // "Gói của tôi" — người mua không có quyền `billing`: đúng 1 thẻ của mình, hoặc lời mời xem gói
    _rbOwn() {
        const t = this._txt
        const r = this._own
        const s = r ? stateOf(r) : ''
        const live = r && s !== 'ended'
        let body
        if (this._loading && r === undefined) body = this._rbNote('ri:loader-4-line', t.loadingOwn, true)
        else if (this._error) body = html`
            <div class="pm-state is-error">
                <iconify-icon icon="ri:error-warning-line"></iconify-icon><span>${this._error}</span>
                <button type="button" class="pm-pill" @click=${() => this._dcOwn()}>${t.retry}</button>
            </div>`
        else if (!live) body = html`
            <div class="pm-state pm-cta">
                <iconify-icon icon="ri:vip-crown-2-line"></iconify-icon>
                <b>${t.noPlanTitle}</b>
                <span>${r ? t.endedSub : fill(t.noPlanSub, { days: PURCHASE.trialDays })}</span>
                <button type="button" class="pm-pill is-primary" @click=${this._emitPick}>${t.seePlans}</button>
            </div>
            ${r ? html`<div class="pm-list is-single">${this._rbCard(r, s, true)}</div>` : nothing}`
        else body = html`
            <div class="pm-list is-single">${this._rbCard(r, s, true)}</div>
            <button type="button" class="pm-pill pm-change" @click=${this._emitPick}>
                <iconify-icon icon="ri:exchange-line"></iconify-icon>${t.changePlan}
            </button>`
        return html`
            <div class="pm">
                ${this._rbHead(t.myTitle, t.mySub, () => this._dcOwn())}
                ${this._rbNotice()}
                ${body}
            </div>
        `
    }

    _rbNotice() {
        if (!this._notice) return nothing
        return html`
            <div class="pm-notice" role="alert">
                <iconify-icon icon="ri:error-warning-line"></iconify-icon><span>${this._notice}</span>
                <button type="button" class="pm-icon-btn" aria-label=${this._txt.close} @click=${() => { this._notice = '' }}>
                    <iconify-icon icon="ri:close-line"></iconify-icon>
                </button>
            </div>`
    }

    _rbNote(icon, text, spin = false) {
        return html`<div class="pm-state"><iconify-icon class=${spin ? 'pm-spin' : ''} icon=${icon}></iconify-icon><span>${text}</span></div>`
    }

    _rbHead(title, sub, onReload) {
        const t = this._txt
        return html`
            <div class="pm-head">
                <span class="pm-head-icon"><iconify-icon icon="ri:vip-crown-2-line"></iconify-icon></span>
                <div class="pm-head-title">
                    <span class="pm-h1">${title}</span>
                    <span class="pm-muted">${this._loading ? html`<iconify-icon class="pm-spin" icon="ri:loader-4-line"></iconify-icon>` : sub}</span>
                </div>
                <button type="button" class="pm-icon-btn" title=${t.reload} aria-label=${t.reload} ?disabled=${this._loading} @click=${onReload}>
                    <iconify-icon icon="ri:refresh-line"></iconify-icon>
                </button>
            </div>
        `
    }

    _rbKpis({ counts, mrr }) {
        const t = this._txt
        const tiles = [
            ['ri:vip-crown-2-line', counts.active, t.kpiPaying, 'active'],
            ['ri:hourglass-2-line', counts.trial, t.kpiTrial, 'trial'],
            ['ri:money-dollar-circle-line', formatMoney(mrr, PURCHASE.currency, this.lang), t.kpiMrr, ''],
            ['ri:alarm-warning-line', counts.attention, t.kpiAttention, 'attention'],
        ]
        return html`
            <div class="pm-kpis">
                ${tiles.map(([icon, value, label, filter]) => html`
                    <button type="button" class="pm-kpi" ?disabled=${!filter} aria-pressed=${filter && this._filter === filter ? 'true' : 'false'}
                        style=${filter ? `--tone:var(${TONE[filter]})` : '--tone:var(--color-primary)'}
                        @click=${() => { if (filter) this._filter = this._filter === filter ? 'all' : filter }}>
                        <iconify-icon icon=${icon}></iconify-icon>
                        <b>${value}</b>
                        <span>${label}</span>
                    </button>`)}
            </div>
        `
    }

    _rbMix(mix) {
        const t = this._txt
        const rows = PURCHASE.plans.map((p) => ({ name: localize(p.name, this.lang), ...mix[p.id] }))
        const max = Math.max(1, ...rows.map((r) => r.month + r.year))
        return html`
            <section class="pm-mix">
                <h3 class="pm-label">${t.mix}</h3>
                ${rows.map((r) => html`
                    <div class="pm-mix-row">
                        <span class="pm-mix-name">${r.name}</span>
                        <span class="pm-mix-bar" role="img" aria-label=${`${r.name}: ${r.month} ${t.month}, ${r.year} ${t.year}`}>
                            <span class="is-month" style="width:${(r.month / max) * 100}%"></span>
                            <span class="is-year" style="width:${(r.year / max) * 100}%"></span>
                        </span>
                        <span class="pm-mix-n">${r.month + r.year}</span>
                    </div>`)}
                <div class="pm-mix-legend"><span class="is-month"></span>${t.month}<span class="is-year"></span>${t.year}</div>
            </section>
        `
    }

    _rbFilters(counts) {
        const t = this._txt
        return html`
            <div class="pm-chips" role="tablist">
                ${FILTERS.filter((f) => f === 'all' || counts[f]).map((f) => html`
                    <button type="button" role="tab" class="pm-chip" aria-selected=${this._filter === f ? 'true' : 'false'}
                        @click=${() => { this._filter = f }}>
                        ${t.filters[f]}<span class="pm-chip-n">${counts[f]}</span>
                    </button>`)}
            </div>
        `
    }

    _rbBody() {
        const t = this._txt
        if (this._loading && !this._items.length) return this._rbNote('ri:loader-4-line', t.loadingList, true)
        if (this._error) return html`
            <div class="pm-state is-error">
                <iconify-icon icon="ri:error-warning-line"></iconify-icon><span>${this._error}</span>
                <button type="button" class="pm-pill" @click=${() => this._dcLoad()}>${t.retry}</button>
            </div>`
        if (!this._items.length) return this._rbNote('ri:shopping-bag-3-line', t.empty)
        const rows = this._comVisible()
        if (!rows.length) return this._rbNote('ri:search-line', t.noMatch)
        return html`<div class="pm-list">${rows.map(({ r, s }) => this._rbCard(r, s))}</div>`
    }

    /** 1 thuê bao. `self` = gói của chính người xem: đồng bộ / huỷ qua route người mua, link PayPal phía người mua. */
    _rbCard(r, s, self = false) {
        const t = this._txt
        const name = this._comName(r)
        const plan = findPlan(r.plan_id)
        const hit = findPrice(r.plan_id, r.interval)
        const busy = this._busy.get(r.user_id)
        const date = (v) => formatDate(unixOf(v), this.lang)
        const when = s === 'trial' ? fill(t.trialUntil, { date: date(r.trial_end) })
            : (s === 'active' || s === 'attention') && r.current_period_end ? fill(t.renews, { date: date(r.current_period_end) })
            : s === 'ended' ? fill(t.ended, { status: r.status }) : ''
        const canSync = (self || this._perm.update) && !!r.subscription_id
        const cancellable = (self || this._perm.cancel) && (hasActivePlan(r) || r.status === 'suspended')
        // Người mua quản lý thanh toán tự động của họ trên PayPal; người bán mở subscription trong dashboard
        const paypalUrl = self ? PAYPAL_AUTOPAY_URL : r.subscription_id ? paypalSubscriptionUrl(this._env, r.subscription_id) : ''
        return html`
            <article class="pm-card" style="--tone:var(${TONE[s]})" aria-busy=${busy ? 'true' : 'false'}>
                <header class="pm-card-head">
                    <span class="pm-avatar">${r.avatar ? html`<img src=${r.avatar} alt="" loading="lazy" referrerpolicy="no-referrer">` : String(name).slice(0, 1).toUpperCase()}</span>
                    <div class="pm-who">
                        <span class="pm-name">${name}</span>
                        ${r.email && r.email !== name ? html`<span class="pm-sub">${r.email}</span>` : nothing}
                    </div>
                    <span class="pm-status">${t.states[s]}</span>
                </header>

                <div class="pm-plan">
                    <span class="pm-plan-name">${plan ? localize(plan.name, this.lang) : t.unknownPlan}</span>
                    ${hit ? html`<span class="pm-price">${formatMoney(hit.price.amount, PURCHASE.currency, this.lang)}${r.interval === 'year' ? t.perYear : t.perMonth}</span>` : nothing}
                </div>
                <div class="pm-meta">
                    ${when ? html`<span>${when}</span>` : nothing}
                    ${r.failed_payments ? html`<span class="pm-warn"><iconify-icon icon="ri:error-warning-line"></iconify-icon>${fill(t.failed, { n: r.failed_payments })}</span>` : nothing}
                    ${r.updated_at ? html`<span class="pm-muted">${fill(t.updated, { date: date(r.updated_at) })}</span>` : nothing}
                </div>

                ${this._confirm === r.user_id ? html`
                    <div class="pm-confirm" role="alertdialog">
                        <span>${self ? t.cancelOwnAsk : fill(t.cancelAsk, { name })}</span>
                        <div class="pm-confirm-actions">
                            <button type="button" class="pm-pill" @click=${() => { this._confirm = '' }}>${t.keep}</button>
                            <button type="button" class="pm-pill is-danger" @click=${() => this._dhAct(r.user_id, 'cancel')}>${t.confirm}</button>
                        </div>
                    </div>` : html`
                    <div class="pm-actions">
                        ${canSync ? html`
                            <button type="button" class="pm-icon-btn" title=${t.sync} aria-label=${t.sync} ?disabled=${!!busy} @click=${() => this._dhAct(r.user_id, 'sync')}>
                                <iconify-icon class=${busy === 'sync' ? 'pm-spin' : ''} icon=${busy === 'sync' ? 'ri:loader-4-line' : 'ri:refresh-line'}></iconify-icon>
                            </button>` : nothing}
                        ${paypalUrl ? html`
                            <a class="pm-icon-btn" href=${paypalUrl} target="_blank" rel="noopener"
                                title=${self ? t.managePaypal : t.openPaypal} aria-label=${self ? t.managePaypal : t.openPaypal}>
                                <iconify-icon icon="ri:paypal-line"></iconify-icon>
                            </a>` : nothing}
                        ${cancellable ? html`
                            <button type="button" class="pm-cancel" ?disabled=${!!busy} @click=${() => { this._confirm = r.user_id }}>
                                <iconify-icon class=${busy === 'cancel' ? 'pm-spin' : ''} icon=${busy === 'cancel' ? 'ri:loader-4-line' : 'ri:close-circle-line'}></iconify-icon>${t.cancel}
                            </button>` : nothing}
                    </div>`}
            </article>
        `
    }
}

if (!customElements.get('svc-purchase-manager')) customElements.define('svc-purchase-manager', SvcPurchaseManager)
export default SvcPurchaseManager
