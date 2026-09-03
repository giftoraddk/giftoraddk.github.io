=======
CHANNEL
=======

.. note::
   Tên file giữ nguyên vì lý do lịch sử — domain gốc ``webs/channel/`` đã bị xóa hoàn toàn
   khỏi codebase. Tài liệu này mô tả domain **kế thừa cùng nguyên lý kiến trúc**: ``bay``
   (``src/webs/bay/``) — độc lập 100% về code, không import gì từ ``webs/channel/*``.

``svc-bay`` là 1 "gian hàng" P2P không cần backend riêng: user có tài khoản thật tạo 1 **bay**
(Firestore chỉ lưu vài dòng thông tin danh mục), rồi tự dựng cả 1 trang bán hàng — sản phẩm,
giới thiệu, bảng giá, FAQ, đội ngũ... — bằng cách kéo-thả section có sẵn. Người xem kết nối
thẳng P2P (WebRTC mesh) vào bay để xem nội dung, đặt hàng, chat và gọi video trực tiếp với chủ
bay. **Không dữ liệu nội dung nào chạy qua server của chúng ta** — Firestore chỉ đóng vai trò
1 "danh bạ" mỏng giúp 2 thiết bị tìm thấy nhau.

.. contents:: Mục lục
   :depth: 2
   :local:

----

1. Nguyên tắc thiết kế
======================

1. **Tài khoản thật, không guest ẩn danh** — bắt buộc đăng nhập (bảng ``users``) trước khi tạo,
   xem, mua hay chat.
2. **Firestore chỉ làm danh bạ mỏng nhất có thể** — 1 collection ``bays`` (thông tin hiển thị +
   đúng 1 field ``peer_id`` cho biết ai đang là hub PeerJS của bay đó) — không còn mảng
   ``signals[]``/``pings[]`` nào, không chứa sản phẩm/tin nhắn/đơn hàng. Xem `4.4 Signaling —
   PeerJS star topology`_.
3. **Mọi nội dung là dữ liệu P2P** — sống trong IndexedDB (``db_bay``) của từng thiết bị, đồng
   bộ giữa các peer qua WebRTC mesh, không phải Firestore.
4. **Chỉ chủ bay ghi nội dung** — người xem luôn read-only với sản phẩm/section; riêng giỏ hàng
   thì ai cũng thao tác được (dữ liệu cục bộ của chính người mua).
5. **``device_id`` (tài khoản/presence) tách khỏi ``peer_id`` (transport PeerJS)** — 1 tài khoản
   mở nhiều thiết bị/tab cùng lúc vẫn là nhiều peer độc lập; ``peer_id`` còn là 1 id ephemeral
   riêng (sinh mới mỗi lần mở bay), KHÔNG dùng ``device_id`` làm PeerJS id — xem `4.4 Signaling
   — PeerJS star topology`_.
6. **Mesh tự phục hồi, không cần thao tác thủ công** — spoke tự dò lại đúng hub hiện tại (qua
   ``peer_id`` mới nhất trên doc bay) mỗi khi hub đổi/rớt, tự retry khi timeout — xem
   `2. Flow tổng quát`_.
7. **Chia nhỏ component để dễ maintain** — ``svc-bay.js`` chỉ là orchestrator, phần UI/logic
   con tách thành custom element riêng trong cùng thư mục — xem `4.1 Bản đồ file`_.

----

2. Flow tổng quát
==================

.. code-block:: text

   ┌─ Đăng nhập (svc-bay-login.js) ────────────────────────────────────────┐
   │  Email/password hoặc Google  →  auth.set(user)  →  event bay-logged-in │
   │  (đã đăng nhập sẵn thì bỏ qua form, chỉ hiện layer loading rồi vào luôn)│
   └─────────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ Danh sách bay (svc-bay-list.js) ───────────────────────────────────────┐
   │  listenBays() realtime, phân trang 1000 row/lần (cuộn tới cuối load     │
   │  thêm)  →  sắp xếp ưu tiên: bay của mình → bay có owner đang online     │
   │  (peer_id_at — ghi lúc owner trở thành hub, không phải heartbeat)       │
   │  →  còn lại theo mới nhất                                               │
   └─────────────────────────────────────────────────────────────────────  ┘
             ↓ bấm mở 1 bay
   ┌─ Mở bay — ``_dhOpenBay()`` ──────────────────────────────────────────────┐
   │  1. Nạp cache cục bộ: devices / lịch sử chat / sections / promo đã lưu │
   │     — mở lại vẫn thấy đủ nội dung dù chưa có ai online. Products KHÔNG │
   │     nằm trong bước này — lưu Firestore thật (collection ``products``, │
   │     PUBLIC_DB), tự stream real-time riêng qua onSnapshot, xem § 4.3.5  │
   │  2. Sinh ``_peerId`` ephemeral mới, dựng mesh session (PeerJS) + đăng   │
   │     ký handler cho từng loại message                                   │
   │  3. Mở listener Firestore realtime (nghe thay đổi doc bay + ``peer_id``)│
   │  4. Commit state → báo "online" → ``_dhStartMeshRole()`` xác lập vai   │
   │     trò: owner → startHub() + ghi ``peer_id``; người khác → joinHub()  │
   │  5. Khởi 2 nhịp nền: heartbeat presence (P2P, miễn phí) + reconcile     │
   │     mesh/chat định kỳ (backstop cho spoke join lại hub) — KHÔNG còn    │
   │     heartbeat Firestore định kỳ nào                                    │
   └─────────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ Mesh sống — ``tools/mesh.js`` (PeerJS) + ``tools/session.js`` ──────────┐
   │  Star topology: hub = owner, mọi peer khác ``joinHub(peer_id)`` thẳng   │
   │  vào đúng 1 id đã biết — offer/answer/ICE đi hết qua PeerServer broker  │
   │  của PeerJS, KHÔNG còn ghi Firestore nào cho từng cặp. Rớt link báo về │
   │  NGAY (không đợi timeout) qua ``onUnlink``.                             │
   └─────────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ Đồng bộ nội dung — thuần P2P, không qua Firestore ──────────────────────┐
   │  PRESENCE · EVENT (chat) · SECTIONS_UPDATE · SECTION_ITEM_EVENT ·       │
   │  PROMO_EVENT/DELETE · CALL_* · SYNC_REQUEST/RESPONSE (bitmap dedupe +   │
   │  range-diff — vá lỗ hổng do relay lỗi/offline). Products KHÔNG còn nằm │
   │  trong luồng này — Firestore lo real-time thẳng, xem § 4.3.5           │
   └─────────────────────────────────────────────────────────────────────  ┘
             ↓
   ┌─ Trải nghiệm hiển thị ────────────────────────────────────────────────┐
   │  <svc-bay-sections>  → board sản phẩm/hero/FAQ/... + giỏ hàng + AI    │
   │  <svc-chat>          → chat nhóm + nhắn riêng + đính kèm ảnh/video    │
   │  <svc-bay-call>      → gọi audio/video 1:1 ngay trong bay             │
   └─────────────────────────────────────────────────────────────────────  ┘

----

3. Tính năng nổi bật
=====================

**Không cần server riêng, không phát sinh chi phí hạ tầng theo lượng khách** — sản phẩm, tin
nhắn, đơn hàng đều nằm ngay trên thiết bị người dùng, truyền thẳng qua kết nối P2P. Càng nhiều
khách ghé thăm, chi phí server của bạn vẫn không đổi.

**Dựng cả 1 trang bán hàng chỉ bằng kéo-thả** — 15 loại section dựng sẵn (Sản phẩm, Giới thiệu,
Bảng giá, FAQ, Đội ngũ, Đánh giá khách hàng, Blog, Đối tác tin cậy...), mỗi section tự chọn mẫu
hiển thị riêng trên ``<web-board>`` — không cần biết code vẫn ra được 1 trang chuyên nghiệp.

**Trợ lý AI viết nội dung hộ bạn** — ``<svc-assist>`` tự sinh mô tả sản phẩm hoặc nội dung
section chỉ từ vài từ khoá, có sẵn thư viện chủ đề gợi ý theo nhóm ngành để chọn nhanh.

**Giỏ hàng, thanh toán, hoá đơn — tất cả trong 1 khung chat** — khách thêm giỏ, thanh toán qua
MoMo QR, nhận hoá đơn ngay lập tức, không cần rời trang hay cài thêm ứng dụng nào.

**Mã khuyến mãi kèm hiệu ứng ăn mừng trực quan** — chủ bay tạo mã công khai hoặc tặng riêng 1
khách ngay trong tin nhắn; cả 2 phía đều thấy hiệu ứng "mưa quà" bắn lên khi mã được dùng.

**Chat thời gian thực — vừa công khai vừa riêng tư** — trò chuyện chung với mọi khách đang xem,
hoặc mở hẳn 1 luồng nhắn tin riêng 1-1; gửi kèm ảnh/video ngay trong khung chat mà không tốn 1
byte băng thông máy chủ nào (file cũng truyền thẳng P2P).

**Gọi video/audio 1:1 ngay trong bay** — không cần Zoom/Meet hay cài thêm gì, cuộc gọi chạy
thẳng trên kết nối WebRTC đã có sẵn giữa 2 bên.

**Biết chính xác ai đang online, đúng thời điểm** — khác nhiều app chat chỉ cập nhật trạng thái
sau vài phút, hệ thống phát hiện NGAY khi 1 người rớt mạng hay tắt tab đột ngột.

**Mạng lưới tự phục hồi — không cần bấm "Kết nối lại"** — mọi người xem tự nối vào đúng chủ bay
đang có mặt (star topology, xem `4.4 Signaling — PeerJS star topology`_), tự thử lại nếu chủ bay
rớt/đổi thiết bị, tự đồng bộ lại đúng những tin nhắn bị lỡ — người dùng không cần biết gì về việc
đó đang diễn ra.

**Ưu tiên hiển thị đúng bay đang có người thật sự túc trực** — danh sách bay tự đưa những nơi
chủ đang online lên đầu, khách dễ tìm được người bán sẵn sàng trả lời ngay lập tức.

**Đa thiết bị, đa ngôn ngữ, đa giao diện** — 1 tài khoản mở song song trên điện thoại + laptop
vẫn mượt; hỗ trợ Việt/Anh, sáng/tối, và giao diện "spatial" kính mờ hiện đại.

**Thông báo đẩy kể cả khi không mở tab** — có tin nhắn mới, trình duyệt tự báo ngay, không bỏ
lỡ cuộc trò chuyện nào dù đang làm việc khác.

----

4. Kiến trúc kỹ thuật
=======================

4.1 Bản đồ file
-----------------

.. code-block:: text

   src/webs/bay/
   ├── svc-bay.js              # Orchestrator — login gate, mở/đóng bay, mesh, presence, sync
   ├── svc-bay-login.js        # UI đăng nhập (email/password + Google)
   ├── svc-bay-list.js         # Danh sách bay — tạo/sửa, tìm kiếm, tab Gần tôi/Ưu tiên
   ├── svc-bay-sections.js     # Board section (products/hero/FAQ/...) + giỏ hàng + AI assist
   ├── svc-bay-stats.js        # Thống kê cho chủ bay (đơn hàng, doanh thu, top sản phẩm)
   ├── svc-bay-call.js         # UI cuộc gọi audio/video
   └── tools/
       ├── service.js          # CRUD ``bays`` + presence + chat + peer_id lookup
       ├── mesh.js              # WebRTC transport qua PeerJS (startHub/joinHub) + DataChannel wiring
       ├── session.js           # pub/sub theo msg.type, bọc mesh.js
       ├── bitmap.js             # Bloom seen-filter + bitmap dedupe/range-diff
       ├── call.js               # SDP renegotiation cho audio/video
       ├── baydb.js              # IndexedDB ``db_bay`` (9 bảng)
       ├── bayAdapter.js / baySectionAdapter.js / bayPromoAdapter.js
       │                        # Adapter cho svc-admin — products (Firestore thật) /
       │                        # sectionItems/promo (IndexedDB, P2P)
       ├── priority.js / ratelimit.js / notify.js / identity.js
       │                        # Tiện ích: đánh dấu ưu tiên, token bucket, push notify, deviceId

4.2 Schema ``bays`` (Firestore)
----------------------------------

.. code-block:: js

   // Firestore collection: bays
   {
     id:              '<firestore doc id>',
     owner_id:        '<users.id>',
     title, description, tags, pics, location, phone, momoAccountName,
     device:          { id, name, type, os, browser }, // snapshot lúc tạo, bất biến
     created_at:      '<server timestamp>',
     peer_id:         '<ulid>',     // id PeerJS hiện tại của hub (chủ bay) — ghi lúc startHub() thành
                                    // công, xoá (null) lúc chủ bay rời/đóng tab — xem § 4.4
     peer_id_at:      '<epoch ms>', // mốc ghi peer_id gần nhất — dùng để sort "owner đang online"
                                    // (isOwnerOnline()), KHÔNG phải heartbeat định kỳ
     pings:           {             // mailbox DM-khi-offline — map lồng theo (to, from), KHÔNG
       '<to_device_id>': {          // phải array — mỗi cặp 1 "chỗ" riêng, ghi đè tại chỗ, không
         '<from_device_id>': { id, to_device_id, from_device_id, from_user_id, from_user_name, created_at },
       },
     },
   }

4.3 IndexedDB ``db_bay`` — 9 bảng
------------------------------------

``devices`` (presence + thiết bị) · ``chats`` (tin nhắn, TTL 7 ngày) · ``blobs`` (file đính
kèm/ảnh, TTL 7 ngày) · ``sections`` · ``sectionItems`` · ``orders`` · ``invoices`` (ghi thêm
Firestore project riêng) · ``promos`` (keyPath ``[bay_id, code]``). Store ``products`` vẫn khai
báo cho tương thích DB_VERSION cũ nhưng không còn accessor nào ghi/đọc — xem § 4.3.5.
Cùng nguyên lý field/format với bảng ``records`` chuẩn (xem ``docs/SCHEMA.rst``) để tái dùng
được thẳng schema cột của ``svc-admin``.

4.3.5 ``products`` — Firestore thật (env ``PUBLIC_DB``)
-----------------------------------------------------------

Khác mọi bảng commerce còn lại của bay (sections/sectionItems/promos — IndexedDB + P2P mesh),
``products`` lưu thẳng collection Firestore ``products`` (project mặc định, cùng project với
``bays``) — mỗi doc có field ``bay_id`` để phân biệt sản phẩm của bay nào. Đọc/ghi đi qua
``tools/bayAdapter.js``'s ``BayProductsAdapter`` (registerAdapter tên ``bayProducts``): tự thêm
``bay_id`` khi ghi (``add``/``set``) + tự lọc theo bay đang active khi đọc (``find``/``listen``,
qua ``setActiveBay()`` — svc-bay.js gọi lúc mở/đóng bay, cùng lúc với ``setSectionActiveBay``/
``setPromoActiveBay``). Real-time đến từ Firestore ``onSnapshot`` thẳng — KHÔNG qua mesh
(PRODUCT_EVENT/SYNC_RESPONSE.products đã bị xoá), nên hiển thị đồng bộ giữa mọi thiết bị/khách
xem kể cả khi mesh của bay chưa link được peer nào.

4.4 Signaling — PeerJS star topology
---------------------------------------

.. note::
   Domain này TỪNG tự bắt tay WebRTC bằng tay (offer/answer trao đổi qua mảng ``signals[]`` trên
   doc bay, full-mesh — mỗi cặp peer tự invite riêng). Bản này **đã thay hẳn** bằng PeerJS, để
   Firestore chỉ còn đúng 1 việc: cho biết "peer-id nào đang là hub của bay này". Lý do đổi: chi
   phí ghi Firestore của ``signals[]`` scale theo **O(số cặp peer)** (mỗi handshake tốn 4 lượt
   ``arrayUnion``/``arrayRemove``, lặp lại mỗi lần có peer mới/peer rớt-nối-lại) — với PeerJS,
   toàn bộ offer/answer/ICE đi qua PeerServer broker của PeerJS (WebSocket riêng, không phải
   Firestore), Firestore chỉ ghi 1 field ``peer_id`` **đúng 1 lần** mỗi khi hub (re)start.

**Topology — star, hub = chủ bay.** ``DataConnection`` của PeerJS vốn chỉ 1:1, không có khái
niệm "room" — nên thay vì full-mesh (mỗi cặp tự nối, tốn O(N²) kết nối), mọi người xem chỉ
``joinHub(bay.peer_id)`` thẳng vào đúng 1 id đã biết (chủ bay). Chủ bay relay broadcast/JSON
message cho mọi người xem (qua ``session.relay()``, topology-agnostic sẵn — no-op đúng ở phía
spoke vì chỉ có 1 link, relay đúng ở phía hub vì có nhiều link). Đánh đổi: hub là
single-point-of-failure — chủ bay rớt thì người xem mất liên lạc VỚI NHAU (không mất liên lạc
với nội dung bay) cho tới khi chủ bay quay lại; xem thêm `5. Giới hạn & đánh đổi`_.

**Hub election — "connect-first, chỉ tự thành hub khi thấy hub cũ đã chết":**

.. code-block:: text

   Chủ bay mở bay (_dhStartMeshRole):
     đã có bay.peer_id?
       → thử joinHub(peer_id đó) trước (có thể là tab/device KHÁC của chính mình đang là hub)
       → lỗi 'peer-unavailable' (hub cũ chết) → tự startHub() + ghi peer_id mới
     chưa có bay.peer_id → startHub() luôn + ghi peer_id

   Người xem khác (_dfEnsureHubLink):
     có bay.peer_id + chưa link → joinHub(peer_id)
     retry ở 3 điểm: bay snapshot đổi peer_id, reconcile định kỳ, nhận presence mới

Cách này xử lý gọn cả 3 case cùng lúc — multi-tab cùng thiết bị, multi-device cùng chủ bay, và
Firestore đang giữ 1 ``peer_id`` cũ đã chết — vì bản thân PeerServer chính là nguồn sự thật duy
nhất về "id đó còn sống hay không", không cần tự dò thêm qua ``BroadcastChannel``.

**1 cạm bẫy PeerJS thật đã gặp và vá** (xem ``tools/mesh.js``): lỗi ``'peer-unavailable'`` (và
vài lỗi broker khác như ``'unavailable-id'``/``'network'``) chỉ emit trên object ``Peer``, KHÔNG
emit trên ``DataConnection`` — nghe lỗi chỉ ở ``conn.on('error')`` sẽ khiến promise treo vĩnh
viễn khi hub id đã chết (không bao giờ resolve/reject). Đã vá bằng cách nghe thêm
``peer.on('error')`` + thêm timeout 20s làm lưới an toàn. Đăng ký ``myId`` với PeerServer cũng
được tách thành 1 hàm dùng chung (``_ensurePeer()``, idempotent) cho cả ``startHub()``/
``joinHub()`` — tránh việc thử ``joinHub(hub cũ)`` trước (đăng ký ``myId`` thành công) rồi
``startHub()`` lại cố đăng ký ``myId`` **lần nữa** khi rơi xuống nhánh tự làm hub, gây lỗi
``unavailable-id`` (đụng chính registration mình vừa tạo).

**PeerServer broker:** dùng PeerJS Cloud công khai (``0.peerjs.com``, zero-config) làm mặc định
— không có SLA/rate-limit công bố chính thức, phù hợp quy mô hiện tại. Tự host ``peerjs-server``
(cần 1 tiến trình Node luôn chạy, khác mô hình static-site+Firestore hiện tại) là hướng nâng cấp
sau nếu cần độ ổn định cao hơn, chưa triển khai. TURN (khi 2 bên cùng sau NAT đối xứng) vẫn cấu
hình qua ``PUBLIC_BAY_TURN_URL``/``_USERNAME``/``_CREDENTIAL`` như trước — PeerJS Cloud không tự
cấp TURN, chỉ có STUN mặc định của Google.

**Ping xuyên bay** (``pings`` trên doc bay) đổi từ mảng ``arrayUnion``/``arrayRemove`` sang map
lồng theo cặp ``(to_device_id, from_device_id)`` — ghi đè tại đúng "chỗ" của cặp đó, không còn
cần ``clearPing`` (recipient tự dedupe cục bộ qua ``_seenPingIds``) — giảm từ 2 write/ping xuống 1.

**"Owner online"** đổi từ heartbeat Firestore định kỳ (``touchOwnerOnline``, mỗi 2.5 phút suốt
lúc owner mở bay) sang ghi ``peer_id``/``peer_id_at`` đúng 1 lần lúc ``startHub()`` thành công
(event-driven) — xem đánh đổi ở `5. Giới hạn & đánh đổi`_.

Tín hiệu ``onUnlink`` (``tools/mesh.js``) vẫn báo real-time khi 1 link rớt thật — số "đang
online" hiển thị (getter ``_comOnlineDevices``) nhờ đó chính xác ngay lập tức, KHÔNG qua
Firestore ở bước này (không đổi so với bản full-mesh trước) — chỉ khác là dưới star, hub giữ
nguyên granularity cũ (biết chính xác từng người xem qua map ``peerId → device_id`` học được từ
PRESENCE), còn phía người xem chỉ còn biết tín hiệu nhị phân "hub còn liên lạc được hay không"
cho những người khác (không phải bug — phản ánh đúng những gì star topology cho biết).

``_dfReconcileChat()`` gửi lại ``SYNC_REQUEST`` kèm bitmap định kỳ (không chỉ lúc mới link) cho
mọi peer đang nối — tự vá nếu 1 relay hop bị lỡ nhịp giữa phiên đang mở.

4.5 Comment convention
-------------------------

Toàn bộ hàm có side-effect thật trong ``src/webs/bay/*.js`` theo khuôn "2-Level Comment Flow":
docstring ``/** Flow <tên>: Input -> Output */`` + bước đánh số ``[1] CHECK`` / ``[2] PROCESS``
/ ``[3] EXECUTE`` / ``[4] RETURN`` (bỏ bước không áp dụng), có thể thêm bước con ``[N.a]``/
``[N.b]`` khi 1 bước có ≥2 nhánh đáng kể. Quy tắc đầy đủ + ví dụ: ``docs/ARCHITECT.rst`` §
Comment Convention — 2-Level Flow.

----

5. Giới hạn & đánh đổi
========================

- **Đơn hàng/hoá đơn không sync P2P** — chỉ nằm trên thiết bị người đặt; chủ bay không tự động
  thấy đơn từ thiết bị khác realtime.
- **Chưa có UI xem lại lịch sử đơn hàng** — dữ liệu đã ghi (``orders``/``invoices``) nhưng chưa
  có màn hình riêng để chủ bay/khách xem lại.
- **1 chủ chỉ tạo tối đa** ``MAX_BAYS_PER_USER`` **bay** (hằng số export từ ``tools/service.js``,
  hiện = 1).
- **Rate-limit chỉ là tự vệ phía client** (``createTokenBucket``), không phải security boundary
  thật — cần Firestore Security Rules/App Check nếu muốn chặn ở tầng server.
- **Field ``peer_id_at``/presence chỉ phản ánh đúng lúc bay đang mở** — ghi event-driven (lúc
  hub start), không còn heartbeat định kỳ như trước — chủ bay mở phiên dài hơn ``HEARTBEAT_MS``
  (5 phút) sẽ hiện "offline" trong sort danh sách dù vẫn đang sống/join được tức thời (chỉ ảnh
  hưởng hiển thị sort, không ảnh hưởng khả năng kết nối thật).
- **Star topology — người xem không còn nối trực tiếp được với nhau** (chỉ nối được với chủ bay
  là hub): gọi audio/video và gửi đính kèm giữa 2 người xem khác nhau (không phải chủ bay) không
  còn hoạt động — trước đây (full-mesh) có; đổi lấy việc bỏ hẳn chi phí O(số cặp peer) của
  signaling. Gọi/nhắn tin/đính kèm giữa người xem ↔ chủ bay vẫn hoạt động bình thường.
- **Phụ thuộc PeerJS Cloud (``0.peerjs.com``)** — broker công khai, miễn phí, không có SLA/
  rate-limit công bố chính thức. Tự host ``peerjs-server`` là hướng nâng cấp nếu cần độ ổn định
  cao hơn, cần 1 tiến trình Node luôn chạy (khác mô hình static-site+Firestore hiện tại) — chưa
  triển khai.
