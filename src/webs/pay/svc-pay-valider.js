import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-button.js';
import css from './styles/svc-pay-valider.css?inline';
import { PAY_METHODS, resolveAccountNo } from './tools/constant.js';
import { fmtPrice, parseJson, txtLingo, emit } from '@/services/helper.js';

const VIETQR_API = 'https://api.vietqr.io/v2/generate';

const BIN_STD = { momo: '971025', bank: '' };

const TXT_STD = {
    vi: { cod: 'Thanh toán khi nhận hàng', qrLoading: 'Đang tạo mã QR...', amountLabel: 'Số tiền:', paid: '✓ Xác nhận đã thanh toán', back: '← Quay lại', freeOrder: 'Đơn hàng đã được giảm giá hết — không cần thanh toán thêm' },
    en: { cod: 'Cash on delivery', qrLoading: 'Generating QR code...', amountLabel: 'Amount:', paid: '✓ Confirm paid', back: '← Back', freeOrder: 'This order is fully discounted — nothing left to pay' }
}

/**
 * <svc-pay-valider> — QR VietQR + nút xác nhận đã thanh toán, độc lập domain `pay` (bước "Thanh
 * toán" của <svc-pay>). Event `valider:paid` — buyer xác nhận đã thanh toán.
 *
 * Props:
 *   wallet    — { bank: { accountNo, accountName, bankName, bin },
 *                 momo: { phone, accountName, bin } }
 *   vietqr    — { clientId, apiKey }
 *   paymentId — mã tham chiếu
 *   amount    — số tiền sau giảm giá
 *   method    — 'cash' | 'momo' | 'bank'
 *
 * Events:
 *   valider:paid — { paymentId }
 *   valider:back — {}
 */
export class SvcPayValider extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui:         { type: String },
        theme:      { type: String },
        wallet:     { type: Object },
        vietqr:     { type: Object },
        paymentId:  { type: String },
        amount:     { type: Number },
        method:     { type: String },
        _qrDataUrl: { state: true },
        _qrLoading: { state: true },
        _qrError:   { state: true },
        txt:        { type: Object },
        lang:       { type: String },
    };

    constructor() {
        super();
        this.ui         = 'modern';
        this.theme      = '';
        this.wallet     = {};
        this.vietqr     = {};
        this.paymentId  = '';
        this.amount     = 0;
        this.method     = 'cash';
        this._qrDataUrl = '';
        this._qrLoading = false;
        this._qrError   = false;
        this.txt        = null;
        this.lang       = 'vi';
    }

    updated(changed) {
        if (changed.has('paymentId') || changed.has('amount') || changed.has('method')) {
            this._fetchQr();
        }
    }

    // ── COMPUTED ──────────────────────────────────────────────────────────────

    get _comWallet() { return parseJson(this.wallet, {}); }

    get _comAccount() {
        const w = this._comWallet;
        const a = w[this.method] ?? {};
        return { ...a, accountNo: resolveAccountNo(this.method, a) };
    }

    // `amount <= 0` (đơn được giảm giá hết, vd promo 100%) -> không có gì để chuyển khoản, mở khoá
    // luôn bất kể method — tránh buyer bị kẹt vĩnh viễn ở nút "Xác nhận đã thanh toán" vì
    // _fetchQr() không gọi API khi !amount (xem [1.a] bên dưới) nên _qrDataUrl không bao giờ có.
    get _comLocked() {
        if (this.method === 'cash' || this.amount <= 0) return false;
        return this._qrLoading || this._qrError || !this._qrDataUrl;
    }

    // ── QR FETCH ─────────────────────────────────────────────────────────────

    /** Flow _fetchQr: paymentId/amount/method/wallet -> _qrDataUrl (VietQR API, fallback ảnh tĩnh
     *  img.vietqr.io nếu API lỗi/fail). */
    async _fetchQr() {
        if (this.method === 'cash') return; // [1] CHECK
        this._qrDataUrl = '';
        this._qrError   = false;
        if (!this.paymentId || !this.amount) return; // [1.a]

        const account = this._comAccount; // [2] PROCESS: gom account/bin cần cho request
        const vqr     = parseJson(this.vietqr, {});
        const bin     = account.bin ?? BIN_STD[this.method] ?? '';
        if (!account.accountNo || !bin) { // [1.b] thiếu account/bin -> không gọi API
            console.warn('[svc-pay-valider] skip QR fetch: missing account.accountNo/bin', { method: this.method, account, bin, wallet: this._comWallet });
            this._qrError = true;
            return;
        }

        this._qrLoading = true;
        try { // [3] EXECUTE: gọi VietQR API
            const r = await fetch(VIETQR_API, {
                method: 'POST',
                headers: {
                    'x-client-id': vqr.clientId ?? '',
                    'x-api-key':   vqr.apiKey   ?? '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountNo:   account.accountNo,
                    accountName: account.accountName ?? '',
                    acqId:       bin,
                    amount:      this.amount,
                    addInfo:     this.paymentId,
                    format:      'text',
                    template:    'compact2',
                }),
            });
            const json = await r.json();
            if (json.code === '00') {
                this._qrDataUrl = json.data.qrDataURL; // [4] RETURN (state): QR thật
            } else {
                console.warn('[svc-pay-valider] VietQR API returned an error', json);
                this._qrDataUrl = this._fallbackUrl(account, bin); // [3.a] API lỗi -> fallback ảnh tĩnh
                this._qrError   = true;
            }
        } catch (err) {
            console.warn('[svc-pay-valider] VietQR fetch failed', err);
            this._qrDataUrl = this._fallbackUrl(account, bin); // [3.a] fetch fail -> fallback ảnh tĩnh
            this._qrError   = true;
        } finally {
            this._qrLoading = false;
        }
    }

    _fallbackUrl(account, bin) {
        const name = encodeURIComponent(account.accountName ?? '');
        const info = encodeURIComponent(this.paymentId ?? '');
        return `https://img.vietqr.io/image/${bin}-${account.accountNo}-compact2.png?amount=${this.amount}&addInfo=${info}&accountName=${name}`;
    }

    // ── ACTIONS ───────────────────────────────────────────────────────────────

    _emit(name, detail) { emit(this, name, detail); }

    // ── RENDER ────────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        const method  = PAY_METHODS.find(m => m.value === this.method);
        const account = this._comAccount;

        return html`
            <div class="qr-body">
                <div class="qr-card">
                    <div class="qr-card-top">
                        <span class="qr-method-name">${method?.label ?? ''}</span>
                        ${this.method !== 'cash' ? html`<span class="qr-badge">VietQR</span>` : ''}
                    </div>

                    ${this.amount <= 0 ? html`
                        <div class="qr-manual">
                            <iconify-icon icon="ri:gift-line" class="cash-icon"></iconify-icon>
                            <span class="qr-manual-label">${this._txt.freeOrder}</span>
                        </div>
                    ` : this.method === 'cash' ? html`
                        <div class="qr-manual">
                            <iconify-icon icon="ion:cash-outline" class="cash-icon"></iconify-icon>
                            <span class="qr-manual-label">${this._txt.cod}</span>
                        </div>
                    ` : this._qrLoading ? html`
                        <div class="qr-manual">
                            <iconify-icon icon="ri:loader-4-line" class="spin"></iconify-icon>
                            <span class="qr-manual-label">${this._txt.qrLoading}</span>
                        </div>
                    ` : this._qrDataUrl ? html`
                        <img class="qr-img" src="${this._qrDataUrl}" alt="QR thanh toán" />
                    ` : html`
                        <div class="qr-manual">
                            <iconify-icon icon="${method?.icon ?? 'ri:qr-code-line'}"></iconify-icon>
                            <span class="qr-manual-phone">${account.accountNo}</span>
                            <span class="qr-manual-label">${account.accountName}</span>
                        </div>`}

                    <div class="qr-sep"></div>
                    <div class="qr-footer">
                        <span class="qr-footer-label">${this._txt.amountLabel}</span>
                        <span class="qr-amount">${fmtPrice(this.amount, this.lang, '')} VND</span>
                    </div>
                </div>
                <div class="qr-ref">Mã: ${this.paymentId}</div>
            </div>

            <div class="actions">
                <web-button type="fill" color="success" height="45px" width="100%" fontSize="1rem" ?disabled=${this._comLocked}
                    ui=${this.ui} theme=${this.theme}
                    @clicked=${() => this._emit('valider:paid', { paymentId: this.paymentId })}>
                    ${this._txt.paid}
                </web-button>
                <web-button type="ghost" height="32px" width="100%"
                    ui=${this.ui} theme=${this.theme}
                    @clicked=${() => this._emit('valider:back', {})}>${this._txt.back}</web-button>
            </div>`;
    }
}

if (!customElements.get('svc-pay-valider')) customElements.define('svc-pay-valider', SvcPayValider);
