// src/webs/llm/tools/admin-base.js
//
// DivisionAdminBase — orchestrator LitElement dùng chung bởi svc-marketing.js VÀ svc-production.js
// trong domain này (mỗi phòng ban 1 popup AI content riêng, attach vào 1 hàng web-table qua prop
// `marketing`/`production` — xem web-table.js/svc-admin.js). Cloned from
// division/tools/admin-base.js (domain-isolation clone — viết mới độc lập, không import/extends từ
// division/) — logic giữ nguyên 100%, CHỈ đổi chỗ đọc/ghi `divisions` sang Cloudflare D1 (LLM_DB,
// xem tools/server.js) thay vì Firestore, để dùng CHUNG 1 config chuyên môn 'marketing'/'production'
// với llm/svc-talk.js (không phải 2 bản `divisions` lệch nhau giữa chat và popup). `processTable`
// (collection tiến trình Firestore, vd 'marketing'/'productions' — truyền qua prop từ svc-admin.js)
// GIỮ NGUYÊN Firestore DB_ALL — không có bảng D1 tương đương, và giữ nguyên tên collection cũ để
// không mất tiến trình admin đang dở dang khi chuyển từ bản division/ sang bản này.
//
// KHÔNG tự đăng ký customElements — mỗi subclass tự `customElements.define(...)` tag riêng + khai
// default props/SEED/TXT_STD/SAVED_EVENT của mình.
import { LitElement, html, unsafeCSS } from 'lit'
import '@/webs/apex/web-dialog.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-select.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-colors.js'
import '../svc-progress.js'
import '../svc-review.js'
import { createService } from '@/services/crud.js'
import { DEFAULT_CHAIN } from '@/services/tensor.js'
import { txtLingo, toastEmit } from '@/services/helper.js'
import { LLM_DB } from './server.js'
import { runTextStep, regenerateCall, generateJsonWithRetry, allFieldKeys, LANGUAGE_OPTIONS } from './engine.js'
import { runImageStep, runImageConcept, runImageGenerate, escapeAttr, stripLeadingFigure } from './image.js'
import styles from '../styles/admin-base.css?inline'

export const LANGUAGE_SELECT_OPTS = LANGUAGE_OPTIONS.map(o => ({ value: o.value, label: o.label }))

function _freshDoc(recordId, relation, language, division) {
    return {
        id: recordId, record_id: recordId, relation,
        topic: '', language: language || 'vi', colors: '',
        status: 'idle', error: '',
        fields: Object.fromEntries(allFieldKeys(division).map(k => [k, ''])),
        created_at: null, updated_at: null,
    }
}

export class DivisionAdminBase extends LitElement {
    static styles = unsafeCSS(styles)

    // Subclass PHẢI override: static SEED (seed object, xem tools/seed-*.js), static SEED_ID (doc
    // id khớp seed), static TXT_STD ({vi,en} — topicLabel/generate/errNeedTopic/titleLabel/...),
    // static SAVED_EVENT (tên CustomEvent phát sau khi Lưu, vd 'marketing:saved'/'production:saved').
    static SEED = null
    static SEED_ID = ''
    static TXT_STD = { vi: {}, en: {} }
    static SAVED_EVENT = 'saved'

    static properties = {
        table:    { type: String },  // bảng đích ghi kết quả cuối (division.meta.output.table) — Firestore DB_ALL
        processTable: { type: String },  // collection lưu tiến trình — Firestore DB_ALL
        division: { type: String },  // doc id trong bảng `divisions` (LLM_DB)
        ai:       { type: String },
        ui:       { type: String }, theme: { type: String }, lang: { type: String },
        txt:      { type: Object },

        _open:        { state: true },
        _recordId:    { state: true },
        _phase:       { state: true },  // 'input' | 'running' | 'review'
        _division:    { state: true },  // doc từ bảng `divisions` (LLM_DB, config chuyên môn)
        _doc:         { state: true },
        _loading:     { state: true },  // đang chờ _dfSave()
        _runningStep: { state: true },  // 0 = không có step nào đang chạy, id step đang chạy
        _failedStep:  { state: true },  // 0 = không lỗi, id step lỗi cần retry
        _error:       { state: true },
        _runningSub:  { state: true },  // Set<"stepId-callKey"> sub-step đang chạy thật (feedback UI cho <svc-progress>)
        _regeneratingImage: { state: true }, // đang chờ nút "Tạo lại ảnh" ở review phase (_dfRegenerateImage)
        _choosingImage: { state: true }, // đang giữa lúc lưu lựa chọn AI/Bỏ qua (_dfImageChoice) — trước khi _runningStep kịp lên khác 0
        _regeneratingCall: { state: true }, // đang chờ nút "Tạo lại" cấp sub-step (_dfRegenerateCall)
    }

    constructor() {
        super()
        this.table    = 'records'
        this.processTable = ''
        this.division = ''
        this.ai       = ''
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi'; this.txt = null
        this._open        = false
        this._recordId    = ''
        this._phase        = 'input'
        this._division      = null
        this._doc           = null
        this._loading       = false
        this._runningStep   = 0
        this._failedStep    = 0
        this._error         = ''
        this._runningSub    = new Set()
        this._regeneratingImage = false
        this._choosingImage  = false
        this._regeneratingCall = false
        this._reqId          = 0 // guard chống race khi đóng popup/regenerate giữa lúc đang chờ AI — không phải Lit property
    }

    connectedCallback() {
        super.connectedCallback()
        this._dcLoadDivision()
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    async open(recordId) {
        if (!recordId) return
        if (!this._division) await this._dcLoadDivision()
        this._recordId = recordId
        this._open      = true
        this._error      = ''
        await this._dcLoadDoc(recordId)
    }

    close() { this._reqId++; this._open = false }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcLoadDivision() {
        if (this._division) return
        const Ctor = this.constructor
        try {
            const doc = await createService('divisions', '', LLM_DB).findById(this.division)
            if (doc) { this._division = doc; return }
        } catch (err) {
            console.error(`[${Ctor.name}] failed to load division config:`, err.message)
        }
        // Chưa có trong D1 (lần đầu chạy) — dùng seed local ngay, rồi ghi vào DB để lần sau đọc
        // thẳng + sửa được qua Xuất/Nhập của /admin/divisions.
        if (!Ctor.SEED || this.division !== Ctor.SEED_ID) return
        this._division = Ctor.SEED
        const svc = createService('divisions', '', LLM_DB)
        const now = await svc.now()
        svc.set(Ctor.SEED_ID, { ...Ctor.SEED, created_at: now, updated_at: now, deleted_at: null, index: 0 })
            .catch(err => console.error(`[${Ctor.name}] failed to seed division doc:`, err.message))
    }

    async _dcLoadDoc(recordId) {
        this._runningStep = 0
        this._failedStep  = 0
        // <svc-marketing>/<svc-production> là 1 instance dùng lại cho nhiều row (svc-admin.js
        // gọi open(id) mỗi lần) — xoá sạch tiến trình con của lượt trước, tránh hiện nhầm dấu tick
        // của record A khi vừa mở record B.
        this._runningSub = new Set()
        this._regeneratingImage = false
        try {
            const existing = await this._svc.findById(recordId)
            if (existing?.status === 'done') {
                this._doc = existing
                this._phase = 'review'
            } else if (existing?.status && existing.status !== 'idle') {
                this._doc = existing
                this._failedStep = Number(String(existing.status).replace('step', '')) || 0
                this._error = existing.error || ''
                this._phase = 'running'
            } else {
                this._doc = _freshDoc(recordId, this.table, this.lang, this._division)
                this._phase = 'input'
            }
        } catch (err) {
            console.error(`[${this.constructor.name}] load failed:`, err.message)
            this._doc = _freshDoc(recordId, this.table, this.lang, this._division)
            this._phase = 'input'
        }
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhTopicInput(e)    { this._doc = { ...this._doc, topic: e.detail.value } }
    _dhLanguageChange(e) { this._doc = { ...this._doc, language: e.detail.value } }
    _dhColorsChange(e)   { this._doc = { ...this._doc, colors: e.detail.value } }

    // `field-change` từ <svc-review> — field OUTPUT cuối (title/description/content/pics), CHƯA
    // persist ngay, chỉ cập nhật local state — Lưu thật diễn ra khi bấm nút Lưu (_dfSave).
    _dhReviewFieldChange(e) {
        const { key, value } = e.detail
        this._doc = { ...this._doc, fields: { ...this._doc.fields, [key]: value } }
    }

    // `field-change` từ <svc-progress> — field TRUNG GIAN sửa xong là persist NGAY vào
    // processTable's doc — không có nút "Lưu" riêng cho các field này.
    async _dhProgressFieldChange(e) {
        const { key, value } = e.detail
        const now = await this._svc.now()
        this._doc = { ...this._doc, fields: { ...this._doc.fields, [key]: value }, updated_at: now }
        await this._svc.set(this._recordId, this._doc)
    }

    // `photo-upload` từ <svc-progress> (sub-step 'upload', review phase) — user tự upload ảnh
    // từ máy tính để THAY ảnh AI đã tạo. Thay hẳn <figure> ảnh cũ trong content bằng ảnh mới (hoặc
    // bỏ hẳn nếu url rỗng), cùng cách _dfRegenerateImage() làm, rồi persist ngay vào doc (KHÔNG đụng
    // tới bản ghi cuối cùng ở `table`, chỉ ghi khi Lưu).
    async _dhPhotoUpload(url) {
        if (url === this._doc.fields.pics) return
        const bodyContent = stripLeadingFigure(this._doc.fields.content)
        const figure = url
            ? `<figure data-media-wrap="image" data-align="center"><img src="${escapeAttr(url)}" alt="${escapeAttr(this._doc.fields.title || this._doc.topic)}"></figure>`
            : ''
        const now = await this._svc.now()
        this._doc = { ...this._doc, fields: { ...this._doc.fields, pics: url, content: `${figure}${bodyContent}` }, updated_at: now }
        await this._svc.set(this._recordId, this._doc)
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    /**
     * Flow pipeline AI: chạy step fromStepId..cuối tuần tự, ghi Firestore ngay sau mỗi step thành
     * công (retry không mất kết quả step trước) -> phase 'review' khi xong step cuối.
     */
    async _dfRunPipeline(fromStepId) {
        if (this._comBusy) return
        const steps = this._division.meta.steps
        const startIdx = fromStepId == null ? 0 : steps.findIndex(s => s.id === fromStepId)
        if (startIdx <= 0) {
            const topic = (this._doc.topic || '').trim()
            if (!topic) { this._error = this._txt.errNeedTopic; return }
            if (!this.ai) { this._error = this._txt.errNeedAi; return }
            // Chạy mới từ đầu (không phải retry 1 step lẻ) — xoá sạch trạng thái sub-step của
            // LƯỢT TRƯỚC, tránh step sau hiện nhầm dấu tick xanh "đã xong" từ lần chạy cũ trong
            // lúc step đầu của lượt mới còn đang chạy.
            this._runningSub = new Set()
        }
        this._error       = ''
        this._failedStep  = 0
        this._phase        = 'running'
        const reqId = ++this._reqId

        for (let i = Math.max(startIdx, 0); i < steps.length; i++) {
            const step = steps[i]
            const isLast = i === steps.length - 1
            this._runningStep = step.id
            try {
                const patch = await this._runStep(step, reqId)
                if (reqId !== this._reqId) return
                const now = await this._svc.now()
                const fields = { ...this._doc.fields, ...patch }

                // Step ảnh CHƯA chọn AI/Bỏ qua — patch mới chỉ dịch xong concept (chưa có pics) —
                // dừng NGAY tại ĐÚNG step này, chờ _dfImageChoice() chọn xong mới chạy tiếp.
                if (step.type === 'image' && !this._doc.imageChoice && !patch.pics) {
                    this._runningStep = 0
                    this._doc = { ...this._doc, fields, status: 'awaiting_review', pausedStepId: step.id, updated_at: now }
                    await this._svc.set(this._recordId, this._doc)
                    return
                }

                // MỌI step `type:'text'` (trừ step cuối) đều dừng lại chờ sếp bấm "Duyệt"
                // (_dfResumeStep) trước khi chạy step kế — step ảnh có cơ chế chờ riêng ở nhánh
                // phía trên (concept/AI/Bỏ qua), không cần dừng thêm lần nữa ở đây.
                const pause = !isLast && step.type === 'text'
                this._doc = {
                    ...this._doc, fields,
                    status: pause ? 'awaiting_review' : (isLast ? 'done' : `step${step.id}`),
                    pausedStepId: pause ? step.id : '',
                    error: '', updated_at: now, created_at: this._doc.created_at || now,
                }
                await this._svc.set(this._recordId, this._doc)
                if (pause) { this._runningStep = 0; return }
            } catch (err) {
                if (reqId !== this._reqId) return
                this._runningStep = 0
                this._failedStep  = step.id
                this._error         = err.message || String(err)
                this._doc            = { ...this._doc, status: `step${step.id}`, error: this._error }
                await this._svc.set(this._recordId, this._doc).catch(err => console.error(`[${this.constructor.name}] failed to persist error state:`, err.message))
                return
            }
        }
        this._runningStep = 0
        this._phase         = 'review'
    }

    // Chạy 1 step (bất kể type) — `type:'text'` chạy qua engine.js's runTextStep (song song theo
    // dependsOn); `type:'image'` chạy qua image.js's runImageStep. `_subReset` xoá state sub-step
    // CŨ của đúng step này trước khi chạy lại (fresh run hoặc retry riêng step đó).
    async _runStep(step, reqId) {
        this._subReset(step.id)
        const hasData = key => this._subHasData(step, key)
        const runSub  = (key, fn) => this._runSub(reqId, step.id, key, fn)
        if (step.type === 'image') {
            // Chưa quyết định AI/Bỏ qua — CHỈ dịch concept (rẻ, an toàn), KHÔNG tự gọi Hugging Face —
            // _dfRunPipeline tự dừng ngay sau patch này chờ _dfImageChoice().
            if (!this._doc.imageChoice) {
                return runImageConcept({
                    topic: this._doc.topic,
                    fields: this._doc.fields,
                    contextKeys: step.concept?.contextKeys || [],
                    generateJson: opts => generateJsonWithRetry(this._comJsonAi, { ...opts, errMessage: this._txt.errBadResponse }),
                    hasData, runSub,
                })
            }
            // 'skip' — user tự làm ảnh qua trang khác, không cần patch gì thêm.
            if (this._doc.imageChoice === 'skip') return {}
            // 'ai' — đã có sẵn imagePrompt (từ lượt dịch concept ở trên) — gọi thẳng nửa tốn kém.
            return runImageGenerate({ topic: this._doc.topic, fields: this._doc.fields, colors: this._doc.colors, runSub })
        }
        const langOpt = LANGUAGE_OPTIONS.find(o => o.value === this._doc.language) || LANGUAGE_OPTIONS[0]
        return runTextStep(step, {
            topic: this._doc.topic,
            languageName: langOpt.name,
            ai: this._comJsonAi,
            fields: this._doc.fields,
            errMessage: this._txt.errBadResponse,
            hasData: call => hasData(call.key),
            runSub,
            onPatch: partial => { if (reqId === this._reqId) this._doc = { ...this._doc, fields: { ...this._doc.fields, ...partial } } },
        })
    }

    // Call/sub-step đã có field thật chưa — dùng để SKIP call đã xong khi retry 1 step lỗi giữa
    // chừng (không chạy lại các call đã thành công trước đó trong cùng step).
    _subHasData(step, key) {
        if (step.type === 'image') return key === 'concept' && !!(this._doc.fields.imagePrompt || '').trim()
        const call = step.calls.find(c => c.key === key)
        return call ? call.fields.some(f => (this._doc.fields[f.key] || '').trim()) : false
    }

    // Xoá trạng thái sub-step của 1 step cụ thể trước khi chạy lại (fresh run hoặc retry riêng
    // step đó) — không đụng tới sub-step của step khác.
    _subReset(stepId) {
        this._runningSub = new Set([...this._runningSub].filter(k => !k.startsWith(`${stepId}-`)))
    }

    // Đánh dấu 1 sub-step đang chạy (spinner ở <svc-progress>) — luôn dọn sạch kể cả lỗi. reqId
    // guard — bỏ qua update UI nếu popup đã đóng/regenerate giữa lúc sub-step đang chạy (tránh set
    // state trên lượt cũ).
    async _runSub(reqId, stepId, key, fn) {
        const k = `${stepId}-${key}`
        if (reqId === this._reqId) this._runningSub = new Set(this._runningSub).add(k)
        try {
            return await fn()
        } finally {
            if (reqId === this._reqId) {
                const next = new Set(this._runningSub); next.delete(k)
                this._runningSub = next
            }
        }
    }

    // `resume-step` từ <svc-progress> — sếp bấm "Duyệt" sau 1 step vừa xong (MỌI step
    // `type:'text'` trừ step cuối đều dừng lại chờ, xem _dfRunPipeline) — chạy tiếp từ ĐÚNG step
    // KẾ TIẾP step vừa bị khoá.
    _dfResumeStep() {
        if (this._comBusy || this._doc.status !== 'awaiting_review') return
        const steps = this._division.meta.steps
        const pausedIdx = steps.findIndex(s => s.id === this._doc.pausedStepId)
        const nextStep = steps[pausedIdx + 1]
        if (!nextStep) return
        // Xoá NGAY `pausedStepId` cục bộ trước khi chạy tiếp — `this._doc.status` thật chỉ cập
        // nhật SAU KHI step kế chạy xong (dù `_runningStep` đã tự set đồng bộ trong _dfRunPipeline,
        // `_comPausedStep` vẫn ưu tiên hơn trong _comActiveMacroStep) — không xoá thì banner "chờ
        // duyệt" + tab step cũ còn hiện nguyên suốt lúc step kế đang xử lý.
        this._doc = { ...this._doc, status: `step${this._doc.pausedStepId}`, pausedStepId: '' }
        this._dfRunPipeline(nextStep.id)
    }

    // `regenerate-call` từ <svc-progress> — sếp muốn AI viết lại RIÊNG 1 sub-step (call) kèm
    // chỉ dẫn thêm vừa gõ — granular hơn hẳn regenerate-step cũ (đã bỏ): chạy được bất kỳ lúc nào
    // call đó đã có dữ liệu, không cần doc đang paused đúng step chứa nó, và KHÔNG đụng status/
    // pausedStepId của doc (chỉ patch field của đúng call đó).
    async _dfRegenerateCall(stepId, callKey, instruction) {
        if (this._comBusy) return
        const step = this._division.meta.steps.find(s => s.id === stepId)
        if (!step || step.type !== 'text') return
        this._regeneratingCall = true
        try {
            const langOpt = LANGUAGE_OPTIONS.find(o => o.value === this._doc.language) || LANGUAGE_OPTIONS[0]
            const patch = await regenerateCall(step, callKey, instruction, {
                topic: this._doc.topic, languageName: langOpt.name, ai: this._comJsonAi, fields: this._doc.fields,
                errMessage: this._txt.errBadResponse,
                runSub: (key, fn) => this._runSub(this._reqId, step.id, key, fn),
                onPatch: partial => { this._doc = { ...this._doc, fields: { ...this._doc.fields, ...partial } } },
            })
            const now = await this._svc.now()
            this._doc = { ...this._doc, fields: { ...this._doc.fields, ...patch }, updated_at: now }
            await this._svc.set(this._recordId, this._doc)
        } catch (err) {
            toastEmit(err.message || String(err), 'error')
        }
        this._regeneratingCall = false
    }

    // `image-choice` từ <svc-progress> — sếp chọn 'ai' (gọi AI sinh ảnh thật) hay 'skip' (bỏ
    // qua, tự làm qua 3 nút mở trang ngoài) tại đúng step ảnh đang bị khoá — lưu lựa chọn rồi chạy
    // LẠI đúng step đó (không phải step kế), vì step ảnh mới chỉ dịch xong concept, chưa thật sự xong.
    // Bọc NGUYÊN thân hàm (kể cả 2 await đầu) qua `_withJobPending`-tương đương — nếu chỉ guard
    // trước khi gọi `_dfRunPipeline` thì vẫn có khe hở bấm 2 lần trong lúc đang chờ ghi `imageChoice`.
    async _dfImageChoice(choice) {
        if (this._comBusy) return
        this._choosingImage = true
        try {
            const now = await this._svc.now()
            this._doc = { ...this._doc, imageChoice: choice, updated_at: now }
            await this._svc.set(this._recordId, this._doc)
        } finally {
            // Tắt CỜ TRƯỚC khi gọi _dfRunPipeline (nó tự guard `_comBusy` ở đầu hàm) — nếu còn true
            // lúc gọi, _dfRunPipeline sẽ tưởng đang busy rồi bỏ qua luôn lượt chạy tiếp này.
            this._choosingImage = false
        }
        const steps = this._division.meta.steps
        const pausedStep = steps.find(s => s.id === this._doc.pausedStepId) || steps.find(s => s.type === 'image')
        if (pausedStep) this._dfRunPipeline(pausedStep.id)
    }

    // Nút "Tạo lại ảnh" (event `regenerate-image` từ <svc-progress>, chỉ hiện ở review phase) —
    // dịch/diễn giải concept ảnh CHỈ 1 lần trước đó (hasData luôn true ở đây — tái dùng concept đã
    // dịch, KHÔNG dịch lại), KHÔNG đụng gì tới title/description/content khác — khác hẳn nút "Tạo
    // lại" (regenerate) reset về hẳn phase 'input', làm lại từ đầu topic.
    async _dfRegenerateImage() {
        if (this._regeneratingImage) return
        this._regeneratingImage = true
        const reqId = this._reqId
        try {
            const step = this._division.meta.steps.find(s => s.type === 'image')
            const patch = await runImageStep({
                topic: this._doc.topic,
                fields: this._doc.fields,
                colors: this._doc.colors,
                contextKeys: step?.concept?.contextKeys || [],
                generateJson: opts => generateJsonWithRetry(this._comJsonAi, { ...opts, errMessage: this._txt.errBadResponse }),
                hasData: () => true, // luôn dùng lại concept đã dịch — không dịch lại
                runSub: (key, fn) => this._runSub(reqId, step.id, key, fn),
            })
            if (reqId === this._reqId) {
                const now = await this._svc.now()
                this._doc = { ...this._doc, fields: { ...this._doc.fields, ...patch }, updated_at: now }
                await this._svc.set(this._recordId, this._doc)
            }
        } catch (err) {
            toastEmit(err.message || String(err), 'error')
        }
        this._regeneratingImage = false
    }

    async _dfSave() {
        this._loading = true
        try {
            const svc = createService(this.table || 'records')
            const now = await svc.now()
            const outputFields = this._division.meta.output?.fields || []
            const payload = { updated_at: now }
            for (const k of outputFields) payload[k] = this._doc.fields[k] ?? ''
            await svc.update(this._recordId, payload)
            toastEmit(this._txt.saveOk, 'success')
            // Gửi kèm field vừa ghi (không kèm updated_at — nơi nghe patch local state hiển thị,
            // không cần giá trị timestamp server) để nơi gọi (vd svc-admin.js) cập nhật lại _data
            // ngay không cần đọc lại Firestore.
            const { updated_at, ...savedFields } = payload
            this.dispatchEvent(new CustomEvent(this.constructor.SAVED_EVENT, { detail: { id: this._recordId, ...savedFields }, bubbles: true, composed: true }))
            this.close()
        } catch (err) {
            toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error')
        }
        this._loading = false
    }

    _dfRegenerate() {
        this._reqId++
        this._runningStep = 0
        this._failedStep  = 0
        this._error         = ''
        this._doc            = _freshDoc(this._recordId, this.table, this._doc.language, this._division)
        this._phase           = 'input'
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, this.constructor.TXT_STD, this.lang) }
    get _svc() { return createService(this.processTable) }

    // Có step nào đang thật sự chạy/chờ hay không — feed vào <svc-progress>'s `busy` prop để
    // disable retry/resume/regenerate-call/image-choice, tránh bấm chồng chạy trùng 1 step.
    // `_runningStep` lên khác 0 NGAY LÚC gọi (đồng bộ, trước await đầu tiên — xem _dfRunPipeline)
    // nên tự đủ cho hầu hết trường hợp; `_choosingImage`/`_regeneratingCall` bù riêng khe hở của
    // `_dfImageChoice`/`_dfRegenerateCall` (2 hàm đó await NGAY từ đầu, trước khi có gì set
    // `_runningStep` khác 0).
    get _comBusy() {
        return this._runningStep !== 0 || this._regeneratingImage || this._choosingImage || this._regeneratingCall
    }

    // Ghim model cho các lệnh gọi JSON strict (không dùng this.ai trực tiếp — config đó để
    // tensor.js tự xoay vòng qua mọi model kể cả reasoning-model, gây response lẫn suy luận
    // thay vì JSON). DEFAULT_CHAIN ('@default') đã tự ghim đúng model này (nvidia/nemotron-3.5-
    // lightning-30b-a3b — general-purpose, KHÔNG phải reasoning model) làm lượt thử đầu tiên phía
    // Worker (xem worker/packages/llm-worker/src/ai.ts's resolveFreeChain()), rồi mới rơi xuống this.ai làm lưới an
    // toàn nếu model ghim lỗi/hết quota.
    get _comJsonAi() {
        return [DEFAULT_CHAIN, this.ai].filter(Boolean).join('|')
    }

    // txt riêng cho <svc-review> — chỉ những field nó cần, tránh rò rỉ toàn bộ TXT_STD.
    get _comReviewTxt() {
        const t = this._txt
        return {
            titleLabel: t.titleLabel, descLabel: t.descLabel, contentLabel: t.contentLabel, picsLabel: t.picsLabel,
            contentPlaceholder: t.contentPlaceholder, regenerate: t.regenerate, save: t.save,
        }
    }

    // ── Render Body ────────────────────────────────────────────────────────────

    render() {
        // `open()` sets `_open = true` NGAY (render sync) rồi mới `await _dcLoadDoc()` — có 1 lượt
        // render lỡ cỡ giữa chừng lúc `_doc` còn null (giá trị khởi tạo ở constructor). Không guard
        // `_doc` ở đây thì `_rbInputPhase()` đọc `this._doc.topic` sẽ crash ngay lượt render đó.
        if (!this._division || !this._doc) return html``
        return html`
            <web-dialog ?open=${this._open} title=${this._txt.title} lang=${this.lang}
                maxWidth="860px" ui=${this.ui} theme=${this.theme}
                @cancel=${() => this.close()} @close=${() => this.close()}>
                ${this._phase === 'input'   ? this._rbInputPhase()   : ''}
                ${this._phase === 'running' ? this._rbRunningPhase() : ''}
                ${this._phase === 'review'  ? this._rbReviewPhase()  : ''}
            </web-dialog>
        `
    }

    _rbInputPhase() {
        const t = this._txt
        return html`
            <div class="dva-input">
                <div class="dva-field">
                    <label>${t.topicLabel}</label>
                    <web-text ui=${this.ui} placeholder=${t.topicPlaceholder}
                        .value=${this._doc.topic} @input=${this._dhTopicInput}></web-text>
                </div>
                <div class="dva-field">
                    <label>${t.languageLabel}</label>
                    <web-select .options=${LANGUAGE_SELECT_OPTS} .value=${this._doc.language} .ui=${this.ui}
                        ?searchable=${false} @change=${this._dhLanguageChange}></web-select>
                </div>
                <div class="dva-field">
                    <label>${t.colorsLabel}</label>
                    <web-colors .value=${this._doc.colors} .ui=${this.ui} .theme=${this.theme}
                        .lang=${this.lang} @change=${this._dhColorsChange}></web-colors>
                </div>
                ${this._error ? html`<div class="dva-error">${this._error}</div>` : ''}
                <web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
                    ?disabled=${!this._doc.topic?.trim()}
                    @clicked=${() => this._dfRunPipeline()}>${t.generate}</web-button>
            </div>
        `
    }

    _rbRunningPhase() {
        return html`
            <div class="dva-running">
                <svc-progress .division=${this._division} .doc=${this._doc}
                    .runningStep=${this._runningStep} .failedStep=${this._failedStep} .runningSub=${this._runningSub}
                    editable ai=${this.ai} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                    ?regeneratingImage=${this._regeneratingImage} ?busy=${this._comBusy}
                    @field-change=${e => this._dhProgressFieldChange(e)}
                    @retry-step=${e => this._dfRunPipeline(e.detail.stepId)}
                    @regenerate-image=${() => this._dfRegenerateImage()}
                    @photo-upload=${e => this._dhPhotoUpload(e.detail.url)}
                    @resume-step=${() => this._dfResumeStep()}
                    @regenerate-call=${e => this._dfRegenerateCall(e.detail.stepId, e.detail.callKey, e.detail.instruction)}
                    @image-choice=${e => this._dfImageChoice(e.detail.choice)}></svc-progress>
            </div>
        `
    }

    _rbReviewPhase() {
        return html`
            <div class="dva-review">
                <svc-review .doc=${this._doc} ai=${this.ai} ?loading=${this._loading}
                    .txt=${this._comReviewTxt} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                    @field-change=${e => this._dhReviewFieldChange(e)}
                    @regenerate=${() => this._dfRegenerate()}
                    @save=${() => this._dfSave()}></svc-review>
                <div style="padding: 1rem 0">
                    <svc-progress .division=${this._division} .doc=${this._doc}
                        .runningStep=${this._runningStep} .failedStep=${this._failedStep} .runningSub=${this._runningSub}
                        editable ai=${this.ai} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        ?regeneratingImage=${this._regeneratingImage} ?busy=${this._comBusy}
                        @field-change=${e => this._dhProgressFieldChange(e)}
                        @retry-step=${e => this._dfRunPipeline(e.detail.stepId)}
                        @regenerate-image=${() => this._dfRegenerateImage()}
                        @photo-upload=${e => this._dhPhotoUpload(e.detail.url)}
                        @resume-step=${() => this._dfResumeStep()}
                        @regenerate-call=${e => this._dfRegenerateCall(e.detail.stepId, e.detail.callKey, e.detail.instruction)}
                        @image-choice=${e => this._dfImageChoice(e.detail.choice)}></svc-progress>
                </div>
            </div>
        `
    }
}
