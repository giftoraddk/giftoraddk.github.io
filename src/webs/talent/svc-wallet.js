import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-text.js';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-dialog.js';
import '@/webs/apex/web-toast.js';
import css from './styles/svc-wallet.css?inline';
import { emit, toastEmit, txtLingo, watchHtmlAttr } from '@/services/helper.js';
import { getXuBalance, loadWalletHistory, requestTopUp } from './tools/service.js';

const TXT_STD = {
    vi: {
        title: 'Ví Xu', balanceLabel: 'Số dư', buyXu: 'Mua Xu', historyTitle: 'Lịch sử giao dịch',
        empty: 'Chưa có giao dịch nào.', topup: 'Nạp', spend: 'Chi', refund: 'Hoàn',
        pending: '(chờ duyệt)', amountLabel: 'Số Xu muốn nạp', noteLabel: 'Ghi chú (vd: đã chuyển khoản lúc...)',
        submitRequest: 'Gửi yêu cầu nạp', requestedToast: 'Đã gửi yêu cầu — chờ admin xác nhận chuyển khoản',
        errToast: 'Có lỗi xảy ra, thử lại sau', close: 'Đóng', loginRequired: 'Vui lòng đăng nhập để dùng ví Xu',
    },
    en: {
        title: 'Xu Wallet', balanceLabel: 'Balance', buyXu: 'Buy Xu', historyTitle: 'Transaction history',
        empty: 'No transactions yet.', topup: 'Top up', spend: 'Spend', refund: 'Refund',
        pending: '(pending)', amountLabel: 'Amount to top up', noteLabel: 'Note (e.g. transferred at...)',
        submitRequest: 'Submit top-up request', requestedToast: 'Request sent — waiting for admin confirmation',
        errToast: 'Something went wrong, try again', close: 'Close', loginRequired: 'Please log in to use the Xu wallet',
    },
};

/**
 * <svc-wallet> — số dư Xu + lịch sử + yêu cầu nạp (hook/new_feature.md §3, §9 item 9). MVP: chỉ
 * tạo yêu cầu (`requestTopUp`, status 'pending') — KHÔNG tự cộng balance ngay (bảo mật, xem
 * tools/service.js's `approveTopUp` — admin duyệt thủ công sau khi xác nhận đã nhận chuyển khoản).
 */
export class SvcWallet extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        userId: { type: String },
        txt: { type: Object },
        _balance: { state: true }, _history: { state: true },
        _dialogOpen: { state: true }, _amount: { state: true }, _note: { state: true }, _sending: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.mainColors = ''; this.textColor = '';
        this.lang = 'vi'; this.userId = '';
        this.txt = null;
        this._balance = 0; this._history = [];
        this._dialogOpen = false; this._amount = 0; this._note = ''; this._sending = false;
        this._lastUserId = null; // userId ĐÃ load lần gần nhất — xem updated()
    }

    connectedCallback() {
        super.connectedCallback();
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi'; });
        this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
    }

    // `userId` được set SAU khi mount (script astro:page-load ở wallet.astro chờ auth.get() rồi
    // mới gán) — cùng race đã gặp ở svc-pay-warden.js's updated(): connectedCallback() chạy trước
    // khi userId còn rỗng, phải resubscribe khi giá trị THẬT SỰ đổi lần đầu.
    updated(changed) {
        if (!changed.has('userId') || this.userId === this._lastUserId) return;
        this._dcLoad();
    }

    async _dcLoad() {
        this._lastUserId = this.userId;
        if (!this.userId) { this._balance = 0; this._history = []; return; }
        const [balance, history] = await Promise.all([getXuBalance(this.userId), loadWalletHistory(this.userId)]);
        this._balance = balance;
        this._history = history;
    }

    async _dfSubmitRequest() {
        if (this._sending || !(Number(this._amount) > 0)) return;
        if (!this.userId) { toastEmit(this._txt.loginRequired, 'error'); return; }
        this._sending = true;
        try {
            await requestTopUp(this.userId, Number(this._amount), this._note);
            toastEmit(this._txt.requestedToast, 'success');
            this._dialogOpen = false;
            this._amount = 0; this._note = '';
            await this._dcLoad();
            emit(this, 'wallet:topup-requested', { amount: this._amount });
        } catch (err) {
            console.error('[talent] requestTopUp error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._sending = false;
        }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    _rfHistoryRow(row) {
        const t = this._txt;
        const meta = row.meta ?? {};
        const sign = meta.amount > 0 ? '+' : '';
        return html`
            <div class="wallet-row">
                <span class="wallet-row-type">${t[meta.type] ?? meta.type}${row.status === 'pending' ? ` ${t.pending}` : ''}</span>
                <span class="wallet-row-reason">${meta.reason}</span>
                <span class="wallet-row-amount ${meta.amount > 0 ? 'is-positive' : 'is-negative'}">${sign}${meta.amount} Xu</span>
            </div>
        `;
    }

    render() {
        const t = this._txt;
        return html`
            <div class="wallet">
                <h2>${t.title}</h2>
                <div class="wallet-balance">
                    <span>${t.balanceLabel}</span>
                    <strong>🪙 ${this._balance.toLocaleString()} Xu</strong>
                    <web-button type="fill" color="primary" height="36px" @clicked=${() => { this._dialogOpen = true; }}>${t.buyXu}</web-button>
                </div>

                <h3>${t.historyTitle}</h3>
                ${this._history.length ? html`<div class="wallet-history">${this._history.map((r) => this._rfHistoryRow(r))}</div>` : html`<p>${t.empty}</p>`}

                ${this._dialogOpen ? html`
                    <web-dialog open title=${t.buyXu} ui=${this.ui} theme=${this.theme} maxWidth="360px"
                        @cancel=${() => { this._dialogOpen = false; }}>
                        <div class="wallet-request-form">
                            <web-text type="number" placeholder=${t.amountLabel} ui=${this.ui} theme=${this.theme} .value=${String(this._amount)}
                                @input=${(e) => { this._amount = e.detail.value; }}></web-text>
                            <web-text placeholder=${t.noteLabel} ui=${this.ui} theme=${this.theme} .value=${this._note}
                                @input=${(e) => { this._note = e.detail.value; }}></web-text>
                            <web-button type="fill" color="primary" height="40px" ?loading=${this._sending} @clicked=${() => this._dfSubmitRequest()}>${t.submitRequest}</web-button>
                        </div>
                    </web-dialog>
                ` : ''}
            </div>
        `;
    }
}

if (!customElements.get('svc-wallet')) customElements.define('svc-wallet', SvcWallet);
