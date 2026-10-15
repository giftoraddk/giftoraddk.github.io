-- auth D1 (ALL_DB) — schema CHUẨN DUY NHẤT, idempotent. Không có thư mục migrations:
-- `scripts/d1-schema.mjs` (predev / deploy) chạy file này rồi tự ADD COLUMN cho cột DB còn thiếu.
-- Quy tắc sửa: mỗi cột 1 dòng; cột thêm sau phải có DEFAULT (SQLite không ADD được NOT NULL thiếu DEFAULT).
--
-- Document store cho mọi bảng nội dung của app (DB_ALL) — 1 bảng vật lý, `tbl` = tên bảng logic
-- (allowlist + quyền ở src/tables.ts). Field tuỳ biến nằm trong `doc` (JSON); 3 cột thời gian tách
-- riêng để lọc/soft-delete nhanh, không khai kiểu — giữ nguyên giá trị client gửi (ISO hoặc epoch-ms của pay).
-- Bảng logic mới chỉ cần thêm vào src/tables.ts, KHÔNG cần sửa file này.

CREATE TABLE IF NOT EXISTS docs (
  tbl        TEXT NOT NULL,
  id         TEXT NOT NULL,
  doc        TEXT NOT NULL DEFAULT '{}',
  created_at,
  updated_at,
  deleted_at,
  PRIMARY KEY (tbl, id)
);
CREATE INDEX IF NOT EXISTS docs_tbl_live ON docs (tbl, deleted_at);
