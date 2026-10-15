// src/packages/llm/service/runner.js
//
// Chạy 1 job về phía trước trên Worker, từng call một (D5): wave theo outline → POST /call song song trong wave → đọc
// lại job sau mỗi step. Worker tự tính status (D6) — runner chỉ hỏi "call nào còn thiếu dữ liệu" và dừng khi server
// báo chờ duyệt / xong. Không biết conductor: nơi dùng (talk.js, Phase 5 svc-fn) truyền hooks đọc/ghi job + spinner.
import { fnApi } from './fn-api.js'
import { orderCallWaves, pendingCalls, currentStep, sameProgress } from '../tool/waves.js'
import { generateImageBlob, uploadImage } from './image.js'

const STEP_GUARD = 20 // pipeline dài nhất hiện có 4 step — chặn lặp vô hạn nếu server trả status lạ

export class JobRunner {
    /**
     * @param {object} hooks
     * @param {(id: string) => object | undefined} hooks.getJob
     * @param {(id: string, fn: (job: object) => object) => void} hooks.mapJob
     * @param {(key: string, on: boolean) => void} hooks.setRunning   key = "stepId-callKey" (svc-progress runningSub)
     * @param {() => object} [hooks.api]   fn-api client lúc này (fnApi / fnTrialApi — talk.js setTrial); mặc định fnApi
     */
    constructor(hooks) {
        this._h = hooks
    }

    get _api() { return this._h.api?.() ?? fnApi }

    /** Chạy tới khi server báo dừng chờ duyệt / xong, 1 call lỗi, hoặc AI trả lời trống (không lặp lại vô ích). Trả về job cuối cùng runner thấy. */
    async run(jobId, outline, emptyMessage = 'The AI returned an empty answer — please retry') {
        for (let i = 0; i < STEP_GUARD; i++) {
            const before = this._h.getJob(jobId)
            const step = currentStep(outline, before)
            if (!step) break
            const ok = step.type === 'image' ? await this._imageStep(before, step) : await this._textStep(before, step, emptyMessage)
            if (!ok || !(await this.refresh(jobId))) break
            // Worker trả 200 nhưng status + call còn thiếu y hệt trước (field vẫn rỗng) — dừng, đừng gọi lại y chang.
            if (sameProgress(outline, before, this._h.getJob(jobId))) {
                this._fail(jobId, emptyMessage)
                break
            }
        }
        return this._h.getJob(jobId)
    }

    /** Đọc lại job từ server — status chính thức sau cả wave (các call song song ghi state lần lượt). */
    async refresh(jobId) {
        const res = await this._api.job(jobId)
        if (!res.ok) {
            this._fail(jobId, res.message)
            return false
        }
        this._h.mapJob(jobId, () => res.data)
        return true
    }

    /** Viết lại riêng 1 call kèm chỉ dẫn — Worker tự kiểm call đó đã được phép chạy chưa. */
    regenerate(jobId, stepId, callKey, instruction) {
        return this._call(jobId, stepId, callKey, instruction)
    }

    /** Ảnh AI từ concept đã có → upload → 1 lần POST /image {choice:'ai', pics} (job vẫn đang dừng ở step ảnh tới lúc này). */
    async generateImage(jobId, stepId) {
        const job = this._h.getJob(jobId)
        if (!job) return false
        try {
            const blob = await this._spin(`${stepId}-generate`, () => generateImageBlob(job.fields?.imagePrompt, job.topic, job.colors))
            const url = await this._spin(`${stepId}-upload`, () => uploadImage(blob))
            return this._apply(jobId, await this._api.image(jobId, { choice: 'ai', pics: url }))
        } catch (err) {
            this._fail(jobId, err?.message || String(err))
            return false
        }
    }

    async _textStep(job, step, emptyMessage) {
        for (const wave of orderCallWaves(step.calls)) {
            const todo = pendingCalls(wave, this._h.getJob(job.id)?.fields ?? {})
            const results = await Promise.all(todo.map((c) => this._call(job.id, step.id, c.key)))
            if (results.includes(false)) return false
            // 200 nhưng field của wave này vẫn rỗng (câu trả lời trống) — dừng ngay, đừng để wave sau 409 "cannot run yet"
            // (nó cần đúng field wave này để mở khoá — xem worker/src/fn/state.ts's canRunCall/dependsOn).
            if (pendingCalls(wave, this._h.getJob(job.id)?.fields ?? {}).length) {
                this._fail(job.id, emptyMessage)
                return false
            }
        }
        return true
    }

    async _imageStep(job, step) {
        if (!String(job.fields?.imagePrompt ?? '').trim()) return this._call(job.id, step.id, 'concept')
        if (job.imageChoice === 'ai' && !job.fields?.pics) return this.generateImage(job.id, step.id)
        return false // chờ sếp chọn AI / Bỏ qua — server đã để job ở awaiting_review
    }

    async _call(jobId, stepId, callKey, instruction = '') {
        const res = await this._spin(`${stepId}-${callKey}`, () => this._api.call(jobId, { stepId, callKey, instruction }))
        return this._apply(jobId, res)
    }

    // Kết quả /call, /image → field mới + status server tính; lỗi → hiện ngay trên job (server cũng lưu error của /call).
    _apply(jobId, res) {
        if (!res.ok) {
            this._fail(jobId, res.message)
            return false
        }
        const { fields = {}, status, pausedStepId } = res.data ?? {}
        this._h.mapJob(jobId, (j) => ({ ...j, fields: { ...j.fields, ...fields }, ...(status ? { status, pausedStepId } : {}), error: '' }))
        return true
    }

    _fail(jobId, message) {
        this._h.mapJob(jobId, (j) => ({ ...j, error: message || 'Error' }))
    }

    async _spin(key, fn) {
        this._h.setRunning(key, true)
        try {
            return await fn()
        } finally {
            this._h.setRunning(key, false)
        }
    }
}
