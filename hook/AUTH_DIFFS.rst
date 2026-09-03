================
REVISION DIFFS
================

Hệ thống lưu vết thay đổi cho ``records`` — tương tự Git history, phù hợp với schema hiện tại.

.. contents:: Mục lục
   :depth: 2
   :local:

----

Mục tiêu
=========

Cho phép:

* Biết ai sửa nội dung và sửa lúc nào
* So sánh giữa hai phiên bản bất kỳ
* Khôi phục phiên bản cũ (tạo revision mới từ snapshot cũ)
* Audit toàn bộ lịch sử chỉnh sửa

Áp dụng cho mọi ``records.mode`` cần lưu vết — ưu tiên ``mode = 'post'``.

----

Thiết kế
=========

Bảng ``revisions`` là bảng riêng, **không dùng** ``records``, vì lý do tương tự ``invoice``:

- Revision là bản ghi **bất biến** (immutable) — không có ``deleted_at``, ``updated_at``
- Không cần ``mode``, ``score``, ``pricing``, ``promo``, ``vat``, ``quantity``, ``scope``, ``secure``
- Cần ``record_id`` FK → ``records`` và ``parent_id`` để tạo chuỗi lịch sử tuyến tính
- Lưu **snapshot đầy đủ** các field chính tại thời điểm lưu — không chỉ diff — để có thể restore không cần tái tính

----

Table: ``revisions``
=====================

CREATE TABLE
------------

.. code-block:: sql

   CREATE TABLE revisions (
     id          ULID        PRIMARY KEY DEFAULT gen_random_ulid(),
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

     record_id   ULID        NOT NULL REFERENCES records(id) ON DELETE CASCADE,
     user_id     ULID        REFERENCES users(id)            ON DELETE SET NULL,
     parent_id   ULID        REFERENCES revisions(id)        ON DELETE SET NULL,

     version     INTEGER     NOT NULL DEFAULT 1,
     action      TEXT        NOT NULL DEFAULT 'updated',
     summary     TEXT        NOT NULL DEFAULT '',

     -- Snapshot toàn bộ các field được theo dõi tại thời điểm lưu
     snapshot    JSONB       NOT NULL DEFAULT '{}',

     -- changed: field names đã thay đổi so với parent, pipe-separated
     changed     TEXT        NOT NULL DEFAULT '',

     -- diff: cache scalar diff để hiển thị nhanh — không bao gồm content
     diff        JSONB       NOT NULL DEFAULT '{}'
   );

Field Reference
---------------

+----------------+---------------+-------------------+--------------------------------------------------------------+
| Field          | Type          | Default           | Mô tả                                                        |
+================+===============+===================+==============================================================+
| ``id``         | ULID          | gen_random_ulid() | Primary key                                                  |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``created_at`` | TIMESTAMPTZ   | NOW()             | Thời điểm tạo revision — bất biến                            |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``record_id``  | ULID          | —                 | FK → ``records.id``; bản ghi được lưu vết                    |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``user_id``    | ULID          | NULL              | FK → ``users.id``; người thực hiện thay đổi                  |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``parent_id``  | ULID          | NULL              | FK → ``revisions.id``; revision trước đó (``NULL`` = đầu tiên) |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``version``    | INTEGER       | ``1``             | Số thứ tự tăng dần trong chuỗi lịch sử của ``record_id``    |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``action``     | TEXT          | ``'updated'``     | Loại hành động — xem values bên dưới                         |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``summary``    | TEXT          | ``''``            | Ghi chú tóm tắt do người dùng nhập khi lưu                  |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``snapshot``   | JSONB         | ``{}``            | Snapshot toàn bộ fields được theo dõi — xem shape bên dưới   |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``changed``    | TEXT          | ``''``            | Các field đã đổi so với parent — pipe-separated              |
+----------------+---------------+-------------------+--------------------------------------------------------------+
| ``diff``       | JSONB         | ``{}``            | Cache scalar diff để hiển thị nhanh — xem shape bên dưới    |
+----------------+---------------+-------------------+--------------------------------------------------------------+

**Tại sao dùng JSONB thay vì TEXT columns riêng lẻ?**

Revisions **không bao giờ filter hay sort** theo nội dung snapshot (title, status, tags…) —
chỉ query theo ``record_id`` + ``version``. Vì vậy index trên từng TEXT column không có giá trị.
Thay vào đó, gom vào ``snapshot JSONB`` giúp:

- Giảm từ 14 xuống còn **9 columns** — bảng nhỏ hơn, migration đơn giản hơn
- Thêm field mới (ví dụ ``index``, ``actors``) mà không cần ``ALTER TABLE revisions``
- PostgreSQL **TOAST** tự nén ``snapshot`` khi vượt 2 KB — HTML content và JSONB đều nén tốt như nhau

Indexes
-------

.. code-block:: sql

   CREATE INDEX idx_revisions_record_id ON revisions(record_id);
   CREATE INDEX idx_revisions_user_id   ON revisions(user_id);
   CREATE INDEX idx_revisions_version   ON revisions(record_id, version);

   -- Không cần GIN index trên snapshot — không dùng containment query @>

----

JSONB — Snapshot & Diff Shape
==============================

``snapshot`` shape
------------------

Lưu toàn bộ các field cần theo dõi của ``records`` tại thời điểm revision.
Các field trong snapshot **phản ánh đúng** các field tương ứng trong ``records``:

.. code-block:: js

   // snapshot cho mode = 'post'
   {
     title:       'Khoảnh khắc bình yên trên đỉnh núi',
     description: 'Tóm tắt ngắn gọn về bài viết...',
     content:     '<p>Bức ảnh ghi lại...</p>',
     tags:        'travel|nature|photo',
     status:      'active',
     pics:        'https://cdn.example.com/a.jpg|https://cdn.example.com/b.jpg',
     meta: {
       views: '2741', likes: '217',
       location: 'Skye, United Kingdom',
       url: '', slug: 'khoang-khac-binh-yen',
       reading_time: 5, seo_title: '...', seo_desc: '...',
     }
   }

**Parse snapshot:**

.. code-block:: js

   const snap = revision.snapshot                     // JSONB → JS object
   const title       = snap.title       ?? ''
   const description = snap.description ?? ''
   const content     = snap.content     ?? ''
   const tags        = (snap.tags || '').split('|').filter(Boolean)
   const meta        = snap.meta        ?? {}

**Truy vấn snapshot trong SQL:**

.. code-block:: sql

   -- Lấy title của revision
   SELECT snapshot->>'title' FROM revisions WHERE id = $id;

   -- Lấy toàn bộ snapshot và parse bên app
   SELECT id, version, action, created_at, snapshot, changed
   FROM revisions
   WHERE record_id = $record_id
   ORDER BY version DESC;

``diff`` shape
--------------

Cache kết quả so sánh **scalar fields** giữa revision này và revision cha.
``content`` không lưu vào ``diff`` vì có thể rất lớn — tính on-demand khi cần.

.. code-block:: js

   // diff khi title và tags thay đổi, content không đổi
   {
     title: { from: 'Tiêu đề cũ',     to: 'Tiêu đề mới' },
     tags:  { from: 'travel|nature',  to: 'travel|nature|photo' },
     // status, pics, meta không có key = không đổi
   }

   // diff khi chỉ đổi status
   {
     status: { from: 'draft', to: 'active' }
   }

   // diff khi revision đầu tiên (không có parent) — để trống
   {}

**Lợi ích của ``diff`` cache:**

- History list view chỉ cần đọc ``diff`` để hiển thị badge "title đã đổi / tags đã đổi"
  — không cần load hai snapshot và tự tính
- Content diff (word-level HTML) vẫn tính on-demand khi user mở Compare view

**Build diff khi tạo revision:**

.. code-block:: js

   // SCALAR: fields ngắn — cache vào diff để hiển thị nhanh
   // description + content: textarea/rich text dài — tính word-diff on-demand, không cache
   const SCALAR = ['title', 'tags', 'status', 'pics']

   function buildDiff(parentSnap, newSnap) {
     const diff = {}
     for (const f of SCALAR) {
       if (parentSnap[f] !== newSnap[f])
         diff[f] = { from: parentSnap[f] ?? '', to: newSnap[f] ?? '' }
     }
     // meta: so sánh shallow bằng JSON.stringify
     if (JSON.stringify(parentSnap.meta) !== JSON.stringify(newSnap.meta))
       diff.meta = { from: parentSnap.meta, to: newSnap.meta }
     return diff   // {} nếu không có gì đổi ngoài description/content
   }

**Parse diff để hiển thị badges:**

.. code-block:: js

   const badges = Object.keys(revision.diff)   // ['title', 'tags']
   // → hiển thị: "title, tags đã thay đổi"

   // Lấy giá trị cụ thể
   const { from, to } = revision.diff.title ?? {}

----

revisions — Field Formats
===========================

``action`` values
-----------------

==============  =====================================================
Value           Khi nào
==============  =====================================================
``created``     Bản ghi được tạo lần đầu
``updated``     Chỉnh sửa nội dung thông thường
``published``   Chuyển ``status`` → ``active``
``unpublished`` Chuyển ``status`` → ``draft`` hoặc ``inactive``
``archived``    Chuyển ``status`` → ``archived``
``restored``    Khôi phục từ revision cũ (nội dung = revision đó)
==============  =====================================================

``changed`` format
------------------

Pipe-separated tên field đã thay đổi so với revision cha:

.. code-block:: text

   'title|content'
   'tags|status'
   'content|pics|tags'

**Các field được theo dõi:** ``title``, ``description``, ``content``, ``tags``, ``status``, ``pics``, ``meta``.

.. code-block:: js

   // Phát hiện changed khi so sánh current record và snapshot cha
   const TRACKED = ['title', 'description', 'content', 'tags', 'status', 'pics']
   const changed = TRACKED
     .filter(f => record[f] !== parent[f])
     .join('|')
   // Nếu meta thay đổi: thêm 'meta' vào changed
   if (JSON.stringify(record.meta) !== JSON.stringify(parent.meta))
     changed += (changed ? '|' : '') + 'meta'

``version`` numbering
----------------------

``version`` là số nguyên tăng dần, độc lập cho mỗi ``record_id``:

.. code-block:: sql

   -- Lấy version tiếp theo khi tạo revision mới
   SELECT COALESCE(MAX(version), 0) + 1
   FROM revisions
   WHERE record_id = $record_id;

----

Workflow: Khi Update Records
=============================

Mỗi lần admin lưu bản ghi, hệ thống:

**Bước 1 — Đọc trạng thái hiện tại:**

.. code-block:: js

   const current = await db.records.findById(record_id)
   const lastRevision = await db.revisions.findLast({ record_id })
   const parentSnap = lastRevision?.snapshot ?? {}

**Bước 2 — Build snapshot mới và phát hiện changed:**

.. code-block:: js

   const TRACKED = ['title', 'description', 'content', 'tags', 'status', 'pics']
   const newSnap = {
     title:       newData.title,       description: newData.description,
     content:     newData.content,     tags:        newData.tags,
     status:      newData.status,      pics:        newData.pics,
     meta:        newData.meta,
   }

   const changed = TRACKED.filter(f => newSnap[f] !== parentSnap[f])
   if (JSON.stringify(newSnap.meta) !== JSON.stringify(parentSnap.meta)) changed.push('meta')

**Bước 3 — Build diff cache (scalar only):**

.. code-block:: js

   const diff = buildDiff(parentSnap, newSnap)  // xem hàm buildDiff ở phần JSONB

**Bước 4 — Tạo revision:**

.. code-block:: js

   await db.revisions.create({
     record_id,
     user_id:   currentUser.id,
     parent_id: lastRevision?.id ?? null,
     version:   (lastRevision?.version ?? 0) + 1,
     action:    detectAction(current.status, newData.status),
     summary:   body.summary ?? '',
     snapshot:  newSnap,
     changed:   changed.join('|'),
     diff,
   })

**Bước 5 — Cập nhật records:**

.. code-block:: js

   await db.records.update(record_id, newData)

.. note::

   Revision tạo *trước* khi update records — đảm bảo audit trail đầy đủ kể cả khi update thất bại.

----

Restore (Khôi phục phiên bản)
==============================

Khôi phục không phải là rollback — hệ thống tạo **revision mới** với nội dung từ snapshot cũ:

.. code-block:: js

   const target      = await db.revisions.findById(revision_id)
   const lastRevision = await db.revisions.findLast({ record_id })
   const currentSnap  = lastRevision.snapshot

   await db.revisions.create({
     record_id,
     user_id:   currentUser.id,
     parent_id: lastRevision.id,
     version:   lastRevision.version + 1,
     action:    'restored',
     summary:   `Khôi phục từ v${target.version}`,
     snapshot:  target.snapshot,
     changed:   'title|description|content|tags|status|pics|meta',
     diff:      buildDiff(currentSnap, target.snapshot),
   })

   // Cập nhật records từ snapshot của target revision
   const { title, description, content, tags, status, pics, meta } = target.snapshot
   await db.records.update(record_id, { title, description, content, tags, status, pics, meta })

----

Diff — So Sánh Hai Phiên Bản
==============================

**Scalar fields** (title, tags, status, pics, meta) — đọc trực tiếp từ ``diff`` cache:

.. code-block:: js

   // revision.diff đã có sẵn từ DB — không cần tính lại
   const scalarDiff = revision.diff
   // { title: { from: 'Cũ', to: 'Mới' }, tags: { from: 'a|b', to: 'a|b|c' } }

**Textarea & rich text** (``description``, ``content``) — tính word-diff on-demand khi user mở Compare view:

.. code-block:: js

   import { diffWords } from 'diff'
   const fromSnap = revA.snapshot
   const toSnap   = revB.snapshot
   // description: plain textarea
   const descChanges    = diffWords(fromSnap.description, toSnap.description)
   // content: strip HTML trước khi diff
   const contentChanges = diffWords(stripHtml(fromSnap.content), stripHtml(toSnap.content))
   // changes: [{ value, added?, removed? }, ...]

**API response shape** (GET với ``?from=12&to=13``):

.. code-block:: js

   {
     from: { version: 12, created_at: '...', user_id: '...' },
     to:   { version: 13, created_at: '...', user_id: '...' },
     changed: ['title', 'content'],
     diff: {
       // scalar: từ cache revision.diff (nhanh)
       title: { from: 'Cũ', to: 'Mới' },
       // content: tính on-demand (chậm hơn)
       content: [{ value: 'unchanged ' }, { value: 'old', removed: true }, { value: 'new', added: true }],
     }
   }

----

API Design
===========

Theo pattern Astro static route — file: ``src/pages/api/revisions/[record_id].json.ts``

**GET** — Lấy danh sách revision:

.. code-block:: text

   GET /api/revisions/{record_id}.json

Response:

.. code-block:: js

   {
     data: [
       { id, version, action, summary, changed, created_at, user_id },
       ...
     ]
   }

**POST** — Tạo revision mới (gọi khi update records):

.. code-block:: js

   POST /api/revisions/{record_id}.json
   { action: 'create', data: { title, description, content, tags, status, pics, meta, summary } }

**POST** — Restore:

.. code-block:: js

   POST /api/revisions/{record_id}.json
   { action: 'restore', id: revision_id }

**GET diff** — So sánh hai phiên bản:

.. code-block:: text

   GET /api/revisions/{record_id}.json?from={version_a}&to={version_b}

----

Admin Integration (posts.astro)
=================================

Trong ``svc-admin``, mỗi khi form ``update`` được submit, gọi revision API trước khi gọi records API:

.. code-block:: js

   // Trong svc-admin hoặc posts.astro script
   async function saveWithRevision(recordId, newData, summary = '') {
     // 1. Tạo revision snapshot
     await fetch(`/api/revisions/${recordId}.json`, {
       method: 'POST',
       body: JSON.stringify({ action: 'create', data: { ...newData, summary } }),
     })
     // 2. Cập nhật records
     await fetch(`/api/admin/posts.json`, {
       method: 'POST',
       body: JSON.stringify({ action: 'update', id: recordId, data: newData }),
     })
   }

Schema bổ sung trong ``posts.astro`` để hiển thị lịch sử:

.. code-block:: js

   // Thêm vào schema của svc-admin (read-only panel)
   {
     field: 'revisions', label: 'Lịch sử',
     type: 'revisions',   // custom render type trong svc-admin
     write: false,
     render: (_v, row) => `<svc-revisions record-id="${row.id}"></svc-revisions>`,
   }

----

So sánh với ``records.actors``
================================

+-------------------+-------------------------------+---------------------------------------------+
|                   | ``records.actors``            | ``revisions``                               |
+===================+===============================+=============================================+
| Mục đích          | Audit trail ai làm gì         | Snapshot nội dung đầy đủ                    |
+-------------------+-------------------------------+---------------------------------------------+
| Nội dung          | ``user~timestamp~action``     | ``snapshot JSONB`` — toàn bộ fields          |
+-------------------+-------------------------------+---------------------------------------------+
| Giới hạn          | Tối đa 9 entries (rolling)    | Không giới hạn                              |
+-------------------+-------------------------------+---------------------------------------------+
| Restore           | Không                         | Có — từ ``snapshot``                        |
+-------------------+-------------------------------+---------------------------------------------+
| Diff hiển thị     | Không                         | Scalar: cache ``diff JSONB``; content: on-demand |
+-------------------+-------------------------------+---------------------------------------------+
| Vị trí            | Trong ``records.actors``      | Bảng riêng ``revisions``                    |
+-------------------+-------------------------------+---------------------------------------------+

Hai cơ chế **bổ sung** cho nhau: ``actors`` cho quick audit, ``revisions`` cho full history + restore.

----

Core Features
==============

MVP
---

* Tự động tạo revision khi admin update records
* Liệt kê lịch sử revision theo ``record_id``
* Xem snapshot của từng revision
* Khôi phục phiên bản cũ
* Hiển thị ai sửa, lúc nào, field nào đổi (``changed``)

Advanced
--------

* So sánh diff hai phiên bản (rich text word-level diff)
* Blame — click vào đoạn văn → xem revision nào thêm đoạn đó
* Conflict detection — hai người cùng sửa ``content``
* Summary tự động bằng AI khi ``summary = ''``
