===========
SERVICES
===========

Fetch dữ liệu, cache, retry và state management qua ``conductor.js`` và ``crud.js``.

Sources: ``src/services/conductor.js``, ``src/services/crud.js``

.. contents:: Mục lục
   :depth: 2
   :local:

----

Luồng xử lý ``all()``
======================

.. code-block:: text

   all(sectionId, { dataSrc?, dataTable?, cache? })
     │
     ├─ section đã có data trong state (RAM)?
     │     └─ có → return ngay — KHÔNG fetch, KHÔNG chạm IndexedDB
     │
     └─ chưa có → loadData({ dataSrc, dataTable, cache })   (crud.js)
           │
           ├─ IndexedDB hit (chưa hết TTL) → trả về ngay
           └─ miss/hết hạn → fetch thật
                 ├─ REST (dataSrc) → lỗi → retry tối đa 3 lần
                 │     └─ delay: 500ms × 2^attempt (exponential back-off)
                 ├─ Firestore (dataTable) → lỗi bị cô lập theo từng collection, không retry
                 └─ thành công → lưu IndexedDB
           │
           └─ data.length > 0 → ghi vào section.data

----

``all(sectionId, opts?)``
=========================

**Opts**

=========================  ===============  ==============  ============================================
Opt                        Type             Default         Mô tả
=========================  ===============  ==============  ============================================
``dataSrc`` (hoặc ``url``) String           —               REST endpoint; ``url`` là alias cũ
``dataTable``               String           ``''``          Firestore collection (hoặc REST resource nếu đi kèm ``dataSrc``)
``cache``                   Number (phút)    ``5``           TTL cache IndexedDB; ``0`` = tắt cache
=========================  ===============  ==============  ============================================

Thiếu cả ``dataSrc``/``url`` lẫn ``dataTable`` → hàm return ngay, không làm gì.

Không còn ``cacheKey`` tùy chỉnh — cache key tự sinh từ ``dataSrc``/``dataTable`` qua ``loadKey()`` (``crud.js``), đảm bảo ``conductor.all()`` và ``crud.loadData()`` luôn dùng chung 1 cache entry cho cùng 1 nguồn.

Retry (3 lần) và delay exponential là cố định — không cấu hình được. Retry là hành vi của ``crud.js`` (chỉ áp dụng khi fetch REST qua ``dataSrc``), không phải logic riêng của conductor.

**Retry back-off (REST only)**

=========  ========
Lần retry  Delay
=========  ========
1          500 ms
2          1 000 ms
3          2 000 ms
=========  ========

**Cache — IndexedDB via ``storager.js``**

- ``conductor.all()`` và ``crud.loadData()`` dùng chung 1 lớp cache (``withCache()`` trong ``crud.js``) — cache key tự sinh, không truyền tay được.
- Cache đọc trước khi fetch thật — hit (chưa hết TTL) → không gửi request.
- ``cache`` tính theo **phút**, mặc định ``5``; ``0`` = tắt cache (luôn fetch trực tiếp).
- Xóa thủ công: ``Storager.remove(key)`` từ ``@/services/storager.js`` (key = ``loadKey(dataSrc, dataTable)``) — conductor không có ``invalidate()``.

**Lưu ý: không có ``FetchState`` atom**

Conductor không expose trạng thái fetch (``loading`` / ``success`` / ``failure``).
Trạng thái được suy ra gián tiếp: ``section.data`` có dữ liệu hay chưa sau khi ``all()`` resolve.

----

``sift()`` — Lọc client-side
=============================

Đọc ``section.data`` hiện tại, trả về mảng đã lọc — không gọi API, không thay đổi store.

.. code-block:: js

   import { sift } from '@/services/conductor.js'

   // Lọc theo field chính xác
   const results = sift('products', { tags: ['coffee', 'hot'] }, 'absolute')

   // Tìm kiếm text (key đặc biệt 'q')
   const found = sift('products', { q: 'espresso' }, 'like')

**Tham số**

+------------+-----------------------------+-------------------------------------------------------+
| Tham số    | Type                        | Mô tả                                                 |
+============+=============================+=======================================================+
| sectionId  | String                      | Section cần lọc                                       |
+------------+-----------------------------+-------------------------------------------------------+
| params     | Object                      | Các field cần khớp; value rỗng/null/array rỗng bị bỏ qua |
+------------+-----------------------------+-------------------------------------------------------+
| operator   | ``'absolute'`` ``'like'``   | ``absolute`` = khớp chính xác; ``like`` = chứa chuỗi |
+------------+-----------------------------+-------------------------------------------------------+

Trả về ``[]`` nếu section không tồn tại hoặc ``section.data`` không phải array.

----

Conductor API đầy đủ
====================

.. code-block:: js

   import { state, setup, all, make, patch, get, subscribe, sift }
     from '@/services/conductor.js'

   state                             // atom<{ apiUrl?, sections: Section[] }> — nguồn sự thật trung tâm
   setup(initialState, opts?)        // khởi tạo + merge IndexedDB, giữ section đang có trong RAM
   all(sectionId, opts)              // fetch (nếu section chưa có data) + cache + ghi section.data
   make(sectionId, fields)           // upsert section — tạo mới hoặc merge nếu đã có
   patch(partial)                    // merge vào ROOT-level state (apiUrl, ui, theme…) — không đụng sections
   get(sectionId)                    // đọc section, null nếu không tồn tại
   subscribe(sectionId, fn)          // lắng nghe 1 section — trả về unsub()
   sift(sectionId, params, op)       // lọc client-side section.data hiện tại, không re-fetch

``patch()`` không nhận ``sectionId`` — nó cập nhật field ở root state (``apiUrl``, ``ui``, ``theme``…), khác với ``make(sectionId, fields)`` (upsert 1 section).

----

Usage Patterns
==============

**Pattern 1 — Gọi ``all()`` trực tiếp**

.. code-block:: js

   import { all } from '@/services/conductor.js'

   await all('products', { dataTable: 'products' })                          // Firestore
   await all('news',     { dataSrc: '/api/news.json' })                      // REST
   await all('orders',   { dataSrc: '/api/orders.json', cache: 0 })          // tắt cache

   // Nhiều section khác nhau load cùng 1 collection sẽ tự dùng chung state + cache
   // — không cần override cache key thủ công (key tự sinh từ dataSrc/dataTable)

**Pattern 2 — Batch nhiều sections (trong ``service.js``)**

.. code-block:: js

   const SECTION_IDS  = ['orders', 'products', 'staff', 'inventory']
   const DEFAULT_URLS = [
     '/api/orders.json',
     '/api/products.json',
     '/api/staff.json',
     '/api/inventory.json',
   ]

   export async function load(dataApi = '') {
     const urls = dataApi ? dataApi.split('|') : DEFAULT_URLS
     await Promise.all(SECTION_IDS.map((id, i) => {
       const url = urls[i]
       return url ? all(id, { url }) : Promise.resolve()
     }))
   }

``dataSrc`` là string pipe-separated từ prop component — cho phép override URL từ config.

**Pattern 3 — Subscribe trong Lit component**

Đăng ký ``subscribe()`` **trước** khi gọi ``all()`` để không miss dữ liệu.

.. code-block:: js

   import { subscribe, all } from '@/services/conductor.js'

   // Vanilla JS
   const unsub = subscribe('products', section => {
     if (section?.data) renderList(section.data)
   })
   await all('products', { url: '/api/products.json' })
   unsub()  // dọn dẹp

   // Trong Lit component
   connectedCallback() {
     super.connectedCallback()
     this._unsub = subscribe(this.service, s => {
       if (s?.data) this._data = s.data
     })
   }

   disconnectedCallback() {
     super.disconnectedCallback()
     this._unsub?.()
   }

**Pattern 4 — ``dataSrc`` / ``dataTable`` prop trên ``svc-*`` component**

``web-board`` tự động pass ``dataSrc`` / ``dataTable`` từ section config xuống component khi ``component`` được khai báo.

.. code-block:: js

   // shop-page.js — khai báo section (REST)
   {
     id:        'stats/main',
     component: 'svc-stats',
     dataSrc:   'https://localhost:5000/api/',   // base API URL
     dataTable: 'orders|products|staff',         // resource (pipe-sep cho multi-load)
   }

   // shop-page.js — khai báo section (Firestore)
   {
     id:        'products/shop/card',
     component: 'svc-orders',
     dataTable: 'orders',   // Firestore collection (không có dataSrc)
   }

   // web-board render thành:
   // <svc-stats dataSrc="https://localhost:5000/api/" dataTable="orders|..." ...>

   // svc-stats nhận prop dataSrc và gọi trong _dcInit():
   async _dcInit() {
     await load(this.dataSrc)  // load() từ tools/service.js
   }

----

.. note::

   Trong ``service.js``, event listeners phải được đăng ký **đồng bộ** trước bất kỳ ``await`` nào.
   Đặt ``addEventListener`` sau ``await`` sẽ miss event đầu tiên.

   .. code-block:: js

      // ✓ Đúng
      document.addEventListener('cell-action', handler)
      await load(this.dataSrc)

      // ✗ Sai — miss event nếu action fire trước khi await resolve
      await load(this.dataSrc)
      document.addEventListener('cell-action', handler)

----

``crud.js`` + ``firestore.js`` — Loader + CRUD
==============================================

``src/services/crud.js`` là loader + CRUD layer độc lập — không dùng conductor store.
Dùng cho ``svc-*`` component cần đọc/ghi thẳng từ Firestore hoặc API.
Mọi chi tiết Firebase được cô lập trong ``src/services/firestore.js``.

Chi tiết đầy đủ: ``docs/CRUD.rst``.

**Cách dùng cơ bản:**

.. code-block:: js

   import { createService, loadData } from '@/services/crud'

   // Firestore — bind table, dùng methods
   const svc = createService('posts')
   const rows  = await svc.findAll({ filters: { status: 'active' } })
   const doc   = await svc.create({ title: 'Hello', status: 'draft' })
   await svc.update('abc', { status: 'published', updated_at: await svc.now() })
   await svc.delete('abc')                           // soft delete

   // REST
   const svc = createService('products', 'https://localhost:5000/api/')
   const { data, total } = await svc.findAll({ page: 1, limit: 20 })

   // Read-only load (không cần auth / write)
   const items = await loadData({ dataTable: 'products' })
   const items = await loadData({ dataTable: 'orders~items' })
   const items = await loadData({ dataTable: 'orders|products' })

**Quy tắc ưu tiên ``loadData``:**

+----------------------------------------------+--------------------------------------------------+
| Params                                       | Hành vi                                          |
+==============================================+==================================================+
| ``dataSrc`` + ``dataTable``                  | REST: fetch(``dataSrc`` + ``/`` + ``dataTable``) |
+----------------------------------------------+--------------------------------------------------+
| ``dataTable`` only                           | Firestore collection (pipe ``|`` tilde ``~``)    |
+----------------------------------------------+--------------------------------------------------+
| ``dataSrc`` only                             | REST: fetch(``dataSrc``) — full URL              |
+----------------------------------------------+--------------------------------------------------+

**Pattern trong ``svc-*`` Lit component:**

.. code-block:: js

   // Getter trả về service mới mỗi khi _table thay đổi
   get _svc() { return createService(this._table); }

   async _dcLoad() {
     this._data = await this._svc.findAll(this._comQueryOpts());
   }
   async _dfSave(flat) {
     const now = await this._svc.now();
     await this._svc.set(newId, { ...flat, created_at: now });  // tạo mới ID đã biết
     await this._svc.update(id, { ...flat, updated_at: now });  // cập nhật
   }

**So sánh ``crud.js loadData()`` vs ``conductor.all()``**

``conductor.all()`` thực chất là 1 lớp mỏng bọc quanh ``crud.loadData()`` — thêm 1 tầng "đã có trong state RAM chưa" trước khi chạm tới cache/network.

+-----------------------------+------------------------------------+-----------------------------------------------+
| Tiêu chí                   | ``crud.js loadData()``             | ``conductor.all()``                            |
+=============================+====================================+=================================================+
| Mục đích                    | Trả data trực tiếp cho caller      | Load + ghi vào section, chia sẻ toàn app        |
+-----------------------------+------------------------------------+-------------------------------------------------+
| Nguồn dữ liệu               | Firestore (``dataTable``) + REST   | Giống hệt — gọi thẳng ``loadData()`` bên dưới   |
|                              | (``dataSrc``)                      |                                                 |
+-----------------------------+------------------------------------+-------------------------------------------------+
| Cache                       | IndexedDB qua ``withCache()``,     | Kế thừa từ ``loadData()``, CỘNG THÊM short-     |
|                              | mặc định 5 phút                    | circuit ở state RAM (bỏ qua cả cache nếu section |
|                              |                                     | đã có data)                                     |
+-----------------------------+------------------------------------+-------------------------------------------------+
| Retry                       | REST: 3× exponential back-off;     | Kế thừa từ ``loadData()``                       |
|                              | Firestore: không                   |                                                 |
+-----------------------------+------------------------------------+-------------------------------------------------+
| Error isolation             | Per-segment (pipe)                 | Kế thừa từ ``loadData()``                       |
+-----------------------------+------------------------------------+-------------------------------------------------+
| Kết quả                     | ``Promise<Array>`` trả trực tiếp   | Ghi vào ``section.data``, đọc qua ``get(id)``   |
+-----------------------------+------------------------------------+-------------------------------------------------+
| Dùng khi                    | Cần data ngay (build-time, một     | Component runtime cần chia sẻ / cache chéo      |
|                              | lần, không cần chia sẻ state)      | nhiều component (``web-boxs``, ``web-board``,   |
|                              |                                     | ``svc-*``)                                      |
+-----------------------------+------------------------------------+-------------------------------------------------+
