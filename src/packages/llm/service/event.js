import { registerChannel, bridgeDomEvent } from '@/services/core/bus.js'

export const LLM_CHANNELS = {
    SEND_MESSAGE: 'llm:send-message',   // lệnh: { text, sector? } — sếp nhắn Thư ký của nhóm chat 1 ngành (mặc định ecommerce)
    APPROVE_STEP: 'llm:approve-step',   // lệnh: { jobId, sector? } — duyệt kết quả job
    RETRY_STEP: 'llm:retry-step',       // lệnh: { jobId, sector? } — chạy tiếp job từ step chưa xong
}
// State nhóm chat: conductor tự đăng ký channel `state:llm.<sector>` (service/talk.js sectionOf) — không khai ở đây.

const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128
const isSector = (v) => v == null || (typeof v === 'string' && /^[a-z]{2,32}$/.test(v))

// Top-level (không trong setup) — service.js registerHandler ngay lúc import, channel phải có trước.
// Lệnh nhận từ DOM là input không tin cậy → schema chặn đúng kiểu + giới hạn độ dài.
registerChannel(LLM_CHANNELS.SEND_MESSAGE, {
    schema: (d) => typeof d?.text === 'string' && d.text.trim().length > 0 && d.text.length <= 8000 && isSector(d.sector),
})
registerChannel(LLM_CHANNELS.APPROVE_STEP, { schema: (d) => isId(d?.jobId) && isSector(d?.sector) })
registerChannel(LLM_CHANNELS.RETRY_STEP, { schema: (d) => isId(d?.jobId) && isSector(d?.sector) })

/** Gọi 1 lần từ src/services/app.js — nối DOM event của domain (từ component ngoài svc-talk) lên bus. */
export function setupLlmChannels() {
    bridgeDomEvent('llm-send-message', LLM_CHANNELS.SEND_MESSAGE)
    bridgeDomEvent('llm-approve-step', LLM_CHANNELS.APPROVE_STEP)
    bridgeDomEvent('llm-retry-step', LLM_CHANNELS.RETRY_STEP)
}
