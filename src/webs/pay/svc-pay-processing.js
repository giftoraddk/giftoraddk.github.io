import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-alert.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-button.js';
import '@/webs/pay/svc-pay-reason.js';
import css from './styles/svc-pay-processing.css?inline';
import { emit } from '@/services/helper.js';
import { parseHandler } from './tools/service.js';
import { handledByLine } from './tools/render.js';

const _BLANK = { name: '', phone: '', note: '' };

/**
 * <svc-pay-processing> — panel LIVE của major "Xử lý đơn hàng" (subId
 * 'preparing'|'cancelled'|'done') — xem docs/PAY.rst §3.1/§3.12. Thuần presentational, mọi form
 * nhập (complete-processing/seller self-cancel/accept-reject) là state NỘI BỘ; chỉ bắn event
 * `processing:*` kèm payload đầy đủ khi bấm action. Bước hoàn tiền (refund, dùng chung với major
 * "delivery"'s "returned") vẫn do <svc-pay> tự render — KHÔNG thuộc component này, xem svc-pay.js's
 * _rbRefundBlock().
 *
 * Events: processing:complete {handler}, processing:request-cancel {reason},
 * processing:seller-cancel {handler}, processing:accept-cancel {handler},
 * processing:reject-cancel {handler}, processing:advance {}.
 */
export class SvcPayProcessing extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        role: { type: String },
        subId: { type: String }, // 'preparing' | 'cancelled' | 'done'
        txt: { type: Object }, cancelTxt: { type: Object },
        meta: { type: Object },
        sellerPrefill: { type: Object }, // {name, phone} — nguồn nút "gán nhanh" ở mọi form seller trong component này, xem svc-pay.js's _comSellerPrefill
        stepTitle: { type: String }, // tiêu đề form trái panel 'preparing' (this._stepTxt.processing.preparing)

        _prepareForm:        { state: true }, // 'preparing': form hoàn thành xử lý
        _cancelForm:          { state: true }, // 'preparing': form seller tự huỷ (field 'cancel')
        _buyerCancelReason:   { state: true }, // 'preparing': lý do huỷ của buyer (không có name/phone)
        _sellerCancelledForm: { state: true }, // 'preparing' pending: form chung accept/reject
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.role = 'buyer';
        this.subId = 'preparing';
        this.txt = {};
        this.cancelTxt = {};
        this.meta = {};
        this.sellerPrefill = null;
        this.stepTitle = '';

        this._prepareForm = { ..._BLANK };
        this._cancelForm = { ..._BLANK };
        this._buyerCancelReason = '';
        this._sellerCancelledForm = { ..._BLANK };
    }

    _emit(name, detail = {}) { emit(this, name, detail); }
    _dhFormInput(stateKey, detail) { this[stateKey] = { ...this[stateKey], [detail.key]: detail.value }; }

    render() {
        if (this.subId === 'preparing') return this._rbPreparing();
        if (this.subId === 'cancelled') return this._rbCancelled();
        return this._rbDone();
    }

    // Buyer (chưa phải actor): placeholder chung chung, trừ khi meta.preparing đã có tên (seller
    // lỡ điền sẵn từ confirmReceivedMoney()) — hiện chi tiết luôn dù vẫn ở sub 'preparing'. Seller:
    // 2 cột bằng nhau — trái "hoàn thành xử lý" (action chính), phải "huỷ đơn" (action rẽ nhánh).
    _rbPreparing() {
        const subStatus = this.meta.subStatus;
        if (this.role !== 'seller') {
            const preparingHandler = parseHandler(this.meta.preparing);
            return html`
                <div class="order-panel">
                    ${preparingHandler.name
                        ? handledByLine(this.meta.preparing, this.txt.roleSeller, this.txt.handledByLabel)
                        : html`<span class="waiting-note">${this.txt.sellerPreparingNote}</span>`}
                    ${this._rbCancelBlockBuyer(subStatus)}
                </div>`;
        }
        const h = this._prepareForm;
        return html`
            <div class="order-panel reason-columns">
                <svc-pay-reason ui=${this.ui} theme=${this.theme}
                    stepKey="preparing"
                    title=${this.stepTitle}
                    name=${h.name} phone=${h.phone} note=${h.note}
                    namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh} notePh=${this.txt.handlerNotePh}
                    quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                    actionLabel=${this.txt.completeProcessing}
                    @reason:input=${e => this._dhFormInput('_prepareForm', e.detail)}
                    @reason:action=${() => this._emit('processing:complete', { handler: this._prepareForm })}>
                </svc-pay-reason>
                ${this._rbCancelBlockSeller(subStatus)}
            </div>`;
    }

    // Buyer: chưa có yêu cầu (hoặc bị từ chối) -> nhập lý do gửi yêu cầu huỷ; 'pending' -> chỉ xem
    // banner chờ seller xử lý. Lý do từ chối đọc từ meta.sellerCancelled (note slot của seller's
    // reject stamp — xem tools/service.js's rejectCancel()).
    _rbCancelBlockBuyer(subStatus) {
        if (!subStatus || subStatus === 'rejected') return html`
            <div class="cancel-block">
                ${subStatus === 'rejected' ? html`
                    <web-alert type="warning" ui=${this.ui} theme=${this.theme} title=${this.cancelTxt.cancelRejectedBanner}>
                        ${this.cancelTxt.cancelRejectReasonLabel}: ${parseHandler(this.meta.sellerCancelled).note}
                    </web-alert>` : ''}
                <p class="hint">${this.txt.cancelHint}</p>
                <web-textarea placeholder=${this.txt.cancelReasonPh} .value=${this._buyerCancelReason} rows="3"
                    ui=${this.ui} theme=${this.theme}
                    @input=${e => { this._buyerCancelReason = e.detail?.value ?? ''; }}></web-textarea>
                <web-button type="ghost" color="error" height="36px" ?disabled=${!(this._buyerCancelReason ?? '').trim()}
                    @clicked=${() => { this._emit('processing:request-cancel', { reason: this._buyerCancelReason }); this._buyerCancelReason = ''; }}>
                    ${subStatus === 'rejected' ? this.cancelTxt.cancelRetry : this.txt.cancelOrder}
                </web-button>
            </div>`;

        // subStatus === 'pending'
        return html`
            <div class="cancel-block">
                <web-alert type="warning" ui=${this.ui} theme=${this.theme} title=${this.cancelTxt.cancelPendingBanner}>
                    ${this.txt.reasonLabel}: ${parseHandler(this.meta.cancel).note}
                </web-alert>
            </div>`;
    }

    // Seller: chưa có yêu cầu huỷ (hoặc lần trước bị chính seller từ chối) -> vẫn có thể CHỦ ĐỘNG
    // huỷ ngay (sellerCancelOrder — terminal ngay, khác requestCancel của buyer). 'pending' -> 2
    // action accept/reject dùng chung 1 form (field 'sellerCancelled').
    _rbCancelBlockSeller(subStatus) {
        if (!subStatus || subStatus === 'rejected') {
            const h = this._cancelForm;
            return html`
                <div class="cancel-block">
                    <svc-pay-reason ui=${this.ui} theme=${this.theme}
                        stepKey="sellerCancel"
                        title=${this.txt.sellerCancelHint} titleColor="error"
                        name=${h.name} phone=${h.phone} note=${h.note}
                        namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh}
                        notePh=${this.txt.sellerCancelReasonPh}
                        quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                        actionLabel=${this.txt.sellerCancelOrder} actionColor="error" actionType="soft"
                        ?actionDisabled=${!(h.note ?? '').trim()}
                        @reason:input=${e => this._dhFormInput('_cancelForm', e.detail)}
                        @reason:action=${() => { this._emit('processing:seller-cancel', { handler: this._cancelForm }); this._cancelForm = { ..._BLANK }; }}>
                    </svc-pay-reason>
                </div>`;
        }

        const h = this._sellerCancelledForm;
        return html`
            <div class="cancel-block">
                <web-alert type="warning" ui=${this.ui} theme=${this.theme} title=${this.cancelTxt.cancelPendingBanner}>
                    ${this.txt.reasonLabel}: ${parseHandler(this.meta.cancel).note}
                </web-alert>
                <svc-pay-reason ui=${this.ui} theme=${this.theme}
                    stepKey="sellerCancelled"
                    name=${h.name} phone=${h.phone} note=${h.note}
                    namePh=${this.txt.handlerNamePh} phonePh=${this.txt.handlerPhonePh}
                    notePh=${this.cancelTxt.wardenRejectReasonPh}
                    quickName=${this.sellerPrefill?.name ?? ''} quickPhone=${this.sellerPrefill?.phone ?? ''} quickLabel=${this.txt.quickFillLabel}
                    @reason:input=${e => this._dhFormInput('_sellerCancelledForm', e.detail)}>
                </svc-pay-reason>
                <web-button type="fill" color="success" height="36px"
                    @clicked=${() => this._emit('processing:accept-cancel', { handler: this._sellerCancelledForm })}>${this.cancelTxt.wardenAcceptCancel}</web-button>
                <web-button type="soft" color="error" height="36px" ?disabled=${!(h.note ?? '').trim()}
                    @clicked=${() => this._emit('processing:reject-cancel', { handler: this._sellerCancelledForm })}>${this.cancelTxt.wardenRejectCancel}</web-button>
            </div>`;
    }

    // subStatus 'seller_cancelled' (sellerCancelOrder) vs 'buyer_cancelled' (acceptCancel) phân
    // biệt AI khiến đơn bị huỷ hẳn — meta.cancel LUÔN là stamp của người KHỞI XƯỚNG.
    _rbCancelled() {
        const subStatus = this.meta.subStatus;
        const isSellerInitiated = subStatus === 'seller_cancelled';
        const cancel = parseHandler(this.meta.cancel);
        return html`
            <div class="order-panel">
                <web-alert type="error" ui=${this.ui} theme=${this.theme}
                    title="${this.txt.cancelledBy}: ${isSellerInitiated ? this.txt.roleSeller : this.txt.roleBuyer}">
                    ${this.txt.reasonLabel}: ${cancel.note}
                </web-alert>
                ${handledByLine(this.meta.cancel, isSellerInitiated ? this.txt.roleSeller : this.txt.roleBuyer, this.txt.handledByLabel)}
                ${isSellerInitiated ? '' : handledByLine(this.meta.sellerCancelled, this.txt.roleSeller, this.txt.handledByLabel)}
            </div>`;
    }

    // handler đã chốt xong ở màn 'preparing' (completeProcessing()) — ở đây chỉ hiện lại, KHÔNG
    // còn form nào nữa (người soạn hàng tự nhập ở ĐÚNG màn 'packing' của họ, tránh lệch vai trò).
    _rbDone() {
        return html`
            <div class="order-panel">
                <p class="done-note">${this.txt.orderPreparedNote}</p>
                ${handledByLine(this.meta.preparing, this.txt.roleSeller, this.txt.handledByLabel)}
                ${this.role === 'seller' ? html`
                    <web-button type="fill" color="primary" height="40px"
                        @clicked=${() => this._emit('processing:advance')}>${this.txt.continueToDelivery}</web-button>
                ` : ''}
            </div>`;
    }
}

if (!customElements.get('svc-pay-processing')) customElements.define('svc-pay-processing', SvcPayProcessing);
