# CRUD — Backend-agnostic Data Layer

## Files

.. code-block:: text

   src/services/firestore.js        Firebase app init only (getFirebaseApp) — xem hook/WORKER.rst
   src/services/firestore.worker.js Cloudflare Worker-proxied adapters (WorkerAdapter/D1WorkerAdapter)
   src/services/crud.js             Utilities, loadData, services, adapter registry

``crud.js`` không import trực tiếp từ ``firebase/*`` — chỉ import các adapter Worker-proxied
(``repoWorkerAdapter``/``llmWorkerAdapter``/``authWorkerAdapter``/``llmD1Adapter``) từ
``firestore.worker.js``. ``firestore.js`` chỉ còn ``getFirebaseApp()`` — dùng trực tiếp bởi ngoại lệ
duy nhất ``webs/bay/tools/service.js`` (xem hook/WORKER.rst).

---

## createService — Primary API

.. code-block:: js

   import { createService } from '@/services/crud'

   // Firestore (default)
   const svc = createService('users')

   // Custom adapter (đã registerAdapter trước)
   const svc = createService('users', '', 'myapi')

   // REST
   const svc = createService('products', 'https://localhost:5000/api/')

Chữ ký:

.. code-block:: text

   createService(table, dataSrc?, server?)
     table    — tên Firestore collection hoặc REST resource
     dataSrc  — base REST API URL; khi có → trả về SqlService
     server   — tên adapter đã register (mặc định: 'DB_ALL')

---

## FirestoreService — Methods

.. code-block:: js

   const svc = createService('posts')

   // Timestamp phía server
   const now = await svc.now()

   // Truy vấn collection (soft-deleted records bị loại tự động)
   const rows = await svc.findAll()
   const rows = await svc.findAll({ sortBy: 'created_at', order: 'desc' })
   const rows = await svc.findAll({ filters: { status: 'active' } })
   const rows = await svc.findAll({ searchField: 'title', searchValue: 'iphone', maxCount: 20 })

   // Đọc 1 document
   const row = await svc.findById('abc123')   // null nếu không tồn tại hoặc đã xoá mềm

   // Thêm mới (auto-generated ID)
   const doc = await svc.create({ title: 'Hello', status: 'draft' })
   // → { id: '<auto>', title: 'Hello', status: 'draft' }

   // Ghi tại ID đã biết (tạo mới hoặc ghi đè)
   await svc.set('my-custom-id', { title: 'Hello', ... })

   // Cập nhật một phần
   await svc.update('abc123', { status: 'published', updated_at: now })

   // Xoá mềm (đặt deleted_at + updated_at; findAll và loadData tự lọc)
   await svc.delete('abc123')

   // Batch partial-update (atomic)
   await svc.batch([
     { id: 'a1', data: { index: 0, updated_at: now } },
     { id: 'b2', data: { index: 1, updated_at: now } },
   ])

   // Realtime listener
   const unsub = await svc.listen(opts, rows => { this._data = rows }, err => console.error(err))
   // gọi unsub() để huỷ đăng ký

---

## QueryOpts (Firestore)

.. code-block:: typescript

   interface QueryOpts {
     filters?:     Record<string, any>   // equality filters  { status: 'active' }
     searchField?: string                // prefix-search field
     searchValue?: string                // prefix-search keyword
     sortBy?:      string                // field để sắp xếp
     order?:       'asc' | 'desc'        // mặc định 'asc'
     maxCount?:    number                // giới hạn số rows (Firestore limit)
   }

Lưu ý Firestore index:

* Equality filter (``filters``) — tự động có index.
* Prefix-search — cần ``orderBy`` cùng field trước range ``where``. ``_buildConstraints`` xử lý tự động.
* Kết hợp ``searchField`` + ``sortBy`` khác field → cần composite index trên Firestore Console.

---

## SqlService — Methods

.. code-block:: js

   const svc = createService('products', 'https://localhost:5000/api/')

   const result = await svc.findAll({ page: 1, limit: 20, search: 'iphone', sortBy: 'price', order: 'desc' })
   // → PaginatedResult

   const row = await svc.findById('123')

   const created = await svc.create({ name: 'iPhone', price: 999 })

   const updated = await svc.update('123', { price: 899 })

   await svc.delete('123')   // server xử lý soft delete

REST endpoints tự động:

.. code-block:: text

   GET    /api/products              → findAll (query string params)
   GET    /api/products/:id          → findById
   POST   /api/products              → create
   PATCH  /api/products/:id          → update
   DELETE /api/products/:id          → delete

Query string ví dụ:

.. code-block:: text

   GET /api/products?page=1&limit=20&search=iphone&sortBy=price&order=desc&status=active

---

## BaseQuery / PaginatedResult (SQL)

.. code-block:: typescript

   interface BaseQuery {
     page?:    number;
     limit?:   number;
     search?:  string;
     sortBy?:  string;
     order?:   'asc' | 'desc';
     filters?: Record<string, any>;
   }

   interface PaginatedResult {
     data:       object[];
     total:      number;
     page:       number;
     limit:      number;
     totalPages: number;   // lấy từ server nếu có, ngược lại tự tính ceil(total / limit)
   }

---

## Fake CRUD Server — mock có sẵn trong repo

Repo có sẵn 1 REST API giả (in-memory, không ghi đĩa) khớp đúng những gì ``SqlService`` mong đợi — dùng để test/demo mà không cần backend thật:

.. code-block:: text

   src/pages/api/products/_data.ts   Store in-memory dùng chung (prefix _ → Astro không coi là route)
   src/pages/api/products/index.ts   GET (findAll) + POST (create)
   src/pages/api/products/[id].ts    GET (findById) + PATCH (update) + DELETE (delete)

Dữ liệu chỉ tồn tại trong RAM của tiến trình server — mất khi restart, không tự sinh file như ``@/utils/csv``.

**Vì sao cần adapter:** ``astro.config.mjs`` dùng ``output: 'static'``. Ở chế độ static, ``/products`` (file) và ``/products/:id`` (thư mục) không thể cùng tồn tại trên ổ đĩa lúc build (lỗi ``EISDIR``) — vì findById/update/delete cần dữ liệu sống động theo từng request. Giải pháp: đánh dấu 2 route này chạy on-demand và đăng ký adapter Node, phần còn lại của site vẫn build tĩnh như cũ:

.. code-block:: js

   // astro.config.mjs
   import node from '@astrojs/node'

   export default defineConfig({
     output: 'static',                       // toàn site vẫn build tĩnh
     adapter: node({ mode: 'standalone' }),   // chỉ route có prerender:false mới chạy qua server này
   })

.. code-block:: ts

   // src/pages/api/products/index.ts và [id].ts
   export const prerender = false;

Dùng với ``createService`` — giống hệt cách gọi ``SqlService`` thật:

.. code-block:: js

   import { createService } from '@/services/crud'

   const svc = createService('products', '/api/')   // → SqlService, endpoint = /api/products

   const { data, total, totalPages } = await svc.findAll({ page: 1, limit: 10, search: 'latte' })
   const row     = await svc.findById('3')
   const created = await svc.create({ title: 'Trà đào', pricing: '45000~10000~ly' })
   const updated = await svc.update(created.id, { status: 'inactive' })
   await svc.delete(created.id)

Chạy thử thủ công:

.. code-block:: bash

   # pnpm dev — route chạy on-demand qua Vite dev server, không cần build trước
   pnpm dev

   # hoặc sau pnpm build — phần on-demand cần chạy server Node riêng
   pnpm build
   node ./dist/server/entry.mjs
   curl "http://localhost:4321/api/products?page=1&limit=3"
   curl -X POST http://localhost:4321/api/products -H "Content-Type: application/json" -d '{"title":"Trà đào"}'

---

## Adapter Registry

Cho phép đăng ký backend mới mà không sửa component nào:

.. code-block:: js

   import { registerAdapter, db } from '@/services/crud'

   // Đăng ký adapter mới
   registerAdapter('myapi', new MyApiAdapter())

   // Lấy adapter trực tiếp
   const adapter = db()           // → repoWorkerAdapter (đăng ký dưới tên 'DB_ALL', Worker-proxied)
   const adapter = db('myapi')    // → MyApiAdapter

   // Dùng với createService
   const svc = createService('users', '', 'myapi')

**DbAdapter interface** (cần implement khi tạo adapter mới):

.. code-block:: typescript

   interface DbAdapter {
     now(): Promise<any>
     find(table: string, opts?: QueryOpts): Promise<object[]>
     findById(table: string, id: string): Promise<object | null>
     add(table: string, data: object): Promise<object>
     set(table: string, id: string, data: object): Promise<void>
     put(table: string, id: string, data: object): Promise<void>
     batch(table: string, items: {id:string, data:object}[]): Promise<void>
     listen(table, opts, onNext, onError): Promise<() => void>
   }

---

## Nhiều kết nối (users/profiles / knowledge base / còn lại)

Mọi ``createService(table, '', server)`` đều đi qua Cloudflare Worker gateway (xem
``hook/WORKER.rst``) — ``server`` chọn 1 trong 3 connection đăng ký sẵn trong ``crud.js``'s
``_registry``, mỗi tên trỏ 1 ``WorkerAdapter`` khác nhau (``src/services/firestore.worker.js``),
KHÔNG còn phải Firebase project độc lập cho tất cả:

- ``server: 'DB_ALL'`` (mặc định) — adapter ``repoWorkerAdapter`` — legacy Firestore project
  (env ``PUBLIC_DB_ALL`` phía Worker), mọi bảng còn lại kể cả ``invoices``.
- ``server: 'DB_ACC'`` — adapter ``authWorkerAdapter`` — **Supabase Postgres**, bảng ``profiles``
  (đăng nhập/roles — xem ``worker/supabase/schema.sql``). Không còn là project Firestore riêng
  nữa (``PUBLIC_DB_ACC`` đã bị xoá khỏi codebase) — Worker xác thực JWT rồi ghi thẳng Postgres qua
  service-role key, xem ``worker/packages/db-worker/src/db.ts`` + ``worker/packages/shared/src/supabaseTable.ts``.
- ``server: 'DB_LLM'`` — adapter ``llmWorkerAdapter`` — project Firestore riêng cho knowledge base
  (``mind``, xem ``hook/SALE.rst``).

``invoices`` từng là 1 project riêng (``server: 'invoices'``, env ``PUBLIC_DB_INVO``) — đã gộp vào
``DB_ALL`` để bớt 1 kết nối riêng lẻ. Data cũ trong project ``PUBLIC_DB_INVO`` cần tự migrate thủ
công nếu còn cần giữ.

``src/services/firestore.js`` (client-side Firebase SDK, KHÔNG import bởi crud.js nữa) chỉ còn giữ
2 kết nối trực tiếp (``DB_ALL``/``DB_LLM``) — dùng bởi vài chỗ đọc Firestore client SDK trực tiếp
ngoài luồng Worker (vd ``svc-bay-login.js``'s ``getFirebaseApp('DB_ALL')``), không liên quan gì đến
``DB_ACC``/Supabase nữa.

.. code-block:: js

   createService('profiles', '', 'DB_ACC')   // → authWorkerAdapter (Supabase Postgres)
   createService('invoices')                 // → repoWorkerAdapter (bảng invoices, gộp vào DB_ALL)
   createService('products')                 // → repoWorkerAdapter (mặc định)

``conductor.all()``/``more()`` (đọc phân trang, vd ``svc-admin`` dùng cho bảng lớn) và
``loadData()`` (đọc 1 lần) đều nhận thêm ``opts.server`` cùng ý nghĩa, forward xuống
``createService``/``db(server)``. ``svc-admin`` có prop ``server`` sẵn — set
``server="DB_ACC"`` khi ``dataTable="profiles"`` để cả đường đọc realtime (``listen``) VÀ đường đọc
phân trang qua conductor đều trỏ đúng backend.

Phía server (build-time, ``firestore.server.ts``) chỉ còn ``opts.connection: 'DB_ALL'`` (mặc
định, không có lựa chọn nào khác) — build-time SSG chưa từng cần đọc ``profiles``/Supabase.

---

## Standalone Helpers (db*)

Thay thế cho ``createService`` khi chỉ cần 1 thao tác đơn lẻ:

.. code-block:: js

   import { dbNow, dbFind, dbAdd, dbSet, dbPut, dbBatch, dbListen, dbSoftDelete } from '@/services/crud'

   const now   = await dbNow()
   const rows  = await dbFind('posts', { filters: { status: 'active' } })
   const doc   = await dbAdd('posts', { title: 'Hello' })
   await dbSet('posts', 'my-id', { title: 'Hello' })
   await dbPut('posts', 'abc', { updated_at: now })
   await dbSoftDelete('posts', 'abc')
   await dbBatch('posts', [{ id: 'a', data: { index: 0 } }])
   const unsub = await dbListen('posts', opts, rows => {}, err => {})

   // Dùng adapter khác (server param — optional, default 'DB_ALL')
   const rows = await dbFind('users', {}, 'myapi')

---

## loadData — Read-only Loader

Không ghi, không cần auth — dùng cho các component chỉ đọc dữ liệu. Luôn trả về mảng, tự cache qua IndexedDB (``storager.js``):

.. code-block:: js

   import { loadData } from '@/services/crud'

   // Firestore collection
   const items = await loadData({ dataTable: 'products' })

   // Firestore — nested field (tilde = đường dẫn field trong document)
   const items = await loadData({ dataTable: 'orders~items' })

   // Firestore — pipe-sep nhiều collections (merged flat)
   const items = await loadData({ dataTable: 'orders|products~items' })

   // REST (dataSrc + dataTable)
   const items = await loadData({ dataSrc: 'https://api.com/', dataTable: 'products' })

   // REST full URL
   const items = await loadData({ dataSrc: '/api/products.json' })

   // Tắt cache IndexedDB — luôn gọi network/Firestore trực tiếp
   const items = await loadData({ dataTable: 'products', cache: 0 })

Ưu tiên:

.. code-block:: text

   dataSrc + dataTable  →  REST: fetch(dataSrc + '/' + dataTable)
   dataTable only       →  Firestore collection (pipe | tilde ~ supported)
   dataSrc only         →  REST: fetch(dataSrc) — full URL

Mỗi pipe-segment fail độc lập — lỗi 1 collection không chặn các collection còn lại.

``cache`` — số phút cache trong IndexedDB, mặc định ``5``, ``0`` = tắt cache (luôn gọi trực tiếp).

**loadKey / withCache** — 2 hàm nội bộ dùng chung, export ra để nơi khác (``conductor.js``) tái sử dụng đúng cùng 1 cache key:

.. code-block:: js

   import { loadKey, withCache } from '@/services/crud'

   // Sinh cache key giống hệt loadData dùng — để 1 section id luôn khớp với 1 cache entry
   const key = loadKey(dataSrc, dataTable)

   // Cache wrapper tổng quát — dùng cho bất kỳ fetchFn nào, không chỉ loadData
   const data = await withCache(key, 5, () => fetchSomething())

``conductor.all(sectionId, opts)`` (``@/services/conductor.js``) là nơi nên dùng cho mọi component runtime cần load dữ liệu theo ``dataSrc``/``dataTable`` — flow: state trong RAM (nanostores) → ``loadData`` → cache IndexedDB. Chỉ dùng ``loadData`` trực tiếp khi chạy ở build-time (Astro frontmatter) — xem ``hook/SERVICES.rst``.

---

## Soft Delete

Firestore dùng field ``deleted_at``:

.. code-block:: text

   Ghi:   svc.delete(id)      → { deleted_at: serverTimestamp(), updated_at: serverTimestamp() }
   Đọc:   svc.findAll()       → tự lọc rows có deleted_at != null
          loadData()           → tự lọc rows có deleted_at != null
   SQL:   svc.delete(id)      → DELETE /endpoint/:id  (server xử lý)

---

## firestore.js / firestore.worker.js — Internals

.. code-block:: text

   getFirebaseApp()               firestore.js — Firebase app singleton, dùng trực tiếp CHỈ bởi
                                   webs/bay/tools/service.js's listenBayPings (xem hook/WORKER.rst)
   WorkerAdapter/D1WorkerAdapter  firestore.worker.js — class thực thi CRUD qua Cloudflare Worker
   repoWorkerAdapter/llmWorkerAdapter/authWorkerAdapter/llmD1Adapter
                                  firestore.worker.js — singleton instance, import bởi crud.js
   _getFs()             Lazy firebase/firestore module cache + { db }
   _buildConstraints()  Chuyển QueryOpts → Firestore constraint array
   _toRows()            Map snapshot → rows, loại bỏ soft-deleted

Để swap backend: implement DbAdapter interface trong file mới, gọi ``registerAdapter()`` — không cần sửa bất kỳ component nào.

---

## Usage Patterns

**Pattern 1 — Service bound to table (khuyến nghị)**

.. code-block:: js

   // Trong svc-* Lit component
   get _svc() { return createService(this._table); }

   async _dcLoad() {
     this._data = await this._svc.findAll(this._comQueryOpts());
   }

   async _dfSave(flat) {
     const now = await this._svc.now();
     if (isNew) await this._svc.set(newId, { ...flat, created_at: now });
     else       await this._svc.update(id, { ...flat, updated_at: now });
   }

**Pattern 2 — Inline (one-off)**

.. code-block:: js

   // Trong hàm submit của basket service
   await createService(ordersTable).create({ status: 'paid', ... });
   await createService(invoiceTable).set(orderId, invoice);

**Pattern 3 — REST với SQL**

.. code-block:: js

   const svc = createService('products', import.meta.env.PUBLIC_API);
   const { data, total } = await svc.findAll({ page: 1, limit: 20, search: 'iphone' });
