// src/services/mind.js
//
// Retrieval core DÙNG CHUNG cho collection `mind` (knowledge base, server:'llm' — xem
// tools/mind-sync.js, hook/CRUD.rst) — rút gọn hook/firebase-multidomain-ai-rag-spec.md xuống
// những gì tính được THUẦN JS phía browser: KHÔNG embedding/vector search (site static, không
// backend proxy — xem tools/mind-sync.js's ghi chú CORS), KHÔNG rule engine/knowledge graph (domain
// Sale không cần). Đặt ở `services/` (không phải `webs/division/`) vì đây là engine DOMAIN-AGNOSTIC
// — domain thứ 2 sau này (finance/policy...) tái dùng THẲNG module này, chỉ cần tự stamp field
// `domain` khác khi ghi vào `mind` (xem tools/mind-sync.js's DOMAIN_SALE), không cần viết lại
// keyword/metadata/temporal scoring (spec's coding rule #46 "tách domain logic khỏi core retrieval").
//
// Pipeline (spec §10/§11/§14/§23/§27, rút gọn):
//   filterActive   — metadata (domain/status) + temporal (effectiveFrom/effectiveTo) filter
//   scoreHybrid    — keyword overlap + authorityLevel + specificity (KHÔNG semanticScore)
//   buildEvidencePack — cắt về top-N, chỉ giữ field cần cho prompt (spec §23 Context Pack, rút gọn)
//
// tools/sale-engine.js's `shortlistMind` cũ nay chỉ là 1 lệnh gọi `retrieveMind` ở đây.

// Metadata + temporal filter (spec §10 "Metadata filtering", §11 "Temporal Retrieval"). `queryDate`
// mặc định thời điểm gọi hàm — truyền tay khi cần kiểm 1 mốc thời gian khác (vd test).
export function filterActive(entries, { domain, queryDate = Date.now() } = {}) {
    const qd = queryDate instanceof Date ? queryDate.getTime() : new Date(queryDate).getTime()
    return entries.filter(m => {
        if (m.deleted_at) return false
        if (m.status === 'inactive' || m.status === 'deprecated') return false
        if (domain && m.domain && m.domain !== domain) return false
        if (m.effectiveFrom && new Date(m.effectiveFrom).getTime() > qd) return false
        if (m.effectiveTo && new Date(m.effectiveTo).getTime() < qd) return false
        return true
    })
}

// Hybrid score (spec §27, rút gọn — bỏ semanticScore vì không có embedding):
//   0.6 keyword overlap (giữ nguyên phép đếm của shortlistMind cũ, chuẩn hoá về [0,1])
//   0.25 authorityLevel (spec §6 — nguồn CHÍNH THỨC/curate tay > auto-sync > không rõ nguồn)
//   0.15 specificity (entry neo vào record thật (refTable) > entry rời rạc (CSV 'other'))
const _WEIGHTS = { keyword: 0.6, authority: 0.25, specificity: 0.15 }

// KHÔNG tự sort ở đây — buildEvidencePack cần phân biệt 2 trường hợp khác hẳn nhau (có/không entry
// khớp từ khoá nào), sort sớm ở đây sẽ xoá mất thứ tự gốc (recency) mà nhánh "0 entry khớp" cần giữ
// nguyên (xem buildEvidencePack).
export function scoreHybrid(entries, message) {
    const words = (message || '').toLowerCase().split(/\s+/).filter(w => w.length > 1)
    return entries.map(m => {
        const keywordScore = words.length
            ? words.reduce((n, w) => n + ((m.text || '').toLowerCase().includes(w) ? 1 : 0), 0) / words.length
            : 0
        const authorityScore = Math.min(1, Math.max(0, (m.authorityLevel ?? 60) / 100))
        const specificityScore = m.refTable ? 1 : 0.5
        const score = _WEIGHTS.keyword * keywordScore + _WEIGHTS.authority * authorityScore + _WEIGHTS.specificity * specificityScore
        return { m, score, keywordScore }
    })
}

// Evidence pack (spec §23/§28, rút gọn thành mảng phẳng). 2 nhánh KHÁC HẲN nhau:
//   - Có entry khớp ít nhất 1 từ khoá -> xếp hạng theo hybrid score (keyword+authority+specificity).
//   - 0 entry khớp từ khoá nào (câu hỏi mở đầu chung chung, vd "shop bán gì vậy") -> KHÔNG sort theo
//     score (mọi entry đều cùng 0 điểm keyword, sort theo authority/specificity sẽ luôn đẩy entry
//     auto-sync lên trước bất kể mới/cũ) — giữ NGUYÊN thứ tự `entries` truyền vào, vốn caller NÊN đã
//     findAll({sortBy:'updated_at', order:'desc'}) trước khi filterActive, khớp đúng hành vi cũ của
//     shortlistMind: mới cập nhật nhất trước.
export function buildEvidencePack(scored, limit = 5) {
    const matched = scored.filter(s => s.keywordScore > 0)
    const pool = matched.length
        ? [...matched].sort((a, b) => b.score - a.score).slice(0, limit)
        : scored.slice(0, limit)
    return pool.map(({ m }) => ({
        text: m.text, refTable: m.refTable || '', refId: m.refId || '',
        version: m.version || '', authorityLevel: m.authorityLevel ?? null,
    }))
}

/**
 * Trọn pipeline filterActive -> scoreHybrid -> buildEvidencePack — dùng bởi
 * tools/sale-engine.js's shortlistMind. `entries` NÊN được findAll({sortBy:'updated_at',
 * order:'desc'}) trước khi truyền vào (giữ đúng fallback order của buildEvidencePack).
 */
export function retrieveMind(entries, message, { domain, queryDate, limit = 5 } = {}) {
    const active = filterActive(entries, { domain, queryDate })
    const scored = scoreHybrid(active, message)
    return buildEvidencePack(scored, limit)
}
