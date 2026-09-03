=========================
Role-Based Access Control
=========================

.. contents:: Mục lục
   :depth: 2
   :local:

----

Tổng quan
=========

Hệ thống phân quyền dùng **2 cấp** lưu trong cột ``users.roles`` (TEXT, pipe-separated):

.. code-block:: text

   {table}.{capability}   ← quyền cụ thể trên một bảng
   admin                  ← global Super Admin (không có prefix)

Mỗi token trong ``users.roles`` là một quyền cụ thể (không lưu tên role).
Các **Role Presets** (Editor, Moderator, Admin) là tập hợp capabilities để gán nhanh,
không phải giá trị lưu trực tiếp.

Ví dụ giá trị ``users.roles``::

    'admin'
    'posts.read|posts.create|posts.update|posts.save_draft|posts.submit_review|posts.withdraw_review|posts.upload_media|posts.view_history'
    'posts.read|posts.view_history|posts.comment|posts.approve|posts.reject|posts.request_edit|posts.publish|posts.unpublish|posts.schedule|posts.unschedule|posts.manage_versions'

----

3 Roles
=======

1. Super Admin (global ``admin``)
----------------------------------

Toàn quyền trên hệ thống — không cần khai báo table role.
Stored as: ``'admin'``

Capabilities::

    Quản lý người dùng (tạo / sửa / xóa / khóa / gán role)
    Tạo / Sửa / Xóa vai trò và quyền
    Cấu hình hệ thống
    Xem toàn bộ dữ liệu (bất kể scope hay user_id)
    Nhật ký hoạt động (audit log)
    Backup / Restore
    Quản lý tích hợp API
    Toàn quyền trên mọi bảng (bao gồm tất cả table roles bên dưới)

2. Admin (``{table}.admin``)
-----------------------------

Quản trị vận hành trong phạm vi một bảng — toàn quyền Editor + Moderator, cộng thêm
các capability chỉ Admin mới có.
Stored as: ``'posts.admin'``

Capabilities::

    Tất cả capabilities của Editor + Moderator
    Xóa vĩnh viễn bản ghi
    Import / Export dữ liệu
    Quản lý trạng thái bản ghi (manage_status)

3. Editor (``{table}.editor``)
-------------------------------

Biên tập nội dung.
Stored as: ``'posts.editor'``

Capabilities::

    Tạo bài viết
    Chỉnh sửa bài viết — của mình hoặc của editor khác (không phân biệt chủ sở hữu)
    Lưu nháp
    Xem lịch sử chỉnh sửa (revisions)
    Upload media
    Gửi bài chờ duyệt (submit_review)
    Thu hồi bài đã gửi duyệt (withdraw_review)

Không có quyền::

    Duyệt / Xuất bản
    Xóa vĩnh viễn
    Quản lý người dùng

4. Moderator (``{table}.moderator``)
--------------------------------------

Vừa kiểm duyệt vừa xuất bản nội dung — gộp vai trò reviewer + publisher cũ vào một.
Stored as: ``'posts.moderator'``

Capabilities::

    Xem tất cả bài viết (kể cả đang chờ duyệt)
    Bình luận nội bộ
    Yêu cầu chỉnh sửa (request_edit)
    Phê duyệt nội dung (approve)
    Từ chối nội dung (reject)
    Xuất bản (publish) / Gỡ xuất bản (unpublish)
    Lên lịch (schedule) / Hủy lịch (unschedule) xuất bản
    Quản lý phiên bản / Khôi phục revision (manage_versions)
    Xem lịch sử chỉnh sửa (revisions)

Không có quyền::

    Tạo bài / Chỉnh sửa nội dung
    Xóa vĩnh viễn

----

Capabilities Map
================

``admin`` (table + global) có toàn bộ capabilities bên dưới — không liệt kê riêng.

+------------------------+--------------------------------------------------+--------+-----------+
| Capability             | Mô tả — được làm gì                              | editor | moderator |
+========================+==================================================+========+===========+
| read / list            | Xem danh sách và chi tiết nội dung đã đăng        | ✓      | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| create                 | Tạo bản ghi / bài viết mới                        | ✓      |           |
+------------------------+--------------------------------------------------+--------+-----------+
| update                 | Chỉnh sửa bản ghi — không phân biệt người tạo     | ✓      |           |
+------------------------+--------------------------------------------------+--------+-----------+
| save_draft             | Lưu nháp chưa xuất bản, không cần gửi duyệt       | ✓      |           |
+------------------------+--------------------------------------------------+--------+-----------+
| submit_review          | Gửi bài vào hàng chờ duyệt                        | ✓      |           |
+------------------------+--------------------------------------------------+--------+-----------+
| withdraw_review        | Thu hồi bài đã gửi duyệt (kéo về draft)           | ✓      |           |
+------------------------+--------------------------------------------------+--------+-----------+
| upload_media           | Upload hình ảnh và file đính kèm                  | ✓      |           |
+------------------------+--------------------------------------------------+--------+-----------+
| view_history           | Xem toàn bộ lịch sử chỉnh sửa (revisions)         | ✓      | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| comment                | Viết bình luận nội bộ trong quá trình duyệt       |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| approve                | Phê duyệt bài — chuyển sang trạng thái approved   |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| reject                 | Từ chối bài — trả về cho người viết               |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| request_edit           | Yêu cầu chỉnh sửa lại mà chưa reject hẳn         |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| publish                | Xuất bản bài — hiển thị công khai                 |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| unpublish              | Gỡ bài đang đăng xuống (về inactive hoặc draft)   |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| schedule               | Đặt lịch tự động xuất bản vào thời điểm chỉ định  |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| unschedule             | Hủy lịch đã đặt, giữ bài ở trạng thái hiện tại   |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| manage_versions        | Xem và khôi phục phiên bản cũ từ revision history |        | ✓         |
+------------------------+--------------------------------------------------+--------+-----------+
| delete                 | Xóa vĩnh viễn bản ghi                             | Admin only         |
+------------------------+--------------------------------------------------+--------+-----------+
| import                 | Nhập dữ liệu (CSV import…)                        | Admin only         |
+------------------------+--------------------------------------------------+--------+-----------+
| export                 | Xuất dữ liệu (CSV export…)                        | Admin only         |
+------------------------+--------------------------------------------------+--------+-----------+
| manage_status          | Thay đổi trạng thái bản ghi (status field)        | Admin only         |
+------------------------+--------------------------------------------------+--------+-----------+

.. note::

   Không có capability ``update_own`` — ``update`` áp dụng cho mọi bản ghi, không
   phân biệt ai tạo ra nó, để các Editor có thể sửa chéo bài của nhau tự do.

----

Tables (tên prefix)
===================

Với bảng ``records`` — dùng giá trị ``mode`` làm prefix.
Với bảng riêng — dùng tên bảng làm prefix.

Records (mode-based)
---------------------

+-------------+----------------------------------------------+
| Prefix      | records.mode                                 |
+=============+==============================================+
| ``posts``   | ``mode = 'post'``   — bài viết / blog        |
+-------------+----------------------------------------------+
| ``products``| ``mode = 'product'`` — sản phẩm              |
+-------------+----------------------------------------------+
| ``orders``  | ``mode = 'order'``  — đơn hàng               |
+-------------+----------------------------------------------+
| ``comments``| ``mode = 'comment'`` — bình luận             |
+-------------+----------------------------------------------+
| ``reviews`` | ``mode = 'review'`` — đánh giá               |
+-------------+----------------------------------------------+
| ``events``  | ``mode = 'event'``  — sự kiện                |
+-------------+----------------------------------------------+
| ``faqs``    | ``mode = 'faq'``    — câu hỏi thường gặp     |
+-------------+----------------------------------------------+

Standalone tables
-----------------

+-------------+------------------------------------------------+
| Prefix      | Bảng                                           |
+=============+================================================+
| ``users``   | Bảng ``users`` — tài khoản người dùng          |
+-------------+------------------------------------------------+
| ``invoice`` | Bảng ``invoice`` — hóa đơn điện tử             |
+-------------+------------------------------------------------+

Lưu ý ``invoice``: hóa đơn bất biến sau khi issued — chỉ dùng ``moderator`` (xem +
duyệt) và ``admin`` (issue + cancel). Không dùng ``editor`` vì không có khái niệm
"sửa bài của mình" sau phát hành.

----

Storage Format
==============

Lưu trong ``users.roles`` (TEXT, pipe-separated ``{table}.{capability}``, chữ thường):

- Mỗi token = một quyền cụ thể, ví dụ ``posts.create``, ``orders.read``
- ``admin`` là token đặc biệt — Super Admin, bỏ qua mọi kiểm tra
- Không có giới hạn số token; có thể kết hợp tự do từ nhiều bảng khác nhau

Parse:

.. code-block:: js

    const roles = (user.roles || '').split('|').filter(Boolean)
    // ['posts.read', 'posts.create', 'posts.update', 'posts.view_history']

    const isSuperAdmin = roles.includes('admin')

----

Permission Check
================

Role Presets — tập hợp capabilities để gán nhanh
--------------------------------------------------

Dùng khi tạo user hoặc thay đổi vai trò trong admin — tạo ra chuỗi ``users.roles``.

.. code-block:: js

    const ROLE_PRESETS = {
        editor:    (t) => [`${t}.read`, `${t}.create`, `${t}.update`,
                           `${t}.save_draft`, `${t}.submit_review`, `${t}.withdraw_review`,
                           `${t}.upload_media`, `${t}.view_history`],
        moderator: (t) => [`${t}.read`, `${t}.view_history`,
                           `${t}.comment`, `${t}.approve`, `${t}.reject`, `${t}.request_edit`,
                           `${t}.publish`, `${t}.unpublish`, `${t}.schedule`, `${t}.unschedule`,
                           `${t}.manage_versions`],
        admin:     (t) => [`${t}.read`, `${t}.create`, `${t}.update`,
                           `${t}.save_draft`, `${t}.submit_review`, `${t}.withdraw_review`,
                           `${t}.upload_media`, `${t}.view_history`, `${t}.comment`,
                           `${t}.approve`, `${t}.reject`, `${t}.request_edit`,
                           `${t}.publish`, `${t}.unpublish`, `${t}.schedule`, `${t}.unschedule`,
                           `${t}.manage_versions`, `${t}.delete`, `${t}.import`,
                           `${t}.export`, `${t}.manage_status`],
    };

    // Gán editor preset cho posts:
    const rolesString = ROLE_PRESETS.editor('posts').join('|');
    // → 'posts.read|posts.create|posts.update|posts.save_draft|...'

Hàm kiểm tra quyền
-------------------

Đơn giản — chỉ cần kiểm tra token ``{table}.{capability}`` có trong roles không.

.. code-block:: js

    /**
     * @param {object} user        — user object từ db_auth / users table
     * @param {string} table       — tên bảng/mode: 'posts', 'orders', 'users', ...
     * @param {string} capability  — tên quyền: 'read', 'create', 'update', 'publish', ...
     * @returns {boolean}
     */
    function can(user, table, capability) {
        const roles = (user?.roles || '').split('|').filter(Boolean);

        // Super Admin: bỏ qua mọi kiểm tra
        if (roles.includes('admin')) return true;

        return roles.includes(`${table}.${capability}`);
    }

Kiểm tra scope cho records.scope
----------------------------------

.. code-block:: js

    function canRead(user, table, record) {
        if (can(user, table, 'read')) return true;
        if (record.scope === 'public')    return true;
        if (record.scope === 'link_only') return true;
        return checkSecureAcl(user, record.secure, 'read');
    }

----

Ví dụ thực tế
=============

Giá trị ``users.roles`` đầy đủ theo từng vị trí
------------------------------------------------

**Khách / chưa xác nhận** — không có quyền, chỉ đọc public qua ``canRead()``:

.. code-block:: text

    ''

----

**Editor posts** — biên tập viên:

.. code-block:: text

    posts.read|posts.create|posts.update|posts.save_draft|
    posts.submit_review|posts.withdraw_review|posts.upload_media|posts.view_history

----

**Moderator posts** — kiểm duyệt và xuất bản:

.. code-block:: text

    posts.read|posts.view_history|posts.comment|posts.approve|posts.reject|
    posts.request_edit|posts.publish|posts.unpublish|posts.schedule|
    posts.unschedule|posts.manage_versions

----

**Editor + Moderator posts** — biên tập và xuất bản (union của 2 preset):

.. code-block:: text

    posts.read|posts.create|posts.update|posts.save_draft|
    posts.submit_review|posts.withdraw_review|posts.upload_media|posts.view_history|
    posts.comment|posts.approve|posts.reject|posts.request_edit|
    posts.publish|posts.unpublish|posts.schedule|posts.unschedule|posts.manage_versions

----

**Admin posts** — quản trị toàn bộ bảng posts:

.. code-block:: text

    posts.read|posts.create|posts.update|posts.save_draft|
    posts.submit_review|posts.withdraw_review|posts.upload_media|posts.view_history|
    posts.comment|posts.approve|posts.reject|posts.request_edit|
    posts.publish|posts.unpublish|posts.schedule|posts.unschedule|posts.manage_versions|
    posts.delete|posts.import|posts.export|posts.manage_status

----

**Admin posts + Editor orders** — quản trị posts, biên tập orders:

.. code-block:: text

    posts.read|posts.create|posts.update|posts.save_draft|
    posts.submit_review|posts.withdraw_review|posts.upload_media|posts.view_history|
    posts.comment|posts.approve|posts.reject|posts.request_edit|
    posts.publish|posts.unpublish|posts.schedule|posts.unschedule|posts.manage_versions|
    posts.delete|posts.import|posts.export|posts.manage_status|
    orders.read|orders.create|orders.update|orders.save_draft|
    orders.submit_review|orders.withdraw_review|orders.upload_media|orders.view_history

----

**Kế toán** — xem orders, tạo invoice draft:

.. code-block:: text

    orders.read|invoice.read|invoice.create

----

**Quản lý cửa hàng** — admin orders, editor products:

.. code-block:: text

    orders.read|orders.create|orders.update|orders.save_draft|
    orders.submit_review|orders.withdraw_review|orders.upload_media|orders.view_history|
    orders.comment|orders.approve|orders.reject|orders.request_edit|
    orders.publish|orders.unpublish|orders.schedule|orders.unschedule|orders.manage_versions|
    orders.delete|orders.import|orders.export|orders.manage_status|
    products.read|products.create|products.update|products.save_draft|
    products.submit_review|products.withdraw_review|products.upload_media|products.view_history

----

**Super Admin** — toàn quyền hệ thống:

.. code-block:: text

    admin

----

Kiểm tra quyền trong component
--------------------------------

.. code-block:: js

    import { auth } from '@/webs/auth/tools/service.js';

    const user = await auth.get();

    const canEdit    = can(user, 'posts', 'update');
    const canDelete  = can(user, 'posts', 'delete');
    const canPublish = can(user, 'posts', 'publish');
    const canReview  = can(user, 'posts', 'approve');
    const canHistory = can(user, 'posts', 'view_history');

----

Gán role qua svc-admin
=======================

Field ``roles`` trong schema của trang admin users:

.. code-block:: js

    {
        field: 'roles',
        label: 'Roles',
        type: 'text',
        // Lưu pipe-separated: 'posts.read|posts.create|posts.update|...'
        // Chỉ users.admin hoặc admin mới được sửa field này
    }

Gán preset nhanh khi tạo user:

.. code-block:: js

    // Gán Editor preset cho posts
    const rolesString = ROLE_PRESETS.editor('posts').join('|');
    await updateDoc(userRef, { roles: rolesString });

    // Kết hợp nhiều bảng
    const rolesString = [
        ...ROLE_PRESETS.editor('posts'),
        ...ROLE_PRESETS.moderator('orders'),
    ].join('|');

Parse để hiển thị badge (nhóm theo bảng):

.. code-block:: js

    const tokens = (roles || '').split('|').filter(Boolean);

    if (tokens.includes('admin')) {
        // hiển thị 1 badge 'Super Admin'
    } else {
        // nhóm theo table prefix
        const byTable = tokens.reduce((acc, r) => {
            if (!r.includes('.')) return acc;
            const dot   = r.indexOf('.');
            const table = r.slice(0, dot);
            const cap   = r.slice(dot + 1);
            (acc[table] ??= []).push(cap);
            return acc;
        }, {});
        // { posts: ['read','create','update',...], orders: ['read'] }

        // Đối chiếu với ROLE_PRESETS để hiển thị tên preset nếu khớp
        for (const [table, caps] of Object.entries(byTable)) {
            for (const [preset, fn] of Object.entries(ROLE_PRESETS)) {
                if (fn(table).join('|') === caps.map(c => `${table}.${c}`).join('|')) {
                    console.log(`${table} → ${preset}`);
                }
            }
        }
    }
