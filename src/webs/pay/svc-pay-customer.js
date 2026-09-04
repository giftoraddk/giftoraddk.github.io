import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-expansion.js';
import '@/webs/apex/web-location.js';
import css from './styles/svc-pay-customer.css?inline';
import { setupCustomer, initCustomer, saveCustomer, customerSubscribe, newCustomerEntry } from './tools/service.js';
import { txtLingo } from '@/services/helper.js';

const TXT_STD = {
    vi: { title: 'Thông tin khách hàng', new: 'Khách mới', nameLabel: 'Họ và tên', namePh: 'Nguyễn Văn A', phoneLabel: 'Số điện thoại', phonePh: '0912 345 678', emailLabel: 'Email', emailOptional: '(tuỳ chọn)', emailPh: 'you@example.com', addressLabel: 'Địa chỉ', defaultBadge: 'Mặc định', btnSetDefault: 'Đặt mặc định', btnRemove: 'Xóa', btnAdd: 'Thêm', empty: 'Chưa có thông tin nào. Thêm khách hàng mới.' },
    en: { title: 'Customer information', new: 'New customer', nameLabel: 'Full name', namePh: 'John Doe', phoneLabel: 'Phone number', phonePh: '0912 345 678', emailLabel: 'Email', emailOptional: '(optional)', emailPh: 'you@example.com', addressLabel: 'Address', defaultBadge: 'Default', btnSetDefault: 'Set default', btnRemove: 'Remove', btnAdd: 'Add', empty: 'No entries yet. Add a new customer.' }
}

/**
 * <svc-pay-customer> — form hồ sơ liên hệ buyer, độc lập domain `pay` (xem hook/PAY.rst). Section
 * conductor riêng `pay_customer` (Storager key riêng, tách hoàn toàn khỏi domain khác).
 */
export class SvcPayCustomer extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        ui:       { type: String },
        theme:    { type: String },
        service:  { type: String },
        txt:      { type: Object },
        lang:     { type: String },
        _data:    { state: true },
        _openMap: { state: true },
    };

    constructor() {
        super();
        this.ui       = 'modern';
        this.theme    = '';
        this.service  = 'pay_customer';
        this.txt      = null;
        this.lang     = 'vi';
        this._data    = { entries: [] };
        this._openMap = {};
        this._unsub   = null;
        this._saveTimer = null;
    }

    // ── LIFECYCLE ──────────────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        setupCustomer(this.service);
        this._unsub = customerSubscribe(this.service, s => { this._data = s ? { ...s } : this._data; });
        initCustomer(this.service);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsub?.();
        clearTimeout(this._saveTimer);
    }

    // ── DATA HEAD ──────────────────────────────────────────────────────────────

    /** Flow _dhEntry: id/key/value -> entry cập nhật + saveCustomer() debounce 600ms (tránh ghi
     *  Storager mỗi keystroke). */
    _dhEntry(id, key, value) {
        this._data = { // [2] PROCESS
            ...this._data,
            entries: (this._data.entries ?? []).map(e => e.id === id ? { ...e, [key]: value } : e),
        };
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => saveCustomer(this.service, this._data), 600); // [3] EXECUTE (debounced)
    }

    /** Flow _dhAdd: () -> entry mới thêm vào cuối danh sách (mở sẵn, isDefault nếu là entry đầu). */
    _dhAdd() {
        const entry = newCustomerEntry();
        if ((this._data.entries ?? []).length === 0) entry.isDefault = true; // [2] PROCESS
        this._openMap = { ...this._openMap, [entry.id]: true };
        this._data = { ...this._data, entries: [...(this._data.entries ?? []), entry] }; // [3] EXECUTE
    }

    /** Flow _dhRemove: id -> entry xoá + saveCustomer() ngay (không debounce, khác _dhEntry). Nếu
     *  entry đang xoá là default, entry đầu còn lại tự thành default mới. */
    _dhRemove(id) {
        const entries = (this._data.entries ?? []).filter(e => e.id !== id); // [2] PROCESS
        if (entries.length > 0 && !entries.some(e => e.isDefault)) entries[0] = { ...entries[0], isDefault: true }; // [2.a]
        const { [id]: _drop, ...rest } = this._openMap;
        this._openMap = rest;
        const newData = { ...this._data, entries };
        this._data = newData;
        saveCustomer(this.service, newData); // [3] EXECUTE
    }

    /** Flow _dhSetDefault: id -> đúng 1 entry isDefault=true (mọi entry khác false) + saveCustomer(). */
    _dhSetDefault(id) {
        const newData = { // [2] PROCESS
            ...this._data,
            entries: (this._data.entries ?? []).map(e => ({ ...e, isDefault: e.id === id })),
        };
        this._data = newData;
        saveCustomer(this.service, newData); // [3] EXECUTE
    }

    // ── RENDER FRAGMENT ───────────────────────────────────────────────────────

    _rfEntry(entry) {
        const title = [entry.fullName || this._txt.new, entry.phone].filter(Boolean).join(' | ');
        const pid   = entry.id;
        return html`
            <web-expansion
                .panels=${[{ id: pid, label: title }]}
                .active=${this._openMap[pid] ? pid : ''}
                .ui=${this.ui}
                .theme=${this.theme}
                @change=${e => {
                    // Input/select native lồng trong slot cũng bubble "change" tới đây (không
                    // .detail) — chỉ xử lý event thật của <web-expansion> (luôn có .detail.open).
                    if (!e.detail?.open) return;
                    this._openMap = { ...this._openMap, [pid]: e.detail.open.includes(pid) };
                }}
            >
                <div slot=${pid} class="entry-form">
                    <div class="entry-row">
                        <div class="field">
                            <label>${this._txt.nameLabel}</label>
                            <input type="text"
                                .value=${entry.fullName || ''}
                                placeholder="${this._txt.namePh}"
                                @input=${e => this._dhEntry(entry.id, 'fullName', e.target.value)} />
                        </div>
                        <div class="field">
                            <label>${this._txt.phoneLabel}</label>
                            <input type="tel"
                                .value=${entry.phone || ''}
                                placeholder="${this._txt.phonePh}"
                                @input=${e => this._dhEntry(entry.id, 'phone', e.target.value)} />
                        </div>
                    </div>
                    <div class="field">
                        <label>${this._txt.emailLabel} <span class="opt">${this._txt.emailOptional}</span></label>
                        <input type="email"
                            .value=${entry.email || ''}
                            placeholder="${this._txt.emailPh}"
                            @input=${e => this._dhEntry(entry.id, 'email', e.target.value)} />
                    </div>
                    <div class="field">
                        <label>${this._txt.addressLabel}</label>
                        <web-location
                            .ui=${this.ui}
                            .theme=${this.theme}
                            .value=${entry.location || ''}
                            @change=${e => this._dhEntry(entry.id, 'location', e.detail.value)}
                        ></web-location>
                    </div>
                    <div class="entry-footer">
                        ${entry.isDefault
                            ? html`<span class="badge-default">${this._txt.defaultBadge}</span>`
                            : html`<button class="btn-set-default"
                                @click=${() => this._dhSetDefault(entry.id)}>${this._txt.btnSetDefault}</button>`
                        }
                        <button class="btn-remove" @click=${() => this._dhRemove(entry.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14H6L5 6"></path>
                                <path d="M10 11v6M14 11v6"></path>
                                <path d="M9 6V4h6v2"></path>
                            </svg>
                            ${this._txt.btnRemove}
                        </button>
                    </div>
                </div>
            </web-expansion>
        `;
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        const entries = this._data.entries ?? [];
        return html`
            <div class="svc-pay-customer ${this.ui || 'modern'}">

                <div class="entries-header">
                    <span class="entries-title">${this._txt.title}</span>
                    <button class="btn-add" @click=${this._dhAdd}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${this._txt.btnAdd}
                    </button>
                </div>

                <div class="entries-list">
                    ${entries.length === 0
                        ? html`<div class="entries-empty">${this._txt.empty}</div>`
                        : entries.map(e => this._rfEntry(e))
                    }
                </div>

            </div>
        `;
    }
}

if (!customElements.get('svc-pay-customer')) {
    customElements.define('svc-pay-customer', SvcPayCustomer);
}

export default SvcPayCustomer;
