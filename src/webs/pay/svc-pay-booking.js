import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import css from './styles/svc-pay-booking.css?inline';
import { PAY_METHODS, hasWalletAccount, resolveAccountNo } from './tools/constant.js';
import { parseJson, txtLingo, emit } from '@/services/helper.js';

const TXT_STD = {
    vi: { label: 'Hình thức thanh toán', momo: 'MoMo', bank: 'Chuyển khoản', cash: 'Tiền mặt', cod: 'Thanh toán khi nhận hàng', defaultBank: 'Ngân hàng', vietqr: 'VietQR' },
    en: { label: 'Payment method', momo: 'MoMo', bank: 'Bank transfer', cash: 'Cash', cod: 'Cash on delivery', defaultBank: 'Bank', vietqr: 'VietQR' }
}

/**
 * <svc-pay-booking> — chọn phương thức thanh toán, độc lập domain `pay` (dùng ở bước "Đặt hàng"
 * của <svc-pay-order>, xem docs/PAY.rst).
 *
 * Props:
 *   wallet       — { bank: { accountNo, accountName, bankName, bin },
 *                    momo: { phone, accountName, bin } }
 *   method       — phương thức đang chọn từ parent ('cash' | 'momo' | 'bank')
 *   cashDisabled — true → ẩn hẳn tuỳ chọn 'Tiền mặt' khỏi danh sách (vd shop online không nhận
 *                  tiền mặt tại quầy) — nếu method đang chọn là 'cash' lúc này, tự chuyển sang
 *                  phương thức khả dụng đầu tiên còn lại và emit `payment:select` để đồng bộ lại
 *                  <svc-pay>.
 *
 * Events:
 *   payment:select — { method }
 */
export class SvcPayBooking extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        wallet:       { type: Object },
        method:       { type: String },
        cashDisabled: { type: Boolean },
        ui:         { type: String },
        theme:      { type: String },
        mainColors: { type: String },
        textColor:  { type: String },
        txt:        { type: Object },
        lang:       { type: String },
        _payMethod: { state: true },
    };

    constructor() {
        super();
        this.wallet       = {};
        this.method       = 'cash';
        this.cashDisabled = false;
        this.txt        = null;
        this.lang       = 'vi';
        this._payMethod = 'cash';
    }

    willUpdate(changed) {
        if (changed.has('method') && this.method) this._payMethod = this.method;
        if ((changed.has('wallet') || changed.has('method') || changed.has('cashDisabled')) &&
            !this._comAvailableMethods.some(m => m.value === this._payMethod)) {
            // Emit (không gán thẳng _payMethod) — nếu chỉ gán local, <svc-pay>'s `_payMethod`
            // (nguồn forward cho <svc-pay-valider> ở bước 'paying') sẽ lệch khỏi UI đang hiển thị.
            this._dfSelect(this._comAvailableMethods[0]?.value ?? 'cash');
        }
    }

    get _comAvailableMethods() {
        return PAY_METHODS.filter(m => hasWalletAccount(this._comWallet, m.value) && !(this.cashDisabled && m.value === 'cash'));
    }

    _emit(name, detail) { emit(this, name, detail); }

    _dfSelect(method) {
        this._payMethod = method;
        this._emit('payment:select', { method });
    }

    get _comWallet() { return parseJson(this.wallet, {}); }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        const w = this._comWallet;
        return html`
            <div class="section-label">${this._txt.label}</div>
            <div class="pay-method-tabs">
                ${this._comAvailableMethods.map(m => html`
                    <button class="pay-method-btn ${this._payMethod === m.value ? 'active' : ''}"
                        @click=${() => this._dfSelect(m.value)}>
                        <iconify-icon icon="${m.icon}"></iconify-icon>
                        ${this._txt[m.value] || m.label}
                    </button>`)}
            </div>
            ${this._rbDetail(w)}`;
    }

    _rbDetail(w) {
        const m       = this._payMethod;
        const account = w[m] ?? {};

        if (m === 'cash') {
            return this._rfBankItem(this._txt.cash, account.note ?? this._txt.cod,
                html`<iconify-icon icon="ion:cash-outline" class="cash-icon"></iconify-icon>`);
        }

        const name = m === 'momo' ? 'MoMo' : (account.bankName ?? this._txt.defaultBank);
        const acct = resolveAccountNo(m, account);
        return this._rfBankItem(name, account.accountName ? `${acct} — ${account.accountName}` : acct, this._txt.vietqr);
    }

    _rfBankItem(name, acctText, badge) {
        return html`
            <div class="pay-detail">
                <div class="bank-item active">
                    <div class="bank-info">
                        <span class="bank-name">${name}</span>
                        <span class="bank-acct">${acctText}</span>
                    </div>
                    <span class="bank-default">${badge}</span>
                </div>
            </div>`;
    }
}

if (!customElements.get('svc-pay-booking')) customElements.define('svc-pay-booking', SvcPayBooking);
