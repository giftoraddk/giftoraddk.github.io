// src/webs/division/tools/sale-engine.js
//
// Bộ não trả lời khách vãng lai của <svc-sale> — 1 lượt hỏi-đáp NHANH (gần giống tools/chatter.js),
// KHÔNG chạy pipeline nhiều bước như tools/engine.js (không hợp hội thoại trực tiếp, mỗi lượt cần
// trả lời NGAY). Implement Fetch Realtime Data của kiến trúc Hybrid Search mô tả ở
// hook/hybrid-search-product-assistant.md §21 — retrieval (keyword + metadata/temporal/authority)
// nay dùng chung `services/mind.js` (hook/firebase-multidomain-ai-rag-spec.md rút gọn — xem ghi chú
// đầu tools/mind-sync.js) thay vì tự đếm từ khoá thô ở đây. Vẫn KHÔNG có semantic/vector search —
// CORS chặn hoàn toàn request browser thẳng tới NVIDIA embedding (site static, không có backend để
// proxy). Persona/prompt cố tình viết NGẮN NHẤT có thể (mỗi từ đều tốn token mỗi lượt hỏi) — giữ
// đúng 2 nguyên tắc cốt lõi rút từ hook/sales.md: hiểu khách trước khi bán, không bịa ngoài dữ liệu
// thật.
//
// Lead capture: khách để lại số điện thoại (extractPhone() — regex, KHÔNG qua AI) -> svc-sale.js's
// _dfSaveCustomer() lưu vào collection `customers` (server 'llm', cùng project với `mind`) +
// trả lời kèm hotline cố định (division.hotline) — xem hook/SALE.rst.
import { createService } from '@/services/crud.js'
import { generateJsonWithRetry } from './engine.js'
import { retrieveMind } from '@/services/mind.js'
import { DOMAIN_SALE } from './mind-sync.js'

const LANG_NAMES = { vi: 'Vietnamese', en: 'English' }

const SALES_PERSONA = `You are a friendly, honest sales assistant on this store's storefront. Understand what the visitor needs before recommending anything. Use ONLY the KNOWLEDGE below — never invent products, prices, or stock. If it isn't covered, say so and ask a clarifying question instead of guessing. No pressure, no fake urgency.

IMPORTANT: When a product is out of stock (Stock: 0), instead of just saying it's out of stock, kindly ask the visitor to leave their phone number so we can contact them when it's back in stock, or suggest they call our hotline for more information. Be warm and helpful about it — this is an opportunity to keep the relationship going.`

// Bắt số điện thoại (lead capture — xem svc-sale.js's _dfSaveCustomer) — DETERMINISTIC regex trên
// tin nhắn THẬT của khách, KHÔNG để AI tự "đọc lại" số điện thoại (rủi ro model gõ nhầm 1 chữ số =
// gọi sai người, khác hẳn rủi ro chấp nhận được của customerName/topic bên dưới). Khách GLOBAL, không
// chỉ VN, nên 2 tier khác hẳn nhau về độ rộng:
//   1. Có dấu '+' (chuẩn quốc tế E.164, vd +1..., +44..., +81...) — tín hiệu RÕ RÀNG nhất khách đang
//      gõ số điện thoại bất kể quốc gia nào (hiếm khi '+' xuất hiện vì lý do khác trong 1 câu chat),
//      nên match RỘNG: 7-15 chữ số sau dấu '+' (E.164 quy định tối đa 15 chữ số).
//   2. KHÔNG có dấu '+' — không đủ tín hiệu biết quốc gia nào để nới lỏng an toàn (1 run số trần
//      8-13 chữ số sẽ dễ khớp nhầm giá tiền/mã đơn hàng khách nhắc trong câu), nên fallback THU HẸP
//      lại đúng format số di động VN (0 hoặc 84 + đầu số hợp lệ) — thị trường mặc định của storefront
//      này. Khách quốc tế KHÔNG gõ '+' sẽ không được bắt tự động ở fallback này; vẫn còn nguyên trong
//      tin nhắn `saleChats` để admin tự đọc lại.
// Bỏ khoảng trắng/dấu chấm/gạch ngang/ngoặc đơn trước khi so khớp (chấp nhận input kiểu
// "+84 91.234.5678" hay "091-234-5678") — đổi lại, số ở phần khác của câu (vd địa chỉ) có thể bị
// dính liền vào chuỗi số đem so khớp; chấp nhận được vì đây là tính năng HỖ TRỢ tốt nhất có thể
// (best-effort), không phải yêu cầu bắt buộc đúng 100% — tin nhắn gốc luôn còn nguyên trong
// `saleChats` để đối chiếu lại.
const _INTL_PATTERN = /\+\d{7,15}/
const _VN_PATTERN   = /(?:84|0)[35789]\d{8}/

export function extractPhone(text) {
    const cleaned = (text || '').replace(/[\s.\-()]/g, '')
    const intl = cleaned.match(_INTL_PATTERN)
    if (intl) return intl[0]
    const vn = cleaned.replace(/[^\d]/g, '').match(_VN_PATTERN)
    return vn ? vn[0] : ''
}

// Giá/tồn kho/khuyến mãi KHÔNG lưu trong `mind` (xem tools/mind-sync.js) — đổi liên tục nên phải
// đọc REALTIME thẳng từ refTable ngay trước khi trả lời (hook/hybrid-search-product-assistant.md's
// §12/§17: "Fetch realtime data", "mind là derived data"). Chỉ áp dụng cho entry có refTable ===
// 'products' (posts không có field thương mại) — entry nhập CSV ngoài (refTable rỗng) không có gì
// để fetch, `text` của nó đã tự gộp sẵn mọi thông tin tĩnh lúc import (buildExternalSearchText).
// Trả về bản SAO có `text` nối thêm — không ghi ngược lại `mind`.
async function _hydrateRealtime(entries) {
    const withRef = entries.filter(m => m.refTable === 'products' && m.refId)
    if (!withRef.length) return entries
    const svc = createService('products')
    const records = await Promise.all(withRef.map(m => svc.findById(m.refId).catch(() => null)))
    const byRefId = new Map(withRef.map((m, i) => [m.refId, records[i]]))
    return entries.map(m => {
        const r = byRefId.get(m.refId)
        if (!r) return m
        const bits = []
        const [price] = String(r.pricing || '').split('~')
        if (price && Number(price) > 0) bits.push(`Price: ${Number(price).toLocaleString('vi-VN')}đ`)
        const [discount, type] = String(r.promo || '').split('~')
        if (discount && Number(discount) > 0) bits.push(`Promo: ${type === 'percent' ? `${discount}%` : `${Number(discount).toLocaleString('vi-VN')}đ`} off`)
        if (r.quantity != null && r.quantity !== '') bits.push(`Stock: ${r.quantity}`)
        return bits.length ? { ...m, text: `${m.text}\n${bits.join(' | ')}` } : m
    })
}

// `hasPhone` (extractPhone() đã khớp trên tin nhắn thật, xem decideSaleReply) — CHỈ khi true mới
// thêm 2 field customerName/topic vào schema JSON yêu cầu, giữ prompt NGẮN NHẤT có thể ở mọi lượt
// hỏi bình thường (feedback_ai_json_prompt_length_limits: không dồn thêm field vào 1 JSON call
// không cần thiết). Dặn model KHÔNG tự nhắc hotline/hẹn liên hệ lại — svc-sale.js's _dfPostGuest tự
// nối thêm phần đó bằng template CỐ ĐỊNH (số hotline là 1 fact không được để AI tự "đọc" sai/quên).
function _buildSalePrompt(mindEntries, recentMessages, message, langName, hasPhone) {
    const knowledge = mindEntries.length ? mindEntries.map(m => m.text).join('\n---\n') : '(chưa có dữ liệu)'
    const history = recentMessages.map(m => `${m.author}: ${m.content}`).join('\n')
    const leadNote = hasPhone
        ? ` Khách vừa để lại số điện thoại trong tin nhắn này — hệ thống sẽ tự thêm phần hotline/hẹn liên hệ lại, bạn KHÔNG cần tự nhắc số hotline hay hẹn ngày giờ, chỉ cần xác nhận ngắn gọn đã ghi nhận. Trích thêm nếu khách CÓ nói rõ (để trống nếu không rõ): tên khách ("customerName"), và tóm tắt dưới 15 từ khách đang quan tâm gì ("topic").`
        : ''
    const shape = hasPhone
        ? `{"lang":"vi"|"en","reply":"...","wantsHuman":true|false,"customerName":"...","topic":"..."}`
        : `{"lang":"vi"|"en","reply":"...","wantsHuman":true|false}`
    const system = `${SALES_PERSONA}

KNOWLEDGE:
${knowledge}

Reply in ${langName} unless the visitor's message is clearly a different language — match theirs. wantsHuman=true ONLY if they want a real person (custom deal, complaint, explicitly ask) — else false.${leadNote}

Return ONLY this JSON, first char "{", nothing before/after:
${shape}`
    const user = history ? `History:\n${history}\n\nVisitor: ${message}` : `Visitor: ${message}`
    return { system, user }
}

/**
 * 1 lượt hỏi-đáp — trả lời dựa trên `mindEntries` ĐÃ shortlist sẵn (xem shortlistMind). Tự hydrate
 * field realtime (giá/tồn kho/khuyến mãi) cho entry có refTable trước khi build prompt. `phone`
 * (optional — kết quả extractPhone() gọi TRƯỚC ở svc-sale.js trên tin nhắn thật, không tính lại ở
 * đây) — khác rỗng thì mở rộng schema JSON xin thêm customerName/topic cho lead capture.
 */
export async function decideSaleReply(ai, mindEntries, recentMessages, message, fallbackLang = 'vi', phone = '') {
    const langName = LANG_NAMES[fallbackLang] || 'Vietnamese'
    const hydrated = await _hydrateRealtime(mindEntries)
    const { system, user } = _buildSalePrompt(hydrated, recentMessages, message, langName, !!phone)
    // maxTokens 400 (từng giảm từ 700 để tiết kiệm token) bị chứng minh KHÔNG đủ trên live: 1 model
    // trả lời thật (liệt kê vài sản phẩm bằng tiếng Việt) bị cắt cụt giữa chuỗi JSON ở ~180 ký tự,
    // khiến _parseJsonObject báo lỗi "Unterminated string" dù model đã trả lời đúng — 1 JSON hỏng do
    // hết token quan trọng hơn hẳn phần token tiết kiệm được, revert về 700.
    const obj = await generateJsonWithRetry(ai, {
        system, user, maxTokens: 700, temperature: 0.7,
        languageName: langName, errMessage: 'invalid sale response',
    })
    return {
        lang: typeof obj.lang === 'string' ? obj.lang.trim().toLowerCase() : '',
        reply: typeof obj.reply === 'string' ? obj.reply.trim() : '',
        wantsHuman: !!obj.wantsHuman,
        customerName: typeof obj.customerName === 'string' ? obj.customerName.trim() : '',
        topic: typeof obj.topic === 'string' ? obj.topic.trim() : '',
    }
}

// Shortlist tối đa `limit` entry — nay chỉ là 1 lệnh gọi vào services/mind.js's retrieveMind
// (filterActive: metadata/temporal -> scoreHybrid: keyword+authority+specificity ->
// buildEvidencePack), scope theo DOMAIN_SALE. `entries` NÊN được gọi nơi truyền vào đã
// findAll({ sortBy: 'updated_at', order: 'desc' }) — giữ đúng fallback "mới cập nhật nhất trước"
// khi câu hỏi không khớp từ khoá nào (xem retrieveMind/buildEvidencePack).
export function shortlistMind(entries, message, limit = 5) {
    return retrieveMind(entries, message, { domain: DOMAIN_SALE, limit })
}
