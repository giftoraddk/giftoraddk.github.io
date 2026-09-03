===
PAY
===

``webs/pay/`` là domain giao dịch buyer/seller thật (giỏ hàng → đặt hàng → thanh toán → xử lý →
giao hàng, kèm huỷ/trả hàng) — xây theo ``pay.md``. **Độc lập code 100% với ``webs/bay``** —
không import class hay hàm nghiệp vụ nào từ domain đó, chỉ dùng chung helper thuần
(``@/services/helper.js``), hạ tầng chung (``conductor.js``/``crud.js``/``storager.js``) và UI
primitive chung (``webs/apex/*``).

.. contents:: Mục lục
   :depth: 2
   :local:

----

1. Nguyên tắc thiết kế
========================

1. **Độc lập domain tuyệt đối** — mọi component của domain `pay` (svc-pay-booking, svc-pay-valider,
   svc-pay-customer, svc-pay-promo...) là code viết mới hoàn toàn, không chia sẻ logic/dữ liệu với
   domain khác, kể cả khi nội dung 2 nơi gần như giống hệt nhau. Đánh đổi: trùng lặp code có chủ
   đích.
2. **Không P2P mesh** — buyer/seller cùng đọc 1 invoice doc qua Firestore ``listen()`` thường.
   Đơn giản hơn mesh nhiều, đủ dùng cho quy mô hiện tại.
3. **Invoice thật tạo SỚM** — ngay khi buyer xác nhận đã thanh toán lần đầu, không đợi seller
   cũng xác nhận — nhờ vậy invoice xuất hiện ngay trong danh sách của seller để seller có cái mà
   bấm "xác nhận đã nhận thanh toán".
4. **1 domain lá (leaf)** — ``bay``/``Shop.astro`` được phép dùng ``pay``, ``pay`` không được
   biết gì về ``bay``. Điểm nối duy nhất là props lúc mount (``sellerId``, ``bayId``,
   ``wallet``, ``seller``), không phải import code.
5. **Giỏ hàng và checkout tách rời** — ``svc-cart`` chỉ lo "thêm vào giỏ"; toàn bộ luồng đặt
   hàng/thanh toán/xử lý/giao hàng thuộc ``svc-pay``. Prop ``isCart`` trên ``svc-pay`` gộp lại 2
   thứ này thành 1 thẻ mount duy nhất khi không cần tích hợp rời (xem `3.9 Chế độ isCart`_).

----

2. Flow tổng quát
===================

.. code-block:: text

   ┌─ Giỏ hàng (svc-cart) ────────────────────────────────────────────────────┐
   │  Fab + dialog: thêm/sửa số lượng/xoá món, áp mã khuyến mãi, ghi chú.     │
   │  KHÔNG tạo order/invoice gì — bấm "Đặt hàng →" chỉ emit cart:checkout    │
   │  { items, seller, sellerId, bayId, notes, promo } rồi tự xoá giỏ.        │
   └──────────────────────────────────────────────────────────────────────── ┘
             ↓ cart:checkout
   ┌─ Major 1: Đặt hàng (svc-pay, local — chưa có invoice) ───────────────────┐
   │  placing: seed order tạm qua setup() — hiện sản phẩm/tổng tiền           │
   │           (svc-pay-customer + svc-pay-booking chọn phương thức)          │
   │  paying:  đếm ngược 5 phút, hiện QR (svc-pay-valider) — buyer bấm        │
   │           "Xác nhận đã thanh toán" → promoteToInvoice() tạo invoice      │
   │           THẬT trên Firestore ngay (buyer_confirmed=true)                │
   └──────────────────────────────────────────────────────────────────────── ┘
             ↓ promoteToInvoice — TỪ ĐÂY invoice Firestore là nguồn sự thật
   ┌─ Major 1 (tiếp) — seller xác nhận nhận tiền ─────────────────────────────┐
   │  Seller thấy invoice ngay trong <svc-pay-warden> (buyer_confirmed=true,  │
   │  seller_confirmed=false) → bấm "Xác nhận đã nhận thanh toán"             │
   │  → major:'processing', sub:'preparing'                                  │
   └──────────────────────────────────────────────────────────────────────── ┘
             ↓
   ┌─ Major 2: Xử lý đơn hàng ─────────────────────────────────────────────────┐
   │  preparing → done (seller "Hoàn thành xử lý")                           │
   │  Huỷ (bất kỳ lúc nào ở preparing): buyer nhập lý do → pending →          │
   │    seller "Chấp nhận huỷ" (terminal, invoice.status='cancelled') hoặc    │
   │    "Từ chối huỷ"+lý do (quay lại preparing, buyer gửi lại được)          │
   └──────────────────────────────────────────────────────────────────────── ┘
             ↓ done → delivery/packing
   ┌─ Major 3: Vận chuyển ─────────────────────────────────────────────────────┐
   │  packing → shipping (seller) → delivered (seller) → received (buyer)    │
   │  Tại delivered: seller/shipper tự "Xác nhận đã giao" (meta.delivered,   │
   │  kèm ảnh minh chứng, KHÁC meta.shipping) trước — CHỈ SAU ĐÓ countdown 15 │
   │  phút tự động hoàn tất mới bắt đầu; buyer vẫn luôn tự bấm "Đã nhận hàng" │
   │  bất kỳ lúc nào được, không cần đợi.                                     │
   │  Trả hàng (delivered|received): buyer nhập lý do — KHÔNG có bước         │
   │  seller accept/reject, terminal ngay (sub:'returned')                    │
   └──────────────────────────────────────────────────────────────────────── ┘

----

3. Kiến trúc kỹ thuật
=======================

3.1 Bản đồ file
------------------

.. code-block:: text

   src/webs/pay/
   ├── svc-cart.js             # Fab + dialog giỏ hàng (thêm/sửa số lượng/xoá món, áp mã, ghi chú)
   ├── svc-pay.js              # ĐIỀU PHỐI flow/state TOÀN CỤC (order/invoice/countdown/refund) —
   │                           # KHÔNG tự render panel LIVE của từng major nữa, xem 3 file dưới
   ├── svc-pay-order.js        # Panel LIVE major 1 "Đặt hàng" (placing/paying) — thuần
   │                           # presentational, bắn event `order:*`
   ├── svc-pay-processing.js   # Panel LIVE major 2 "Xử lý đơn hàng" (preparing/cancelled/
   │                           # done) — bắn event `processing:*`
   ├── svc-pay-delivery.js     # Panel LIVE major 3 "Vận chuyển" (packing/shipping/delivered/
   │                           # received/returned) — bắn event `delivery:*`
   ├── svc-pay-reason.js       # Form dùng CHUNG "ai xử lý bước này, vì sao" (tên/sđt/ghi chú +
   │                           # ảnh minh chứng tuỳ chọn `showMedia` + nút action) — dùng bởi
   │                           # <svc-pay> (refund) VÀ cả 3 component trên. Tự nạp/lưu cache
   │                           # IndexedDB THEO TỪNG BƯỚC (`stepKey`, vd 'packing'/'shipping'/
   │                           # 'refund'...) lúc mount + nút "gán nhanh" (quickName/quickPhone/
   │                           # quickLabel, từ identity seller/buyer THẬT của invoice, xem
   │                           # svc-pay.js's _comSellerPrefill/_comBuyerPrefill)
   ├── svc-pay-warden.js       # Nút tròn + dialog quản lý TOÀN BỘ đơn — role="seller" (mặc định,
   │                           # đơn CỦA MÌNH bán, cần thêm bayId) hoặc role="buyer" ("Đơn của
   │                           # tôi", mọi seller). Mỗi dòng có 2 nút: "Xem chi tiết" (dialog ngay
   │                           # trong trang) + "Mở ở tab mới" (channel/invoice.astro, riêng biệt)
   ├── svc-pay-stats.js        # Nút tròn + dialog thống kê bán hàng (khách hàng/đơn/doanh thu/top
   │                           # sản phẩm) — đọc loadSellerInvoices(sellerId), chỉ tính đơn
   │                           # meta.sub==='received' (hoàn tất thật)
   ├── svc-pay-booking.js      # Chọn phương thức thanh toán
   ├── svc-pay-valider.js      # QR VietQR + nút xác nhận đã thanh toán
   ├── svc-pay-customer.js     # Form hồ sơ liên hệ buyer (section RIÊNG `pay_customer`)
   ├── svc-pay-promo.js        # Áp/tạo/xoá mã khuyến mãi — dùng bởi <svc-cart> lẫn <svc-chat>
   │                           # (webs/bay, widget tạo voucher riêng trong tab DM)
   ├── svc-pay-watch.js        # Trang tra cứu độc lập (channel/invoice.astro) — input mã đơn +
   │                           # mount <svc-pay role="buyer" invoiceId=...>, không cần đăng nhập.
   │                           # Đọc thêm `?bayId=` (link của seller) forward cho <svc-pay bayId=...>
   ├── styles/*.css            # 1 file CSS/component, cùng tên (Shadow DOM — KHÔNG share xuyên
   │                           # component, kể cả các cặp cha/con dùng chung template qua render.js)
   └── tools/
       ├── constant.js         # MAJOR_STEPS/SUB_STEPS/STEP_LABELS/STEP_DESC/TXT_STD/CANCEL_TXT/
       │                       # PAY_METHODS/PROMO_CODES/NOTES/resolveAccountNo — không import
       │                       # domain nào khác
       ├── service.js          # TOÀN BỘ business logic — order/pay flow, cart ops, promo ops,
       │                       # customer ops, meta status predicates — KHÔNG có Lit/html gì cả
       └── render.js           # Template-fragment THUẦN dùng chung xuyên nhiều component (Lit
                                # template là hàm thuần, share được — chỉ CSS mới cần duplicate)

3.2 2 nguồn state của ``svc-pay``
-------------------------------------

- **``_order``** — section conductor local (nanostore), chỉ tồn tại từ lúc bắt đầu order tới lúc
  buyer xác nhận thanh toán lần đầu. Field: ``order_id, bay_id, seller_id, buyer_id, items,
  amount, currency, major, sub, payment_id, buyer_confirmed, seller_confirmed, created_at,
  expires_at, updated_at``. **Persist qua Storager (IndexedDB)** — ``setup()`` tự khôi phục lại
  nếu có (``_bindOrderPersist``/``_restoreOrderStorage`` trong ``tools/service.js``), key
  ``pay_order_${service}`` — F5/đóng tab KHÔNG mất order đang xử lý (đã sửa, xem
  `5. Giới hạn & đánh đổi`_ lịch sử).
- **``_invoice``** — invoice thật trên Firestore, tồn tại từ lúc ``promoteToInvoice()`` chạy
  xong — subscribe qua ``listenInvoice(invoiceId, onNext)``. Là nguồn sự thật DÙNG CHUNG
  buyer/seller (không mesh).

Computed ``_comMajor``/``_comSub`` luôn ưu tiên đọc từ ``_invoice.meta`` nếu đã có, rơi về
``_order`` nếu chưa. Mount trực tiếp với prop ``invoiceId`` (từ ``svc-pay-warden``'s "Xem chi
tiết") bỏ qua hẳn ``_order``, chỉ subscribe thẳng invoice đó — seller thao tác được MỌI action
ngay tại đây (không chỉ ở action-column của warden), đúng yêu cầu "xem chi tiết = chính 1 svc-pay".

**Prop ``service`` scoped theo bay** (``svc-bay-sections.js`` truyền ``service="pay_${bay.id}"``)
— tránh 1 buyer đang có order ở bay A bị lẫn/đè sang order của bay B nếu cùng 1 tab chuyển bay mà
không F5. ``svc-pay`` tự ``_dcReinit()`` khi ``service`` đổi lúc component vẫn sống (mirror
``svc-cart``'s ``_dcReinit`` theo ``service``).

3.3 Invoice — Firestore, schema + ``meta``
-----------------------------------------------

Ghi qua ``createService('invoices', '', 'invoices')`` — project Firestore riêng (env
``PUBLIC_DB_INVO``, xem ``docs/CRUD.rst`` § nhiều kết nối Firestore), đúng bảng ``invoice`` theo
``docs/SCHEMA.rst``. ``invoice.status`` chỉ có ``draft|issued|cancelled`` (văn bản pháp lý) — mọi
state quy trình nằm trong ``meta`` (JSONB tự do):

.. code-block:: js

   {
     id, order_id, issued_at, status, currency, no, series, note,
     seller_id, buyer_id,           // field top-level TỰ THÊM (ngoài schema gốc) — filter
                                     // Firestore equality trực tiếp cho svc-pay-warden, không
                                     // phải parse chuỗi pipe seller/buyer bên dưới
     seller, buyer,                 // pipe string đúng schema gốc — slot cuối vẫn là userId
     items, summary,
     meta: {
       major, sub,                  // mirror MAJOR_STEPS/SUB_STEPS
       bay_id, payment_id, buyer_confirmed, seller_confirmed,
       autoCompleted,                // true nếu sub='received' đến từ autoConfirmReceived() (hết
                                      // giờ) thay vì buyer tự bấm "Đã nhận hàng"
       fulfillment: 'delivery' | 'pickup',
                                      // chọn bằng web-toggle "Giao hàng" ngay bước "Đặt hàng"
                                      // (setFulfillment() ghi vào `_order` local lúc còn 'placing',
                                      // promoteToInvoice() carry vào đây, cố định từ đó — không đổi
                                      // lại được nữa). 'delivery' → chặn "Tiếp tục thanh toán" nếu
                                      // 'pay_customer' chưa có tên/sđt/địa chỉ (xem svc-pay.js's
                                      // _comHasCustomerData()). 'pickup' → completeProcessing() bỏ
                                      // hẳn packing/shipping/delivered, nhảy thẳng sang
                                      // major='delivery', sub='received'.
       subStatus: null | 'pending' | 'rejected' | 'buyer_cancelled' | 'seller_cancelled',
                                      // TRẠNG THÁI workflow huỷ đơn — pending (buyer request, chờ
                                      // seller) → rejected (seller từ chối, buyer gửi lại được) →
                                      // pending lần nữa, HOẶC → buyer_cancelled (seller accept) /
                                      // seller_cancelled (seller tự huỷ thẳng, sellerCancelOrder()).
                                      // 2 nhánh cancelled phân biệt AI khiến đơn bị huỷ hẳn, hiện ở
                                      // svc-pay.js's title "Huỷ bởi: ...".

       // Handler tracking — "ai xử lý bước nào, lúc nào, vì sao" (truy vết) — MỌI field dùng
       // CHUNG 1 chuỗi tilde `getTime~name~phone~reason` (`return`/`delivered` có thêm slot 5
       // `media`, ảnh minh chứng, nhiều ảnh nối `|`) — "reason" và "note" là CÙNG 1 slot, stamp
       // trong hàm service.js cùng tên hành động — parse qua parseHandler(). name/phone/reason
       // LUÔN optional (không điền vẫn stamp giờ, UI fallback nhãn buyer/seller mặc định, xem
       // tools/render.js's handledByLine()). KHÔNG có field `[step]At` riêng nào (deliveredAt/
       // processingCompletedAt đã bỏ) — mốc giờ của 1 bước LUÔN đọc từ slot đầu của field đã
       // encode bước đó (`parseHandler(meta.delivered).at`, dùng để tính deadline 15 phút tự động
       // xác nhận, xem mục 3.6; `parseHandler(meta.preparing).at` cho mốc "hoàn tất lúc ..." của
       // major 'processing'). NGUYÊN TẮC: field của 1 bước LUÔN được nhập/chốt trên ĐÚNG màn hình
       // sub đó (không phải màn hình TRƯỚC nó) — completeProcessing() ghi đè `preparing` lúc bấm
       // "Hoàn thành xử lý", startShipping() ghi đè `packing` lúc bấm "Bắt đầu giao hàng",
       // confirmDeliveryDone() ghi `delivered` NGAY TRÊN màn 'delivered' (không phải màn 'shipping'
       // trước đó — xem field `shipping` bên dưới):
       preparing,        // confirmReceivedMoney() stamp lúc bắt đầu (dự kiến), completeProcessing()
                          // GHI ĐÈ bằng giá trị cuối cùng lúc bấm "Hoàn thành xử lý" — dùng chung
                          // cho cả sub 'done', không có field riêng vì luôn cùng 1 người xử lý
       packing,          // startShipping() — ai vừa đóng gói xong, nhập trên ĐÚNG màn 'packing'
                          // (KHÔNG còn nhập trên màn 'done' như trước — advanceToDelivery() không
                          // nhận `handler` nữa)
       shipping,         // confirmShipped() — ai đã CHUYỂN GIAO cho đơn vị giao hàng, nhập trên màn
                          // 'shipping'. KHÔNG dùng để tính deadline auto-confirm (đó là lúc bắt đầu
                          // vận chuyển, không phải lúc THẬT SỰ giao xong) — xem field `delivered`.
       delivered,        // confirmDeliveryDone() — seller/shipper tự "Xác nhận đã giao" NGAY TRÊN
                          // màn 'delivered' (kèm slot `media` — ảnh minh chứng đã giao, giống
                          // `return`), KHÁC `shipping` ở trên. Mốc giờ NÀY mới là cái
                          // autoConfirmReceived() dùng để tính deadline 15 phút, xem mục 3.6. Buyer
                          // không cần đợi field này mới bấm "Đã nhận hàng" được.
       received,         // confirmReceived()/autoConfirmReceived() (tự động — không name/phone)
       return,           // requestReturn() — reason của buyer + slot `media`
       refunded,         // confirmRefund() — seller xác nhận đã hoàn tiền (áp dụng cho cả sub
                          // 'cancelled' lẫn 'returned', xem mục 3.4/3.5)
       cancel,           // stamp của NGƯỜI KHỞI XƯỚNG huỷ — buyer (requestCancel) hoặc seller tự
                          // huỷ (sellerCancelOrder) — reason là lý do huỷ
       sellerCancelled,  // stamp CỦA SELLER khi acceptCancel()/rejectCancel() một yêu cầu buyer đã
                          // gửi — reason chính là lý do TỪ CHỐI lúc subStatus==='rejected' (không
                          // có field `rejectReason` riêng); KHÔNG có mặt khi seller tự huỷ thẳng
                          // (cancel đã đủ, cùng 1 người/1 thời điểm)
     },
   }

**Ghi (read-modify-write):** ``update()`` của ``crud.js`` không deep-merge JSONB, nên mọi hàm
mutate invoice đều tự ``findById`` trước rồi merge tay ``{ ...meta, ...patch }`` trước khi ghi —
cùng tradeoff với ``bumpMeta`` (``docs/SCHEMA.rst`` § meta.views/likes).

3.4 State machine — Cancel
------------------------------

.. code-block:: text

   (subStatus=null)  ──requestCancel(reason, buyer)──▶  pending
        ▲               sellerCancelOrder(reason,        │
        │               seller) — chỉ khi KHÔNG   ┌───────┴────────┐
        │               đang 'pending', đi TẮT    │                │
        │               xuống 'seller_cancelled'  acceptCancel   rejectCancel
        │               ngay không qua bước này   (seller)       (reason, seller)
        │                       │                    ▼                ▼
        │                       │            sub:'cancelled'   subStatus:'rejected'
        │                       ▼            subStatus:               │
        └──────────────► sub:'cancelled'     'buyer_cancelled'        │
                          subStatus:                                  │
                          'seller_cancelled'                          │
        └───────────────────────────── requestCancel() lại được ──────┘

Buyer khởi xướng huỷ (``requestCancel``) HOẶC seller tự huỷ thẳng (``sellerCancelOrder`` — không
cần buyer yêu cầu trước, terminal ngay). ``meta.subStatus`` là NGUỒN SỰ THẬT duy nhất cho biết
đang ở nhánh nào — 2 giá trị terminal (``buyer_cancelled``/``seller_cancelled``) phân biệt AI
khiến đơn bị huỷ hẳn (hiện ở title "Huỷ bởi: ..."). Seller accept/reject/tự huỷ có mặt ở **2
chỗ**: action-column của ``svc-pay-warden`` VÀ ngay trong ``svc-pay``'s panel ``preparing`` (khi
mount qua ``invoiceId`` từ warden's "xem chi tiết").

3.5 State machine — Return
------------------------------

Chỉ buyer, chỉ khi ``sub`` là ``delivered``/``received``, KHÔNG có bước seller accept/reject —
nhập lý do là xong, ``sub`` chuyển thẳng ``'returned'`` (terminal) cùng lúc với ``meta.return``
được ghi (1 chuỗi tilde duy nhất, xem mục 3.3).

Cả 2 nhánh terminal do tiền vẫn đã thu (``'cancelled'`` VÀ ``'returned'``) đều cần seller xác nhận
hoàn tiền qua ``confirmRefund()`` — stamp ``meta.refunded``, xem panel tương ứng ở svc-pay.js's
``_rbRefundBlock()``.

3.6 Giao hàng — xác nhận 2 phía + tự động xác nhận nhận hàng (timeout)
---------------------------------------------------------------------------

Tới ``sub:'delivered'`` (seller bấm "Đang giao hàng" ở màn 'shipping', xem ``confirmShipped()``,
stamp ``meta.shipping``), buyer LUÔN thấy ngay form "Đã nhận hàng" (có thể tự bấm bất kỳ lúc nào —
không phụ thuộc gì phía seller). Nhưng seller/shipper PHẢI tự bấm thêm 1 action riêng NGAY TRÊN
màn 'delivered' này — "Xác nhận đã giao" (``confirmDeliveryDone()``, stamp ``meta.delivered`` kèm
``media`` ảnh minh chứng giống ``return`` — xem ``<svc-pay-reason>``'s ``showMedia``, mục 3.12) —
TRƯỚC action này, seller chỉ thấy chính form đó (chưa xác nhận), KHÔNG thấy countdown nào cả.

Chỉ SAU KHI ``meta.delivered`` tồn tại, nếu buyer KHÔNG bấm "Đã nhận hàng" trong vòng
``DELIVERY_CONFIRM_WINDOW_MS`` (15 phút, ``tools/constant.js``) tính từ
``parseHandler(meta.delivered).at`` — hệ thống tự coi như hoàn tất, kết thúc invoice
(``sub -> 'received'``, gắn cờ ``meta.autoCompleted = true`` để phân biệt với buyer tự xác nhận).
Lý do tách 2 field (``shipping`` vs ``delivered``) thay vì dùng chung 1: ``shipping`` chỉ ghi nhận
"seller đã CHUYỂN GIAO cho đơn vị giao hàng" (bắt đầu hành trình vận chuyển) — countdown 15 phút
tính từ đó sẽ SAI (đếm luôn cả thời gian shipper đang trên đường), phải đợi đúng lúc "ĐÃ GIAO tới
tay buyer" (``delivered``) mới là mốc hợp lý để tính deadline.

**Liên thông dữ liệu 'shipping' -> 'delivered':** form "Xác nhận đã giao" seed sẵn tên/sđt từ
``parseHandler(meta.shipping)`` (thường CÙNG 1 người/đơn vị vừa chuyển giao vừa xác nhận đã giao,
đỡ gõ lại — xem ``svc-pay-delivery.js``'s ``willUpdate()``), buyer vẫn gõ tay tên riêng nếu khác.

**Hiển thị 2 dòng "ai xử lý" tại sub 'delivered'** (``_rfDeliveredInfo()``) — LUÔN hiện
"``handledByLabel``: <meta.shipping>" (ai chuyển giao) nếu đã có; CHỈ THÊM dòng
"``deliveredByLabel``: <meta.delivered>" (ai xác nhận đã giao) khi seller/shipper đã bấm xong
action ở trên — ``handledByLine()`` tự no-op nếu field chưa stamp nên không cần điều kiện thêm.
Render UNCONDITIONALLY ở đầu panel (không lồng trong nhánh role/isPast) — dòng "Xử lý bởi" không
biến mất chỉ vì seller đang hiện form "Xác nhận đã giao" chưa bấm xong; áp dụng đồng nhất cho
buyer (đang chờ/đã xong), seller (đang chờ nhập/đã xác nhận), và cả khi xem lại major đã qua
(``isPast``).

App không có server/cron riêng để tự canh giờ (static site + Firestore) — cơ chế thực thi hoàn
toàn CLIENT-SIDE: bất kỳ ``<svc-pay>`` nào đang mở đúng invoice này khi hết hạn (buyer's resume
view, hoặc seller xem qua ``svc-pay-warden``'s "Xem chi tiết") đều tự kiểm tra mỗi giây
(``_dcMaybeAutoConfirm()``, dùng chung timer với đếm ngược thanh toán) và gọi
``autoConfirmReceived(invoiceId)`` — hàm này tự guard theo mốc giờ đó nên gọi thừa (nhiều
client/nhiều tick) vẫn an toàn. **Đánh đổi đã biết:** nếu KHÔNG ai mở invoice trong lúc hết hạn,
việc tự động xác nhận chỉ xảy ra vào lần kế tiếp có client mở lại nó (không có gì tự chạy khi mọi
tab đều đóng) — chấp nhận được cho quy mô demo/prototype hiện tại.

3.7 Danh sách hàm — ``tools/service.js``
---------------------------------------------

- **Order/pay flow (local)** — ``setup``, ``startNewOrder``, ``addItem/removeItem/setQty``,
  ``setOrderItems``, ``setFulfillment``, ``placeOrder``
- **Promote → invoice thật** — ``promoteToInvoice(name, paymentId, sellerSlot)``
- **Post-invoice (Firestore)** — ``listenInvoice``, ``loadSellerInvoices``,
  ``listenSellerInvoices``, ``loadBuyerInvoices``, ``listenBuyerInvoices``,
  ``confirmReceivedMoney``, ``completeProcessing``, ``advanceToDelivery``, ``startShipping``,
  ``confirmShipped``, ``confirmDeliveryDone``, ``confirmReceived``, ``autoConfirmReceived``,
  ``requestCancel``, ``acceptCancel``, ``sellerCancelOrder``, ``rejectCancel``, ``confirmRefund``,
  ``requestReturn``
- **Meta status predicates (pure, không I/O)** — ``isPendingPayment(meta)``,
  ``isAwaitingReceived(meta)``, ``needsRefund(meta)`` — dùng chung bởi ``<svc-pay-warden>``'s badge
  count (``_comPendingCount``) và row actions (``_rfRow``), xem `3.11 Reuse nội bộ (đã tối ưu)`_.
- **``buildInvoiceUrl(invoiceId, {role, sellerId, bayId})`` (pure)** — dựng link tra cứu độc lập
  (``channel/invoice.astro``) dùng chung bởi ``svc-pay.js``'s ``_comInvoiceUrl`` (QR/link tự hiện
  sau khi xác nhận thanh toán) VÀ ``svc-pay-warden.js``'s nút "Mở ở tab mới" trên mỗi dòng —
  ``sellerId``/``bayId`` chỉ gắn khi ``role==='seller'``, xem `4. Wiring — nơi mount`_.
- **Cart (svc-cart)** — ``setupCart``, ``initCart``, ``addCartItem/removeCartItem/setCartQty``,
  ``toggleCartNote``, ``clearCart``
- **Promo (conductor + Storager — KHÔNG Firestore)** — ``addPromo``, ``removePromo``, ``usePromo``
- **Customer (svc-pay-customer)** — ``setupCustomer``, ``initCustomer``, ``saveCustomer``,
  ``customerSubscribe``, ``newCustomerEntry``

3.8 Promo — prop ``promosStore`` (pluggable, không Firestore)
----------------------------------------------------------------

Mặc định (không truyền ``promosStore``): ``addPromo``/``removePromo``/``usePromo`` chỉ ghi
conductor section (nanostore) + persist qua ``Storager`` (IndexedDB), giống hệt cách
``_restoreCartStorage()`` lưu ``items``/``notes`` của giỏ hàng — KHÔNG có collection Firestore
nào cho promo, KHÔNG tự đồng bộ xuyên thiết bị.

**Muốn đồng bộ thật (vd P2P mesh của ``webs/bay``) — truyền prop ``promosStore``** thay vì thêm
Firestore: ``svc-cart``/``svc-pay`` (khi ``isCart``) chấp nhận 1 override generic
``{ add, remove, use, subscribe }``. ``svc-cart`` hoàn toàn không import/biết gì về "bay"/mesh —
domain nào cần đồng bộ chỉ việc tự đóng gói store riêng rồi truyền prop xuống.

.. code-block:: text

   svc-bay-sections.js._promosStore = bayPromoAdapter.createPromosStore()
       (đóng theo bay đang active qua setActiveBay(), P2P qua mesh — không đụng gì webs/pay)
             │
             ▼ prop `promosStore`
   <svc-pay isCart .promosStore=${this._promosStore}>  ──forward──▶  <svc-cart .promosStore=...>
             │                                                              │
             ▼ owner bấm "+ Tạo mã" (toolbox, _rfPromoBtn)                  ▼ buyer áp/xem mã
   this._promosStore.add(promo)                                    promosStore.subscribe(promos => ...)
      → ghi IndexedDB db_bay cục bộ + notify local
      → SONG SONG: <svc-pay-promo>'s `promo:create` event vẫn bubbles+composed lên tới
        <svc-bay-sections> rồi <svc-bay>'s @promo:create listener → _broadcastPromo('PROMO_EVENT')
        phát cho MỌI peer khác đang mở cùng bay qua mesh — peer nhận được tự
        applyIncomingPromo() ghi vào IndexedDB db_bay CỦA HỌ, promosStore.subscribe() của họ
        thấy ngay, không cần Firestore.

Lưu ý quan trọng: việc broadcast KHÔNG phụ thuộc gì vào ``promosStore`` — nó xảy ra thuần do
``promo:create``/``promo:delete`` là custom event ``{ bubbles: true, composed: true }`` (helper
``emit()``), tự nổi qua mọi ranh giới Shadow DOM tới listener của ``svc-bay.js`` bất kể ai emit
ra nó. ``promosStore`` chỉ quyết định **nơi svc-cart tự đọc/ghi local** — nếu không truyền,
``svc-cart`` vẫn emit event bubble bình thường (domain khác vẫn nghe được ở cấp cao hơn nếu
muốn), chỉ là chính nó không có nơi nào để đọc lại state đã đồng bộ.

``src/layouts/Shop.astro`` (gian hàng đơn, không có bay/mesh) không truyền ``promosStore`` — promo
ở đó thật sự chỉ IndexedDB cục bộ, không đồng bộ được cho ai (không có khái niệm "peer" nào khác
để đồng bộ tới).

3.9 Chế độ isCart
-------------------------

Prop ``isCart`` trên ``<svc-pay>`` (mặc định ``false``) tự mount ``<svc-cart>`` BÊN TRONG, tự
bắt ``cart:checkout`` nội bộ, tự quản lý dialog order-flow của chính nó (state ``_selfOpen``) —
cùng khuôn tự chứa với ``svc-cart``/``svc-pay-warden`` (fab/nút + dialog riêng, không cần parent
bọc gì thêm). Chỉ có ý nghĩa với ``role="buyer"`` — ``<svc-cart>`` tự ẩn nếu ``role="seller"``
(seller không "mua hàng của chính mình"; chốt chặn thứ 2, độc lập với gate ``?_isOwner`` ở nơi
mount, phòng trường hợp sau này có nơi khác lỡ mount ``isCart role="seller"``).

**Prop ``position`` (mặc định ``'relative'``)** — forward thẳng xuống ``<svc-cart>`` nội bộ, quyết
định fab giỏ hàng nằm INLINE trong layout cha hay nổi CỐ ĐỊNH góc màn hình:

- ``'relative'`` (mặc định) — dùng khi ``<svc-pay isCart>`` đã nằm sẵn trong 1 hàng nút/toolbox
  (vd ``svc-bay-sections.js``'s ``_rfCartBtn``, xem `4. Wiring — nơi mount`_) — fab render như 1
  icon bình thường giữa các nút khác, không tự nổi đè lên nội dung.
- ``'fixed'`` — dùng khi ``<svc-pay isCart>`` mount RỜI ở cấp layout, không nằm trong toolbox/hàng
  nút nào (vd ``src/layouts/Shop.astro``) — fab cần tự nổi cố định góc màn hình để luôn thấy được
  dù cuộn trang.

**Lối vào lại đơn đã đặt KHÔNG còn nằm trong ``svc-pay`` nữa** (đã bỏ hẳn ``_rbResumeBtn``/
``_rbWardenBtn`` — 2 nút tròn phụ từng gắn bên trong component này). Thay vào đó, buyer VÀ seller
giờ dùng CHUNG đúng 1 ``<svc-pay-warden role=${role}>`` gắn ở cấp toolbox cha
(``svc-bay-sections.js``'s ``_rfOrdersBtn``, xem `4. Wiring — nơi mount`_) — buyer chọn
``role="buyer"``/``buyerId``, seller chọn ``role="seller"``/``sellerId``, cùng 1 code path, click
vào 1 dòng mở đúng ``<svc-pay invoiceId=...>`` này để xem/thao tác chi tiết. Buyer muốn tiếp tục 1
order đang ``'placing'``/``'paying'`` (chưa có invoice, chưa lên được danh sách warden) chỉ cần mở
lại đúng ``<svc-cart>`` (fab riêng của nó) rồi bấm "Đặt hàng →" lần nữa — ``_dhCartCheckout()`` tự
nhận diện order cũ (``setOrderItems`` thay vì ``setup`` mới) và mở lại đúng dialog order-flow.

.. code-block:: text

   isCart=false (mặc định)              isCart=true
   ─────────────────────────            ─────────────────────────
   Parent tự mount giỏ hàng RIÊNG        1 thẻ <svc-pay isCart>:
   (svc-cart hay bên thứ 3 khác)         tự có fab giỏ hàng + dialog
   + tự bọc <web-dialog>                 order-flow bên trong
   + tự nghe cart:checkout/
     pay:back-to-cart

Cả 2 event ``cart:checkout`` và ``pay:back-to-cart`` **luôn được emit** (bubbles+composed) dù
``isCart`` là gì — xử lý nội bộ không "nuốt" event, nên vẫn tích hợp rời được với giỏ hàng bên
thứ 3 bất kỳ (set ``isCart=false`` + tự nghe 2 event này, giữ nguyên hợp đồng cũ).

3.10 Comment convention
--------------------------

Theo đúng "2-Level Comment Flow" của ``docs/ARCHITECT.rst`` — hàm side-effect có docstring
``/** Flow <tên>: Input -> Output */``, bước đánh số ``[1] CHECK``/``[2] PROCESS``/``[3]
EXECUTE``/``[4] RETURN`` khi cần (``[N.a]``/``[N.b]`` chỉ thêm khi 1 bước có ≥2 nhánh đáng kể).

Đã áp dụng cho toàn bộ hàm side-effect trong ``tools/service.js`` — docstring giữ NGẮN (1 câu Flow
+ con trỏ ``xem docs/PAY.rst §X.Y``), mọi rationale/lý do thiết kế/lịch sử bug-fix chi tiết đã
CHUYỂN HẲN vào các mục 3.2-3.6 và `5. Giới hạn & đánh đổi`_ ở trên — code không lặp lại nữa, chỉ
trỏ ngược tới đây. Cũng đã áp dụng (nhẹ hơn — chỉ các hàm có side-effect thật, không đụng
render/computed) cho ``svc-cart.js`` (``_dfCheckout``), ``svc-pay-valider.js`` (``_fetchQr``) và
``svc-pay-customer.js`` (``_dhEntry``/``_dhAdd``/``_dhRemove``/``_dhSetDefault``, trước đây hoàn
toàn chưa có docstring). ``svc-pay-warden.js`` (đã có comment khá đầy đủ từ trước, theo văn phong
khác) và các component thuần trình bày (``svc-pay-booking.js``, ``svc-pay-promo.js``,
``svc-pay-watch.js`` — không có side-effect I/O thật sự đáng kể) chưa cần áp dụng lại toàn bộ.

Sau khi tách ``svc-pay.js`` thành 4 file (xem `3.12 Tách panel LIVE theo major khỏi <svc-pay>`_),
mọi hàm ``_dc*``/``_df*`` (side-effect thật — gọi ``tools/service.js``) trong CẢ 4 file đều theo
convention này; các hàm ``_dh*``/``_rb*``/``_rf*`` (event-handler nội bộ/render thuần) chỉ có
docstring khi cần giải thích 1 quyết định không hiển nhiên (vd tại sao 1 state phải ở component
cha thay vì component con).

3.11 Reuse nội bộ (đã tối ưu)
----------------------------------

Khác "trùng lặp code có chủ đích" ở `5. Giới hạn & đánh đổi`_ (đó là trùng lặp XUYÊN DOMAIN, cố ý
để giữ độc lập) — mục này là trùng lặp NỘI BỘ domain ``pay`` đã được gộp lại:

- **``isPendingPayment``/``isAwaitingReceived``/``needsRefund`` (``tools/service.js``)** — 3 biểu
  thức boolean trên ``invoice.meta`` trước đây lặp lại 2-3 lần MỖI biểu thức bên trong
  ``svc-pay-warden.js`` (``_comPendingPaymentIds``, ``_comPendingCount``, ``_rfRow``) — nay là 3
  hàm pure export dùng chung, xem mục ngay trên (`3.7 Danh sách hàm — tools/service.js`_).
- **``resolveAccountNo(method, account)`` (``tools/constant.js``)** — hợp nhất 2 cách tính số tài
  khoản/điện thoại nhận tiền trước đây khác NHAU giữa ``svc-pay-booking.js`` (``m === 'momo' ?
  account.phone : account.accountNo``) và ``svc-pay-valider.js`` (``a.accountNo ?? a.phone``) — 2
  biểu thức tình cờ cho cùng kết quả với shape ``wallet`` hiện tại, nhưng là rủi ro LỆCH nếu shape
  đổi (vd bank account thêm field ``phone`` cho hotline). Giờ cả 2 file gọi chung 1 hàm.
- **``svc-cart.js``'s ``_rfItem()``** trước đây tự định nghĩa lại 1 hàm ``fmt()`` format tiền y hệt
  ``fmtPrice`` (đã import sẵn và dùng ở chỗ khác trong CHÍNH file này) — xoá bản trùng, dùng thẳng
  ``fmtPrice``.
- **CỐ Ý KHÔNG gộp** — ``get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }`` (lặp ở gần
  như mọi ``svc-*.js`` trong domain) và ``_emit(name, detail) { emit(this, name, detail) }`` (4
  file): mỗi component có 1 dict ``TXT_STD`` RIÊNG theo đúng thiết kế (xem `1. Nguyên tắc thiết
  kế`_), phần lặp thật sự chỉ còn đúng 1 dòng gọi hàm — gộp thêm 1 tầng mixin/base-class không bù
  được độ phức tạp thêm vào, YAGNI.

3.12 Tách panel LIVE theo major khỏi ``<svc-pay>``
--------------------------------------------------------

``<svc-pay>`` từng tự render CẢ 3 panel LIVE (Đặt hàng/Xử lý đơn hàng/Vận chuyển) — ~830/1139
dòng của file. Không có trùng lặp thật sự (mỗi major là 1 khối markup/logic riêng biệt), nhưng
file quá dài để giữ mọi thứ trong 1 component — tách theo đúng convention ``svc-*`` sẵn có (cùng
khuôn với ``svc-pay-reason.js``) thành 3 file:

.. code-block:: text

   <svc-pay>                        ← ĐIỀU PHỐI: giữ _order/_invoice/_now (countdown)/_viewMajor/
   │  (svc-pay.js)                    _refundForm; mọi hàm gọi tools/service.js
   │
   ├─▶ <svc-pay-order>              ← props: subId/role/txt/cancelTxt/meta/wallet/vietqr/items/
   │      (major 'order':              amount/isDelivery/hasCustomerData/onlyDelivery/cashDisabled/
   │       placing/paying)             payMethod/paymentRef/payExpired/payRemainingLabel/invoiceId/
   │                                   invoiceUrl/invoiceQrSrc
   │      events ↑ order:payment-select {method}, order:toggle-delivery {active}, order:place {},
   │              order:back-to-cart {}, order:back-to-placing {}, order:paid {paymentId},
   │              order:confirm-payment {handler}
   │
   ├─▶ <svc-pay-processing>         ← props: subId/role/txt/cancelTxt/meta/stepTitle
   │      (major 'processing':
   │       preparing/cancelled/done)
   │      events ↑ processing:complete {handler}, processing:request-cancel {reason},
   │              processing:seller-cancel {handler}, processing:accept-cancel {handler},
   │              processing:reject-cancel {handler}, processing:advance {}
   │
   └─▶ <svc-pay-delivery>           ← props: subId/role/txt/cancelTxt/meta/buyerPrefill/
          (major 'delivery': packing/   deliveredRemainingLabel
           shipping/delivered/
           received/returned)
          events ↑ delivery:confirm-packed {handler}, delivery:confirm-shipped {handler},
                  delivery:confirm-delivery {handler}, delivery:confirm-received {handler},
                  delivery:request-return {reason, handler}

**Nguyên tắc:**

1. **Component con THUẦN presentational** — không import ``tools/service.js`` cho phần side-effect
   thật (Firestore), chỉ nhận props + bắn event lên. ``<svc-pay>`` là nơi DUY NHẤT gọi các hàm ghi
   dữ liệu (``confirmReceivedMoney``/``completeProcessing``/...).
2. **Tiền tố event theo tên major** (``order:*``/``processing:*``/``delivery:*``) — truy vết được
   ngay 1 event thuộc panel nào chỉ nhìn tên, không cần biết component nào emit nó.
3. **Form nhập (tên/sđt/ghi chú/media) là state NỘI BỘ của component con** — vd
   ``<svc-pay-processing>``'s ``_prepareForm``/``_cancelForm``/``_sellerCancelledForm``,
   ``<svc-pay-delivery>``'s ``_packingForm``/``_shippingForm``/``_shipperForm``/``_receivedForm``/
   ``_returnForm``/``_showReturnForm`` — mỗi form là 1 object ``{name, phone, note}`` (thêm
   ``media`` khi form đó bật ``<svc-pay-reason>``'s ``showMedia``, vd ``_returnForm``/
   ``_shipperForm``), KHÔNG còn tách riêng 1 state ``media`` rời như ``_returnMedia`` trước đây —
   xem điểm 9 bên dưới. ``<svc-pay>`` không còn giữ ``_handlerForms``/``_cancelReason`` nữa —
   event chỉ mang payload ĐẦY ĐỦ (``{handler}`` hoặc ``{reason}``/``{reason, handler}``) đúng lúc
   bấm action, hạn chế hẳn "chatter" theo từng keystroke lên tận component điều phối.
4. **``meta`` (invoice.meta) truyền THẲNG NGUYÊN OBJECT** xuống mỗi component con thay vì phân rã
   thành hàng chục prop nguyên thuỷ — con tự ``parseHandler(meta.field)`` khi cần (import từ
   ``tools/service.js``, hàm PURE, không phải side-effect). Giảm mạnh số prop so với phương án
   phân rã hết ra primitive.
5. **``_payMethod`` và mọi state countdown (``_now``, các getter ``_comPay*``/``_comDelivered*``)
   VẪN Ở LẠI ``<svc-pay>``** — mỗi ``subId`` trong CÙNG 1 major (vd 'placing' và 'paying') là 2
   INSTANCE component riêng biệt (``_comSubSteps.map()`` mount tất cả sub cùng lúc, xem
   ``_rbSubSteps()``), nên state cần SỐNG SÓT xuyên 2 instance đó (đổi phương thức thanh toán ở
   'placing', đọc lại ở 'paying') bắt buộc phải nằm ở component CHA — không thể là state cục bộ
   của con.
6. **Field dùng CHUNG 2 major (refund) vẫn ở lại ``<svc-pay>``** — ``_rbRefundBlock()``/
   ``_dfConfirmRefund()``/state ``_refundForm`` không thuộc riêng ``processing`` hay ``delivery``
   (áp dụng cho CẢ sub 'cancelled' lẫn 'returned') nên tách nó vào 1 trong 2 component con sẽ gây
   trùng lặp hoặc phải cross-import — giữ nguyên ở cha, render nối tiếp ngay sau component con
   tương ứng (bọc chung 1 ``.order-panel`` để giữ đúng khoảng cách dọc, xem ``_rbProcessingLive()``/
   ``_rbDeliveryLive()``).
7. **Panel tóm tắt/xem lại (major đã qua) KHÔNG tách** — ``_rbOrderReadonlySummary()``/
   ``_rbPastMajorSummary()`` nhỏ, không tương tác, chỉ đọc — vẫn ở ``<svc-pay>``, dùng
   ``tools/render.js``'s ``orderItemsBlock()``/``handledByLine()`` (xem bên dưới) để không lặp lại
   markup với component con tương ứng.
8. **CSS KHÔNG share được xuyên Shadow DOM** dù JS logic dùng chung — mỗi file
   ``styles/svc-pay-order.css``/``-processing.css``/``-delivery.css`` tự khai báo lại các class nó cần (vd ``.order-panel``/
   ``.handled-by``/``.order-items*`` lặp lại y hệt ở nhiều file) — đây là chi phí BẮT BUỘC của
   việc tách component, không phải trùng lặp có thể gộp.
9. **Ảnh minh chứng (media) dùng CHUNG qua ``<svc-pay-reason>``'s ``showMedia``** — thay vì mỗi nơi
   cần đính ảnh (return, xác nhận đã giao) tự render riêng 1 ``<web-photor-upload>`` + tự quản lý
   1 state ``media`` rời (như ``_returnMedia`` trước đây), giờ chỉ cần truyền
   ``showMedia media=${h.media} mediaPh=...`` — field ``media`` đổi giá trị cũng đi qua CHUNG event
   ``reason:input`` ({key:'media', value}) như name/phone/note, tự động gộp vào state form hiện có
   qua ``_dhFormInput()`` (không cần thêm xử lý riêng). Xem svc-pay-reason.js.

``tools/render.js`` — 3 hàm template THUẦN (Lit ``html`` tagged template là hàm bình thường, share
được xuyên file dù component dùng nó có Shadow DOM riêng): ``fmtDateTime``/``fmtCountdown`` (format
số), ``handledByLine(metaFieldValue, fallbackLabel, handledByLabel)`` (dùng bởi ``svc-pay.js``,
``svc-pay-processing.js``, ``svc-pay-delivery.js``), ``orderItemsBlock(items, amount,
txt, lang)`` (dùng bởi ``svc-pay.js`` và ``svc-pay-order.js``). Tách khỏi ``tools/service.js``
vì file đó THUẦN business logic, không có Lit — giữ ranh giới rõ giữa "logic" và "render".

----

4. Wiring — nơi mount
========================

- **``src/webs/bay/svc-bay-sections.js``** (``_rfOrdersBtn``/``_rfCartBtn``/``_rfPromoBtn``):

  - "Đơn hàng của tôi" — ``_rfOrdersBtn`` — CHUNG 1 method cho cả 2 phía, chỉ branch role/id:
    owner: ``<svc-pay-warden role="seller" .sellerId=${bay.owner_id} .bayId=${bay.id}>`` (``bayId``
    forward tiếp cho mỗi dòng's link "Mở ở tab mới", xem `3.7 Danh sách hàm — tools/service.js`_'s
    ``buildInvoiceUrl()``); khách: ``<svc-pay-warden role="buyer" .buyerId=${user?.id}>`` (không
    cần ``bayId`` — "đơn của tôi" xuyên mọi seller, không có 1 bay cố định nào).
  - Mua hàng (chỉ khách, owner KHÔNG BAO GIỜ thấy — gate ``this._isOwner ||`` bắt buộc phải có
    trong ``_rfCartBtn``, từng bị xoá nhầm lúc debug khiến owner tự mua được hàng của chính mình —
    xem lịch sử ở `5. Giới hạn & đánh đổi`_): ``<svc-pay isCart role="buyer"
    cartService=${this._comCartService} sellerId=${bay.owner_id} buyerId=${user?.id}
    bayId=${bay.id} .promosStore=${this._promosStore}>`` — 1 thẻ duy nhất.
  - Nút tạo mã khuyến mãi (owner, toolbox) → ``this._promosStore.add(promo)`` —
    ``bayPromoAdapter.createPromosStore()``, P2P mesh thật, xem
    `3.8 Promo — prop promosStore (pluggable, không Firestore)`_.

- **``src/layouts/Shop.astro``** — gian hàng đơn, không có khái niệm bay:

  - Giỏ hàng: 1 thẻ ``<svc-pay isCart position="fixed" role="buyer" sellerId="shop-cafe-abc">``
    (mount rời ở cấp layout, không nằm trong toolbox nào nên cần ``position="fixed"`` để fab tự nổi
    góc màn hình, xem `3.9 Chế độ isCart`_).
  - "Đơn hàng"/"Thống kê" KHÔNG phải page riêng (đã bỏ ``/shop/orders``, ``/shop/stats``) —
    ``<svc-pay-warden>``/``<svc-pay-stats>`` tự thân là nút tròn + dialog, mount thẳng vào slot
    ``"actions"`` của ``NavBase`` (→ ``NavMobile``'s ``<slot name="actions">``, xem
    ``components/Nav/Mobile.astro``). Role gán qua script cuối ``Shop.astro`` dựa trên
    ``auth.isAdmin()`` (import từ ``webs/auth/tools/service.js``) — admin đăng nhập = seller
    (``sellerId="shop-cafe-abc"`` cố định), còn lại = buyer (``buyerId`` = user hiện tại nếu có
    đăng nhập, rỗng nếu khách vãng lai). ``<svc-pay-stats>`` KHÔNG có chế độ buyer (chỉ seller mới
    có doanh thu/khách hàng để xem) nên bị ẩn hẳn (``display:none``) khi không phải admin — lớp
    chặn thứ 2 độc lập với gate ``adminOnly`` từng dùng ở page riêng trước đây.

- **``src/pages/channel/invoice.astro``** (``<svc-pay-watch>``) — trang tra cứu đơn hàng ĐỘC LẬP,
  không cần đăng nhập/bay nào: input mã đơn ở trên (tự điền từ query ``?id=``) rồi mount thẳng
  ``<svc-pay role=... invoiceId=...>`` bên dưới, dùng ``buildInvoiceUrl()`` (``tools/service.js``)
  ở CẢ 2 nguồn link tới trang này:

  - **Từ ``svc-pay-order.js``'s panel "paying"** — sau khi buyer xác nhận thanh toán lần đầu,
    ``svc-pay`` tự hiện QR (ảnh tĩnh từ ``api.qrserver.com``, encode absolute URL) + chính mã
    ``invoiceId`` dạng link bấm được, cùng trỏ tới trang này — cho buyer 1 cách quay lại tra cứu
    mà không cần giữ đúng tab/thiết bị/đăng nhập ban đầu (link buyer KHÔNG kèm ``sellerId``/
    ``bayId`` nên mặc định mở giao diện buyer).
  - **Từ ``svc-pay-warden.js``'s nút "Mở ở tab mới"** (mỗi dòng trong bảng) — link kèm
    ``sellerId``/``bayId`` (nếu ``role="seller"``) để trang đứng riêng này vẫn tương tác đúng như
    đang mở ngay từ chính kênh/bay đó, dù bản thân trang KHÔNG có bay context nào.

----

5. Giới hạn & đánh đổi
=========================

- **F5 mất order — ĐÃ SỬA** (trước đây ``_order`` chỉ conductor in-memory, F5 xoá trắng, nút
  "Đơn của tôi" không còn gì để resume) — giờ persist qua Storager, ``setup()`` tự khôi phục, xem
  `3.2 2 nguồn state của svc-pay`_.
- **Buyer's "Đơn của tôi" xuyên thiết bị — ĐÃ SỬA** (trước đây chỉ có nút phụ dựa
  Storager/IndexedDB bên trong ``svc-pay``, không đồng bộ khi đổi thiết bị) — giờ dùng
  ``<svc-pay-warden role="buyer">`` (Firestore ``loadBuyerInvoices``) gắn ở cấp toolbox cha,
  CHUNG code với entry point của seller (xem `3.9 Chế độ isCart`_ và
  `4. Wiring — nơi mount`_'s ``_rfOrdersBtn``), hoạt động cả khi đổi thiết bị/trình duyệt.
- **Owner tự mua hàng của chính mình — TỪNG BỊ LỘ do sửa nhầm lúc debug** — gate
  ``this._isOwner ||`` ở đầu ``_rfCartBtn()`` (``svc-bay-sections.js``) bị xoá tạm trong lúc test,
  khiến owner thấy và dùng được ``<svc-pay isCart>`` trên chính bay của mình. Đã khôi phục gate +
  giữ nguyên chốt chặn thứ 2 độc lập trong ``svc-pay.js`` (``<svc-cart>`` tự ẩn khi
  ``role==='seller'``, xem `3.9 Chế độ isCart`_) — 2 lớp chặn để lỗi tương tự khó tái diễn hơn.
- **Sửa giỏ (thêm/bớt sản phẩm) lúc đã ở bước "paying" không cập nhật gì — ĐÃ SỬA** —
  ``setOrderItems()`` trước đây chỉ áp dụng khi ``sub==='placing'`` — nếu buyer đã bấm "Tiếp tục
  thanh toán" (sub chuyển sang ``paying``, QR/amount đã sinh) rồi quay lại sửa giỏ (thêm/bớt sản
  phẩm) và checkout lại, hàm no-op HOÀN TOÀN: items không đổi, bước thanh toán cứ hiện sai
  amount/QR đã sinh cho items CŨ. Fix: ``setOrderItems()`` giờ áp dụng cho CẢ ``placing`` lẫn
  ``paying`` — nếu đang ``paying``, tự reset ``sub`` về ``placing`` + xoá ``expires_at`` (amount
  cũ không còn đúng nữa), buộc buyer bấm "Tiếp tục thanh toán" lại để sinh đúng QR/countdown mới
  theo items mới. Guard tương ứng trong ``svc-pay.js``'s ``updated()`` (nhánh sync prop ``items``
  cho isCart=false) cũng nới theo cho khớp.
- **Giỏ hàng bị xoá NGAY khi checkout, trước khi payment thật sự xác nhận — ĐÃ SỬA** — trước đây
  ``svc-cart``'s ``_dfCheckout()`` tự xoá items của chính nó ngay khi bấm "Đặt hàng →" (đúng lúc
  ``cart:checkout`` được emit), dù đơn còn ở bước ``paying`` (chưa xác nhận thanh toán, chưa có
  invoice). Hệ quả: F5/thoát rồi mở lại, thêm 1 sản phẩm mới vào giỏ (giờ trống) rồi checkout lại
  → ``setOrderItems()`` GHI ĐÈ ``_order.items`` chỉ bằng đúng sản phẩm mới đó, MẤT SẠCH items của
  đơn đang xử lý (nhìn như "tạo đơn mới" ngoài ý muốn). Fix theo đúng nguyên tắc "giỏ chỉ thật sự
  reset SAU KHI xác nhận thanh toán": ``svc-cart``'s ``_dfCheckout()`` không còn tự xoá items nữa
  (giữ nguyên cả sau checkout — cart và ``_order.items`` giờ luôn khớp nhau cho tới lúc xác nhận
  thanh toán); thêm ``clearCart(name)`` (``tools/service.js``) — chỉ được gọi từ
  ``svc-pay.js``'s ``_dfConfirmPaid()`` SAU KHI ``promoteToInvoice()`` thành công. Promo usage
  (``_dfPromoUse()``) vẫn tính ngay tại checkout như cũ (không dời theo) — tránh đếm trùng nếu
  buyer sửa giỏ/checkout lại nhiều lần trước khi xác nhận thanh toán.
- **"← Quay lại giỏ hàng" làm mất sạch items — ĐÃ SỬA** — ``svc-cart``'s ``_dfCheckout()`` tự xoá
  items của CHÍNH NÓ ngay sau khi checkout (chuyển hẳn sang sống trong ``_order.items``), nhưng
  ``_dfBackToCart()`` (``svc-pay.js``) trước đây chỉ mở lại dialog giỏ hàng mà KHÔNG trả items về
  — buyer bấm "Quay lại giỏ hàng" (chỉ có ở bước ``placing``) thấy giỏ trống trơn. Fix: ``make()``
  giờ kèm ``items: this._order?.items ?? []`` khi mở lại. Sau khi sửa giỏ (thêm/bớt/đổi số lượng)
  rồi bấm "Đặt hàng →" lại, ``_dhCartCheckout()``'s nhánh ``setOrderItems()`` sẵn có tự cập nhật
  đúng ``_order.items`` theo giỏ mới — không cần sửa gì thêm ở nhánh đó.
- **``invoice.seller`` luôn trống (chỉ có userId) — ĐÃ SỬA** — ``promoteToInvoice()`` từng ghi
  cứng 8 slot trống trước userId (chỉ ``seller_id`` ở slot cuối) dù ``<svc-pay>`` luôn nhận đúng
  thông tin seller qua prop ``seller`` (``svc-bay-sections.js``'s ``_comSellerSlot()`` hoặc
  ``Shop.astro``'s hằng số tĩnh) — chỉ là chưa từng được đọc/ghép vào invoice. Fix: thêm
  ``_buildSellerSlot(sellerSlot, sellerId)`` (cùng khuôn ``_buildBuyerSlot``) — ghép prop
  ``seller`` ("name~phone~address~email~taxCode", 5 slot) vào đúng slot 3-7 của chuỗi pipe 9 slot
  theo schema, userId ở slot cuối, 3 slot đầu (tài khoản nhận tiền) vẫn để trống (chưa có nguồn).
  ``promoteToInvoice(name, paymentId, sellerSlot)`` giờ nhận thêm tham số thứ 3 —
  ``svc-pay.js``'s ``_dfConfirmPaid()`` truyền thẳng ``this.seller``. Cùng lỗi tương tự cũng từng
  xảy ra ở phía buyer (``invoice.buyer`` luôn trống tên/sđt/địa chỉ dù buyer đã điền đủ ở
  ``<svc-pay-customer>``) — sửa cùng lúc bằng ``_buildBuyerSlot(buyerId)``, lấy từ entry
  ``isDefault``/entry đầu của section ``pay_customer``.
- **``TypeError: this._unsubInvoice is not a function`` — ĐÃ SỬA** — ``crud.js``'s ``.listen()``
  trả về ``Promise<unsubscribe>`` (không đồng bộ, xem docs/CRUD.rst), nhưng ``listenInvoice``/
  ``listenSellerInvoices``/``listenBuyerInvoices`` từng trả thẳng Promise đó ra ngoài trong khi
  MỌI call site (``svc-pay.js``/``svc-pay-warden.js``) đều gán thẳng vào ``this._unsub*`` rồi gọi
  như 1 hàm đồng bộ (``this._unsub?.()`` lúc disconnect/reinit) — gọi TRƯỚC KHI Promise resolve sẽ
  throw. Bug này có sẵn từ đầu nhưng hiếm khi bị chạm tới; ``startNewOrder()`` (mục ngay dưới) gọi
  ``this._unsubInvoice?.()`` ngay trong 1 event handler đồng bộ nên lộ ra ngay lập tức. Fix tại
  gốc: thêm ``_syncUnsub()`` bọc 3 hàm ``listenXxx`` trên — trả về 1 hàm unsub ĐỒNG BỘ ngay lập
  tức (gọi trước khi Promise resolve thì tự huỷ ngay khi resolve xong) — không cần sửa gì ở
  call site.
- **Mua tiếp sau khi order trước đã xong (received/cancelled/returned) — ĐÃ SỬA** — trước đây
  ``_dhCartCheckout()`` luôn gọi ``setOrderItems()`` nếu local order đã có ``order_id`` (bất kể
  terminal hay chưa), hàm này lại no-op khi ``sub!=='placing'`` — kết quả: dialog cứ hiện lại
  đúng step cuối của đơn CŨ (vd "Đã nhận hàng") thay vì bắt đầu đơn mới. Fix: thêm
  ``startNewOrder()`` (``tools/service.js`` — ghi đè hẳn, khác ``setup()`` idempotent) +
  ``_comOrderTerminal`` getter, gọi khi ``_comSub`` là 1 trong 3 giá trị terminal đó, kèm tự huỷ
  subscribe invoice cũ.
- **Giỏ hàng "không reset" nếu mua tiếp lần 2 lúc đơn 1 chưa xong (đã thanh toán nhưng chưa
  received/cancelled/returned) — ĐÃ SỬA** — ``_order.sub`` cục bộ KHÔNG BAO GIỜ tự tiến theo
  invoice thật (chỉ Firestore mới biết processing/delivery đã tới đâu, xem `3.2 2 nguồn state của
  svc-pay`_), nên trước đây ``_dhCartCheckout()`` dùng ``_comOrderTerminal`` (chỉ đúng lúc
  received/cancelled/returned) làm ranh giới "sửa đơn cũ" vs "đơn mới" — trong lúc đơn 1 đang được
  seller xử lý (chưa terminal), ``setOrderItems()`` vẫn CHẤP NHẬN ghi đè (không no-op như tưởng),
  khiến giỏ hàng mua lần 2 GHI ĐÈ NHẦM lên chính đơn 1 thay vì tạo đơn mới. Fix: ranh giới đổi sang
  ĐÃ CÓ INVOICE (``this.invoiceId``, set đồng bộ ngay lúc ``promoteToInvoice()`` thành công, không
  đợi tới lúc terminal) — mọi ``cart:checkout`` sau khi đã xác nhận thanh toán đều ``startNewOrder()``
  hẳn, bất kể đơn cũ đang ở bước nào.
- **Promo KHÔNG đồng bộ xuyên thiết bị trên ``Shop.astro``** (gian hàng đơn, không có
  bay/mesh) — không truyền ``promosStore`` nên promo ở đó thật sự chỉ IndexedDB cục bộ. Trong
  ``webs/bay`` thì ĐÃ đồng bộ đúng qua P2P mesh (``promosStore`` = ``bayPromoAdapter``), xem
  `3.8 Promo — prop promosStore (pluggable, không Firestore)`_.
- **Auto-confirm giao hàng phụ thuộc có client đang mở invoice** — app không có server/cron, nếu
  không ai mở lại ``<svc-pay>``/``<svc-pay-warden>`` đúng invoice đó sau khi hết hạn 5 phút thì
  việc tự chuyển ``sub -> 'received'`` chỉ xảy ra vào lần kế mở lại (không có gì tự chạy ngầm khi
  mọi tab đều đóng), xem `3.6 Giao hàng — xác nhận 2 phía + tự động xác nhận nhận hàng (timeout)`_.
- **Notes/promo code chọn ở ``svc-cart`` chưa được mang qua để lưu vào invoice cuối cùng** — chỉ
  ``items`` được chuyển tiếp qua ``cart:checkout`` → ``svc-pay``.
- **Hồ sơ liên hệ buyer là section riêng** (``svc-pay-customer``, conductor section
  ``pay_customer``) — không dùng chung với bất kỳ store "thông tin khách hàng" nào ở domain khác,
  buyer có thể phải nhập lại nếu trước đó đã nhập ở nơi khác.
- **``svc-pay-stats.js``** (webs/pay, thống kê bán hàng cho toolbox của bay) đọc invoice qua
  ``loadSellerInvoices`` (lọc top-level ``seller_id``) — KHÔNG dùng field top-level ``bay_id``
  (invoice của domain này chỉ có ``meta.bay_id``, nested).
