====
SALE
====

``webs/division/svc-sale.js`` — chat AI "Tư vấn & CSKH" cho KHÁCH VÃNG LAI (guest,
không đăng nhập) trên storefront đơn ``Shop.astro``. Khác 2 thứ trông tương tự:

- ``svc-talk.js`` — nội bộ, sếp <-> các phòng ban AI (marketing/production), chạy pipeline nhiều
  bước qua ``tools/engine.js``, cần đăng nhập admin.
- ``svc-chat.js`` (``webs/chat``) — domain chat P2P giữa 2 người dùng THẬT trong ``webs/bay``,
  không có AI.

``svc-sale.js`` chỉ có 1 lượt hỏi-đáp trực tiếp mỗi lần — không có "sub-step"/pipeline nào để tách,
khách cần trả lời NGAY.

.. contents:: Mục lục
   :depth: 2
   :local:

----

Kiến trúc
=========

Knowledge base (``mind``) rút gọn từ ``hook/firebase-multidomain-ai-rag-spec.md`` (multi-domain
Firestore RAG engine) xuống những gì tính được THUẦN JS phía browser — site này ``output:'static'``,
không có backend (Cloud Functions/Cloud Run), và 1 lần thử embedding thật (NVIDIA NIM) đã bị CORS
chặn hoàn toàn (xem mục Retrieval bên dưới). Vẫn giữ nguyên phần filter/scoring làm được không cần
backend: domain/status/temporal metadata filter → keyword + authority + specificity scoring →
evidence pack — bỏ hẳn phần cần backend (vector/KNN search, Cloud Function ingestion pipeline, rule
engine DSL, knowledge graph). Xem "Việc không làm (và vì sao)" ở cuối file.

::

    Khách vãng lai gõ câu hỏi
              |
              v
    svc-sale.js: _dfPostGuest(content)
              |
              +-- append entry vào _log (from:'guest') + Storager.set (IndexedDB, TTL 1 ngày)
              |
              +-- shortlistMind(this._mind, content)  -- tools/sale-engine.js
              |         -> services/mind.js's retrieveMind:
              |              filterActive   (domain==='sale' + status + effectiveFrom/effectiveTo)
              |              scoreHybrid    (keyword overlap + authorityLevel + specificity)
              |              buildEvidencePack (top-5, {text,refTable,refId,version,authorityLevel})
              |
              +-- decideSaleReply(ai, evidencePack, recentHistory, content)  -- 1 lệnh gọi AI
              |         (tự _hydrateRealtime giá/tồn kho/khuyến mãi trước, rồi persona rút gọn
              |         từ hook/sales.md + evidence pack làm "nguồn sự thật duy nhất")
              |
              +-- append entry vào _log (from:'sale', content, wantsHuman) + Storager.set

    products/posts (record thật, project CHÍNH) --sync--> mind (project RIÊNG, server:'DB_LLM')
              |                                                  ^
              tools/mind-sync.js                                |
              gọi từ 2 nơi:                                      |
              - svc-talk.js's _dfApprove --------------------------+
              - svc-admin.js's _dfSave ---------------------------+

    /admin/mind (server='DB_LLM') — 2 cách nạp thêm (ngoài auto-sync ở trên):
      Case 1: chọn 1 bảng có sẵn (products/posts) -> đồng bộ lại TOÀN BỘ record của bảng đó
      Case 2: nhập CSV ngoài -> chọn 1 unitType áp cho cả file, cột CỐ ĐỊNH thứ tự
              title|description|content|tags|pricing|promo|quantity|effectiveFrom|effectiveTo
              (2 cột cuối optional)

Danh tính (tên/avatar/model AI riêng) đọc từ 1 doc ``divisions`` (id ``'sale'``, seed qua
``tools/seed-sale.js``) — TÁI DÙNG UI chỉnh sẵn có ở ``/admin/divisions``
(``services/schemas/admin/divisions.js``: title/description/pics/lang/ai), KHÔNG dùng
``meta.steps``/pipeline engine như marketing/production (``meta: { kind: 'chat' }`` chỉ để đánh
dấu, không được đọc bởi bất kỳ code nào).

----

Project Firestore riêng cho ``mind`` (``server: 'DB_LLM'``)
=========================================================

``mind`` sống trong 1 project Firebase RIÊNG BIỆT, tách khỏi mọi bảng còn lại của app — cùng cơ chế
"nhiều kết nối Firestore" đã dùng cho ``users``/``invoices`` (xem ``hook/CRUD.rst``), không phải
cơ chế mới:

.. code-block:: text

    server: 'DB_LLM' — env PUBLIC_DB_LLM — adapter `llmWorkerAdapter` (src/services/firestore.worker.js,
                    Cloudflare Worker-proxied) registered trong src/services/crud.js's `_registry`

.. code-block:: js

    createService('mind', '', 'DB_LLM')          // mọi nơi đọc/ghi `mind` đều truyền server này
    <svc-admin dataTable='mind' server='DB_LLM'> // /admin/mind — cùng prop `server` đã dùng cho
                                                  // dataTable='users' server='DB_ACC'

Lý do tách project riêng (rút gọn từ spec §32/§33 "multi-tenant"/"security"): giảm blast-radius —
1 project Firebase riêng cho knowledge base thì rủi ro/quyền truy cập không lẫn với dữ liệu app
chính (đơn hàng, users, hoá đơn...). Trust model KHÔNG đổi — site vẫn ghi Firestore thẳng từ client
như mọi bảng khác (không có Cloud Functions để đặt 1 lớp authorization server-side như spec §33 mô
tả đầy đủ).

``MIND_SERVER`` (hằng ``'DB_LLM'``) export từ ``tools/mind-sync.js`` — 1 chỗ duy nhất để đổi tên
server nếu cần sau này.

**Cutover từ project cũ**: ``mind`` từng sống chung project với mọi bảng khác (``server:'firestore'``
mặc định) trước khi tách sang ``PUBLIC_DB_LLM``. KHÔNG có migration script tự động copy dữ liệu cũ
sang — vì ``mind`` là derived/rebuildable data (xem "Collection mind" bên dưới):

- Entry auto-sync (có ``refTable``) — bấm lại "Nạp lại" ở ``/admin/mind`` cho từng bảng
  (products/posts) SAU KHI ``PUBLIC_DB_LLM`` đã cấu hình xong — tự re-derive 100% từ record thật,
  không mất gì.
- Entry curate tay (CSV company/policy/other, KHÔNG có ``refTable``) — KHÔNG tự phục hồi được, vì
  grid ``/admin/mind`` giờ chỉ query project ``llm`` mới (project cũ không còn hiển thị ở đâu để
  export/re-import lại). Nếu project cũ từng có loại entry này, phải tự tay xem lại Firebase Console
  của project cũ (``PUBLIC_DB_ALL``, collection ``mind``) rồi nhập lại qua Case 2 (CSV) bên dưới
  TRƯỚC khi coi cutover là xong — chatbot sẽ trả lời thiếu ngữ cảnh cho tới lúc đó.

----

Collection ``mind``
====================

Knowledge unit — rút gọn từ spec §8 (``/knowledge_units/{unitId}``) xuống 1 collection phẳng DUY
NHẤT (không có ``/domains``, ``/sources``, ``/documents``, ``/versions``, ``/relationships`` riêng
— xem "Việc không làm" bên dưới vì sao). KHÔNG phải source of truth — chỉ trỏ về record thật qua
``refTable``/``refId`` (products/posts).

.. code-block:: text

    {
      id,
      domain,                 // hằng string 'sale' (DOMAIN_SALE, export từ tools/mind-sync.js) —
                              // KHÔNG có collection /domains riêng, chỉ 1 hằng JS — domain thứ 2
                              // sau này (finance/policy...) chỉ cần tag entry khác + filter khác,
                              // TÁI DÙNG THẲNG services/mind.js, không cần hạ tầng mới
      unitType ('product'|'post'|'company'|'policy'|'other'),  // đổi tên từ `category` cũ — khớp
                              // thuật ngữ spec §8's `unitType`; phân loại entry KHÔNG có `refTable`
      refTable, refId,        // origin pointer — refTable:'products'|'posts', refId:record.id;
                              // RỖNG cho entry nhập CSV ngoài (không neo vào bảng nào có sẵn)
      text,                   // search representation — xem tools/mind-sync.js's buildSearchText/
                              // buildExternalSearchText — KHÔNG chứa giá/tồn kho/khuyến mãi (trừ
                              // entry CSV ngoài, xem bên dưới)
      version,                // string — entry auto-sync tự TĂNG DẦN mỗi lần record gốc được sync
                              // lại (spec §12 versioning, rút gọn); entry CSV luôn '1' (không
                              // idempotent, xem Case 2 bên dưới)
      status ('active'|'inactive'|'deprecated'),
      effectiveFrom, effectiveTo,  // nullable — cửa sổ hiệu lực (spec §11 temporal retrieval); null
                              // = luôn áp dụng. Entry auto-sync LUÔN null (sản phẩm/bài viết không
                              // có hạn) — chỉ có ý nghĩa cho entry CSV (company/policy/other, vd
                              // khuyến mãi/chính sách có hạn)
      authorityLevel,         // number — baseline rút gọn từ spec §6: auto-sync (product/post)=90,
                              // CSV curate tay (company/policy)=100, CSV 'other'=60 — xem
                              // tools/mind-sync.js's AUTHORITY_BY_UNIT_TYPE
      embedding,               // để sẵn chỗ cho semantic search — LUÔN RỖNG, codebase chưa có AI
                              // embedding model chạy được từ browser (xem Retrieval bên dưới)
      created_at, updated_at, deleted_at,
    }

**Vì sao không lưu giá/tồn kho/khuyến mãi**: đổi liên tục — nhúng vào ``text`` sẽ nhanh lỗi thời.
Với entry CÓ ``refTable``, field này luôn được đọc REALTIME thẳng từ record thật (project CHÍNH,
KHÔNG phải project ``llm``) ngay trước khi trả lời khách (``tools/sale-engine.js``'s
``_hydrateRealtime`` — chỉ áp dụng cho ``refTable === 'products'``), KHÔNG BAO GIỜ lấy từ ``mind``.
Entry KHÔNG có ``refTable`` (nhập CSV ngoài) thì không có gì để fetch lại — giá/khuyến mãi/tồn kho
(nếu người nhập có cung cấp) được gộp THẲNG vào ``text`` lúc import vì đó là dữ liệu tĩnh
(``buildExternalSearchText``).

Đồng bộ tự động (``tools/mind-sync.js``'s ``syncMindFromOutputTable`` / ``syncMindFromRecord``):

- Ghi ĐÈ theo id cố định ``${refTable}-${record.id}`` — idempotent, sửa record bao nhiêu lần cũng
  chỉ 1 entry duy nhất (``version`` tăng dần thay vì tạo entry mới).
- Gọi ở **2 nơi** record thực sự được tạo/sửa, cho CẢ 2 bảng ``products``/``posts``:

  1. ``svc-talk.js``'s ``_dfApprove`` — khi AI duyệt 1 job (production -> ``products``, marketing ->
     ``posts``) thành record mới (``syncMindFromOutputTable(created, output.table)``). **Không cần
     sửa gì ở ``svc-talk.js``** — điểm chạm DUY NHẤT của nó với ``mind`` là gọi hàm này, và hàm đã
     tự target đúng project ``llm`` bên trong ``mind-sync.js``.
  2. ``svc-admin.js``'s ``_dfSave`` — khi admin tự tạo/sửa tay record ``products``/``posts`` qua
     ``/admin/products``/``/admin/posts`` (kể cả giá/tồn kho/khuyến mãi — pipeline AI của production
     KHÔNG tự set mấy field này, xem ``seed-production.js``'s ``output.fields``; những field này
     KHÔNG được lưu vào ``mind`` dù vậy — chỉ ảnh hưởng lúc ``_hydrateRealtime`` đọc lại record).

- ``syncMindFromOutputTable`` tự no-op với bảng khác ``products``/``posts`` — nơi gọi không cần tự
  kiểm tra điều kiện bảng trước khi gọi.
- Best-effort — lỗi sync (vd mất mạng) không được làm hỏng việc tạo/sửa record đã thành công ở
  nơi gọi (tự nuốt lỗi + ``console.error``).

Nạp thêm thủ công (``/admin/mind`` — 2 case, đầu toolbar trước nút "+ Thêm", chiếu qua
``svc-admin.js``'s ``slot="toolbar-start"``):

**Case 1 — đồng bộ lại 1 bảng có sẵn.** Chọn 1 bảng (hiện chỉ có Sản phẩm/``products`` hoặc Bài
viết/``posts``, qua ``<web-select>``) rồi bấm "Nạp lại" — quét TOÀN BỘ record của bảng đó, gọi
``syncMindFromOutputTable`` cho từng record (idempotent, an toàn bấm nhiều lần). Dùng khi 1 lần
sync tự động bị lỡ, hoặc muốn ép nạp lại toàn bộ.

**Case 2 — nhập CSV ngoài.** Cho dữ liệu KHÔNG neo vào bảng nào có sẵn trong app (vd mô tả sản
phẩm của 1 công ty khác, paste từ nguồn ngoài, chính sách/khuyến mãi có hạn). Quy tắc:

1. Chọn 1 ``unitType`` (qua ``<web-select>``) áp dụng cho CẢ FILE (Công ty/Chính sách/Khác) —
   không đọc unitType từ CSV.
2. Upload CSV — cột CỐ ĐỊNH đúng thứ tự
   ``title|description|content|tags|pricing|promo|quantity|effectiveFrom|effectiveTo`` (dòng đầu là
   header ``title,...`` thì tự bỏ qua, không thì đọc luôn từ dòng đầu) — dựng thành 1 ``text`` duy
   nhất qua ``buildExternalSearchText`` (7 cột đầu, giá/promo/quantity gộp thẳng vào text, xem
   trên), KHÔNG lưu 7 field riêng lẻ. 2 cột cuối (``effectiveFrom``/``effectiveTo``) OPTIONAL — rỗng
   = entry luôn có hiệu lực.

Mỗi dòng tạo 1 entry MỚI (không idempotent — không có id nguồn nào để ghi đè, import lại cùng file
sẽ tạo trùng).

**Lưu ý khi sửa entry có ``refTable`` (unitType ``product``/``post``) trực tiếp trong grid
``/admin/mind``**: sửa ``text``/``authorityLevel`` sẽ bị lần sync KẾ TIẾP (record gốc được cập nhật
lại) ghi đè về nguyên bản.

----

Lịch sử chat — IndexedDB (``services/storager.js``)
=====================================================

Lịch sử chat phẳng — KHÔNG lưu Firestore (khách vãng lai không tài khoản, không cần bền vĩnh
viễn/không cần đồng bộ nhiều thiết bị) — cache local qua ``Storager`` (localforage/IndexedDB), key
``sale-chats-${visitorId}``, TTL mặc định 1 ngày (``TTL_STD``, tự hết hạn — không cần dọn dẹp thủ
công). Ghi lại toàn bộ mảng ``_log`` mỗi lần đổi (``_dfPersistLog()``) thay vì append từng doc như
Firestore.

.. code-block:: text

    {
      id,                     // crypto.randomUUID() — sinh phía client, không phải Firestore doc id
      visitorId,              // định danh khách vãng lai — crypto.randomUUID() cache localStorage
                              // (KHÔNG cross-device, đủ dùng cho MVP)
      from ('guest'|'sale'),
      content,
      wantsHuman,             // chỉ có ở entry from:'sale' — AI đánh giá khách muốn nói chuyện người thật
      created_at, updated_at, // Date.now() — timestamp thường, không phải Firestore Timestamp
    }

Đọc lịch sử của 1 khách: ``Storager.get(\`sale-chats-${visitorId}\`, [])`` — chỉ đọc được từ đúng
trình duyệt/thiết bị đã chat, và chỉ trong vòng 1 ngày kể từ lượt chat gần nhất; admin KHÔNG thể
tra lại lịch sử này từ xa (khác với ``customers`` bên dưới, vẫn còn lưu Firestore).

----

Lead capture — collection ``customers``
==========================================

Khi khách vãng lai để lại số điện thoại trong lúc chat, tự động lưu 1 lead vào ``customers`` — sống
CÙNG project Firestore với ``mind`` (``server: 'DB_LLM'``, ``PUBLIC_DB_LLM``), tách khỏi mọi bảng còn
lại của app y hệt lý do ``mind`` được tách (xem "Project Firestore riêng cho mind" ở trên).

.. code-block:: text

    {
      id,                     // = chính `phone` — idempotent, khách nhắn lại số cũ chỉ cập nhật
      visitorId,              // định danh khách vãng lai — lịch sử chat thật chỉ còn ở IndexedDB
                              // phía trình duyệt của khách (TTL 1 ngày), không tra lại được từ admin
      phone,
      name,                   // rỗng nếu khách không nói tên — AI trích, KHÔNG bịa nếu không rõ
      topic,                  // tóm tắt ngắn khách đang quan tâm gì — AI trích, rỗng nếu chưa rõ
      status ('new'|'contacted'|'closed'),  // admin tự cập nhật qua /admin/customers khi đã gọi lại
      created_at, updated_at, deleted_at,
    }

Luồng (``tools/sale-engine.js``'s ``extractPhone`` + ``svc-sale.js``'s ``_dfPostGuest``/
``_dfSaveCustomer``):

1. Mỗi tin nhắn khách gửi, ``extractPhone(content)`` chạy — **DETERMINISTIC, KHÔNG qua AI**: 1 số
   điện thoại là fact phải chính xác tuyệt đối, khác hẳn ``name``/``topic`` (rủi ro sai lệch chấp
   nhận được, xem bên dưới). GLOBAL, không chỉ VN — 2 tier:

   a. Có dấu ``+`` (chuẩn quốc tế E.164, vd ``+1...``/``+44...``/``+81...``) — tín hiệu rõ ràng nhất
      bất kể quốc gia nào, match rộng 7-15 chữ số sau dấu ``+``.
   b. KHÔNG có dấu ``+`` — fallback thu hẹp lại đúng format số di động VN (``0``/``84`` + đầu số hợp
      lệ), vì 1 run số trần không có ``+`` không đủ tín hiệu biết quốc gia nào để nới lỏng an toàn
      (dễ khớp nhầm giá tiền/mã đơn hàng). Khách quốc tế gõ số KHÔNG kèm ``+`` sẽ không được bắt tự
      động ở nhánh này.

   Chấp nhận input có dấu chấm/gạch ngang/khoảng trắng/ngoặc đơn; đánh đổi là số ở phần khác của câu
   (vd địa chỉ nhà) có thể dính vào chuỗi số đem so khớp — chấp nhận được vì đây là tính năng HỖ TRỢ
   tốt nhất có thể, tin nhắn gốc luôn còn nguyên trong lịch sử chat (IndexedDB, xem ở trên) trong
   vòng 1 ngày để đối chiếu lại thủ công nếu cần.
2. Có phát hiện số điện thoại -> ``decideSaleReply`` được gọi với ``phone`` khác rỗng — schema JSON
   xin AI mở rộng thêm 2 field ``customerName``/``topic`` CHỈ lượt này (giữ prompt ngắn nhất có thể
   mọi lượt hỏi bình thường, xem ``_buildSalePrompt``'s ``hasPhone``). Model được dặn KHÔNG tự nhắc
   hotline/hẹn liên hệ lại — phần đó do app tự thêm (xem bước 4).
3. ``_dfSaveCustomer(phone, name, topic)`` — best-effort, gọi KHÔNG ``await`` (giống
   ``tools/mind-sync.js``'s ``syncMindFromOutputTable``) — lỗi ở đây không được làm hỏng lượt chat
   đã trả lời thành công. Ghi ĐÈ theo id ``phone``; ``name``/``topic`` rỗng lượt này (AI không trích
   được) thì GIỮ NGUYÊN giá trị cũ đã lưu trước đó thay vì xoá mất.
4. Reply gửi khách LUÔN nối thêm 1 template CỐ ĐỊNH (không phải AI tự viết) đọc từ
   ``divisions`` doc ``'sale'``'s field ``hotline`` (``/admin/divisions`` — xem
   ``services/schemas/admin/divisions.js``): có hotline thì mời gọi ngay HOẶC chờ nhân viên liên hệ
   lại; KHÔNG có hotline (chưa cấu hình) thì chỉ báo "nhân viên sẽ liên hệ lại" — KHÔNG bao giờ để AI
   tự "đọc" hay bịa số hotline (hook/sales.md's "không bịa ngoài dữ liệu thật"). ``wantsHuman`` cũng
   bị ép ``true`` bất kể AI tự đoán gì — để lại số điện thoại là tín hiệu chắc chắn hơn hẳn suy đoán
   của AI.

``divisions.hotline`` mặc định RỖNG — số hotline thật khác nhau theo từng site/tenant deploy
codebase này (xem ``src/modules/shop/*.js``, ``src/modules/landing/*.js``), không có 1 số "đúng"
chung để tự seed sẵn; **admin phải tự điền qua /admin/divisions** trước khi phần "gọi ngay" hoạt
động — để trống thì tính năng vẫn chạy (vẫn lưu lead + báo "sẽ liên hệ lại"), chỉ thiếu gợi ý gọi
ngay.

Quản lý qua ``/admin/customers`` (``services/schemas/admin/customers.js``) — grid đơn giản, KHÔNG
có toolbar CSV/sync riêng như ``/admin/mind`` (ghi tự động duy nhất bởi ``svc-sale.js``, admin chỉ
xem/tra cứu lại + cập nhật ``status`` theo dõi đã liên hệ hay chưa).

----

Retrieval (``services/mind.js`` — hybrid filter + score, rút gọn từ spec §10/§11/§14/§27)
============================================================================================

Domain-agnostic, đặt ở ``services/`` (không phải ``webs/division/``) để domain thứ 2 sau này tái
dùng thẳng thay vì copy lại (spec's coding rule #46 "tách domain logic khỏi core retrieval").
``tools/sale-engine.js``'s ``shortlistMind(entries, message, limit)`` nay chỉ là 1 lệnh gọi vào
``retrieveMind(entries, message, { domain: DOMAIN_SALE, limit })``.

Pipeline:

1. **``filterActive``** (spec §10 metadata filter + §11 temporal retrieval) — loại entry
   ``deleted_at``, ``status`` không phải ``active`` (loại cả ``inactive`` lẫn ``deprecated``),
   ``domain`` khác domain truyền vào, hoặc ngoài cửa sổ ``effectiveFrom``/``effectiveTo`` tại
   ``queryDate`` (mặc định ``Date.now()``).
2. **``scoreHybrid``** (spec §27 hybrid retrieval, rút gọn — bỏ hẳn ``semanticScore`` vì không có
   embedding): ``0.6 * keywordScore + 0.25 * authorityScore + 0.15 * specificityScore``.
   ``keywordScore`` — đếm số từ trong câu hỏi khớp ``text`` (không phân biệt hoa/thường), chuẩn hoá
   về ``[0,1]`` — giữ nguyên phép đếm của ``shortlistMind`` cũ. ``authorityScore`` —
   ``authorityLevel/100``. ``specificityScore`` — entry có ``refTable`` (neo vào record thật) > entry
   rời rạc (CSV ``other``).
3. **``buildEvidencePack``** (spec §23/§28, rút gọn) — cắt về top-``limit`` (mặc định 5), giữ đúng
   field cần cho prompt: ``{text, refTable, refId, version, authorityLevel}``. 0 entry khớp từ khoá
   nào (câu hỏi mở đầu chung chung, vd "shop bán gì vậy") -> fallback dùng nguyên thứ tự đã
   filter/score, ĐÃ được caller ``findAll({ sortBy: 'updated_at', order: 'desc' })`` — tức mới cập
   nhật nhất trước.

Sau evidence pack, ``decideSaleReply`` tự gọi ``_hydrateRealtime`` — với entry ``refTable ===
'products'``, đọc thẳng giá/khuyến mãi/tồn kho từ record thật (project CHÍNH), nối thêm vào cuối
bản sao tạm của ``text`` (KHÔNG ghi ngược lại ``mind``) trước khi build prompt.

**Vector search — vẫn KHÔNG làm, cùng lý do cũ**: từng thêm ``services/tensor.js``'s
``generateEmbedding`` (NVIDIA NIM ``nvidia/nv-embedqa-e5-v5``) để rerank theo cosine similarity,
nhưng ``integrate.api.nvidia.com`` KHÔNG trả CORS header cho request thẳng từ browser
(``ERR_FAILED``/"blocked by CORS policy" — xác nhận từ console thật, không phải suy đoán). Site này
``output: 'static'``, không có backend riêng để proxy server-to-server, nên không có đường nào gọi
được NVIDIA embeddings từ client. Field ``embedding`` giữ chỗ trong schema, luôn rỗng. Muốn semantic
search thật sự cần 1 trong: (a) embedding chạy LOCAL trong browser (vd transformers.js/ONNX, không
gọi API nên không bị CORS), hoặc (b) thêm 1 backend proxy (Cloud Function) — cả 2 đều là thay đổi
kiến trúc, chưa làm.

----

Persona AI (``tools/sale-engine.js``)
======================================

Rút gọn từ ``hook/sales.md`` (1 file prompt 41 bước tạo TÀI LIỆU chiến lược bán hàng — không hợp
dùng nguyên văn cho 1 câu trả lời chat ngắn từng lượt). Giữ lại tinh thần cốt lõi: hiểu khách (tình
huống/vấn đề/nhu cầu) TRƯỚC khi bán, không bịa sản phẩm/giá/khuyến mãi ngoài ``mind``, không tạo áp
lực/khan hiếm giả. AI tự đánh giá ``wantsHuman`` (khách muốn deal riêng/khiếu nại/đòi nói chuyện
người thật) — hiện chỉ hiện 1 dòng hint nhỏ dưới bubble, CHƯA có cơ chế handoff thật sự cho nhân
viên (không có infra chat 2 chiều nào trên ``Shop.astro`` — storefront đơn, guest luôn).

**Chuyên môn là DATA, không hardcode** — ``_buildPersona(division)`` dựng persona động từ
``division.meta.role``/``division.meta.principles`` (seed 1 lần ở ``tools/seed-sale.js``, sửa tiếp
qua Xuất/Nhập CSV của ``/admin/divisions`` — cùng tinh thần ``role``/``task`` của
``seed-marketing.js``/``seed-production.js``, chỉ khác hình dạng vì sale không chạy
``StepConfig[]`` qua ``tools/engine.js``). Nén thêm từ STEP 13 (Discovery — câu hỏi tạo hiểu biết,
không tra khảo) và STEP 18 (Objection Handling — lắng nghe, xác nhận đúng mối lo, không tranh
cãi/dìm đối thủ). Thiếu ``meta.role``/``meta.principles`` (doc cũ trước khi seed được cập nhật, hoặc
``division`` load lỗi — xem ``svc-sale.js``'s ``connectedCallback`` catch) thì tự rớt về
``DEFAULT_ROLE``/``DEFAULT_PRINCIPLES`` — hành vi y hệt bản trước khi tách ra thành data.

Riêng ràng buộc "không bịa ngoài KNOWLEDGE" và cách xử lý hết hàng (bên dưới) là bảo đảm KỸ THUẬT
gắn với kiến trúc RAG — hardcode thẳng trong ``_buildPersona()``, không đưa vào seed data để không
division nào tự tắt được qua CSV.

**Hết hàng (``quantity === 0``)** — ``_hydrateRealtime()`` KHÔNG đưa số ``0`` thẳng vào knowledge
(model dễ tự lặp lại thành "hết hàng"/"out of stock" dù đã dặn ở persona), thay bằng 1 dòng
``Availability`` hướng model sang liên hệ hotline + xin số điện thoại khách NGAY trong lượt trả lời
— giữ mạch lead capture, tránh mất khách vì nghe "hết hàng" là bỏ đi luôn. Chỉ có ``evidence pack``
truyền vào prompt được lọc/xếp hạng tốt hơn (retrieval mới ở trên).

Prompt cố tình viết NGẮN NHẤT có thể (mỗi lượt hỏi đều tốn token) — persona 1 đoạn ngắn, JSON
instruction súc tích, ``shortlistMind``'s ``limit`` giảm 8 -> 5, lịch sử chat cắt còn 6 tin gần
nhất (``svc-sale.js``). ``maxTokens`` output từng giảm 700 -> 400 nhưng ĐÃ REVERT lại 700 — live
test cho thấy 400 KHÔNG đủ cho 1 câu trả lời liệt kê vài sản phẩm bằng tiếng Việt, model bị cắt
cụt giữa chuỗi JSON (``"Unterminated string in JSON"``) dù trả lời đúng nội dung — JSON hỏng do hết
token quan trọng hơn phần token tiết kiệm được.

----

Việc không làm (và vì sao) — so với hook/firebase-multidomain-ai-rag-spec.md đầy đủ
======================================================================================

Spec viết cho hệ thống multi-tenant, multi-domain, CÓ backend (Legal/Medical/Policy/Finance). Sale
là domain DUY NHẤT hiện có và site này KHÔNG có backend — các phần sau của spec cố tình KHÔNG được
mang sang, không phải bị bỏ sót:

- **Vector embeddings / Firestore KNN vector search** (spec §9) — CORS chặn browser gọi thẳng
  NVIDIA, không có backend proxy (xem mục Retrieval ở trên).
- **Cloud Functions/Cloud Run, lớp authorization server-side riêng** (spec §33) — app này ghi
  Firestore trực tiếp từ client ở MỌI bảng, project ``llm`` dùng chung trust model đó, chỉ tách
  project để giảm blast-radius, không thêm được 1 lớp quyền server-side thật sự.
- **``/domains``, ``/sources``, ``/documents``, ``/versions``, ``/relationships`` collections**
  (spec §4-7,12,13) — overkill cho 1 domain duy nhất; ``domain`` chỉ là 1 hằng JS
  (``DOMAIN_SALE``), versioning chỉ là 1 counter tăng dần trên chính entry, không cần chuỗi
  supersedes/relationship riêng.
- **Rule engine DSL** (spec §15/§16) — domain Sale không có rule tính toán kiểu "phạt vi phạm" như
  Legal; không cần.
- **Multi-jurisdiction/tenant** (spec §5/§32) — 1 shop, 1 tenant.
- **``evaluation_cases``/``query_logs``/``answer_audits``** (spec §29/§40) — chưa cần đo lường chất
  lượng retrieval ở quy mô này; có thể thêm sau nếu cần.

Việc còn để ngỏ (khác — chưa liên quan spec mới):

- ``wantsHuman`` mới chỉ là 1 flag hiển thị — chưa có luồng thông báo/hand-off thật cho admin biết
  có khách cần người thật hỗ trợ.
- Case 2 (nhập CSV ngoài) không idempotent — import trùng file sẽ tạo trùng entry, chưa có cơ chế
  dedupe theo nội dung.
