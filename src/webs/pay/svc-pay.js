import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-steps.js';
import '@/webs/apex/web-alert.js';
import '@/webs/apex/web-dialog.js';
import '@/webs/pay/svc-cart.js';
import '@/webs/pay/svc-pay-order.js';
import '@/webs/pay/svc-pay-processing.js';
import '@/webs/pay/svc-pay-delivery.js';
import '@/webs/pay/svc-pay-reason.js';
import css from './styles/svc-pay.css?inline';
import { txtLingo, emit, watchHtmlAttr } from '@/services/helper.js';
import { NOTES, MAJOR_STEPS, SUB_STEPS, STEP_LABELS, STEP_DESC, TXT_STD, CANCEL_TXT, PAYMENT_WINDOW_MS, DELIVERY_CONFIRM_WINDOW_MS } from './tools/constant.js';
import {
    setup, startNewOrder, subscribe, get, make, placeOrder, setOrderItems, setFulfillment, promoteToInvoice, listenInvoice,
    confirmReceivedMoney, completeProcessing, advanceToDelivery, startShipping, confirmShipped, confirmDeliveryDone, confirmReceived,
    requestCancel, acceptCancel, rejectCancel, sellerCancelOrder, confirmRefund, requestReturn, autoConfirmReceived, clearCart,
    parseInvoiceItems, parseInvoiceBuyer, parseInvoiceSeller, parseHandler, customerSubscribe, buildInvoiceUrl, notifyOrderPlaced, safeDisc,
} from './tools/service.js';
import { fmtDateTime, fmtCountdown, handledByLine, orderItemsBlock } from './tools/render.js';

const _EMPTY_HANDLER = { name: '', phone: '', note: '' };

/**
 * <svc-pay> — quy trình giao dịch thật giữa buyer/seller cho 1 order (xem docs/PAY.rst §2). Điều
 * phối flow/state TOÀN CỤC (order/invoice/countdown/refund) — 3 panel LIVE theo từng major (Đặt
 * hàng/Xử lý đơn hàng/Vận chuyển) tách thành 3 component con thuần presentational —
 * `<svc-pay-order>`/`<svc-pay-processing>`/`<svc-pay-delivery>` — mỗi con chỉ bắn event
 * `order:*`/`processing:*`/`delivery:*` lên đây, KHÔNG tự gọi tools/service.js. Đầy đủ
 * contract prop/event từng component con: xem docs/PAY.rst §3.1/§3.12.
 *
 * 2 nguồn state:
 *  - `_order` — section conductor local (trước khi có invoice): items/payment method/deadline.
 *  - `_invoice` — invoice thật trên Firestore (từ lúc buyer xác nhận đã thanh toán trở đi,
 *    subscribe qua `listenInvoice`) — nguồn sự thật DÙNG CHUNG buyer/seller, không qua mesh.
 *
 * Mount trực tiếp với `invoiceId` (vd từ <svc-pay-warden> "xem chi tiết") sẽ bỏ qua hẳn state
 * local, chỉ subscribe thẳng invoice đó — seller có thể thao tác mọi action ngay tại đây (không
 * chỉ ở action-column của warden), đúng yêu cầu "xem chi tiết 1 item = chính là 1 svc-pay".
 *
 * Prop `isCart` (mặc định false) — bật tiện ích tự mount <svc-cart> BÊN TRONG <svc-pay>, tự bắt
 * `cart:checkout` + tự quản lý dialog order-flow của chính nó (giống khuôn tự chứa của
 * <svc-cart>/<svc-pay-warden>) — parent chỉ cần mount đúng 1 thẻ `<svc-pay isCart role="buyer">`,
 * không cần tự dựng dialog/nghe event nữa (xem svc-bay-sections.js/Shop.astro). Chỉ có ý nghĩa với
 * role="buyer" — <svc-cart> tự ẨN nếu role="seller" (seller không "mua hàng của chính mình").
 * Khi false (mặc định) — giữ nguyên hành vi cũ: parent tự mount giỏ hàng RIÊNG (svc-cart hoặc bất
 * kỳ giỏ hàng bên thứ 3 nào khác) + tự bọc dialog + tự nghe `cart:checkout`/`pay:back-to-cart` để
 * tích hợp rời — cả 2 event này LUÔN được emit dù `isCart` là gì, không bị "nuốt" khi xử lý nội bộ.
 *
 * Prop `position` (mặc định `'relative'`) — forward thẳng xuống <svc-cart> nội bộ khi `isCart`,
 * quyết định fab giỏ hàng nằm INLINE trong layout cha (mặc định — vd 1 icon giữa các nút khác
 * trong toolbox của svc-bay-sections.js) hay nổi CỐ ĐỊNH góc màn hình (`position="fixed"` — vd
 * Shop.astro, mount rời ở layout, không nằm trong toolbox/hàng nút nào). Không ảnh hưởng gì khi
 * `isCart=false` (không có <svc-cart> nội bộ để forward tới).
 *
 * Lối vào lại đơn đã đặt ("Đơn của tôi"/seller's order list) KHÔNG còn nằm trong component này —
 * cả buyer lẫn seller đều dùng CHUNG 1 `<svc-pay-warden role=${role}>` gắn ở cấp mount cha (xem
 * svc-bay-sections.js's `_rfOrdersBtn`), click vào 1 dòng mở đúng `<svc-pay invoiceId=...>` này để
 * xem/thao tác chi tiết.
 */
export class SvcPay extends LitElement {
    static styles = [unsafeCSS(css)];

    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        service: { type: String },

        role:      { type: String }, // 'buyer' | 'seller'
        lang:      { type: String },
        txt:       { type: Object },
        wallet:    { type: Object },
        vietqr:    { type: Object },

        invoiceId: { type: String }, // set → mở thẳng 1 invoice đã có (seller xem chi tiết từ warden)
        items:     { type: Array },  // set khi bắt đầu order mới (từ svc-cart's cart:checkout)
        sellerId:  { type: String },
        buyerId:   { type: String },
        bayId:     { type: String },

        isCart:      { type: Boolean }, // true → tự mount <svc-cart> + tự quản lý dialog order-flow
        onlyDelivery: { type: Boolean }, // true → seller KHÔNG hỗ trợ nhận tại quầy: ẩn hẳn web-toggle "Giao hàng" ở svc-pay-order.js + luôn ép fulfillment='delivery' (xem _comIsDelivery/updated())
        cashDisabled: { type: Boolean }, // true → ẩn hẳn tuỳ chọn 'Tiền mặt' ở bước chọn thanh toán (forward xuống svc-pay-order.js → svc-pay-booking.js), buộc buyer chọn momo/bank
        position:    { type: String },  // forward cho <svc-cart> nội bộ (isCart) — 'relative' (mặc định, inline trong toolbox) | 'fixed' (fab nổi cố định)
        cartService: { type: String },  // tên conductor section của <svc-cart> nội bộ — mặc định `${service}_cart`
        seller:      { type: String },  // forward cho <svc-cart> — "name~phone~address~email~taxCode"
        notes:       { type: Array },   // forward cho <svc-cart> — null/[] = dùng mặc định theo `lang`, xem _comNotes
        owner:       { type: Boolean }, // forward cho <svc-cart> (?owner= — tạo mã khuyến mãi)
        promosStore: {},                // forward cho <svc-cart> — override nguồn promo, xem svc-cart.js

        _order:        { state: true },
        _invoice:      { state: true },
        _payMethod:    { state: true }, // persist xuyên 'placing'->'paying' (2 instance khác nhau của svc-pay-order)
        _now:          { state: true },
        _refundForm:   { state: true }, // form local của _rbRefundBlock() (field 'refunded', panel dùng chung 2 major)
        _selfOpen:     { state: true }, // isCart mode: dialog order-flow tự quản
        _viewMajor:    { state: true }, // major đang XEM LẠI (khác major thật) — '' = xem đúng major hiện tại
        // Sổ liên hệ 'pay_customer' (section CHUNG của <svc-pay-customer>) — subscribe song song
        // ở đây để biết buyer đã điền đủ tên/sđt/địa chỉ chưa, phục vụ validate bắt buộc khi chọn
        // "Giao hàng" ở bước "Đặt hàng" (xem _comHasCustomerData(), forward cho svc-pay-order).
        _customerData: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.service = 'pay';

        this.role = 'buyer';
        this.lang = 'vi';
        this.txt = null;
        this.wallet = {};
        this.vietqr = {};

        this.invoiceId = '';
        this.items = [];
        this.sellerId = '';
        this.buyerId = '';
        this.bayId = '';

        this.isCart = false;
        this.onlyDelivery = false;
        this.cashDisabled = false;
        this.position = 'relative';
        this.cartService = '';
        this.seller = '';
        this.notes = null;
        this.owner = false;
        this.promosStore = null;

        this._order = null;
        this._invoice = null;
        this._payMethod = 'bank';
        this._now = 0;
        this._payTimer = null;
        this._confirmingPaid = false; // chặn double-click "Xác nhận đã thanh toán" gọi trùng promoteToInvoice/notifyOrderPlaced — không reactive, chỉ guard nội bộ

        this._refundForm = { ..._EMPTY_HANDLER };
        this._selfOpen = false;
        this._viewMajor = '';
        this._lastMajor = ''; // theo dõi major thật lần updated() trước — không reactive, chỉ so sánh nội bộ
        this._customerData = { entries: [] };

        this._unsubOrder = null;
        this._unsubInvoice = null;
        this._unsubCustomer = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._dcInit();
        // Sổ liên hệ 'pay_customer' — section CHUNG (không scoped theo `service`/bay như _order),
        // nên subscribe 1 LẦN DUY NHẤT ở đây, tách khỏi _dcInit()/_dcReinit() (chạy lại mỗi khi
        // `service` đổi — subscribe lại ở đó sẽ leak + trùng listener).
        this._unsubCustomer = customerSubscribe('pay_customer', s => { this._customerData = s ?? { entries: [] }; });
        // Tự theo dõi <html lang> (BtnLang.astro) thay vì chỉ nhận đúng 1 lần giá trị tĩnh lúc
        // mount — nơi mount hiện tại (CoreShop.astro's #pay-factor) không truyền attr `lang` nào.
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubOrder?.();
        this._unsubInvoice?.();
        this._unsubCustomer?.();
        this._unwatchLang?.();
        this._dcStopCountdown();
    }

    updated(changed) {
        // `service` đổi TRONG LÚC component vẫn sống (vd isCart mode dùng service scoped theo
        // bay — buyer chuyển sang xem 1 bay khác nhưng svc-bay-sections.js tái dùng cùng 1
        // <svc-pay> node) — phải tự reinit, không thì cứ dính mãi vào order/invoice của bay đầu
        // tiên. So `_initedService` (chốt lại mỗi lần _dcInit() chạy), không dùng trực tiếp
        // changed.has('service') vì lượt update đầu tiên cũng mang cờ đó.
        if (changed.has('service') && this.service !== this._initedService) this._dcReinit();

        if (changed.has('_order') || changed.has('_invoice')) {
            // Major thật vừa tiến thêm (khác lần updated() trước) — bỏ view-override cũ, quay lại
            // theo dõi đúng major hiện tại thay vì kẹt ở major đã xem trước đó (xem _dhMajorChange).
            if (this._viewMajor && this._comMajor !== this._lastMajor) this._viewMajor = '';
            this._lastMajor = this._comMajor;

            // 2 deadline dùng chung 1 timer nền (_now tick mỗi giây): thanh toán (paying, chưa có
            // invoice) và tự động xác nhận đã nhận hàng (delivered, seller ĐÃ "Xác nhận đã giao"
            // — có _comDeliveredAt, xem confirmDeliveryDone() ở tools/service.js) — cả 2
            // countdown hiển thị đều do component NÀY tick, chỉ forward label xuống prop cho
            // svc-pay-order/-delivery — xem _dcMaybeAutoConfirm().
            const inPaying = this._comMajor === 'order' && this._comSub === 'paying' && !this._invoice;
            const inDelivered = this._comSub === 'delivered' && !!this._comDeliveredAt;
            if (inPaying || inDelivered) this._dcStartCountdown();
            else this._dcStopCountdown();
        }
        // Component mount 1 lần rồi sống lâu dài trong <web-dialog> (chỉ toggle open, không
        // unmount) — parent đổi prop `items` MỖI LẦN buyer bấm "Đặt hàng →" mới ở <svc-cart>, sau
        // khi _dcInit() đã chạy xong từ lần mount đầu. setup() không tự cập nhật lại items cho
        // order đã có order_id (idempotent, xem tools/service.js) nên phải tự đồng bộ ở đây — cho
        // cả 'placing' lẫn 'paying' (chưa có invoice) — setOrderItems() tự lo việc reset `sub` về
        // 'placing' nếu đang ở 'paying' (items đổi thì amount/QR cũ không còn đúng nữa, xem
        // tools/service.js), tránh ghi đè order đã đi xa hơn (đã có invoice thật).
        if (changed.has('items') && !this.invoiceId && !this._invoice &&
            (this._order?.sub === 'placing' || this._order?.sub === 'paying')) {
            setOrderItems(this.service, this.items);
        }

        // onlyDelivery=true -> seller không hỗ trợ nhận tại quầy, KHÔNG được để fulfillment lỡ ở
        // 'pickup' dù nút toggle đã ẩn hẳn ở svc-pay-order.js — tự ép về 'delivery' ngay khi phát
        // hiện lệch. Kiểm tra CẢ 'placing' lẫn 'paying' (không chỉ 'placing') — order phục hồi từ
        // Storager (_restoreOrderStorage, bất đồng bộ) có thể đã kẹt ở 'paying' với fulfillment cũ
        // từ TRƯỚC KHI onlyDelivery được set trên mount này; setFulfillment() tự reset về 'placing'
        // nếu cần đổi lúc đang paying, buộc buyer xác nhận lại (đặc biệt để còn kịp thu địa chỉ —
        // xem tools/service.js). setFulfillment() tự no-op nếu order đã rời khỏi cả 2 sub đó.
        if (this.onlyDelivery && this._order && this._order.fulfillment !== 'delivery' &&
            (this._order.sub === 'placing' || this._order.sub === 'paying')) {
            setFulfillment(this.service, 'delivery');
        }
    }

    // ── DATA CORE ────────────────────────────────────────────────────────────

    /** Flow _dcInit: props (invoiceId | bayId/sellerId/buyerId/items) -> subscribe đúng nguồn
     *  state (invoice thật HOẶC order tạm local). */
    _dcInit() {
        this._initedService = this.service;
        if (this.invoiceId) {
            this._dcSubscribeInvoice(this.invoiceId); // [1] CHECK: mount thẳng 1 invoice đã có
            return;
        }
        setup(this.service, { bayId: this.bayId, sellerId: this.sellerId, buyerId: this.buyerId, items: this.items }); // [3] EXECUTE
        this._order = get(this.service);
        this._unsubOrder = subscribe(this.service, s => {
            this._order = s;
            // buyer vừa xác nhận đã thanh toán lần đầu (promoteToInvoice ghi payment_id local) →
            // bắt đầu theo dõi invoice thật (nguồn sự thật dùng chung buyer/seller từ đây).
            if (s.order_id && s.payment_id && !this._unsubInvoice) this._dcSubscribeInvoice(s.order_id);
        });
    }

    /** Flow _dcReinit: `service` đổi khi component vẫn sống -> huỷ subscribe cũ + _dcInit() lại
     *  từ đầu (isCart mode, service scoped theo bay). */
    _dcReinit() {
        this._unsubOrder?.(); this._unsubOrder = null;
        this._unsubInvoice?.(); this._unsubInvoice = null;
        this._order = null; this._invoice = null;
        this.invoiceId = ''; // luôn set nội bộ (isCart mode) khi service scoped theo bay đổi
        this._dcInit();
    }

    _dcSubscribeInvoice(id) {
        this.invoiceId = id;
        this._unsubInvoice = listenInvoice(id, row => { this._invoice = row; });
    }

    _dcStartCountdown() {
        if (this._payTimer) return;
        this._now = Date.now();
        this._payTimer = setInterval(() => {
            this._now = Date.now();
            this._dcMaybeAutoConfirm();
        }, 1000);
    }

    _dcStopCountdown() {
        if (!this._payTimer) return;
        clearInterval(this._payTimer);
        this._payTimer = null;
    }

    /** Flow _dcMaybeAutoConfirm: tick mỗi giây -> autoConfirmReceived() nếu đã quá hạn. App
     *  không có server/cron riêng — bất kỳ client nào đang mở invoice này (buyer, hoặc seller qua
     *  <svc-pay-warden>'s detail dialog) khi hết hạn đều có thể là người kích hoạt; hàm gọi tự
     *  guard theo mốc giờ nên gọi thừa vẫn an toàn — xem docs/PAY.rst §3.6. */
    _dcMaybeAutoConfirm() {
        if (this.invoiceId && this._comSub === 'delivered' && this._comDeliveredExpired) { // [1] CHECK
            autoConfirmReceived(this.invoiceId); // [3] EXECUTE
        }
    }

    // ── Computed ─────────────────────────────────────────────────────────────

    get _stepTxt() { return STEP_LABELS[this.lang] ?? STEP_LABELS.vi; }
    get _desc() { return STEP_DESC[this.lang] ?? STEP_DESC.vi; }
    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _cancelTxt() { return CANCEL_TXT[this.lang] ?? CANCEL_TXT.vi; }
    // `notes` (prop) là override — Shop.astro/1 số nơi mount truyền sẵn danh sách riêng; không
    // truyền (null/[]) thì rơi về mặc định theo `lang` (xem NOTES ở tools/constant.js).
    get _comNotes() { return (this.notes?.length ? this.notes : null) ?? NOTES[this.lang] ?? NOTES.vi; }

    // Nguồn sự thật cho major/sub — ưu tiên invoice (Firestore, dùng chung buyer/seller) một khi
    // đã tồn tại; trước đó (chưa xác nhận thanh toán lần nào) chỉ có state local `_order`.
    get _comMajor() { return this._invoice?.meta?.major ?? this._order?.major ?? MAJOR_STEPS[0]; }
    get _comSub() { return this._invoice?.meta?.sub ?? this._order?.sub ?? SUB_STEPS[MAJOR_STEPS[0]][0]; }
    get _comMeta() { return this._invoice?.meta ?? {}; }

    get _comAmount() {
        if (this._invoice) return Number((this._invoice.summary || '0~0~0').split('~')[2]) || 0;
        return Math.max(0, (this._order?.amount ?? 0) - safeDisc(this._order?.disc));
    }

    get _comPaymentRef() { return this._order?.order_id ? `PAY-${this._order.order_id}` : ''; }

    // Link tra cứu đơn hàng độc lập (src/pages/channel/invoice.astro — không cần đăng nhập/bay
    // nào, chỉ cần đúng invoiceId), forward cho svc-pay-order — xem docs/PAY.rst §4. Dùng chung
    // buildInvoiceUrl() với svc-pay-warden.js's nút "mở tab mới" — cùng 1 công thức URL.
    get _comInvoiceUrl() {
        return buildInvoiceUrl(this.invoiceId, { role: this.role, sellerId: this.sellerId, bayId: this.bayId });
    }

    // Ảnh QR sinh qua API công khai (ảnh tĩnh, không cần thêm thư viện JS) — encode thẳng
    // _comInvoiceUrl, KHÔNG phải VietQR (đây là QR điều hướng trang, không phải QR chuyển khoản).
    get _comInvoiceQrSrc() {
        if (!this._comInvoiceUrl) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(this._comInvoiceUrl)}`;
    }

    get _comCartService() { return this.cartService || `${this.service}_cart`; }

    // Hình thức nhận hàng chọn ở bước "Đặt hàng" — mặc định false (nhận tại quầy) cho tới khi
    // buyer bật toggle. Đọc từ `_order` local — chỉ có ý nghĩa TRƯỚC khi có invoice, sau đó
    // `meta.fulfillment` (đã đóng băng) là nguồn sự thật. `onlyDelivery` ép luôn true (không đợi
    // updated() ghi xong `_order.fulfillment` — tránh 1 nhịp hiển thị sai trước khi kịp ép).
    get _comIsDelivery() { return this.onlyDelivery || this._order?.fulfillment === 'delivery'; }

    // Buyer đã điền đủ tên/sđt/địa chỉ nhận hàng — bắt buộc khi _comIsDelivery, không bắt buộc
    // khi nhận tại quầy (buyer tự đến, không cần địa chỉ).
    get _comHasCustomerData() {
        const entries = this._customerData?.entries ?? [];
        const entry = entries.find(e => e.isDefault) ?? entries[0];
        return !!(entry?.fullName?.trim() && entry?.phone?.trim() && entry?.location?.trim());
    }

    // Order hiện tại đã ở trạng thái terminal — dùng để biết lúc nào phải bắt đầu 1 order MỚI
    // (startNewOrder) thay vì tái dùng order cũ khi buyer checkout tiếp, xem _dhCartCheckout().
    get _comOrderTerminal() {
        return ['cancelled', 'received', 'returned'].includes(this._comSub);
    }

    get _comMajorSteps() {
        return MAJOR_STEPS.map(id => ({ id, label: this._stepTxt[id].label }));
    }

    // Major đang được HIỂN THỊ — '' (mặc định) nghĩa là theo đúng major thật (_comMajor); khi buyer
    // bấm xem lại 1 major đã qua trên major-steps (xem _dhMajorChange), tách riêng khỏi _comMajor
    // để KHÔNG đụng vào tiến độ thật — reset lại '' ngay khi major thật tiến thêm (updated()).
    get _comViewMajor() { return this._viewMajor || this._comMajor; }

    // Đang xem lại 1 major ĐÃ QUA (không phải major thật hiện tại) — panel action LIVE (3
    // component con order/processing/delivery) chỉ có ý nghĩa với major thật, nên _rfSubPanel()
    // route sang panel tóm tắt riêng thay vì mount lại chúng.
    get _comIsPastMajor() { return this._comViewMajor !== this._comMajor; }

    // Sub đang hiển thị trên sub-steps: major thật → đúng _comSub; major đã qua → sub CUỐI CÙNG
    // của major đó (mọi sub trước đó chắc chắn cũng đã xong).
    get _comViewSub() {
        if (!this._comIsPastMajor) return this._comSub;
        const list = SUB_STEPS[this._comViewMajor] ?? [];
        return list[list.length - 1] ?? '';
    }

    // 'returned' (major 'delivery') và 'cancelled' (major 'processing') chỉ là 2 nhánh RẼ NHÁNH,
    // không phải bước kế tiếp đương nhiên — KHÔNG hiện bubble của chúng trên sub-steps cho tới khi
    // THẬT SỰ xảy ra. Nút hành động tương ứng vẫn luôn có sẵn trong panel 'preparing'/'delivered'/
    // 'received' (bên trong 2 component con) để buyer/seller chủ động bấm.
    get _comSubSteps() {
        const major = this._comViewMajor;
        const branchSubs = ['returned', 'cancelled'];
        const ids = (SUB_STEPS[major] ?? []).filter(id => !branchSubs.includes(id) || this._comSub === id);
        return ids.map(id => ({
            id, label: this._stepTxt[major][id],
            ...(this._comIsPastMajor ? { status: 'done' } : {}), // major đã qua — mọi sub của nó coi như done hết
        }));
    }

    // Desc hiện phía trên sub-steps: major thật → đúng theo _comSub; xem lại major 'order' đã qua
    // → vẫn hiện desc GỐC theo đúng sub đang xem; major đã qua khác ('processing') → để trống,
    // panel bên dưới tự hiện "hoàn tất lúc ..." (_rbPastMajorSummary), tránh lặp thông điệp 2 chỗ.
    get _comViewDesc() {
        if (!this._comIsPastMajor) return this._desc[this._comSub] ?? '';
        if (this._comViewMajor === 'order') return this._desc[this._comViewSub] ?? '';
        return '';
    }

    // Prefill cho panel do BUYER xác nhận (received/return, xem svc-pay-delivery.js) — mặc
    // định lấy theo đúng name/phone đã điền ở invoice.buyer (buyer chính là người thao tác).
    get _comBuyerPrefill() {
        const buyer = parseInvoiceBuyer(this._invoice?.buyer);
        return { name: buyer.name, phone: buyer.phone, note: '' };
    }

    // Nguồn cho nút "gán nhanh" (quickName/quickPhone, xem svc-pay-reason.js) ở mọi panel do SELLER
    // xử lý (packing/shipping/delivered/preparing/self-cancel/confirm-payment/refund...) — identity
    // seller THẬT của đúng invoice đang mở (KHÁC hẳn cache IndexedDB "lần gõ gần nhất" tự nạp sẵn
    // trong svc-pay-reason.js, không biết gì về invoice cụ thể).
    get _comSellerPrefill() {
        const seller = parseInvoiceSeller(this._invoice?.seller);
        return { name: seller.name, phone: seller.phone };
    }

    get _comPayRemainingMs() {
        return this._order?.expires_at ? Math.max(0, this._order.expires_at - this._now) : PAYMENT_WINDOW_MS;
    }

    get _comPayExpired() {
        return !!this._order?.expires_at && this._comPayRemainingMs <= 0;
    }

    get _comPayRemainingLabel() { return fmtCountdown(this._comPayRemainingMs); }

    // Mốc giờ seller/shipper tự "Xác nhận đã giao" (meta.delivered, stamp bởi confirmDeliveryDone()
    // — KHÁC meta.shipping, mốc "đã chuyển giao cho đơn vị giao hàng" chốt từ màn 'shipping') —
    // đọc thẳng slot đầu, dùng lại ở cả countdown dưới đây LẪN updated()'s `inDelivered` check.
    // Trước khi seller xác nhận, mốc này chưa tồn tại (0) nên chưa có countdown nào chạy — xem
    // docs/PAY.rst §3.6.
    get _comDeliveredAt() { return parseHandler(this._comMeta.delivered).at; }

    // Deadline tự động xác nhận "Đã nhận hàng" — DELIVERY_CONFIRM_WINDOW_MS kể từ _comDeliveredAt.
    get _comDeliveredRemainingMs() {
        if (!this._comDeliveredAt) return 0;
        return Math.max(0, this._comDeliveredAt + DELIVERY_CONFIRM_WINDOW_MS - this._now);
    }

    get _comDeliveredExpired() {
        return !!this._comDeliveredAt && this._comDeliveredRemainingMs <= 0;
    }

    get _comDeliveredRemainingLabel() { return fmtCountdown(this._comDeliveredRemainingMs); }

    // ── DATA HEAD ────────────────────────────────────────────────────────────

    _dhOrderPaymentSelect(e) { this._payMethod = e.detail.method; }

    // web-toggle "Giao hàng" (ở bước "Đặt hàng", trong svc-pay-order.js) — ghi thẳng vào
    // `_order` local (setFulfillment() tự guard chỉ áp dụng lúc còn 'placing'/'paying'), carry
    // sang invoice.meta lúc promoteToInvoice(). Toggle chỉ render lúc 'placing' nên hàm này trong
    // thực tế chỉ gọi được lúc đó — nhánh 'paying' của setFulfillment() dành cho onlyDelivery's
    // correction ở updated(), không phải cho toggle này.
    _dhOrderToggleDelivery(e) {
        setFulfillment(this.service, e.detail.active ? 'delivery' : 'pickup');
    }

    // major-steps chỉ báo id đã chọn qua event `change` (linear — luôn <= major thật, xem
    // web-steps.js) — không đụng `active` truyền vào <web-steps> (vẫn luôn = _comMajor thật, giữ
    // đúng circle/line status), chỉ đổi _viewMajor để chọn nội dung hiển thị ở .major-body.
    _dhMajorChange(e) {
        const id = e.detail?.active ?? '';
        this._viewMajor = id === this._comMajor ? '' : id;
    }

    // ── DATA HEAD (isCart) ───────────────────────────────────────────────────

    /** Flow _dhCartCheckout: cart:checkout (nội bộ, mang theo items/notes/promo) -> order tạm cập
     *  nhật/mới hẳn + mở dialog. Ranh giới "sửa đơn cũ" vs "bắt đầu đơn mới" là ĐÃ CÓ INVOICE
     *  (`this.invoiceId`, set NGAY khi buyer xác nhận thanh toán) — KHÔNG phải order đã terminal
     *  (`_comOrderTerminal`, chỉ đúng khi đơn đã received/cancelled/returned). Lý do: `_order.sub`
     *  cục bộ KHÔNG BAO GIỜ tự tiến theo invoice thật (chỉ mỗi Firestore mới biết processing/
     *  delivery đã tới đâu) — nếu vẫn dùng `_comOrderTerminal`, buyer mở giỏ mua tiếp LÚC đơn 1
     *  đang được seller xử lý (chưa terminal) sẽ bị GHI ĐÈ NHẦM lên chính đơn 1 đó thay vì tạo đơn
     *  mới, tức giỏ hàng "không reset" sau khi đã thanh toán — xem docs/PAY.rst §5 "Chỉ hỗ trợ 1
     *  order đang xử lý tại 1 thời điểm". Dùng `invoiceId` (set đồng bộ ngay trong
     *  `_dcSubscribeInvoice`, không đợi Firestore listen() trả về) thay vì `this._invoice` (populate
     *  bất đồng bộ) để tránh 1 khoảng hở ngắn ngay sau khi vừa xác nhận thanh toán. Luôn emit lại
     *  đúng event lên tiếp (bubbles) để giữ khả năng tích hợp rời với 1 giỏ hàng bên thứ 3 khác
     *  đang lắng nghe cùng sự kiện ở cấp cao hơn. */
    _dhCartCheckout(e) {
        const cartItems = e.detail?.items ?? [];
        const notes = e.detail?.notes ?? [];
        const promo = e.detail?.promo ?? null;
        const disc = Number(e.detail?.disc ?? 0) || 0;
        const opts = { bayId: this.bayId, sellerId: this.sellerId, buyerId: this.buyerId, items: cartItems, notes, promo, disc };
        if (this._order?.order_id && !this.invoiceId) { // [1] CHECK — chưa xác nhận thanh toán -> vẫn cùng 1 đơn, chỉ cập nhật giỏ
            setOrderItems(this.service, cartItems, { notes, promo, disc }); // [3.a] order cũ chưa xong -> cập nhật items + notes/promo/giảm giá
        } else {
            this._unsubInvoice?.(); this._unsubInvoice = null; // [3.b] đã thanh toán xong (có invoice) HOẶC chưa có order nào -> luôn bắt đầu đơn MỚI
            this._invoice = null;
            this.invoiceId = '';
            startNewOrder(this.service, opts);
        }
        this._order = get(this.service);
        this._selfOpen = true;
        emit(this, 'cart:checkout', e.detail);
    }

    // ── DATA FOOTER ──────────────────────────────────────────────────────────

    _dfPlaceOrder() { placeOrder(this.service); }
    _dfBackToPlacing() { make(this.service, { sub: 'placing', updated_at: Date.now() }); }

    /** Flow _dfBackToCart: {} -> đóng dialog order-flow (isCart) + đồng bộ lại items về <svc-cart>
     *  + emit pay:back-to-cart (luôn emit dù isCart hay không, giữ hợp đồng cho tích hợp rời). */
    _dfBackToCart() {
        emit(this, 'pay:back-to-cart', {});
        if (this.isCart) {
            this._selfOpen = false;
            make(this._comCartService, { items: this._order?.items ?? [], open: true }); // [3] EXECUTE
        }
    }

    /** Flow _dfConfirmPaid: order tạm (paying) -> promoteToInvoice() -> push Telegram notification
     *  + clearCart() (isCart, chỉ SAU KHI tạo invoice thành công — đây là ranh giới THẬT SỰ reset
     *  giỏ hàng, xem docs/PAY.rst §5 "Giỏ hàng bị xoá NGAY khi checkout"). Guard `_confirmingPaid`
     *  chặn double-click gọi trùng (nút chỉ tự ẩn sau khi `hasInvoice` cập nhật qua Firestore
     *  listenInvoice, có 1 khoảng trễ ngắn buyer vẫn bấm được lần 2). */
    async _dfConfirmPaid() {
        if (this._confirmingPaid) return; // [1] CHECK
        this._confirmingPaid = true;
        try {
            const invoice = await promoteToInvoice(this.service, this._comPaymentRef, this.seller); // [3] EXECUTE
            if (!invoice) return;
            notifyOrderPlaced(invoice); // [3.a] best-effort, không await — không chặn flow nếu Telegram lỗi/chậm
            if (this.isCart) clearCart(this._comCartService); // [3.b]
        } finally {
            this._confirmingPaid = false;
        }
    }

    _dfConfirmReceivedMoney(handler) { if (this.invoiceId) confirmReceivedMoney(this.invoiceId, handler); }
    _dfCompleteProcessing(handler)   { if (this.invoiceId) completeProcessing(this.invoiceId, handler); }
    _dfAdvanceToDelivery()           { if (this.invoiceId) advanceToDelivery(this.invoiceId); }
    _dfStartShipping(handler)        { if (this.invoiceId) startShipping(this.invoiceId, handler); }
    _dfConfirmShipped(handler)       { if (this.invoiceId) confirmShipped(this.invoiceId, handler); }
    _dfConfirmDeliveryDone(handler)  { if (this.invoiceId) confirmDeliveryDone(this.invoiceId, handler); }
    _dfConfirmReceived(handler)      { if (this.invoiceId) confirmReceived(this.invoiceId, handler); }

    // Buyer's simple cancel form (chỉ có `reason`, không name/phone) — name/phone tự điền theo
    // ĐÚNG buyer của invoice (_comBuyerPrefill), không để trống 2 slot đó trong meta.cancel.
    _dfRequestCancel(reason) {
        if (!(reason ?? '').trim() || !this.invoiceId) return; // [1] CHECK
        requestCancel(this.invoiceId, reason, this._comBuyerPrefill); // [3] EXECUTE
    }

    _dfAcceptCancel(handler) { if (this.invoiceId) acceptCancel(this.invoiceId, handler); }

    _dfSellerCancelOrder(handler) {
        if (!(handler.note ?? '').trim() || !this.invoiceId) return; // [1] CHECK
        sellerCancelOrder(this.invoiceId, handler.note, handler); // [3] EXECUTE
    }

    _dfConfirmRefund() { if (this.invoiceId) confirmRefund(this.invoiceId, this._refundForm); }

    _dfRejectCancel(handler) {
        if (!(handler.note ?? '').trim() || !this.invoiceId) return; // [1] CHECK
        rejectCancel(this.invoiceId, handler.note, handler); // [3] EXECUTE
    }

    _dfRequestReturn(reason, handler) {
        if (!(reason ?? '').trim() || !this.invoiceId) return; // [1] CHECK
        requestReturn(this.invoiceId, reason, handler); // [3] EXECUTE
    }

    // ── RENDER BODY ──────────────────────────────────────────────────────────

    render() {
        const body = html`
            <div class="pay-root">
                <web-steps class="major-steps" linear
                    .steps=${this._comMajorSteps}
                    active=${this._comMajor}
                    ui=${this.ui} theme=${this.theme}
                    mainColors=${this.mainColors} textColor=${this.textColor}
                    size="lg" ?ended=${this._comOrderTerminal}
                    @change=${e => this._dhMajorChange(e)}>
                </web-steps>
                <div class="major-body">
                    <p class="major-desc">${this._comViewDesc}</p>
                    ${this._rbSubSteps()}
                </div>
            </div>`;

        // isCart=false (mặc định): parent tự bọc dialog + tự truyền items — trả thẳng nội dung,
        // giữ nguyên hành vi cũ (tích hợp rời với giỏ hàng bên thứ 3 bất kỳ).
        if (!this.isCart) return body;

        // isCart=true: tự mount <svc-cart> + tự quản lý dialog order-flow của chính mình — parent
        // chỉ cần 1 thẻ <svc-pay isCart>. <svc-cart> (mua hàng) chỉ có ý nghĩa với role="buyer" —
        // seller không "mua hàng của chính mình" (chốt chặn thứ 2, độc lập với gate ?_isOwner ở
        // nơi mount). Lối vào lại đơn đã đặt dùng CHUNG 1 <svc-pay-warden> ở cấp toolbox cha, xem
        // docs/PAY.rst §3.9/§4.
        return html`
            <div class="pay-cart-wrap">
                ${this.role === 'seller' ? html`` : html`
                    <svc-cart service=${this._comCartService} position=${this.position}
                        ui=${this.ui} theme=${this.theme} lang=${this.lang} ?owner=${this.owner}
                        .wallet=${this.wallet} .notes=${this._comNotes} .promosStore=${this.promosStore}
                        seller=${this.seller} sellerId=${this.sellerId} bayId=${this.bayId}
                        @cart:checkout=${e => this._dhCartCheckout(e)}>
                    </svc-cart>`}
                <web-dialog type="mobile" ui=${this.ui} theme=${this.theme} maxWidth="640px"
                    .open=${this._selfOpen} @close=${() => { this._selfOpen = false; }}>
                    ${body}
                </web-dialog>
            </div>`;
    }

    _rbSubSteps() {
        return html`
            <web-steps class="sub-steps" isVertical linear
                .steps=${this._comSubSteps}
                active=${this._comViewSub}
                ui=${this.ui} theme=${this.theme}
                mainColors=${this.mainColors} textColor=${this.textColor}
                size="md" ?ended=${this._comOrderTerminal}>
                ${this._comSubSteps.map(s => html`<div slot=${s.id}>${this._rfSubPanel(s.id)}</div>`)}
            </web-steps>`;
    }

    // major đã qua ('order') — panel tóm tắt riêng (_rbOrderReadonlySummary) luôn hiện đủ
    // giá/sản phẩm/người mua/người bán, đọc thẳng từ invoice đã đóng băng, không nút action nào.
    // Major đã qua KHÁC ('processing') — mốc giờ hoàn tất (_rbPastMajorSummary). Route theo
    // `_comMajor` khi đang ở đúng major thật (không phải `_comViewMajor` — 2 giá trị luôn bằng
    // nhau ở nhánh này) sang đúng 1 trong 3 component con LIVE.
    _rfSubPanel(subId) {
        if (this._comIsPastMajor) {
            if (this._comViewMajor === 'order') return this._rbOrderReadonlySummary();
            return this._rbPastMajorSummary();
        }
        if (this._comMajor === 'order') return this._rbOrderLive(subId);
        if (this._comMajor === 'processing') return this._rbProcessingLive(subId);
        return this._rbDeliveryLive(subId);
    }

    _rbOrderLive(subId) {
        return html`
            <svc-pay-order
                subId=${subId} role=${this.role} lang=${this.lang}
                .txt=${this._txt} .cancelTxt=${this._cancelTxt}
                .sellerPrefill=${this._comSellerPrefill}
                ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                .wallet=${this.wallet} .vietqr=${this.vietqr}
                .items=${this._order?.items ?? []} .amount=${this._comAmount}
                ?isDelivery=${this._comIsDelivery} ?hasCustomerData=${this._comHasCustomerData}
                ?onlyDelivery=${this.onlyDelivery} ?cashDisabled=${this.cashDisabled}
                payMethod=${this._payMethod}
                paymentRef=${this._comPaymentRef}
                ?payExpired=${this._comPayExpired} payRemainingLabel=${this._comPayRemainingLabel}
                ?hasInvoice=${!!this._invoice}
                invoiceId=${this.invoiceId} invoiceUrl=${this._comInvoiceUrl} invoiceQrSrc=${this._comInvoiceQrSrc}
                @order:payment-select=${e => this._dhOrderPaymentSelect(e)}
                @order:toggle-delivery=${e => this._dhOrderToggleDelivery(e)}
                @order:place=${() => this._dfPlaceOrder()}
                @order:back-to-cart=${() => this._dfBackToCart()}
                @order:back-to-placing=${() => this._dfBackToPlacing()}
                @order:paid=${() => this._dfConfirmPaid()}
                @order:confirm-payment=${e => this._dfConfirmReceivedMoney(e.detail.handler)}>
            </svc-pay-order>`;
    }

    // 'cancelled' cần thêm bước hoàn tiền (refund) DÙNG CHUNG với major 3's 'returned' — vẫn do
    // <svc-pay> tự render (KHÔNG thuộc component con nào), bọc chung 1 `.order-panel` để giữ đúng
    // khoảng cách dọc như trước khi tách file (xem docs/PAY.rst §3.12).
    _rbProcessingLive(subId) {
        const child = html`
            <svc-pay-processing
                subId=${subId} role=${this.role} lang=${this.lang}
                .txt=${this._txt} .cancelTxt=${this._cancelTxt} .meta=${this._comMeta}
                .sellerPrefill=${this._comSellerPrefill}
                stepTitle=${this._stepTxt.processing.preparing}
                ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                @processing:complete=${e => this._dfCompleteProcessing(e.detail.handler)}
                @processing:request-cancel=${e => this._dfRequestCancel(e.detail.reason)}
                @processing:seller-cancel=${e => this._dfSellerCancelOrder(e.detail.handler)}
                @processing:accept-cancel=${e => this._dfAcceptCancel(e.detail.handler)}
                @processing:reject-cancel=${e => this._dfRejectCancel(e.detail.handler)}
                @processing:advance=${() => this._dfAdvanceToDelivery()}>
            </svc-pay-processing>`;
        if (subId !== 'cancelled') return child;
        return html`<div class="order-panel">${child}${this._rbRefundBlock()}</div>`;
    }

    // 'returned' cần thêm bước hoàn tiền — cùng lý do với 'cancelled' ở trên.
    _rbDeliveryLive(subId) {
        const child = html`
            <svc-pay-delivery
                subId=${subId} role=${this.role} lang=${this.lang}
                .txt=${this._txt} .cancelTxt=${this._cancelTxt} .meta=${this._comMeta}
                .buyerPrefill=${this._comBuyerPrefill} .sellerPrefill=${this._comSellerPrefill}
                deliveredRemainingLabel=${this._comDeliveredRemainingLabel}
                ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                @delivery:confirm-packed=${e => this._dfStartShipping(e.detail.handler)}
                @delivery:confirm-shipped=${e => this._dfConfirmShipped(e.detail.handler)}
                @delivery:confirm-delivery=${e => this._dfConfirmDeliveryDone(e.detail.handler)}
                @delivery:confirm-received=${e => this._dfConfirmReceived(e.detail.handler)}
                @delivery:request-return=${e => this._dfRequestReturn(e.detail.reason, e.detail.handler)}>
            </svc-pay-delivery>`;
        if (subId !== 'returned') return child;
        return html`<div class="order-panel">${child}${this._rbRefundBlock()}</div>`;
    }

    // Mốc "hoàn tất lúc ..." — không có field `processingCompletedAt` riêng, đọc thẳng slot đầu
    // của meta.preparing (completeProcessing() GHI ĐÈ field này đúng lúc bấm "Hoàn thành xử lý").
    _rbPastMajorSummary() {
        return html`
            <div class="order-panel">
                <p class="done-note">${this._txt.pastStepDoneAt(fmtDateTime(parseHandler(this._comMeta.preparing).at))}</p>
                ${handledByLine(this._comMeta.preparing, this._txt.roleSeller, this._txt.handledByLabel)}
            </div>`;
    }

    // Xem lại major 'order' đã qua — luôn hiện ĐẦY ĐỦ giá/sản phẩm/người mua/người bán đọc thẳng từ
    // invoice (đóng băng lúc promoteToInvoice(), đúng cả khi mount qua `invoiceId` không có `_order`).
    // Không nút action nào — chỉ đọc.
    _rbOrderReadonlySummary() {
        const buyer  = parseInvoiceBuyer(this._invoice?.buyer);
        const seller = parseInvoiceSeller(this._invoice?.seller);
        const items  = this._invoice ? parseInvoiceItems(this._invoice.items) : (this._order?.items ?? []);
        return html`
            <div class="order-panel">
                <div class="party-row">
                    <div class="party-block">
                        <span class="party-label">${this._txt.roleBuyer}</span>
                        <span class="party-value">${[buyer.name, buyer.phone].filter(Boolean).join(' · ') || '—'}</span>
                    </div>
                    <div class="party-block">
                        <span class="party-label">${this._txt.roleSeller}</span>
                        <span class="party-value">${[seller.name, seller.phone].filter(Boolean).join(' · ') || '—'}</span>
                    </div>
                </div>
                ${orderItemsBlock(items, this._comAmount, this._txt, this.lang)}
            </div>`;
    }

    // Bước hoàn tiền SAU KHI đơn đã 'cancelled'/'returned' — tiền đã thu từ lúc buyer xác nhận
    // thanh toán nên huỷ/trả hàng không tự trả lại, seller phải tự xác nhận (confirmRefund). Đã
    // hoàn (`meta.refunded` có mặt) → banner success + ai xử lý, cho CẢ 2 role xem; chưa hoàn →
    // chỉ seller thấy form xác nhận, buyer chỉ thấy 1 dòng nhắc đang chờ. Dùng chung 2 major nên
    // vẫn ở lại <svc-pay> (không thuộc riêng component con nào), form local `_refundForm`.
    _rbRefundBlock() {
        if (parseHandler(this._comMeta.refunded).at) return html`
            <div class="cancel-block">
                <web-alert type="success" ui=${this.ui} theme=${this.theme} title=${this._txt.refundDoneNote}></web-alert>
                ${handledByLine(this._comMeta.refunded, this._txt.roleSeller, this._txt.handledByLabel)}
            </div>`;

        if (this.role !== 'seller') return html`<p class="hint">${this._txt.refundPendingNote}</p>`;

        const h = this._refundForm;
        return html`
            <div class="cancel-block">
                <p class="hint">${this._txt.refundPendingNote}</p>
                <svc-pay-reason ui=${this.ui} theme=${this.theme}
                    stepKey="refund"
                    name=${h.name} phone=${h.phone} note=${h.note}
                    namePh=${this._txt.handlerNamePh} phonePh=${this._txt.handlerPhonePh} notePh=${this._txt.handlerNotePh}
                    quickName=${this._comSellerPrefill.name} quickPhone=${this._comSellerPrefill.phone} quickLabel=${this._txt.quickFillLabel}
                    actionLabel=${this._txt.confirmRefundLabel}
                    @reason:input=${e => { this._refundForm = { ...this._refundForm, [e.detail.key]: e.detail.value }; }}
                    @reason:action=${() => this._dfConfirmRefund()}>
                </svc-pay-reason>
            </div>`;
    }
}

if (!customElements.get('svc-pay')) customElements.define('svc-pay', SvcPay);
