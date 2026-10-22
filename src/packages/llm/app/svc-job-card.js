// src/packages/llm/app/svc-job-card.js
//
// <svc-job-card> — card chi tiết 1 job, đầu view "Xem chi tiết" của <svc-talk> (trên <svc-progress>). Mobile-first:
// mặc định THU GỌN — phòng, trạng thái, mức kích hoạt, thanh tiến độ từng bước, và nút Duyệt ngay trong card (duyệt bước
// đang dừng → `resume-step`; duyệt kết quả → `approve` { expertReview? }, kèm ô xác nhận khi ngành đòi chuyên gia ký);
// lúc này host có attribute `collapsed` để nơi chứa ghim nó (sticky). Nút "more" mở phần đầy đủ: vì sao phòng này được
// giao, bàn giao nhận / gửi (kèm bản hiện hành). Slot mặc định = Chạy lại / Vẫn dùng được do svc-talk đặt vào.
// Job đã duyệt của phòng có bảng output (outline.recordable): icon lưu → `record`; đã lưu (createdPostId) → icon check.
// Thuần hiển thị — svc-talk nghe event rồi gọi service/talk.js.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-avatar.js'
import '@/packages/apex/web-button.js'
import '@/packages/apex/web-text.js'
import { callDone } from '../tool/waves.js'
import { hideCodes } from '../tool/codes.js'
import { jobProgress, rowState, routingOf } from '../tool/tasks.js'
import { cardTxt, chip, segBar, LEVEL_TONE, STATE_TONE } from './card-parts.js'
import styles from '../css/svc-cards.css?inline'

const TXT = {
    vi: {
        why: 'Vai trò', takes: 'Nhận bàn giao', gives: 'Gửi bàn giao', none: 'chưa có', needsCheck: 'cần xác minh',
        more: 'Xem thêm', less: 'Thu gọn',
        resumeText: 'Chờ duyệt để chạy bước tiếp', approveText: 'Xong — duyệt để giao kết quả',
        signOff: (who) => `Đã được ${who} xem và đồng ý`, signOffName: 'Họ tên người đã duyệt',
    },
    en: {
        why: 'Role', takes: 'Takes', gives: 'Hands off', none: 'not yet', needsCheck: 're-check',
        more: 'More', less: 'Less',
        resumeText: 'Approve to run the next step', approveText: 'Done — approve to hand it off',
        signOff: (who) => `Reviewed and agreed by ${who}`, signOffName: 'Name of the reviewer',
    },
}
const HANDOFF_TONE = { APPROVED: 'success', REQUIRES_VERIFICATION: 'warning' }

/** Bản hiện hành của 1 kind trong task: version cao nhất chưa SUPERSEDED (như worker artifacts.ts current). */
const currentOf = (artifacts, kind) =>
    (artifacts ?? []).filter((a) => a.kind === kind && a.status !== 'SUPERSEDED').sort((a, b) => b.version - a.version)[0]

export class SvcJobCard extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        job: { type: Object },
        outline: { type: Object },
        view: { type: Object },  // task view của job (null với job lẻ) — trạng thái, phân công, bàn giao
        face: { type: Object },  // { title, pics }
        why: { type: String },   // lý do Thư ký giao việc cho phòng này (field rationale của job Thư ký) — '' nếu không có
        approvable: { type: Boolean }, // nơi chứa cho phép duyệt ở đây (job chưa duyệt, sếp sửa được)
        busy: { type: Boolean },
        lang: { type: String }, ui: { type: String }, theme: { type: String },
        _more: { state: true },
        _signOffOk: { state: true },
        _signOffBy: { state: true },
    }

    constructor() {
        super()
        this.job = null; this.outline = null; this.view = null; this.face = null; this.why = ''
        this.approvable = false; this.busy = false
        this.lang = 'vi'; this.ui = 'pastel'; this.theme = ''
        this._more = false; this._signOffOk = false; this._signOffBy = ''
    }

    willUpdate(changed) {
        // Job khác → thu gọn lại, xác nhận chuyên gia của job trước không được dính sang.
        if (changed.has('job') && changed.get('job')?.id !== this.job?.id) { this._more = false; this._signOffOk = false; this._signOffBy = '' }
    }

    updated() { this.toggleAttribute('collapsed', !this._more) }

    get _fn() { return String(this.job?.division ?? '').split('.')[1] ?? '' }

    // Bước text đang dừng chờ sếp (step ảnh chọn AI / Bỏ qua vẫn ở <svc-progress>) — so Number(): pausedStepId có thể là "2.0".
    get _pausedText() {
        if (this.job.status !== 'awaiting_review') return null
        const step = this.outline.steps?.find((s) => Number(s.id) === Number(this.job.pausedStepId))
        return step?.type === 'text' ? step : null
    }

    get _canApprove() {
        return this.job.status === 'done' && !this.job.approved && !!(this.outline.output || this.outline.produces?.length)
    }

    get _signOffReady() { return !this.outline.review || (this._signOffOk && this._signOffBy.trim().length >= 2) }

    // 1 bước: xong khi mọi call có dữ liệu; đang làm khi job đang ở / dừng tại nó; lỗi khi call của nó vừa lỗi.
    _stepState(step) {
        const job = this.job
        const f = job.fields ?? {}
        const done = step.type === 'image' ? !!f.pics || job.imageChoice === 'skip' : (step.calls ?? []).every((c) => callDone(c, f))
        if (done || job.approved) return 'done'
        const here = job.status === `step${step.id}` || Number(job.pausedStepId) === Number(step.id)
        if (here) return job.error ? 'error' : 'active'
        return 'todo'
    }

    _emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }))
    }

    _approve() {
        if (!this._signOffReady) return
        this._emit('approve', this.outline.review ? { expertReview: { confirmed: true, by: this._signOffBy.trim() } } : {})
    }

    _rfRecord(t) {
        if (!this.job.approved || !this.outline.recordable) return ''
        const saved = !!this.job.createdPostId
        const busy = !saved && this.busy
        const label = (saved ? t.recorded : t.record).replace('{table}', this.outline.output?.table ?? '')
        return html`
            <button class="cd-icon-btn cd-record ${saved ? 'is-saved' : ''}" title=${label} aria-label=${label} ?disabled=${saved || busy}
                @click=${() => this._emit('record')}>
                <iconify-icon class=${busy ? 'cd-spin' : ''}
                    icon=${busy ? 'ri:loader-4-line' : 'ri:database-2-line'}></iconify-icon>
            </button>
        `
    }

    render() {
        if (!this.job || !this.outline) return html``
        const t = { ...cardTxt(this.lang), ...(TXT[this.lang] ?? TXT.vi) }
        const fn = this._fn
        const name = this.face?.title || this.outline.title?.[this.lang] || this.outline.title?.vi || fn
        const state = rowState(this.view?.fns?.find((s) => s.jobId === this.job.id), this.job)
        const r = routingOf(this.view)
        const level = r && fn in r.routing.levels ? (fn === r.routing.lead ? 'lead' : r.routing.levels[fn]) : null
        const progress = jobProgress(this.outline, this.job)
        const steps = (this.outline.steps ?? []).map((s) => ({ state: this._stepState(s), label: s[this.lang] ?? s.vi }))
        return html`
            <div class="cd-card is-job">
                <div class="cd-head">
                    <div class="cd-who">
                        <web-avatar src=${this.face?.pics || ''} name=${name} size="30px" ui=${this.ui} theme=${this.theme}></web-avatar>
                        <div class="cd-who-text">
                            <div class="cd-title cd-ellipsis">${name}</div>
                            <div class="cd-chips">
                                ${chip(t.state[state] ?? state, STATE_TONE[state])}
                                <span class="cd-count">${progress.done}/${progress.total}</span>
                            </div>
                        </div>
                    </div>
                    <div class="cd-head-side">
                        ${level ? chip(t.level[level], LEVEL_TONE[level]) : ''}
                        ${this._rfRecord(t)}
                        <button class="cd-icon-btn" aria-expanded=${this._more ? 'true' : 'false'}
                            title=${this._more ? t.less : t.more} aria-label=${this._more ? t.less : t.more}
                            @click=${() => { this._more = !this._more }}>
                            <iconify-icon icon=${this._more ? 'ri:arrow-up-s-line' : 'ri:more-fill'}></iconify-icon>
                        </button>
                    </div>
                </div>
                ${steps.length ? segBar(steps) : ''}
                ${this._more ? this._rfMore(t) : ''}
                ${this._rfAction(t)}
                <slot></slot>
            </div>
        `
    }

    // Phần đầy đủ (sau nút more): vì sao phòng này + bàn giao nhận / gửi.
    _rfMore(t) {
        // Nhận: kind phải có (needs) + kind dùng thêm đã có trong task (uses); gửi: kind job này viết khi được duyệt.
        const takes = this.view ? [...(this.outline.needs ?? []), ...(this.outline.uses ?? []).filter((k) => currentOf(this.view.artifacts, k))] : []
        const gives = this.view ? (this.outline.produces ?? []).map((p) => p.kind) : []
        return html`
            ${this.why ? html`<div class="cd-section"><span class="cd-label">${t.why}</span><span class="cd-text">${hideCodes(this.why)}</span></div>` : ''}
            ${takes.length ? html`<div class="cd-section"><span class="cd-label">${t.takes}</span>${this._handoffs(takes, t)}</div>` : ''}
            ${gives.length ? html`<div class="cd-section"><span class="cd-label">${t.gives}</span>${this._handoffs(gives, t)}</div>` : ''}
        `
    }

    _handoffs(kinds, t) {
        const label = (k) => this.view?.kinds?.[k]?.[this.lang] || this.view?.kinds?.[k]?.vi || k
        return html`<div class="cd-chips">${kinds.map((k) => {
            const a = currentOf(this.view?.artifacts, k)
            const tail = !a ? ` · ${t.none}` : a.status === 'REQUIRES_VERIFICATION' ? ` · ${t.needsCheck}` : ` · v${a.version}`
            return chip(`${label(k)}${tail}`, a ? HANDOFF_TONE[a.status] ?? 'neutral' : 'muted')
        })}</div>`
    }

    // Nút Duyệt trong card: duyệt bước đang dừng, hoặc duyệt kết quả (kèm xác nhận chuyên gia khi ngành đòi).
    _rfAction(t) {
        if (!this.approvable) return ''
        const resume = this._pausedText
        if (!resume && !this._canApprove) return ''
        const review = !resume && this.outline.review
        return html`
            ${review ? html`
                <div class="cd-signoff">
                    <label class="cd-signoff-check">
                        <input type="checkbox" .checked=${this._signOffOk} ?disabled=${this.busy}
                            @change=${(e) => { this._signOffOk = e.target.checked }}>
                        <span>${t.signOff(review[this.lang] || review.vi)}</span>
                    </label>
                    <web-text placeholder=${t.signOffName} .value=${this._signOffBy} height="32px" ?disabled=${this.busy}
                        @input=${(e) => { this._signOffBy = e.detail.value }}></web-text>
                </div>
            ` : ''}
            <div class="cd-action">
                <span class="cd-action-text">${resume ? t.resumeText : t.approveText}</span>
                <web-button type="fill" color="primary" height="30px" ui=${this.ui} theme=${this.theme}
                    ?loading=${this.busy} ?disabled=${this.busy || (!resume && !this._signOffReady)}
                    @click=${() => (resume ? this._emit('resume-step') : this._approve())}>
                    ${t.approve}
                </web-button>
            </div>
        `
    }
}

if (!customElements.get('svc-job-card')) customElements.define('svc-job-card', SvcJobCard)
export default SvcJobCard
