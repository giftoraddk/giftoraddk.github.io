// src/packages/llm/service/talk.js
//
// Nhóm chat <svc-talk> của 1 ngành: sếp nhắn Thư ký (POST /v1/fn/chat — prompt ở Worker), việc thật thành 1 task; job chạy
// trên Worker từng call (service/runner.js), chờ duyệt, duyệt ra bảng output. Status job do Worker tính — file này chỉ
// xếp hàng, hiển thị và gửi lệnh. 1 instance mỗi ngành (talkFor), state ở conductor section `llm.<sector>` (không dùng
// ':' — tên channel `state:<section>` của bus chỉ cho đúng 1 dấu ':').
import { createService } from '@/services/core/crud.js'
import { get as cdGet, patch as cdPatch } from '@/services/core/conductor.js'
import { toastEmit, pickLang } from '@/services/tools/util.js'
import { fnApiFor } from './fn-api.js'
import { onOwnerChange } from './hub.js'
import { JobRunner } from './runner.js'
import { serverOf } from '../tool/server.js'
import { canonicalDivision, sectorDivisions, systemDivisions, markInterrupted } from '../tool/divisions.js'
import { stageLine, taskIdsOf, staleFor } from '../tool/tasks.js'
import { currentStep } from '../tool/waves.js'
import { autoAction } from '../tool/auto.js'
import { computeOverview, computeReceivablesPayables, assessRisk } from '../tool/finance-helper.js'

export const DEFAULT_SECTOR = 'ecommerce'
export const sectionOf = (sector) => `llm.${sector}`
const FIELD_SAVE_MS = 600 // ô field output báo đổi theo từng phím — gom lại rồi mới ghi
// Job đã duyệt: mỗi lần ghi Worker còn cập nhật bản ghi đã ghi ra + tri thức — gom lâu hơn cho đỡ ghi theo từng phím.
const FIELD_SAVE_APPROVED_MS = 2000
const AUTO_KEY = (sector) => `llm.auto.${sector}` // localStorage — lựa chọn Tự động của người dùng trên trình duyệt này

// Bật/tắt Tự động nhớ theo trình duyệt (tiện ích riêng của người xem) — chặn storage thì chỉ mất phần nhớ, vẫn chạy.
const _readAuto = (sector) => {
    try { return localStorage.getItem(AUTO_KEY(sector)) === '1' } catch { return false }
}
const _writeAuto = (sector, on) => {
    try { on ? localStorage.setItem(AUTO_KEY(sector), '1') : localStorage.removeItem(AUTO_KEY(sector)) } catch { /* không nhớ được — vẫn chạy */ }
}

const MSG = {
    vi: {
        errGeneric: 'Có lỗi xảy ra, thử lại nhé',
        errInterrupted: 'Việc này bị gián đoạn (trang đã tải lại) — bấm Thử lại nhé',
        approveFail: 'Duyệt thất bại', approvedOnly: 'Đã duyệt kết quả',
        recordOk: 'Đã lưu kết quả vào dữ liệu', recordFail: 'Lưu vào dữ liệu thất bại',
        sendFail: 'Gửi tin nhắn thất bại',
        errEmpty: 'AI trả về câu trả lời trống — thử lại nhé',
        taskFail: 'Không mở được việc mới',
        noSecretary: 'Thư ký chưa sẵn sàng — thử lại sau giây lát',
    },
    en: {
        errGeneric: 'Something went wrong, please retry',
        errInterrupted: 'This task was interrupted (page reloaded) — tap Retry',
        approveFail: 'Failed to approve', approvedOnly: 'Result approved',
        recordOk: 'The result was saved to your data', recordFail: 'Failed to save to your data',
        sendFail: 'Failed to send the message',
        errEmpty: 'The AI returned an empty answer — please retry',
        taskFail: 'Could not start the task',
        noSecretary: 'The Secretary is not ready yet — try again in a moment',
    },
}

const EMPTY = {
    log: [], divisions: [], system: [], tasks: {}, lang: '', typingId: '',
    runningSub: new Set(), pendingJobs: new Set(), regeneratingImage: false,
    auto: false, // Tự động: job của task tự qua các bước duyệt (tool/auto.js) — setAuto()
    trialUsage: null, // chế độ thử: lượt còn lại ở ngành này (GET /v1/fn/trial) — refreshTrial()
}

const _svc = (table) => createService(table, '', serverOf(table))
const _topicKey = (topic) => (topic || '').trim().toLowerCase()

class TalkService {
    constructor(sector) {
        this.sector = sector
        this.section = sectionOf(sector)
        // 1 phòng ban "nói" tại 1 thời điểm (chat lẫn pipeline) — giữ nhịp nhóm chat như trước.
        this._queue = Promise.resolve()
        this._loaded = null
        this._sectors = null // GET /v1/fn/sectors đã tải — nhãn phòng ban dựng lại từ đây khi đổi ngôn ngữ
        this._outlines = new Map() // division id → khung step (GET /v1/fn/spec), không phụ thuộc ngôn ngữ
        this._saves = new Map() // "jobId:key" → { timer, jobId, key, value } — field output chưa gửi
        this._flushing = new Map() // jobId → Promise<boolean> — lượt gửi /fields đang bay, chờ trước khi gửi thêm request khác
        this._stages = new Map() // taskId → giai đoạn lượt _afterTask gần nhất đã xử lý — câu Thư ký không báo trùng
        // owner thật do Worker gán (từ JWT) — biết được qua dòng log đầu tiên trả về; '' = nền tảng. Chưa biết ->
        // coi như KHÔNG PHẢI nền tảng (an toàn hơn: bỏ qua tra cứu products/invoices thay vì lỡ tay đọc nhầm).
        this._isPlatform = false
        this._ownerKnown = false // _isPlatform đã đọc từ 1 dòng Worker trả về chưa (startJob cần phân biệt)
        this.showVerdict = true // Thư ký báo quyết định của Tích hợp khi task xong — <svc-talk no-verdict> tắt
        this.trial = false // chế độ dùng thử (setTrial) — mọi request gửi kèm X-Fn-Trial, Worker tự quyết và đếm lượt
        this._api = fnApiFor(false)
        this._runner = new JobRunner({
            getJob: (id) => this._job(id),
            mapJob: (id, fn) => this._mapJob(id, fn),
            setRunning: (key, on) => this._running(key, on),
            api: () => this._api,
        })
        if (_readAuto(sector)) this._set({ auto: true })
    }

    // ── State ──────────────────────────────────────────────────────────────────

    get state() { return { ...EMPTY, ...cdGet(this.section) } }
    get _log() { return this.state.log }
    get _divisions() { return this.state.divisions }
    get _msg() { return MSG[this.state.lang] ?? MSG.vi }

    _set(partial) { cdPatch(this.section, partial) }
    _setLog(log) { this._set({ log }) }
    _job(jobId) { return this._log.find((d) => d.id === jobId) }
    _mapJob(jobId, fn) { this._setLog(this._log.map((d) => (d.id === jobId ? fn(d) : d))) }
    _append(doc) { this._setLog([...this._log, doc]) }
    _outline(doc) { return this.division(doc?.division)?.outline ?? null }

    _pending(jobId, on) {
        const next = new Set(this.state.pendingJobs)
        on ? next.add(jobId) : next.delete(jobId)
        this._set({ pendingJobs: next })
    }
    isPending(jobId) { return this.state.pendingJobs.has(jobId) }

    _running(key, on) {
        const next = new Set(this.state.runningSub)
        on ? next.add(key) : next.delete(key)
        this._set({ runningSub: next })
    }

    /** Phòng ban (hoặc bước hệ thống: điều phối/context/router) của nhóm chat này — nhận cả id cũ ('marketing'…). */
    division(id) {
        const want = canonicalDivision(id)
        return this._divisions.find((d) => d.id === want) ?? this.state.system.find((d) => d.id === want)
    }

    /** Thư ký — trả lời tin gửi cả nhóm, mở task, dựng bối cảnh và phân công (P3-3); null khi Worker chưa có. */
    get secretary() { return this.state.system.find((d) => d.fn === 'secretary') ?? null }

    /** Task view Worker trả lần gần nhất (GET /v1/fn/tasks/:id), null nếu chưa tải. */
    taskOf(taskId) { return (taskId && this.state.tasks[taskId]) || null }

    /** Bàn giao của job này đang chờ xác minh lại (chỉ job mới nhất của phòng đó) — bubble hiện Chạy lại / Vẫn dùng được. */
    staleOf(job) { return staleFor(this.taskOf(job?.task), job) }

    /** Job đã duyệt mới nhất của 1 phòng trong task, bàn giao phía trước đều đã duyệt — được phép Chạy lại (P3-9). */
    canRerun(job) {
        const fn = String(job?.division ?? '').split('.')[1]
        const view = this.taskOf(job?.task)
        if (view?.trial) return false // task dùng thử: mỗi phòng chạy 1 lần (Worker cũng chặn /rerun)
        const s = view?.fns?.find((x) => x.fn === fn)
        return !!s && s.jobId === job.id && (s.state === 'approved' || s.state === 'stale') && !s.missing.length
    }

    _faceTitle(fn) { return this._divisions.find((d) => d.fn === fn)?.title || '' }

    // ── Load ───────────────────────────────────────────────────────────────────

    /** Tải phòng ban (face + outline) + nhật ký đúng 1 lần mỗi lượt tải trang (module sống qua ClientRouter nav). */
    load(lang = 'vi') {
        if (!this.state.lang) this._set({ lang })
        this._loaded ??= this._dcLoad()
        return this._loaded
    }

    /**
     * Đổi tài khoản (đăng nhập / đăng xuất / tài khoản khác / vừa có hub): bỏ sạch dữ liệu của tài khoản trước — mỗi
     * tài khoản 1 nhật ký riêng ở Worker (talks.user_id), không bao giờ để người sau thấy chat/job của người trước —
     * rồi tải lại nếu nhóm đã từng tải. Lượt chạy đang bay của tài khoản trước gọi Worker bằng JWT mới → 404, vô hại.
     */
    reset() {
        const wasLoaded = !!this._loaded
        for (const s of this._saves.values()) clearTimeout(s.timer)
        this._saves.clear()
        this._flushing.clear()
        this._stages.clear()
        this._queue = Promise.resolve()
        this._loaded = null
        this._sectors = null
        this._outlines = new Map()
        this._isPlatform = false
        this._ownerKnown = false
        const lang = this.state.lang
        this._set({ ...EMPTY, runningSub: new Set(), pendingJobs: new Set(), lang, auto: this.state.auto })
        if (wasLoaded) this.load(lang || 'vi')
    }

    /**
     * Chế độ dùng thử — prop `trial` của <svc-talk> / <svc-fn> (chỉ page /system/<sector> bật). Đổi chế độ thì tải lại
     * từ đầu: Worker trả lời khác nhau theo chế độ. Bus (service.js) gọi talkFor(sector) không kèm chế độ → giữ nguyên.
     */
    setTrial(on) {
        const trial = !!on
        if (trial === this.trial) return
        this.trial = trial
        this._api = fnApiFor(trial)
        this.reset()
    }

    /** Lượt thử còn lại của ngành này (GET /v1/fn/trial) → state.trialUsage; null ngoài chế độ thử. Lỗi thì giữ số cũ. */
    async refreshTrial() {
        if (!this.trial) return
        const res = await this._api.trialUsage(this.sector)
        if (res.ok && this.trial) this._set({ trialUsage: res.data })
    }

    /** Ngôn ngữ hiển thị của nhóm — đổi thì tên/mô tả phòng ban dựng lại từ dữ liệu đã tải (không gọi lại API). */
    setLang(lang) {
        if (!(lang in MSG) || lang === this.state.lang) return
        this._set({ lang, ...this._faces(lang) })
    }

    /** divisions + system theo `lang`, kèm outline đã tải; {} khi chưa tải xong (_dcLoad tự dựng theo lang lúc đó). */
    _faces(lang) {
        if (!this._sectors) return {}
        const withOutline = (d) => ({ ...d, outline: this._outlines.get(d.id) ?? null })
        return {
            divisions: sectorDivisions(this._sectors, this.sector, lang).map(withOutline),
            system: systemDivisions(this._sectors, this.sector, lang).map(withOutline),
        }
    }

    async _dcLoad() {
        const sectors = await this._api.sectors()
        if (!sectors.ok) {
            console.error('[llm/talk] failed to load sectors:', sectors.message)
            this._loaded = null // lần load() sau thử lại
            return
        }
        // Khung step (không prompt) của phòng có quy trình — cần đăng nhập (staff hoặc hub có gói)
        const pipelines = [...sectorDivisions(sectors.data, this.sector), ...systemDivisions(sectors.data, this.sector)]
            .filter((d) => d.kind === 'pipeline')
        await Promise.all(pipelines.map(async (d) => {
            const res = await this._api.spec(d.id)
            if (res.ok) this._outlines.set(d.id, res.data)
            else console.warn(`[llm/talk] outline of ${d.id}:`, res.message)
        }))
        // Dựng nhãn theo ngôn ngữ của LÚC NÀY — setLang() có thể đã chạy trong lúc chờ outline.
        this._sectors = sectors.data
        this._set(this._faces(this.state.lang || 'vi'))
        const log = await this._api.log(this.sector)
        if (log.ok) {
            this._setLog((log.data ?? []).map((d) => markInterrupted(d, this._msg.errInterrupted)))
            // owner thật của mọi dòng log là owner Worker gán cho caller này (JWT) — suy platform từ đó, không đoán ở client.
            if (log.data?.length) this._learnOwner(log.data[0])
            // View của vài task gần nhất — nút Chạy lại / Vẫn dùng được và câu Thư ký cần biết giai đoạn hiện tại.
            await Promise.all(taskIdsOf(log.data).map((id) => this._refreshTask(id)))
            this._autoAll() // Tự động đang bật: việc còn chờ duyệt từ lần trước đi tiếp luôn
        } else console.error('[llm/talk] failed to load the log:', log.message)
        await this.refreshTrial()
    }

    // ── Auto ───────────────────────────────────────────────────────────────────
    // Tự động (state.auto): job của 1 task dừng chờ sếp thì tự đi bước kế (tool/auto.js) — duyệt step, tạo ảnh (lỗi thì
    // bỏ qua), duyệt kết quả → Worker mở phòng kế → lại tự chạy, tới hết task. Vẫn qua đúng các bước duyệt như bấm tay.

    /** Bật/tắt Tự động — nhớ trên trình duyệt này; vừa bật thì việc đang chờ duyệt đi tiếp luôn. */
    setAuto(on) {
        const auto = !!on
        if (auto === this.state.auto) return
        _writeAuto(this.sector, auto)
        this._set({ auto })
        this._autoAll()
    }

    /** Chạy job tới chỗ dừng tiếp theo, rồi để Tự động đi bước kế (nếu đang bật). */
    async _run(jobId, outline) {
        const job = await this._runner.run(jobId, outline, this._msg.errEmpty)
        this._autoLater(jobId)
        return job
    }

    // Sau lượt đang chạy trong hàng đợi (nó có thể vẫn khoá job) — không await trong hàng đợi, kẻo tự chờ chính mình.
    _autoLater(jobId) {
        if (!this.state.auto) return
        this._queue.then(() => this._autoNext(jobId)).catch((err) => console.error('[llm/talk] auto step failed:', err?.message ?? err))
    }

    _autoAll() {
        if (!this.state.auto) return
        for (const d of this._log) if (d.kind === 'job' && d.task && !d.approved) this._autoLater(d.id)
    }

    _autoNext(jobId) {
        const doc = this._job(jobId)
        if (!this.state.auto || !doc || this.isPending(jobId)) return
        switch (autoAction(doc, this._outline(doc), { approvable: this._approvable(doc) })) {
            case 'resume': return this.resumeStep(jobId)
            case 'image': return this.imageChoice(jobId, 'ai')
            case 'skipImage': return this.imageChoice(jobId, 'skip')
            case 'approve': return this.approve(jobId)
        }
    }

    // ── Queue ──────────────────────────────────────────────────────────────────

    _enqueue(fn) {
        this._queue = this._queue.then(fn).catch((err) => console.error('[llm/talk] turn failed:', err?.message ?? err))
        return this._queue
    }

    // Khoá job trong suốt hành động — nút tương ứng disable, double-click không chạy trùng.
    _withJobPending(jobId, asyncFn) {
        if (this.isPending(jobId)) return
        this._pending(jobId, true)
        return this._enqueue(async () => {
            try { await asyncFn() }
            finally { this._pending(jobId, false) }
        })
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /** Tin nhắn của sếp gửi Thư ký — nhóm chat chỉ còn Thư ký trả lời; việc thật thành 1 task (P3-3). */
    async sendMessage(content) {
        await this.load()
        const res = await this._api.appendLog(this.sector, 'boss', content)
        if (!res.ok) {
            toastEmit(`${this._msg.sendFail}: ${res.message}`, 'error')
            return
        }
        // owner của dòng vừa ghi = owner thật Worker gán cho caller (JWT) — dùng để biết có phải nền tảng (P2-6).
        this._learnOwner(res.data)
        this._append(res.data)
        this._enqueue(() => this._secretaryTurn(content))
    }

    /**
     * Job đơn lẻ của 1 phòng, mở từ panel riêng của phòng đó (<svc-fn>) — không qua chat, không thuộc task nào.
     * Input thật (sản phẩm/hoá đơn nền tảng) chỉ gửi khi biết chắc caller là nền tảng: chưa biết thì tạo job trước, đọc
     * owner Worker gán, rồi mới bổ sung input qua /fields (Worker chỉ nhận đúng key outline.inputs). → job | null
     */
    async startJob(divisionId, topic) {
        await this.load()
        const division = this.division(divisionId)
        const text = String(topic ?? '').trim()
        if (!division?.outline || division.system || !text) return null
        const known = this._ownerKnown
        const job = await this._createJob(division, text, known ? { inputs: await this._platformInputs(division, text) } : {})
        if (!job) return null
        if (!known) {
            this._learnOwner(job)
            const inputs = await this._platformInputs(division, text)
            if (Object.keys(inputs).length) {
                const res = await this._api.fields(job.id, inputs)
                if (res.ok) this._mapJob(job.id, (d) => ({ ...d, fields: { ...d.fields, ...inputs } }))
                else console.warn('[llm/talk] inputs of a new job were not saved:', res.message)
            }
        }
        this.retry(job.id)
        return job
    }

    /** Chạy (tiếp) job từ chỗ server đang đứng — call nào thiếu dữ liệu thì gọi. Job đã dừng (chờ duyệt/xong) mà vẫn
     *  còn lỗi (vd regenerateCall lỗi trong lúc dừng) — không có gì để chạy tiếp, Thử lại chỉ cần dọn banner ⚠️. */
    retry(jobId) {
        const outline = this._outline(this._job(jobId))
        if (!outline) return
        return this._withJobPending(jobId, async () => {
            if (!currentStep(outline, this._job(jobId))) return this._clearError(jobId)
            await this._run(jobId, outline)
            await this._refreshTask(this._job(jobId)?.task)
        })
    }

    /** Sếp duyệt step text vừa dừng — server ghi `reviewed`, runner chạy step kế. */
    resumeStep(jobId) {
        const doc = this._job(jobId)
        const outline = this._outline(doc)
        if (!outline || this.isPending(jobId) || doc.status !== 'awaiting_review') return
        return this._withJobPending(jobId, async () => {
            // Field sếp vừa gõ (chưa hết FIELD_SAVE_MS) phải lên server TRƯỚC khi báo resume, không thì bước kế đọc field cũ.
            if (!(await this._ensureFlushed(jobId))) return
            const res = await this._api.resume(jobId)
            if (!res.ok) {
                toastEmit(res.message || this._msg.errGeneric, 'error')
                return
            }
            this._mapJob(jobId, (d) => ({ ...d, ...res.data }))
            await this._run(jobId, outline)
            await this._refreshTask(this._job(jobId)?.task)
        })
    }

    /** Viết lại riêng 1 call (sub-step) kèm chỉ dẫn. */
    regenerateCall(jobId, stepId, callKey, instruction) {
        return this._withJobPending(jobId, async () => {
            if (!(await this._ensureFlushed(jobId))) return
            const ok = await this._runner.regenerate(jobId, stepId, callKey, instruction)
            if (!ok) toastEmit(this._job(jobId)?.error || this._msg.errGeneric, 'error')
        })
    }

    /** 'ai' → tạo + upload ảnh rồi mới báo server (choice + pics 1 lần); 'skip' → báo server bỏ qua ảnh. Xong step ảnh
     *  mà còn step kế thì chạy luôn, không dừng lại chờ tay bấm thêm. */
    imageChoice(jobId, choice) {
        const outline = this._outline(this._job(jobId))
        const step = outline?.steps.find((s) => s.type === 'image')
        if (!step) return
        return this._withJobPending(jobId, async () => {
            if (choice === 'ai') {
                // Worker dựng lại content = figure ảnh mới + content HIỆN CÓ trên server — field content đang chờ gõ
                // phải lên server TRƯỚC, không thì bị viết đè lại bằng bản cũ (mất chỉnh sửa vừa gõ).
                if (!(await this._ensureFlushed(jobId))) return
                // Chỉ đổi hiển thị (ẩn banner chọn, hiện spinner) — server vẫn dừng ở step ảnh tới khi có pics
                this._mapJob(jobId, (d) => ({ ...d, imageChoice: 'ai', status: `step${step.id}`, pausedStepId: '', error: '' }))
                if (await this._runner.generateImage(jobId, step.id)) await this._run(jobId, outline)
                else this._autoLater(jobId) // Tự động: ảnh lỗi → bỏ qua ảnh, task đi tiếp
                return
            }
            const res = await this._api.image(jobId, { choice: 'skip' })
            if (!res.ok) {
                toastEmit(res.message || this._msg.errGeneric, 'error')
                return
            }
            this._mapJob(jobId, (d) => ({
                ...d, imageChoice: 'skip', status: res.data.status, pausedStepId: res.data.pausedStepId,
                fields: { ...d.fields, ...(res.data.fields ?? {}) }, error: '',
            }))
            await this._run(jobId, outline)
        })
    }

    /** Tạo lại ảnh từ concept đã dịch (job đã xong — server nhận như "tải ảnh lại"). */
    regenerateImage(jobId) {
        if (this.state.regeneratingImage || this.isPending(jobId)) return
        const step = this._outline(this._job(jobId))?.steps.find((s) => s.type === 'image')
        if (!step) return
        this._set({ regeneratingImage: true })
        return this._withJobPending(jobId, async () => {
            try {
                // Cùng lý do imageChoice('ai') — content đang chờ gõ phải lên server trước khi Worker dựng lại figure.
                if (!(await this._ensureFlushed(jobId))) return
                if (await this._runner.generateImage(jobId, step.id)) return
                // Job đã xong — lỗi chỉ báo toast, không treo banner lỗi trên job
                const message = this._job(jobId)?.error
                this._mapJob(jobId, (d) => ({ ...d, error: '' }))
                toastEmit(message || this._msg.errGeneric, 'error')
            } finally {
                this._set({ regeneratingImage: false })
            }
        })
    }

    /** Sửa 1 field output (title/description/content/tags) — hiện ngay, ghi sau FIELD_SAVE_MS (gom phím). */
    setField(jobId, key, value) {
        this._mapJob(jobId, (d) => ({ ...d, fields: { ...d.fields, [key]: value } }))
        const saveKey = `${jobId}:${key}`
        clearTimeout(this._saves.get(saveKey)?.timer)
        const wait = this._job(jobId)?.approved ? FIELD_SAVE_APPROVED_MS : FIELD_SAVE_MS
        this._saves.set(saveKey, { jobId, key, value, timer: setTimeout(() => this._flushFields(jobId), wait) })
    }

    /** Ảnh sếp tự upload thay ảnh AI — server cập nhật cả `pics` lẫn figure đầu `content`. Xoá ảnh (url rỗng): bỏ qua. */
    async uploadPhoto(jobId, url) {
        const doc = this._job(jobId)
        if (!doc || !url || url === doc.fields.pics) return
        // Cùng lý do imageChoice('ai') — content đang chờ gõ phải lên server trước khi Worker dựng lại figure.
        if (!(await this._ensureFlushed(jobId))) return
        const res = await this._api.image(jobId, { choice: 'ai', pics: url })
        if (!res.ok) {
            toastEmit(res.message || this._msg.errGeneric, 'error')
            return
        }
        this._mapJob(jobId, (d) => ({
            ...d, imageChoice: 'ai', status: res.data.status ?? d.status, pausedStepId: res.data.pausedStepId ?? d.pausedStepId,
            fields: { ...d.fields, ...(res.data.fields ?? {}) },
        }))
    }

    /** Duyệt kết quả — Worker đồng bộ kiến thức, ghi bàn giao nếu job thuộc 1 task (ghi bảng output là bước riêng: record()).
     *  `expertReview` = { confirmed, by } — bắt buộc với phòng mà ngành đòi chuyên gia duyệt (outline.review, <svc-job-card>
     *  hoặc <svc-progress> của svc-fn thu); thiếu thì Worker trả 400 và toast báo lý do. */
    async approve(jobId, expertReview = null) {
        if (this.isPending(jobId)) return
        const doc = this._job(jobId)
        if (!doc || doc.approved || doc.status !== 'done' || !this._approvable(doc)) return
        this._pending(jobId, true)
        try {
            if (!(await this._ensureFlushed(jobId))) return
            const res = await this._api.approve(jobId, expertReview)
            if (!res.ok) {
                toastEmit(`${this._msg.approveFail}: ${res.message}`, 'error')
                return
            }
            // error='' — 1 regenerateCall lỗi trước đó (Worker không tự xoá cột error khi duyệt) không được để lại
            // banner ⚠️ vĩnh viễn trên 1 job đã duyệt xong.
            this._mapJob(jobId, (d) => ({ ...d, approved: true, error: '' }))
            toastEmit(this._msg.approvedOnly, 'success')
            // Job của 1 task: Worker vừa ghi bàn giao — hỏi nó phòng nào chạy được tiếp (P3-14). Giai đoạn TRƯỚC khi duyệt
            // giữ lại ngay đây — view đọc lại sau đó (kể cả _refreshTask chen vào trước lượt này) đã là giai đoạn mới.
            if (doc.task) {
                const prevStage = this.taskOf(doc.task)?.stage
                this._enqueue(() => this._advanceTask(doc.task, prevStage))
            }
        } finally {
            this._pending(jobId, false)
        }
    }

    /** Job đã duyệt → lưu kết quả vào bảng output của phòng (outline.output.table — products, posts…), 1 lần. Worker
     *  chỉ cho nhân viên nền tảng (outline.recordable). Trả recordId mới ('' nếu lỗi / đã lưu / đang bận). */
    async record(jobId) {
        if (this.isPending(jobId)) return ''
        const doc = this._job(jobId)
        if (!doc?.approved || doc.createdPostId || !this._outline(doc)?.recordable) return ''
        this._pending(jobId, true)
        try {
            const res = await this._api.record(jobId)
            if (!res.ok) {
                toastEmit(`${this._msg.recordFail}: ${res.message}`, 'error')
                return ''
            }
            const recordId = res.data?.recordId ?? ''
            this._mapJob(jobId, (d) => ({ ...d, createdPostId: recordId }))
            toastEmit(this._msg.recordOk, 'success')
            return recordId
        } finally {
            this._pending(jobId, false)
        }
    }

    /**
     * Sếp chỉnh phân công của Thư ký trước khi duyệt: thêm / bỏ phòng, đổi chủ trì. Ghi thẳng 2 field `activation` +
     * `lead` (không chờ gom phím) rồi đọc lại task view — `preview` (plan Worker tính lại từ 2 field này) đổi theo.
     */
    setRouting(jobId, { activation, lead }) {
        const doc = this._job(jobId)
        if (!doc?.task || doc.approved) return
        return this._withJobPending(jobId, async () => {
            const res = await this._api.fields(jobId, { activation, lead })
            if (!res.ok) {
                toastEmit(res.message || this._msg.errGeneric, 'error')
                return
            }
            this._mapJob(jobId, (d) => ({ ...d, fields: { ...d.fields, ...(res.data.fields ?? {}) } }))
            await this._refreshTask(doc.task)
        })
    }

    // ── Turn ───────────────────────────────────────────────────────────────────

    // Tin gửi cả nhóm: chỉ Thư ký trả lời (spec §2.1 — không để 9 phòng cùng trả lời); là việc thật → mở 1 task.
    async _secretaryTurn(content) {
        const host = this.secretary
        if (!host) {
            toastEmit(this._msg.noSecretary, 'error')
            return
        }
        this._set({ typingId: host.id })
        const res = await this._api.chat({ division: host.id, content, lang: this.state.lang || 'vi' })
        this._set({ typingId: '' })
        if (!res.ok) {
            toastEmit(`${this._msg.sendFail}: ${res.message}`, 'error')
            return
        }
        const decision = res.data
        if (decision.lang) this.setLang(pickLang({ vi: 'vi', en: 'en' }, decision.lang))
        if (decision.reply) await this._post(host.id, decision.reply)
        // Topic = nguyên câu sếp gõ — Thư ký tự diễn giải; câu gốc giữ đủ FACT (ràng buộc, số liệu) sếp nêu (P3-3).
        if (decision.isTask) await this._startTask(content)
        await this.refreshTrial() // tin nhắn / task vừa tính vào lượt thử
    }

    // ── Task (sector + topic → Thư ký: bối cảnh + phân công → các phòng theo bàn giao; Worker tính lịch) ────

    async _startTask(topic) {
        const res = await this._api.createTask({ sector: this.sector, topic, language: this.state.lang || 'vi' })
        if (!res.ok) {
            toastEmit(`${this._msg.taskFail}: ${res.message}`, 'error')
            return
        }
        await this._afterTask(res.data)
    }

    // Sau mỗi lần duyệt 1 job của task: Worker cho biết phòng nào chạy được → mở job (kèm input thật) → chạy lần lượt.
    async _advanceTask(taskId, prevStage = this.taskOf(taskId)?.stage) {
        const peek = await this._api.task(taskId)
        if (!peek.ok) {
            toastEmit(peek.message || this._msg.errGeneric, 'error')
            return
        }
        const res = await this._api.nextTask(taskId, await this._taskInputs(peek.data.next))
        if (!res.ok) {
            this._setTask(peek.data)
            toastEmit(`${this._msg.taskFail}: ${res.message}`, 'error')
            return
        }
        await this._afterTask(res.data, prevStage)
    }

    /** Chạy lại 1 phòng đã duyệt (bàn giao phía trước vừa đổi) — duyệt xong = phiên bản mới, phòng sau cần xác minh lại (P3-9). */
    rerun(taskId, fn) {
        return this._enqueue(async () => {
            const division = this.division(`${this.sector}.${fn}`)
            const res = await this._api.rerunTask(taskId, fn, division ? await this._inputsFor(division, null) : {})
            if (!res.ok) {
                toastEmit(res.message || this._msg.errGeneric, 'error')
                return
            }
            await this._afterTask(res.data)
        })
    }

    /** "Vẫn dùng được": giữ nguyên các bàn giao đang chờ xác minh — Worker ghi nhận chúng dựa trên bản mới phía trước. */
    verify(taskId, artifactIds) {
        return this._enqueue(async () => {
            for (const id of artifactIds) {
                const res = await this._api.verifyArtifact(taskId, id)
                if (!res.ok) {
                    toastEmit(res.message || this._msg.errGeneric, 'error')
                    return
                }
                this._setTask(res.data)
            }
            await this._advanceTask(taskId)
        })
    }

    // View mới → câu Thư ký nếu giai đoạn vừa đổi → job vừa mở vào nhật ký rồi chạy lần lượt → đọc lại view.
    // Giai đoạn trước = giai đoạn lượt _afterTask trước đã xử lý (nếu có): 2 lần duyệt liền nhau (chế độ Tự động) cùng
    // giữ prevStage 'running' lúc bấm — lượt sau không được báo lại "Xong cả kế hoạch" mà lượt đầu đã báo.
    async _afterTask(view, prevStage = this.taskOf(view.id)?.stage) {
        const prev = this._stages.get(view.id) ?? prevStage
        this._stages.set(view.id, view.stage)
        this._setTask(view)
        const line = stageLine(prev, view, (fn) => this._faceTitle(fn), this.state.lang || 'vi', { verdict: this.showVerdict })
        // Câu "Xong cả kế hoạch" mang id task — nhóm chat gắn nút tải PDF tổng vào đúng câu đó.
        if (line && this.secretary) await this._post(this.secretary.id, line, view.stage === 'done' ? view.id : '')
        const created = view.created ?? []
        for (const job of created) {
            this._append(job)
            const outline = this._outline(job)
            if (outline) await this._run(job.id, outline)
        }
        if (created.length) await this._refreshTask(view.id)
    }

    _setTask(view) {
        const { created: _created, ...rest } = view
        this._set({ tasks: { ...this.state.tasks, [view.id]: rest } })
    }

    async _refreshTask(taskId) {
        if (!taskId) return
        const res = await this._api.task(taskId)
        if (res.ok) this._setTask(res.data)
    }

    // Input thật (hoá đơn cho tài chính…) của các phòng sắp mở — Worker chỉ nhận đúng key outline.inputs của phòng đó (P3-18).
    async _taskInputs(fns) {
        const inputs = {}
        for (const fn of fns ?? []) {
            const division = this.division(`${this.sector}.${fn}`)
            if (division?.outline?.inputs?.length) inputs[fn] = await this._inputsFor(division, null)
        }
        return inputs
    }

    // Duyệt được khi có nơi nhận kết quả: bảng output (nền tảng) hoặc bàn giao cho phòng khác (job trong task).
    _approvable(doc) {
        const outline = this._outline(doc)
        return !!(outline?.output || outline?.produces?.length)
    }

    async _post(from, content, task = '') {
        const res = await this._api.appendLog(this.sector, from, content, task)
        if (res.ok) this._append(res.data)
        else console.error('[llm/talk] failed to post a reply:', res.message)
    }

    async _createJob(division, topic, extra = {}) {
        const res = await this._api.createJob({ division: division.id, topic, language: this.state.lang || 'vi', ...extra })
        if (!res.ok) {
            toastEmit(`${this._msg.sendFail}: ${res.message}`, 'error')
            return null
        }
        this._append(res.data)
        this.refreshTrial() // job lẻ vừa dùng lượt thử của phòng này
        return res.data
    }

    // ── Context (inputs của job — dữ liệu thật do client đọc, Worker chỉ nhận đúng key outline.inputs) ─────────

    // Khớp title chính xác (không phân biệt hoa/thường) — chưa fuzzy search.
    async _resolveProduct(topic) {
        try {
            const rows = await _svc('products').findAll()
            return rows.find((p) => _topicKey(p.title) === _topicKey(topic)) || null
        } catch (err) {
            console.error('[llm/talk] failed to resolve product:', err.message)
            return null
        }
    }

    // `content` là HTML đầy đủ — bóc tag + cắt ngắn cho đỡ tốn token.
    _productContext(product) {
        const plain = (product.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const snippet = plain.length > 400 ? `${plain.slice(0, 400)}…` : plain
        return [product.title, product.description, snippet].filter(Boolean).join(' — ')
    }

    // Số liệu thật cho phòng finance; tải lỗi → câu báo thiếu dữ liệu để AI trả NEED MORE DATA thay vì bịa.
    async _financeContext() {
        try {
            const invoices = await _svc('invoices').findAll()
            const overview = computeOverview(invoices)
            const debt = computeReceivablesPayables(invoices)
            const risk = assessRisk(invoices)
            const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`
            return [
                `Doanh thu ròng: ${vnd(overview.net)} (tổng đã thu ${vnd(overview.gross)}, mất do huỷ/trả ${vnd(overview.lost)})`,
                `Số đơn: ${overview.orderCount} (huỷ/trả: ${overview.lostCount}), giá trị TB/đơn: ${vnd(overview.avgOrder)}`,
                `Đơn chờ xác nhận đã nhận tiền: ${debt.pendingConfirmCount} (${vnd(debt.pendingConfirmAmount)})`,
                `Đơn cần hoàn tiền cho khách: ${debt.pendingRefundCount} (${vnd(debt.pendingRefundAmount)})`,
                `Mức rủi ro hiện tại: ${risk.level} — ${risk.reasons.join('; ')}`,
            ].join('\n')
        } catch (err) {
            console.error('[llm/talk] failed to build finance context:', err.message)
            return '(Không tải được số liệu tài chính thật — dữ liệu không đủ, phải trả lời NEED MORE DATA thay vì suy đoán)'
        }
    }

    // owner thật Worker gán cho caller (JWT) — đọc từ 1 dòng nó vừa trả về; '' = nền tảng.
    _learnOwner(row) {
        this._isPlatform = row?.owner === ''
        this._ownerKnown = true
    }

    // Input thật cho 1 job mới: sản phẩm khớp tên chủ đề (phòng nhận productContext) + số liệu tài chính — chỉ nền tảng.
    async _platformInputs(division, topic) {
        if (this._isPlatform !== true) return {}
        const product = division.outline?.inputs?.includes('productContext') ? await this._resolveProduct(topic) : null
        return this._inputsFor(division, product)
    }

    // Sản phẩm/hoá đơn nền tảng chỉ dành cho owner '' — hub không có bảng products/invoices của nền tảng
    // (this._isPlatform, suy từ owner Worker gán qua dòng log — xem sendMessage/startJob/_dcLoad).
    async _inputsFor(division, product) {
        const wanted = division.outline?.inputs ?? []
        const inputs = {}
        if (product && wanted.includes('productContext')) inputs.productContext = this._productContext(product)
        if (product?.tags && wanted.includes('tags')) inputs.tags = product.tags
        if (this._isPlatform === true && wanted.includes('financialContext')) inputs.financialContext = await this._financeContext()
        return inputs
    }

    // Nối lượt gửi /fields của job này vào ĐUÔI chuỗi (không chạy song song 2 request cho cùng 1 job) — approve/resume/
    // regenerateCall gọi TRƯỚC khi làm hành động khác, chờ được ngay vì chuỗi đã tự bảo đảm mọi lượt trước đã xong.
    _ensureFlushed(jobId) {
        return this._flushFields(jobId)
    }

    // Xếp thêm 1 lượt gửi vào chuỗi /fields của job — lượt này CHỈ thật sự chạy sau khi lượt trước xong (dù thành
    // công hay lỗi), nên _sendDue luôn đọc field mới nhất trong _saves lúc nó thật sự gửi, không phải lúc xếp hàng.
    _flushFields(jobId) {
        const prev = this._flushing.get(jobId) ?? Promise.resolve(true)
        const task = prev.then(() => this._sendDue(jobId), () => this._sendDue(jobId))
        this._flushing.set(jobId, task)
        task.finally(() => { if (this._flushing.get(jobId) === task) this._flushing.delete(jobId) })
        return task
    }

    // Gom + xoá field đang chờ của job này NGAY LÚC gửi (không phải lúc xếp hàng) — không có gì chờ thì coi như
    // thành công, không gọi server. False nếu server từ chối.
    async _sendDue(jobId) {
        const due = [...this._saves].filter(([, s]) => s.jobId === jobId)
        due.forEach(([k, s]) => { clearTimeout(s.timer); this._saves.delete(k) })
        if (!due.length) return true
        const fields = Object.fromEntries(due.map(([, s]) => [s.key, s.value]))
        const res = await this._api.fields(jobId, fields)
        if (!res.ok) {
            // Field vừa gõ không bị mất — đưa lại hàng chờ (đúng nghĩa vì lượt gửi giờ đã nối tiếp nhau: key nào có
            // trong _saves lúc này chắc chắn do 1 lượt setField MỚI HƠN ghi, không phải phần còn sót của lượt này).
            // KHÔNG tự đặt lại timer — lỗi kéo dài (mất mạng, 401/403, 409 job đã duyệt ở tab khác) sẽ không thành
            // vòng lặp gửi lại + toast mỗi 600ms; lần setField/approve/resume/regenerateCall sau tự gửi lại.
            for (const [k, s] of due) if (!this._saves.has(k)) this._saves.set(k, { ...s, timer: undefined })
            toastEmit(res.message || this._msg.errGeneric, 'error')
            return false
        }
        this._mapJob(jobId, (d) => ({ ...d, error: '', ...(res.data.status ? { status: res.data.status, pausedStepId: res.data.pausedStepId } : {}) }))
        return true
    }

    // Job đã dừng chờ duyệt / đã xong (paused/done) mà vẫn còn lỗi (vd regenerateCall lỗi trong lúc job đang dừng) —
    // không có gì để runner chạy tiếp, Thử lại chỉ cần dọn banner ⚠️: xoá lỗi RAM ngay + xoá lỗi/đồng bộ status ở server.
    async _clearError(jobId) {
        this._mapJob(jobId, (d) => ({ ...d, error: '' }))
        if (!(await this._ensureFlushed(jobId))) return
        const res = await this._api.fields(jobId, {}) // patchFields ở Worker luôn set error='' + trả status/pausedStepId mới nhất
        if (!res.ok) {
            toastEmit(res.message || this._msg.errGeneric, 'error')
            return
        }
        this._mapJob(jobId, (d) => ({ ...d, ...(res.data.status ? { status: res.data.status, pausedStepId: res.data.pausedStepId } : {}) }))
    }
}

const _instances = new Map()

/** 1 nhóm chat mỗi ngành — mọi <svc-talk sector=…> cùng ngành dùng chung hàng đợi + state. Sector rỗng/null/undefined
 *  (vd payload bus { sector: null }) → ngành mặc định, không tạo nhầm section "llm.null". */
export function talkFor(sector, { trial } = {}) {
    const key = sector || DEFAULT_SECTOR
    if (!_instances.has(key)) _instances.set(key, new TalkService(key))
    const talk = _instances.get(key)
    if (trial !== undefined) talk.setTrial(trial) // component đặt chế độ; bus (không kèm) giữ nguyên
    return talk
}

// Module sống qua điều hướng ClientRouter — đổi tài khoản trong cùng trang thì mọi nhóm chat đã mở phải quên dữ liệu cũ.
if (typeof window !== 'undefined') onOwnerChange(() => { for (const s of _instances.values()) s.reset() })
