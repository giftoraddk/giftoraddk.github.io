// src/packages/llm/tool/waves.js
//
// Thuần (không network/DOM): thứ tự chạy call của 1 step + "call đã có dữ liệu chưa" — cùng luật với
// worker/src/fn/state.ts, để runner biết call nào còn phải gọi. Status job luôn do Worker tính, không suy ở đây.

const filled = (v) => String(v ?? '').trim() !== ''

/** Topo-sort `calls` theo `dependsOn` thành từng wave — call cùng wave chạy song song. */
export function orderCallWaves(calls = []) {
    const done = new Set()
    const waves = []
    let remaining = [...calls]
    while (remaining.length) {
        const wave = remaining.filter((c) => (c.dependsOn ?? []).every((k) => done.has(k)))
        if (!wave.length) throw new Error('circular dependsOn in outline')
        wave.forEach((c) => done.add(c.key))
        waves.push(wave)
        remaining = remaining.filter((c) => !wave.includes(c))
    }
    return waves
}

/** 1 field có dữ liệu là call coi như xong (luật cũ của engine, giống state.ts callDone). */
export const callDone = (call, fields = {}) => call.fields.some((f) => filled(fields[f.key]))

/** Call còn thiếu dữ liệu trong 1 wave. */
export const pendingCalls = (wave, fields = {}) => wave.filter((c) => !callDone(c, fields))

/** Step đang mở theo status server: 'queued'/'' → step đầu; 'stepN' → step id N; done/awaiting_review (hoặc status lạ) → null. */
export function currentStep(outline, job) {
    const steps = outline?.steps ?? []
    if (!job || job.approved) return null
    if (!job.status || job.status === 'queued') return steps[0] ?? null
    const m = /^step(\d+)$/.exec(job.status)
    return m ? steps.find((s) => Number(s.id) === Number(m[1])) ?? null : null
}

// Step ảnh chỉ có 1 "call" thật trước khi có ảnh (concept dịch imagePrompt) — coi như 1 call bình thường để soi tiến triển.
const stepCalls = (step) => (step.type === 'image' ? [{ key: 'concept', fields: [{ key: 'imagePrompt' }] }] : (step.calls ?? []))

/**
 * Không tiến triển sau 1 lượt textStep/imageStep: status y hệt trước, và call/field mà step hiện tại còn thiếu cũng
 * y hệt trước — nghĩa là Worker trả 200 nhưng field vẫn rỗng. Runner dùng để dừng thay vì lặp lại vô ích (STEP_GUARD).
 */
export function sameProgress(outline, before, after) {
    if (!before || !after || before.status !== after.status) return false
    const step = currentStep(outline, before)
    if (!step) return false
    const calls = stepCalls(step)
    const key = (fields) => pendingCalls(calls, fields).map((c) => c.key).sort().join(',')
    return key(before.fields ?? {}) === key(after.fields ?? {})
}
