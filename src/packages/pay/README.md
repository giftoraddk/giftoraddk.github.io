- app: component con (`svc-pay-order/-booking/-customer/-valider/-processing/-delivery/-reason/-promo/-watch-paper`)
- service: xử lý dữ liệu + state (`service.js` — order tạm qua conductor, promote → invoice, listen invoice, promo, customer)
- tool: helper/constant thuần (`constant.js` — nhãn bước/lý do huỷ, `parseHandler`; `render.js` — fragment dùng chung)
- css: style cho các component

Ported từ astro-micro's `src/webs/pay/` (xem `hook/PAY.rst` bên đó). Khác biệt duy nhất về backend: invoice
đi qua `createService('invoices')` của `services/core/crud.js` → **D1 `ALL_DB` của auth** (astro-micro:
Firestore) — cùng API `set/update/findById/findAll/listen`, logic không đổi. D1 là document store nên không
cần khai cột; quyền ở `auth/worker/src/tables.ts` (tạo đơn phải đăng nhập, chỉ người mua / người bán / quản trị
đọc được đơn). `products.quantity` do Worker trừ/hoàn kho (nguyên tử phía server), client không tự gọi.

Components chính: `svc-cart` (giỏ + FAB), `svc-pay` (luồng thanh toán), `svc-pay-warden` (seller quản lý
đơn). Các `svc-pay-*`
còn lại (`app/`) là bước con của `svc-pay`/`svc-cart`/`svc-pay-watch`. Telegram báo đơn mới: Worker auth gửi lúc tạo invoice (`auth/worker/src/invoices.ts`, secret `TG_BOT_TOKEN` + `TG_CHAT_ID`,
thiếu thì bỏ qua). Luật ghi invoice (giá dựng lại từ products, bước người mua/bán, trừ/hoàn kho, mã khuyến mãi): `invoices.ts`.
Mua hàng bắt buộc đăng nhập: `<svc-pay loginRequired>` hiện `<svc-auth embedded>` khi chưa có `buyerId` (CoreShop gắn
`buyerId` = user đang đăng nhập). Mã khuyến mãi: bảng `promos` (trang /admin/promos/), `<svc-cart>` mặc định đọc qua
`serverPromos` (service.js) — Worker kiểm lại + cộng lượt dùng lúc tạo hoá đơn, `promoDiscount()` cùng công thức với Worker.
