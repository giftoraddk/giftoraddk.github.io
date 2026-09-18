WORKER
======

Tài liệu hướng dẫn hệ thống **Cloudflare Worker gateway** — lớp backend duy nhất của site (site
gốc vẫn ``output: 'static'``, không đổi). Đây là tài liệu mô tả **những gì đã thực sự triển khai**
trong ``worker/`` — khác với ``hook/cloudflare-worker.md``, vốn là bản thiết kế/đề xuất kiến trúc
ban đầu (tham khảo thêm nếu cần bối cảnh sâu hơn về từng quyết định).

.. contents::
   :local:
   :depth: 2

.. note::
   **Cập nhật mới nhất — tách lại thành 2 Worker, dùng chung 1 source**: ``worker/`` giờ là **1
   pnpm workspace nội bộ** (độc lập với workspace gốc của repo) gồm 3 package —
   ``packages/shared`` (code dùng chung, không tự deploy) và **2 Worker triển khai riêng, 2
   account Cloudflare khác nhau**:

   - ``packages/db-worker`` → script ``micro-worker`` (account kimthiendung) — CHỈ
     ``/v1/db/:connection/:table`` (Firestore/Supabase proxy, nội dung tài liệu này, ``src/db.ts``).
   - ``packages/llm-worker`` → script ``mini-worker`` (account phivushop, không đổi — đã có sẵn
     D1/KV/Vectorize/Workers AI) — ``/v1/data/:table`` (D1 CRUD cho ``webs/llm``), ``POST
     /v1/search`` (semantic search, xem ``hook/knowledge_database_cloudflare_d1_vectorize.md``),
     ``POST /v1/ai/stream``/``/v1/ai/image`` (toàn bộ AI processing app-wide).

   ``src/auth.ts``/``src/roles.ts`` (JWT verify + role/capability gate) và
   ``src/supabaseTable.ts`` (PostgREST client) sống trong ``packages/shared`` (import qua
   ``@worker/shared/*``) — dùng CHUNG cho cả 2 Worker mà KHÔNG trùng lặp file giữa 2 project, khác
   với tình trạng trước khi từng có lần gộp-rồi-tách. Xem ``worker/README.md`` cho hướng dẫn
   setup/deploy đầy đủ (2 lần `wrangler login` riêng, mỗi account 1 lần). Nội dung ``/v1/db/*`` bên
   dưới vẫn chính xác 100% — chỉ khác VỊ TRÍ file (``packages/db-worker/src/db.ts`` thay vì
   ``src/db.ts`` phẳng).

   *(Lịch sử: tài liệu này từng ghi chú việc gộp ``worker/`` + ``worker-llm/`` thành 1 Worker duy
   nhất — bước đó đã bị đảo ngược ở lần tách này, nhưng phần code dùng chung (auth/roles/
   supabaseTable) được giữ lại qua ``@worker/shared`` thay vì quay lại trạng thái trùng lặp cũ.)*


Bối cảnh — vì sao cần Worker
-----------------------------

Trước khi có Worker, site là ``output: 'static'`` **không có backend nào cả** — mọi thứ chạy
thẳng trong browser:

- Key AI (OpenRouter/Groq/NVIDIA/Hugging Face) nằm trong biến ``PUBLIC_*`` → Astro/Vite nhúng
  thẳng vào bundle JS gửi cho browser. Ai cũng lấy được từ DevTools/Network, kể cả khách vãng lai
  chưa đăng nhập (chat bán hàng ``svc-sale.js`` trên ``Shop.astro``).
- Đăng nhập là tự viết: đọc thẳng document Firestore ``users`` từ browser rồi so sánh password đã
  giải mã **ngay trên client**, dùng key giải mã (``PUBLIC_SALT``) cũng nằm trong bundle.
- Ghi Firestore ở MỌI bảng đều đi thẳng từ client SDK — không có lớp authorization phía server nào
  cả, chỉ có ẩn/hiện UI theo role (không phải bảo mật thật).

Worker giải quyết cả 3 vấn đề trên bằng cách trở thành **lớp trung gian duy nhất** giữ mọi secret
thật (AI key, Supabase service role key, Firebase service account/API key) — browser không bao giờ
cầm secret nữa, chỉ cầm token phiên đăng nhập.


Tổng quan kiến trúc
--------------------

::

    Lit (browser)                    Cloudflare Worker                    Bên ngoài
    ─────────────                    ──────────────────                   ─────────
    Supabase Auth SDK ────────────►  (browser nói chuyện thẳng với
      (login/OAuth — KHÔNG qua        Supabase cho phần đăng nhập,
       Worker, xem mục Đăng nhập)     không cần Worker ở bước này)

    tensor.js ─────────────────────► POST /v1/ai/stream    ──────────►  OpenRouter/Groq/
      (chat AI, cùng API cũ)         POST /v1/ai/image                   NVIDIA/Hugging Face
                                     (giữ key thật, chọn model/
                                      fallback — xem mục AI)

    createService(table) — MỌI connection ──► GET/POST/PUT/PATCH        ──►  Supabase Postgres
      ('DB_ALL' mặc định, hoặc          /v1/db/DB_ACC/:table[/:id]           (bảng `profiles`)
       'DB_ACC'/'DB_LLM') ──────────► /v1/db/{DB_ALL,DB_LLM}/:table[/:id] ──►  Firestore (dữ liệu
                                            (đọc: không bắt buộc JWT;           cũ — products,
                                             ghi: verify JWT + check role       invoices, … — invoices
                                             trước khi chạm dữ liệu)            gộp chung 'DB_ALL')

Nguyên tắc: **browser không còn gọi Firebase/Firestore trực tiếp nữa** — mọi ``createService(...)``
(đọc lẫn ghi, kể cả sản phẩm/bài viết/gian hàng công khai) đều đi qua Worker. Đọc dữ liệu công khai
KHÔNG cần đăng nhập (Worker cho phép request ẩn danh ở nhánh đọc của 2 connection Firestore cũ —
xem mục Bảo mật), chỉ ghi mới bắt buộc JWT + kiểm tra role. Đây là thay đổi so với thiết kế ban đầu
(vốn chỉ định tuyến phần ghi nhạy cảm qua Worker, giữ đọc công khai đi thẳng) — đổi lấy: 1 điểm
kiểm soát/cấu hình duy nhất cho MỌI truy cập Firestore, nhưng tốn thêm 1 round-trip Worker cho mỗi
lần đọc so với gọi thẳng CDN của Firestore trước đây, và ``.listen()`` (real-time) không còn đẩy
tức thời — xem 2 mục dưới.


Luồng đăng nhập — Supabase Auth
---------------------------------

``svc-login.js`` (khu vực admin) và ``svc-bay-login.js`` (khu vực bay) **không còn tự đọc
Firestore + so sánh password** — toàn bộ xác thực giao cho Supabase Auth::

    Trình duyệt              svc-login.js              Supabase Auth        Worker ('DB_ACC' adapter)
         │                        │                          │                       │
         │  submit email+password │                          │                       │
         ├───────────────────────►│                          │                       │
         │                        │ supabase.auth             │                       │
         │                        │  .signInWithPassword()    │                       │
         │                        ├──────────────────────────►│                       │
         │                        │◄── { session, user } ─────┤                       │
         │                        │                          │                       │
         │                        │ createService('users','','DB_ACC').findById(id)   │
         │                        ├───────────────────────────────────────────────────►│
         │                        │                          │  verify JWT + đọc      │
         │                        │                          │  bảng `profiles`       │
         │                        │◄── profile { roles, status, ... } ─────────────────┤
         │                        │                          │                       │
         │                        │ kiểm tra status='active' + isAdmin/hasAnyPerm      │
         │                        │ auth.set(profile, session.access_token)            │
         │                        │  → lưu IndexedDB (giống hệt code cũ)               │
         │                        │                          │                       │
         │◄── redirect pathLink ──┤                          │                       │

**Đăng nhập Google:** chuyển từ popup (Firebase Auth) sang **redirect cả trang**
(``supabase.auth.signInWithOAuth``) — khi quay lại trang, ``connectedCallback()`` tự phát hiện
session Supabase đã có và chạy tiếp bước "tìm-hoặc-tạo" profile (giống hệt logic cũ, chỉ đổi nguồn
dữ liệu người dùng Google từ Firebase sang Supabase).

**Điểm quan trọng:** ``auth.set(user, token)`` trong ``webs/auth/tools/service.js`` — hàm này ĐÃ
tồn tại từ trước (có sẵn ô nhớ ``TOKEN_KEY``) nhưng chưa từng dùng thật; giờ ``token`` chính là
Supabase access token thật, dùng để xác thực mọi request gọi Worker sau này.


Luồng AI chat / sinh ảnh
--------------------------

``src/services/tensor.js`` (client) giờ chỉ là 1 lớp mỏng gọi Worker — **giữ nguyên public API cũ**
(``createAIStream``/``generateText``) nên mọi nơi gọi AI trong app (``svc-talk``, ``svc-sale``,
``svc-editor``, ``svc-assist``, AI-assist trong admin...) **không cần sửa gì** ngoài đổi chuỗi cấu
hình model thật (``PUBLIC_OPER~...``) thành chuỗi "chain" tượng trưng ``'@default'``
(``DEFAULT_CHAIN`` export từ ``tensor.js``)::

    tensor.js                    Worker (/v1/ai/stream)              Groq/OpenRouter/NVIDIA
         │                              │                                    │
         │ createAIStream('@default',   │                                    │
         │   messages, opts)            │                                    │
         ├─────────────────────────────►│                                    │
         │                              │ resolveFreeChain('@default')      │
         │                              │  → GROQ_KEY, OPER_KEY, NVID_KEY    │
         │                              │    (thứ tự theo latency đã đo, xem│
         │                              │    ai.ts — KHÔNG lộ key ra ngoài) │
         │                              │                                    │
         │                              │ thử từng model, đủ AI_FREE_TIMEOUT_│
         │                              │  MS (mặc định 3s) mà chưa xong →   │
         │                              │  chuyển qua PRO_KEY (nếu có cấu    │
         │                              │  hình — không thì bỏ qua bước này)│
         │                              ├───────────────────────────────────►│
         │                              │◄── SSE stream ─────────────────────┤
         │                              │ đọc hết stream, trích content thật │
         │                              │  (bỏ qua reasoning/reasoning_      │
         │                              │  content) — model 200 OK mà không  │
         │                              │  ra content thật cũng bị coi là    │
         │                              │  fail, tự chuyển model kế tiếp     │
         │◄── plain text ───────────────┤                                    │
         │  (browser chỉ nhận text,     │                                    │
         │   không bao giờ thấy key)    │                                    │

``worker/packages/llm-worker/src/ai.ts`` chứa lại gần như nguyên vẹn logic chọn model/fallback cũ của ``tensor.js``
(``parseModels``/``DEFAULTS``/``detectProvider``) — chỉ khác chỗ chạy (Worker thay vì browser) và
nguồn key (Worker secrets thay vì ``PUBLIC_*``). Vì Worker phải đọc hết response mới biết model có
trả lời thật hay không (không thể "rút lại" byte đã stream cho client), ``/v1/ai/stream`` buffer
toàn bộ response phía server rồi mới trả 1 lần cho client — không còn stream token-by-token thật
sự (chỉ ảnh hưởng UI kiểu gõ chữ dần, không ảnh hưởng tính đúng đắn).

Sinh ảnh (``runImageGenerate`` trong ``webs/division/tools/image.js``) tương tự: gọi
``POST /v1/ai/image`` thay vì gọi thẳng Hugging Face — retry khi model đang "cold start" (503) giờ
nằm ở Worker, client không cần tự retry nữa.

.. note::

   Model ranking theo tốc độ (``rankModels``/``demoteModel`` bản cũ, cache IndexedDB theo phiên
   browser) đã **bỏ** — client không còn biết (key, model) thật nào đang chạy nên không có gì để
   xếp hạng/demote nữa. Worker tự thử theo thứ tự cấu hình mỗi request, không nhớ giữa các lần gọi.


Luồng đọc/ghi dữ liệu qua Worker (Firestore + Supabase)
-----------------------------------------------------------

Route chung: ``/v1/db/:connection/:table[/:id]`` — ``:connection`` là 1 trong:

+----------------+------------------------------------------------------------------------+
| connection     | Nối tới                                                                |
+================+==========================================================================+
| ``DB_ACC``     | Bảng ``profiles`` trên Supabase Postgres (user, roles, status)          |
+----------------+--------------------------------------------------------------------------+
| ``DB_ALL``     | Project Firebase chính (``PUBLIC_DB_ALL``) — MỌI bảng còn lại, kể cả    |
|                | public và ``invoices`` (đã gộp từ project ``PUBLIC_DB_INVO`` riêng cũ)  |
+----------------+--------------------------------------------------------------------------+
| ``DB_LLM``     | Project Firebase knowledge-base (``PUBLIC_DB_LLM``, nếu có cấu hình)    |
+----------------+--------------------------------------------------------------------------+

**Đây là route DUY NHẤT app dùng để chạm Firestore/Supabase** — ``crud.js``'s adapter registry trỏ
CẢ 3 tên connection vào adapter Worker-proxied (``src/services/firestore.worker.js``); không còn
adapter nào gọi thẳng Firebase SDK từ browser nữa (ngoại trừ 1 trường hợp cố ý, xem cuối mục này).

Chính sách xác thực — JWT KHÔNG bắt buộc cho mọi request, chỉ bắt buộc theo tình huống::

    request → connection = 'DB_ACC'  → LUÔN bắt buộc Supabase JWT hợp lệ
            → connection khác + method GET (đọc)  → JWT TÙY CHỌN (khách vãng lai đọc được)
            → connection khác + method ghi (POST/PUT/PATCH/batch) → bắt buộc JWT

    Nếu có JWT hợp lệ → đọc thêm profile người gọi (bảng `profiles`) để biết role:
            → connection = 'DB_ACC'?
                 → GET 1 dòng của chính mình → luôn cho phép
                 → GET toàn bộ (list)         → chỉ admin
                 → ghi (POST/PUT/PATCH)        → chỉ được sửa field cho phép
                                                  (display_name, avatar, email,
                                                   username, meta — KHÔNG BAO GIỜ
                                                   roles/status trừ khi isAdmin)
            → connection = 'DB_ALL'/'DB_LLM' + ghi?
                 → canWriteTable(profile, table) — bảng nằm trong allowlist
                   (worker/packages/shared/src/roles.ts's TABLE_CAPABILITY) mới được phép,
                   mặc định TỪ CHỐI nếu bảng không có trong danh sách
            → connection = 'DB_ALL'/'DB_LLM' + đọc?
                 → luôn cho phép, kể cả không có JWT (giống hệt mức bảo mật
                   cũ khi browser gọi thẳng client SDK — Firestore Security
                   Rules vẫn là chốt chặn thật, KHÔNG nằm trong repo này)

Client dùng route này qua đúng interface cũ (``createService``) — **không đổi cách gọi ở bất kỳ
call site nào trong app**, chỉ đổi những gì adapter đứng sau tên đó thực sự làm:

.. code-block:: js

   // Đọc công khai (sản phẩm, bài viết...) — TRƯỚC: gọi thẳng Firestore SDK. NAY: qua Worker,
   // không cần đăng nhập, call site KHÔNG đổi gì
   const rows = await createService('products').findAll()

   // Đọc/ghi profile người dùng — qua Worker → Supabase
   const svc = createService('users', '', 'DB_ACC')
   await svc.findAll({ filters: { email } })
   await svc.update(userId, { roles: newRoles, updated_at: now })

   // Ghi 1 bảng Firestore cần bảo vệ (invoice, ...) — cùng adapter 'DB_ALL' mặc
   // định đã bảo vệ ghi rồi, không cần tên adapter riêng nào khác nữa
   const svc = createService('invoices')

``listen()`` (realtime) — KHÔNG còn Firestore onSnapshot đẩy tức thời. ``WorkerAdapter.listen()``
polling ``find()`` mỗi ~5 giây, chỉ gọi ``onNext`` khi dữ liệu thật sự đổi — cùng interface
(``Promise<unsubscribe>``) nên call site không đổi, nhưng độ trễ tăng từ "tức thời" lên "vài giây".
Đủ dùng cho dashboard/danh sách; **không** đủ cho thứ cần phản hồi ngay (ping/presence).

**1 ngoại lệ cố ý còn lại** — ``webs/bay/tools/service.js``'s ``listenBayPings()``: vẫn gọi thẳng
``firebase/firestore`` (không qua Worker) vì (1) cần query ``documentId() IN [...]`` mà
``QueryOpts``/Worker's ``find()`` không hỗ trợ, và (2) ping cần push tức thời thật, polling 5s
không đủ. Đã ghi rõ trong comment tại chỗ.


Bảo mật & phân quyền trong Worker
-----------------------------------

- ``worker/packages/shared/src/roles.ts`` — copy y hệt logic ``parseRoles``/``hasAccess`` từ
  ``webs/auth/tools/service.js`` (thuần string, không phụ thuộc DOM) để Worker tự áp CÙNG luật
  phân quyền, thay vì chỉ tin UI ẩn/hiện như trước.
- Field ``roles``/``status`` trên bảng ``profiles``: người dùng thường **không bao giờ** tự sửa
  được 2 field này qua Worker (kể cả lúc tạo profile lần đầu — Worker luôn ép ``roles:'user'``,
  ``status:'active'`` bất kể client gửi gì) — chỉ admin (đã xác thực) mới sửa được.
- Rate limit theo IP (``worker/packages/llm-worker/src/rateLimit.ts``, Workers KV) áp cho khách vãng lai gọi
  ``/v1/ai/stream`` không đăng nhập (chat bán hàng) — 10 request/phút/IP. Đọc dữ liệu công khai
  qua ``/v1/db/*`` HIỆN CHƯA có rate limit riêng (chỉ có cache IndexedDB 5 phút phía client, xem
  ``crud.js``'s ``withCache``) — cân nhắc thêm nếu request volume tới Worker tăng đáng kể.
- Đọc công khai (sản phẩm, bài viết, danh sách gian hàng...) đi qua Worker nhưng KHÔNG bắt buộc
  đăng nhập — mức bảo mật giữ nguyên như trước (Firestore Security Rules vẫn là chốt chặn thật,
  KHÔNG nằm trong repo này để rà soát từ code, cần tự kiểm tra trong Firebase Console).


Cấu trúc thư mục ``worker/``
------------------------------

+--------------------------------+---------------------------------------------------------------+
| File                           | Vai trò                                                       |
+=================================+================================================================+
| ``src/index.ts``               | Router chính + CORS                                           |
+---------------------------------+----------------------------------------------------------------+
| ``src/ai.ts``                  | Engine chọn model AI (ported từ ``tensor.js``) + sinh ảnh      |
+---------------------------------+----------------------------------------------------------------+
| ``src/supabaseAuth.ts``        | Verify Supabase JWT qua JWKS                                   |
+---------------------------------+----------------------------------------------------------------+
| ``src/roles.ts``               | ``parseRoles``/``hasAccess``/``canWriteTable`` (ported)        |
+---------------------------------+----------------------------------------------------------------+
| ``src/supabaseTable.ts``       | Client PostgREST cho bảng ``profiles``/``ai_usage``            |
+---------------------------------+----------------------------------------------------------------+
| ``src/firestore.ts``           | Client REST Firestore — 2 chế độ: API key HOẶC service account|
+---------------------------------+----------------------------------------------------------------+
| ``src/google-token.ts``        | Đổi service-account JSON → Google OAuth access token (cache)   |
+---------------------------------+----------------------------------------------------------------+
| ``src/db.ts``                  | Route ``/v1/db/*`` + toàn bộ logic authorization               |
+---------------------------------+----------------------------------------------------------------+
| ``src/rateLimit.ts``           | Rate limit theo IP (KV)                                        |
+---------------------------------+----------------------------------------------------------------+
| ``scripts/setup-dev.mjs``      | Tự động điền ``.dev.vars`` từ ``.env`` gốc — xem mục Setup      |
+---------------------------------+----------------------------------------------------------------+
| ``supabase/schema.sql``        | DDL bảng ``profiles``/``ai_usage`` + RLS — chạy 1 lần trên Supabase |
+---------------------------------+----------------------------------------------------------------+
| ``wrangler.jsonc``             | Config Cloudflare (KHÔNG chứa secret — xem ``vars`` vs Secrets)|
+---------------------------------+----------------------------------------------------------------+
| ``.dev.vars`` *(gitignored)*   | Secret cho local dev — do ``setup-dev.mjs`` tự sinh            |
+---------------------------------+----------------------------------------------------------------+


Setup & chạy local
--------------------

**Bước 1 — cài & auto-fill (1 lệnh)**

.. code-block:: bash

   cd worker
   pnpm install
   pnpm dev        # tự chạy scripts/setup-dev.mjs trước, rồi wrangler dev tại :8787

Hoặc từ thư mục gốc repo (sau khi đã ``pnpm install`` trong ``worker/`` ít nhất 1 lần):
``pnpm work:dev``.

``pnpm dev`` (hoặc ``pnpm setup`` để chạy riêng bước điền field) tự đọc file ``.env`` ở thư mục gốc
và điền vào ``worker/.dev.vars``:

- Key AI (``OPER_KEY``/``GROQ_KEY``/``NVID_KEY``/``HUGGIN_KEY``) — lấy từ dòng đã comment sẵn
  trong ``.env`` (dời ra khỏi ``PUBLIC_*`` trong đợt nâng cấp này).
- Firestore API key + project id cho từng connection (``DB_ALL``/``DB_LLM``) — lấy thẳng từ config
  Firebase Web SDK client đang dùng (``PUBLIC_DB_ALL``/``PUBLIC_DB_LLM`` — secret name = tên
  connection, ``DB_ALL_*``/``DB_LLM_*``, xem ``worker/packages/db-worker/src/db.ts``'s
  ``LEGACY_FIRESTORE_CONNECTIONS``) — **không cần tạo service account** để chạy local.
- ``SUPABASE_URL`` — lấy từ ``PUBLIC_SUPABASE_URL`` nếu đã điền.
- ``AI_FREE_TIMEOUT_MS`` — mặc định ``"3000"`` (3s), tự điền sẵn.
- ``PRO_KEY`` — **tuỳ chọn**, chain model trả phí (cùng format tilde-config-string như
  ``OPER_KEY``/``GROQ_KEY``/``NVID_KEY``), chỉ được thử khi hết ``AI_FREE_TIMEOUT_MS`` mà model
  free chưa trả lời xong. Không có nguồn tự điền (chưa từng có ở client) — để trống là hoàn toàn
  bình thường, tính năng chuyển sang model trả phí chỉ đơn giản không kích hoạt.

Script **không tự xoá** field bạn đã điền tay (vd ``SUPABASE_SERVICE_ROLE_KEY``) khi chạy lại —
chỉ merge thêm phần còn thiếu.

**Bước 2 — phần không tự điền được (bắt buộc phải làm tay)**

1. Tạo project tại supabase.com.
2. Vào SQL editor, chạy nguyên file ``worker/supabase/schema.sql``.
3. Project Settings → API → copy **Project URL** vào ``.env``'s ``PUBLIC_SUPABASE_URL``,
   **anon/publishable key** vào ``PUBLIC_SUPABASE_PUBLISHABLE_KEY``, **service_role key** dán trực
   tiếp vào ``worker/.dev.vars``'s ``SUPABASE_SERVICE_ROLE_KEY`` (không đưa vào ``.env`` — key này
   không được lộ ra browser).
4. Authentication → Providers → bật Email (và Google nếu cần đăng nhập mạng xã hội).

Xem thêm chi tiết + di trú user cũ trong ``worker/README.md``.


Deploy production
-------------------

.. code-block:: bash

   cd worker
   npx wrangler login
   npx wrangler kv namespace create RATE_LIMIT_KV   # dán id trả về vào wrangler.jsonc
   npx wrangler secret put OPER_KEY
   npx wrangler secret put NVID_KEY
   npx wrangler secret put PRO_KEY   # tuỳ chọn — model trả phí, bỏ qua nếu chưa thiết lập
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put DB_ALL_API_KEY
   npx wrangler secret put DB_LLM_API_KEY
   pnpm deploy

Sửa ``wrangler.jsonc``'s ``vars.ALLOWED_ORIGIN`` thành domain thật (CORS — không phải cơ chế bảo
mật chính, chỉ chặn bớt gọi chéo domain từ browser thông thường).

Đổi ``.env`` gốc's ``PUBLIC_WORKER_URL`` từ ``http://localhost:8787`` sang URL Worker thật đã deploy.


Bảng endpoint tham chiếu
--------------------------

+------------------------------------------+--------+---------------------------------------------+
| Endpoint                                  | Auth   | Mô tả                                        |
+============================================+========+===============================================+
| ``POST /v1/ai/stream``                    | Không* | Chat AI, trả về text stream thuần            |
+--------------------------------------------+--------+-------------------------------------------------+
| ``POST /v1/ai/image``                     | Có     | Sinh ảnh qua Hugging Face                    |
+--------------------------------------------+--------+-------------------------------------------------+
| ``GET /v1/db/:connection/:table``         | Có**   | ``find`` — list (query ``?opts=``)           |
+--------------------------------------------+--------+-------------------------------------------------+
| ``GET /v1/db/:connection/:table/:id``     | Có**   | ``findById``                                 |
+--------------------------------------------+--------+-------------------------------------------------+
| ``POST /v1/db/:connection/:table``        | Có     | ``add`` — tạo mới, id tự sinh                |
+--------------------------------------------+--------+-------------------------------------------------+
| ``PUT /v1/db/:connection/:table/:id``     | Có     | ``set`` — tạo mới hoặc ghi đè tại id đã biết  |
+--------------------------------------------+--------+-------------------------------------------------+
| ``PATCH /v1/db/:connection/:table/:id``   | Có     | ``put`` — cập nhật 1 phần                    |
+--------------------------------------------+--------+-------------------------------------------------+
| ``POST /v1/db/:connection/:table/_batch`` | Có     | ``batch`` — ghi nhiều dòng                   |
+--------------------------------------------+--------+-------------------------------------------------+

\* ``/v1/ai/stream`` không bắt buộc JWT (phục vụ chat khách vãng lai), nhưng bị rate-limit theo IP.

\*\* Chỉ bắt buộc JWT khi ``connection = 'DB_ACC'``, hoặc khi bảng thuộc allowlist cần bảo vệ ghi
(``canWriteTable``) — GET công khai trên ``DB_ALL``/``DB_LLM`` không cần JWT.


Việc còn thiếu / lưu ý
------------------------

- **Di trú user cũ**: tài khoản admin/nhân viên cũ nằm ở Firestore ``users`` (project ``auth`` —
  đã ngừng dùng), mật khẩu mã hoá AES không import thẳng vào Supabase Auth được. Cần tạo lại tài
  khoản qua Supabase (đặt mật khẩu tạm/gửi email reset) rồi copy ``roles``/``status`` sang bảng
  ``profiles`` — việc này cần làm thủ công khi có danh sách user thật.
- **Key AI riêng theo division** (``entityAi``, nhập tay trong ``/admin/divisions``) — vẫn là key
  thật nằm trong Firestore, CHƯA được bảo mật qua Worker (admin-only, mức độ rủi ro thấp hơn chat
  khách vãng lai, nhưng vẫn nên dọn dẹp ở một đợt sau).
- **``hook/AUTH_CONTEXT.rst``** mô tả luồng đăng nhập/phân quyền **CŨ** (Firestore + apexDecode) —
  tài liệu đó hiện đã lỗi thời sau khi chuyển sang Supabase Auth (xem tài liệu này thay thế cho
  phần đăng nhập). Chưa cập nhật lại — cân nhắc viết lại nếu cần dùng ``AUTH_CONTEXT.rst`` làm
  tham chiếu chính xác.
- **Request volume/cost tăng thật**: mọi lần đọc dữ liệu (kể cả sản phẩm/bài viết công khai, trước
  đây gọi thẳng CDN của Firestore) giờ đi qua đúng 1 Worker fleet — cache IndexedDB 5 phút phía
  client (``crud.js``) vẫn áp dụng nên KHÔNG phải mọi lần render đều gọi Worker, nhưng tổng lượt
  gọi Worker chắc chắn cao hơn hẳn so với thiết kế "chỉ ghi nhạy cảm mới qua Worker" ban đầu — theo
  dõi dashboard Cloudflare Workers nếu traffic lớn.
- **Real-time bằng polling, không phải push**: mọi ``.listen()`` qua ``createService(...)`` giờ
  polling ~5 giây/lần thay vì Firestore onSnapshot đẩy tức thời — chấp nhận được cho dashboard/danh
  sách hiện có, nhưng nếu sau này cần real-time thật (dưới 1 giây) sẽ cần WebSocket/Durable Object
  relay, chưa xây trong đợt này.
- **Firestore Security Rules** cho các bảng vẫn đọc thẳng client SDK (sản phẩm, bài viết...) chưa
  được rà soát lại trong đợt này — cần tự kiểm tra trong Firebase Console.
