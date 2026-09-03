AUTH_CONTEXT
===========

Tài liệu mô tả luồng hoạt động của hệ thống xác thực và phân quyền admin.

.. contents::
   :local:
   :depth: 2


Tổng quan kiến trúc
-------------------

Hệ thống gồm 5 thành phần phối hợp:

+---------------------+--------------------------------------------------+
| Thành phần          | Vai trò                                          |
+=====================+==================================================+
| ``service.js``      | Cache auth state (IndexedDB, TTL 24h)            |
+---------------------+--------------------------------------------------+
| ``svc-login``       | Form đăng nhập, xác thực Firestore               |
+---------------------+--------------------------------------------------+
| ``svc-logged``      | Guard trang admin, badge user, logout            |
+---------------------+--------------------------------------------------+
| ``svc-logged-nav``  | Menu điều hướng lọc theo quyền                   |
+---------------------+--------------------------------------------------+
| ``svc-roles``       | Modal phân quyền user theo bảng dữ liệu          |
+---------------------+--------------------------------------------------+


Luồng đăng nhập (Login Flow)
-----------------------------

::

    Trình duyệt                svc-login                  Firestore
         │                         │                           │
         │  truy cập /admin/login  │                           │
         ├────────────────────────►│                           │
         │                         │ auth.get() từ IndexedDB   │
         │                         ├──────────────────────────►│
         │                         │◄── user đã tồn tại? ──────┤
         │                         │                           │
         │   [đã đăng nhập] ──────►│ redirect → pathLink       │
         │                         │                           │
         │  submit email+password  │                           │
         ├────────────────────────►│                           │
         │                         │  query users              │
         │                         │  by email OR username     │
         │                         ├──────────────────────────►│
         │                         │◄── user doc ──────────────┤
         │                         │                           │
         │                         │ validate:                 │
         │                         │  • user tồn tại?          │
         │                         │  • status === 'active'?   │
         │                         │  • password đúng?         │
         │                         │  • có ít nhất 1 role?     │
         │                         │                           │
         │  [thất bại] ───────────►│ hiển thị lỗi              │
         │                         │                           │
         │                         │ auth.set(user, token)     │
         │                         │ → lưu vào IndexedDB       │
         │                         │                           │
         │◄── redirect pathLink ───│                           │

**Điều kiện để đăng nhập thành công:**

1. User tồn tại trong Firestore collection ``users``
2. ``status === 'active'``
3. Password hợp lệ (``apexDecode`` hoặc plain-text fallback)
4. ``roles`` chứa ``'admin'`` HOẶC ít nhất 1 permission dạng ``{table}.{capability}``


Luồng bảo vệ trang admin (Page Guard)
--------------------------------------

``svc-logged`` được nhúng trong ``LayoutAdmin.astro``, chạy trên mọi trang admin::

    astro:before-swap                  astro:page-load
           │                                  │
           │ ẩn trang (visibility:hidden)      │ _dcInit()
           │ nếu page-admin-only              │
           ▼                                  ▼
                                    ┌─────────────────────┐
                                    │ meta[page-admin-only]│
                                    │ có tồn tại?          │
                                    └──────┬──────────────┘
                                           │ Có
                                           ▼
                                    auth.get() từ cache
                                           │
                              ┌────────────┴────────────┐
                              │ active + có role?        │
                              └────────────┬────────────┘
                                    Không  │  Có
                                    ▼      ▼
                              redirect   hiển thị trang
                              /login     + badge user
                              ?redirect=
                              current

**Lọc quyền truy cập theo menu:**

Với user không phải admin, ``svc-logged`` kiểm tra ``menus`` prop để tìm ``require`` của trang hiện tại::

    menus = [
      { href: "/admin/posts",    require: "posts"    },
      { href: "/admin/products", require: "products" },
      ...
    ]

    Nếu user không có role bắt đầu bằng "{require}." → redirect đến menu đầu tiên user có quyền.

**Ví dụ:** User có ``roles = "posts.read|posts.update"``

- Được vào ``/admin/posts`` (require = ``posts``) ✓
- Bị chặn tại ``/admin/products`` → redirect ``/admin/posts``


Luồng hiển thị menu (Navigation Filter)
-----------------------------------------

``svc-logged-nav`` lọc menu dựa trên roles của user::

    connectedCallback
         │
         ├── parse menus JSON
         ├── auth.get() → user
         │
         ├── [admin] → hiển thị tất cả menu items
         │
         └── [không phải admin] → lọc:
                _hasAccess(roles, require)
                    = roles.includes(require)
                    OR roles.some(r => r.startsWith(require + '.'))

    Dispatch: CustomEvent('admin-nav-ready', { detail: { isAdmin } })

**Ví dụ lọc:**

+------------------+-------------------------+-------------------+
| require (menu)   | roles của user          | Kết quả           |
+==================+=========================+===================+
| ``posts``        | ``posts.read``          | ✓ Hiển thị        |
+------------------+-------------------------+-------------------+
| ``posts``        | ``posts.read|posts.update`` | ✓ Hiển thị    |
+------------------+-------------------------+-------------------+
| ``products``     | ``posts.read``          | ✗ Ẩn              |
+------------------+-------------------------+-------------------+
| ``users``        | ``admin``               | ✓ Hiển thị (admin)|
+------------------+-------------------------+-------------------+


Mô hình phân quyền (Permission Model)
--------------------------------------

**Cấu trúc roles string**

Lưu trong Firestore ``users.roles`` dạng pipe-separated::

    "admin"
    "posts.read|posts.update"
    "posts.read|posts.create|products.read|products.update"

**Hai cấp quyền:**

1. **Global admin** — role ``admin``: bypass tất cả kiểm tra, có quyền toàn bộ hệ thống.

2. **Table-level capabilities** — dạng ``{table}.{capability}``:

   - ``{table}.read``
   - ``{table}.create``
   - ``{table}.update``
   - ``{table}.delete``
   - ``{table}.publish`` / ``{table}.unpublish``
   - ``{table}.approve`` / ``{table}.reject``
   - ... (xem đầy đủ trong ROLE_PRESETS)

**Presets** — nhóm capabilities có sẵn để gán nhanh qua UI ``svc-roles``:

+---------------+-------------------------------------------------+
| Preset        | Capabilities chính                              |
+===============+=================================================+
| editor        | read, create, update, save_draft, submit_review,|
|               | withdraw_review, upload_media, view_history     |
+---------------+-------------------------------------------------+
| moderator     | read, view_history, comment, approve, reject,   |
|               | request_edit, publish, unpublish, schedule,     |
|               | unschedule, manage_versions                     |
+---------------+-------------------------------------------------+
| admin         | tất cả capabilities của bảng đó (editor +       |
|               | moderator + delete, import, export,             |
|               | manage_status)                                  |
+---------------+-------------------------------------------------+

.. note::

   ``admin`` preset (table-level) ≠ ``admin`` role (global).
   ``posts.admin`` là preset trong context bảng ``posts``;
   ``admin`` trong roles string là Super Admin.


Luồng phân quyền qua svc-roles
--------------------------------

``svc-roles`` chỉ render nếu ``auth.isAdmin() === true``::

    [Admin mở modal]
          │
          ├── _dcLoad() → fetch tất cả users từ Firestore
          │
          ├── Chọn bảng từ dropdown (tables prop)
          │
          │   Với mỗi user × preset:
          │   _comCheckedPresets(user.roles, table)
          │     → kiểm tra TẤT CẢ caps của preset có trong roles không
          │     → trả về danh sách preset đang "active"
          │
          ├── Admin click checkbox
          │     │
          │     ├── _comNewRoles(roles, table, checkedPresets)
          │     │     → giữ nguyên caps của các bảng KHÁC
          │     │     → thay thế caps của bảng NÀY = union của checked presets
          │     │
          │     ├── Optimistic update UI ngay lập tức
          │     │
          │     └── updateDoc(users/{userId}, { roles, updated_at })
          │           │
          │           ├── [thành công] → giữ nguyên
          │           └── [thất bại]   → revert về roles cũ + alert

**Ví dụ rebuild roles:**

::

    Roles hiện tại : "posts.read|posts.create|products.read"
    Bảng đang xem  : "posts"
    Presets chọn   : ["editor"]

    otherCaps = ["products.read"]              ← giữ nguyên
    tableCaps = union(editor("posts"))
              = ["posts.read", "posts.create", "posts.update",
                 "posts.save_draft", "posts.submit_review",
                 "posts.withdraw_review", "posts.upload_media",
                 "posts.view_history"]

    Kết quả: "products.read|posts.read|posts.create|posts.update|..."


Kết nối props giữa LayoutAdmin và các component
-------------------------------------------------

``LayoutAdmin.astro`` là điểm duy nhất khai báo menu và bảng::

    // Single source of truth
    const allMenuItems = [
      { text: "Posts",    require: "posts",    href: "/admin/posts"    },
      { text: "Products", require: "products", href: "/admin/products" },
      ...
    ]

    const menusJson  = JSON.stringify(allMenuItems)
    const tablesJson = JSON.stringify(allMenuItems.map(m => m.require))

    ──────────────────────────────────────────────────────────────
    Component             Prop nhận        Dùng để
    ──────────────────────────────────────────────────────────────
    svc-logged-nav        menus=menusJson  Lọc + render menu links
    svc-logged            menus=menusJson  Guard + redirect logic
    svc-roles             tables=tablesJson Dropdown bảng + scope phân quyền
    ──────────────────────────────────────────────────────────────

**Lợi ích:** Thêm 1 menu mới chỉ cần thêm vào ``allMenuItems`` —
``svc-roles``, ``svc-logged``, ``svc-logged-nav`` tự động cập nhật.


Luồng hoàn chỉnh (End-to-End)
-------------------------------

::

    1. User truy cập /admin/posts
         └─► svc-logged: ẩn trang (visibility:hidden)

    2. astro:page-load
         └─► svc-logged._dcInit()
               ├── auth.get() → có user trong cache?
               │     Không → redirect /login?redirect=/admin/posts
               │     Có   → kiểm tra status + roles
               └── Có quyền → document.documentElement.style.visibility = ''

    3. Trang hiển thị
         └─► svc-logged-nav.connectedCallback()
               ├── auth.get() → lọc menus theo roles
               ├── render menu đã lọc
               └── dispatch('admin-nav-ready', { isAdmin })

    4. svc-roles.connectedCallback()
         └── auth.isAdmin()
               ├── false → render nothing
               └── true  → hiển thị FAB shield icon

    5. Admin click FAB
         └─► svc-roles._dhOpen()
               └── _dcLoad() → fetch users → render bảng phân quyền

    6. Admin toggle preset cho user X
         └─► _dhTogglePreset(userId, preset, checked)
               ├── _comNewRoles() → rebuild roles string
               ├── Optimistic UI update
               └── updateDoc(users/X, { roles }) → Firestore


Firestore collections liên quan
---------------------------------

+-------------------+-----------------------------------------------+
| Collection        | Thao tác                                      |
+===================+===============================================+
| ``users``         | ``svc-login``: getDocs (query email/username) |
+-------------------+-----------------------------------------------+
| ``users``         | ``svc-roles``: getDocs (tất cả), updateDoc    |
+-------------------+-----------------------------------------------+

**Schema fields liên quan trên document user:**

- ``email`` — dùng để đăng nhập
- ``username`` — login thay thế
- ``password`` — mã hóa bằng ``apexDecode``
- ``status`` — ``'active'`` | ``'pending'`` | ``'banned'`` | ``'suspended'``
- ``roles`` — pipe-separated string (``"admin"`` hoặc ``"posts.read|posts.update"``)
- ``display_name`` — hiển thị trên badge
- ``deleted_at`` — soft-delete marker


Auth state trong IndexedDB (service.js)
----------------------------------------

``service.js`` wrap Storager với TTL 24 giờ::

    Key: 'auth_user'  → { id, email, display_name, roles, status, ... }
    Key: 'auth_token' → string token (tùy chọn)

**API:**

+---------------------------+--------------------------------------------+
| Phương thức               | Mô tả                                      |
+===========================+============================================+
| ``auth.get()``            | Lấy user từ cache (async)                  |
+---------------------------+--------------------------------------------+
| ``auth.set(user, token)`` | Lưu user + token sau khi login             |
+---------------------------+--------------------------------------------+
| ``auth.clear()``          | Xóa cache khi logout                       |
+---------------------------+--------------------------------------------+
| ``auth.isLoggedIn()``     | Có user trong cache không                  |
+---------------------------+--------------------------------------------+
| ``auth.isAdmin()``        | active + roles.includes('admin')           |
+---------------------------+--------------------------------------------+
| ``auth.hasRole(role)``    | active + roles.includes(role)              |
+---------------------------+--------------------------------------------+

.. note::

   Tất cả components đọc auth qua ``service.js`` — không component nào
   giữ trạng thái auth riêng. Khi logout (``auth.clear()``), toàn bộ
   trang refresh và các guards tự redirect về login.
