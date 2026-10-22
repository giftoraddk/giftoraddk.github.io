// src/packages/llm/app/svc-task-card.js
//
// <svc-task-card> — card tổng của 1 task trong nhóm chat <svc-talk>, thay cho các bubble job riêng của task đó. Mobile-
// first, gọn: chủ đề + vòng % tiến độ chung, giai đoạn, thanh chia đoạn, rồi danh sách phòng — phòng đã/đang làm mỗi
// phòng 1 dòng thấp (chấm trạng thái trên avatar, mức · trạng thái, vạch tiến độ mảnh khi đang chạy), phòng còn chờ bàn
// giao gom 1 dòng gập/mở. Bấm card → `open-job` job Thư ký (bối cảnh + bảng phân công); bấm 1 dòng → `open-job` job
// của phòng đó; job phòng ban xong chờ duyệt có nút Duyệt nhanh (`approve-job`), job lỗi giữa chừng có nút Thử lại
// (`retry-job`), mọi dòng đã duyệt (kể cả Thư ký) có icon tải PDF (`pdf-job`) cạnh dấu check; dòng đã duyệt của phòng có
// bảng output (outline.recordable) có thêm icon lưu vào bảng (`record-job`) — đã lưu (createdPostId) thì màu success, disabled. Thuần hiển thị — svc-talk đưa task view + job trong nhật ký + face/outline từng phòng.
import { LitElement, html, unsafeCSS } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import 'iconify-icon'
import '@/packages/apex/web-avatar.js'
import '@/packages/apex/web-button.js'
import { taskRows, routingOf, jobProgress, previewSummary } from '../tool/tasks.js'
import { cardTxt, chip, segBar, meter, percent, segOf, STATE_TONE, STAGE_TONE, VERDICT_TONE } from './card-parts.js'
import styles from '../css/svc-cards.css?inline'

const SECRETARY = 'secretary'
const AVATAR_MAX = 4
const FOLD_MIN = 3 // ít phòng chờ hơn thì hiện thẳng, không gom
const ACTIVE = new Set(['running', 'review', 'stale', 'error'])

export class SvcTaskCard extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        view: { type: Object },     // task view (GET /v1/fn/tasks/:id) — null khi chưa tải (task cũ): dựng từ `jobs`
        jobs: { type: Array },      // job của task này trong nhật ký
        topic: { type: String },
        faces: { type: Object },    // { [fn]: { title, pics } } — tên/ảnh phòng trong nhóm chat
        outlines: { type: Object }, // { [fn]: outline } — để tính tiến độ từng job
        pending: { type: Object },  // Set<jobId> đang có hành động dở
        pdfJob: { type: String },   // job đang xuất PDF ('' = không)
        lang: { type: String }, ui: { type: String }, theme: { type: String },
        noVerdict: { type: Boolean, attribute: 'no-verdict' }, // ẩn chip quyết định của Tích hợp (svc-talk `no-verdict`)
        _unfold: { state: true },   // đang mở nhóm phòng chờ bàn giao
    }

    constructor() {
        super()
        this.view = null; this.jobs = []; this.topic = ''; this.faces = {}; this.outlines = {}; this.pending = new Set(); this.pdfJob = ''
        this.lang = 'vi'; this.ui = 'pastel'; this.theme = ''; this.noVerdict = false
        this._unfold = false
    }

    _name(fn) { return this.faces?.[fn]?.title || this.view?.titles?.[fn]?.[this.lang] || this.view?.titles?.[fn]?.vi || fn }

    _emit(type, jobId) {
        if (jobId) this.dispatchEvent(new CustomEvent(type, { detail: { jobId }, bubbles: true, composed: true }))
    }

    // Giai đoạn Thư ký tách rõ chỗ sếp phải làm: duyệt bối cảnh (dừng giữa job) hay duyệt phân công (job xong).
    _stage(rows) {
        const stage = this.view?.stage
        if (stage !== SECRETARY) return stage || ''
        const job = rows.find((r) => r.fn === SECRETARY)?.job
        if (job?.status === 'awaiting_review') return 'context'
        if (job?.status === 'done' && !job.approved) return 'routing'
        return SECRETARY
    }

    _pct({ fn, state, job }) { return state === 'approved' ? 100 : percent(jobProgress(this.outlines?.[fn], job)) }

    render() {
        const t = cardTxt(this.lang)
        const rows = taskRows(this.view, this.jobs)
        const r = routingOf(this.view)
        const stage = this._stage(rows)
        const secretaryJob = rows.find((x) => x.fn === SECRETARY)?.job ?? this.jobs[0]
        const approved = rows.filter((x) => x.state === 'approved').length
        const overall = rows.length ? Math.round(rows.reduce((sum, row) => sum + this._pct(row), 0) / rows.length) : 0
        const waiting = rows.filter((x) => x.state === 'waiting')
        const fold = waiting.length >= FOLD_MIN
        const shown = fold ? rows.filter((x) => x.state !== 'waiting') : rows
        // Đang chờ duyệt phân công: chưa có dòng phòng nào — gom các phòng Thư ký đề xuất thành 1 dòng (không mở).
        const proposed = stage === 'routing' && r ? r.plan.run : []
        const note = stage === 'routing' ? previewSummary(this.view, (fn) => this.faces?.[fn]?.title, this.lang) : ''
        const verdict = this.noVerdict ? null : this.view?.verdict
        return html`
            <div class="cd-card is-task is-click" @click=${() => this._emit('open-job', secretaryJob?.id)}>
                <div class="cd-task-head">
                    <div class="cd-task-text">
                        <div class="cd-title cd-clamp">${this.topic}</div>
                        <div class="cd-chips">
                            ${stage ? chip(t.stage[stage] ?? stage, STAGE_TONE[stage]) : ''}
                            ${verdict ? chip(t.verdict[verdict] ?? verdict, VERDICT_TONE[verdict]) : ''}
                            <span class="cd-count">${t.approvedOf(approved, rows.length)}</span>
                        </div>
                    </div>
                    <div class="cd-ring ${overall === 100 ? 'is-done' : ''}" style=${styleMap({ '--p': String(overall) })}
                        role="img" aria-label=${`${overall}%`}><span>${overall}%</span></div>
                </div>
                ${segBar(rows.map((x) => ({ state: segOf(x.state), label: this._name(x.fn) })))}
                <div class="cd-list">
                    ${shown.map((row) => this._row(row, r, t))}
                    ${fold ? this._fold(waiting, t.waitingGroup(waiting.length), true) : ''}
                    ${fold && this._unfold ? waiting.map((row) => this._row(row, r, t)) : ''}
                    ${proposed.length ? this._fold(proposed.map((fn) => ({ fn })), t.proposed(proposed.length), false) : ''}
                </div>
                ${note ? html`<div class="cd-note">${note}</div>` : ''}
            </div>
        `
    }

    // 1 dòng gom nhiều phòng: chồng avatar + nhãn; `toggle` → bấm để mở/gập các dòng đó.
    _fold(rows, label, toggle) {
        const stack = html`
            <span class="cd-avatars">
                ${rows.slice(0, AVATAR_MAX).map(({ fn }) => html`
                    <web-avatar src=${this.faces?.[fn]?.pics || ''} name=${this._name(fn)} size="22px"
                        title=${this._name(fn)} ui="modern" theme=${this.theme}></web-avatar>
                `)}
                ${rows.length > AVATAR_MAX ? html`<span class="cd-more">+${rows.length - AVATAR_MAX}</span>` : ''}
            </span>
            <span class="cd-fold-label">${label}</span>
        `
        if (!toggle) return html`<div class="cd-fold">${stack}</div>`
        return html`
            <button class="cd-fold" aria-expanded=${this._unfold ? 'true' : 'false'}
                @click=${(e) => { e.stopPropagation(); this._unfold = !this._unfold }}>
                ${stack}
                <iconify-icon class="cd-chevron" icon="ri:arrow-down-s-line"></iconify-icon>
            </button>
        `
    }

    // Icon tải PDF 1 dòng đã duyệt (Thư ký: bối cảnh + phân công; phòng ban: bàn giao) — chỉ phát `pdf-job`, svc-talk dựng file (service/pdf.js).
    _pdf(job, t) {
        if (!job) return ''
        const busy = this.pdfJob === job.id
        return html`
            <button class="cd-pdf" title=${t.pdf} aria-label=${t.pdf} ?disabled=${!!this.pdfJob}
                @click=${(e) => { e.stopPropagation(); this._emit('pdf-job', job.id) }}>
                <iconify-icon class=${busy ? 'is-spin' : ''} icon=${busy ? 'ri:loader-4-line' : 'ri:file-pdf-2-line'}></iconify-icon>
            </button>
        `
    }

    // Icon lưu 1 dòng đã duyệt vào bảng output của phòng (products, posts…) — chỉ phát `record-job`, svc-talk gọi service/talk.js.
    _record(job, outline, t) {
        if (!job?.approved || !outline?.recordable) return ''
        const saved = !!job.createdPostId
        const busy = !saved && this.pending?.has(job.id)
        const label = (saved ? t.recorded : t.record).replace('{table}', outline.output?.table ?? '')
        return html`
            <button class="cd-pdf cd-record ${saved ? 'is-saved' : ''}" title=${label} aria-label=${label} ?disabled=${saved || busy}
                @click=${(e) => { e.stopPropagation(); this._emit('record-job', job.id) }}>
                <iconify-icon class=${busy ? 'is-spin' : ''} icon=${busy ? 'ri:loader-4-line' : 'ri:database-2-line'}></iconify-icon>
            </button>
        `
    }

    _row(row, r, t) {
        const { fn, state, job, missing } = row
        const name = this._name(fn)
        const outline = this.outlines?.[fn]
        const pct = this._pct(row)
        const lead = fn === r?.routing.lead
        const level = lead ? 'lead' : r && fn in r.routing.levels ? r.routing.levels[fn] : null
        const tone = STATE_TONE[state] ?? 'neutral'
        const progressing = ACTIVE.has(state) && pct < 100
        // Duyệt nhanh: phòng ban (không phải Thư ký — sếp cần xem bảng phân công) xong hẳn, không cần chuyên gia ký.
        const quick = !!job && job.status === 'done' && !job.approved && fn !== SECRETARY && !outline?.review
        const busy = !!job && this.pending?.has(job.id)
        const open = (e) => { e.stopPropagation(); this._emit('open-job', job?.id) }
        const act = (label, color, type, icon, event) => html`
            <web-button type=${type} color=${color} height="26px" prefix=${icon} ui=${this.ui} theme=${this.theme}
                ?loading=${busy} ?disabled=${busy}
                @click=${(e) => { e.stopPropagation(); this._emit(event, job.id) }}>${label}</web-button>
        `
        return html`
            <div class="cd-item ${state === 'waiting' ? 'is-waiting' : ''}" role=${job ? 'button' : 'presentation'} tabindex=${job ? '0' : '-1'}
                title=${missing?.length ? missing.map((k) => this.view?.kinds?.[k]?.[this.lang] || k).join(', ') : ''}
                @click=${job ? open : (e) => e.stopPropagation()}
                @keydown=${(e) => { if (job && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(e) } }}>
                <span class="cd-ava">
                    <web-avatar src=${this.faces?.[fn]?.pics || ''} name=${name} size="28px" ui="modern" theme=${this.theme}></web-avatar>
                    <span class="cd-dot" data-tone=${tone}></span>
                </span>
                <div class="cd-item-main">
                    <div class="cd-item-top">
                        <span class="cd-row-name">${name}</span>
                        ${lead ? html`<iconify-icon class="cd-lead" icon="ri:star-fill" aria-hidden="true"></iconify-icon>` : ''}
                    </div>
                    <div class="cd-item-sub">
                        ${level ? html`<span>${t.level[level] ?? level}</span><span aria-hidden="true">·</span>` : ''}
                        <span class="cd-item-state" data-tone=${tone}>${t.state[state] ?? state}</span>
                        ${progressing ? html`<span>${pct}%</span>` : ''}
                    </div>
                    ${progressing ? meter(pct, state === 'error' ? 'error' : 'primary') : ''}
                </div>
                <div class="cd-row-side">
                    ${state === 'error' ? act(t.retry, 'error', 'soft', 'ri:refresh-line', 'retry-job')
                        : quick ? act(t.approve, 'primary', 'fill', 'ri:check-line', 'approve-job')
                        : state === 'approved' ? html`${this._record(job, outline, t)}${this._pdf(job, t)}<iconify-icon class="cd-ok" icon="ri:checkbox-circle-fill"></iconify-icon>`
                        : job ? html`<iconify-icon class="cd-go" icon="ri:arrow-right-s-line"></iconify-icon>` : ''}
                </div>
            </div>
        `
    }
}

if (!customElements.get('svc-task-card')) customElements.define('svc-task-card', SvcTaskCard)
export default SvcTaskCard
