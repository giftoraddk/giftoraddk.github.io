========
SCHEMA
========

Database schema, field formats và parse conventions cho 2 bảng cốt lõi.

.. contents:: Mục lục
   :depth: 2
   :local:

----

Table: ``records``
==================

Một bảng dùng cho tất cả loại dữ liệu — phân loại bằng ``mode``.
Thay thế cho các bảng riêng ``products``, ``posts``, ``comments``, ``orders``…

CREATE TABLE
------------

.. code-block:: sql

   CREATE TABLE records (
     id          ULID        PRIMARY KEY DEFAULT gen_random_ulid(),
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     deleted_at  TIMESTAMPTZ,
     index       INTEGER     NOT NULL DEFAULT 0,
     actors      TEXT        NOT NULL DEFAULT '',

     user_id     ULID        REFERENCES users(id) ON DELETE SET NULL,
     scope       TEXT        NOT NULL DEFAULT 'public',
     secure      TEXT        NOT NULL DEFAULT '',

     status      TEXT        NOT NULL DEFAULT 'active',
     mode        TEXT        NOT NULL DEFAULT '',
     score       TEXT        NOT NULL DEFAULT '0~0',
     tags        TEXT        NOT NULL DEFAULT '',
     title       TEXT        NOT NULL DEFAULT '',
     description TEXT        NOT NULL DEFAULT '',
     content     TEXT        NOT NULL DEFAULT '',
     pics        TEXT        NOT NULL DEFAULT '',

     pricing     TEXT        NOT NULL DEFAULT '',
     promo       TEXT        NOT NULL DEFAULT '',
     quantity    INTEGER     NOT NULL DEFAULT 0,
     vat         TEXT        NOT NULL DEFAULT '0',

     meta        JSONB       NOT NULL DEFAULT '{}'
   );

Field Reference
---------------

+------------+---------------+-------------------+------------------------------------------------------------------+
| Field      | Type          | Default           | Mô tả                                                            |
+============+===============+===================+==================================================================+
| ``id``     | ULID          | gen_random_ulid() | Primary key                                                      |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``created_at`` | TIMESTAMPTZ | NOW()           | Thời điểm tạo                                                    |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``updated_at`` | TIMESTAMPTZ | NOW()           | Thời điểm cập nhật cuối — tự cập nhật qua trigger                |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``deleted_at`` | TIMESTAMPTZ | NULL            | Soft delete — ``NULL`` = chưa xóa                                |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``index``  | INTEGER       | ``0``             | Thứ tự hiển thị thủ công — dùng cho kéo-thả / sort trong admin   |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``actors`` | TEXT          | ``''``            | Audit trail tối đa 9 entries — xem format bên dưới               |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``user_id``| ULID          | NULL              | FK → ``users.id``; owner của bản ghi                             |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``scope``  | TEXT          | ``'public'``      | Mức truy cập: ``public`` ``link_only`` ``private``               |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``secure`` | TEXT          | ``''``            | ACL chi tiết — xem format bên dưới                               |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``status`` | TEXT          | ``'active'``      | Trạng thái bản ghi — xem values bên dưới                         |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``mode``   | TEXT          | ``''``            | Loại dữ liệu — thay cho tên bảng riêng                           |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``score``  | TEXT          | ``'0~0'``         | Điểm đánh giá: ``avg~count``                                     |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``tags``   | TEXT          | ``''``            | Phân loại nhanh, pipe-separated: ``tagA\|tagB``                  |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``title``  | TEXT          | ``''``            | Tên / nhãn chính - tiêu đề or SEO                                                |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``description`` | TEXT     | ``''``            | Mô tả ngắn — dùng cho description or SEO                 |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``content``| TEXT          | ``''``            | Nội dung đầy đủ                                                  |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``pics``   | TEXT          | ``''``            | Ảnh pipe-separated: ``url1\|url2``                               |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``pricing``| TEXT          | ``''``            | Giá: ``price~cost~unit``                                         |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``promo``  | TEXT          | ``''``            | Khuyến mãi: ``discount~type``                                    |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``quantity``| INTEGER      | ``0``             | Số lượng tồn kho                                                 |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``vat``    | TEXT          | ``'0'``           | Thuế suất VAT dạng decimal (vd: ``'0.08'`` = 8%)                 |
+------------+---------------+-------------------+------------------------------------------------------------------+
| ``meta``   | JSONB         | ``{}``            | Dữ liệu phát sinh theo ``mode``                                  |
+------------+---------------+-------------------+------------------------------------------------------------------+

Indexes
-------

.. code-block:: sql

   CREATE INDEX idx_records_mode        ON records(mode)          WHERE deleted_at IS NULL;
   CREATE INDEX idx_records_user_id     ON records(user_id)       WHERE deleted_at IS NULL;
   CREATE INDEX idx_records_status_mode ON records(status, mode)  WHERE deleted_at IS NULL;
   CREATE INDEX idx_records_tags        ON records(tags)          WHERE deleted_at IS NULL;
   CREATE INDEX idx_records_score       ON records(score)         WHERE deleted_at IS NULL AND score != '0~0';
   CREATE INDEX idx_records_index       ON records(mode, index)   WHERE deleted_at IS NULL;

   -- Full-text search trên title + content
   CREATE INDEX idx_records_fts ON records
     USING gin(to_tsvector('simple', title || ' ' || content));

----

Table: ``users``
================

CREATE TABLE
------------

.. code-block:: sql

   CREATE TABLE users (
     id           ULID        PRIMARY KEY DEFAULT gen_random_ulid(),
     created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     deleted_at   TIMESTAMPTZ,
     index       INTEGER     NOT NULL DEFAULT 0,
     actors       TEXT        NOT NULL DEFAULT '',

     status       TEXT        NOT NULL DEFAULT 'pending',

     email        TEXT        UNIQUE NOT NULL,
     username     TEXT        UNIQUE,
     password     TEXT,

     display_name TEXT        NOT NULL DEFAULT '',
     caption      TEXT        NOT NULL DEFAULT '',
     avatar       TEXT        NOT NULL DEFAULT '',

     roles        TEXT        NOT NULL DEFAULT 'user',

     connections  TEXT        NOT NULL DEFAULT '',
     meta         JSONB       NOT NULL DEFAULT '{}'
   );

Field Reference
---------------

+----------------+---------------+-------+-----------------------------------------------------------+
| Field          | Type          | Default | Mô tả                                                   |
+================+===============+=========+=========================================================+
| ``id``         | ULID          | gen_random_ulid() | Primary key                               |
+----------------+---------------+---------+---------------------------------------------------------+
| ``created_at`` | TIMESTAMPTZ   | NOW()   | Thời điểm tạo                                           |
+----------------+---------------+---------+---------------------------------------------------------+
| ``updated_at`` | TIMESTAMPTZ   | NOW()   | Thời điểm cập nhật cuối                                 |
+----------------+---------------+---------+---------------------------------------------------------+
| ``deleted_at`` | TIMESTAMPTZ   | NULL    | Soft delete                                             |
+----------------+---------------+---------+---------------------------------------------------------+
| ``index``      | INTEGER       | ``0``   | Thứ tự hiển thị thủ công — dùng cho sort trong admin    |
+----------------+---------------+---------+---------------------------------------------------------+
| ``actors``     | TEXT          | ``''``  | Audit trail — cùng format với ``records.actors``        |
+----------------+---------------+---------+---------------------------------------------------------+
| ``status``     | TEXT          | ``'pending'`` | Trạng thái tài khoản                            |
+----------------+---------------+---------+---------------------------------------------------------+
| ``email``      | TEXT          | —       | Email duy nhất, bắt buộc                                |
+----------------+---------------+---------+---------------------------------------------------------+
| ``username``   | TEXT          | NULL    | Username tùy chọn, unique                               |
+----------------+---------------+---------+---------------------------------------------------------+
| ``password``   | TEXT          | NULL    | Hashed password; ``NULL`` = OAuth-only user             |
+----------------+---------------+---------+---------------------------------------------------------+
| ``display_name``| TEXT         | ``''``  | Tên hiển thị                                            |
+----------------+---------------+---------+---------------------------------------------------------+
| ``caption``    | TEXT          | ``''``  | Bio / tagline ngắn                                      |
+----------------+---------------+---------+---------------------------------------------------------+
| ``avatar``     | TEXT          | ``''``  | URL ảnh đại diện                                        |
+----------------+---------------+---------+---------------------------------------------------------+
| ``roles``      | TEXT          | ``'user'``| Roles pipe-separated: ``user\|editor\|admin``          |
+----------------+---------------+---------+---------------------------------------------------------+
| ``connections``| TEXT          | ``''``  | Danh sách quan hệ — xem format bên dưới                 |
+----------------+---------------+---------+---------------------------------------------------------+
| ``meta``       | JSONB         | ``{}``  | Dữ liệu mở rộng                                        |
+----------------+---------------+---------+---------------------------------------------------------+

Indexes
-------

.. code-block:: sql

   CREATE UNIQUE INDEX idx_users_email    ON users(email)       WHERE deleted_at IS NULL;
   CREATE UNIQUE INDEX idx_users_username ON users(username)    WHERE username IS NOT NULL AND deleted_at IS NULL;
   CREATE INDEX idx_users_status          ON users(status)      WHERE deleted_at IS NULL;
   CREATE INDEX idx_users_roles           ON users(roles)       WHERE deleted_at IS NULL;
   CREATE INDEX idx_users_connections     ON users(connections) WHERE deleted_at IS NULL;
   CREATE INDEX idx_users_index           ON users(index)       WHERE deleted_at IS NULL;

----

Trigger: auto-update ``updated_at``
=====================================

.. code-block:: sql

   CREATE OR REPLACE FUNCTION set_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_records_updated_at
     BEFORE UPDATE ON records
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

   CREATE TRIGGER trg_users_updated_at
     BEFORE UPDATE ON users
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

----

records — Field Formats
========================

``status`` values
-----------------

===========  =================================================
Value        Mô tả
===========  =================================================
``active``   Đang hoạt động, hiển thị bình thường
``draft``    Bản nháp, chưa publish
``inactive`` Tạm ẩn nhưng chưa xóa
``archived`` Lưu trữ, không hiển thị trong danh sách thường
===========  =================================================

Soft delete dùng ``deleted_at IS NOT NULL`` — không thêm ``deleted`` vào status.
Query mặc định luôn thêm ``WHERE deleted_at IS NULL``.

``mode`` convention
-------------------

============  ============================================================
mode          Ý nghĩa
============  ============================================================
``product``   Sản phẩm
``post``      Bài viết / blog
``comment``   Bình luận
``order``     Đơn hàng
``invoice``   Hóa đơn VAT
``review``    Đánh giá — talent marketplace dùng thêm ``meta.proposalId``/
              ``meta.talentId``/``meta.employerId``, xem ``docs/new_feature.md`` §1.5
``event``     Sự kiện
``faq``       Câu hỏi thường gặp
``talent``    Hồ sơ chuyên môn (talent marketplace) — xem ``docs/new_feature.md`` §1.2
``job``       Tin đăng tuyển / đề nghị thuê trực tiếp — xem ``docs/new_feature.md`` §1.3
``proposal``  Thương lượng + Deal (gộp 1 record) — xem ``docs/new_feature.md`` §1.4
``wallet_txn``Giao dịch Xu (append-only) — xem ``docs/new_feature.md`` §1.6/§3
============  ============================================================

``score`` format — ``avg~count``
---------------------------------

.. code-block:: text

   '0~0'    → chưa có đánh giá
   '4~1'    → 1 người đánh giá 4 sao
   '4.5~2'  → 2 người, trung bình 4.5 sao

**Parse & cập nhật:**

.. code-block:: js

   const [avg, count] = score.split('~').map(Number)
   const new_avg   = (avg * count + new_rating) / (count + 1)
   const new_score = `${new_avg.toFixed(1)}~${count + 1}`

   // Hiển thị: khi count = 0 → không hiển thị sao
   const stars = parseFloat(score.split('~')[0])

``meta.views`` / ``meta.likes`` (mode: 'post')
-----------------------------------------------

Integer, mặc định ``0``. Nằm trong ``meta`` JSON của record ``mode: 'post'``, cạnh ``slug``/``reading_time``/``seo_title``/``seo_desc``:

.. code-block:: js

   // mode: 'post'
   { slug: 'ten-bai-viet', reading_time: 5, seo_title: '...', seo_desc: '...', views: 0, likes: 0 }

Được tăng bằng read-modify-write (``findById`` → +1 → ``update``), không dùng atomic increment — xem ``src/webs/socials/tools/service.js`` (``bumpMeta``) và ``svc-engage``. Chấp nhận rủi ro nhỏ sai lệch số đếm khi 2 request tăng gần như đồng thời (phù hợp traffic blog cá nhân).

``tags`` format
---------------

Pipe-separated, chữ thường, không dấu cách:

.. code-block:: text

   'coffee|hot|featured'
   'sale|new-arrival'

.. code-block:: sql

   -- Lọc tag
   WHERE '|' || tags || '|' LIKE '%|coffee|%'

``pics`` format
---------------

Pipe-separated URLs — ảnh đầu = ảnh chính:

.. code-block:: text

   'https://cdn.example.com/a.jpg|https://cdn.example.com/b.jpg'

``pricing`` format — ``price~cost~unit``
-----------------------------------------

=======  =======  =====================================
Slot     Tên      Mô tả
=======  =======  =====================================
0        price    Giá bán
1        cost     Giá vốn
2        unit     Đơn vị tính (``ly``, ``cái``, …)
=======  =======  =====================================

.. code-block:: js

   const [price, cost, unit] = (pricing || '').split('~')
   // '29000~15000~ly' → price='29000', cost='15000', unit='ly'

``promo`` format — ``discount~type``
--------------------------------------

=======  ========  ========================
Slot     Tên       Mô tả
=======  ========  ========================
0        discount  Giá trị giảm
1        type      ``fixed`` | ``percent``
=======  ========  ========================

.. code-block:: js

   const [discount, type] = (promo || '').split('~')
   const d = Number(discount) || 0
   const finalPrice = type === 'percent'
     ? price * (1 - d / 100)
     : price - d

``quantity``
------------

``INTEGER`` — tồn kho. Mặc định ``0``.

=========  ========================
Giá trị    Ý nghĩa
=========  ========================
``0``      Hết hàng
``-1``     Không theo dõi (vô hạn)
``N > 0``  Còn N sản phẩm
=========  ========================

``vat``
-------

TEXT — thuế suất decimal. Mặc định ``'0'``.

.. code-block:: js

   const vatRate   = parseFloat(vat || '0')   // 0.08
   const vatAmount = amount * vatRate

``scope`` values
----------------

============  ===================================================
Value         Logic
============  ===================================================
``public``    Mọi người đều có ``read``
``link_only`` Ai có link đều có ``read``
``private``   Check ``secure``; không có entry phù hợp → từ chối
============  ===================================================

``secure`` format — ACL
------------------------

Mỗi entry: ``user_id~action1|action2``. Entries cách nhau ``,``.

.. code-block:: text

   'usr_abc123~edit|delete,usr_xyz789~comment'

**Actions hợp lệ:**

==========  =============================================
Action      Mô tả
==========  =============================================
``read``    Xem nội dung
``comment`` Bình luận
``edit``    Sửa nội dung
``delete``  Xóa
``share``   Chia sẻ / thay đổi scope
``manage``  Cấp/thu quyền — quyền cao nhất
==========  =============================================

.. code-block:: js

   const acl = secure.split(',').filter(Boolean).map(entry => {
     const [id, acts] = entry.split('~')
     return { id, a: acts ? acts.split('|') : [] }
   })

``actors`` format — Audit trail
---------------------------------

TEXT — tối đa 9 entries (rolling), cách nhau ``|``. Mỗi entry: ``user_id~timestamp~action``.

.. code-block:: text

   'usr_abc~2025-05-15T10:00:00Z~created|usr_def~2025-05-16T14:30:00Z~updated'

**Actions:**

===============  ================================
Action           Khi nào
===============  ================================
``created``      Tạo mới
``updated``      Cập nhật
``published``    Chuyển sang ``active``
``unpublished``  Chuyển sang ``draft``/``inactive``
``archived``     Chuyển sang ``archived``
``deleted``      Soft delete
``restored``     Khôi phục sau khi xóa
===============  ================================

.. code-block:: js

   const log = actors.split('|').filter(Boolean).map(entry => {
     const [user_id, timestamp, action] = entry.split('~')
     return { user_id, timestamp, action }
   })

``meta`` shape theo ``mode``
-----------------------------

.. code-block:: js

   // mode: 'product'
   { price: 120000, compare_price: 150000, sku: 'PROD-001', stock: 50, unit: 'cái', weight: 0.5,
     // tuỳ chọn — trang chi tiết sản phẩm (src/pages/product/[slug].astro):
     faq: [{ q: 'Câu hỏi?', a: 'Trả lời.' }] }  // chỉ nhập khi có FAQ thật, không bịa

   // mode: 'post'
   { slug: 'ten-bai-viet', reading_time: 5, seo_title: '...', seo_desc: '...', views: 0, likes: 0 }

   // mode: 'order'
   { items: 'id~qty~price|id2~qty2~price2', total: 240000,
     shipping_address: '...', payment_method: 'cash' }

----

records — Orders (``mode = 'order'``)
======================================

**Vòng đời đơn hàng**

.. code-block:: text

   paid → processing → delivering → completed
                    ↘ cancelled

=============  =======  =============================================
``status``     Màu      Ý nghĩa
=============  =======  =============================================
``paid``       cyan     Khách đã thanh toán, chờ xử lý
``processing`` amber    Đang chuẩn bị / sản xuất
``delivering`` purple   Đang giao hàng
``completed``  green    Giao thành công, đơn kết thúc
``cancelled``  gray     Đã hủy
=============  =======  =============================================

**API response shape** (``/api/products/orders.json``):

.. code-block:: js

   {
     id, date, time, source,
     staffId, staffName, tableId, tableName,
     items: [{ menuId, name?, qty, price }],
     itemCount, subtotal?, discountAmount?, promo?,
     total, formattedTotal,
     payment, paymentLabel,
     notes, status, statusLabel,
   }

- **Active** (tiến trình): ``status ∈ { paid, processing, delivering }``
- **Done** (lịch sử): ``status ∈ { completed, cancelled }``

----

users — Field Formats
======================

``status`` values
-----------------

============  =====================================================
Value         Mô tả
============  =====================================================
``pending``   Đăng ký xong, chưa verify email
``active``    Đang hoạt động bình thường
``banned``    Bị khóa bởi admin
``suspended`` Tạm khóa (vi phạm nhẹ, có thể mở lại)
============  =====================================================

``roles`` format
----------------

Pipe-separated, chữ thường:

.. code-block:: text

   'user'
   'user|editor'
   'user|editor|admin'

========  =========================================================
Role      Quyền
========  =========================================================
``user``   Đọc public content, quản lý records của chính mình
``editor`` CRUD tất cả records, không quản lý users
``admin``  Toàn quyền
========  =========================================================

``meta`` shape
--------------

.. code-block:: js

   {
     provider:      'google',          // null nếu email/password
     provider_id:   'google_uid_xxx',
     locale:        'vi',
     timezone:      'Asia/Ho_Chi_Minh',
     preferences:   { theme: 'dark', notifications: true },
     last_login_at: '2025-05-15T10:00:00Z',
     login_count:   42,
   }

``connections`` format
----------------------

TEXT — entries cách nhau ``|``. Mỗi entry: ``user_id~timestamp~status``.

.. code-block:: text

   'usr_xyz~2025-05-15T10:00:00Z~friend|usr_abc~2025-05-14T09:00:00Z~pending_out'

**Status values:**

================  =============================================
Value             Mô tả
================  =============================================
``friend``        Đã là bạn bè
``pending_out``   Tôi đã gửi lời mời, chờ xác nhận
``pending_in``    Tôi nhận được lời mời, chưa xử lý
``blocked``       Tôi đã chặn người này
================  =============================================

**Luồng kết bạn:**

.. code-block:: text

   A gửi lời mời → B
     A.connections: thêm 'B_id~timestamp~pending_out'
     B.connections: thêm 'A_id~timestamp~pending_in'

   B chấp nhận
     A: đổi entry B → 'friend'
     B: đổi entry A → 'friend'

   Từ chối / hủy
     Xóa entry khỏi cả 2 bên

Mỗi thao tác cần **update 2 bản ghi**. Phù hợp cho < vài nghìn connections/user.

.. code-block:: js

   // Parse
   const list = connections.split('|').filter(Boolean).map(entry => {
     const [user_id, timestamp, status] = entry.split('~')
     return { user_id, timestamp, status }
   })

.. code-block:: sql

   -- Kiểm tra A và B có là bạn không
   SELECT connections LIKE '%' || $b || '~%~friend%'
   FROM users WHERE id = $a;

----

Table: ``invoice``
==================

Bảng riêng cho hóa đơn điện tử — tách khỏi ``records`` vì invoice là văn bản pháp lý
có cấu trúc cố định, cần index độc lập và không dùng phần lớn cột generic của ``records``
(``mode``, ``tags``, ``score``, ``pics``, ``quantity``).

CREATE TABLE
------------

.. code-block:: sql

   CREATE TABLE invoice (
     id           ULID        PRIMARY KEY DEFAULT gen_random_ulid(),
     issued_at    TIMESTAMPTZ,

     user_id      ULID        REFERENCES users(id)   ON DELETE SET NULL,
     order_id     ULID        REFERENCES records(id) ON DELETE SET NULL,

     status       TEXT        NOT NULL DEFAULT 'draft',
     currency     TEXT        NOT NULL DEFAULT 'VND',

     no           TEXT        NOT NULL DEFAULT '',
     series       TEXT        NOT NULL DEFAULT '',
     note         TEXT        NOT NULL DEFAULT '',

     seller       TEXT        NOT NULL DEFAULT '',
     buyer        TEXT        NOT NULL DEFAULT '',

     items        TEXT        NOT NULL DEFAULT '',
     summary      TEXT        NOT NULL DEFAULT '0~0~0',

     meta         JSONB       NOT NULL DEFAULT '{}'
   );

Field Reference
---------------

+----------------+---------------+-------------------+------------------------------------------------------------------+
| Field          | Type          | Default           | Mô tả                                                            |
+================+===============+===================+==================================================================+
| ``id``         | ULID          | gen_random_ulid() | Primary key — thường dùng ``paymentId`` từ đơn hàng             |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``issued_at``  | TIMESTAMPTZ   | NULL              | Ngày giờ phát hành chính thức; ``NULL`` khi còn ``draft``         |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``user_id``    | ULID          | NULL              | FK → ``users.id``; nhân viên / người tạo hóa đơn                |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``order_id``   | ULID          | NULL              | FK → ``records.id``; đơn hàng nguồn (nếu có)                    |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``status``     | TEXT          | ``'draft'``       | Trạng thái hóa đơn — xem values bên dưới                         |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``currency``   | TEXT          | ``'VND'``         | Đơn vị tiền tệ                                                    |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``no``         | TEXT          | ``''``            | Số hóa đơn: ``0000123``                                           |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``series``     | TEXT          | ``''``            | Ký hiệu hóa đơn: ``type~series`` → ``01~C24TAA``                  |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``note``       | TEXT          | ``''``            | Ghi chú tự do — vd: ``promo:SALE10``                             |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``seller``     | TEXT          | ``''``            | Thông tin bên bán — xem format bên dưới                           |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``buyer``      | TEXT          | ``''``            | Thông tin bên mua — xem format bên dưới                           |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``items``      | TEXT          | ``''``            | Danh sách hàng hóa pipe-separated — xem format bên dưới           |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``summary``    | TEXT          | ``'0~0~0'``       | Tổng hợp tài chính: ``subTotal~vatAmount~total``                   |
+----------------+---------------+-------------------+------------------------------------------------------------------+
| ``meta``       | JSONB         | ``{}``            | Dữ liệu mở rộng tùy nghiệp vụ                                     |
+----------------+---------------+-------------------+------------------------------------------------------------------+

Điểm khác biệt so với ``records``
-----------------------------------

- Không có ``deleted_at``, ``actors``, ``created_at``, ``updated_at`` — hóa đơn là văn bản pháp lý bất biến, chỉ có ``issued_at``.
- Không có ``mode``, ``tags``, ``score``, ``pics``, ``quantity``, ``vat``, ``pricing``, ``promo``, ``scope``, ``secure``, ``index``.
- Thêm ``order_id`` FK → ``records`` để liên kết đơn hàng nguồn.
- ``issued_at`` là cột riêng TIMESTAMPTZ thay vì nhúng trong ``meta``.
- ``no`` + ``series`` tách riêng để index và query số hóa đơn nhanh.
- ``note`` lưu ghi chú tự do như mã promo đã áp dụng.

Indexes
-------

.. code-block:: sql

   CREATE INDEX idx_invoice_user_id  ON invoice(user_id);
   CREATE INDEX idx_invoice_order_id ON invoice(order_id);
   CREATE INDEX idx_invoice_status   ON invoice(status);
   CREATE INDEX idx_invoice_no       ON invoice(no);
   CREATE INDEX idx_invoice_issued   ON invoice(issued_at) WHERE issued_at IS NOT NULL;

----

invoice — Field Formats
========================

``status`` values
-----------------

==============  =====================================================
Value           Mô tả
==============  =====================================================
``draft``       Bản nháp, chưa phát hành
``issued``      Đã phát hành chính thức — không sửa nội dung
``cancelled``   Đã hủy — cần lưu lý do trong ``meta.cancel_reason``
==============  =====================================================

``series`` format — ``type~series``
-------------------------------------

.. code-block:: text

   '01~C24TAA'
   -- type   = '01'     (loại hóa đơn theo quy định)
   -- series = 'C24TAA' (ký hiệu hóa đơn)

``seller`` format
-----------------

TEXT — ``accountName~accountNo~bankOrMomo~name~phone~address~email~taxCode~userId``:

=======  =============  =====================================================
Slot     Tên            Mô tả
=======  =============  =====================================================
0        accountName    Tên chủ tài khoản
1        accountNo      Số tài khoản ngân hàng hoặc SĐT MoMo
2        bankOrMomo     Tên ngân hàng hoặc ``MoMo``
3        name           Tên công ty / người bán
4        phone          SĐT người bán
5        address        Địa chỉ
6        email          Email
7        taxCode        Mã số thuế (rỗng nếu không có)
8        userId         ``users.id`` người bán (rỗng nếu không có — vd shop thường
                         chưa gắn tài khoản; channel dùng ``room.owner_id``)
=======  =============  =====================================================

.. code-block:: text

   'Nguyen Van A~01563372001~TPBank~Cafe ABC~0909123456~Quan 1, TP.HCM~invoice@cafe.vn~0123456789~usr_01'
   -- bank payment: accountNo = bank account number

   'Nguyen Van B~0909888777~MoMo~Cafe ABC~0909123456~Quan 1, TP.HCM~invoice@cafe.vn~0123456789~usr_01'
   -- momo payment: accountNo = MoMo phone number

``buyer`` format
----------------

TEXT — ``name~phone~address~email~taxCode~userId``:

.. code-block:: text

   'Nguyen Van A~0901234567~Q3 TP.HCM~buyer@email.com~~usr_02'
   -- taxCode rỗng = mua lẻ không có MST; userId = tài khoản đang đăng nhập lúc đặt hàng,
   -- rỗng nếu khách vãng lai (không đăng nhập)

``items`` format
----------------

Pipe-separated, mỗi dòng: ``name~price~unit~qty~discount~amount~vatRate~vatAmount``:

.. code-block:: text

   'Cafe sua da~29000~ly~2~0~58000~0.08~4640|Tra dao~25000~ly~1~0~25000~0.08~2000'

.. code-block:: js

   const items = (invoice.items || '').split('|').filter(Boolean).map(p => {
     const [name, price, unit, qty, discount, amount, vatRate, vatAmount] = p.split('~')
     return { name, price: +price, unit, qty: +qty,
              discount: +discount, amount: +amount, vatRate: +vatRate, vatAmount: +vatAmount }
   })

``summary`` format — ``subTotal~vatAmount~total``
---------------------------------------------------

.. code-block:: js

   const [subTotal, vatAmount, total] = (invoice.summary || '0~0~0').split('~').map(Number)

Ví dụ: ``'83000~6640~89640'`` → subTotal=83000, VAT=6640, total=89640.

Example
-------

.. code-block:: js

   {
     id:        'PAY-20260520-001',
     status:    'issued',
     currency:  'VND',
     issued_at: '2026-05-20T10:30:00+07:00',
     no:        '0000123',
     series:    '01~C24TAA',
     note:      '',
     seller:    'Nguyen Van A~VCB_ACC~Vietcombank~Cafe ABC~0909123456~Quan 1~invoice@cafe.vn~123456789~usr_01',
     buyer:     'Pham Ngoc A~~~~~usr_02',
     items:     'Cafe sua da~29000~ly~2~0~58000~0.08~4640',
     summary:   '58000~4640~62640',
     meta:      {},
   }

----

Table: ``hubs``
================

Bảng quản lý các **trang landing / collection** (shop, blog, news, …) — mỗi row là 1 "hub"
trỏ tới 1 page (``link``) và mang theo config giao diện của page đó (``meta``). Dữ liệu bên
trong page (sản phẩm, bài viết…) vẫn nằm ở ``records`` (lọc theo ``mode``, ``tags``); ``hubs``
chỉ là lớp quản lý/tìm kiếm cấp cao hơn — tìm theo ``tags``, ``title``, ``description``.

CREATE TABLE
------------

.. code-block:: sql

   CREATE TABLE hubs (
     id          ULID        PRIMARY KEY DEFAULT gen_random_ulid(),
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     deleted_at  TIMESTAMPTZ,
     index       INTEGER     NOT NULL DEFAULT 0,

     user_id     ULID        REFERENCES users(id) ON DELETE SET NULL,

     status      TEXT        NOT NULL DEFAULT 'active',
     score       TEXT        NOT NULL DEFAULT '0~0',
     tags        TEXT        NOT NULL DEFAULT '',
     title       TEXT        NOT NULL DEFAULT '',
     description TEXT        NOT NULL DEFAULT '',
     pics        TEXT        NOT NULL DEFAULT '',
     link        TEXT        NOT NULL DEFAULT '',

     meta        JSONB       NOT NULL DEFAULT '{}'
   );

Field Reference
---------------

+----------------+---------------+--------------------+-----------------------------------------------------------+
| Field          | Type          | Default            | Mô tả                                                      |
+================+===============+=====================+============================================================+
| ``id``         | ULID          | gen_random_ulid()  | Primary key                                                |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``created_at`` | TIMESTAMPTZ   | NOW()              | Thời điểm tạo                                              |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``updated_at`` | TIMESTAMPTZ   | NOW()              | Thời điểm cập nhật cuối — tự cập nhật qua trigger          |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``deleted_at`` | TIMESTAMPTZ   | NULL               | Soft delete — ``NULL`` = chưa xóa                          |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``index``      | INTEGER       | ``0``              | Thứ tự hiển thị thủ công — kéo-thả / sort trong admin      |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``user_id``    | ULID          | NULL               | FK → ``users.id``; chủ sở hữu hub                          |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``status``     | TEXT          | ``'active'``       | Trạng thái hub — cùng values với ``records.status``        |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``score``      | TEXT          | ``'0~0'``          | Điểm đánh giá: ``avg~count`` — cùng format ``records.score``|
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``tags``       | TEXT          | ``''``             | Phân loại/tìm kiếm nhanh, pipe-separated: ``tagA\|tagB``    |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``title``      | TEXT          | ``''``             | Tên hub — dùng cho tìm kiếm + tiêu đề page                 |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``description``| TEXT          | ``''``             | Mô tả ngắn — dùng cho tìm kiếm + SEO page                  |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``pics``       | TEXT          | ``''``             | Ảnh đại diện hub, pipe-separated: ``url1\|url2``            |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``link``       | TEXT          | ``''``             | Path tới page đích, vd ``/shop`` — xem format bên dưới     |
+----------------+---------------+--------------------+-----------------------------------------------------------+
| ``meta``       | JSONB         | ``{}``             | Config giao diện của page đích — xem shape bên dưới        |
+----------------+---------------+--------------------+-----------------------------------------------------------+

``tags``, ``pics``, ``score`` dùng chung format với bảng ``records`` — xem `records — Field Formats`_.

Indexes
-------

.. code-block:: sql

   CREATE UNIQUE INDEX idx_hubs_link   ON hubs(link)   WHERE deleted_at IS NULL AND link != '';
   CREATE INDEX idx_hubs_user_id       ON hubs(user_id) WHERE deleted_at IS NULL;
   CREATE INDEX idx_hubs_status        ON hubs(status)  WHERE deleted_at IS NULL;
   CREATE INDEX idx_hubs_tags          ON hubs(tags)    WHERE deleted_at IS NULL;
   CREATE INDEX idx_hubs_index         ON hubs(index)   WHERE deleted_at IS NULL;

   -- Full-text search trên title + description
   CREATE INDEX idx_hubs_fts ON hubs
     USING gin(to_tsvector('simple', title || ' ' || description));

   CREATE TRIGGER trg_hubs_updated_at
     BEFORE UPDATE ON hubs
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

----

hubs — Field Formats
=====================

``link`` format
---------------

Path nội bộ tới page đích, bắt đầu bằng ``/``:

.. code-block:: text

   '/shop'
   '/blog'
   '/news'
   '/blog/coffee-story'

``meta`` shape — config giao diện page đích
---------------------------------------------

.. code-block:: js

   {
     ui:         'spatial',        // ui variant — xem docs/ARCHITECT.rst
     theme:      'dark',           // 'dark' | 'light'
     mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24', // 5 màu pipe-separated
     textColor:  'var(--color-base-content)',               // luôn dùng CSS var hệ thống

     bg: {
       // input params của helper getStyleOpts — không viết tay object bg đã build
       // xem docs/DESIGN.rst § Bước 7 — Background. Render qua <svc-underlay>, không phải
       // <web-bg> (cũ) — không có pattern/pics/effectFx, blobType chỉ 'circleOverlap'|'ellipse'.
       // KHÔNG set hueCustom ở đây: getStyleOpts coi hueCustom (0|1) là kill-switch, hễ có giá
       // trị sẽ ép blur/gradient về false (chế độ flat-card, không blob động).
       rounded: '1.75rem', tint: '#2ebd85', total: 2, blur: true, gradient: true,
       blobType: 'circleOverlap', colorful: false, deg: 0, distance: 86,
       blobMove: 'swap', // không phải param của getStyleOpts, set tay thêm nếu muốn blob chuyển động
     },

     sections: [
       // mảng các section descriptor — cùng shape với 1 phần tử views[].sections
       // trong src/services/modules/<page>-page.js, xem docs/DATAFLOW.rst § Bước 1.
       // Không chứa 'config' (object JS sống) hay 'data' — chỉ các field editable:
       { id: 'productsShopCard', dataTable: 'products', dataSrc: '',
         showSearch: true, emptyText: 'Không tìm thấy sản phẩm phù hợp',
         tags: { filterField: 'tags', filterColor: 'primary' },
         configKey: 'products/shop/card' },  // '' = giữ static config gốc từ <page>-page.js
     ],
   }

- ``ui`` / ``theme`` / ``mainColors`` / ``textColor``: cùng property set với ``svc-*`` component (xem CLAUDE.md § Lit Component conventions).
- ``bg``: input params của ``getStyleOpts(...)`` (không phải object đã build) — theo *Color rule*, không hardcode hex/rgb ngoài ``tint``.
- ``sections``: override cho các section thuộc TẤT CẢ views của page đích, gộp theo ``id`` — mỗi lần save chỉ ghi đè các ``id`` đang được chỉnh (view đang active), giữ nguyên override của các view khác trong cùng mảng. ``configKey`` trỏ tới registry ``src/sections/another.js`` (``resolveConfig``) để đổi layout mà không cần sửa code.

``user_id`` — ownership của hub
---------------------------------

Được set **một lần duy nhất** lúc tạo hub (save đầu tiên khi chưa có row nào khớp ``link``):

- Ưu tiên ``users.id`` thật của người tạo (query theo email nếu user hiện tại là super admin không có id thật — xem ``svc-login`` § tài khoản ``admin@apex``).
- ``0`` nếu không tìm được user thật nào tương ứng (super admin thuần, không có row trong ``users``).

Các lần save sau **không** ghi đè ``user_id`` — chỉ admin (role ``admin``) hoặc user có ``id`` trùng ``hubs.user_id`` (chủ sở hữu) mới được phép sửa hub.

Quan hệ với ``records``
------------------------

``hubs`` không chứa dữ liệu record — page tại ``link`` tự truy vấn ``records`` (qua ``conductor.all()``)
lọc theo ``mode`` (vd ``mode = 'product'``) và/hoặc theo ``tags`` để hiển thị danh sách bên trong page đó.

.. code-block:: text

   hub { title: 'Cửa hàng cà phê', link: '/shop', tags: 'shop' }
     → page /shop hiển thị records WHERE mode = 'product' AND tags LIKE '%coffee%'

   hub { title: 'Blog công nghệ', link: '/blog', tags: 'blog|tech' }
     → page /blog hiển thị records WHERE mode = 'post'
