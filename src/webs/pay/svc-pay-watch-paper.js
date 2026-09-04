// src/webs/pay/svc-pay-watch-paper.js
//
// Hiện lại invoice dạng "giấy hoá đơn" (thermal receipt) — mount phía TRÊN <svc-pay> trong
// svc-pay-watch.js (channel/invoice.astro). Tự subscribe invoice qua listenInvoice() bằng prop
// `invoiceId` (không đọc lại từ <svc-pay>, độc lập domain — xem hook/PAY.rst §1) — component con
// THUẦN đọc, không có action/nút bấm nào, chỉ để buyer/seller có 1 bản xem lại quen mắt kiểu hoá
// đơn giấy thật, KHÁC panel thao tác chi tiết bên dưới (<svc-pay>).
//
// Field không có trong invoice của domain `pay` (KHÔNG bịa số liệu): "Thu ngân"/"POS" (không có
// khái niệm nhân viên/máy POS), "Tiền mặt nhận/Tiền thối" (không track tiền mặt vật lý — nhiều
// đơn thanh toán qua momo/bank/QR, và ngay cả 'cash' cũng không lưu số tiền khách đưa) — bỏ hẳn
// các dòng đó thay vì hiện giá trị giả. Thêm 1 dòng "Hình thức nhận hàng" (meta.fulfillment) thay
// thế — dữ liệu này LUÔN có thật trên mọi invoice.
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import css from './styles/svc-pay-watch-paper.css?inline';
import { txtLingo, fmtPrice } from '@/services/helper.js';
import { listenInvoice, parseInvoiceItems, parseInvoiceSeller, parseInvoiceBuyer } from './tools/service.js';
import { fmtDateTime } from './tools/render.js';

const TXT_STD = {
    vi: {
        billTitle: 'HOÁ ĐƠN THANH TOÁN',
        orderCode: 'Mã đơn', date: 'Ngày',
        customer: 'Khách hàng',
        itemsHeader: 'TÊN MẶT HÀNG',
        total: 'Tổng cộng',
        fulfillment: 'Hình thức', fulfillmentDelivery: 'Giao hàng', fulfillmentPickup: 'Tự đến lấy',
        thanks: 'Xin cảm ơn quý khách!',
    },
    en: {
        billTitle: 'PAYMENT RECEIPT',
        orderCode: 'Order code', date: 'Date',
        customer: 'Customer',
        itemsHeader: 'ITEMS',
        total: 'Total',
        fulfillment: 'Fulfillment', fulfillmentDelivery: 'Delivery', fulfillmentPickup: 'Self pickup',
        thanks: 'Thank you!',
    },
};

export class SvcPayWatchPaper extends LitElement {
    static styles = [unsafeCSS(css)];

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        invoiceId: { type: String },
        _invoice: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi'; this.txt = null;
        this.invoiceId = '';
        this._invoice = null;
        this._unsub = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._dcSubscribe();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsub?.();
    }

    updated(changed) {
        if (changed.has('invoiceId')) this._dcSubscribe();
    }

    /** Flow _dcSubscribe: invoiceId (prop, có thể đổi qua updated()) -> resub listenInvoice(). */
    _dcSubscribe() {
        this._unsub?.(); this._unsub = null;
        this._invoice = null;
        if (!this.invoiceId) return;
        this._unsub = listenInvoice(this.invoiceId, invoice => { this._invoice = invoice; });
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        // Chưa có invoiceId, đang chờ snapshot đầu, hoặc mã không tồn tại — ẩn hẳn, không hiện gì
        // trùng lặp với thông báo lỗi/loading (đã có sẵn bên trong <svc-pay>).
        if (!this._invoice) return nothing;

        const inv    = this._invoice;
        const seller = parseInvoiceSeller(inv.seller);
        const buyer  = parseInvoiceBuyer(inv.buyer);
        const items  = parseInvoiceItems(inv.items);
        const total  = Number((inv.summary || '').split('~')[2]) || 0;

        return html`
            <div class="paper-sheet">
                <div class="paper-header">
                    <div class="paper-seller-name">${seller.name || '—'}${seller.phone ? ` - ${seller.phone}` : ''}</div>
                    ${seller.address ? html`<div class="paper-seller-addr">${seller.address}</div>` : nothing}
                    <div class="paper-title">${this._txt.billTitle}</div>
                </div>

                <div class="paper-meta">
                    <div class="paper-meta-row"><span>${this._txt.orderCode}:</span><span>${inv.id}</span></div>
                    <div class="paper-meta-row"><span>${this._txt.date}:</span><span>${fmtDateTime(Date.parse(inv.issued_at))}</span></div>
                    ${buyer.name || buyer.phone ? html`
                        <div class="paper-customer">
                            <div class="paper-meta-row"><span>${this._txt.customer}:</span><span>${buyer.name || '—'}</span></div>
                            ${buyer.phone ? html`<div class="paper-customer-line">${buyer.phone}</div>` : nothing}
                            ${buyer.address ? html`<div class="paper-customer-line">${buyer.address}</div>` : nothing}
                        </div>
                    ` : nothing}
                </div>

                <div class="paper-divider"></div>
                <div class="paper-items-header">${this._txt.itemsHeader}</div>
                <div class="paper-items">
                    ${items.map(it => html`
                        <div class="paper-item">
                            <div class="paper-item-name">${it.name}</div>
                            <div class="paper-item-line">
                                <span>${it.qty}${it.unit ? ` ${it.unit}` : ''} x ${fmtPrice(it.price, this.lang)}</span>
                                <span>${fmtPrice(it.price * it.qty, this.lang)}</span>
                            </div>
                        </div>
                    `)}
                </div>
                <div class="paper-divider"></div>

                <div class="paper-total-row">
                    <span>${this._txt.total}</span>
                    <span>${fmtPrice(total, this.lang)}</span>
                </div>
                ${inv.meta?.fulfillment ? html`
                    <div class="paper-fulfillment">
                        ${this._txt.fulfillment}: ${inv.meta.fulfillment === 'pickup' ? this._txt.fulfillmentPickup : this._txt.fulfillmentDelivery}
                    </div>
                ` : nothing}

                <div class="paper-thanks">${this._txt.thanks}</div>
                <div class="paper-footer">${fmtDateTime(Date.parse(inv.issued_at))}</div>
            </div>
        `;
    }
}

if (!customElements.get('svc-pay-watch-paper')) customElements.define('svc-pay-watch-paper', SvcPayWatchPaper);

export default SvcPayWatchPaper;
