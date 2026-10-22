// src/packages/llm/tool/sectors.js
//
// Thuần: mặt ngoài (id / tên nhóm / icon / màu) của các ngành và icon của 9 phòng — để node preset dựng nhóm AI-<Ngành>
// ngay khi trang mở, trước khi GET /v1/fn/sectors trả lời (khách chưa đăng nhập cũng thấy). KHÔNG có chuyên môn nào:
// prompt, bước, field chỉ nằm ở Worker (worker/src/fn/sectors/*.ts — thêm ngành ở đó thì thêm 1 dòng ở đây).

/**
 * Theo thứ tự nhóm trên canvas — khớp worker fn/sectors/index.ts SECTORS.
 * `released` chép lại cờ cùng tên của Worker (worker fn/sectors/<id>.ts) — CHỈ cho giao diện: node Tư vấn có mặt trước
 * khi /v1/fn/sectors trả lời, nên ngành chưa mở thì node đó hiện bảng "cần quyền" ngay thay vì để khách gặp lỗi 403
 * (page /system/<sector> mở cho mọi tài khoản đã đăng nhập ở chế độ thử — services/presets/node/sector.js `trial`).
 * Worker vẫn tự chặn mọi lời gọi; mở 1 ngành = đổi cả 2 nơi.
 */
export const SECTOR_FACES = [
    { id: 'ecommerce', released: true, title: { vi: 'AI-Ecommerce', en: 'AI-Ecommerce' }, icon: 'ri:shopping-bag-3-line', tints: ['primary', 'secondary'] },
    { id: 'education', released: true, title: { vi: 'AI-Education', en: 'AI-Education' }, icon: 'ri:graduation-cap-line', tints: ['info', 'primary'] },
    { id: 'fnb', released: true, title: { vi: 'AI-F&B', en: 'AI-F&B' }, icon: 'ri:restaurant-2-line', tints: ['warning', 'error'] },
    { id: 'healthcare', released: false, title: { vi: 'AI-Healthcare', en: 'AI-Healthcare' }, icon: 'ri:heart-pulse-line', tints: ['success', 'info'] },
    { id: 'realestate', released: false, title: { vi: 'AI-Real Estate', en: 'AI-Real Estate' }, icon: 'ri:building-2-line', tints: ['secondary', 'primary'] },
]

export const sectorFace = (id) => SECTOR_FACES.find((s) => s.id === id) ?? null

/** Icon mặc định của 1 phòng (khi admin chưa đặt ảnh đại diện) — theo key function của Worker. */
export const FN_ICONS = {
    strategy: 'ri:compass-3-line',
    product: 'ri:box-3-line',
    marketing: 'ri:megaphone-line',
    commercial: 'ri:hand-coin-line',
    operations: 'ri:settings-3-line',
    supply: 'ri:truck-line',
    quality: 'ri:shield-check-line',
    finance: 'ri:money-dollar-circle-line',
    technology: 'ri:cpu-line',
}

/** Icon Thư ký (trợ lý AI toàn doanh nghiệp — nhóm chat <svc-talk>): node trên canvas + tiêu đề panel. */
export const SECRETARY_ICON = 'ri:connector-line'

/** Icon Tư vấn(consult — trợ lý hỏi đáp từ kho tri thức): node trên canvas, FAB + avatar của <svc-aide>. */
export const CONSULT_ICON = 'ri:message-ai-3-line'

/** Icon 1 phòng ban —ảnh đại diện admin đặt (pics), else icon theo function. Node canvas và panel <svc-fn> cùng dùng. */
export const fnIcon = (f) => f?.pics || FN_ICONS[f?.fn] || 'ri:briefcase-line'
