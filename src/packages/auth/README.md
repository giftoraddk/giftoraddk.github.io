- app: component con (`svc-profile` của `svc-account`, `svc-diffs` của `svc-resources`)
- service: chứa xử lý dữ liệu cũng như state cho component (session cache — `auth.get/set/clear`, `triggerRebuild` gọi build-hook)
- tool: chứa các helper, constant, other (`parseRoles`/`hasAccess` + phân quyền v2 `LEVELS`/`can`/
  `tableAccess`/`withTableAccess`/`TABLE_BUNDLES` trong `roles.js`, `topic-groups.json` cho svc-assist)
- css: chứa style cho các component
- worker: Cloudflare Worker riêng — `/v1/data/profiles[/:id]` proxy bảng Supabase `profiles` (service role
  key phía server, tự verify Supabase JWT + tự enforce self-edit rules) + `/v1/data/:table` cho mọi bảng
  nội dung trên D1 `ALL_DB` (document store — `db/schema.sql`, tự đồng bộ khi dev/deploy qua `scripts/d1-schema.mjs`; quyền ở `src/tables.ts`). Clone từ
  astro-micro's `worker/packages/db-worker`'s nhánh 'DB_ACC' (phần Firestore không port — repo này
  không dùng Firestore). Chạy độc lập giống `packages/llm/worker` (không dùng workspace chung):
  `cd src/packages/auth/worker && pnpm install && pnpm dev` (port 8787, xem `PUBLIC_AUTH_URL`
  trong `.env`).

Backend dữ liệu: component gọi `createService(table, '', server)` (`src/services/core/crud.js`) —
`server` rỗng/`'DB_ALL'` = D1 của auth, `'DB_ACC'` = auth (`profiles`), `'DB_LLMD1'` = llm
(D1). Adapter nằm ở `src/services/core/worker-adapter.js`; Supabase chỉ còn làm Auth.

Components:
- `svc-auth` — đăng nhập (email trước → mật khẩu) + đăng ký (họ tên tuỳ chọn, email, mật khẩu; màn
  "kiểm tra email" nếu Supabase bật xác minh) + Google, qua Supabase Auth, không background. Dùng độc lập
  (redirect tới `pathLink`) hoặc `embedded` (phát `login-success`, dùng bởi `svc-account`). Props: `mode`
  ('signin'|'signup'), `brand`/`logo`, `guestOk`, `hideSignup` (cổng admin).
- `app/svc-profile` — panel tài khoản đã đăng nhập, gồm nhiều màn đổi tại chỗ: trang chính (avatar, thống kê,
  menu), Hồ sơ (hồ sơ · email · tài khoản liên kết · quyền · thiết bị), Chỉnh sửa hồ sơ (đổi avatar/tên/email/
  mật khẩu + gửi email đặt lại mật khẩu), Ngôn ngữ, Cài đặt (thông báo, đăng xuất thiết bị khác, đăng xuất).
  Thao tác dữ liệu ở `service/profile.js`; thiết bị do từng trình duyệt tự ghi vào `profiles.meta.devices`
  (Supabase không cho client liệt kê session). Không tự đổi theme/lang — phát `theme-select`/`lang-select`.
- `svc-account` — gộp cả 2: tự kiểm tra session, hiện `svc-auth` hoặc `svc-profile` tương ứng. Áp dụng
  theme/lang lên `<html>` + cookie rồi phát `theme-change`/`lang-change`; phát `account-change` { user } mỗi
  khi user đổi (preset `account` của packages/node dùng để đặt avatar lên node `account`). Mọi tài khoản active đều đăng nhập được
  (`guestOk` mặc định `true`, kể cả `roles: 'user'`) — quyền riêng do panel cần nó tự chặn (node `roles`).
- `svc-roles` — phân quyền v2 (chỉ Super Admin, `hook/AUTH_V2.rst`): mỗi user × bảng chọn Level
  (Xem/Biên tập/Duyệt/Xuất bản/Quản trị) + Scope (Của mình/Tất cả), ghi `profiles.roles` qua auth.
  Mobile first; panel của node `roles` (group System) (cũng là trang /admin/roles) hoặc `fab` = nút nổi + màn full.
- `svc-resources` — bảng quản trị CRUD cho 1 `dataTable` (web-table): thêm/sửa/xoá mềm, sắp xếp, CSV
  import/export, mở `svc-diffs`/`svc-marketing`/`svc-production`. Schema cột ở
  `src/services/presets/admin/*.js`.
- `app/svc-diffs` — lịch sử chỉnh sửa (bảng `revisions` trên D1 của auth): `svc-resources` gọi
  `capture()` sau mỗi lần tạo / sửa / xoá / khôi phục thành công. So với bản trước hoặc bản hiện tại,
  khôi phục phiên bản (`manage_versions`), mobile first (danh sách → chi tiết, từ 760px chia 2 cột).
- `svc-assist` — trợ lý AI điền nhanh 1 record (`assist:fields`) hoặc tạo nhiều record
  (`assist:records`) theo schema của `svc-resources`; không tự ghi DB.
