// src/webs/bay/tools/bayChannel.js
// Scaffolding dùng bởi baySectionAdapter.js (sectionItems, IndexedDB) — "_bayId singleton +
// _listeners Set + setActiveBay + notify fan-out" (mirror webs/channel/tools/roomChannel.js, viết
// lại độc lập). products KHÔNG còn dùng file này — lưu Firestore thật, xem tools/bayAdapter.js.
export function createBayChannel() {
    let _bayId = null
    const _listeners = new Set()

    return {
        setActiveBay(bayId) { _bayId = bayId },
        getBayId() { return _bayId },

        // Chống-stale: 1 write kết thúc sau khi bay đã đổi không được báo nhầm listener của bay
        // mới. Kiểm tra CẢ trước lẫn sau lượt đọc async, vì bay có thể đổi ngay trong lúc await.
        async notify(bayId, reader) {
            if (bayId !== _bayId) return
            const rows = await reader(bayId)
            if (bayId !== _bayId) return
            _listeners.forEach(fn => fn(rows))
        },

        addListener(fn) { _listeners.add(fn); return () => _listeners.delete(fn) },
    }
}

// Trích applyListOpts() — filter/search/sort/limit thuần cho danh sách rows đọc từ IndexedDB.
// Luôn loại record đã soft-delete trước tiên — cùng quy ước `deleted_at == null` của
// firestore.js's _toRows(), vì svc-admin.js._dfDeleteExec() chỉ set `deleted_at` (không xoá
// thật khỏi IndexedDB) nên mọi listener đọc qua find()/listen() phải tự loại, không thì record
// đã xoá vẫn hiện trên board (svc-bay-sections.js's live listener, xem bayAdapter.js).
export function applyListOpts(rows, opts = {}) {
    let out = rows.filter(r => r.deleted_at == null)
    const { filters = {}, searchField, searchValue, sortBy, order = 'asc', maxCount } = opts
    for (const [field, val] of Object.entries(filters)) {
        if (val === '' || val == null) continue
        out = out.filter(r => String(r[field] ?? '') === String(val))
    }
    if (searchField && searchValue) {
        const q = String(searchValue).toLowerCase()
        out = out.filter(r => String(r[searchField] ?? '').toLowerCase().startsWith(q))
    }
    if (sortBy) {
        out = [...out].sort((a, b) => {
            const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0
            return order === 'desc' ? (av < bv ? 1 : -1) : (av > bv ? 1 : -1)
        })
    }
    if (maxCount) out = out.slice(0, maxCount)
    return out
}
