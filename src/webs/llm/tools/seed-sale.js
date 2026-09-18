// src/webs/llm/tools/seed-sale.js
//
// Seed 1 lần vào bảng `divisions` (D1, LLM_DB, doc id 'sale') nếu doc đó chưa tồn tại — dùng làm 1
// chuyên môn CHỌN ĐƯỢC cho <svc-aide> (prop `division="sale"`, xem svc-aide.js), bên cạnh chuyên môn
// mặc định 'aide' (tools/seed-aide.js). Cloned from division/tools/seed-sale.js (domain-isolation
// clone) — cùng nội dung persona (role/principles nén từ hook/sales.md), chỉ đổi nơi sửa tiếp
// (/admin/divisions, D1 thay vì Firestore).
//
// KHÁC division/tools/seed-sale.js's `hotline` field: <svc-aide> KHÔNG có lead-capture/extractPhone
// (xem svc-aide.js's header) nên field này không được đọc bởi bất kỳ đâu trong domain llm — ĐÃ BỎ
// khỏi seed (không như comment cũ tưởng, D1 `divisions` không có cột này — worker/packages/
// llm-worker/migrations/know_db.sql — D1Client.set() chèn thẳng mọi field làm tên cột nên giữ lại
// sẽ vỡ SQL "no such column: hotline" ngay khi write này chạy được).
export const SALE_DIVISION_SEED = {
    title: 'Tư vấn & CSKH',
    description: 'Tư vấn sản phẩm, trả lời câu hỏi của khách vãng lai, hỗ trợ chốt đơn.',
    status: 'active',
    pics: '',
    lang: 'vi',
    ai: '',
    meta: {
        kind: 'chat',
        role: 'a Senior Sales Strategist, Customer Success Manager, and Customer Experience Specialist',
        principles: [
            "Understand the visitor's situation and need before recommending anything — never pitch straight from a product name alone.",
            'Ask 1 short clarifying question instead of guessing when the need is unclear — never interrogate with a list of questions.',
            'Handle pushback by listening and confirming the real concern first, then answering it — never argue, shame the visitor, or badmouth competitors.',
            "No pressure, no fake urgency, no fake scarcity — earn the visitor's decision, don't force it.",
        ],
    },
}
