- service: gọi `/v1/billing/*` của auth (`billing.checkout/activate/subscription/cancel` + quản trị `all/syncFor/cancelFor`) + `loadPayPal()`
  (nạp PayPal JS SDK `vault=true&intent=subscription` từ paypal.com — không bundle)
- tool: `plans.js` (**config gói** — nguồn duy nhất cho bảng giá VÀ kiểm tra plan phía worker), `billing.js`
  (PayPal subscription/plan → bản ghi `billing/{userId}`, dùng chung với worker), `format.js` (tiền/ngày/đa ngôn ngữ)
- css: style cho các component (chỉ `--color-*`)

Spec + Thứ tự làm + Setup: `hook/PURCHASE.rst`. Server: `src/packages/auth/worker/src/billing.ts`.

Components:
- `svc-purchase-plans` — **mua theo gói**: 1 tab Tháng / Năm chung cho mọi thẻ (như bảng giá trang `/system`), thẻ
  **Miễn phí** (`PURCHASE.free` — không giá, không checkout; nút phát `plan-free` cancelable, không ai chặn thì mở
  `free-href`, mặc định `/system/ecommerce`) rồi thẻ giá từ `tool/plans.js` (ánh sáng theo cặp màu theme của gói, tab
  "Tiết kiệm %" khi chọn năm, mục "Giới hạn gói" nếu có `limits`, tính năng theo nhóm có icon nếu có `groups`, nút nổi
  bật với `featured`), badge gói hiện tại + "Quản lý gói". Chọn gói / quản lý → phát `plan-select` / `plan-manage` (cancelable, `detail.intent`);
  không ai chặn thì gán `intent` cho `<svc-purchase id="{checkout}">`. Nhúng được trong mọi shadow root.
- `svc-purchase` — **panel thanh toán**, điều khiển bằng 1 prop `intent`: `null` (chưa chọn gói) · `'manage'`
  (gói hiện tại, huỷ, link PayPal) · `{ planId, interval }` (tóm tắt từ Billing Plan PayPal + nút "Subscribe").
  Chưa đăng nhập → `svc-auth embedded guestOk`. **Phải nằm ở light DOM của document** (PayPal SDK không render
  trong shadow root): đặt thẳng trong trang, hoặc làm overlay `light: true` của `svc-node`.
  Events: `purchase-open`, `purchase-complete`, `purchase-cancel`, `purchase-pick`, `subscription-change`.
- `svc-purchase-manager` — thay `svc-purchase-complete`, 2 chế độ (`mode`, bỏ trống = theo URL):
  `complete` = khi PayPal chuyển cả trang về `return_url` / `cancel_url` (`/system/pricing?subscription_id=…`) thay vì popup,
  xác nhận subscription qua worker; `manage` = quản lý tổng quát mọi gói user đã mua (KPI, cơ cấu theo gói,
  lọc/tìm, đồng bộ / mở trên PayPal / huỷ) — quyền resource `billing` (`hook/AUTH_V2.rst`), worker
  `GET /v1/billing/all`, `POST /v1/billing/sync|cancel/:userId`. Không có quyền đó → **Gói của tôi** (gói của
  chính người mua qua `subscription`/`activate`/`cancel`, chưa mua → "Xem các gói" = `purchase-pick`). Mobile first.

Trang: `/system/pricing` — trang mua gói duy nhất (AI Operations): bảng giá + thanh toán + "Gói của bạn" (tự sang
`complete` khi PayPal chuyển về) + `<svc-account>` nổi; `?plan=<id>[&interval=]` mở sẵn thanh toán — nút "Chọn …" ở
trang chủ `/` dẫn tới đây. Demo trong canvas node:
`src/pages/system/app.astro` (node Plans → group Purchase System: Checkout + Quản lý gói — `src/services/presets/node/purchase.js`).
