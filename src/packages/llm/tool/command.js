// src/packages/llm/tool/command.js
//
// Thuần: 1 lệnh giao từ ngoài vào panel AI (<svc-aide> / <svc-talk> / <svc-fn>) — <svc-ask> trên canvas <svc-node> đặt
// `command = { id, text }` cho node có `chat` (node/service/ask-command.js). Canvas giữ overlay properties qua các lần
// mount lại panel, nên mỗi lệnh chỉ được nhận 1 lần trong trang, theo id — mở lại panel sau đó không gửi lại lần nữa.

const taken = new Set()

/** Nội dung lệnh nếu chưa ai nhận, else '' (thiếu id / rỗng / đã nhận). */
export function takeCommand(command) {
    const id = command?.id
    const text = String(command?.text ?? '').trim()
    if (!id || !text || taken.has(id)) return ''
    taken.add(id)
    return text
}
