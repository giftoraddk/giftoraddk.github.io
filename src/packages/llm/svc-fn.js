// src/packages/llm/svc-fn.js
//
// <svc-fn division="ecommerce.marketing"> — panel riêng của 1 phòng ban: giao 1 chủ đề → job đơn lẻ của phòng đó →
// xem tiến trình, sửa, duyệt trong <svc-progress>. Không phụ thuộc <svc-talk>: dùng chung service/talk.js của ngành
// (talkFor) — cùng hàng đợi, runner và state conductor `llm.<sector>` — nên job mở ở đây cũng hiện trong nhóm chat của
// ngành và ngược lại. Không có chuyên môn nào ở client (Worker giữ prompt). Super Admin có thêm tab Quản lý (<svc-division>).
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-text.js'
import '@/packages/apex/web-button.js'
import './app/svc-progress.js'
import './service/service.js'
import { subscribe as cdSubscribe } from '@/services/core/conductor.js'
import { txtLingo } from '@/services/tools/lingo.js'
import { toastEmit } from '@/services/tools/util.js'
import { DEFAULT_CHAIN } from '@/services/shared/tensor-api.js'
import { auth } from '@/packages/auth/service/service.js'
import { parseRoles } from '@/packages/auth/tool/roles.js'
import { talkFor } from './service/talk.js'
import { canonicalDivision, sectorOfDivision } from './tool/divisions.js'
import { fnIcon } from './tool/sectors.js'
import { takeCommand } from './tool/command.js'
import { trialLine } from './tool/trial.js'
import { downloadJobPdf } from './service/pdf.js'
import styles from './css/svc-fn.css?inline'

const MAX_JOBS = 30 // job gần nhất của phòng hiện trong danh sách — cũ hơn vẫn xem được trong nhóm chat của ngành

const TXT_STD = {
    vi: {
        work: 'Công việc', manage: 'Quản lý',
        placeholder: 'Giao chủ đề cho phòng này…', start: 'Bắt đầu',
        empty: 'Chưa có việc nào — giao 1 chủ đề để bắt đầu.',
        unavailable: 'Phòng ban này chưa mở cho tài khoản của bạn.',
        back: 'Quay lại',
        more: 'Xem đầy đủ', less: 'Thu gọn',
        pdf: 'Tải PDF', pdfFailed: 'Không xuất được PDF — thử lại sau',
        record: 'Lưu vào dữ liệu ({table})', recorded: 'Đã lưu vào dữ liệu ({table})',
        status: { running: 'Đang làm', review: 'Chờ duyệt bước', done: 'Chờ duyệt', approved: 'Đã duyệt', error: 'Lỗi' },
    },
    en: {
        work: 'Work', manage: 'Manage',
        placeholder: 'Give this department a topic…', start: 'Start',
        empty: 'No work yet — give it a topic to start.',
        unavailable: 'This department is not open to your account yet.',
        back: 'Back',
        more: 'Show all', less: 'Show less',
        pdf: 'Download PDF', pdfFailed: 'Couldn\'t export the PDF — try again later',
        record: 'Save to your data ({table})', recorded: 'Saved to your data ({table})',
        status: { running: 'Working', review: 'Step review', done: 'To approve', approved: 'Approved', error: 'Error' },
    },
}

/** Nhãn trạng thái 1 job — từ status Worker tính (D6) + lỗi call gần nhất. */
const stateOf = (job) => {
    if (job.approved) return 'approved'
    if (job.error) return 'error'
    if (job.status === 'awaiting_review') return 'review'
    if (job.status === 'done') return 'done'
    return 'running'
}

export class SvcFn extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        ui:       { type: String },
        theme:    { type: String },
        lang:     { type: String },
        txt:      { type: Object },
        embedded: { type: Boolean, reflect: true },
        division: { type: String }, // '<sector>.<fn>' (id cũ 'marketing'… vẫn nhận)
        // { id, text } — chủ đề <svc-ask> giao cho phòng (node có `chat`): mở thành 1 job như bấm Bắt đầu, 1 lần mỗi id
        command:  { attribute: false },
        // Chế độ dùng thử (page /system/<sector>): 1 job riêng của phòng này mỗi tài khoản — Worker đếm (fn/trial.ts).
        trial:    { type: Boolean },
        // mirror conductor section llm.<sector> (service/talk.js ghi)
        _log:               { state: true },
        _divisions:         { state: true },
        _runningSub:        { state: true },
        _pendingJobs:       { state: true },
        _regeneratingImage: { state: true },
        _trialUsage:        { state: true },
        // UI cục bộ
        _draft:    { state: true },
        _openId:   { state: true }, // job đang mở chi tiết, '' = danh sách
        _tab:      { state: true }, // 'work' | 'manage'
        _admin:    { state: true },
        _starting: { state: true },
        _aboutOpen: { state: true }, // mô tả phòng: 1 dòng "…" ↔ đầy đủ
        _pdfId:    { state: true }, // job đang xuất PDF, '' = không
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.embedded = false
        this.division = ''
        this.command = null
        this.trial = false
        this._talk = null
        this._unsub = null
        this._draft = ''
        this._openId = ''
        this._tab = 'work'
        this._admin = false
        this._starting = false
        this._aboutOpen = false
        this._pdfId = ''
        this._dcSync({})
        this._dcPerms = this._dcPerms.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        this._dcBind()
        this._dcPerms()
        window.addEventListener('login-success', this._dcPerms)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._unsub?.()
        window.removeEventListener('login-success', this._dcPerms)
    }

    willUpdate(changed) {
        if (changed.has('division') && this.isConnected) this._dcBind()
        if (changed.has('trial') && this._talk) this._talk.setTrial(this.trial)
        // Tên/mô tả phòng ban do service dịch sẵn — báo ngôn ngữ mới để nó dựng lại.
        if (changed.has('lang')) this._talk?.setLang(this.lang)
        if (changed.has('command')) this._dhCommand()
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    get _id() { return canonicalDivision(this.division) }

    // Gắn vào service của đúng ngành — lần đầu và mỗi khi `division` đổi sang ngành khác.
    _dcBind() {
        const sector = sectorOfDivision(this.division)
        if (!sector || this._talk?.sector === sector) return
        this._unsub?.()
        this._talk = talkFor(sector, { trial: this.trial })
        this._dcSync(this._talk.state)
        this._unsub = cdSubscribe(this._talk.section, () => this._dcSync(this._talk.state))
        this._talk.load(this.lang)
        this._talk.setLang(this.lang) // service của ngành đã tải từ trước (nhóm chat) có thể đang ở ngôn ngữ khác
    }

    _dcSync(s) {
        this._log = s.log ?? []
        this._divisions = s.divisions ?? []
        this._runningSub = s.runningSub ?? {}
        this._pendingJobs = s.pendingJobs ?? new Set()
        this._regeneratingImage = !!s.regeneratingImage
        this._trialUsage = s.trialUsage ?? null
    }

    // Tab Quản lý chỉ là lối tắt UI — Worker /v1/fn/override vẫn tự kiểm admin.
    async _dcPerms() {
        const user = await auth.get()
        this._admin = user?.status === 'active' && parseRoles(user).isAdmin
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    async _dhStart() {
        const topic = this._draft.trim()
        if (!topic || this._starting || !this._talk) return
        this._starting = true
        try {
            const job = await this._talk.startJob(this._id, topic)
            if (job) {
                this._draft = ''
                this._openId = job.id
            }
        } finally {
            this._starting = false
        }
    }

    _dhKeydown(e) {
        if (e.key === 'Enter' && !e.isComposing) this._dhStart()
    }

    // Chủ đề từ <svc-ask> — đi đúng đường của ô nhập (đang khởi tạo 1 job khác thì chủ đề nằm lại trong ô, bấm Bắt đầu sau).
    _dhCommand() {
        const topic = takeCommand(this.command)
        if (!topic) return
        this._tab = 'work'
        this._draft = topic
        this._dhStart()
    }

    // Duyệt xong → phát 'fn-approved' { division, jobId } (bubbles, composed). Về danh sách — dòng job hiện nút lưu vào
    // bảng output (_dhRecord) nếu phòng có bảng và người dùng được ghi.
    async _dhApprove(jobId, expertReview) {
        await this._talk.approve(jobId, expertReview)
        const job = this._jobs.find((j) => j.id === jobId)
        if (!job?.approved) return // lỗi (vd thiếu xác nhận) → giữ chi tiết mở
        this._openId = ''
        this.dispatchEvent(new CustomEvent('fn-approved', { detail: { division: this._id, jobId }, bubbles: true, composed: true }))
    }

    // Lưu xong → phát 'fn-recorded' { division, jobId, table, recordId } (bubbles, composed) — nơi nhúng panel (vd
    // <svc-records> "Tạo bằng AI") tải lại bảng Worker vừa ghi.
    async _dhRecord(job) {
        const recordId = await this._talk.record(job.id)
        if (!recordId) return
        this.dispatchEvent(new CustomEvent('fn-recorded', {
            detail: { division: this._id, jobId: job.id, table: this._dept?.outline?.output?.table ?? '', recordId }, bubbles: true, composed: true,
        }))
    }

    // Topic đã xong (chờ duyệt hoặc đã duyệt) → PDF đúng nội dung trong "Xem chi tiết".
    async _dhPdf(job) {
        if (this._pdfId) return
        this._pdfId = job.id
        try {
            await downloadJobPdf({ job, outline: this._dept?.outline, department: this._dept?.title || '', lang: this.lang })
        } catch (err) {
            console.error('[llm/fn] PDF export failed:', err)
            toastEmit(this._txt.pdfFailed, 'error')
        } finally {
            this._pdfId = ''
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _dept() { return this._talk?.division(this._id) ?? null }

    /** Job của riêng phòng này, mới nhất trước. */
    get _jobs() {
        const id = this._id
        return this._log.filter((d) => d.kind === 'job' && canonicalDivision(d.division) === id).reverse().slice(0, MAX_JOBS)
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        const t = this._txt
        const dept = this._dept
        return html`
            <div class="fn-panel">
                <div class="fn-head">
                    <div class="fn-heading">
                        ${this._rfIcon(dept)}
                        ${dept?.description ? html`
                            <button class="fn-about ${this._aboutOpen ? 'is-open' : ''}" aria-expanded=${this._aboutOpen}
                                title=${this._aboutOpen ? t.less : t.more}
                                @click=${() => { this._aboutOpen = !this._aboutOpen }}>${dept.description}</button>
                        ` : nothing}
                    </div>
                    ${this._admin ? html`
                        <div class="fn-tabs" role="tablist">
                            ${['work', 'manage'].map((tab) => html`
                                <button role="tab" class="fn-tab ${this._tab === tab ? 'is-active' : ''}" aria-selected=${this._tab === tab}
                                    @click=${() => { this._tab = tab }}>${t[tab]}</button>
                            `)}
                        </div>
                    ` : nothing}
                </div>
                ${this._tab === 'manage' && this._admin ? this._rbManage() : this._rbWork(dept)}
            </div>
        `
    }

    // Cùng icon với node của phòng trên canvas (tool/sectors.js fnIcon) — tên phòng đã nằm trên thanh tiêu đề popover.
    _rfIcon(dept) {
        const name = dept?.title || this._id
        return html`
            <span class="fn-icon" role="img" aria-label=${name} title=${name}>
                ${dept?.pics
                    ? html`<img src=${dept.pics} alt="" loading="lazy">`
                    : html`<iconify-icon icon=${fnIcon(dept ?? { fn: this._id.split('.')[1] })}></iconify-icon>`}
            </span>
        `
    }

    _rbWork(dept) {
        const t = this._txt
        if (!dept?.outline) return html`<div class="fn-empty">${this._divisions.length ? t.unavailable : '…'}</div>`
        const open = this._openId && this._jobs.find((j) => j.id === this._openId)
        if (open) return this._rbDetail(open, dept)
        const jobs = this._jobs
        const trial = this.trial ? trialLine(this._trialUsage, this.lang, dept.fn) : ''
        return html`
            ${trial ? html`<div class="fn-trial"><iconify-icon icon="ri:flask-line"></iconify-icon>${trial}</div>` : nothing}
            <div class="fn-composer">
                <web-text placeholder=${t.placeholder} .value=${this._draft} height="36px"
                    @input=${(e) => { this._draft = e.detail.value }} @keydown=${this._dhKeydown}></web-text>
                <web-button type="fill" color="primary" height="36px" ui=${this.ui} theme=${this.theme}
                    ?loading=${this._starting} ?disabled=${this._starting || !this._draft.trim()}
                    @click=${this._dhStart}>${t.start}</web-button>
            </div>
            <div class="fn-list">
                ${jobs.length ? jobs.map((j) => this._rfJob(j)) : html`<div class="fn-empty">${t.empty}</div>`}
            </div>
        `
    }

    _rfJob(job) {
        const t = this._txt
        const state = stateOf(job)
        const done = job.status === 'done' && !job.error
        const open = () => { this._openId = job.id }
        // Cả dòng bấm được (mở chi tiết); nút PDF nằm trong dòng nên dòng là div role=button — không lồng <button>.
        return html`
            <div class="fn-job" role="button" tabindex="0" @click=${open}
                @keydown=${(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open() } }}>
                <span class="fn-job-topic">${job.topic}</span>
                <span class="fn-job-side">
                    ${done ? html`
                        <button class="fn-pdf" title=${t.pdf} aria-label=${t.pdf} ?disabled=${!!this._pdfId}
                            @click=${(e) => { e.stopPropagation(); this._dhPdf(job) }}>
                            <iconify-icon class=${this._pdfId === job.id ? 'is-spin' : ''} icon=${this._pdfId === job.id ? 'ri:loader-4-line' : 'ri:file-pdf-2-line'}></iconify-icon>
                        </button>
                    ` : nothing}
                    ${this._rfRecord(job)}
                    <span class="fn-badge is-${state}">${t.status[state]}</span>
                </span>
            </div>
        `
    }

    // Job đã duyệt của phòng có bảng output (products, posts…) mà người dùng được ghi: icon lưu → đã lưu thì màu success (disabled).
    _rfRecord(job) {
        const outline = this._dept?.outline
        if (!job.approved || !outline?.recordable) return nothing
        const t = this._txt
        const saved = !!job.createdPostId
        const busy = !saved && this._pendingJobs.has(job.id)
        const label = (saved ? t.recorded : t.record).replace('{table}', outline.output?.table ?? '')
        return html`
            <button class="fn-pdf fn-record ${saved ? 'is-saved' : ''}" title=${label} aria-label=${label} ?disabled=${saved || busy}
                @click=${(e) => { e.stopPropagation(); this._dhRecord(job) }}>
                <iconify-icon class=${busy ? 'is-spin' : ''}
                    icon=${busy ? 'ri:loader-4-line' : 'ri:database-2-line'}></iconify-icon>
            </button>
        `
    }

    // Cùng <svc-progress> + cùng hành động với "Xem chi tiết" của nhóm chat — mọi thao tác đi qua service/talk.js.
    _rbDetail(doc, dept) {
        const t = this._txt
        const talk = this._talk
        return html`
            <div class="fn-detail-head">
                <button class="fn-back" aria-label=${t.back} title=${t.back} @click=${() => { this._openId = '' }}>
                    <iconify-icon icon="ri:arrow-left-line"></iconify-icon>
                </button>
                <span class="fn-detail-title">${doc.topic}</span>
            </div>
            <div class="fn-detail">
                <svc-progress .outline=${dept.outline} .doc=${doc} .runningSub=${this._runningSub}
                    editable approvable
                    ?regeneratingImage=${this._regeneratingImage} ?busy=${this._pendingJobs.has(doc.id)}
                    ai=${DEFAULT_CHAIN} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                    @field-change=${(e) => talk.setField(doc.id, e.detail.key, e.detail.value)}
                    @retry-step=${() => talk.retry(doc.id)}
                    @regenerate-image=${() => talk.regenerateImage(doc.id)}
                    @photo-upload=${(e) => talk.uploadPhoto(doc.id, e.detail.url)}
                    @approve=${(e) => this._dhApprove(doc.id, e.detail?.expertReview)}
                    @resume-step=${() => talk.resumeStep(doc.id)}
                    @regenerate-call=${(e) => talk.regenerateCall(doc.id, e.detail.stepId, e.detail.callKey, e.detail.instruction)}
                    @image-choice=${(e) => talk.imageChoice(doc.id, e.detail.choice)}></svc-progress>
            </div>
        `
    }

    // <svc-division> chỉ tải khi Super Admin mở tab này lần đầu.
    _rbManage() {
        if (!customElements.get('svc-division')) import('./svc-division.js').then(() => this.requestUpdate())
        return html`
            <div class="fn-manage">
                <svc-division division=${this._id} ui=${this.ui} theme=${this.theme} lang=${this.lang}></svc-division>
            </div>
        `
    }
}

if (!customElements.get('svc-fn')) customElements.define('svc-fn', SvcFn)
export default SvcFn
