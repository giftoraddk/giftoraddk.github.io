===========
ARCHITECT
===========

Tổng quan kiến trúc hệ thống — từ cấu trúc thư mục đến luồng dữ liệu.

.. contents:: Mục lục
   :depth: 2
   :local:

----

Tổng quan
=========

Hệ thống là ứng dụng **Astro 6** (``output: 'static'``) kết hợp **Lit 3 Web Components** theo mô hình **micro service UI**.
Mỗi tính năng UI là một custom element độc lập — nhận props, phát event, quản lý state nội bộ qua ``conductor``.
Dữ liệu được fetch và cache bởi ``conductor`` (IndexedDB, 5-phút TTL, retry 3×).
Card grid được render bởi ``web-boxs`` với cấu hình khai báo JSON.

Stack chính:

- **Astro 6** — static site builder, SSR-on-build
- **Lit 3** — Web Components với Shadow DOM
- **Tailwind CSS 4 + ApexUI** — theming qua ``data-theme="dark|light"`` trên ``<html>``
- **KeenSlider** — carousel trong ``web-slider``
- **vanilla-calendar-pro** — date picker trong ``web-datetime``
- **Leaflet + Nominatim** — bản đồ trong ``web-location``

Path alias: ``@/`` → ``src/``

----

Ba hệ thống cốt lõi
===================

+-------------------+----------------------------------+-----------------------------------------------+
| Hệ thống          | Source                           | Vai trò                                       |
+===================+==================================+===============================================+
| **Conductor**     | ``src/services/conductor.js``    | Shared nanostores atom + IndexedDB cache.     |
|                   |                                  | Tất cả service dùng chung 1 store; mỗi        |
|                   |                                  | service sở hữu 1 ``section`` trong            |
|                   |                                  | ``state.sections[]`` keyed by id.             |
+-------------------+----------------------------------+-----------------------------------------------+
| **Web Boxs**      | ``src/webs/apex/web-boxs.js``    | Declarative card-grid renderer. Nhận          |
|                   |                                  | ``data[]`` + ``config`` object; tùy chọn      |
|                   |                                  | bọc KeenSlider. Config files ở                |
|                   |                                  | ``src/sections/<domain>/``.                   |
+-------------------+----------------------------------+-----------------------------------------------+
| **Micro Services**| ``src/webs/<domain>/svc-*.js``   | Self-contained Lit custom elements. Mỗi       |
|                   |                                  | element đọc/ghi section riêng trong           |
|                   |                                  | conductor và dispatch event lên document.     |
+-------------------+----------------------------------+-----------------------------------------------+

----

Cấu trúc thư mục
=================

.. code-block:: text

   src/
   ├── layouts/           # Core.astro, Shop.astro (page shells)
   ├── pages/             # Astro routes — mỗi file = 1 URL
   │   ├── landing/index.astro
   │   ├── gift/index.astro
   │   ├── shop/index.astro
   │   └── ...
   ├── sections/          # Section data + config files
   │   ├── hero/modern/horiBase.js
   │   ├── features/spatial/cardIntro.js
   │   └── <domain>/<variant>/<name>.js
   ├── modules/           # variant + views cho từng page (KHÔNG nằm trong services/)
   │   ├── shop-page.js       # 1 file duy nhất — variant + views cho /shop/*
   │   └── landing/*.js       # 1 file/page — home.js, gift.js, spatial.js, ... cho /landing/* + /gift/
   ├── services/
   │   ├── conductor.js      # atom store + IndexedDB + fetch
   │   ├── firestore.js      # Firebase app + FirestoreAdapter (tất cả Firebase specifics)
   │   ├── crud.js           # utilities + loadData + createService (FirestoreService / SqlService)
   │   ├── auth.js           # localStorage auth
   │   └── helper.js         # getStyleOpts, utilities
   └── webs/
       ├── apex/          # Shared primitives (web-boxs, web-cell, web-board, ...)
       └── <domain>/      # Domain micro-services (svc-cart, svc-pay-warden, ...)
           ├── svc-*.js
           └── tools/service.js

----

Layer Diagram
=============

.. code-block:: text

   ┌─ Astro Page (.astro) ──────────────────────────────────────────────┐
   │  import { variant, views } from '@/modules/shop-page.js'            │
   │                              hoặc '@/modules/landing/<name>.js'     │
   │  currentView = views.find(v => v.href === '/...')                   │
   │  → JSON.stringify(currentView.sections) → attr <web-board>          │
   └──────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ web-board ────────────────────────────────────────────────────────┐
   │  Nhận sections[], sort, restore layout từ IndexedDB                 │
   │  fetch dataSrc/dataTable → IndexedDB cache 5 min per section        │
   │  render <web-boxs config data col> × N sections                    │
   └──────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ web-boxs ─────────────────────────────────────────────────────────┐
   │  _config = config[theme]     ← chọn dark/light variant             │
   │  _applyFilter(data)          ← tag + text search                   │
   │  IntersectionObserver        ← anime khi scroll vào viewport       │
   │  7 render modes (tiers > masonry > slider > steps > tabs >         │
   │                  expansion > grid)                                  │
   └──────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ web-box ──────────────────────────────────────────────────────────┐
   │  groupKey[i] × groupCol[i] → CSS grid cells                        │
   │  groupStyle split: position props → host, rest → inner div         │
   │  render <web-cell makes[i]> × N groups                             │
   └──────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ web-cell ─────────────────────────────────────────────────────────┐
   │  bit / bitLocal → giá trị thực (dot-path)                          │
   │  DynamicComponent.render('web-{mode}', props)                      │
   │  dispatch 'cell-action' lên document                               │
   └──────────────────────────────────────────────────────────────────  ┘

----

Service Layer
=============

.. code-block:: text

   ┌─ service.js (re-export hub + domain logic) ────────────────────────┐
   │  Re-exports: state, make, get, patch, all, setFilter               │
   │  Re-exports: shopSetup (= conductor.setup)                         │
   │  Domain:     setup(), init(), addItem(), submit(), onToast()       │
   └────────────────────────────────────────────────────────────────────┘
             ↓                              ↓
   ┌─ conductor.js ──────────┐   ┌─ stats.js (pure fns) ──────────────┐
   │  atom({ sections: [] }) │   │  computeStats, computeOrderStats    │
   │  make / get / patch     │   │  computeInventoryStats              │
   │  all / setup / subscribe│   └────────────────────────────────────┘
   │  setFilter / sift       │
   └─────────────────────────┘
             ↓                              ↓
   ┌─ storager.js (IndexedDB) ──┐  ┌─ crud.js (loader + CRUD) ──────────┐
   │  get / set(ttl) / remove   │  │  loadData({ dataSrc, dataTable })  │
   └────────────────────────────┘  │  createService(table, dataSrc?)    │
                                   │  → FirestoreService | SqlService   │
                                   │  registerAdapter / db()            │
                                   └────────────────────────────────────┘
                                             ↓
                                   ┌─ firestore.js ──────────────────────┐
                                   │  firebaseApp (merged từ firebase.js) │
                                   │  FirestoreAdapter + firestoreAdapter │
                                   └────────────────────────────────────┘

----

Theming
=======

**ApexUI** cung cấp ``data-theme`` trên ``<html>``.

CSS variables được sinh từ props ``mainColors``, ``textColor`` trên cả ``web-boxs`` và ``web-cell``:

+---------------------------+-------------------------------------+
| Variable                  | Nguồn                               |
+===========================+=====================================+
| ``--color-primary``       | ``mainColors[0]``                   |
+---------------------------+-------------------------------------+
| ``--color-secondary``     | ``mainColors[1]``                   |
+---------------------------+-------------------------------------+
| ``--color-accent``        | ``mainColors[2]``                   |
+---------------------------+-------------------------------------+
| ``--color-info``          | ``mainColors[3]``                   |
+---------------------------+-------------------------------------+
| ``--color-warning``       | ``mainColors[4]``                   |
+---------------------------+-------------------------------------+
| ``--color-base-100/200/300`` | từ ApexUI theme (``data-theme``) |
+---------------------------+-------------------------------------+
| ``--color-base-content``  | ``textColor``                       |
+---------------------------+-------------------------------------+

``mainColors`` dùng **pipe ``|``** làm separator, thứ tự: ``primary|secondary|accent|info|warning``.

``ui`` variant: ``modern`` (mặc định) | ``spatial`` (glassmorphism + ``backdrop-filter: blur()``).

**Quy tắc màu bắt buộc:** chỉ dùng CSS variable hệ thống trong config (``var(--color-primary)``, ``var(--color-base-100/200/300)``, ``var(--color-base-content)``). Không hardcode hex/rgb. Nền trang trí (decorative background) dùng ``bg`` (``getStyleOpts`` + ``<web-bg>``), không dùng override màu nền phẳng.

**web-bg — animation (``move`` prop):**
``web-bg`` hỗ trợ loop animation blob qua ``move``:

- ``''`` — tắt (mặc định)
- ``'swap'`` — blob di chuyển sang vị trí nhau theo vòng
- ``'pulse'`` — blob mờ dần rồi hiện lại với stagger delay

Dùng qua helper: ``getStyleOpts({ blobMove: 'pulse' })`` hoặc gán trực tiếp ``.move="pulse"`` trên ``<web-bg>``.

----

Luồng dữ liệu tổng quan
========================

.. code-block:: text

   1. BUILD TIME
      Astro page import '@/modules/shop-page.js' hoặc '@/modules/landing/<name>.js'
        → variant (ui/theme/colors)
        → views[i].sections[] (id, dataSrc|dataTable|data, config, col, sort)

   2. RUNTIME — Page Load
      <web-board sections="[...]">
        → _sortBySortField()        sort theo section.sort
        → _dcLoadLayout()           restore drag/resize từ IndexedDB
        → _dcLoadSections()         fetch dataSrc/dataTable per section
             ↓
          conductor.all(sectionId, { url, ttl: 300s, retry: 3 })
             ↓
          IndexedDB hit?  → dùng cache
          IndexedDB miss? → fetch API → lưu cache → trả về data

   3. RUNTIME — Render
      web-board render <web-boxs config data>
        → web-boxs chọn config[theme]
        → _applyFilter → lọc data
        → IntersectionObserver kích hoạt anime
        → _renderTiers | _renderGrid | _renderSlider | ...
             ↓
          web-box (1 item)
             ↓
          web-cell (1 group trong item)
             ↓
          DynamicComponent.render('web-{mode}', props)

   4. RUNTIME — Events
      User click/interact → web-cell dispatch 'cell-action'
        → bubbles + composed → vượt Shadow DOM
        → service.js lắng nghe, gọi conductor.patch / conductor.all
        → subscribe(sectionId, fn) → Lit re-render

Xem chi tiết từng bước trong ``docs/DATAFLOW.rst``.

----

Micro Service Pattern
=====================

Mỗi domain có cấu trúc:

.. code-block:: text

   src/webs/<domain>/
   ├── svc-<name>.js          # Lit custom element chính
   ├── svc-<name>-*.js        # Sub-components (nếu có)
   ├── styles/
   │   └── <name>.css
   └── tools/
       └── service.js         # Re-export hub: conductor API + domain logic

``service.js`` phải đăng ký event listeners **đồng bộ** trước bất kỳ ``await`` nào.

Standard props cho ``svc-*``:

.. code-block:: js

   static properties = {
       ui: { type: String }, theme: { type: String },
       mainColors: { type: String }, bg: { type: Object }, textColor: { type: String },
       value: {}, actived: {}, service: { type: String },
       _data: { state: true }, _actived: { state: true },
   }

Method naming:

+----------+-----------------------------------------------+
| Prefix   | Vai trò                                       |
+==========+===============================================+
| ``_dc*`` | Data Core — connectedCallback init, setup     |
+----------+-----------------------------------------------+
| ``_dh*`` | Data Head — xử lý user input / DOM events     |
+----------+-----------------------------------------------+
| ``_df*`` | Data Footer — gọi service actions             |
+----------+-----------------------------------------------+
| ``_com*``| Computed getters (no side effects)            |
+----------+-----------------------------------------------+
| ``_rb*`` | Render Body — major layout blocks             |
+----------+-----------------------------------------------+
| ``_rf*`` | Render Fragment — single item                 |
+----------+-----------------------------------------------+

Comment Convention — 2-Level Flow
----------------------------------

Hàm có side-effect thật (validate rồi ghi DB, gọi service, gửi notify...) viết theo khung tối
giản: 1 docstring ``Flow: Input -> Output`` + các bước đánh số 2 cấp — thay cho prose comment dài
dòng. Chỉ áp dụng cho hàm MỚI viết hoặc refactor đáng kể; không bắt buộc rewrite lại comment cũ
trong code hiện có.

.. code-block:: js

   /**
    * Flow đăng ký tài khoản: RegisterRequest -> UserResponse
    */
   async function registerUser(reqData) {
       // [1] CHECK: Validate dữ liệu đầu vào
       //   [1.a] IF_INVALID: Trả về lỗi nếu thiếu thông tin bắt buộc
       if (!reqData.email || !reqData.password) {
           throw new BadRequestError('Missing required fields')
       }
       //   [1.b] IF_EXISTS: Check trùng email trong hệ thống
       const existingUser = await findUserByEmail(reqData.email)
       if (existingUser) throw new ConflictError('Email already registered')

       // [2] PROCESS: Chuẩn hóa và mã hóa dữ liệu (thuần, không I/O)
       //   [2.a] HASH: Mã hóa mật khẩu bảo mật
       const hashedPassword = await bcrypt.hash(reqData.password, 10)
       //   [2.b] FORMAT: Chuẩn hóa định dạng email (viết thường, trim)
       const cleanEmail = reqData.email.toLowerCase().trim()

       // [3] EXECUTE: Ghi Database & tạo side-effect
       //   [3.a] SAVE_DB: Tạo record người dùng mới
       const newUser = await createUserRecord({ email: cleanEmail, password: hashedPassword })
       //   [3.b] NOTIFY: Gửi email kích hoạt (fire-and-forget, không chặn flow)
       sendActivationEmail(newUser.id).catch(logger.error)

       // [4] RETURN: Trả về thông tin user đã tạo thành công
       return sanitizeUserResponse(newUser)
   }

4 bước cấp 1 — cố định thứ tự, bỏ bước nào không áp dụng cho hàm đó, không thêm bước khác:

- ``[1] CHECK`` — validate đầu vào: required field, trùng lặp, quyền hạn
- ``[2] PROCESS`` — chuẩn hóa/biến đổi/tính toán dữ liệu (thuần, không I/O)
- ``[3] EXECUTE`` — side-effect thật: ghi DB, gọi service, gửi notify/email
- ``[4] RETURN`` — trả kết quả cuối cùng

Bước cấp 2 (``[N.a]``, ``[N.b]``...) là TÙY CHỌN — chỉ thêm khi 1 bước cấp 1 có ≥2 nhánh xử lý
đáng kể tách biệt nhau. Nhãn cấp 2 gợi ý theo ngữ cảnh, không phải danh sách cố định — hay dùng:
``IF_INVALID``, ``IF_EXISTS``, ``FORMAT``, ``CALC``, ``HASH``, ``SAVE_DB``, ``NOTIFY``,
``HANDLE_ERR``.

Ví dụ thực tế trong repo: ``_dfOnPeerUnlinked``/``_dfReconcileChat``/``_dfEnsureMeshLinks`` trong
``src/webs/bay/svc-bay.js`` (bản rút gọn 1 cấp — chưa có bước con ``[N.a]``, vì các hàm đó mỗi
bước chỉ có đúng 1 nhánh).

----

Auth Service
============

.. code-block:: js

   import { auth } from '@/services/auth.js'

   auth.set(user, token)    // lưu vào localStorage
   auth.get()               // đọc user object; null nếu chưa đăng nhập
   auth.clear()             // xóa user + token
   auth.isLoggedIn()        // boolean
   auth.isAdmin()           // status === 'active' && roles includes 'admin'
   auth.hasRole('editor')   // status === 'active' && roles includes role

Storage keys: ``db_auth`` (JSON), ``db_token`` (string).

----

Tài liệu liên quan
==================

+-------------------------------+----------------------------------------------+
| File                          | Nội dung                                     |
+===============================+==============================================+
| ``docs/DATAFLOW.rst``         | Chi tiết từng bước luồng dữ liệu            |
+-------------------------------+----------------------------------------------+
| ``docs/web-apex.rst``         | API reference tất cả component apex/        |
+-------------------------------+----------------------------------------------+
| ``guide/fetch-store-overview``| ``all()`` opts, retry, cache, response shape |
+-------------------------------+----------------------------------------------+
| ``guide/micro-service-overview``| Skeleton component, conductor API         |
+-------------------------------+----------------------------------------------+
| ``guide/webboxs-overview``    | Props, cell modes, animation, slider config  |
+-------------------------------+----------------------------------------------+
| ``guide/database-overview``   | Database DDL — CREATE TABLE, Field Reference |
+-------------------------------+----------------------------------------------+
