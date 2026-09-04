import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-toggle.js';
import '@/webs/apex/web-button.js';
import '@/webs/pay/svc-pay-customer.js';
import '@/webs/pay/svc-pay-booking.js';
import '@/webs/pay/svc-pay-valider.js';
import '@/webs/pay/svc-pay-reason.js';
import css from './styles/svc-pay-order.css?inline';
import { emit } from '@/services/helper.js';
import { orderItemsBlock } from './tools/render.js';

/**
 * <svc-pay-order> — panel LIVE của major "Đặt hàng" (subId 'placing'|'paying'), tách khỏi
 * <svc-pay> để component cha chỉ còn giữ flow/state toàn cục — xem hook/PAY.rst §3.1/§3.12.
 * KHÔNG tự gọi tools/service.js — thuần presentational, mọi hành động chỉ bắn event `order:*` lên
 * cho <svc-pay> xử lý (gọi service.js tương ứng). Form "ai xác nhận đã nhận thanh toán" (subId
 * 'paying', role seller) là state NỘI BỘ của component này — parent không cần biết tới lúc bấm
 * action mới nhận payload đầy đủ.
 *
 * Events: order:payment-select {method}, order:toggle-delivery {active}, order:place {},
 * order:back-to-cart {}, order:back-to-placing {}, order:paid {paymentId},
 * order:confirm-payment {handler}.
 */
export class SvcPayOrder extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        role: { type: String },
        subId: { type: String }, // 'placing' | 'paying'
        txt: { type: Object }, cancelTxt: { type: Object },

        wallet: { type: Object }, vietqr: { type: Object },
        items: { type: Array }, amount: { type: Number },
        isDelivery: { type: Boolean }, hasCustomerData: { type: Boolean },
        onlyDelivery: { type: Boolean }, // true → seller không hỗ trợ nhận tại quầy — ẩn hẳn web-toggle "Giao hàng" (isDelivery đã được <svc-pay> ép true sẵn, xem svc-pay.js's _comIsDelivery)
        cashDisabled: { type: Boolean }, // true → ẩn hẳn tuỳ chọn 'Tiền mặt' ở <svc-pay-booking> (bước 'placing')
        payMethod: { type: String },

        paymentRef: { type: String },
        payExpired: { type: Boolean }, payRemainingLabel: { type: String },

        hasInvoice: { type: Boolean }, // !!_invoice ở <svc-pay> — KHÁC invoiceId (set sớm hơn, xem hook/PAY.rst §3.12)
        invoiceId: { type: String }, invoiceUrl: { type: String }, invoiceQrSrc: { type: String },
        sellerPrefill: { type: Object }, // {name, phone} — nguồn nút "gán nhanh" ở form 'paying', xem svc-pay.js's _comSellerPrefill

        _form: { state: true }, // seller's "confirm received payment" reason form (subId 'paying')
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.role = 'buyer';
        this.subId = 'placing';
        this.txt = {};
        this.cancelTxt = {};

        this.wallet = {};
        this.vietqr = {};
        this.items = [];
        this.amount = 0;
        this.isDelivery = false;
        this.hasCustomerData = false;
        this.onlyDelivery = false;
        this.cashDisabled = false;
        this.payMethod = 'cash';

        this.paymentRef = '';
        this.payExpired = false;
        this.payRemainingLabel = '';

        this.hasInvoice = false;
        this.invoiceId = '';
        this.invoiceUrl = '';
        this.invoiceQrSrc = '';
        this.sellerPrefill = null;

        this._form = { name: '', phone: '', note: '' };
    }

    _emit(name, detail = {}) { emit(this, name, detail); }
    _dhFormInput(detail) { this._form = { ...this._form, [detail.key]: detail.value }; }

    render() {
        return this.subId === 'placing' ? this._rbPlacing() : this._rbPaying();
    }

    _rbPlacing() {
        const needsCustomer = this.isDelivery && !this.hasCustomerData;
        return html`
            <div class="order-panel">
                ${this.onlyDelivery ? '' : html`
                    <web-toggle .active=${this.isDelivery} label=${this.txt.deliveryToggleLabel}
                        ui=${this.ui} theme=${this.theme}
                        @change=${e => this._emit('order:toggle-delivery', { active: e.detail.active })}>
                    </web-toggle>`}
                <svc-pay-customer ui=${this.ui} theme=${this.theme} lang=${this.lang}></svc-pay-customer>
                ${orderItemsBlock(this.items, this.amount, this.txt, this.lang)}
                <svc-pay-booking
                    .wallet=${this.wallet}
                    method=${this.payMethod}
                    ?cashDisabled=${this.cashDisabled}
                    ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                    lang=${this.lang}
                    @payment:select=${e => this._emit('order:payment-select', { method: e.detail.method })}>
                </svc-pay-booking>
                ${needsCustomer ? html`<p class="hint">${this.txt.customerRequiredHint}</p>` : ''}
                <div class="actions">
                  <web-button type="fill" color="primary" height="45px" width="100%" fontSize="1rem"
                      ?disabled=${!this.items?.length || needsCustomer} ui=${this.ui} theme=${this.theme}
                      @clicked=${() => this._emit('order:place')}>${this.txt.continueToPayment}</web-button>
                  <web-button type="ghost" height="32px" width="100%" ui=${this.ui} theme=${this.theme}
                      @clicked=${() => this._emit('order:back-to-cart')}>${this.txt.backToCart}</web-button>
                </div>
            </div>`;
    }

    _rbPaying() {
        if (!this.hasInvoice) return html`
            <div class="order-panel">
                <div class="countdown ${this.payExpired ? 'expired' : ''}">
                    ${this.payExpired ? this.txt.countdownExpired : `${this.txt.countdownLabel}: ${this.payRemainingLabel}`}
                </div>
                <svc-pay-valider
                    .wallet=${this.wallet}
                    .vietqr=${this.vietqr}
                    paymentId=${this.paymentRef}
                    .amount=${this.amount}
                    method=${this.payMethod}
                    ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                    lang=${this.lang}
                    @valider:paid=${e => this._emit('order:paid', { paymentId: e.detail.paymentId })}
                    @valider:back=${() => this._emit('order:back-to-placing')}>
                </svc-pay-valider>
            </div>`;

        // invoice đã tồn tại (buyer đã xác nhận) — seller xác nhận đã nhận tiền + QR/mã đơn tra
        // cứu lại sau, xem hook/PAY.rst §2.
        const h = this._form;
        return html`
            <div class="order-panel">
                ${this.role === 'seller' ? html`
                    <svc-pay-reason ui=${this.ui} theme=${this.theme}
                        stepKey="paying"
                        name=${h.name} phone=${h.phone} note=${h.note}
                        namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.handlerNotePh}
                        quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                        actionLabel=${this.cancelTxt.wardenConfirmPayment}
                        @reason:input=${e => this._dhFormInput(e.detail)}
                        @reason:action=${() => this._emit('order:confirm-payment', { handler: this._form })}>
                    </svc-pay-reason>` : ''}
                <div class="invoice-lookup">
                    <img class="invoice-qr" src=${this.invoiceQrSrc} width="180" height="180" alt="QR" />
                    <a class="invoice-id-link" href=${this.invoiceUrl} target="_blank">
                        <iconify-icon icon="ri:receipt-line"></iconify-icon> ${this.invoiceId}
                    </a>
                    <p class="invoice-hint">${this.txt.invoiceLookupHint}</p>
                </div>
            </div>`;
    }
}

if (!customElements.get('svc-pay-order')) customElements.define('svc-pay-order', SvcPayOrder);
