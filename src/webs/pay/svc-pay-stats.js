// src/webs/pay/svc-pay-stats.js
//
// Nút tròn "Thống kê" trong bysec-toolbox (svc-bay-sections.js) — hoặc tự nổi fixed qua prop
// position/x/y (vd CoreShop.astro) — cùng khuôn nút tròn + dialog riêng của
// <svc-pay-warden>/<svc-pay-promo type="circle">. Bản viết lại ĐỘC LẬP từ
// webs/bay/svc-bay-stats.js cho domain `pay` (xem docs/PAY.rst §1 — không import gì từ webs/bay),
// KHÁC bản gốc ở 2 điểm bắt buộc vì khác data model:
//   1. Không có "khách ghé thăm" (presence/devices qua P2P mesh — domain pay không có mesh, xem
//      docs/PAY.rst §1 điểm 2) — thay bằng "khách hàng" = số buyer_id duy nhất suy thẳng từ chính
//      invoice đã tải, không cần nguồn dữ liệu nào khác.
//   2. Không có field lưu HÌNH THỨC THANH TOÁN trên invoice (`payment_id` chỉ là mã tham chiếu QR,
//      xem promoteToInvoice() ở tools/service.js — _payMethod không bao giờ được persist) — thay
//      biểu đồ "doanh thu theo hình thức thanh toán" bằng "doanh thu theo hình thức nhận hàng"
//      (meta.fulfillment: 'delivery'|'pickup', LUÔN có mặt trên mọi invoice).
// Chỉ tính trên đơn ĐÃ HOÀN TẤT thật (meta.sub === 'received') — khác bản gốc đếm nguyên
// this._invoices.length dù nhãn ghi "thành công": domain `pay` có state machine huỷ/trả hàng rõ
// ràng (meta.sub 'cancelled'/'returned', xem docs/PAY.rst §3.4/§3.5) nên gộp cả đơn đã huỷ/trả vào
// doanh thu là SAI — lọc _comCompleted trước khi tính bất kỳ KPI/biểu đồ nào.
import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-dialog.js';
import '@/webs/apex/web-fab.js';
import '@/webs/graph/svc-graph.js';
import '@/webs/graph/svc-pie.js';
import css from './styles/svc-pay-stats.css?inline';
import { fmtPrice, txtLingo, watchHtmlAttr } from '@/services/helper.js';
import { loadSellerInvoices, parseInvoiceItems } from './tools/service.js';

const TXT_STD = {
    vi: {
        btnTitle: 'Thống kê', dialogTitle: 'Thống kê bán hàng',
        customers: 'Khách hàng', orders: 'Đơn hàng thành công', revenue: 'Doanh thu',
        avgOrder: 'Giá trị TB/đơn', revenueByFulfillment: 'Doanh thu theo hình thức nhận hàng',
        fulfillmentDelivery: 'Giao hàng', fulfillmentPickup: 'Tự đến lấy',
        topProducts: 'Top sản phẩm bán chạy theo ngày',
        loading: 'Đang tải dữ liệu…', noData: 'Chưa có dữ liệu',
    },
    en: {
        btnTitle: 'Statistics', dialogTitle: 'Sales statistics',
        customers: 'Customers', orders: 'Successful orders', revenue: 'Revenue',
        avgOrder: 'Avg. order value', revenueByFulfillment: 'Revenue by fulfillment',
        fulfillmentDelivery: 'Delivery', fulfillmentPickup: 'Self pickup',
        topProducts: 'Top selling products by day',
        loading: 'Loading data…', noData: 'No data yet',
    },
};

// Cặp màu gradient (đỉnh → đáy) cho từng series area — cùng bảng màu với demo "visits by
// marketing channel" (src/pages/ui/index.astro), lặp lại nếu nhiều sản phẩm hơn 5.
const GRADIENT_PALETTE = [
    ['#2dd4bf', '#0ea5e9'], ['#818cf8', '#7c3aed'], ['#f472b6', '#c026d3'],
    ['#fbbf24', '#f97316'], ['#34d399', '#059669'],
];

export class SvcPayStats extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        sellerId: { type: String },
        txt: { type: Object },
        position: { type: String },
        x: { type: String },
        y: { type: String },
        _show: { state: true },
        _loading: { state: true },
        _invoices: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi';
        this.mainColors = ''; this.textColor = '';
        this.sellerId = ''; this.txt = null;
        this.position = 'static'; // mặc định GIỮ NGUYÊN hành vi cũ — nút nằm INLINE trong toolbox cha, không tự nổi
        this.x = '99%';
        this.y = '1rem';
        this._show = false; this._loading = false;
        this._invoices = [];
    }

    connectedCallback() {
        super.connectedCallback();
        // Tự theo dõi <html lang> (BtnLang.astro) thay vì chỉ nhận đúng 1 lần giá trị tĩnh
        // hardcode lúc mount (CoreShop.astro's lang="vi").
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    /**
     * Flow mở dialog thống kê: click nút -> tải invoices (Firestore, loadSellerInvoices) -> render KPI
     */
    async _dhOpen() {
        this._show = true;
        // [1] CHECK: cần sellerId để load dữ liệu, chưa có thì dừng (dialog vẫn hiện nhưng rỗng)
        if (!this.sellerId) return;
        this._loading = true;
        try {
            // [3] EXECUTE: đọc từ Firestore (xuyên thiết bị) — cùng nguồn <svc-pay-warden role="seller">
            this._invoices = (await loadSellerInvoices(this.sellerId)) ?? [];
        } catch (err) {
            // [3.a] HANDLE_ERR: log lỗi, không throw để dialog không crash — chỉ hiện rỗng
            console.error('[svc-pay-stats] load error:', err);
        } finally {
            this._loading = false;
        }
    }

    _dhClose() { this._show = false; }

    // ── Computed (thuần, tính lại mỗi render — dữ liệu nhỏ, không cần cache) ──────

    // Chỉ đơn ĐÃ HOÀN TẤT thật (buyer xác nhận nhận hàng) mới tính vào thống kê — xem comment đầu file.
    get _comCompleted() { return this._invoices.filter(inv => inv.meta?.sub === 'received'); }

    get _comOrderCount() { return this._comCompleted.length; }

    get _comRevenue() {
        return this._comCompleted.reduce((sum, inv) => sum + (Number((inv.summary || '').split('~')[2]) || 0), 0);
    }

    get _comAvgOrder() {
        return this._comOrderCount > 0 ? Math.round(this._comRevenue / this._comOrderCount) : 0;
    }

    // Số buyer_id duy nhất trong đơn đã hoàn tất — suy thẳng từ invoice, không cần nguồn presence
    // riêng (domain pay không có P2P mesh/devices, xem comment đầu file).
    get _comCustomers() {
        return new Set(this._comCompleted.map(inv => inv.buyer_id).filter(Boolean)).size;
    }

    // [[label, revenue], ...] tổng doanh thu theo hình thức nhận hàng (gộp mọi ngày) — nguồn cho
    // <svc-pie> doughnut. Thay "hình thức thanh toán" ở bản gốc vì invoice không lưu field đó.
    get _comFulfillmentBreakdown() {
        const totals = new Map();
        for (const inv of this._comCompleted) {
            const key = inv.meta?.fulfillment === 'pickup' ? 'pickup' : 'delivery';
            const revenue = Number((inv.summary || '').split('~')[2]) || 0;
            totals.set(key, (totals.get(key) ?? 0) + revenue);
        }
        const labels = { delivery: this._txt.fulfillmentDelivery, pickup: this._txt.fulfillmentPickup };
        return [...totals.entries()].map(([k, v]) => [labels[k] ?? k, v]);
    }

    // [[name, revenue], ...] top 5 giảm dần (gộp mọi ngày) — parseInvoiceItems() (tools/service.js)
    // đã tự giải mã chuỗi pipe `name~price~unit~qty~...` đóng băng lúc promoteToInvoice().
    get _comTopProducts() {
        const totals = new Map();
        for (const inv of this._comCompleted) {
            for (const item of parseInvoiceItems(inv.items)) {
                if (!item.name) continue;
                totals.set(item.name, (totals.get(item.name) ?? 0) + item.price * item.qty);
            }
        }
        return [...totals.entries()].sort(([, a], [, b]) => b - a).slice(0, 5);
    }

    // Doanh thu theo ngày của top 5 sản phẩm (_comTopProducts) — nguồn cho <svc-graph> stacked
    // area. { products: ['ten1','ten2',...], source: [['Ngày','ten1','ten2',...], [day, rev1,...], ...] }
    get _comTopProductsByDay() {
        const topNames = this._comTopProducts.map(([name]) => name);
        const byDay = new Map(); // day -> { name: revenue }
        for (const inv of this._comCompleted) {
            const day = (inv.issued_at || '').slice(0, 10);
            if (!day) continue;
            for (const item of parseInvoiceItems(inv.items)) {
                if (!topNames.includes(item.name)) continue;
                const row = byDay.get(day) ?? {};
                row[item.name] = (row[item.name] ?? 0) + item.price * item.qty;
                byDay.set(day, row);
            }
        }
        const days = [...byDay.keys()].sort();
        const header = ['Ngày', ...topNames];
        const rows = days.map(day => { const row = byDay.get(day) ?? {}; return [day, ...topNames.map(n => row[n] ?? 0)]; });
        return { products: topNames, source: [header, ...rows] };
    }

    // ── Render ────────────────────────────────────────────────────────────────

    render() {
        return html`
            <web-fab icon="ri:bar-chart-2-line" position=${this.position} x=${this.x} y=${this.y} movable=${this.position === 'fixed' ? true : false}
                ui=${this.position === 'fixed' ? 'modern' : this.ui} size="lg" theme=${this.theme} title=${this._txt.btnTitle}
                @clicked=${() => this._dhOpen()}>
            </web-fab>
            <web-dialog ?open=${this._show} title=${this._txt.dialogTitle} lang=${this.lang} maxWidth="900px"
                ui=${this.ui} theme=${this.theme}
                @close=${() => this._dhClose()}>
                ${this._loading ? html`<div class="stat-loading">${this._txt.loading}</div>` : this._rbStats()}
            </web-dialog>
        `;
    }

    _rbStats() {
        return html`
            <div class="stat-wrap">
                <div class="stat-kpi-grid">
                    ${this._rfKpi(this._txt.customers, String(this._comCustomers))}
                    ${this._rfKpi(this._txt.orders, String(this._comOrderCount))}
                    ${this._rfKpi(this._txt.revenue, fmtPrice(this._comRevenue, this.lang))}
                    ${this._rfKpi(this._txt.avgOrder, fmtPrice(this._comAvgOrder, this.lang))}
                </div>
                ${this._comOrderCount === 0 ? html`<p class="stat-empty">${this._txt.noData}</p>` : html`
                    <div class="stat-charts">
                        ${this._rfFulfillmentPie()}
                        ${this._rfTopProductsGraph()}
                    </div>
                `}
            </div>
        `;
    }

    // Doughnut (padAngle + rounded corners) — cùng kiểu với demo "doughnut" (src/pages/ui/index.astro).
    _rfFulfillmentPie() {
        return html`
            <svc-pie ui=${this.ui} theme=${this.theme} .mainColors=${this.mainColors}
                title=${this._txt.revenueByFulfillment} height="320px"
                .option=${{
                    dataset: { source: [['Hình thức nhận hàng', this._txt.revenue], ...this._comFulfillmentBreakdown] },
                    tooltip: { trigger: 'item' },
                    series: [{ type: 'pie', radius: ['40%', '70%'], padAngle: 5, itemStyle: { borderRadius: 10 } }],
                }}
            ></svc-pie>
        `;
    }

    // Stacked smooth area (gradient fill) + nhãn tại mỗi điểm — 1 series/sản phẩm (top 5),
    // cùng kiểu với demo "visits by marketing channel" (src/pages/ui/index.astro).
    _rfTopProductsGraph() {
        const { products, source } = this._comTopProductsByDay;
        const series = products.map((name, i) => {
            const [c1, c2] = GRADIENT_PALETTE[i % GRADIENT_PALETTE.length];
            return {
                name, type: 'bar', stack: 'total', smooth: true, symbol: 'circle',
                label: { show: true, formatter: p => fmtPrice(p.value, this.lang) },
                areaStyle: {
                    opacity: 1,
                    color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] },
                },
            };
        });
        const chartColors = products.map((_, i) => GRADIENT_PALETTE[i % GRADIENT_PALETTE.length][0]).join('|');
        return html`
            <svc-graph ui=${this.ui} theme=${this.theme} main-colors=${chartColors}
                title=${this._txt.topProducts} height="320px" table
                .option=${{
                    tooltip: { trigger: 'axis' },
                    dataset: { source },
                    xAxis: { type: 'category' }, yAxis: { type: 'value' },
                    series,
                }}
            ></svc-graph>
        `;
    }

    _rfKpi(label, value) {
        return html`
            <div class="stat-kpi-card">
                <div class="stat-kpi-label">${label}</div>
                <div class="stat-kpi-value">${value}</div>
            </div>
        `;
    }
}

if (!customElements.get('svc-pay-stats')) customElements.define('svc-pay-stats', SvcPayStats);
