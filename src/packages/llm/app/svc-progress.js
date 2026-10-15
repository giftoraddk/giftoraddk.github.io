// src/packages/llm/app/svc-progress.js
//
// <svc-progress> — cây macro/sub-step (tiến trình + kết quả từng phần) cho view "Xem chi tiết" của svc-talk
// "Xem chi tiết" của 1 job chat. Ported from astro-micro's src/webs/llm/svc-progress.js (Task 13
// of the Event Bus Global + LLM domain port) — logic unchanged.
//
// Presentational — KHÔNG tự biết D1/collection nào, KHÔNG tự gọi AI. Nhận `outline` (khung step/call/field từ
// GET /v1/fn/spec — không có prompt) + `doc` (job: {fields, status, error, topic, colors, language}) qua prop,
// phát CustomEvent khi user tương tác — cha (svc-talk.js) tự nghe rồi gọi Worker qua service/talk.js.
//
// `editable`: CHỈ field OUTPUT cuối (outline.output.fields — title/description/content ở
// marketing) sửa được ngay trong cây step, phát `field-change` — `content` dùng <svc-editor> (HTML
// đầy đủ), field output khác dùng <web-textarea>. Field TRUNG GIAN (topicAnalysis, contentPillars,
// imagePrompt...) LUÔN chỉ hiển thị text, không sửa được ở đây. Ảnh (step `type:'image'`) sửa qua
// chính 2 sub-step "generate"/"upload" (nút Tạo lại ảnh + <svc-photor>), không qua field text.
// Job ĐÃ DUYỆT vẫn sửa được field output + ảnh (Worker đồng bộ sang bản ghi đã ghi ra) — field bàn giao, bảng phân
// công và nút "Tạo lại" (AI viết lại) thì khoá. title / description / content / tags có nút Sao chép (tool/copy.js).
import { LitElement, html, unsafeCSS } from 'lit'
import '@/packages/apex/web-steps.js'
import '@/packages/apex/web-button.js'
import '@/packages/apex/web-textarea.js'
import '@/packages/apex/web-texts.js'
import '@/packages/apex/web-text.js'
// `svc-photor`/`svc-editor` are astro-micro's `media` domain components, now ported into this
// repo's `packages/adopted/` tier (resolved — see docs/superpowers/plans's Task 13 update note).
import '@/packages/adopted/svc-photor.js'
import '@/packages/adopted/svc-editor.js'
import './svc-routing.js'
import { IMAGE_SUBSTEP_LABELS, buildImagePrompt } from '../service/image.js'
import { hideCodes } from '../tool/codes.js'
import { COPYABLE, copyText } from '../tool/copy.js'
import { txtLingo, toastEmit } from '@/services/tools/util.js'
import styles from '../css/svc-progress.css?inline'

const TXT_STD = {
    vi: {
        retry: 'Thử lại', skip: 'Bỏ qua', regenerateImage: 'Tạo lại ảnh', approve: 'Duyệt', regenerate: 'Tạo lại',
        promptCopied: 'Đã copy prompt ảnh — dán vào ô chat nếu trang không tự điền sẵn',
        reviewPrompt: '⏸️ Đang chờ duyệt để tiếp tục',
        resumeApprove: 'Duyệt',
        imageChoicePrompt: '⏸️ Sếp muốn để AI tự tạo ảnh hay tự làm ảnh từ trang khác?',
        imageGenerateAi: 'Tạo ảnh bằng AI', imageSkip: 'Bỏ qua, tự làm',
        regeneratePlaceholder: 'Yêu cầu thay đổi thêm (tuỳ chọn)...',
        signOff: (who) => `Nội dung này đã được ${who} xem và đồng ý`,
        signOffName: 'Họ tên người đã duyệt',
        copy: 'Sao chép', copyTags: 'Sao chép hashtag', copied: 'Đã sao chép', copyFailed: 'Không sao chép được — trình duyệt chặn clipboard',
    },
    en: {
        retry: 'Retry', skip: 'Skip', regenerateImage: 'Regenerate image', approve: 'Approve', regenerate: 'Regenerate',
        promptCopied: 'Image prompt copied — paste it in the chat box if not auto-filled',
        reviewPrompt: '⏸️ Awaiting approval to continue',
        resumeApprove: 'Approve',
        imageChoicePrompt: '⏸️ Generate the image with AI, or make it yourself on another site?',
        imageGenerateAi: 'Generate with AI', imageSkip: 'Skip, I\'ll do it myself',
        regeneratePlaceholder: 'Additional change request (optional)...',
        signOff: (who) => `This has been reviewed and agreed by ${who}`,
        signOffName: 'Name of the reviewer',
        copy: 'Copy', copyTags: 'Copy hashtags', copied: 'Copied', copyFailed: 'Couldn\'t copy — the browser blocked the clipboard',
    },
}

// Step ảnh coi là "xong" nếu đã có pics THẬT SỰ, HOẶC sếp đã chủ động chọn "Bỏ qua" (doc.imageChoice
// === 'skip' — xem service/talk.js's imageChoice) — không thì step ảnh bị bỏ qua sẽ hiện 'pending'
// mãi mãi dù job đã 'done' thật.
function stepDone(step, doc) {
    if (step.type === 'image') return !!doc.fields.pics || doc.imageChoice === 'skip'
    return step.calls.flatMap(c => c.fields.map(f => f.key)).every(k => (doc.fields[k] || '').toString().trim())
}

// Doc không có granularity theo call thật (chỉ theo step) — suy ra step "đang chạy" bằng step
// PENDING đầu tiên khi doc chưa done/lỗi. `awaiting_review` — job đang DỪNG chờ sếp quyết định (xem
// _comPausedStep) — không có gì đang "chạy" thật lúc này.
export function autoRunningStep(outline, doc) {
    if (doc.status === 'done' || doc.error || doc.status === 'awaiting_review') return 0
    const next = outline.steps.find(s => !stepDone(s, doc))
    return next?.id ?? 0
}

export function autoFailedStep(doc) {
    if (!doc.error) return 0
    return Number(String(doc.status || '').replace('step', '')) || 0
}

/** Job đang lỗi ĐÚNG ở step ảnh — cho phép "Bỏ qua, tự làm" thay vì chỉ Thử lại. */
export function failedAtImageStep(outline, doc) {
    const id = autoFailedStep(doc)
    return !!id && !!outline?.steps?.some(s => Number(s.id) === id && s.type === 'image')
}

export class SvcProgress extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        // Standard svc-* baseline (CLAUDE.md)
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, bg: { type: Object }, textColor: { type: String },
        value: {}, actived: {}, service: { type: String },
        _data: { state: true }, _actived: { state: true },

        // Component-specific
        outline:     { type: Object },  // khung step từ GET /v1/fn/spec/:division (không có role/task/desc)
        doc:         { type: Object },
        runningStep: { type: Number },  // 0 = tự suy luận qua autoRunningStep()
        failedStep:  { type: Number },  // 0 = tự suy luận qua autoFailedStep()
        runningSub:  { type: Object },  // Set<"stepId-callKey"> sub-step đang chạy thật (spinner) — optional
        editable:    { type: Boolean }, // sửa field OUTPUT inline (title/description/content) + hiện nút Tạo lại ảnh/upload khi step ảnh done
        approvable:  { type: Boolean }, // hiện nút "Duyệt" khi doc đã xong & chưa duyệt, phát `approve`
        // Nơi chứa tự đặt nút Duyệt (bước text đang dừng + kết quả + xác nhận chuyên gia) — vd <svc-job-card> trong
        // svc-talk: ẩn các nút đó ở đây. Banner lỗi / chọn ảnh vẫn hiện.
        externalActions: { type: Boolean },
        regeneratingImage: { type: Boolean }, // cha set true trong lúc chờ AI tạo lại ảnh (loading nút)
        busy: { type: Boolean }, // cha set true khi job/doc này đang có 1 hành động chưa xong — disable mọi nút hành động khác
        ai: { type: String }, // forward cho <svc-editor> (field `content`) — AI-assist trong editor
        // Job Thư ký: { routing, plan } Worker tính (task view) — call Phân công hiện bảng <svc-routing> thay các field
        // thô; `faces` / `titles` = tên + ảnh phòng. null với mọi job khác.
        routing: { type: Object }, faces: { type: Object }, titles: { type: Object },
        lang: { type: String }, txt: { type: Object },
        // Nội dung chỉ dẫn thêm sếp gõ cho nút "Tạo lại" cấp sub-step (xem _rfRegenerateRow) —
        // Map<"stepId-callKey", string>, thuần local UI state (KHÔNG persist).
        _instructions: { state: true },
        // Xác nhận chuyên gia đã duyệt (outline.review) — chỉ UI cục bộ, gửi kèm `approve`; Worker tự đòi lại.
        _signOffOk: { state: true },
        _signOffBy: { state: true },
    }

    constructor() {
        super()
        // Standard svc-* baseline
        this.ui = 'modern'; this.theme = ''
        this.mainColors = ''; this.bg = null; this.textColor = ''
        this.value = undefined; this.actived = undefined; this.service = ''
        this._data = null; this._actived = null

        // Component-specific
        this.outline = null
        this.doc = null
        this.runningStep = 0
        this.failedStep = 0
        this.runningSub = null
        this.editable = false
        this.approvable = false
        this.externalActions = false
        this.regeneratingImage = false
        this.busy = false
        this.ai = ''
        this.routing = null; this.faces = {}; this.titles = {}
        this.lang = 'vi'; this.txt = null
        this._instructions = {}
        this._signOffOk = false
        this._signOffBy = ''
    }

    willUpdate(changed) {
        // Job khác → xác nhận của job trước không được dính sang
        if (changed.has('doc') && changed.get('doc')?.id !== this.doc?.id) { this._signOffOk = false; this._signOffBy = '' }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _comRunningStep() { return this.runningStep || autoRunningStep(this.outline, this.doc) }
    get _comFailedStep()  { return this.failedStep  || autoFailedStep(this.doc) }
    // Field output + field bàn giao (produces) sửa được — sếp chỉnh bối cảnh của Thư ký trước khi nó phân công (P3-4, P3-11); bảng phân công sửa qua <svc-routing>.
    // Đã duyệt: chỉ field output (Worker đồng bộ sang bản ghi đã ghi ra) — bàn giao giữ đúng bản đã duyệt.
    get _comOutputFields() {
        const out = this.outline?.output?.fields || []
        if (this.doc?.approved) return new Set(out)
        return new Set([...out, ...(this.outline?.produces || []).flatMap(p => p.fields)])
    }
    get _comCanApprove() {
        return this.approvable && this.doc.status === 'done' && !this.doc.approved && !!(this.outline?.output || this.outline?.produces?.length)
    }
    // Ngành đòi chuyên gia (bác sĩ, luật sư…) duyệt kết quả phòng này trước — { vi, en } hoặc null.
    get _comReview() { return this.outline?.review || null }
    get _comSignOffReady() { return !this._comReview || (this._signOffOk && this._signOffBy.trim().length >= 2) }

    // Step đang khiến job DỪNG LẠI chờ quyết định (mọi step `type:'text'` xong đều dừng chờ Duyệt,
    // hoặc lựa chọn AI/Bỏ qua của step ảnh) — null nếu doc không ở trạng thái này.
    get _comPausedStep() {
        if (this.doc.status !== 'awaiting_review' || !this.doc.pausedStepId) return null
        // So sánh qua Number() — `pausedStepId` là cột TEXT trên D1 (talks table); Cloudflare D1
        // bind số JS thường qua sqlite3_bind_double() (REAL), nên SQLite lưu "3.0" (text) chứ
        // KHÔNG PHẢI "3" — String(s.id)===String(pausedStepId) ("3" vs "3.0") vẫn fail. Number()
        // chịu được cả 2 dạng ("3"/"3.0"/3), so === trực tiếp fail silently làm mất banner "Duyệt".
        return this.outline.steps.find(s => Number(s.id) === Number(this.doc.pausedStepId)) || null
    }

    // Sếp đã chọn "Bỏ qua" AI ở step ảnh nhưng CHƯA thật sự có ảnh — `stepDone()` vẫn coi step này
    // "xong" nên job KHÔNG chờ, NHƯNG pipeline vì vậy có thể đã tiến sang step SAU đó, khiến
    // `_comActiveMacroStep` tự nhảy theo tiến độ mới, "giấu" luôn tab step ảnh (chứa 3 nút mở AI
    // ngoài + ô upload cho sếp tự làm) sau nhiều cú click mới xem lại được. Ghim tab ở ĐÚNG step
    // ảnh này cho tới khi có `pics` thật, để 3 nút + input LUÔN hiện sẵn ngay khi mở popup.
    get _comNeedsManualImageStep() {
        if (this.doc.imageChoice !== 'skip' || this.doc.fields.pics) return null
        return this.outline.steps.find(s => s.type === 'image') || null
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
        const steps = this.outline.steps
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
    // vẫn bị web-steps.js giấu kín, sếp không cách nào mở ra được. 'open' (không phải 'active'): mở sẵn
    // nhưng không quay loading — không có gì đang chạy, chỉ chờ sếp tự tạo / tải ảnh lên. Chỉ khi `editable`
    // (job chưa duyệt): đã duyệt thì Worker không nhận ảnh nữa — mở ra cũng chẳng có gì để làm.
    _subStatus(step, key) {
        const k = `${step.id}-${key}`
        if (this.runningSub?.has(k)) return 'active'
        if (this._subHasData(step, key)) return 'done'
        if (step.type === 'image' && key !== 'concept' && this.doc.imageChoice === 'skip' && this.editable) return 'open'
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
        if (!this._comSignOffReady) return
        const detail = this._comReview ? { expertReview: { confirmed: true, by: this._signOffBy.trim() } } : {}
        this.dispatchEvent(new CustomEvent('approve', { detail, bubbles: true, composed: true }))
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
    // xem service/talk.js's imageChoice.
    _dhImageChoice(choice) {
        this.dispatchEvent(new CustomEvent('image-choice', { detail: { choice }, bubbles: true, composed: true }))
    }

    _dhRegenerateImage(stepId) {
        this.dispatchEvent(new CustomEvent('regenerate-image', { detail: { stepId }, bubbles: true, composed: true }))
    }

    _dhPhotoUpload(e) {
        this.dispatchEvent(new CustomEvent('photo-upload', { detail: { url: e.detail.value || '' }, bubbles: true, composed: true }))
    }

    // content: kèm bản HTML cho trình soạn thảo / nơi nhận định dạng, chữ thuần cho nơi khác; tags: '#tag1 #tag2'.
    async _dhCopy(key) {
        const raw = String(this.doc.fields[key] ?? '')
        const text = copyText(key, raw)
        try {
            if (key === 'content' && globalThis.ClipboardItem && navigator.clipboard?.write) {
                await navigator.clipboard.write([new ClipboardItem({
                    'text/html': new Blob([raw], { type: 'text/html' }),
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                })])
            } else {
                await navigator.clipboard.writeText(text)
            }
            toastEmit(this._txt.copied, 'success')
        } catch {
            toastEmit(this._txt.copyFailed, 'error')
        }
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
                @click=${() => this._dhOpenExternalAI('chatgpt')}></web-button>
            <web-button square rounded="50%" height=${height} type="soft" ui=${this.ui} theme=${this.theme}
                prefix="simple-icons:googlegemini" title="Gemini"
                @click=${() => this._dhOpenExternalAI('gemini')}></web-button>
            <web-button square rounded="50%" height=${height} type="soft" ui=${this.ui} theme=${this.theme}
                prefix="simple-icons:anthropic" title="Claude"
                @click=${() => this._dhOpenExternalAI('claude')}></web-button>
        `
    }

    // Banner khi job dừng chờ quyết định (xem _comPausedStep) — 2 dạng khác nhau: step ảnh cần
    // CHỌN (AI/Bỏ qua, kèm 3 nút mở trang ngoài luôn sẵn sàng vì imagePrompt đã dịch xong); step
    // text (vd concept) chỉ cần DUYỆT để chạy tiếp.
    _rfAwaitingReview(step) {
        const t = this._txt
        if (step.type === 'image') {
            return html`
                <div class="prg-pause ${this.externalActions ? 'is-flow' : ''}">
                    <span>${t.imageChoicePrompt}</span>
                    <div class="prg-pause-actions">
                        <web-button type="fill" color="primary" height="26px" ui=${this.ui} theme=${this.theme}
                            ?disabled=${this.busy}
                            @click=${() => this._dhImageChoice('ai')}>${t.imageGenerateAi}</web-button>
                        <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                            ?disabled=${this.busy}
                            @click=${() => this._dhImageChoice('skip')}>${t.imageSkip}</web-button>
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
                    @click=${this._dhResumeStep}>${t.resumeApprove}</web-button>
            </div>
        `
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (!this.outline || !this.doc) return html``
        const steps = this.outline.steps
        const items = steps.map(s => ({ id: String(s.id), label: s[this.lang] ?? s.vi, status: this._webStatus(this._stepState(s)) }))
        return html`
            ${this.doc.error && !this.doc.approved ? html`
                <div class="prg-error">
                    <span>⚠️ ${this.doc.error}</span>
                    <div class="prg-error-actions">
                        <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                            ?disabled=${this.busy}
                            @click=${this._dhRetry}>${this._txt.retry}</web-button>
                        ${failedAtImageStep(this.outline, this.doc) && (this.doc.fields?.imagePrompt || '').trim() ? html`
                            <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                                ?disabled=${this.busy}
                                @click=${() => this._dhImageChoice('skip')}>${this._txt.skip}</web-button>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            ${this._comPausedStep && !(this.externalActions && this._comPausedStep.type === 'text') ? this._rfAwaitingReview(this._comPausedStep) : ''}
            <web-steps linear size="md" ui=${this.ui} theme=${this.theme}
                .steps=${items} active=${this._comActiveMacroStep}>
                ${steps.map(s => html`<div slot=${String(s.id)}>${this._rfSubSteps(s)}</div>`)}
            </web-steps>
            ${this._comCanApprove && !this.externalActions ? html`
                ${this._rfSignOff()}
                <div class="prg-approve">
                    <web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
                        ?loading=${this.busy} ?disabled=${this.busy || !this._comSignOffReady}
                        @click=${this._dhApprove}>${this._txt.approve}</web-button>
                </div>
            ` : ''}
        `
    }

    // Phòng mà ngành đòi chuyên gia duyệt: sếp xác nhận + ghi tên người đã duyệt rồi mới Duyệt được (Worker ghi lại cả 2).
    _rfSignOff() {
        const review = this._comReview
        if (!review) return ''
        const t = this._txt
        return html`
            <div class="prg-signoff">
                <label class="prg-signoff-check">
                    <input type="checkbox" .checked=${this._signOffOk} ?disabled=${this.busy}
                        @change=${(e) => { this._signOffOk = e.target.checked }}>
                    <span>${t.signOff(review[this.lang] || review.vi)}</span>
                </label>
                <web-text placeholder=${t.signOffName} .value=${this._signOffBy} height="32px" ?disabled=${this.busy}
                    @input=${(e) => { this._signOffBy = e.detail.value }}></web-text>
            </div>
        `
    }

    _rfSubSteps(step) {
        const subs = step.type === 'image' ? IMAGE_SUBSTEP_LABELS : step.calls
        if (!subs?.length) return ''
        const items = subs.map(s => ({ id: s.key, label: s[this.lang] ?? s.vi, status: this._subStatus(step, s.key) }))
        if (items.every(i => i.status === 'pending')) return ''
        const active = items.find(i => i.status === 'active' || i.status === 'open')?.id
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
        // Call Phân công (field máy đọc `activation`) — bảng phòng ban; sếp thêm / bỏ / đổi chủ trì khi chưa duyệt.
        if (this.routing && call.fields.some(f => f.key === 'activation')) {
            return html`
                <div class="prg-sub">
                    <svc-routing .routing=${this.routing} .rationale=${this.doc.fields.rationale || ''} .faces=${this.faces}
                        .titles=${this.titles} ?editable=${this.editable && !this.doc.approved && this.doc.status === 'done'}
                        ?busy=${this.busy} lang=${this.lang} ui=${this.ui} theme=${this.theme}></svc-routing>
                    ${this._rfRegenerateRow(step, call)}
                </div>
            `
        }
        // Call có đúng 1 field trùng tên chính nó (vd step2's contentPillars, step3's content) —
        // sub-step title (đã hiện qua web-steps' step.label) trùng luôn tên field, không lặp lại
        // label ở đây nữa, chỉ hiện value/editor.
        if (call.fields.length === 1 && call.fields[0].key === call.key) {
            const node = call.fields[0].hidden ? '' : this._rfFieldValue(call.fields[0])
            return node ? html`<div class="prg-sub">${node}${this._rfRegenerateRow(step, call)}</div>` : ''
        }
        // Field máy đọc (outline `hidden`, vd mức kích hoạt của Phân công) — Worker dùng ngầm, sếp không cần thấy.
        const shown = call.fields.filter(f => !f.hidden)
        if (!shown.some(f => this.doc.fields[f.key])) return ''
        return html`
            <div class="prg-sub">
                ${shown.map(f => this.doc.fields[f.key] ? html`
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
        if (!this.editable || this.doc.approved) return '' // đã duyệt: sửa tay được, AI không viết lại nữa
        if (this.doc.trial) return '' // job dùng thử: mỗi call chạy 1 lần (Worker fn/trial.ts cũng chặn) — sửa tay vẫn được
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
                    @click=${() => this._dhRegenerateCall(step, call.key)}>${this._txt.regenerate}</web-button>
            </div>
        `
    }

    // CHỈ field OUTPUT (trong outline.output.fields — title/description/content ở
    // marketing) sửa được, khi `editable` true. `content` giữ HTML đầy đủ + <svc-editor> (đủ
    // rich-text); `tags` dùng <web-texts> (multi-value, tách/nối bằng '|' — KHỚP schema thật của
    // posts/products.tags, xem services/schemas/admin/*.js's `multi:true`); field output khác
    // (title/description...) dùng <web-textarea>. Field trung gian (không nằm trong output.fields)
    // LUÔN chỉ hiển thị text, dù `editable` true.
    // Giá trị 1 field + nút Sao chép (title / description / content / tags) khi có nội dung.
    _rfFieldValue(f) {
        const node = this._rfFieldBody(f)
        if (!node || !COPYABLE.has(f.key)) return node
        const t = this._txt
        return html`
            <div class="prg-copyable">
                ${node}
                <div class="prg-copy-row">
                    <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme} prefix="ri:file-copy-line"
                        @click=${() => this._dhCopy(f.key)}>${f.key === 'tags' ? t.copyTags : t.copy}</web-button>
                </div>
            </div>
        `
    }

    _rfFieldBody(f) {
        const isOutput = this._comOutputFields.has(f.key)
        if (f.key === 'content') {
            const raw = this.doc.fields.content || ''
            if (!raw) return ''
            if (this.editable && isOutput) {
                return html`<svc-editor .value=${raw} ui="modern" .theme=${this.theme} ai=${this.ai}
                    @change=${e => this._dhEditorChange(e)}></svc-editor>`
            }
            const val = this._comContentSnippet()
            return val ? html`<div class="prg-value">${val}</div>` : ''
        }
        if (f.key === 'tags') {
            const raw = this.doc.fields.tags || ''
            if (!raw) return ''
            if (this.editable && isOutput) {
                return html`<web-texts .value=${raw} ui="modern" .theme=${this.theme} height="32px"
                    @change=${e => this._dhFieldChange('tags', e)}></web-texts>`
            }
            return html`<div class="prg-value">${raw.split('|').filter(Boolean).join(', ')}</div>`
        }
        const raw = this.doc.fields[f.key] || ''
        if (!raw) return ''
        if (this.editable && isOutput) {
            return html`<web-textarea .value=${raw} ui="modern" rows="2"
                @input=${e => this._dhFieldChange(f.key, e)}></web-textarea>`
        }
        return html`<div class="prg-value">${hideCodes(raw)}</div>`
    }

    _rfImageSubContent(step, key) {
        const t = this._txt
        if (key === 'concept' && this.doc.fields.imagePrompt) {
            return html`<div class="prg-sub"><div class="prg-value">${this.doc.fields.imagePrompt}</div></div>`
        }
        // Nút "Tạo lại ảnh" + 3 nút mở AI ngoài — hiện khi editable VÀ (đã xong hẳn HOẶC sếp đã chọn
        // "Bỏ qua" — xem service/talk.js's imageChoice). Riêng trường hợp "Bỏ qua", job có thể CHƯA
        // 'done' (image không phải step cuối ở division khác) nhưng sếp vẫn cần 3 nút mở trang
        // ngoài NGAY để tự làm ảnh — không thể chờ tới lúc cả job xong.
        const manualOk = this.editable && (this.doc.status === 'done' || this.doc.imageChoice === 'skip')
        if (key === 'generate' && manualOk) {
            return html`
                <div class="prg-sub prg-generate-actions">
                    ${this.doc.trial ? '' : html`<web-button type="soft" ui=${this.ui} theme=${this.theme} prefix="ri:refresh-line"
                        ?loading=${this.regeneratingImage} ?disabled=${this.regeneratingImage || this.busy}
                        @click=${() => this._dhRegenerateImage(step.id)}>${t.regenerateImage}</web-button>`}
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

// Tag name 'svc-progress' — the Custom Elements registry is global per page; guard against a
// double-define if this module is evaluated twice (e.g. HMR).
if (!customElements.get('svc-progress')) customElements.define('svc-progress', SvcProgress)
export default SvcProgress
