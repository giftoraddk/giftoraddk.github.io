// src/webs/llm/svc-finance-report.js
//
// <svc-finance-report> — "Dashboard Phân Tích Doanh Thu Sản Phẩm" cho /admin/report. Cloned
// from division/svc-finance-report.js (domain-isolation clone) — logic 100% unchanged; file này
// KHÔNG chạm gì tới `divisions`/`talks` (không có pipeline AI/chuyên môn nào ở đây), chỉ đọc thẳng
// `invoices` (Firestore, cùng collection với domain `pay` — xem hook/PAY.rst §3.3) + `products`
// (giá vốn/danh mục) — cả 2 vẫn GIỮ NGUYÊN Firestore DB_ALL, không có gì để chuyển sang D1. Business
// logic thuần tách hẳn ra tools/revenue-helper.js (đọc file đó cho GIỚI HẠN DỮ LIỆU THẬT).
//
// KHÁC llm/tools/finance-helper.js (dùng bởi llm/svc-talk.js's division 'finance' — dòng tiền/công
// nợ/rủi ro cấp INVOICE) — file đó giữ nguyên, không đụng vào. Dashboard này tính lại ở cấp SẢN PHẨM.
import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/graph/svc-graph.js';
import '@/webs/apex/web-select.js';
import '@/webs/apex/web-datetime.js';
import css from './styles/svc-finance-report.css?inline';
import { txtLingo, watchHtmlAttr } from '@/services/helper.js';
import { createService } from '@/services/crud.js';
import {
    buildRows, filterData, calculateDashboard, calculateGrowth, previousPeriod,
    aggregateMonthly, monthLabel, getTopProducts, aggregateByProduct, buildFilterOptions,
    fmtMoney, convertCurrency, fmtCompactDisplay, lastMonthRange,
} from './tools/revenue-helper.js';

const TXT_STD = {
    vi: {
        loading: 'Đang tải dữ liệu…',
        errorLoad: 'Không thể tải dữ liệu',
        emptyRange: 'Không có dữ liệu trong khoảng thời gian đã chọn',
        noProduct: 'Không có sản phẩm phù hợp',
        filterTime: 'Thời gian', filterCategory: 'Danh mục', filterProduct: 'Sản phẩm',
        allCategories: 'Tất cả danh mục', allProducts: 'Tất cả sản phẩm',
        filterCurrency: 'Đơn vị tiền tệ', currencyVnd: 'VND (₫)', currencyUsd: 'USD ($)',
        totalRevenue: 'Tổng doanh thu', totalProfit: 'Tổng lợi nhuận',
        margin: 'Biên lợi nhuận', totalUnits: 'Tổng sản phẩm đã bán',
        vsPrev: 'so với kỳ trước',
        monthlyChartTitle: 'Doanh thu & Lợi nhuận theo tháng', month: 'Tháng', revenue: 'Doanh thu', profit: 'Lợi nhuận',
        topProductsTitle: 'Top 10 sản phẩm bán chạy nhất',
        byProductChartTitle: 'Doanh thu theo sản phẩm', product: 'Sản phẩm',
        detailTableTitle: 'Chi tiết doanh thu theo sản phẩm',
        colProduct: 'Sản phẩm', colUnits: 'Số lượng bán', colRevenue: 'Doanh thu',
        colCost: 'Chi phí', colProfit: 'Lợi nhuận', colMargin: 'Margin', total: 'Tổng cộng',
    },
    en: {
        loading: 'Loading data…',
        errorLoad: 'Failed to load data',
        emptyRange: 'No data in the selected time range',
        noProduct: 'No matching product',
        filterTime: 'Time range', filterCategory: 'Category', filterProduct: 'Product',
        allCategories: 'All categories', allProducts: 'All products',
        filterCurrency: 'Currency', currencyVnd: 'VND (₫)', currencyUsd: 'USD ($)',
        totalRevenue: 'Total revenue', totalProfit: 'Total profit',
        margin: 'Profit margin', totalUnits: 'Total units sold',
        vsPrev: 'vs. previous period',
        monthlyChartTitle: 'Revenue & Profit by month', month: 'Month', revenue: 'Revenue', profit: 'Profit',
        topProductsTitle: 'Top 10 best-selling products',
        byProductChartTitle: 'Revenue by product', product: 'Product',
        detailTableTitle: 'Product revenue detail',
        colProduct: 'Product', colUnits: 'Units sold', colRevenue: 'Revenue',
        colCost: 'Cost', colProfit: 'Profit', colMargin: 'Margin', total: 'Total',
    },
};

export class SvcFinanceReport extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String }, txt: { type: Object },

        _loading: { state: true },
        _error: { state: true },
        _rows: { state: true }, // toàn bộ dòng sản phẩm đã build (chưa lọc filter)
        _startDate: { state: true }, _endDate: { state: true },
        _category: { state: true }, _product: { state: true },
        _currency: { state: true }, // 'vi' = VND (gốc), 'en' = quy đổi + hiển thị USD — xem tools/revenue-helper.js
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.mainColors = ''; this.textColor = '';
        this.lang = 'vi'; this.txt = null;
        this._loading = true;
        this._error = '';
        this._rows = [];
        this._startDate = ''; this._endDate = '';
        this._category = 'all'; this._product = 'all';
        this._currency = 'vi';
    }

    connectedCallback() {
        super.connectedCallback();
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' });
        this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
    }

    async _dcLoad() {
        this._loading = true;
        this._error = '';
        try {
            const [invoices, products] = await Promise.all([
                createService('invoices').findAll(),
                createService('products').findAll(),
            ]);
            this._rows = buildRows(invoices ?? [], products ?? []);
            // Mặc định: trọn 1 tháng dương lịch liền trước tháng hiện tại (xem lastMonthRange) — bất
            // kể dữ liệu thật có phủ hết khoảng đó hay không (rỗng thì rơi vào empty-state có sẵn).
            const { startDate, endDate } = lastMonthRange();
            this._startDate = startDate;
            this._endDate = endDate;
        } catch (err) {
            console.error('[svc-finance-report] failed to load data:', err.message);
            this._error = err.message || String(err);
        }
        this._loading = false;
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhStartDate(e) { this._startDate = e.detail.value; }
    _dhEndDate(e) { this._endDate = e.detail.value; }
    // Đổi danh mục -> reset sản phẩm về 'all', tránh giữ 1 sản phẩm không còn thuộc danh mục mới.
    _dhCategory(e) { this._category = e.detail.value; this._product = 'all'; }
    _dhProduct(e) { this._product = e.detail.value; }
    _dhCurrency(e) { this._currency = e.detail.value; }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    get _comFilters() {
        return { startDate: this._startDate, endDate: this._endDate, category: this._category, product: this._product };
    }
    get _comFilteredRows() { return filterData(this._rows, this._comFilters); }
    get _comDashboard() { return calculateDashboard(this._comFilteredRows); }

    // "So với kỳ trước" — cùng category/product, khoảng ngày liền trước cùng độ dài.
    get _comPrevDashboard() {
        const prev = previousPeriod(this._startDate, this._endDate);
        const rows = filterData(this._rows, { ...this._comFilters, ...prev });
        return calculateDashboard(rows);
    }

    get _comMonthly() { return aggregateMonthly(this._comFilteredRows); }
    get _comTopProducts() { return getTopProducts(this._comFilteredRows, 10, 'quantity'); }
    get _comByProduct() { return aggregateByProduct(this._comFilteredRows); }
    get _comFilterOptions() { return buildFilterOptions(this._rows, this._category); }

    _comLocaleNumber(n) { return Number(n || 0).toLocaleString(this.lang === 'en' ? 'en-US' : 'vi-VN'); }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (this._loading) return this._rbSkeleton();
        if (this._error) return html`<div class="rpt-error">${this._txt.errorLoad}</div>`;
        return html`
            <div class="rpt-wrap">
                ${this._rbFilters()}
                ${this._rbKpis()}
                ${!this._comFilteredRows.length ? html`<div class="rpt-empty">${this._txt.emptyRange}</div>` : html`
                    <div class="rpt-analytics-grid">
                        ${this._rbMonthlyChart()}
                        ${this._rbTopProducts()}
                    </div>
                    <div class="rpt-analytics-grid">
                        ${this._rbProductChart()}
                        ${this._rbDetailTable()}
                    </div>
                `}
            </div>
        `;
    }

    _rbSkeleton() {
        const spatial = this.ui === 'spatial' ? 'spatial' : '';
        return html`
            <div class="rpt-wrap">
                <div class="rpt-skel ${spatial} rpt-skel-filters"></div>
                <div class="rpt-kpi-grid">
                    ${[0, 1, 2, 3].map(() => html`<div class="rpt-skel ${spatial} rpt-skel-kpi"></div>`)}
                </div>
                <div class="rpt-analytics-grid">
                    <div class="rpt-skel ${spatial} rpt-skel-chart"></div>
                    <div class="rpt-skel ${spatial} rpt-skel-chart"></div>
                </div>
            </div>
        `;
    }

    _rbFilters() {
        const t = this._txt;
        const { categories, products } = this._comFilterOptions;
        const categoryOptions = [{ label: t.allCategories, value: 'all' }, ...categories.map((c) => ({ label: c, value: c }))];
        const productOptions = [{ label: t.allProducts, value: 'all' }, ...products.map((p) => ({ label: p, value: p }))];
        return html`
            <div class="rpt-filters">
                <div class="rpt-filter-field">
                    <span class="rpt-filter-label">${t.filterTime}</span>
                    <div class="rpt-filter-range">
                        <web-datetime .value=${this._startDate} dateMax=${this._endDate} height="36px" ui=${this.ui} theme=${this.theme}
                            @change=${(e) => this._dhStartDate(e)}></web-datetime>
                        <span class="rpt-filter-sep">–</span>
                        <web-datetime .value=${this._endDate} dateMin=${this._startDate} height="36px" ui=${this.ui} theme=${this.theme}
                            @change=${(e) => this._dhEndDate(e)}></web-datetime>
                    </div>
                </div>
                <div class="rpt-filter-field">
                    <span class="rpt-filter-label">${t.filterCategory}</span>
                    <web-select .options=${categoryOptions} .value=${this._category} height="36px" ui=${this.ui} theme=${this.theme}
                        @change=${(e) => this._dhCategory(e)}></web-select>
                </div>
                <div class="rpt-filter-field">
                    <span class="rpt-filter-label">${t.filterProduct}</span>
                    <web-select .options=${productOptions} .value=${this._product} height="36px" searchable ui=${this.ui} theme=${this.theme}
                        @change=${(e) => this._dhProduct(e)}></web-select>
                </div>
                <div class="rpt-filter-field">
                    <span class="rpt-filter-label">${t.filterCurrency}</span>
                    <web-select .options=${[{ label: t.currencyVnd, value: 'vi' }, { label: t.currencyUsd, value: 'en' }]}
                        .value=${this._currency} height="36px" ui=${this.ui} theme=${this.theme}
                        @change=${(e) => this._dhCurrency(e)}></web-select>
                </div>
            </div>
        `;
    }

    _rfGrowth(growth) {
        const positive = growth >= 0;
        return html`<span class="rpt-growth ${positive ? 'up' : 'down'}">${positive ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)}%</span>`;
    }

    _rfKpi(label, value, growth) {
        return html`
            <div class="rpt-kpi-card">
                <div class="rpt-kpi-label">${label}</div>
                <div class="rpt-kpi-value">${value}</div>
                ${growth != null ? html`<div class="rpt-kpi-sub">${this._rfGrowth(growth)} <span class="rpt-kpi-sub-text">${this._txt.vsPrev}</span></div>` : ''}
            </div>
        `;
    }

    _rbKpis() {
        const t = this._txt;
        const d = this._comDashboard;
        const p = this._comPrevDashboard;
        return html`
            <div class="rpt-kpi-grid">
                ${this._rfKpi(t.totalRevenue, fmtMoney(d.revenue, this._currency), calculateGrowth(d.revenue, p.revenue))}
                ${this._rfKpi(t.totalProfit, fmtMoney(d.profit, this._currency), calculateGrowth(d.profit, p.profit))}
                ${this._rfKpi(t.margin, `${d.margin.toFixed(1)}%`, d.margin - p.margin)}
                ${this._rfKpi(t.totalUnits, this._comLocaleNumber(d.units), calculateGrowth(d.units, p.units))}
            </div>
        `;
    }

    _rbMonthlyChart() {
        const t = this._txt;
        const currency = this._currency;
        // Quy đổi NGAY khi build dataset (không phải trong formatter) — <svc-graph>'s bảng dữ liệu
        // nội bộ (tools/base.js's _rbTable) đọc thẳng dataset.source, không đi qua formatter nào của
        // component cha, nên nếu để giá trị gốc VND trong source thì bảng đó luôn hiện VND bất kể
        // currency đang chọn (đây chính là bug đã gặp — trục/tooltip đổi nhưng bảng thì không).
        const source = [[t.month, t.revenue, t.profit], ...this._comMonthly.map((m) => [
            monthLabel(m.month, this.lang), convertCurrency(m.revenue, currency), convertCurrency(m.profit, currency),
        ])];
        return html`
            <svc-graph ui=${this.ui} theme=${this.theme} .mainColors=${this.mainColors}
                title=${t.monthlyChartTitle} height="320px" table
                .option=${{
                    tooltip: { trigger: 'axis', valueFormatter: (v) => fmtCompactDisplay(v, currency) },
                    dataset: { source },
                    xAxis: { type: 'category' },
                    yAxis: { type: 'value', axisLabel: { formatter: (v) => fmtCompactDisplay(v, currency) } },
                    series: [
                        { type: 'line', smooth: true, areaStyle: {} },
                        { type: 'line', smooth: true, areaStyle: {} },
                    ],
                }}
            ></svc-graph>
        `;
    }

    _rbTopProducts() {
        const t = this._txt;
        const top = this._comTopProducts;
        const maxQty = Math.max(1, ...top.map((p) => p.quantity));
        return html`
            <div class="rpt-panel ${this.ui === 'spatial' ? 'spatial' : ''}">
                <div class="rpt-panel-title">${t.topProductsTitle}</div>
                ${!top.length ? html`<div class="rpt-empty-inline">${t.noProduct}</div>` : html`
                    <div class="rpt-top-table">
                        ${top.map((p, i) => html`
                            <div class="rpt-top-row">
                                <span class="rpt-rank ${i === 0 ? 'first' : ''}">${i + 1}</span>
                                <span class="rpt-top-name">${p.productName}</span>
                                <div class="rpt-top-bar-wrap">
                                    <div class="rpt-top-bar-track"><div class="rpt-top-bar-fill" style="width:${(p.quantity / maxQty) * 100}%"></div></div>
                                    <span class="rpt-top-qty">${this._comLocaleNumber(p.quantity)}</span>
                                </div>
                                <span class="rpt-top-revenue">${fmtMoney(p.revenue, this._currency)}</span>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        `;
    }

    _rbProductChart() {
        const t = this._txt;
        const currency = this._currency;
        const source = [[t.product, t.revenue], ...this._comByProduct.map((p) => [p.productName, convertCurrency(p.revenue, currency)])];
        return html`
            <svc-graph ui=${this.ui} theme=${this.theme} .mainColors=${this.mainColors}
                title=${t.byProductChartTitle} height="320px" table
                .option=${{
                    tooltip: { trigger: 'axis', valueFormatter: (v) => fmtCompactDisplay(v, currency) },
                    dataset: { source },
                    xAxis: { type: 'category', axisLabel: { interval: 0, rotate: 20 } },
                    yAxis: { type: 'value', axisLabel: { formatter: (v) => fmtCompactDisplay(v, currency) } },
                    series: [{ type: 'bar', label: { show: true, position: 'top', formatter: (p) => fmtCompactDisplay(p.value[1], currency) } }],
                }}
            ></svc-graph>
        `;
    }

    _rbDetailTable() {
        const t = this._txt;
        const byProduct = this._comByProduct;
        const totals = this._comDashboard;
        return html`
            <div class="rpt-panel ${this.ui === 'spatial' ? 'spatial' : ''}">
                <div class="rpt-panel-title">${t.detailTableTitle}</div>
                ${!byProduct.length ? html`<div class="rpt-empty-inline">${t.noProduct}</div>` : html`
                    <div class="rpt-table-wrap">
                        <table class="rpt-detail-table">
                            <thead>
                                <tr>
                                    <th>${t.colProduct}</th><th>${t.colUnits}</th><th>${t.colRevenue}</th>
                                    <th>${t.colCost}</th><th>${t.colProfit}</th><th>${t.colMargin}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${byProduct.map((p) => html`
                                    <tr>
                                        <td>${p.productName}</td>
                                        <td>${this._comLocaleNumber(p.quantity)}</td>
                                        <td>${fmtMoney(p.revenue, this._currency)}</td>
                                        <td>${fmtMoney(p.cost, this._currency)}</td>
                                        <td>${fmtMoney(p.profit, this._currency)}</td>
                                        <td><span class="rpt-margin-badge">${p.margin.toFixed(1)}%</span></td>
                                    </tr>
                                `)}
                            </tbody>
                            <tfoot>
                                <tr class="rpt-total-row">
                                    <td>${t.total}</td>
                                    <td>${this._comLocaleNumber(totals.units)}</td>
                                    <td>${fmtMoney(totals.revenue, this._currency)}</td>
                                    <td>${fmtMoney(totals.cost, this._currency)}</td>
                                    <td>${fmtMoney(totals.profit, this._currency)}</td>
                                    <td>${totals.margin.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `}
            </div>
        `;
    }
}

// Tag name 'svc-finance-report', NOT 'svc-finance-report' — avoids a global Custom Elements
// registry collision with division/svc-finance-report.js (same rationale as svc-talk).
if (!customElements.get('svc-finance-report')) customElements.define('svc-finance-report', SvcFinanceReport);
export default SvcFinanceReport;
