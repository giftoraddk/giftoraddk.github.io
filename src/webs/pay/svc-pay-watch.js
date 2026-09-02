import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-button.js';
import '@/webs/pay/svc-pay-watch-paper.js';
import '@/webs/pay/svc-pay.js';
import css from './styles/svc-pay-watch.css?inline';
import { txtLingo } from '@/services/helper.js';

const TXT_STD = {
    vi: {
        title: 'Tra cứu đơn hàng',
        placeholder: 'Nhập mã đơn hàng...',
        submit: 'Tra cứu',
        empty: 'Nhập mã đơn hàng (hoặc quét mã QR từ màn hình xác nhận thanh toán) để xem chi tiết.',
    },
    en: {
        title: 'Track your order',
        placeholder: 'Enter your order code...',
        submit: 'Look up',
        empty: 'Enter your order code (or scan the QR from the payment confirmation screen) to see details.',
    },
};

/**
 * <svc-pay-watch> — page-level standalone (src/pages/channel/invoice.astro): input mã invoice_id
 * ở trên (tự điền từ query `?id=` nếu đến từ QR/nút "mã đơn" ở svc-pay.js, hoặc từ
 * svc-pay-warden.js's nút "Mở ở tab mới", xem tools/service.js's buildInvoiceUrl()) rồi mount
 * <svc-pay-watch-paper invoiceId=...> (bản xem lại kiểu hoá đơn giấy, chỉ đọc) NGAY TRÊN
 * <svc-pay invoiceId=...> (panel thao tác đầy đủ) để xem/thao tác — không cần đăng nhập/bay nào,
 * chỉ cần đúng mã. Vai trò lấy từ query `?sellerId=` — có id đó thì mở giao diện seller, KHÔNG có
 * (link của buyer) thì mặc định buyer. `?bayId=` (chỉ kèm theo link của seller) forward thẳng cho
 * <svc-pay bayId=...> — trang này tự nó KHÔNG có bay context nào (đứng riêng, không qua
 * svc-bay-sections.js) nên seller cần bayId gắn theo link mới tương tác đúng như đang mở từ chính
 * kênh/bay đó. Domain `pay` vẫn độc lập — page này chỉ dùng component của chính domain, không
 * import gì từ domain khác.
 */
export class SvcPayLookup extends LitElement {
    static styles = [unsafeCSS(css)];

    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String }, txt: { type: Object },

        _input:      { state: true },
        _lookedUpId: { state: true },
        _sellerId:   { state: true },
        _bayId:      { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.txt = null;

        this._input = '';
        this._lookedUpId = '';
        this._sellerId = '';
        this._bayId = '';
    }

    connectedCallback() {
        super.connectedCallback();
        const query = new URLSearchParams(window.location.search);
        const fromUrl = query.get('id');
        if (fromUrl) { this._input = fromUrl; this._lookedUpId = fromUrl; }
        this._sellerId = query.get('sellerId') ?? '';
        this._bayId = query.get('bayId') ?? '';
    }

    get _comRole() { return this._sellerId ? 'seller' : 'buyer'; }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    _dhSubmit(e) {
        e?.preventDefault?.();
        const id = this._input.trim();
        if (!id) return;
        this._lookedUpId = id;
    }

    render() {
        return html`
            <div class="lookup-root">
                <h1 class="lookup-title">${this._txt.title}</h1>
                <form class="lookup-form" @submit=${e => this._dhSubmit(e)}>
                    <input type="text" placeholder=${this._txt.placeholder}
                        .value=${this._input}
                        @input=${e => { this._input = e.target.value; }} />
                    <web-button type="fill" color="primary" height="40px"
                        ui=${this.ui} theme=${this.theme}
                        @clicked=${() => this._dhSubmit()}>${this._txt.submit}</web-button>
                </form>

                ${this._lookedUpId ? html`
                    <div class="lookup-result">
                        <svc-pay role=${this._comRole} invoiceId=${this._lookedUpId} sellerId=${this._sellerId} bayId=${this._bayId}
                            ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                            lang=${this.lang}>
                        </svc-pay>
                        <svc-pay-watch-paper invoiceId=${this._lookedUpId} ui=${this.ui} theme=${this.theme} lang=${this.lang}>
                        </svc-pay-watch-paper>
                    </div>
                ` : html`
                    <p class="lookup-empty">
                        <iconify-icon icon="ri:receipt-line" width="28px"></iconify-icon>
                        ${this._txt.empty}
                    </p>`}
            </div>
        `;
    }
}

if (!customElements.get('svc-pay-watch')) customElements.define('svc-pay-watch', SvcPayLookup);

export default SvcPayLookup;
