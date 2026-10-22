// src/packages/llm/svc-talk.js
//
// <svc-talk sector="ecommerce"> — sếp nhắn Thư ký của 1 ngành; Thư ký điều phối việc tới các phòng ban. Mỗi task hiện
// thành 1 card (<svc-task-card>) ở vị trí bubble của Thư ký — chạy, xem, duyệt trọn bộ từ card; các phòng không trả
// lời riêng trong nhóm chat (job lẻ của 1 phòng ở panel riêng của phòng đó, <svc-fn>). Chỉ là UI: hàng đợi, task, job
// và duyệt nằm ở service/talk.js (talkFor(sector)); chuyên môn + trạng thái nằm ở Worker (/v1/fn/*). State dùng chung
// qua conductor section `llm.<sector>` — nhiều <svc-talk> cùng ngành thấy 1 cuộc chat.
//
// <web-fab movable> + <web-popover>: popover tự bám fab khi kéo. `embedded` → chỉ render thân panel.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-fab.js'
import '@/packages/apex/web-popover.js'
import '@/packages/apex/web-avatar.js'
import '@/packages/apex/web-text.js'
import '@/packages/apex/web-button.js'
import '@/packages/apex/web-toggle.js'
import './app/svc-task-card.js'
import './app/svc-job-card.js'
import './app/svc-progress.js'
import './service/service.js'
import { subscribe as cdSubscribe } from '@/services/core/conductor.js'
import { txtLingo, toastEmit } from '@/services/tools/util.js'
import { DEFAULT_CHAIN } from '@/services/shared/tensor-api.js'
import { talkFor, DEFAULT_SECTOR } from './service/talk.js'
import { SECRETARY_ICON } from './tool/sectors.js'
import { routingOf, rationaleOf, taskRows, isPlanDoneLine } from './tool/tasks.js'
import { downloadPlanPdf, downloadJobPdf } from './service/pdf.js'
import { cardTxt } from './app/card-parts.js'
import { takeCommand } from './tool/command.js'
import { trialLine } from './tool/trial.js'
import styles from './css/svc-talk.css?inline'

const TXT_STD = {
    vi: {
        panelTitle: 'Trợ lý AI toàn doanh nghiệp',
        placeholder: 'Nhắn Thư ký việc cần làm…',
        empty: 'Chưa có tin nhắn nào — nhắn Thư ký việc cần làm, Thư ký sẽ phân công các phòng.',
        auto: 'Tự động', autoHint: 'Tự duyệt từng bước, tự tạo ảnh (lỗi thì bỏ qua — tạo lại sau) và tự chuyển việc sang phòng kế tiếp',
        back: 'Quay lại',
        staleMsg: 'Bàn giao này dựa trên bản cũ của phòng phía trước — cần xác minh lại', rerun: 'Chạy lại', stillValid: 'Vẫn dùng được',
        planPdf: 'Tải PDF kế hoạch', pdfFailed: 'Không xuất được PDF — thử lại sau',
    },
    en: {
        panelTitle: 'Enterprise AI Assistant',
        placeholder: 'Tell the Secretary what needs doing…',
        empty: 'No messages yet — tell the Secretary what needs doing and it will route the work.',
        auto: 'Auto', autoHint: 'Approves each step, generates the images (skips one that fails — redo it later) and hands the work on by itself',
        back: 'Back',
        staleMsg: 'This handoff was built on an older upstream version — it needs re-checking', rerun: 'Re-run', stillValid: 'Still valid',
        planPdf: 'Download plan PDF', pdfFailed: 'Couldn\'t export the PDF — try again later',
    },
}

export class SvcTalk extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object },
        embedded: { type: Boolean, reflect: true }, // true = chỉ render thân panel (nơi chứa tự lo trigger/popover)
        // Ngành của nhóm chat (worker fn/sectors/*.ts id) — mỗi ngành 1 hàng đợi + 1 cuộc chat. Kho kiến thức các
        // phòng dựa vào là của người đăng nhập (Worker lấy từ JWT) — không còn prop `owner`.
        sector: { type: String },
        // Tạm ẩn quyết định của Tích hợp (DUYỆT / TẠM HOÃN…) — cả câu Thư ký lẫn chip trên card task.
        noVerdict: { type: Boolean, attribute: 'no-verdict' },
        // Chế độ dùng thử (page /system/<sector>): mọi request xin X-Fn-Trial — Worker tự quyết và đếm lượt (fn/trial.ts).
        trial: { type: Boolean },
        // { id, text } — việc <svc-ask> giao cho Thư ký (node có `chat`): gửi như 1 tin của sếp, 1 lần mỗi id
        command: { attribute: false },
        // mirror conductor section llm.<sector> (service/talk.js ghi)
        _log:        { state: true },
        _divisions:  { state: true },
        _system:     { state: true }, // Thư ký + Tích hợp
        _tasks:      { state: true }, // task view theo id (service/talk.js)
        _typingId:   { state: true },
        _runningSub: { state: true },
        _pendingJobs: { state: true },
        _regeneratingImage: { state: true },
        _auto:       { state: true }, // Tự động (service/talk.js setAuto)
        _trialUsage: { state: true }, // lượt thử còn lại (service/talk.js refreshTrial)
        // UI cục bộ của instance này
        _draft:        { state: true },
        _previewJobId: { state: true }, // job đang mở view "Xem chi tiết" (thay khung chat), '' = đóng
        _pdfTask:      { state: true }, // task đang xuất PDF kế hoạch, '' = không
        _pdfJob:       { state: true }, // job phòng ban đang xuất PDF (card task), '' = không
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.embedded = false
        this.noVerdict = true
        this.trial = false
        this.command = null
        this.sector = DEFAULT_SECTOR
        this._talk = talkFor(DEFAULT_SECTOR)
        this._dcSync(this._talk.state)
        this._draft = ''
        this._previewJobId = ''
        this._pdfTask = ''
        this._pdfJob = ''
        this._unsub = null
    }

    connectedCallback() {
        super.connectedCallback()
        this._dcBind()
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._unsub?.()
    }

    // Gắn vào nhóm chat của đúng ngành — lần đầu và mỗi khi `sector` đổi.
    _dcBind() {
        this._unsub?.()
        this._talk = talkFor(this.sector || DEFAULT_SECTOR, { trial: this.trial })
        this._dcSync(this._talk.state)
        this._unsub = cdSubscribe(this._talk.section, () => this._dcSync(this._talk.state))
        this._talk.load(this.lang)
    }

    _dcSync(s) {
        this._log = s.log
        this._divisions = s.divisions
        this._system = s.system
        this._tasks = s.tasks
        this._typingId = s.typingId
        this._runningSub = s.runningSub
        this._pendingJobs = s.pendingJobs
        this._regeneratingImage = s.regeneratingImage
        this._auto = !!s.auto
        this._trialUsage = s.trialUsage
        // Chatter tự dò ngôn ngữ tin của sếp — UI theo luôn.
        if (s.lang && s.lang !== this.lang) this.lang = s.lang
    }

    willUpdate(changed) {
        if (changed.has('sector') && this.isConnected && this._talk.sector !== (this.sector || DEFAULT_SECTOR)) this._dcBind()
        else if (changed.has('trial') && this.isConnected) this._talk.setTrial(this.trial)
        // Đổi ngôn ngữ từ ngoài (cài đặt tài khoản) — tên/mô tả phòng ban trong service dựng lại theo. Ngôn ngữ do
        // chatter dò được đi chiều ngược lại (_dcSync) và trùng state.lang nên setLang bỏ qua, không lặp.
        if (changed.has('lang')) this._talk?.setLang(this.lang)
        if (this._talk) this._talk.showVerdict = !this.noVerdict // mỗi lượt — _dcBind có thể vừa đổi sang service ngành khác
        if (changed.has('command')) this._dhCommand()
    }

    updated(changed) {
        if (changed.has('_log') || changed.has('_typingId') || changed.has('_previewJobId')) this._scrollToBottom()
    }

    _scrollToBottom() {
        const el = this.shadowRoot?.querySelector('.tlk-messages')
        if (el) el.scrollTop = el.scrollHeight
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhPreview(jobId) { this._previewJobId = jobId }
    _dhClosePreview() { this._previewJobId = '' }

    async _dhApproveAndClose(jobId, expertReview) {
        await this._talk.approve(jobId, expertReview)
        if (this._log.find((d) => d.id === jobId)?.approved) this._dhClosePreview() // lỗi → giữ chi tiết mở để sửa
    }

    _dhKeydown(e) {
        if (e.key === 'Enter' && !e.isComposing) this._dhSend()
    }

    // Mọi tin nhắn đi tới Thư ký — nhóm chat không còn nhắn riêng từng phòng ban.
    _dhSend() {
        const content = (this._draft || '').trim()
        if (!content) return
        this._draft = ''
        this._talk.sendMessage(content)
    }

    // Tự động là của cả ngành (service dùng chung) — mọi panel của ngành thấy cùng 1 trạng thái.
    _dhAuto(e) {
        e.stopPropagation() // chỉ của panel này — không để canvas nhận nhầm 1 'change'
        this._talk.setAuto(e.detail.active)
    }

    // Việc từ <svc-ask> — về khung chat (đóng chi tiết đang xem) rồi gửi như sếp tự gõ; ô nhập đang soạn giữ nguyên.
    _dhCommand() {
        const content = takeCommand(this.command)
        if (!content) return
        this._previewJobId = ''
        this._talk.sendMessage(content)
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _bossName() { return 'Boss' }

    _comDivisionName(id) { return this._talk.division(id)?.title || id }
    _comDivisionAvatar(id) { return this._talk.division(id)?.pics || '' }

    // Tên + ảnh / khung step của mỗi function (phòng ban + Thư ký + Tích hợp) theo key — cho card task / bảng phân công.
    get _comFaces() {
        return Object.fromEntries([...this._divisions, ...this._system].map(d => [d.fn, { title: d.title, pics: d.pics }]))
    }
    get _comOutlines() {
        return Object.fromEntries([...this._divisions, ...this._system].map(d => [d.fn, d.outline]))
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (!this._divisions.length) return html``
        return html`
            ${this.embedded ? this._rbPanel() : html`
                <web-popover ui=${this.ui} theme=${this.theme} lang=${this.lang} placement="top-end" placementGap="0" fullscreen>
                    <web-fab slot="trigger" icon=${SECRETARY_ICON} size="lg" rounded="50%" x="99%" y="80%" movable ui="modern" theme=${this.theme}></web-fab>
                    ${this._rbPanel()}
                </web-popover>
            `}
        `
    }

    _rbPanel() {
        const job = this._previewJobId && this._log.find(d => d.id === this._previewJobId)
        const division = job && this._talk.division(job.division)
        if (job && division?.outline) return this._rbDetail(job, division)
        return html`
            <div class="tlk-panel">
                <div class="tlk-head">
                    <span class="tlk-title has-icon"><iconify-icon icon=${SECRETARY_ICON}></iconify-icon>${this._txt.panelTitle}</span>
                    <span class="tlk-auto" title=${this._txt.autoHint}>
                        <web-toggle ui=${this.ui} theme=${this.theme} ?active=${this._auto} aria-label=${this._txt.autoHint}
                            @change=${this._dhAuto}></web-toggle>
                        <span>${this._txt.auto}</span>
                    </span>
                </div>
                ${this._rfTrial()}
                <div class="tlk-messages">
                    ${this._rfLog()}
                    ${this._typingId ? this._rfTyping(this._typingId) : ''}
                </div>
                <div class="tlk-composer-wrap">
                    <div class="tlk-composer">
                        <web-text placeholder=${this._txt.placeholder} .value=${this._draft} height="36px"
                            @input=${(e) => { this._draft = e.detail.value }} @keydown=${this._dhKeydown}></web-text>
                        <web-button type="soft" color="primary" height="36px" square rounded="50%" @click=${this._dhSend}>
                            <iconify-icon icon="ri:send-plane-2-fill" width="18"></iconify-icon>
                        </web-button>
                    </div>
                </div>
            </div>
        `
    }

    // Chế độ thử: lượt task + tin nhắn còn lại của ngành này (Worker đếm — đây chỉ hiển thị).
    _rfTrial() {
        const line = this.trial ? trialLine(this._trialUsage, this.lang) : ''
        return line ? html`<div class="tlk-trial"><iconify-icon icon="ri:flask-line"></iconify-icon>${line}</div>` : ''
    }

    // "Xem chi tiết" — thay khung chat NGAY trong panel (không bật dialog), nút ← quay lại chat.
    // <svc-progress> = cây macro/sub-step + sửa field inline + Duyệt; job đã duyệt chỉ xem (Worker từ chối sửa).
    _rbDetail(doc, division) {
        const view = doc.task ? this._tasks?.[doc.task] ?? null : null
        const fn = division.fn
        // Job Thư ký đang hiệu lực của task → bảng phân công (bản đề xuất khi chưa duyệt, bản đang chạy khi đã duyệt).
        const current = view?.fns?.find(s => s.fn === fn)?.jobId === doc.id
        const routing = fn === 'secretary' && current ? routingOf(view) : null
        // Phòng ban: lý do Thư ký giao việc — dòng của nó trong field rationale của job Thư ký đang hiệu lực.
        const secretaryJob = view && this._log.find(d => d.id === view.fns?.find(s => s.fn === 'secretary')?.jobId)
        const why = fn !== 'secretary' ? rationaleOf(secretaryJob?.fields?.rationale)[fn] || '' : ''
        return html`
            <div class="tlk-panel is-detail">
                <div class="tlk-head tlk-detail-head">
                    <button class="tlk-back" aria-label=${this._txt.back} title=${this._txt.back} @click=${this._dhClosePreview}>
                        <iconify-icon icon="ri:arrow-left-line"></iconify-icon>
                    </button>
                    <span class="tlk-title">${doc.topic || division.title}</span>
                </div>
                <div class="tlk-detail">
                    <svc-job-card .job=${doc} .outline=${division.outline} .view=${view} .face=${{ title: division.title, pics: division.pics }}
                        why=${why} ?approvable=${!doc.approved} ?busy=${this._pendingJobs.has(doc.id)}
                        lang=${this.lang} ui=${this.ui} theme=${this.theme}
                        @approve=${(e) => this._dhApproveAndClose(doc.id, e.detail?.expertReview)}
                        @resume-step=${() => this._talk.resumeStep(doc.id)}
                        @record=${() => this._talk.record(doc.id)}>${this._rfDetailActions(doc, division)}</svc-job-card>
                    <svc-progress .outline=${division.outline} .doc=${doc} .runningSub=${this._runningSub} externalActions
                        .routing=${routing} .faces=${this._comFaces} .titles=${view?.titles || {}}
                        @routing-change=${e => this._talk.setRouting(doc.id, e.detail)}
                        editable ?regeneratingImage=${this._regeneratingImage}
                        ?busy=${this._pendingJobs.has(doc.id)}
                        ai=${DEFAULT_CHAIN} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        @field-change=${e => this._talk.setField(doc.id, e.detail.key, e.detail.value)}
                        @retry-step=${() => this._talk.retry(doc.id)}
                        @regenerate-image=${() => this._talk.regenerateImage(doc.id)}
                        @photo-upload=${e => this._talk.uploadPhoto(doc.id, e.detail.url)}
                        @regenerate-call=${e => this._talk.regenerateCall(doc.id, e.detail.stepId, e.detail.callKey, e.detail.instruction)}
                        @image-choice=${e => this._talk.imageChoice(doc.id, e.detail.choice)}></svc-progress>
                </div>
            </div>
        `
    }

    // Nhóm chat chỉ còn sếp ↔ Thư ký: tin của sếp, tin của Thư ký (hệ thống) và 1 card / task đặt ở chỗ job đầu tiên của
    // task. Câu chat cũ của từng phòng và job lẻ (mở ở panel <svc-fn> của phòng) không hiện ở đây.
    _rfLog() {
        const byTask = new Map()
        for (const m of this._log) if (m.kind === 'job' && m.task) byTask.set(m.task, [...(byTask.get(m.task) ?? []), m])
        const shown = new Set()
        let lastTask = ''
        const items = this._log.flatMap(m => {
            if (m.kind === 'chat') {
                if (m.from !== 'boss' && !this._talk.division(m.from)?.system) return []
                // "Xong cả kế hoạch" → nút PDF tổng của task đó (câu cũ chưa mang id task: task của job gần nhất phía trên).
                const plan = m.from !== 'boss' && isPlanDoneLine(m.content) ? m.task || lastTask : ''
                return [this._rfMessage(m, plan)]
            }
            if (m.task) lastTask = m.task
            if (!m.task || shown.has(m.task)) return []
            shown.add(m.task)
            return [this._rfTaskCard(m.task, byTask.get(m.task))]
        })
        return items.length ? items : html`<div class="tlk-empty">${this._txt.empty}</div>`
    }

    _rfTaskCard(taskId, jobs) {
        const view = this._tasks?.[taskId] ?? null
        const host = this._talk.secretary
        return html`
            <div class="tlk-msg is-card">
                <web-avatar src=${host?.pics || ''} name=${host?.title || ''} size="28px" ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="tlk-card">
                    ${host ? html`<span class="tlk-author">${host.title}</span>` : ''}
                    <svc-task-card .view=${view} .jobs=${jobs} topic=${view?.topic || jobs[0]?.topic || ''}
                        .faces=${this._comFaces} .outlines=${this._comOutlines} .pending=${this._pendingJobs} pdfJob=${this._pdfJob}
                        lang=${this.lang} ui=${this.ui} theme=${this.theme} ?no-verdict=${this.noVerdict}
                        @open-job=${e => this._dhPreview(e.detail.jobId)}
                        @approve-job=${e => this._talk.approve(e.detail.jobId)}
                        @retry-job=${e => this._talk.retry(e.detail.jobId)}
                        @pdf-job=${e => this._dhJobPdf(e.detail.jobId)}
                        @record-job=${e => this._talk.record(e.detail.jobId)}></svc-task-card>
                </div>
            </div>
        `
    }

    // Hành động cấp task trong card chi tiết (Duyệt nằm trong chính card, Thử lại ở <svc-progress>): bàn giao chờ xác minh
    // lại → Chạy lại / Vẫn dùng được; đã duyệt → Chạy lại (P3-9).
    _rfDetailActions(m, division) {
        if (!m.task || !m.approved) return ''
        const t = this._txt
        const busy = this._pendingJobs.has(m.id)
        const stale = this._talk.staleOf(m)
        const rerun = this._talk.canRerun(m) ? html`
            <web-button type=${stale.length ? 'fill' : 'soft'} color="primary" height="26px" ui=${this.ui} theme=${this.theme} ?disabled=${busy}
                @click=${() => this._talk.rerun(m.task, division.fn)}>${t.rerun}</web-button>
        ` : ''
        if (!stale.length && !rerun) return ''
        return html`
            ${stale.length ? html`<p class="tlk-content">⚠️ ${t.staleMsg}</p>` : ''}
            <div class="tlk-actions">
                ${rerun}
                ${stale.length ? html`
                    <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme} ?disabled=${busy}
                        @click=${() => this._talk.verify(m.task, stale.map(a => a.id))}>${t.stillValid}</web-button>
                ` : ''}
            </div>
        `
    }

    _rfMessage(m, planTask = '') {
        const mine = m.from === 'boss'
        const name = mine ? this._bossName : this._comDivisionName(m.from)
        const t = this._txt
        return html`
            <div class="tlk-msg ${mine ? 'mine' : ''}">
                <web-avatar src=${mine ? '' : this._comDivisionAvatar(m.from)} name=${name} size="28px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="tlk-bubble">
                    <span class="tlk-author">${name}</span>
                    <p class="tlk-content">${m.content}</p>
                    ${planTask ? html`
                        <div class="tlk-actions">
                            <web-button type="soft" color="primary" height="28px" prefix="ri:file-pdf-2-line" ui=${this.ui} theme=${this.theme}
                                ?loading=${this._pdfTask === planTask} ?disabled=${!!this._pdfTask}
                                @click=${() => this._dhPlanPdf(planTask)}>${t.planPdf}</web-button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `
    }

    // PDF 1 dòng đã duyệt trong card task (Thư ký hoặc 1 phòng) — cùng file với icon PDF ở panel riêng của phòng (<svc-fn>).
    async _dhJobPdf(jobId) {
        if (this._pdfJob) return
        const job = this._log.find(d => d.id === jobId)
        const division = job && this._talk.division(job.division)
        if (!division?.outline) return
        this._pdfJob = jobId
        try {
            await downloadJobPdf({ job, outline: division.outline, department: division.title || '', lang: this.lang })
        } catch (err) {
            console.error('[llm/talk] PDF export failed:', err)
            toastEmit(this._txt.pdfFailed, 'error')
        } finally {
            this._pdfJob = ''
        }
    }

    // PDF cả kế hoạch: mỗi phòng có job trong task 1 phần, theo thứ tự task view (Thư ký → các phòng → Tích hợp).
    async _dhPlanPdf(taskId) {
        if (this._pdfTask) return
        this._pdfTask = taskId
        try {
            const view = this._tasks?.[taskId] ?? null
            const jobs = this._log.filter(d => d.kind === 'job' && d.task === taskId)
            const parts = taskRows(view, jobs).flatMap(({ fn, job }) => {
                const division = job && this._talk.division(job.division)
                return division?.outline ? [{ name: division.title || fn, job, outline: division.outline }] : []
            })
            const verdict = !this.noVerdict && view?.verdict ? cardTxt(this.lang).verdict[view.verdict] ?? view.verdict : ''
            await downloadPlanPdf({ topic: view?.topic || jobs[0]?.topic || '', verdict, parts, lang: this.lang })
        } catch (err) {
            console.error('[llm/talk] plan PDF export failed:', err)
            toastEmit(this._txt.pdfFailed, 'error')
        } finally {
            this._pdfTask = ''
        }
    }

    _rfTyping(divisionId) {
        return html`
            <div class="tlk-msg">
                <web-avatar src=${this._comDivisionAvatar(divisionId)} name=${this._comDivisionName(divisionId)} size="28px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="tlk-bubble"><span class="tlk-author">${this._comDivisionName(divisionId)}</span>
                    <p class="tlk-content tlk-typing">•••</p>
                </div>
            </div>
        `
    }
}

if (!customElements.get('svc-talk')) customElements.define('svc-talk', SvcTalk)
export default SvcTalk
