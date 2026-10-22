// src/services/shared/json-ai.js
//
// 1 câu trả lời JSON qua /v1/ai/stream, tự thử lại tối đa 3 lần — CHỈ cho prompt không phải chuyên môn phòng ban
// (bộ định tuyến lệnh của <svc-ask>). Chuyên môn phòng ban chạy ở Worker (/v1/fn/*), không bao giờ qua đây.
import { generateText, DEFAULT_CHAIN } from './tensor-api.js'
import { parseJsonObject, hasForeignScript } from '../tools/json-reply.js'

/**
 * `signal` (nút Dừng) kết thúc hẳn; `timeoutMs` chỉ cắt 1 lần thử. `onAttempt(attempt, 3)` gọi đầu mỗi lần thử.
 * 429 = hết lượt: không thử lại (thử lại chỉ đốt thêm lượt — góp ý Phase 0).
 */
export async function generateJsonWithRetry(chain = DEFAULT_CHAIN, { system, user, maxTokens, temperature, languageName, errMessage, onAttempt, signal, timeoutMs }) {
    let lastErr
    for (let attempt = 1; attempt <= 3; attempt++) {
        onAttempt?.(attempt, 3)
        const signals = [signal, timeoutMs && AbortSignal.timeout(timeoutMs)].filter(Boolean)
        try {
            const raw = await generateText([{ role: 'user', content: user }], {
                system, maxTokens, temperature, chain, signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0],
            })
            const obj = parseJsonObject(raw)
            if (!obj || hasForeignScript(obj, languageName)) throw new Error(errMessage)
            return obj
        } catch (err) {
            if (signal?.aborted) throw err
            lastErr = err
            if (/\b429\b/.test(err?.message ?? '')) break
            console.warn(`[json-ai] attempt ${attempt}/3 failed:`, err?.message)
        }
    }
    throw lastErr
}
