// src/webs/bay/tools/bitmap.js
// Bitmap Uint8Array — (A) Bloom-filter seen-dedupe cho relay hot-path (chỉ dùng cho `chats`),
// (B) presence bitmap theo time-bucket để phát hiện lỗ hổng chat mà `since`-cursor bỏ lỡ lúc
// SYNC_REQUEST. Thuật toán thuần, không coupling domain nào — viết lại y hệt
// webs/channel/tools/bitmap.js, không import (bay độc lập hoàn toàn với channel).

/** Bloom filter thuần trên Uint8Array (SETBIT/GETBIT kiểu Redis). Không bao giờ
 *  false-negative — `mightHaveSeen() === false` LUÔN đúng là "chưa từng add()". Chỉ dùng cho
 *  tập lớn/immutable (chats) — không dùng cho dữ liệu có thể bị sửa (products/sections), vì
 *  dedupe-theo-id-vĩnh-viễn sẽ chặn nhầm bản update. */
export function createSeenFilter({ bits = 32_768, k = 4 } = {}) {
    const bytes = new Uint8Array(Math.ceil(bits / 8))

    function _hashes(id) {
        let h1 = 0x811c9dc5, h2 = 0x1000193
        for (let i = 0; i < id.length; i++) {
            h1 = (h1 ^ id.charCodeAt(i)) * 0x01000193 >>> 0
            h2 = (h2 ^ id.charCodeAt(i)) * 0x85ebca6b >>> 0
        }
        const out = []
        for (let i = 0; i < k; i++) out.push((h1 + i * h2) % bits)
        return out
    }

    const _get = bit => (bytes[bit >> 3] >> (bit & 7)) & 1
    const _set = bit => { bytes[bit >> 3] |= 1 << (bit & 7) }

    return {
        mightHaveSeen(id) { return _hashes(id).every(_get) },
        add(id) { _hashes(id).forEach(_set) },
    }
}

const BLOCK_MS    = 60 * 1000            // 1 phút/block — mịn hơn 5 phút cũ, tránh phải tải lại
                                          // nguyên khối 5' chỉ vì thiếu đúng 1 tin (xem spec
                                          // 2026-08-03-bay-p2p-sync-upgrade §A.2)
const TTL_MS      = 7 * 24 * 60 * 60 * 1000 // khớp TTL_CHATS_MS trong baydb.js
const BLOCK_COUNT = Math.ceil(TTL_MS / BLOCK_MS) // 10080 blocks ≈ 1260 bytes

/**
 * Flow build bitmap presence theo time-bucket: rows[] ({created_at}, vd kết quả
 * history(bayId, 0)) -> Uint8Array bitmap
 */
export function buildChatBitmap(rows, now = Date.now()) {
    const bytes = new Uint8Array(Math.ceil(BLOCK_COUNT / 8))
    const windowStart = now - TTL_MS
    // [2] PROCESS: Set bit cho từng block 5 phút có ít nhất 1 message trong 7 ngày gần nhất
    // tính từ `now` (thuần, không I/O)
    //   [2.a] CALC: Tính block index của mỗi row từ created_at, bỏ qua row ngoài cửa sổ TTL
    for (const row of rows) {
        const block = Math.floor((row.created_at - windowStart) / BLOCK_MS)
        if (block < 0 || block >= BLOCK_COUNT) continue
        //   [2.b] SETBIT: Đánh dấu block có message (OR bit, không quan tâm đã set hay chưa)
        bytes[block >> 3] |= 1 << (block & 7)
    }

    // [4] RETURN: Bitmap hoàn chỉnh — dùng so sánh với bitmap của peer khác trong missingRanges()
    return bytes
}

/**
 * Flow tính khoảng thời gian bị thiếu khi so bitmap presence: mine, theirs (bitmap) ->
 * ranges[] {from, to} (epoch ms)
 * Gọi ở bên PHẢN HỒI SYNC_REQUEST (`mine` = bitmap của mình, `theirs` = bitmap nhận được từ
 * peer đang xin sync) để biết cần query bổ sung range thời gian nào.
 */
export function missingRanges(mine, theirs, now = Date.now()) {
    const windowStart = now - TTL_MS
    const ranges = []
    let open = null
    // [2] PROCESS: Quét từng block, gom các block liên tiếp `mine` có mà `theirs` thiếu thành
    // range epoch ms (thuần, không I/O)
    //   [2.a] DIFF: So bit từng block — `theirs` không có bitmap (vd peer mới join, chưa từng
    //   gửi presence) coi như toàn bộ theirBit = 0, tức "thiếu tất cả"
    //   [2.b] COLLAPSE: Gộp các block liên tiếp missing thành 1 range {from, to} thay vì trả
    //   từng block rời rạc — tránh query lắt nhắt phía gọi
    for (let block = 0; block < BLOCK_COUNT; block++) {
        const mineBit  = (mine[block >> 3] >> (block & 7)) & 1
        const theirBit = theirs ? (theirs[block >> 3] >> (block & 7)) & 1 : 0
        const missing  = mineBit && !theirBit
        if (missing && open == null) open = block
        if (!missing && open != null) { ranges.push(_toRange(open, block)); open = null }
    }
    // Đoạn missing cuối cùng có thể chưa đóng khi quét hết BLOCK_COUNT (vd toàn bộ đuôi bitmap
    // đang missing) — đóng nốt range đó trước khi trả về
    if (open != null) ranges.push(_toRange(open, BLOCK_COUNT))

    // [4] RETURN: Danh sách range bị thiếu
    return ranges

    function _toRange(from, to) {
        return { from: windowStart + from * BLOCK_MS, to: windowStart + to * BLOCK_MS }
    }
}

/**
 * Flow lọc rows nằm trong vùng thiếu (dùng thay `missingRanges(...).filter(r => ranges.some(...))`
 * ở nơi CHỈ cần lọc rows, không cần range đã gộp để hiển thị/log): rows[] ({created_at}), mine,
 * theirs (bitmap) -> rows[] con nằm trong block missing.
 * O(rows + BLOCK_COUNT) — tra thẳng bit của đúng block chứa row đó, KHÔNG dựng danh sách range rồi
 * quét lại range cho từng row. Cách cũ là O(rows × số range); với peer gần như chưa có gì (theirs
 * toàn 0) và lịch sử chat rải rác theo block (mỗi block 1 phút), số range có thể lên tới hàng nghìn
 * (mỗi block xen kẽ có/không tin nhắn không gộp được), khi đó O(rows × range) chậm hẳn — đo thực tế
 * ở benchmark storm 1000 peer mới: ~8.8ms/peer chỉ riêng bước lọc này, dùng hàm dưới còn ~0.1ms/peer.
 */
export function filterMissingRows(rows, mine, theirs, now = Date.now()) {
    const windowStart = now - TTL_MS
    return rows.filter(r => {
        const block = Math.floor((r.created_at - windowStart) / BLOCK_MS)
        if (block < 0 || block >= BLOCK_COUNT) return false
        const mineBit  = (mine[block >> 3] >> (block & 7)) & 1
        const theirBit = theirs ? (theirs[block >> 3] >> (block & 7)) & 1 : 0
        return !!(mineBit && !theirBit)
    })
}

export const b64Bitmap   = bytes => btoa(String.fromCharCode(...bytes))
export const unb64Bitmap = str   => Uint8Array.from(atob(str), c => c.charCodeAt(0))

// ── Hash order-independent cho reconcile dữ liệu thương mại (A.1) ─────────────
// So sánh 2 tập rows (products/sections/sectionItems/promos) mà không cần gửi cả tập qua mesh —
// bên xin sync gửi kèm hash tập mình đang có, bên trả lời tự tính hash tập của mình, hash khác
// nhau mới thật sự gửi payload (xem svc-bay.js _dfHandleSyncRequest). XOR từng row-hash (không
// quan tâm thứ tự — 2 phía load cùng 1 tập nhưng Firestore/IndexedDB không đảm bảo cùng thứ tự)
// + kèm rows.length để bắt được trường hợp thêm/bớt row mà XOR trùng ngẫu nhiên.
// Kết quả từ keyFn/versionFn sẽ bị ép kiểu sang string qua template literal.
export function hashRows(rows, keyFn = r => r.id, versionFn = r => r.updated_at ?? r.created_at ?? 0) {
    let h = 0
    for (const r of rows) {
        const s = `${keyFn(r)}:${versionFn(r)}`
        let rh = 0
        for (let i = 0; i < s.length; i++) rh = (rh * 31 + s.charCodeAt(i)) >>> 0
        h ^= rh
    }
    return `${h.toString(36)}:${rows.length}`
}
