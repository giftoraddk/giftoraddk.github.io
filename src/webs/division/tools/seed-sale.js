// src/webs/division/tools/seed-sale.js
//
// Seed 1 lần vào Firestore collection `divisions` (doc id 'sale') nếu doc đó chưa tồn tại — CHỈ để
// tái dùng field identity chung (title/description/pics/lang/ai) đã có sẵn UI chỉnh qua
// /admin/divisions (xem services/schemas/admin/divisions.js), KHÔNG dùng `meta.steps`/pipeline
// engine (tools/engine.js) như marketing/production — <svc-sale> là 1 lượt hỏi-đáp trực tiếp với
// khách (tools/sale-engine.js), không phải job nhiều bước.
//
// `hotline` — số hotline gắn kèm câu trả lời khi khách để lại số điện thoại (lead capture, xem
// tools/sale-engine.js's extractPhone + svc-sale.js's _dfSaveCustomer). Mặc định RỖNG cố ý — số
// hotline thật khác nhau theo từng site/tenant deploy codebase này (xem src/modules/shop/*.js,
// src/modules/landing/*.js — mỗi site 1 số riêng), không có 1 số "đúng" chung để tự seed sẵn; admin
// PHẢI tự điền qua /admin/divisions trước khi tính năng này hoạt động đầy đủ — để trống thì khách
// chỉ được báo "nhân viên sẽ liên hệ lại", không có gợi ý gọi ngay (không bịa số theo sales.md).
export const SALE_DIVISION_SEED = {
    title: 'Tư vấn & CSKH',
    description: 'Tư vấn sản phẩm, trả lời câu hỏi của khách vãng lai, hỗ trợ chốt đơn.',
    status: 'active',
    pics: '',
    lang: 'vi',
    ai: '',
    hotline: '+84934561501',
    meta: { kind: 'chat' },
}
