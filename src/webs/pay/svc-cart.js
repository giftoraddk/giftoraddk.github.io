import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-toast.js';
import '@/webs/apex/web-fab.js';
import '@/webs/apex/web-dialog.js';
import '@/webs/apex/web-button.js';
import '@/webs/pay/svc-pay-promo.js';
import css from './styles/svc-cart.css?inline';
import {
    setupCart, initCart, removeCartItem, setCartQty, toggleCartNote,
    addPromo, removePromo, usePromo, subscribe, make,
} from './tools/service.js';
import { fmtPrice, parseJson, fmtBadgeCount, txtLingo, emit, toastEmit } from '@/services/helper.js';

const TXT_STD = {
    vi: { items: 'món', cart: 'Giỏ hàng', empty: 'Chưa có món nào trong giỏ', subtotal: 'Tạm tính', discount: 'Khuyến mãi', delete: 'Xoá', notesLabel: 'Yêu cầu đặc biệt', notesPh: 'Ghi chú thêm...', total: 'Tổng tiền', btnCheckout: 'Đặt hàng →', btnClear: 'Xóa tất cả' },
    en: { items: 'items', cart: 'Cart', empty: 'No items in cart', subtotal: 'Subtotal', discount: 'Discount', delete: 'Remove', notesLabel: 'Special requests', notesPh: 'Additional notes...', total: 'Total', btnCheckout: 'Checkout →', btnClear: 'Clear all' }
}

/**
 * <svc-cart> — "giỏ hàng" độc lập của domain `pay` (fab+dialog+items/qty/promo/notes/tổng tiền —
 * không có tab checkout/QR, thuộc <svc-pay>). Không import domain nào khác — xem hook/PAY.rst §1.
 *
 * "Đặt hàng →" chỉ emit `cart:checkout` cho parent mount <svc-pay>, không tự tạo invoice.
 * `promosStore` override nơi lưu/đọc promo (mặc định: conductor+Storager cục bộ, không đồng bộ
 * xuyên thiết bị) — chi tiết + sơ đồ: xem hook/PAY.rst §3.8.
 *
 * Events: cart:checkout — { items, seller, sellerId, bayId, notes, promo, disc }, act:clear, close,
 * promo:create/promo:delete.
 */
export class SvcCart extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui:            { type: String },
        theme:         { type: String },
        mainColors:    { type: String },
        textColor:     { type: String },
        value:         {},
        service:       { type: String },
        owner:         { type: Boolean }, // true → cho phép tạo mã khuyến mãi mới, xem svc-pay-promo.js
        promosStore:   {}, // override generic { add, remove, use, subscribe } — xem docstring
        position:      { type: String },
        x:             { type: String },
        y:             { type: String },
        wallet:        { type: Object },
        seller:        { type: String }, // "name~phone~address~email~taxCode"
        sellerId:      { type: String },
        bayId:         { type: String },
        txt:           { type: Object },
        lang:          { type: String },
        notes:         { type: Array },
        _items:        { state: true },
        _open:         { state: true },
        _appliedPromo: { state: true },
        _checkedNotes: { state: true },
        _promos:       { state: true },
        _notes:        { state: true },
        _noteText:     { state: true },
    };

    constructor() {
        super();
        this.service       = 'cart';
        this.owner         = false;
        this.promosStore   = null;
        this.position      = 'fixed';
        this.x             = '99%';
        this.y             = 'calc(100% - 7.5rem)';
        this.wallet        = {};
        this.seller        = '';
        this.sellerId      = '';
        this.bayId         = '';
        this.txt           = null;
        this.lang          = 'vi';
        this._items        = [];
        this._open         = false;
        this._appliedPromo = null;
        this._checkedNotes = [];
        this._promos       = [];
        this._notes        = [];
        this._noteText     = '';
        this._unsub        = null;
        this._unsubToast   = null;
        this._unsubPromos  = null;
        this._totals       = { items: [], count: 0, total: 0, disc: 0, final: 0 };
    }

    connectedCallback() {
        super.connectedCallback();
        this._dcInit();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsub?.();
        this._unsubPromos?.();
    }

    updated(changed) {
        if (changed.has('service') && this.service !== this._initedService) this._dcReinit();
    }

    _dcReinit() {
        this._unsub?.(); this._unsub = null;
        this._unsubPromos?.(); this._unsubPromos = null;
        this._dcInit();
    }

    willUpdate(changed) {
        if (changed.has('_items') || changed.has('_appliedPromo') || changed.has('_promos')) {
            const items = this._items;
            const total = items.reduce((s, i) => s + Number(i.price ?? 0) * i.qty, 0);

            if (this._appliedPromo && (
                !this._promos.some(p => p.code === this._appliedPromo.code) ||
                (this._appliedPromo.minOrder && total < this._appliedPromo.minOrder)
            )) this._appliedPromo = null;

            const p    = this._appliedPromo;
            const disc = p ? Math.min(p.type === 'percent' ? Math.round(total * p.discount / 100) : p.discount, p.maxDiscount ?? Infinity) : 0;
            this._totals = { items, count: items.reduce((s, i) => s + i.qty, 0), total, disc, final: Math.max(0, total - disc) };
        }
    }

    // ── DATA CORE ──────────────────────────────────────────────────────────────

    _dcInit() {
        this._initedService = this.service;
        const items = Array.isArray(this.value) ? this.value : [];
        setupCart(this.service, items, { notes: this.notes });

        this._unsub = subscribe(this.service, s => {
            this._items        = s.items        ?? [];
            this._open         = s.open         ?? false;
            this._checkedNotes = s.checkedNotes ?? [];
            // Có promosStore riêng (vd P2P mesh của webs/bay) thì bỏ qua nhánh conductor mặc định
            // — promosStore.subscribe() bên dưới mới là nguồn thật cho _promos.
            if (!this.promosStore) this._promos = s.promos ?? [];
            this._notes        = s.notes        ?? this.notes;
        });

        if (this.promosStore) {
            this._unsubPromos = this.promosStore.subscribe(promos => { this._promos = promos ?? []; });
        }

        initCart(this.service);
    }

    // ── PUBLIC API ────────────────────────────────────────────────────────────

    openSheet()  { make(this.service, { open: true }); }
    closeSheet() { make(this.service, { open: false }); this._emit('close'); }

    showToast(message, type = 'success') { toastEmit(message, type); }

    // ── DATA FOOTER ──────────────────────────────────────────────────────────

    _dfRemoveItem(id)   { removeCartItem(this.service, id); }
    _dfSetQty(id, qty)  { setCartQty(this.service, id, qty); }
    _dfClearItems()     { make(this.service, { items: [] }); this._emit('act:clear', { e: 'act:clear' }); }
    _dfToggleNote(note) { toggleCartNote(this.service, note); }

    _dhPromoApply(e)  { this._appliedPromo = e.detail.promo; }
    _dhPromoClear()   { this._appliedPromo = null; }

    _dfPromoCreate(e) { if (this.promosStore) this.promosStore.add(e.detail.promo); else addPromo(this.service, e.detail.promo); }
    _dfPromoDelete(e) { if (this.promosStore) this.promosStore.remove(e.detail.code); else removePromo(this.service, e.detail.code); }
    _dfPromoUse(code) { if (this.promosStore) this.promosStore.use(code); else usePromo(this.service, code); }

    /** Flow _dfCheckout: giỏ + promo -> emit cart:checkout (không tự xoá items — giỏ chỉ reset
     *  sau khi payment xác nhận, xem clearCart()/svc-pay.js's _dfConfirmPaid() và hook/PAY.rst §5
     *  "Giỏ hàng bị xoá NGAY khi checkout"). Promo vẫn tự clear+tính usage ngay tại đây. `disc` là
     *  số tiền giảm giá ĐÃ TÍNH SẴN (giống hệt con số hiển thị ở _rbSummary()) — carry sang cho
     *  <svc-pay> để số tiền THẬT SỰ phải trả (QR/invoice) cũng được trừ giảm giá, không chỉ hiển
     *  thị ở giỏ hàng. */
    _dfCheckout() {
        const { count, disc } = this._comTotals;
        if (count === 0) return; // [1] CHECK
        this._emit('cart:checkout', { // [3] EXECUTE
            items:    [...this._items],
            seller:   this.seller,
            sellerId: this.sellerId,
            bayId:    this.bayId,
            notes:    [...this._checkedNotes, ...(this._noteText.trim() ? [this._noteText.trim()] : [])],
            promo:    this._appliedPromo?.code ?? null,
            disc,
        });
        if (this._appliedPromo) this._dfPromoUse(this._appliedPromo.code); // [3.a] tính usage ngay, không đợi xác nhận thanh toán
        this._dhPromoClear();
        this.closeSheet();
        this._noteText = '';
    }

    // ── COMPUTED ──────────────────────────────────────────────────────────────

    get _comTotals() { return this._totals; }
    get _comWallet() { return parseJson(this.wallet, {}); }

    // ── HELPER ────────────────────────────────────────────────────────────────

    _emit(name, detail = {}) { emit(this, name, detail); }

    // ── RENDER ────────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        const { count } = this._comTotals;
        return html`
            <web-toast ui="spatial"></web-toast>

            <web-fab icon="ri:shopping-cart-fill" badge=${count ? fmtBadgeCount(count) : ''} position=${this.position} x=${this.x} y=${this.y} movable=${this.position === 'fixed' ? true : false}
              size="lg" ui=${this.ui} theme=${this.theme} @clicked=${() => this.openSheet()}></web-fab>

            <web-dialog type="mobile" ui=${this.ui} theme=${this.theme} maxWidth="480px"
                .open=${this._open} @close=${() => this.closeSheet()}>
                ${this._rbHeader()}
                ${this._items.length === 0 ? this._rbEmpty() : this._rbBody()}
            </web-dialog>`;
    }

    _rbHeader() {
        const { count } = this._comTotals;
        return html`
            <iconify-icon slot="header" icon="ri:shopping-cart-fill" class="header-icon"></iconify-icon>
            <span slot="header" class="header-title">${this._txt.cart}</span>
            ${count > 0 ? html`<span slot="header" class="header-badge">${count} ${this._txt.items}</span>` : ''}
            <web-button slot="header" type="soft" square rounded="50%" height="1.5rem" width="1.5rem"
                ui=${this.ui} theme=${this.theme}
                @clicked=${() => this.closeSheet()}>
                <iconify-icon icon="ri:close-line"></iconify-icon>
            </web-button>`;
    }

    _rbEmpty() {
        return html`
            <div class="empty">
                <iconify-icon icon="ri:shopping-basket-line"></iconify-icon>
                <p>${this._txt.empty}</p>
            </div>`;
    }

    _rbBody() {
        return html`
            <div class="items">${this._items.map(i => this._rfItem(i))}</div>
            ${this._rbSummary()}
            ${this._rbPromo()}
            ${this._rbNotes()}
            ${this._rbActions()}`;
    }

    _rbSummary() {
        const { count, total, disc } = this._comTotals;
        return html`
            <div class="section">
                <div class="row">
                    <span class="label">${this._txt.subtotal} (${count} ${this._txt.items})</span>
                    <span class="value">${fmtPrice(total, this.lang)}</span>
                </div>
                ${disc > 0 ? html`
                    <div class="row discount">
                        <span class="label">${this._txt.discount} (${this._appliedPromo?.code})</span>
                        <span class="value">− ${fmtPrice(disc, this.lang)}</span>
                    </div>` : ''}
            </div>`;
    }

    _rfItem(item) {
        const price = Number(item.price ?? 0);
        const img   = item.img ?? item.pics ?? '';
        const name  = item.name ?? item.title ?? '';
        return html`
            <div class="item">
                ${img ? html`<img class="item-img" src="${img}" alt="${name}" loading="lazy" />` : ''}
                <div class="item-info">
                    <div class="item-name">${name}</div>
                    <div class="item-price">${item.formattedPrice ?? fmtPrice(price, this.lang)}</div>
                    ${item.qty > 1 ? html`<div class="item-subtotal">× ${item.qty} = ${fmtPrice(price * item.qty, this.lang)}</div>` : ''}
                </div>
                <div class="item-right">
                    <web-button type="ghost" height="24px" prefix="ri:delete-bin-line"
                        ui=${this.ui} theme=${this.theme}
                        @clicked=${() => this._dfRemoveItem(item.id)}>${this._txt.delete}</web-button>
                    <div class="qty-row">
                        <web-button type="soft" square rounded="0" height="2rem" width="2rem" theme=${this.theme}
                            @clicked=${() => this._dfSetQty(item.id, item.qty - 1)}>−</web-button>
                        <span class="qty-num">${item.qty}</span>
                        <web-button type="soft" square rounded="0" height="2rem" width="2rem" theme=${this.theme}
                            @clicked=${() => this._dfSetQty(item.id, item.qty + 1)}>+</web-button>
                    </div>
                </div>
            </div>`;
    }

    _rbPromo() {
        const { total } = this._comTotals;
        return html`
            <div class="section">
                <svc-pay-promo .promos=${this._promos} .applied=${this._appliedPromo} .total=${total}
                    lang=${this.lang} ui=${this.ui} theme=${this.theme} ?owner=${this.owner}
                    @promo:apply=${e => this._dhPromoApply(e)}
                    @promo:clear=${() => this._dhPromoClear()}
                    @promo:create=${e => this._dfPromoCreate(e)}
                    @promo:delete=${e => this._dfPromoDelete(e)}>
                </svc-pay-promo>
            </div>`;
    }

    _rbNotes() {
        return html`
            <div class="section">
                <div class="section-label">${this._txt.notesLabel}</div>
                <div class="notes-grid">
                    ${(this._notes ?? []).map(note => html`
                        <label class="note-item">
                            <input type="checkbox" .checked=${this._checkedNotes.includes(note)}
                                @change=${() => this._dfToggleNote(note)} />
                            ${note}
                        </label>`)}
                </div>
                <textarea class="note-textarea" rows="2" placeholder="${this._txt.notesPh}"
                    .value=${this._noteText}
                    @input=${e => { this._noteText = e.target.value; }}></textarea>
            </div>`;
    }

    _rbActions() {
        const { count, final: ft } = this._comTotals;
        return html`
            <div class="actions" slot="footer">
                <div class="total-row">
                    <span class="total-label">${this._txt.total}</span>
                    <span class="total-value">${fmtPrice(ft, this.lang)}</span>
                </div>
                <web-button type="fill" color="primary" height="45px" width="100%" ?disabled=${count === 0}
                    ui=${this.ui} theme=${this.theme}  fontSize="1rem"
                    @clicked=${() => this._dfCheckout()}>${this._txt.btnCheckout}</web-button>
                <web-button type="ghost" height="32px" width="100%"
                    ui="${this.ui}" theme=${this.theme}
                    @clicked=${() => this._dfClearItems()}>${this._txt.btnClear}</web-button>
            </div>`;
    }
}

if (!customElements.get('svc-cart')) customElements.define('svc-cart', SvcCart);
