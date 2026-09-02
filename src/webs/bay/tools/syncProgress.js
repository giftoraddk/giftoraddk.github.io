// src/webs/bay/tools/syncProgress.js
// Mô hình % đồng bộ dạng staged/trọng số cho progress bar (spec §B) — thuần, không phụ thuộc
// DOM/mesh, dùng bởi svc-bay.js để tính this._syncProgress[bayId] mỗi khi 1 mốc hoàn tất. Idempotent
// theo thiết kế (Set các stage đã xong, không cộng dồn số) — gọi lại markStageDone() nhiều lần với
// cùng stage không làm % tăng thêm.

export const SYNC_STAGES = ['linked', 'presence', 'syncRoundTrip', 'commerceSettled', 'chatSettled']

const WEIGHTS = {
    linked:          20, // mesh link đầu tiên thiết lập (onLink)
    presence:        15, // nhận PRESENCE từ 1 peer thật
    syncRoundTrip:   15, // nhận SYNC_RESPONSE đầu tiên
    commerceSettled: 25, // SYNC_RESPONSE đã xử lý xong phần sections/sectionItems/promos (products qua Firestore riêng, không tính ở đây)
    chatSettled:     25, // SYNC_RESPONSE đã xử lý xong phần rows (chat)
}

/** @param {Set<string>} done  @param {string} stage  @returns {Set<string>} Set MỚI (immutable — Lit state) */
export function markStageDone(done, stage) {
    if (done.has(stage)) return done // đã có sẵn — trả nguyên ref cũ, khỏi trigger re-render thừa
    const next = new Set(done)
    next.add(stage)
    return next
}

/** @param {Set<string>} done  @returns {number} 0-100 */
export function progressPercent(done) {
    let total = 0
    for (const stage of SYNC_STAGES) if (done.has(stage)) total += WEIGHTS[stage]
    return total
}
