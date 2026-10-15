-- llm D1 (LLM_DB) — schema CHUẨN DUY NHẤT, idempotent. Không có thư mục migrations:
-- `scripts/d1-schema.mjs` (predev / deploy) chạy file này rồi tự ADD COLUMN cho cột DB còn thiếu.
-- Quy tắc sửa: mỗi cột 1 dòng; cột thêm sau phải có DEFAULT (SQLite không ADD được NOT NULL thiếu DEFAULT).
-- Tên cột = tên field JS (kể cả "from"/"index" — d1.ts luôn quote identifier).
-- Cuối file: nâng cấp dữ liệu cũ — mỗi câu chỉ chạm dòng còn ở dạng cũ, nên chạy lại mỗi lần cũng không đổi gì.

CREATE TABLE IF NOT EXISTS divisions (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'active',
  pics         TEXT NOT NULL DEFAULT '',
  lang         TEXT NOT NULL DEFAULT 'vi',
  ai           TEXT NOT NULL DEFAULT '',
  meta         TEXT NOT NULL DEFAULT '{}',   -- JSON: override PATCH over fn/base + fn/sectors (mergeSpec) — private, never sent to guests
  "index"      INTEGER NOT NULL DEFAULT 0,
  sector       TEXT NOT NULL DEFAULT '',     -- '' = legacy row (pre-sector ids 'marketing'…); else a fn/sectors/*.ts id
  fn           TEXT NOT NULL DEFAULT '',     -- fn/types.ts FnKey
  owner        TEXT NOT NULL DEFAULT '',     -- '' = platform override; hub id = that customer's own; '@<host>' = 1 site của nền tảng (svc-aide site="…")
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_divisions_status     ON divisions(status);
CREATE INDEX IF NOT EXISTS idx_divisions_deleted_at ON divisions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_divisions_scope ON divisions(owner, sector, fn);

CREATE TABLE IF NOT EXISTS talks (
  id               TEXT PRIMARY KEY,
  kind             TEXT NOT NULL,             -- 'chat' | 'job'
  "from"           TEXT NOT NULL DEFAULT '',
  content          TEXT NOT NULL DEFAULT '',
  division         TEXT NOT NULL DEFAULT '',
  topic            TEXT NOT NULL DEFAULT '',
  language         TEXT NOT NULL DEFAULT '',
  colors           TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT '',
  error            TEXT NOT NULL DEFAULT '',
  fields           TEXT NOT NULL DEFAULT '{}', -- JSON flat bag
  approved         INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  createdPostId    TEXT NOT NULL DEFAULT '',
  imageChoice      TEXT NOT NULL DEFAULT '',
  pausedStepId     TEXT NOT NULL DEFAULT '',
  waitingOnJobId   TEXT NOT NULL DEFAULT '',
  resumed          INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  targetTable      TEXT NOT NULL DEFAULT '',   -- cũ: job giao từ 1 bản ghi (đã bỏ) — không ghi nữa, giữ cột (không xoá cột)
  targetId         TEXT NOT NULL DEFAULT '',
  targetServer     TEXT NOT NULL DEFAULT '',
  owner            TEXT NOT NULL DEFAULT '',   -- '' = platform (admin / talks.*); hub id = that customer — set by the Worker from the JWT
  user_id          TEXT NOT NULL DEFAULT '',   -- the signed-in account that wrote it (JWT) — every read is that account's own rows
  sector           TEXT NOT NULL DEFAULT '',
  task             TEXT NOT NULL DEFAULT '',   -- groups the jobs + artifacts of one sector+topic run (Phase 3)
  reviewed         INTEGER NOT NULL DEFAULT -1, -- index of the last step the boss let the job move past (fn/state.ts jobState)
  trial            INTEGER NOT NULL DEFAULT 0,  -- boolean 0/1 — a trial job (fn/trial.ts), set once at creation, never changed
  calls            TEXT NOT NULL DEFAULT '',    -- trial job: '|<stepId>:<callKey>|' calls already run — each runs once (no regenerate)
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_talks_created_at      ON talks(created_at);
CREATE INDEX IF NOT EXISTS idx_talks_kind            ON talks(kind);
CREATE INDEX IF NOT EXISTS idx_talks_division_status ON talks(division, status);
CREATE INDEX IF NOT EXISTS idx_talks_deleted_at      ON talks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_talks_scope ON talks(owner, sector, created_at);
CREATE INDEX IF NOT EXISTS idx_talks_owner_kind ON talks(owner, kind, created_at); -- fn/jobs.ts assertJobQuota's COUNT(*)
CREATE INDEX IF NOT EXISTS idx_talks_task ON talks(owner, task); -- fn/tasks.ts: one task's jobs
CREATE INDEX IF NOT EXISTS idx_talks_user ON talks(owner, user_id, sector, created_at); -- routes.ts listLog: one account's log
-- Giữ 30 ngày (fn/retention.ts): cron mỗi ngày xoá chat/job cũ hơn + bàn giao của task đã hết hạn — idx_talks_created_at.

-- Kiến thức ĐỘC LẬP: bản sao tự đủ nội dung, không khoá ngoại/tham chiếu tới bảng nào khác — trợ lý chỉ
-- trả lời từ chính các dòng này. `owner` = hubs.id của người sở hữu ('' = kiến thức chung của nền tảng);
-- `source` = URL API đã nạp ra dòng này ('' = nhập tay / đồng bộ nội bộ).
CREATE TABLE IF NOT EXISTS know (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  meta        TEXT NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'active',
  owner       TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT '',
  sector      TEXT NOT NULL DEFAULT '',      -- '' = every sector
  fn          TEXT NOT NULL DEFAULT '',      -- '' = every department; else fn/types.ts FnKey
  tags        TEXT NOT NULL DEFAULT '',      -- tag chuẩn hoá "a,b" (thường, không dấu cách thừa) — FTS + rel không phải parse meta
  hash        TEXT NOT NULL DEFAULT '',      -- SHA-256(type|title|description|tags) lúc index — trùng thì bỏ qua embed lại
  chunks      INTEGER NOT NULL DEFAULT 0,    -- số đoạn trong know_chunks
  embedded_at TEXT NOT NULL DEFAULT '',      -- '' = chưa index theo cơ chế chunk (cần /v1/hubs/reindex)
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_know_owner_type ON know(owner, type);
CREATE INDEX IF NOT EXISTS idx_know_embedded   ON know(owner, embedded_at);
CREATE INDEX IF NOT EXISTS idx_know_type       ON know(type);
CREATE INDEX IF NOT EXISTS idx_know_status     ON know(status);
CREATE INDEX IF NOT EXISTS idx_know_deleted_at ON know(deleted_at);
CREATE INDEX IF NOT EXISTS idx_know_scope ON know(owner, sector, fn);

-- Surrogate id + soft-delete như 3 bảng trên; khoá tự nhiên (from_id, to_id, type) giữ bằng UNIQUE.
CREATE TABLE IF NOT EXISTS rel (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  type       TEXT NOT NULL,
  meta       TEXT NOT NULL DEFAULT '{}',
  owner      TEXT NOT NULL DEFAULT '',        -- cùng owner với 2 dòng know nó nối (không nối chéo owner)
  weight     REAL NOT NULL DEFAULT 1,         -- độ liên quan (vd số tag chung) — search mở rộng theo cạnh nặng trước
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (from_id, to_id, type),
  FOREIGN KEY (from_id) REFERENCES know(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id)   REFERENCES know(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rel_from       ON rel(from_id);
CREATE INDEX IF NOT EXISTS idx_rel_to         ON rel(to_id);
CREATE INDEX IF NOT EXISTS idx_rel_type       ON rel(type);
CREATE INDEX IF NOT EXISTS idx_rel_deleted_at ON rel(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rel_owner      ON rel(owner);

-- Đoạn (chunk) của 1 dòng know — đơn vị tìm kiếm: mỗi đoạn ~900 ký tự có 1 vector (Vectorize, namespace =
-- owner) + 1 dòng FTS5 (know_fts, rowid = seq). Trả lời chỉ nạp các đoạn khớp vào prompt, không cả bài.
-- Dữ liệu dẫn xuất: worker/src/vectorize.ts's syncKnowIndex() dựng lại từ know bất cứ lúc nào.
-- id ngắn (hash(know_id)_idx, ≤ 64 byte) — cũng là id vector (Vectorize giới hạn id 64 byte).
CREATE TABLE IF NOT EXISTS know_chunks (
  seq        INTEGER PRIMARY KEY,
  id         TEXT NOT NULL UNIQUE,
  know_id    TEXT NOT NULL,
  owner      TEXT NOT NULL DEFAULT '',
  idx        INTEGER NOT NULL DEFAULT 0,
  text       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_know_chunks_know  ON know_chunks(know_id);
CREATE INDEX IF NOT EXISTS idx_know_chunks_owner ON know_chunks(owner);

-- Tìm theo từ khoá (mã SKU, "Điều 12", tên riêng… — thứ semantic search hay trượt), gộp với vector bằng RRF
-- trong search.ts. Văn bản đã bỏ dấu tiếng Việt (vectorize.ts's foldText) cả lúc ghi lẫn lúc hỏi.
-- Lưu ý: `wrangler d1 export` không xuất được virtual table — dựng lại bằng /v1/hubs/reindex.
CREATE VIRTUAL TABLE IF NOT EXISTS know_fts USING fts5(title, text, tags, tokenize = 'unicode61');

-- Hub = 1 khách đã mua gói: thông tin thanh toán (bản chụp từ auth /v1/billing/subscription lúc cấp /
-- làm mới) + MCP token để nạp kiến thức qua /mcp (xem worker/src/hubs.ts, hook/MCP.rst). id = Supabase user id,
-- cũng là know.owner của mọi kiến thức hub này nạp. Token KHÔNG lưu thô: chỉ SHA-256 (token_hash) + 4 ký tự
-- cuối (token_hint) để nhận diện; bản thô chỉ nằm trong email + phản hồi lúc cấp.
CREATE TABLE IF NOT EXISTS hubs (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL DEFAULT '',
  display_name        TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'revoked'
  plan_id             TEXT NOT NULL DEFAULT '',
  plan_interval       TEXT NOT NULL DEFAULT '',         -- 'month' | 'year'
  billing_status      TEXT NOT NULL DEFAULT '',         -- PayPal subscription status, lowercase
  subscription_id     TEXT NOT NULL DEFAULT '',
  payer_id            TEXT NOT NULL DEFAULT '',
  trial_end           INTEGER NOT NULL DEFAULT 0,       -- unix giây, 0 = không dùng thử
  current_period_end  INTEGER NOT NULL DEFAULT 0,       -- unix giây — /mcp từ chối khi đã quá hạn (+ ân hạn)
  billing_synced_at   TEXT NOT NULL DEFAULT '',
  token_hash          TEXT NOT NULL DEFAULT '',
  token_hint          TEXT NOT NULL DEFAULT '',
  token_issued_at     TEXT NOT NULL DEFAULT '',
  token_used_at       TEXT NOT NULL DEFAULT '',
  email_sent_at       TEXT NOT NULL DEFAULT '',
  email_error         TEXT NOT NULL DEFAULT '',
  meta                TEXT NOT NULL DEFAULT '{}',       -- JSON: { sources: [{ id, url, type, itemsPath, fields, last_import_at, last_count }] }
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_hubs_token_hash ON hubs(token_hash);
CREATE INDEX IF NOT EXISTS idx_hubs_status     ON hubs(status);
CREATE INDEX IF NOT EXISTS idx_hubs_deleted_at ON hubs(deleted_at);

-- Handoff giữa các phòng ban (spec §17) — 1 dòng = 1 phiên bản; bản mới SUPERSEDED bản cũ cùng (task, kind), không
-- bao giờ ghi đè (§42). Chỉ đi qua /v1/fn/* (owner kiểm ở Worker), route /v1/data chỉ admin ĐỌC,
-- không ai ghi (tablePolicy write: 'none') — chỉ fn/tasks.ts ghi.
CREATE TABLE IF NOT EXISTS artifacts (
  id          TEXT PRIMARY KEY,
  task        TEXT NOT NULL,
  owner       TEXT NOT NULL DEFAULT '',
  sector      TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL,                  -- vd 'product.value' — FnSpec.produces[].kind
  source_fn   TEXT NOT NULL DEFAULT '',
  dest_fns    TEXT NOT NULL DEFAULT '',       -- 'marketing|commercial'
  job_id      TEXT NOT NULL DEFAULT '',
  version     INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT | READY_FOR_REVIEW | APPROVED | BLOCKED | REQUIRES_VERIFICATION | SUPERSEDED
  data        TEXT NOT NULL DEFAULT '{}',     -- JSON envelope §17: objective, decisions, requirements, assumptions[{text,tag}], mỗi mục list {text,tag}, created_by…
  depends_on  TEXT NOT NULL DEFAULT '',       -- '|' artifact ids it was built from
  supersedes  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_artifacts_task       ON artifacts(task, kind);
CREATE INDEX IF NOT EXISTS idx_artifacts_scope      ON artifacts(owner, sector, kind);
CREATE INDEX IF NOT EXISTS idx_artifacts_deleted_at ON artifacts(deleted_at);
-- 1 phiên bản / (owner, task, kind): 2 lần duyệt đua nhau cùng kind thì batch thứ 2 hỏng cả khối thay vì rẽ nhánh
-- phiên bản (P3-8, fn/tasks.ts writeArtifacts → 409). Trùng lặp có sẵn phải dọn TRƯỚC deploy (runbook Task 19).
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_version ON artifacts(owner, task, kind, version);

-- Lượt dùng thử (fn/trial.ts) — 1 dòng / (tài khoản, ngành, ô): ô = 'task' | <fn> (job lẻ của phòng đó) | 'chat' | 'log'.
-- `used` tăng nguyên tử tới trần của ô (INSERT … ON CONFLICT … WHERE used < trần). KHÔNG soft-delete và cron retention
-- không xoá — "1 lần" là 1 lần vĩnh viễn. Không có trong tablePolicy: /v1/data không đọc/ghi được, chỉ /v1/fn/*.
CREATE TABLE IF NOT EXISTS trials (
  user_id     TEXT NOT NULL,
  sector      TEXT NOT NULL,
  slot        TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, sector, slot)
);

-- ─── Nâng cấp dữ liệu cũ ──────────────────────────────────────────────────────────────────────────────────────────
-- Thay cho các runbook chạy tay trước đây (phase2-migrate, phase2-retire-legacy, phase3-migrate). d1-schema.mjs áp
-- đoạn này SAU khi đã ADD COLUMN (sector, reviewed, task… luôn có), và `deploy` chạy nó NGAY TRƯỚC `wrangler deploy`
-- — đúng thứ tự Worker mới cần. Điều kiện của từng câu là "dòng còn ở dạng cũ", thứ code hiện tại không bao giờ ghi
-- ra (mọi job/chat đều có sector; không còn status waiting_product; task chỉ sinh cùng job Thư ký của nó) — vì
-- vậy DB mới / DB đã nâng cấp chạy lại bao nhiêu lần cũng không đổi gì. Thứ tự các câu là bắt buộc.

-- Phase 2.1 — `reviewed` chưa có ở job cũ: mọi bước trước bước đang mở/tạm dừng coi như đã duyệt qua. Step id
-- đánh từ 1 liên tiếp (index = id - 1) nên reviewed = index bước trước = id - 2; job xong = 99 (qua bước cuối).
-- Chạy TRƯỚC 2.2: chỉ còn lúc này mới nhận ra job cũ (sector = '').
UPDATE talks SET reviewed = CASE
    WHEN status = 'done' THEN 99
    WHEN status = 'awaiting_review' AND pausedStepId != '' THEN CAST(pausedStepId AS INTEGER) - 2
    WHEN status LIKE 'step%' THEN CAST(substr(status, 5) AS INTEGER) - 2
    ELSE -1 END
WHERE kind = 'job' AND sector = '' AND owner = '' AND reviewed = -1;

-- Phase 2.2 — chat + job trước khi có sector → ngành e-commerce của nền tảng, id phòng ban chuẩn.
UPDATE talks SET
  sector = 'ecommerce',
  division = CASE division
    WHEN 'production' THEN 'ecommerce.product' WHEN 'marketing' THEN 'ecommerce.marketing'
    WHEN 'finance' THEN 'ecommerce.finance' WHEN 'sale' THEN 'ecommerce.consult' WHEN 'aide' THEN 'ecommerce.consult'
    ELSE division END,
  "from" = CASE "from"
    WHEN 'production' THEN 'ecommerce.product' WHEN 'marketing' THEN 'ecommerce.marketing'
    WHEN 'finance' THEN 'ecommerce.finance' WHEN 'sale' THEN 'ecommerce.consult' WHEN 'aide' THEN 'ecommerce.consult'
    ELSE "from" END
WHERE sector = '' AND owner = '';

-- Phase 2.3 — 1 dòng face nền tảng cho mỗi phòng e-commerce ('<sector>.<fn>', owner ''), chép face của dòng cũ.
-- meta rỗng: base spec trong code Worker (fn/base/*.ts) CHÍNH LÀ seed cũ; ai = '' (S3). Consult lấy dòng 'sale' trước,
-- 'aide' chỉ điền khi không có 'sale'. Dòng mới đã có (kể cả đã sửa / đã xoá mềm) thì giữ nguyên.
INSERT INTO divisions (id, title, description, status, pics, lang, ai, meta, "index", sector, fn, owner, created_at, updated_at, deleted_at)
  SELECT 'ecommerce.' || m.fn, d.title, d.description, d.status, d.pics, d.lang, '', '{}', d."index", 'ecommerce', m.fn, '',
         d.created_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
  FROM divisions d
  JOIN (SELECT 'production' AS legacy, 'product' AS fn
        UNION ALL SELECT 'marketing', 'marketing'
        UNION ALL SELECT 'finance', 'finance'
        UNION ALL SELECT 'sale', 'consult'
        UNION ALL SELECT 'aide', 'consult') m ON m.legacy = d.id
  WHERE d.sector = '' AND d.deleted_at IS NULL
    AND NOT (d.id = 'aide' AND EXISTS (SELECT 1 FROM divisions s WHERE s.id = 'sale' AND s.sector = '' AND s.deleted_at IS NULL))
  ON CONFLICT(id) DO NOTHING;

-- Phase 2.4 — xoá mềm các dòng phòng ban cũ (đã chép ở 2.3). Khôi phục: đặt deleted_at về NULL.
UPDATE divisions SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN ('production', 'marketing', 'finance', 'sale', 'aide') AND sector = '' AND deleted_at IS NULL;

-- Phase 3.1 — job còn ngủ ở waiting_product: job sản phẩm nó chờ chưa từng được duyệt, và Worker mới không đánh thức
-- nữa. Thành job bị gián đoạn thường kèm lời giải thích: chat hiện ⚠️ + Thử lại (chạy ngay, không có bối cảnh sản
-- phẩm); nhắn lại cả nhóm thì chạy theo cách mới, thành 1 task.
UPDATE talks SET
  status = 'queued',
  error = 'Việc này chờ phòng Sản phẩm theo cách cũ — cách đó đã bỏ. Bấm Thử lại để chạy ngay, hoặc nhắn lại cả nhóm để chạy theo kế hoạch mới.',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE kind = 'job' AND status = 'waiting_product' AND deleted_at IS NULL;

-- Phase 3.2 — giá trị `task` không do /v1/fn/tasks tạo (Phase 1–2 lưu `task` của body không kiểm, P3-1). Task thật
-- luôn sinh cùng job Thư ký của nó (fn/tasks.ts), nên task id không có job Thư ký nào — kể cả đã xoá mềm — là giả.
-- Task kiểu cũ (mở bằng job context, trước Thư ký) cũng rơi vào đây: job của nó thành job lẻ, không còn task.
UPDATE talks SET task = ''
WHERE task != '' AND task NOT IN (
  SELECT task FROM talks WHERE kind = 'job' AND division LIKE '%.secretary' AND task != ''
);

-- Thư ký — Điều phối + Phân tích bối cảnh + Phân công gộp thành 1 function `secretary`. Task cũ không mở tiếp được
-- (3.2 vừa tách nó khỏi task): bỏ job context/router của nó + bàn giao không còn job nào cùng task (cron
-- fn/retention.ts cũng dọn đúng loại này). Job của các phòng ban giữ lại như job lẻ.
DELETE FROM talks WHERE kind = 'job' AND (division LIKE '%.context' OR division LIKE '%.router');
DELETE FROM artifacts WHERE NOT EXISTS (SELECT 1 FROM talks t WHERE t.owner = artifacts.owner AND t.task = artifacts.task);
-- Câu chat của Điều phối → Thư ký (cùng 1 người trong nhóm chat).
UPDATE talks SET "from" = substr("from", 1, length("from") - length('coordinator')) || 'secretary'
WHERE kind = 'chat' AND "from" LIKE '%.coordinator';
-- Face / override của 3 function đã bỏ — xoá mềm. Khôi phục: đặt deleted_at về NULL.
UPDATE divisions SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE fn IN ('coordinator', 'context', 'router') AND deleted_at IS NULL;

-- Bỏ nhãn — không field nào còn gắn [FACT]/[INFERENCE]/[HYPOTHESIS] (artifacts.ts stripTags). Nhãn code cũ ghi luôn ở
-- dạng chuẩn "[TAG] " nên replace() gỡ hết; bàn giao bỏ luôn bộ đếm `tags` trong envelope.
UPDATE talks SET fields = replace(replace(replace(fields, '[FACT] ', ''), '[INFERENCE] ', ''), '[HYPOTHESIS] ', '')
WHERE kind = 'job' AND (instr(fields, '[FACT] ') > 0 OR instr(fields, '[INFERENCE] ') > 0 OR instr(fields, '[HYPOTHESIS] ') > 0);
UPDATE artifacts SET data = json_remove(replace(replace(replace(data, '[FACT] ', ''), '[INFERENCE] ', ''), '[HYPOTHESIS] ', ''), '$.tags')
WHERE instr(data, '[FACT] ') > 0 OR instr(data, '[INFERENCE] ') > 0 OR instr(data, '[HYPOTHESIS] ') > 0 OR json_type(data, '$.tags') IS NOT NULL;

-- Bỏ giao việc theo bản ghi (svc-marketing / svc-production): job giao bản ghi chưa duyệt không còn nơi xử lý đúng
-- (duyệt bây giờ tạo bản ghi mới thay vì ghi vào bản ghi đã giao) — xoá mềm. Job đã duyệt giữ lại làm lịch sử.
UPDATE talks SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE kind = 'job' AND targetId != '' AND approved = 0 AND deleted_at IS NULL;
