// src/packages/llm/tool/auto.js
//
// Thuần: chế độ Tự động của nhóm chat (service/talk.js `auto`) — 1 job của task đang dừng chờ sếp thì bước kế là gì.
// Vẫn đi đúng các bước duyệt như sếp tự bấm, chỉ là không chờ tay: duyệt step text, để AI tạo ảnh (tạo / upload lỗi →
// bỏ qua ảnh cho task đi tiếp, sếp "Tạo lại ảnh" sau), duyệt kết quả. Chuyên gia ký duyệt (outline.review), các lỗi
// khác và bàn giao cần xác minh lại vẫn chờ người. Job không thuộc task (mở riêng ở panel phòng ban) không bị đụng tới.

/** Step đang dừng chờ duyệt — so qua Number(): pausedStepId là cột TEXT trên D1 (xem app/svc-progress.js). */
const pausedStep = (outline, doc) => (doc.status === 'awaiting_review' && doc.pausedStepId
    ? (outline?.steps ?? []).find((s) => Number(s.id) === Number(doc.pausedStepId)) ?? null
    : null)

/**
 * Bước kế cho `doc` → 'resume' (duyệt step text) | 'image' (AI tạo ảnh) | 'skipImage' (ảnh AI lỗi → bỏ qua) |
 * 'approve' (duyệt kết quả) | null (không có gì để tự làm — đang chạy, đã duyệt, lỗi, hoặc cần người).
 * `approvable` — job có nơi nhận kết quả (service/talk.js _approvable).
 */
export function autoAction(doc, outline, { approvable = false } = {}) {
    if (!doc?.task || doc.approved || !outline) return null
    if (doc.error) {
        const imageFailed = doc.imageChoice === 'ai' && !doc.fields?.pics && doc.status !== 'done'
            && (outline.steps ?? []).some((s) => s.type === 'image')
        return imageFailed ? 'skipImage' : null
    }
    const step = pausedStep(outline, doc)
    if (step?.type === 'image') return doc.imageChoice ? null : 'image'
    if (step) return 'resume'
    if (doc.status === 'done' && approvable && !outline.review) return 'approve'
    return null
}
