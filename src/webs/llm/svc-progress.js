// src/webs/llm/svc-progress.js
//
// <svc-progress> — cây macro/sub-step (tiến trình + kết quả từng phần) cho svc-talk.js's popup
// "Xem chi tiết" của 1 job chat. Cloned from src/webs/division/svc-progress.js (domain-isolation
// clone) — logic unchanged, only the `./tools/image.js` import repoints to this domain's own copy.
//
// Presentational — KHÔNG tự biết D1/collection nào, KHÔNG tự gọi AI. Nhận `division`+`doc` (doc
// dạng job-like: {fields, status, error, topic, colors, language}) qua prop, phát CustomEvent khi
// user tương tác — cha (svc-talk.js) tự nghe rồi tự quyết định persist/chạy lại AI ở đâu.
//
// `editable`: CHỈ field OUTPUT cuối (division.meta.output.fields — title/description/content ở
// marketing) sửa được ngay trong cây step, phát `field-change` — `content` dùng <svc-editor> (HTML
// đầy đủ), field output khác dùng <web-textarea>. Field TRUNG GIAN (topicAnalysis, contentPillars,
// imagePrompt...) LUÔN chỉ hiển thị text, không sửa được ở đây. Ảnh (step `type:'image'`) sửa qua
// chính 2 sub-step "generate"/"upload" (nút Tạo lại ảnh + <svc-photor>), không qua field text.
import { LitElement, html, unsafeCSS } from 'lit'
import '@/webs/apex/web-steps.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-textarea.js'
import '@/webs/apex/web-texts.js'
import '@/webs/media/svc-photor.js'
import '@/webs/media/svc-editor.js'
import { IMAGE_SUBSTEP_LABELS, buildImagePrompt } from './tools/image.js'
import { txtLingo, toastEmit } from '@/services/helper.js'
import styles from './styles/svc-progress.css?inline'

const TXT_STD = {
    vi: {
        retry: 'Thử lại', regenerateImage: 'Tạo lại ảnh', approve: 'Duyệt', regenerate: 'Tạo lại',
        promptCopied: 'Đã copy prompt ảnh — dán vào ô chat nếu trang không tự điền sẵn',
        reviewPrompt: '⏸️ Đang chờ duyệt để tiếp tục',
        resumeApprove: 'Duyệt',
        imageChoicePrompt: '⏸️ Sếp muốn để AI tự tạo ảnh hay tự làm ảnh từ trang khác?',
        imageGenerateAi: 'Tạo ảnh bằng AI', imageSkip: 'Bỏ qua, tự làm',
        regeneratePlaceholder: 'Yêu cầu thay đổi thêm (tuỳ chọn)...',
    },
    en: {
        retry: 'Retry', regenerateImage: 'Regenerate image', approve: 'Approve', regenerate: 'Regenerate',
        promptCopied: 'Image prompt copied — paste it in the chat box if not auto-filled',
        reviewPrompt: '⏸️ Awaiting approval to continue',
        resumeApprove: 'Approve',
        imageChoicePrompt: '⏸️ Generate the image with AI, or make it yourself on another site?',
        imageGenerateAi: 'Generate with AI', imageSkip: 'Skip, I\'ll do it myself',
        regeneratePlaceholder: 'Additional change request (optional)...',
    },
}

// Step ảnh coi là "xong" nếu đã có pics THẬT SỰ, HOẶC sếp đã chủ động chọn "Bỏ qua" (doc.imageChoice
// === 'skip' — xem svc-talk.js's _dhImageChoice) — không thì step ảnh bị bỏ qua sẽ hiện 'pending'
// mãi mãi dù job đã 'done' thật.
function stepDone(step, doc) {
    if (step.type === 'image') return !!doc.fields.pics || doc.imageChoice === 'skip'
    return step.calls.flatMap(c => c.fields.map(f => f.key)).every(k => (doc.fields[k] || '').toString().trim())
}

// Doc không có granularity theo call thật (chỉ theo step) — suy ra step "đang chạy" bằng step
// PENDING đầu tiên khi doc chưa done/lỗi. `awaiting_review` — job đang DỪNG chờ sếp quyết định (xem
// _comPausedStep) — không có gì đang "chạy" thật lúc này.
export function autoRunningStep(division, doc) {
    if (doc.status === 'done' || doc.error || doc.status === 'awaiting_review') return 0
    const next = division.meta.steps.find(s => !stepDone(s, doc))
    return next?.id ?? 0
}

export function autoFailedStep(doc) {
    if (!doc.error) return 0
    return Number(String(doc.status || '').replace('step', '')) || 0
}

export class SvcProgress extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        division:    { type: Object },
        doc:         { type: Object },
        runningStep: { type: Number },  // 0 = tự suy luận qua autoRunningStep()
        failedStep:  { type: Number },  // 0 = tự suy luận qua autoFailedStep()
        runningSub:  { type: Object },  // Set<"stepId-callKey"> sub-step đang chạy thật (spinner) — optional
        editable:    { type: Boolean }, // sửa field OUTPUT inline (title/description/content) + hiện nút Tạo lại ảnh/upload khi step ảnh done
        approvable:  { type: Boolean }, // hiện nút "Duyệt" khi doc đã xong & chưa duyệt, phát `approve`
        regeneratingImage: { type: Boolean }, // cha set true trong lúc chờ AI tạo lại ảnh (loading nút)
        busy: { type: Boolean }, // cha set true khi job/doc này đang có 1 hành động chưa xong — disable mọi nút hành động khác
        ai: { type: String }, // forward cho <svc-editor> (field `content`) — AI-assist trong editor
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        // Nội dung chỉ dẫn thêm sếp gõ cho nút "Tạo lại" cấp sub-step (xem _rfRegenerateRow) —
        // Map<"stepId-callKey", string>, thuần local UI state (KHÔNG persist).
        _instructions: { state: true },
    }

    constructor() {
        super()
        this.division = null
        this.doc = null
        this.runningStep = 0
        this.failedStep = 0
        this.runningSub = null
        this.editable = false
        this.approvable = false
        this.regeneratingImage = false
        this.busy = false
        this.ai = ''
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi'; this.txt = null
        this._instructions = {}
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _comRunningStep() { return this.runningStep || autoRunningStep(this.division, this.doc) }
    get _comFailedStep()  { return this.failedStep  || autoFailedStep(this.doc) }
    get _comOutputFields() { return new Set(this.division?.meta?.output?.fields || []) }
    get _comCanApprove() {
        return this.approvable && this.doc.status === 'done' && !this.doc.approved && !!this.division?.meta?.output
    }

    // Step đang khiến job DỪNG LẠI chờ quyết định (mọi step `type:'text'` xong đều dừng chờ Duyệt,
    // hoặc lựa chọn AI/Bỏ qua của step ảnh) — null nếu doc không ở trạng thái này.
    get _comPausedStep() {
        if (this.doc.status !== 'awaiting_review' || !this.doc.pausedStepId) return null
        // So sánh qua Number() — `pausedStepId` là cột TEXT trên D1 (talks table); Cloudflare D1
        // bind số JS thường qua sqlite3_bind_double() (REAL), nên SQLite lưu "3.0" (text) chứ
        // KHÔNG PHẢI "3" — String(s.id)===String(pausedStepId) ("3" vs "3.0") vẫn fail. Number()
        // chịu được cả 2 dạng ("3"/"3.0"/3), so === trực tiếp fail silently làm mất banner "Duyệt".
        return this.division.meta.steps.find(s => Number(s.id) === Number(this.doc.pausedStepId)) || null
    }

    // Sếp đã chọn "Bỏ qua" AI ở step ảnh nhưng CHƯA thật sự có ảnh — `stepDone()` vẫn coi step này
    // "xong" nên job KHÔNG chờ, NHƯNG pipeline vì vậy có thể đã tiến sang step SAU đó, khiến
    // `_comActiveMacroStep` tự nhảy theo tiến độ mới, "giấu" luôn tab step ảnh (chứa 3 nút mở AI
    // ngoài + ô upload cho sếp tự làm) sau nhiều cú click mới xem lại được. Ghim tab ở ĐÚNG step
    // ảnh này cho tới khi có `pics` thật, để 3 nút + input LUÔN hiện sẵn ngay khi mở popup.
    get _comNeedsManualImageStep() {
        if (this.doc.imageChoice !== 'skip' || this.doc.fields.pics) return null
        return this.division.meta.steps.find(s => s.type === 'image') || null
    }

    _stepState(step) {
        if (stepDone(step, this.doc)) return 'done'
        if (this._comFailedStep === step.id)  return 'failed'
        if (this._comRunningStep === step.id) return 'running'
        return 'pending'
    }

    // our status vocab ('pending'|'running'|'failed'|'done') -> web-steps' ('pending'|'active'|'error'|'done').
    _webStatus(state) { return state === 'running' ? 'active' : state === 'failed' ? 'error' : state }

    get _comActiveMacroStep() {
        // Đang dừng chờ quyết định — luôn nhảy thẳng tới ĐÚNG step đó, bất kể step tự thân đã
        // "done" theo dữ liệu hay chưa (vd concept step đã đủ field nhưng job vẫn dừng ở đây).
        if (this._comPausedStep) return String(this._comPausedStep.id)
        // Đã chọn "Bỏ qua" nhưng chưa có ảnh thật — ghim tab ở step ảnh (xem _comNeedsManualImageStep).
        if (this._comNeedsManualImageStep) return String(this._comNeedsManualImageStep.id)
        const running = this._comRunningStep, failed = this._comFailedStep
        if (running) return String(running)
        if (failed)  return String(failed)
        const steps = this.division.meta.steps
        for (let i = steps.length - 1; i >= 0; i--) {
            if (this._stepState(steps[i]) !== 'pending') return String(steps[i].id)
        }
        return String(steps[0]?.id ?? 1)
    }

    _subHasData(step, key) {
        if (step.type === 'image') {
            if (key === 'concept') return !!(this.doc.fields.imagePrompt || '').trim()
            return !!this.doc.fields.pics
        }
        const call = step.calls.find(c => c.key === key)
        if (!call) return false
        return call.fields.some(f => (this.doc.fields[f.key] || '').trim())
    }

    // Trạng thái hiển thị của 1 sub-step trong cây dọc (web-steps isVertical multiple) — 'pending'
    // bị web-steps.js tự đóng/chặn click mở. Riêng 'generate'/'upload' của step ảnh khi sếp đã chọn
    // "Bỏ qua" (chưa có `pics` thật) PHẢI khác 'pending' — nếu không, 3 nút mở AI ngoài + ô upload
    // vẫn bị web-steps.js giấu kín, sếp không cách nào mở ra được.
    _subStatus(step, key) {
        const k = `${step.id}-${key}`
        if (this.runningSub?.has(k)) return 'active'
        if (this._subHasData(step, key)) return 'done'
        if (step.type === 'image' && key !== 'concept' && this.doc.imageChoice === 'skip') return 'active'
        return 'pending'
    }

    _comContentSnippet() {
        const plain = (this.doc.fields.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (!plain) return ''
        return plain.length > 160 ? `${plain.slice(0, 160)}…` : plain
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhFieldChange(key, e) {
        this.dispatchEvent(new CustomEvent('field-change', { detail: { key, value: e.detail.value }, bubbles: true, composed: true }))
    }

    _dhRetry() {
        this.dispatchEvent(new CustomEvent('retry-step', { detail: { stepId: this._comFailedStep }, bubbles: true, composed: true }))
    }

    _dhApprove() {
        this.dispatchEvent(new CustomEvent('approve', { bubbles: true, composed: true }))
    }

    // Duyệt để job chạy TIẾP qua step kế (mọi step `type:'text'` xong đều dừng chờ) — khác hẳn
    // `approve` ở trên (đó là duyệt job đã DONE HẲN để tạo record mới).
    _dhResumeStep() {
        this.dispatchEvent(new CustomEvent('resume-step', { bubbles: true, composed: true }))
    }

    // Gõ chỉ dẫn thêm cho nút "Tạo lại" cấp sub-step (xem _rfRegenerateRow) — chỉ cập nhật state
    // cục bộ, KHÔNG phát event gì (chỉ đọc ra lúc bấm "Tạo lại" qua _dhRegenerateCall).
    _dhInstructionChange(k, e) {
        this._instructions = { ...this._instructions, [k]: e.detail.value }
    }

    // Sếp chưa ưng kết quả 1 sub-step (call) cụ thể, muốn AI viết lại RIÊNG call đó kèm chỉ dẫn
    // thêm vừa gõ — khác hẳn `resume-step` (chạy step KẾ TIẾP) hay `retry-step` (chạy lại NGUYÊN
    // step đang lỗi) — đây granular ở cấp 1 call, dùng được bất kỳ lúc nào call đó đã có dữ liệu,
    // không cần đang paused đúng step chứa nó.
    _dhRegenerateCall(step, callKey) {
        const k = `${step.id}-${callKey}`
        this.dispatchEvent(new CustomEvent('regenerate-call', {
            detail: { stepId: step.id, callKey, instruction: this._instructions[k] || '' },
            bubbles: true, composed: true,
        }))
    }

    // Sếp chọn 'ai' (gọi AI sinh ảnh thật) hay 'skip' (bỏ qua, tự làm qua 3 nút mở trang ngoài) —
    // xem svc-talk.js's _dhImageChoice.
    _dhImageChoice(choice) {
        this.dispatchEvent(new CustomEvent('image-choice', { detail: { choice }, bubbles: true, composed: true }))
    }

    _dhRegenerateImage(stepId) {
        this.dispatchEvent(new CustomEvent('regenerate-image', { detail: { stepId }, bubbles: true, composed: true }))
    }

    _dhPhotoUpload(e) {
        this.dispatchEvent(new CustomEvent('photo-upload', { detail: { url: e.detail.value || '' }, bubbles: true, composed: true }))
    }

    _dhEditorChange(e) {
        this.dispatchEvent(new CustomEvent('field-change', { detail: { key: 'content', value: e.detail.html }, bubbles: true, composed: true }))
    }

    // 3 nút tròn mở prompt ảnh trên site AI thứ 3 (ChatGPT/Gemini/Claude) — thuần client-side
    // (clipboard + window.open), không đụng state của cha nên xử lý thẳng ở đây, không cần event.
    _dhOpenExternalAI(site) {
        const subject = this.doc.fields.imagePrompt || this.doc.topic
        const prompt  = buildImagePrompt(subject, this.doc.colors)
        navigator.clipboard?.writeText(prompt).catch(() => {})
        const q = encodeURIComponent(prompt)
        const urls = {
            chatgpt: `https://chatgpt.com/?q=${q}`,
            claude:  `https://claude.ai/new?q=${q}`,
            gemini:  `https://aistudio.google.com/prompts/new_chat?model=gemini-3.1-flash-lite-image&prompt=${q}`,
        }
        window.open(urls[site], '_blank', 'noopener')
        toastEmit(this._txt.promptCopied, 'success')
    }

    // 3 nút tròn mở prompt ảnh trên site AI thứ 3 (ChatGPT/Gemini/Claude) — DÙNG CHUNG cho cả banner
    // "chờ chọn AI/Bỏ qua" (_rfAwaitingReview) và nút "Tạo lại ảnh" ở review phase
    // (_rfImageSubContent) — 2 chỗ chỉ khác nhau kích thước nút.
    _rfExternalAIButtons(height = '26px') {
        return html`
            <web-button square rounded="50%" height=${height} type="soft" ui=${this.ui} theme=${this.theme}
                prefix="simple-icons:openai" title="ChatGPT"
                @clicked=${() => this._dhOpenExternalAI('chatgpt')}></web-button>
            <web-button square rounded="50%" height=${height} type="soft" ui=${this.ui} theme=${this.theme}
                prefix="simple-icons:googlegemini" title="Gemini"
                @clicked=${() => this._dhOpenExternalAI('gemini')}></web-button>
            <web-button square rounded="50%" height=${height} type="soft" ui=${this.ui} theme=${this.theme}
                prefix="simple-icons:anthropic" title="Claude"
                @clicked=${() => this._dhOpenExternalAI('claude')}></web-button>
        `
    }

    // Banner khi job dừng chờ quyết định (xem _comPausedStep) — 2 dạng khác nhau: step ảnh cần
    // CHỌN (AI/Bỏ qua, kèm 3 nút mở trang ngoài luôn sẵn sàng vì imagePrompt đã dịch xong); step
    // text (vd concept) chỉ cần DUYỆT để chạy tiếp.
    _rfAwaitingReview(step) {
        const t = this._txt
        if (step.type === 'image') {
            return html`
                <div class="prg-pause">
                    <span>${t.imageChoicePrompt}</span>
                    <div class="prg-pause-actions">
                        <web-button type="fill" color="primary" height="26px" ui=${this.ui} theme=${this.theme}
                            ?disabled=${this.busy}
                            @clicked=${() => this._dhImageChoice('ai')}>${t.imageGenerateAi}</web-button>
                        <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                            ?disabled=${this.busy}
                            @clicked=${() => this._dhImageChoice('skip')}>${t.imageSkip}</web-button>
                        ${this._rfExternalAIButtons()}
                    </div>
                </div>
            `
        }
        // 1 hàng duy nhất: dòng chữ + nút Duyệt — nút "Tạo lại" đã chuyển xuống cấp sub-step (xem
        // _rfRegenerateRow), không còn ở cấp step nữa.
        return html`
            <div class="prg-pause">
                <span>${t.reviewPrompt}</span>
                <web-button type="fill" color="primary" height="26px" ui=${this.ui} theme=${this.theme}
                    ?disabled=${this.busy}
                    @clicked=${this._dhResumeStep}>${t.resumeApprove}</web-button>
            </div>
        `
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (!this.division || !this.doc) return html``
        const steps = this.division.meta.steps
        const items = steps.map(s => ({ id: String(s.id), label: s[this.lang] ?? s.vi, status: this._webStatus(this._stepState(s)) }))
        return html`
            ${this.doc.error ? html`
                <div class="prg-error">
                    <span>⚠️ ${this.doc.error}</span>
                    <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                        ?disabled=${this.busy}
                        @clicked=${this._dhRetry}>${this._txt.retry}</web-button>
                </div>
            ` : ''}
            ${this._comPausedStep ? this._rfAwaitingReview(this._comPausedStep) : ''}
            <web-steps linear size="md" ui=${this.ui} theme=${this.theme} class="horizontal-custom"
                .steps=${items} active=${this._comActiveMacroStep}>
                ${steps.map(s => html`<div slot=${String(s.id)} style="margin: 1rem">${this._rfSubSteps(s)}</div>`)}
            </web-steps>
            ${this._comCanApprove ? html`
                <div class="prg-approve">
                    <web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
                        ?loading=${this.busy} ?disabled=${this.busy}
                        @clicked=${this._dhApprove}>${this._txt.approve}</web-button>
                </div>
            ` : ''}
        `
    }

    _rfSubSteps(step) {
        const subs = step.type === 'image' ? IMAGE_SUBSTEP_LABELS : step.calls
        if (!subs?.length) return ''
        const items = subs.map(s => ({ id: s.key, label: s[this.lang] ?? s.vi, status: this._subStatus(step, s.key) }))
        if (items.every(i => i.status === 'pending')) return ''
        const active = items.find(i => i.status === 'active')?.id
            ?? [...items].reverse().find(i => i.status === 'done')?.id
            ?? items[0].id
        return html`
            <web-steps isVertical multiple linear size="sm" ui=${this.ui} theme=${this.theme}
                .steps=${items} active=${active}>
                ${subs.map(s => html`<div slot=${s.key}>${this._rfSubContent(step, s.key)}</div>`)}
            </web-steps>
        `
    }

    _rfSubContent(step, key) {
        if (step.type === 'image') return this._rfImageSubContent(step, key)
        const call = step.calls.find(c => c.key === key)
        if (!call) return ''
        // Call có đúng 1 field trùng tên chính nó (vd step2's contentPillars, step3's content) —
        // sub-step title (đã hiện qua web-steps' step.label) trùng luôn tên field, không lặp lại
        // label ở đây nữa, chỉ hiện value/editor.
        if (call.fields.length === 1 && call.fields[0].key === call.key) {
            const node = this._rfFieldValue(call.fields[0])
            return node ? html`<div class="prg-sub">${node}${this._rfRegenerateRow(step, call)}</div>` : ''
        }
        if (!call.fields.some(f => this.doc.fields[f.key])) return ''
        return html`
            <div class="prg-sub">
                ${call.fields.map(f => this.doc.fields[f.key] ? html`
                    <div class="prg-item">
                        <div class="prg-label">${f[this.lang] ?? f.vi}</div>
                        ${this._rfFieldValue(f)}
                    </div>
                ` : '')}
                ${this._rfRegenerateRow(step, call)}
            </div>
        `
    }

    // Ô nhập chỉ dẫn thêm ("Yêu cầu thay đổi thêm...") + nút "Tạo lại" ngay TẠI sub-step (call) này
    // — thay cho nút "Tạo lại" cấp CẢ step đã bỏ (xem _rfAwaitingReview) — granular hơn: sếp có thể
    // yêu cầu viết lại RIÊNG đúng call đang xem, kèm chỉ dẫn cụ thể, bất kỳ lúc nào call đã có dữ
    // liệu (không cần đang paused đúng step chứa nó).
    _rfRegenerateRow(step, call) {
        if (!this.editable) return ''
        const k = `${step.id}-${call.key}`
        // `runningSub` đánh dấu ĐÚNG "stepId-callKey" đang chạy thật (xem _dhRegenerateCall's
        // runSub) — dùng để chỉ nút của ĐÚNG call đang chạy hiện loading, không phải mọi nút
        // regenerate khác cũng loading theo `busy` (busy chỉ nên disable, không nên loading nhầm).
        const loading = this.runningSub?.has(k)
        return html`
            <div class="prg-regen-row">
                <web-texts single .value=${this._instructions[k] || ''} .ui=${this.ui} .theme=${this.theme}
                    placeholder=${this._txt.regeneratePlaceholder} height="32px" ?disabled=${this.busy}
                    @change=${e => this._dhInstructionChange(k, e)}></web-texts>
                <web-button type="soft" height="32px" ui=${this.ui} theme=${this.theme}
                    ?loading=${loading} ?disabled=${this.busy}
                    @clicked=${() => this._dhRegenerateCall(step, call.key)}>${this._txt.regenerate}</web-button>
            </div>
        `
    }

    // CHỈ field OUTPUT (trong division.meta.output.fields — title/description/content ở
    // marketing) sửa được, khi `editable` true. `content` giữ HTML đầy đủ + <svc-editor> (đủ
    // rich-text); `tags` dùng <web-texts> (multi-value, tách/nối bằng '|' — KHỚP schema thật của
    // posts/products.tags, xem services/schemas/admin/*.js's `multi:true`); field output khác
    // (title/description...) dùng <web-textarea>. Field trung gian (không nằm trong output.fields)
    // LUÔN chỉ hiển thị text, dù `editable` true.
    _rfFieldValue(f) {
        const isOutput = this._comOutputFields.has(f.key)
        if (f.key === 'content') {
            const raw = this.doc.fields.content || ''
            if (!raw) return ''
            if (this.editable && isOutput) {
                return html`<svc-editor .value=${raw} .ui=${this.ui} .theme=${this.theme} ai=${this.ai}
                    @change=${e => this._dhEditorChange(e)}></svc-editor>`
            }
            const val = this._comContentSnippet()
            return val ? html`<div class="prg-value">${val}</div>` : ''
        }
        if (f.key === 'tags') {
            const raw = this.doc.fields.tags || ''
            if (!raw) return ''
            if (this.editable && isOutput) {
                return html`<web-texts .value=${raw} .ui=${this.ui} .theme=${this.theme} height="32px"
                    @change=${e => this._dhFieldChange('tags', e)}></web-texts>`
            }
            return html`<div class="prg-value">${raw.split('|').filter(Boolean).join(', ')}</div>`
        }
        const raw = this.doc.fields[f.key] || ''
        if (!raw) return ''
        if (this.editable && isOutput) {
            return html`<web-textarea .value=${raw} .ui=${this.ui} rows="2"
                @input=${e => this._dhFieldChange(f.key, e)}></web-textarea>`
        }
        return html`<div class="prg-value">${raw}</div>`
    }

    _rfImageSubContent(step, key) {
        const t = this._txt
        if (key === 'concept' && this.doc.fields.imagePrompt) {
            return html`<div class="prg-sub"><div class="prg-value">${this.doc.fields.imagePrompt}</div></div>`
        }
        // Nút "Tạo lại ảnh" + 3 nút mở AI ngoài — hiện khi editable VÀ (đã xong hẳn HOẶC sếp đã chọn
        // "Bỏ qua" — xem svc-talk.js's _dhImageChoice). Riêng trường hợp "Bỏ qua", job có thể CHƯA
        // 'done' (image không phải step cuối ở division khác) nhưng sếp vẫn cần 3 nút mở trang
        // ngoài NGAY để tự làm ảnh — không thể chờ tới lúc cả job xong.
        const manualOk = this.editable && (this.doc.status === 'done' || this.doc.imageChoice === 'skip')
        if (key === 'generate' && manualOk) {
            return html`
                <div class="prg-sub prg-generate-actions">
                    <web-button type="soft" ui=${this.ui} theme=${this.theme} prefix="ri:refresh-line"
                        ?loading=${this.regeneratingImage} ?disabled=${this.regeneratingImage || this.busy}
                        @clicked=${() => this._dhRegenerateImage(step.id)}>${t.regenerateImage}</web-button>
                    ${this._rfExternalAIButtons('32px')}
                </div>
            `
        }
        // svc-photor cùng điều kiện với nút "Tạo lại ảnh" ở trên — cho phép sếp tự upload ảnh từ máy
        // tính (thay ảnh AI đã tạo, hoặc cung cấp ảnh khi đã chọn "Bỏ qua").
        if (key === 'upload') {
            const canUpload = manualOk
            if (!canUpload && !this.doc.fields.pics) return ''
            return html`
                <div class="prg-sub">
                    ${canUpload ? html`
                        <svc-photor .value=${this.doc.fields.pics} .ui=${this.ui} .lang=${this.lang}
                            @change=${e => this._dhPhotoUpload(e)}></svc-photor>
                    ` : ''}
                    ${this.doc.fields.pics ? html`<img class="prg-pics prg-pics-sm" src=${this.doc.fields.pics} alt="" />` : ''}
                </div>
            `
        }
        return ''
    }
}

// Tag name 'svc-progress', NOT 'svc-progress' — the Custom Elements registry is global per
// page, and division/svc-progress.js already registers 'svc-progress'; if both domains' scripts
// ever load on the same page (plausible during the transition period before a mount-point decision
// is made — see the deployment plan doc), reusing the tag name would silently make one class win
// and the other's `customElements.define()` become a no-op.
if (!customElements.get('svc-progress')) customElements.define('svc-progress', SvcProgress)
export default SvcProgress
