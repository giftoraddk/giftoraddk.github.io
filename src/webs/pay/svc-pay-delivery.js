import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-alert.js';
import '@/webs/apex/web-button.js';
import '@/webs/pay/svc-pay-reason.js';
import css from './styles/svc-pay-delivery.css?inline';
import { emit } from '@/services/helper.js';
import { SUB_STEPS } from './tools/constant.js';
import { parseHandler } from './tools/service.js';
import { handledByLine } from './tools/render.js';

const _BLANK = { name: '', phone: '', note: '', media: '' };

/**
 * <svc-pay-delivery> — panel LIVE của major "Vận chuyển" (subId
 * 'packing'|'shipping'|'delivered'|'received'|'returned') — xem docs/PAY.rst §3.1/§3.12. Thuần
 * presentational — mọi form nhập (packing/shipping/delivered/received/return) là state NỘI BỘ, kể
 * cả toggle "Trả hàng" (`_showReturnForm`, trước đây sống ở <svc-pay>) — chỉ bắn event
 * `delivery:*` kèm payload đầy đủ khi bấm action. Ảnh minh chứng (return/delivered) đi qua
 * `<svc-pay-reason>`'s `showMedia` (dùng chung, xem svc-pay-reason.js) — không tự render
 * `<web-photor-upload>` riêng nữa. `isPast` (đang xem lại 1 sub đã qua trong CÙNG major) tự tính
 * từ `meta`/`subId` — không cần prop riêng. Bước hoàn tiền (subId 'returned') vẫn do <svc-pay> tự
 * render sau component này, xem svc-pay.js's _rbRefundBlock().
 *
 * Events: delivery:confirm-packed {handler}, delivery:confirm-shipped {handler},
 * delivery:confirm-delivery {handler}, delivery:confirm-received {handler},
 * delivery:request-return {reason, handler}.
 */
export class SvcPayDelivery extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        role: { type: String },
        subId: { type: String }, // 'packing' | 'shipping' | 'delivered' | 'received' | 'returned'
        txt: { type: Object }, cancelTxt: { type: Object },
        meta: { type: Object },
        buyerPrefill: { type: Object }, // {name, phone} — seed cho form 'received'/'return'
        sellerPrefill: { type: Object }, // {name, phone} — nguồn nút "gán nhanh" ở form packing/shipping/delivered (seller), xem svc-pay.js's _comSellerPrefill
        deliveredRemainingLabel: { type: String }, // countdown "tự động xác nhận sau ..." (parent tick giờ)

        _packingForm:  { state: true },
        _shippingForm: { state: true }, // 'shipping': bound field backend 'shipping' (ai chuyển giao cho đơn vị giao hàng)
        _shipperForm:  { state: true }, // 'delivered': seller/shipper tự xác nhận đã giao (field 'delivered', kèm media)
        _receivedForm: { state: true },
        _showReturnForm: { state: true },
        _returnForm:     { state: true }, // {name, phone, note, media}
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.role = 'buyer';
        this.subId = 'packing';
        this.txt = {};
        this.cancelTxt = {};
        this.meta = {};
        this.buyerPrefill = null;
        this.sellerPrefill = null;
        this.deliveredRemainingLabel = '';

        this._packingForm = { ..._BLANK };
        this._shippingForm = { ..._BLANK };
        this._shipperForm = { ..._BLANK };
        this._receivedForm = { ..._BLANK };
        this._showReturnForm = false;
        this._returnForm = { ..._BLANK };

        this._prefillApplied = false;
        this._shipperPrefillApplied = false;
    }

    // [1] CHECK: buyerPrefill tới lần đầu -> seed tên/sđt mặc định cho form 'received'/'return'
    // (không ghi đè nếu buyer đã tự gõ gì đó — chỉ áp dụng đúng 1 lần). Tương tự, meta.shipping
    // (đã chốt từ màn 'shipping' trước đó) seed sẵn tên/sđt cho form 'delivered' — thường CÙNG 1
    // người/đơn vị vừa chuyển giao vừa xác nhận đã giao, đỡ phải gõ lại.
    willUpdate(changed) {
        if (changed.has('buyerPrefill') && this.buyerPrefill && !this._prefillApplied) {
            this._prefillApplied = true;
            this._receivedForm = { ...this._receivedForm, name: this.buyerPrefill.name, phone: this.buyerPrefill.phone };
            this._returnForm = { ...this._returnForm, name: this.buyerPrefill.name, phone: this.buyerPrefill.phone };
        }
        if (changed.has('meta') && this.meta?.shipping && !this._shipperPrefillApplied) {
            this._shipperPrefillApplied = true;
            const shipping = parseHandler(this.meta.shipping);
            this._shipperForm = { ...this._shipperForm, name: shipping.name, phone: shipping.phone };
        }
    }

    // "Xử lý bởi" (meta.shipping — ai chuyển giao cho đơn vị giao hàng) LUÔN hiện nếu có; "Đã giao
    // hàng bởi" (meta.delivered — seller/shipper tự xác nhận, xem confirmDeliveryDone()) chỉ thêm
    // dòng MỚI khi seller đã bấm xác nhận — handledByLine() tự no-op nếu field chưa stamp.
    _rfDeliveredInfo() {
        return html`
            ${handledByLine(this.meta.shipping, this.txt.roleSeller, this.txt.handledByLabel)}
            ${handledByLine(this.meta.delivered, this.txt.roleSeller, this.txt.deliveredByLabel)}
        `;
    }

    _emit(name, detail = {}) { emit(this, name, detail); }
    _dhFormInput(stateKey, detail) { this[stateKey] = { ...this[stateKey], [detail.key]: detail.value }; }

    // `subId` ĐÃ QUA trong CÙNG major 'delivery' hiện tại (vd đang ở 'received' nhưng xem lại
    // 'shipping') — panel action LIVE không còn hợp lệ nữa, chỉ hiện lại thông tin đã ghi.
    get _comIsPast() {
        const list = SUB_STEPS.delivery ?? [];
        const idx = list.indexOf(this.subId);
        const curIdx = list.indexOf(this.meta.sub);
        return idx !== -1 && curIdx !== -1 && idx < curIdx;
    }

    render() {
        // Đơn "Nhận tại quầy" bỏ hẳn packing/shipping/delivered (completeProcessing() nhảy thẳng
        // processing -> delivery/received) — 3 sub này không bao giờ là sub thật của đơn dạng này.
        if (this.meta.fulfillment === 'pickup' && ['packing', 'shipping', 'delivered'].includes(this.subId)) {
            return html`<div class="order-panel"><p class="waiting-note">${this.cancelTxt.notApplicablePickup}</p></div>`;
        }
        if (this.subId === 'packing') return this._rbPacking();
        if (this.subId === 'shipping') return this._rbShipping();
        if (this.subId === 'delivered') return this._rbDelivered();
        if (this.subId === 'received') return this._rbReceived();
        return this._rbReturned();
    }

    _rbPacking() {
        const isPast = this._comIsPast;
        const h = this._packingForm;
        return html`
            <div class="order-panel">
                ${isPast
                    ? handledByLine(this.meta.packing, this.txt.roleSeller, this.txt.handledByLabel)
                    : (this.role === 'seller' ? html`
                        <svc-pay-reason ui=${this.ui} theme=${this.theme}
                            stepKey="packing"
                            name=${h.name} phone=${h.phone} note=${h.note}
                            namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.handlerNotePh}
                            quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                            actionLabel=${this.txt.confirmPacked}
                            @reason:input=${e => this._dhFormInput('_packingForm', e.detail)}
                            @reason:action=${() => this._emit('delivery:confirm-packed', { handler: this._packingForm })}>
                        </svc-pay-reason>
                    ` : html`<span class="waiting-note">${this.txt.sellerPackingNote}</span>`)}
            </div>`;
    }

    // meta.shipping = ai đã chuyển giao cho đơn vị giao hàng (confirmShipped(), stamp lúc rời màn
    // 'shipping') — KHÁC meta.delivered (seller/shipper tự xác nhận ĐÃ THẬT SỰ giao xong, chốt
    // ngay trên màn 'delivered', xem _rbDelivered()). isPast đọc đúng field 'shipping', không phải
    // 'packing' (người đóng gói, khác người giao — bug đã gặp thật, xem docs/PAY.rst §5).
    _rbShipping() {
        const isPast = this._comIsPast;
        const h = this._shippingForm;
        return html`
            <div class="order-panel">
                ${isPast
                    ? handledByLine(this.meta.shipping, this.txt.roleSeller, this.txt.handledByLabel)
                    : (this.role === 'seller' ? html`
                        <svc-pay-reason ui=${this.ui} theme=${this.theme}
                            stepKey="shipping"
                            name=${h.name} phone=${h.phone} note=${h.note}
                            namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.handlerNotePh}
                            quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                            actionLabel=${this.txt.confirmShipped}
                            @reason:input=${e => this._dhFormInput('_shippingForm', e.detail)}
                            @reason:action=${() => this._emit('delivery:confirm-shipped', { handler: this._shippingForm })}>
                        </svc-pay-reason>
                    ` : html`<span class="waiting-note">${this.txt.courierShippingNote}</span>`)}
            </div>`;
    }

    // _rfDeliveredInfo() LUÔN hiện đầu panel (cả 2 role, cả khi form action vẫn đang chờ nhập) —
    // dòng "Xử lý bởi" (shipping) không biến mất chỉ vì đang hiện form. Buyer: luôn thấy form "Đã
    // nhận hàng" ngay khi vào sub này — có thể tự bấm bất kỳ lúc nào, không phụ thuộc seller/
    // shipper đã "Xác nhận đã giao" hay chưa. Seller: PHẢI tự bấm hành động đó trước (field
    // 'delivered', kèm media minh chứng — KHÁC meta.shipping) — countdown tự động hoàn tất CHỈ bắt
    // đầu SAU bước này, xem docs/PAY.rst §3.6.
    _rbDelivered() {
        const isPast = this._comIsPast;
        const h = this._receivedForm;
        const sh = this._shipperForm;
        const deliveredAt = parseHandler(this.meta.delivered).at;
        return html`
            <div class="order-panel">
                ${this._rfDeliveredInfo()}
                ${isPast
                    ? ''
                    : this.role === 'buyer' ? html`
                        <p class="hint">${this.txt.shipperCallHint}</p>
                        <svc-pay-reason ui=${this.ui} theme=${this.theme}
                            stepKey="received"
                            name=${h.name} phone=${h.phone} note=${h.note}
                            namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.handlerNotePh}
                            quickName=${this.buyerPrefill?.name ?? ''} quickPhone=${this.buyerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                            actionLabel=${this.txt.confirmReceived}
                            @reason:input=${e => this._dhFormInput('_receivedForm', e.detail)}
                            @reason:action=${() => this._emit('delivery:confirm-received', { handler: this._receivedForm })}>
                        </svc-pay-reason>`
                    : deliveredAt
                        ? ''
                        : html`
                            <svc-pay-reason ui=${this.ui} theme=${this.theme}
                                stepKey="delivered"
                                name=${sh.name} phone=${sh.phone} note=${sh.note}
                                namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.handlerNotePh}
                                quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                                actionLabel=${this.txt.confirmDelivery}
                                showMedia media=${sh.media} mediaPh=${this.txt.deliveryMediaPh}
                                @reason:input=${e => this._dhFormInput('_shipperForm', e.detail)}
                                @reason:action=${() => this._emit('delivery:confirm-delivery', { handler: this._shipperForm })}>
                            </svc-pay-reason>`}
                ${(!isPast && deliveredAt) ? html`
                    <div class="countdown">${this.txt.autoConfirmLabel}: ${this.deliveredRemainingLabel}</div>
                ` : ''}
                ${isPast ? '' : this._rbReturnBlock()}
            </div>`;
    }

    _rbReceived() {
        return html`
            <div class="order-panel">
                <p class="done-note">${this.txt.transactionDone}</p>
                ${handledByLine(this.meta.received, this.txt.roleBuyer, this.txt.handledByLabel)}
                ${this._comIsPast ? '' : this._rbReturnBlock()}
            </div>`;
    }

    // terminal — sub chỉ chuyển sang đây cùng lúc meta.return được ghi (atomic, requestReturn()),
    // nên `ret` luôn có mặt.
    _rbReturned() {
        const ret = parseHandler(this.meta.return);
        return html`
            <div class="order-panel">
                <web-alert type="warning" ui=${this.ui} theme=${this.theme} title=${this.txt.returnedNote}>
                    ${this.txt.reasonLabel}: ${ret.note}
                </web-alert>
                ${handledByLine(this.meta.return, this.txt.roleBuyer, this.txt.handledByLabel)}
                ${this._rfReturnedMedia(ret.media)}
            </div>`;
    }

    // Ảnh minh chứng hàng trả (slot thứ 5 của meta.return) — nhiều ảnh nối `|`.
    _rfReturnedMedia(media) {
        if (!media) return html``;
        return html`
            <div class="returned-media">
                ${media.split('|').filter(Boolean).map(src => html`<img src=${src} alt="" loading="lazy" />`)}
            </div>`;
    }

    // Nút "Trả hàng" chỉ mở form nhập lý do tại chỗ (KHÔNG tự nhảy sub-stepper — sub thật sự đổi
    // khi delivery:request-return được cha xử lý xong và invoice.meta.sub cập nhật qua listenInvoice).
    _rbReturnBlock() {
        if (this.role !== 'buyer') return html``;
        if (!this._showReturnForm) return html`
            <div class="return-block">
                <web-button type="soft" color="warning" height="36px"
                    @clicked=${() => { this._showReturnForm = true; }}>${this.txt.returnOrder}</web-button>
            </div>`;
        const h = this._returnForm;
        return html`
            <div class="return-form">
                <svc-pay-reason ui=${this.ui} theme=${this.theme}
                    stepKey="return"
                    title=${this.txt.returnOrder} titleColor="error"
                    name=${h.name} phone=${h.phone} note=${h.note}
                    namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.returnReasonPh}
                    quickName=${this.buyerPrefill?.name ?? ''} quickPhone=${this.buyerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                    showMedia media=${h.media} mediaPh=${this.txt.returnMediaPh}
                    @reason:input=${e => this._dhFormInput('_returnForm', e.detail)}>
                </svc-pay-reason>
                <web-button type="soft" color="warning" height="40px" ?disabled=${!(h.note ?? '').trim()}
                    @clicked=${() => this._emit('delivery:request-return', { reason: h.note, handler: h })}>
                    ${this.txt.confirmReturn}
                </web-button>
            </div>`;
    }
}

if (!customElements.get('svc-pay-delivery')) customElements.define('svc-pay-delivery', SvcPayDelivery);
