// src/packages/llm/tool/divisions.js
//
// Thuần: id phòng ban (cũ ↔ '<sector>.<fn>'), danh sách phòng ban của 1 ngành từ GET /v1/fn/sectors, tên hiển thị,
// và vài luật hiển thị của nhóm chat. Không chứa chuyên môn nào — chỉ id/nhãn/face.

/** Id từ trước khi có ngành — mọi phòng ban cũ đều là thương mại điện tử (khớp worker fn/registry.ts LEGACY). */
export const LEGACY_DIVISIONS = {
    production: 'ecommerce.product', marketing: 'ecommerce.marketing', finance: 'ecommerce.finance',
    sale: 'ecommerce.consult', aide: 'ecommerce.consult',
}

export const canonicalDivision = (id) => LEGACY_DIVISIONS[id] ?? id ?? ''
export const sectorOfDivision = (id) => canonicalDivision(id).split('.')[0] || ''

/** Tên hiển thị: tên admin đặt cho phòng (face) → nhãn gốc theo ngôn ngữ. */
export const displayTitle = (fn, lang = 'vi') => fn?.name || fn?.title?.[lang] || fn?.title?.vi || fn?.id || ''
export const displayAbout = (fn, lang = 'vi') => fn?.about || fn?.description?.[lang] || fn?.description?.vi || ''

/** Phòng ban đang bật của 1 ngành, dạng nhóm chat dùng — `outline` gắn sau (GET /v1/fn/spec cần đăng nhập). */
export function sectorDivisions(sectors, sector, lang = 'vi') {
    const s = (sectors ?? []).find((x) => x.id === sector)
    return (s?.functions ?? [])
        .filter((f) => f.status !== 'inactive')
        .map((f) => ({
            id: f.id, fn: f.fn, kind: f.kind,
            title: displayTitle(f, lang), description: displayAbout(f, lang),
            pics: f.pics || '', lang: f.lang || 'vi', outline: null,
        }))
}

/** Thư ký + bước Tích hợp của 1 ngành — có tên trong nhóm chat, không phải phòng ban để nhắn riêng (P3-2). */
export function systemDivisions(sectors, sector, lang = 'vi') {
    const s = (sectors ?? []).find((x) => x.id === sector)
    return (s?.system ?? []).map((f) => ({
        id: f.id, fn: f.fn, kind: f.kind, title: displayTitle(f, lang), description: displayAbout(f, lang),
        pics: '', lang: 'vi', outline: null, system: true,
    }))
}

/** 1 phòng ban (id cũ hoặc mới) trong kết quả /v1/fn/sectors. */
export function findFunction(sectors, id) {
    const want = canonicalDivision(id)
    for (const s of sectors ?? []) {
        const f = s.functions?.find((x) => x.id === want)
        if (f) return f
    }
    return null
}

/** Job còn 'queued'/'stepN' lúc vừa tải trang = lượt chạy đã chết cùng tab cũ — gắn lỗi (chỉ RAM) để hiện Thử lại. */
export function markInterrupted(doc, message) {
    if (doc.kind !== 'job' || doc.error || doc.approved || !(doc.status === 'queued' || /^step/.test(doc.status || ''))) return doc
    return { ...doc, error: message }
}
