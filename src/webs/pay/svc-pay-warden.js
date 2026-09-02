import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-dialog.js';
import '@/webs/apex/web-fab.js';
import '@/webs/pay/svc-pay.js';
import css from './styles/svc-pay-warden.css?inline';
import { fmtPrice, fmtBadgeCount, watchHtmlAttr } from '@/services/helper.js';
import { STEP_LABELS, CANCEL_TXT } from './tools/constant.js';
import {
    loadSellerInvoices, listenSellerInvoices, loadBuyerInvoices, listenBuyerInvoices,
    confirmReceivedMoney, confirmReceived, acceptCancel, rejectCancel, confirmRefund,
    parseInvoiceItems, parseInvoiceBuyer, parseInvoiceSeller, buildInvoiceUrl,
    isPendingPayment, isAwaitingReceived, needsRefund,
} from './tools/service.js';

/**
 * <svc-pay-warden> — nút tròn trong toolbox (cùng khuôn <svc-pay-stats>/<svc-promo type="circle">)
 * mở dialog quản lý TOÀN BỘ đơn hàng của 1 người — 2 chế độ tuỳ prop `role`:
 *  - role="seller" (mặc định, cần `sellerId`, nên kèm `bayId` — xem dưới) — mọi đơn ĐÃ được buyer
 *    xác nhận thanh toán, seller xử lý ở đây (xác nhận đã nhận thanh toán / chấp nhận huỷ / từ
 *    chối huỷ + lý do), xem pay.md § 1b.
 *  - role="buyer" (cần `buyerId`) — "Đơn của tôi": buyer xem lại MỌI đơn đã đặt (xuyên mọi seller,
 *    xem loadBuyerInvoices), action duy nhất là "Xác nhận đã nhận hàng" khi tới bước delivered.
 * Mỗi dòng: invoice_id/items/đối tác (buyer hoặc seller tuỳ role)/quy trình hiện tại + action. Bấm
 * vào 1 dòng mở dialog chi tiết = chính 1 <svc-pay role=${role}> (đúng yêu cầu "xem chi tiết = 1
 * svc-pay"). Cạnh đó, mỗi dòng còn có 1 nút nhỏ mở TAB MỚI tới trang tra cứu độc lập
 * (channel/invoice.astro, `buildInvoiceUrl()`) — cùng nội dung invoice nhưng đứng riêng, không
 * cần quay lại đúng bay/trang này. `bayId` (chỉ cần cho role="seller") gắn thêm vào link đó —
 * trang tra cứu không tự có bay context nào, nếu thiếu `bayId` seller mở tab đó sẽ KHÔNG tương
 * tác được đúng như đang đứng trên chính kênh của mình. Không phụ thuộc domain nào khác — chỉ
 * cần `sellerId`/`bayId` hoặc `buyerId`.
 *
 * Prop `position` (mặc định `'static'`) — forward thẳng cho <web-fab> nội bộ (thay <web-button>
 * trần trước đây). `'static'` giữ đúng hành vi cũ (nằm INLINE trong 1 toolbox/nav row, vd
 * Shop.astro/svc-bay-sections.js). `'fixed'`/`'absolute'` cho nút tự nổi ở toạ độ `x`/`y` (vd
 * CoreShop.astro, mount rời không có toolbox nào chứa nó).
 */
export class SvcPayWarden extends LitElement {
    static styles = [unsafeCSS(css)];

    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String }, txt: { type: Object },

        position: { type: String }, // 'fixed' | 'absolute' | 'static' (mặc định) — forward thẳng cho <web-fab>, xem docstring
        x: { type: String }, // chỉ có ý nghĩa khi position='fixed'/'absolute' — forward cho <web-fab>
        y: { type: String },

        role:     { type: String }, // 'seller' (mặc định) | 'buyer'
        sellerId: { type: String },
        buyerId:  { type: String },
        bayId:    { type: String }, // chỉ cần cho role="seller" — xem buildInvoiceUrl() ở tools/service.js
        wallet:   { type: Object },
        vietqr:   { type: Object },

        _open:         { state: true },
        _invoices:     { state: true },
        _rejectingId:  { state: true },
        _rejectReason: { state: true },
        _detailId:     { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.txt = null;

        this.position = 'static'; // mặc định GIỮ NGUYÊN hành vi cũ — nút nằm INLINE trong toolbox cha (Shop.astro/svc-bay-sections.js), không tự nổi
        this.x = '99%';
        this.y = '1rem';

        this.role = 'seller';
        this.sellerId = '';
        this.buyerId = '';
        this.bayId = '';
        this.wallet = {};
        this.vietqr = {};

        this._open = false;
        this._invoices = [];
        this._rejectingId = '';
        this._rejectReason = '';
        this._detailId = '';

        this._unsub = null;
        this._pendingPaymentIds = null; // baseline chờ xác nhận thanh toán — xem _dhWatchNewOrders()
        this._cancelResponseStatus = null; // baseline subStatus huỷ đơn — xem _dhWatchCancelResponses()
        this._lastInitKey = null; // id+role ĐÃ init lần gần nhất — xem updated()
    }

    connectedCallback() {
        super.connectedCallback();
        this._lastInitKey = `${this._comId}|${this.role}`;
        this._dcInit();
        // Tự theo dõi <html lang> (BtnLang.astro) thay vì chỉ nhận đúng 1 lần giá trị tĩnh
        // hardcode lúc mount (CoreShop.astro's lang="vi").
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsub?.();
        this._unwatchLang?.();
    }

    // Lit báo 'sellerId'/'buyerId'/'role' đã "đổi" ngay ở LƯỢT UPDATE ĐẦU TIÊN sau khi mount (diff
    // so với default rỗng ở constructor) dù connectedCallback() phía trên đã _dcInit() đúng giá trị
    // đó rồi — không chặn thì gọi _dcReinit() lần 2 dư thừa, tạo 2 subscription song song, mỗi cái
    // tự phát hiện "đơn mới" độc lập -> bắn trùng 2 toast cho CÙNG 1 đơn (bug đã gặp thật). So khớp
    // với `_lastInitKey` (đã chốt đúng giá trị connectedCallback() dùng) để chỉ thật sự reinit khi
    // id/role sau đó THẬT SỰ đổi (vd chuyển bay), không phải do lượt update đầu tiên.
    updated(changed) {
        if (!(changed.has('sellerId') || changed.has('buyerId') || changed.has('role'))) return;
        const key = `${this._comId}|${this.role}`;
        if (!this._comId || key === this._lastInitKey) return;
        this._lastInitKey = key;
        this._dcReinit();
    }

    _dcReinit() {
        this._unsub?.(); this._unsub = null;
        this._dcInit();
    }

    // id đang chi phối query hiện tại — buyerId cho role="buyer", sellerId cho mọi trường hợp còn
    // lại (mặc định "seller").
    get _comId() { return this.role === 'buyer' ? this.buyerId : this.sellerId; }

    // Luôn subscribe nền (không đợi mở dialog) — để badge số đơn cần xử lý trên nút tròn luôn
    // đúng, giống cách <svc-cart>'s fab hiện badge số món mà không cần mở giỏ trước.
    async _dcInit() {
        const id = this._comId;
        if (!id) return;
        if (this.role === 'buyer') {
            this._invoices = await loadBuyerInvoices(id).catch(() => []);
            this._cancelResponseStatus = this._comCancelResponses(this._invoices);
            this._unsub = listenBuyerInvoices(id, rows => {
                this._dhWatchCancelResponses(rows ?? []);
                this._invoices = rows ?? [];
            });
        } else {
            this._invoices = await loadSellerInvoices(id).catch(() => []);
            this._pendingPaymentIds = new Set(this._comPendingPaymentIds(this._invoices));
            this._unsub = listenSellerInvoices(id, rows => {
                this._dhWatchNewOrders(rows ?? []);
                this._invoices = rows ?? [];
            });
        }
    }

    // Đơn vừa được buyer xác nhận thanh toán (canConfirmPayment, xem _comPendingCount) mà baseline
    // trước đó CHƯA có — nghĩa là mới phát sinh giữa 2 lần cập nhật realtime, không phải đơn cũ đã
    // pending sẵn lúc mở trang. Dùng web-toast (singleton toàn trang, xem web-toast.js's
    // window.webToast) báo cho seller biết ngay cả khi đang không mở dialog warden.
    _comPendingPaymentIds(rows) {
        return rows.filter(row => isPendingPayment(row.meta ?? {})).map(row => row.id);
    }

    _dhWatchNewOrders(rows) {
        const nextIds = new Set(this._comPendingPaymentIds(rows));
        if (this._pendingPaymentIds) {
            for (const id of nextIds) {
                if (!this._pendingPaymentIds.has(id)) window.webToast?.({ message: this._txt.wardenNewOrderToast, type: 'info' });
            }
        }
        this._pendingPaymentIds = nextIds;
    }

    // Mọi lần SELLER phản hồi 1 yêu cầu huỷ của buyer — 'rejected' (rejectCancel, stamp
    // meta.sellerCancelled) | 'buyer_cancelled' (acceptCancel, stamp meta.sellerCancelled) — cộng
    // luôn 'seller_cancelled' (sellerCancelOrder, seller tự huỷ thẳng, stamp meta.cancel chứ không
    // phải sellerCancelled nhưng cùng ý nghĩa "seller vừa xử lý xong việc huỷ") — CHỈ báo bằng toast
    // (_dhWatchCancelResponses), KHÔNG cộng vào _comPendingCount (xem comment ở đó): cả 3 đều đã có
    // kết luận rõ ràng, buyer chỉ cần đọc thông báo, không phải bấm gì thêm ở đây (trừ 'rejected' có
    // thể gửi lại yêu cầu huỷ — vẫn làm được ngay trong panel 'preparing', không cần badge nhắc).
    // Map (không phải Set) vì cần biết ĐÚNG subStatus hiện tại để chọn đúng câu toast khi phát hiện
    // thay đổi so với baseline.
    _comCancelResponses(rows) {
        const map = new Map();
        for (const row of rows) {
            const subStatus = (row.meta ?? {}).subStatus;
            if (subStatus === 'rejected' || subStatus === 'seller_cancelled' || subStatus === 'buyer_cancelled') map.set(row.id, subStatus);
        }
        return map;
    }

    _cancelResponseToast(subStatus) {
        if (subStatus === 'rejected') return this._txt.wardenCancelRejectedToast;
        if (subStatus === 'buyer_cancelled') return this._txt.wardenCancelAcceptedToast;
        return this._txt.wardenSellerCancelledToast;
    }

    _dhWatchCancelResponses(rows) {
        const next = this._comCancelResponses(rows);
        if (this._cancelResponseStatus) {
            for (const [id, subStatus] of next) {
                if (this._cancelResponseStatus.get(id) !== subStatus) window.webToast?.({ message: this._cancelResponseToast(subStatus), type: 'info' });
            }
        }
        this._cancelResponseStatus = next;
    }

    _dhOpen()  { this._open = true; }
    _dhClose() { this._open = false; }

    // ── DATA FOOTER ──────────────────────────────────────────────────────────

    // Hình thức nhận hàng (giao hàng/nhận tại quầy) đã chốt từ bước "Đặt hàng" (web-toggle "Giao
    // hàng" ở svc-pay.js's _rbOrderSub()) — không còn chọn lại ở đây nữa.
    _dfConfirmPayment(id)  { confirmReceivedMoney(id); }
    _dfConfirmReceived(id) { confirmReceived(id); }
    _dfAcceptCancel(id)    { acceptCancel(id); }
    _dfConfirmRefund(id)   { confirmRefund(id); }

    _dhOpenReject(id) { this._rejectingId = id; this._rejectReason = ''; }
    _dhCancelReject()  { this._rejectingId = ''; this._rejectReason = ''; }

    _dfRejectCancel(id) {
        if (!(this._rejectReason ?? '').trim()) return;
        rejectCancel(id, this._rejectReason);
        this._dhCancelReject();
    }

    _dhOpenDetail(id) { this._detailId = id; }
    _dhCloseDetail()  { this._detailId = ''; }

    // Mở đúng invoice này ở 1 TAB MỚI (trang tra cứu độc lập, channel/invoice.astro) — khác
    // _dhOpenDetail() (mở dialog NGAY TRONG trang này) — dùng khi cần 1 link đứng riêng (chia sẻ,
    // giữ lại tra cứu sau, hoặc thao tác song song nhiều đơn ở nhiều tab).
    _dhOpenInvoiceTab(id) {
        const url = buildInvoiceUrl(id, { role: this.role, sellerId: this.sellerId, bayId: this.bayId });
        if (url) window.open(url, '_blank', 'noopener');
    }

    // ── COMPUTED ──────────────────────────────────────────────────────────────

    get _txt() { return CANCEL_TXT[this.lang] ?? CANCEL_TXT.vi; }
    get _stepTxt() { return STEP_LABELS[this.lang] ?? STEP_LABELS.vi; }

    // Số đơn đang cần NGƯỜI DÙNG HIỆN TẠI xử lý — seller: chờ xác nhận thanh toán/xử lý yêu cầu
    // huỷ; buyer: CHỈ tới bước "đã giao hàng" cần xác nhận nhận hàng. Hiện thành badge trên nút
    // tròn, không cần mở dialog mới biết có việc cần làm.
    // Cố ý KHÔNG tính mọi trạng thái phản hồi huỷ đơn ('rejected'/'buyer_cancelled'/
    // 'seller_cancelled') vào đây cho buyer — dù 'rejected' về lý thuyết buyer "có thể" gửi lại yêu
    // cầu huỷ, nhưng đó không phải hành động BẮT BUỘC như xác nhận nhận hàng, nên chỉ báo 1 lần bằng
    // toast lúc vừa xảy ra (xem _dhWatchCancelResponses()) thay vì treo mãi trên badge "cần xử lý".
    get _comPendingCount() {
        return this._invoices.filter(row => {
            const meta = row.meta ?? {};
            if (this.role === 'buyer') return isAwaitingReceived(meta);
            return isPendingPayment(meta) || meta.subStatus === 'pending' || needsRefund(meta);
        }).length;
    }

    _stepLabel(meta) {
        const major = meta?.major, sub = meta?.sub;
        if (!major || !sub) return '';
        return this._stepTxt[major]?.[sub] ?? sub;
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        const pending = this._comPendingCount;
        return html`
            <web-fab icon="ri:file-list-3-line" badge=${pending > 0 ? fmtBadgeCount(pending) : ''}
                position=${this.position} x=${this.x} y=${this.y} movable=${this.position === 'fixed' ? true : false}
                size="lg" ui=${this.position === 'fixed' ? 'modern' : this.ui} theme=${this.theme} title=${this._txt.wardenTitle}
                @clicked=${() => this._dhOpen()}>
            </web-fab>

            <web-dialog ?open=${this._open} title=${this._txt.wardenTitle} lang=${this.lang} maxWidth="960px"
                ui=${this.ui} theme=${this.theme}
                @close=${() => this._dhClose()}>
                ${this._rbList()}
            </web-dialog>

            ${this._detailId ? this._rbDetailDialog() : nothing}
        `;
    }

    _rbList() {
        if (this._invoices.length === 0) return html`
            <div class="warden-empty">
                <iconify-icon icon="ri:file-list-3-line"></iconify-icon>
                <span>${this._txt.wardenEmpty}</span>
            </div>`;
        return html`
            <div class="warden-table-scroll">
                <div class="warden-table">
                    <div class="warden-thead">
                        <span><iconify-icon icon="ri:receipt-line"></iconify-icon> ${this._txt.wardenColInvoice}</span>
                        <span>${this._txt.wardenColItems}</span>
                        <span>${this.role === 'buyer' ? this._txt.wardenColSeller : this._txt.wardenColBuyer}</span>
                        <span>${this._txt.wardenColStep}</span>
                        <span>${this._txt.wardenColActions}</span>
                        <span></span>
                    </div>
                    ${this._invoices.map(row => this._rfRow(row))}
                </div>
            </div>`;
    }

    _rfRow(row) {
        const meta   = row.meta ?? {};
        const items  = parseInvoiceItems(row.items);
        const isBuyerMode = this.role === 'buyer';
        const party  = isBuyerMode ? parseInvoiceSeller(row.seller) : parseInvoiceBuyer(row.buyer);
        const total  = Number((row.summary || '0~0~0').split('~')[2]) || 0;
        const canConfirmPayment  = !isBuyerMode && isPendingPayment(meta);
        const canConfirmReceived = isBuyerMode && isAwaitingReceived(meta);
        const cancelPending      = meta.subStatus === 'pending';
        const rowNeedsRefund     = !isBuyerMode && needsRefund(meta);

        return html`
            <div class="warden-row" @click=${() => this._dhOpenDetail(row.id)}>
                <div class="warden-col warden-col-invoice">
                    <span class="warden-id">${row.id}</span>
                    <span class="warden-total">${fmtPrice(total, this.lang)}</span>
                </div>

                <div class="warden-col warden-col-items">
                    ${items.map(i => html`<div class="warden-item-line">${i.qty}× ${i.name}</div>`)}
                </div>

                <div class="warden-col warden-col-buyer">
                    <span><iconify-icon icon="ri:user-line"></iconify-icon> ${party.name || '—'}</span>
                    ${party.phone ? html`<span class="warden-buyer-phone">${party.phone}</span>` : nothing}
                </div>

                <div class="warden-col warden-col-step">
                    <span class="warden-step">${this._stepLabel(meta)}</span>
                    ${cancelPending ? html`
                        <div class="warden-cancel-note">
                            <iconify-icon icon="ri:error-warning-line"></iconify-icon> ${this._txt.wardenCancelPending}
                        </div>` : nothing}
                </div>

                <div class="warden-col warden-col-actions" @click=${e => e.stopPropagation()}>
                    ${canConfirmPayment ? html`
                        <web-button type="fill" color="primary" height="24px"
                            @clicked=${() => this._dfConfirmPayment(row.id)}>${this._txt.wardenConfirmPayment}</web-button>
                    ` : nothing}
                    ${canConfirmReceived ? html`
                        <web-button type="fill" color="primary" height="24px"
                            @clicked=${() => this._dfConfirmReceived(row.id)}>${this._txt.wardenConfirmReceived}</web-button>
                    ` : nothing}
                    ${!isBuyerMode && cancelPending ? html`
                        <web-button type="fill" color="success" height="24px"
                            @clicked=${() => this._dfAcceptCancel(row.id)}>${this._txt.wardenAcceptCancel}</web-button>
                        <web-button type="outline" color="error" height="24px"
                            @clicked=${() => this._dhOpenReject(row.id)}>${this._txt.wardenRejectCancel}</web-button>
                    ` : nothing}
                    ${rowNeedsRefund ? html`
                        <web-button type="fill" color="primary" height="24px"
                            @clicked=${() => this._dfConfirmRefund(row.id)}>${this._txt.wardenConfirmRefund}</web-button>
                    ` : nothing}
                    <web-button type="outline" height="24px" @clicked=${() => this._dhOpenDetail(row.id)}>${this._txt.wardenViewDetail}</web-button>

                    ${this._rejectingId === row.id ? html`
                        <div class="warden-reject-form" @click=${e => e.stopPropagation()}>
                            <web-textarea placeholder=${this._txt.wardenRejectReasonPh} .value=${this._rejectReason} rows="2"
                                ui=${this.ui} theme=${this.theme}
                                @input=${e => { this._rejectReason = e.detail?.value ?? ''; }}></web-textarea>
                            <div class="warden-reject-actions">
                                <web-button type="fill" color="error" height="24px" ?disabled=${!(this._rejectReason ?? '').trim()}
                                    @clicked=${() => this._dfRejectCancel(row.id)}>${this._txt.wardenRejectCancel}</web-button>
                                <web-button type="outline" height="24px" @clicked=${() => this._dhCancelReject()}>×</web-button>
                            </div>
                        </div>` : nothing}
                </div>

                <div class="warden-col warden-col-link" @click=${e => e.stopPropagation()}>
                    <web-button type="outline" square height="24px" width="24px" title=${this._txt.wardenOpenTab}
                        @clicked=${() => this._dhOpenInvoiceTab(row.id)}>
                        <iconify-icon icon="ri:external-link-line" width="14px"></iconify-icon>
                    </web-button>
                </div>
            </div>`;
    }

    _rbDetailDialog() {
        return html`
            <web-dialog type="mobile" ui=${this.ui} theme=${this.theme} maxWidth="860px"
                .open=${!!this._detailId} title=${this._txt.wardenViewDetail} @close=${() => this._dhCloseDetail()}>
                <svc-pay role=${this.role} invoiceId=${this._detailId}
                    .wallet=${this.wallet} .vietqr=${this.vietqr}
                    ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                    lang=${this.lang}>
                </svc-pay>
            </web-dialog>`;
    }
}

if (!customElements.get('svc-pay-warden')) customElements.define('svc-pay-warden', SvcPayWarden);
