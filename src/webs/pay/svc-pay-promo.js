import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-tooltip.js';
import '@/webs/apex/web-dialog.js';
import '@/webs/apex/web-text.js';
import '@/webs/apex/web-button.js';
import css from './styles/svc-pay-promo.css?inline';
import { fmtPrice, txtLingo, emit } from '@/services/helper.js';
import { PROMO_CODES, SPECIAL_PROMO_CODES } from './tools/constant.js';

const TXT_STD = {
    vi: {
        label: 'Mã khuyến mãi', ph: 'Nhập mã giảm giá', apply: 'Áp dụng', applied: 'đã được áp dụng',
        errInvalid: 'Mã không hợp lệ hoặc đã hết hạn', errMinOrder: 'Đơn tối thiểu',
        errUsedUp: 'Mã đã hết lượt sử dụng',
        createBtn: 'Tạo mã', createTitle: 'Tạo mã khuyến mãi mới', suggestLabel: 'Mẫu có sẵn — bấm để điền nhanh',
        createSpecialTitle: 'Tạo voucher gửi riêng', createSpecialBtn: 'Gửi voucher',
        existingLabel: 'Mã khuyến mãi đang tồn tại', remainingLabel: 'Còn lại',
        fCode: 'Mã (vd: SALE10)', fLabel: 'Nhãn hiển thị (vd: Giảm 10%)', fDiscount: 'Mức giảm',
        fQuantity: 'Số lượng lượt dùng (bỏ trống = mặc định 1)',
        fMinOrder: 'Đơn tối thiểu (không bắt buộc)', fMaxDiscount: 'Giảm tối đa (không bắt buộc, chỉ áp dụng cho %)',
        percent: 'Theo %', fixed: 'Số tiền cố định', errRequired: 'Vui lòng nhập đủ mã, nhãn và mức giảm',
        maxDiscHint: 'Giảm tối đa', deleteTitle: 'Xoá mã này', usedHint: 'Dùng',
    },
    en: {
        label: 'Promo code', ph: 'Enter promo code', apply: 'Apply', applied: 'has been applied',
        errInvalid: 'Invalid or expired code', errMinOrder: 'Minimum order',
        errUsedUp: 'This code has reached its usage limit',
        createBtn: 'New code', createTitle: 'Create new promo code', suggestLabel: 'Templates — click to fill in',
        createSpecialTitle: 'Create a private voucher', createSpecialBtn: 'Send voucher',
        existingLabel: 'Existing promo codes', remainingLabel: 'Remaining',
        fCode: 'Code (eg. SALE10)', fLabel: 'Display label (eg. 10% off)', fDiscount: 'Discount amount',
        fQuantity: 'Usage limit (leave blank = defaults to 1)',
        fMinOrder: 'Minimum order (optional)', fMaxDiscount: 'Max discount (optional, percent only)',
        percent: 'Percent', fixed: 'Fixed amount', errRequired: 'Code, label and discount are required',
        maxDiscHint: 'Max discount', deleteTitle: 'Delete this code', usedHint: 'Used',
    }
}

// Field mặc định của form tạo mã — dùng chung bởi _dhOpenCreate() (rỗng) và _dhFillSuggestion()
// (mồi từ 1 mẫu PROMO_CODES), tránh lặp lại 6 dòng gán field ở cả 2 nơi.
const BLANK_FORM = { code: '', label: '', type: 'percent', discount: '', minOrder: '', maxDiscount: '' }

/**
 * <svc-pay-promo> — áp/tạo/xoá mã khuyến mãi, độc lập domain `pay` (xem docs/PAY.rst §1). Dùng bởi
 * cả <svc-cart> (bay-sections toolbox) lẫn <svc-chat> (widget tạo voucher riêng trong tab DM,
 * `special` mode) — 1 component chung cho mọi nơi cần UI promo trong domain này.
 *
 * Props/Events: promos/applied/total/owner/type/special — promo:apply/promo:clear/promo:create/
 * promo:delete.
 */
export class SvcPayPromo extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        promos:     { type: Array },
        applied:    { type: Object },
        total:      { type: Number },
        owner:      { type: Boolean },
        type:       { type: String },
        special:    { type: Boolean },
        ui:         { type: String },
        theme:      { type: String },
        mainColors: { type: String },
        textColor:  { type: String },
        txt:        { type: Object },
        lang:       { type: String },
        _input:        { state: true },
        _error:        { state: true },
        _showCreate:   { state: true },
        _fCode:        { state: true },
        _fLabel:       { state: true },
        _fType:        { state: true },
        _fDiscount:    { state: true },
        _fQuantity:    { state: true },
        _fMinOrder:    { state: true },
        _fMaxDiscount: { state: true },
        _fError:       { state: true },
    };

    constructor() {
        super();
        this.promos  = [];
        this.applied = null;
        this.total   = 0;
        this.owner   = false;
        this.type    = '';
        this.special = false;
        this.txt     = null;
        this.lang    = 'vi';
        this._input  = '';
        this._error  = '';
        this._showCreate = false;
        this._fError     = '';
        this._setForm();
    }

    willUpdate(changed) {
        if (changed.has('applied') && !this.applied) { this._input = ''; this._error = ''; }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    _emit(name, detail) { emit(this, name, detail); }

    _dhApply() {
        const trimmed = this._input.trim().toUpperCase();
        if (!trimmed) { this._error = ''; return; }

        const found = (this.promos ?? []).find(p => p.code === trimmed);
        if (!found) { this._error = this._txt.errInvalid; return; }

        if (found.minOrder && this.total < found.minOrder) {
            this._error = `${this._txt.errMinOrder} ${fmtPrice(found.minOrder, this.lang)}`;
            return;
        }

        if (this._comUsedUp(found)) {
            this._error = this._txt.errUsedUp;
            return;
        }

        this._error = '';
        this._emit('promo:apply', { promo: found });
    }

    _dhClear() {
        this._input = '';
        this._error = '';
        this._emit('promo:clear');
    }

    _dhPick(code) {
        this._input = code;
        this._dhApply();
    }

    _dhDeletePromo(code) {
        this._emit('promo:delete', { code });
    }

    // ── CREATE (owner-only) ─────────────────────────────────────────────────────

    _setForm(p = BLANK_FORM) {
        this._fCode        = p.code ?? '';
        this._fLabel       = p.label ?? '';
        this._fType        = p.type ?? 'percent';
        this._fDiscount    = p.discount    ? String(p.discount)    : '';
        this._fQuantity    = p.quantity    ? String(p.quantity)    : '';
        this._fMinOrder    = p.minOrder    ? String(p.minOrder)    : '';
        this._fMaxDiscount = p.maxDiscount ? String(p.maxDiscount) : '';
        this._fError = '';
    }

    _dhOpenCreate() {
        this._setForm();
        this._showCreate = true;
    }

    _dhCancelCreate() { this._showCreate = false; }

    _dhFillSuggestion(p) { this._setForm(p); }

    _dhSubmitCreate() {
        const code     = this._fCode.trim().toUpperCase();
        const label    = this._fLabel.trim();
        const discount = Number(this._fDiscount);
        if (!code || !label || !discount) { this._fError = this._txt.errRequired; return; }

        const promo = { code, label, type: this._fType, discount };
        if (this.special) {
            promo.code     = `${code}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            promo.private  = true;
            promo.quantity = 1;
        } else {
            promo.quantity = this._fQuantity ? Number(this._fQuantity) : 1;
            if (this._fMinOrder) promo.minOrder = Number(this._fMinOrder);
            if (this._fType === 'percent' && this._fMaxDiscount) promo.maxDiscount = Number(this._fMaxDiscount);
        }

        this._emit('promo:create', { promo });
        this._showCreate = false;
    }

    _rfCreateBtn() {
        const isCircle = this.type === 'circle';
        const label = this.special ? this._txt.createSpecialBtn : this._txt.createBtn;
        const icon  = 'ri:coupon-3-line';
        return html`
            <web-button type=${this.special ? 'soft' : 'fill'} color="primary" .stys=${{ borderWidth: this.special ? '0' : '1px' }}
                ?square=${isCircle} rounded=${isCircle ? '50%' : '.5rem'} height=${isCircle ? '45px' : '23px'}
                ui=${this.ui} theme=${this.theme} title=${label} @clicked=${() => this._dhOpenCreate()}>
                <iconify-icon icon=${icon} width=${isCircle ? '20px' : '16px'}></iconify-icon>${isCircle ? '' : html` ${label}`}
            </web-button>
            `;
    }

    render() {
        if (this.type === 'circle') {
            return html`${this.owner ? html`${this._rfCreateBtn()}${this._rbCreateDialog()}` : ''}`;
        }
        return html`
            <div class="promo-header">
                <div class="section-label">${this._txt.label}</div>
                ${this.owner ? this._rfCreateBtn() : ''}
            </div>
            <div class="promo-row">
                <div class="promo-input-wrap">
                    <input class="promo-input" type="text" placeholder="${this._txt.ph}"
                        .value=${this._input}
                        @input=${e => { this._input = e.target.value; }}
                        @keydown=${e => e.key === 'Enter' && this._dhApply()} />
                    ${this._input ? html`
                        <web-button class="promo-clear" type="ghost" square height="20px"
                            ui=${this.ui} theme=${this.theme} @clicked=${() => this._dhClear()}>
                            <iconify-icon icon="ri:close-circle-fill"></iconify-icon>
                        </web-button>` : ''}
                </div>
                <web-button type="outline" color="primary" height="36px" style="flex-shrink:0"
                    ui=${this.ui} theme=${this.theme} @clicked=${() => this._dhApply()}>${this._txt.apply}</web-button>
            </div>
            ${this._error  ? html`<div class="promo-msg err"><iconify-icon icon="ri:error-warning-line"></iconify-icon> ${this._error}</div>` : ''}
            ${this.applied ? html`<div class="promo-msg ok"><iconify-icon icon="ri:checkbox-circle-line"></iconify-icon> ${this.applied.label} ${this._txt.applied}</div>` : ''}
            <div class="promo-hints">
                ${(this.promos ?? []).filter(p => p.code !== this.applied?.code && !p.private && !this._comUsedUp(p)).map(p => this._rfChip(p))}
            </div>
            ${this.owner ? this._rbCreateDialog() : ''}`;
    }

    _rfChip(p) {
        return html`
            <web-button mode="badge" type="dash" color="primary" rounded="4px" style="font-size:0.7rem"
                ui=${this.ui} theme=${this.theme} @clicked=${() => this._dhPick(p.code)}>
                ${this._comCondition(p) ? html`
                    <web-tooltip ui=${this.ui} placement="top" @click=${e => e.stopPropagation()}>
                        <iconify-icon class="promo-chip-info" icon="ri:information-line" width="16px"></iconify-icon>
                        <span slot="content">${this._comCondition(p)}</span>
                    </web-tooltip>
                ` : ''}
                ${p.code} — ${p.label}
                ${this.owner ? html`
                    <iconify-icon class="promo-chip-delete" icon="ri:close-circle-fill" title=${this._txt.deleteTitle}
                     width="16px" @click=${e => { e.stopPropagation(); this._dhDeletePromo(p.code); }}></iconify-icon>
                ` : ''}
            </web-button>`;
    }

    _rbCreateDialog() {
        const title       = this.special ? this._txt.createSpecialTitle : this._txt.createTitle;
        const suggestions = this.special ? SPECIAL_PROMO_CODES : PROMO_CODES;
        return html`
            <web-dialog ?open=${this._showCreate} title=${title} lang=${this.lang}
                maxWidth="420px" persistent ui=${this.ui} theme=${this.theme}
                @confirm=${() => this._dhSubmitCreate()} @cancel=${() => this._dhCancelCreate()}>
                <div class="promo-form">
                    <fieldset class="sas-panel">
                        <legend class="sas-legend">
                            <iconify-icon icon="ri:coupon-3-line"></iconify-icon>${this._txt.suggestLabel}
                        </legend>
                        <div class="promo-hints">
                            ${suggestions.map(p => html`
                                <web-button mode="badge" type="dash" color="primary" rounded="4px" style="font-size:0.7rem"
                                    ui=${this.ui} theme=${this.theme}
                                    @clicked=${() => this._dhFillSuggestion(p)}>${p.code} — ${p.label}</web-button>
                            `)}
                        </div>

                        ${this._rfFormField('_fCode', this._txt.fCode)}
                        ${this._rfFormField('_fLabel', this._txt.fLabel)}

                        <div class="promo-type-toggle">
                            ${this._rfTypeBtn('percent', this._txt.percent)}
                            ${this._rfTypeBtn('fixed', this._txt.fixed)}
                        </div>

                        ${this._rfFormField('_fDiscount', this._txt.fDiscount, 'number')}
                        ${!this.special ? this._rfFormField('_fQuantity', this._txt.fQuantity, 'number') : ''}
                        ${!this.special ? this._rfFormField('_fMinOrder', this._txt.fMinOrder, 'number') : ''}
                        ${!this.special && this._fType === 'percent' ? this._rfFormField('_fMaxDiscount', this._txt.fMaxDiscount, 'number') : ''}
                    </fieldset>

                    ${this._fError ? html`<div class="promo-msg err"><iconify-icon icon="ri:error-primary-line"></iconify-icon> ${this._fError}</div>` : ''}
                </div>
                ${this._rfExistingPromos()}
            </web-dialog>`;
    }

    // Danh sách mã ĐANG TỒN TẠI thật (this.promos — khác `suggestions` ở trên vốn chỉ là mẫu
    // gợi ý điền nhanh) — để owner biết trước khi tạo mã mới, tránh trùng/lặp ý nghĩa. Ẩn hẳn
    // mã private (voucher gửi riêng 1 người, không phải danh sách công khai) và ẩn cả block khi
    // chưa có mã nào. Bọc dạng fieldset/legend "sas-panel" (cùng khuôn <svc-assist>'s AI panel).
    _rfExistingPromos() {
        const list = (this.promos ?? []).filter(p => !p.private);
        if (!list.length) return '';
        return html`
            <fieldset class="sas-panel">
                <legend class="sas-legend">
                    <iconify-icon icon="ri:price-tag-3-line"></iconify-icon>${this._txt.existingLabel}
                </legend>
                <div class="promo-hints">
                    ${list.map(p => this._rfExistingChip(p))}
                </div>
            </fieldset>`;
    }

    // Hover cả chip (không chỉ icon) hiện số lượt còn lại — bọc nguyên <web-button> vào slot mặc
    // định của <web-tooltip> làm trigger, khác _rfChip() (chỉ icon ⓘ là trigger).
    _rfExistingChip(p) {
        return html`
            <web-tooltip ui=${this.ui} placement="top">
                <web-button mode="badge" type="fill" color="primary" rounded="4px" style="font-size:0.7rem"
                    ui=${this.ui} theme=${this.theme}>${p.code} — ${p.label}</web-button>
                <span slot="content">${this._txt.remainingLabel}: ${this._comRemaining(p)}/${p.quantity ?? 1}</span>
            </web-tooltip>`;
    }

    _comRemaining(p) { return Math.max(0, (p.quantity ?? 1) - (p.used ?? 0)) }

    _rfTypeBtn(value, label) {
        const active = this._fType === value;
        return html`
            <web-button type="fill" color=${active ? 'primary' : ''}
                style="flex:1" width="100%" ui="modern" rounded="0.25rem" theme=${this.theme}
                @clicked=${() => { this._fType = value; }}>${label}</web-button>`;
    }

    _rfFormField(prop, placeholder, type = 'text') {
        return html`
            <web-text ui=${this.ui} type=${type} placeholder=${placeholder} .value=${this[prop]}
                @input=${e => { this[prop] = e.detail?.value ?? ''; }}></web-text>`;
    }

    _comUsedUp(p) { return !!(p.quantity && (p.used ?? 0) >= p.quantity) }

    _comCondition(p) {
        const parts = [];
        if (p.minOrder)    parts.push(`${this._txt.errMinOrder} ${fmtPrice(p.minOrder, this.lang)}`);
        if (p.maxDiscount) parts.push(`${this._txt.maxDiscHint} ${fmtPrice(p.maxDiscount, this.lang)}`);
        if (this.owner && p.quantity) parts.push(`${this._txt.usedHint} ${p.used ?? 0}/${p.quantity}`);
        return parts.join(' · ');
    }
}

if (!customElements.get('svc-pay-promo')) customElements.define('svc-pay-promo', SvcPayPromo);
