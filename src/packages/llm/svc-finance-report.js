// src/packages/llm/svc-finance-report.js
//
// <svc-finance-report> — "Dashboard Phân Tích Doanh Thu Sản Phẩm" cho /admin/report. Ported from
// astro-micro's src/webs/llm/svc-finance-report.js (Event Bus Global port) — logic 100% unchanged;
// file này KHÔNG chạm gì tới `divisions`/`talks` (không có pipeline AI/chuyên môn nào ở đây), chỉ
// đọc `invoices` + `products` (giá vốn/danh mục). Business logic thuần tách hẳn ra
// tool/revenue-helper.js (đọc file đó cho GIỚI HẠN DỮ LIỆU THẬT) — KHÔNG đổi, chỉ phần fetch đổi.
//
// KHÁC tool/finance-helper.js (dùng bởi service/talk.js's division 'finance' — dòng tiền/công nợ/rủi
// ro cấp INVOICE) — file đó giữ nguyên, không đụng vào. Dashboard này tính lại ở cấp SẢN PHẨM.
//
// Đọc `invoices`/`products` qua crud.js — bảng nội dung app ở auth (xem tool/server.js).
//
// 2 chart (`_rbMonthlyChart`/`_rbProductChart`) render qua `<svc-graph>` (ECharts wrapper, packages/adopted).
//
// Giao diện mobile first, responsive theo CHÍNH độ rộng của component (container query — nó chạy trong panel
// svc-node hẹp lẫn trang /admin/report rộng, viewport không nói lên gì): KPI 2×2 → 4 cột, chart/top xếp dọc →
// 2 cột, bảng chi tiết dạng thẻ → dạng bảng, chart doanh thu theo sản phẩm cột dọc → thanh ngang khi hẹp.
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/packages/adopted/svc-graph.js';
import '@/packages/apex/web-select.js';
import '@/packages/apex/web-datetime.js';
import css from './css/svc-finance-report.css?inline';
import { createService } from '@/services/core/crud.js';
import { txtLingo, watchHtmlAttr } from '@/services/tools/util.js';
import { serverOf } from './tool/server.js';
import {
    buildRows, filterData, calculateDashboard, calculateGrowth, previousPeriod,
    aggregateMonthly, monthLabel, getTopProducts, aggregateByProduct, buildFilterOptions,
    fmtMoney, convertCurrency, fmtCompactDisplay, lastMonthRange,
} from './tool/revenue-helper.js';

const invoiceSvc = createService('invoices', '', serverOf('invoices'));
const productSvc = createService('products', '', serverOf('products'));

const NARROW_PX = 560; // component width under which the product chart turns into horizontal bars

const TXT_STD = {
    vi: {
        loading: 'Đang tải dữ liệu…',
        errorLoad: 'Không thể tải dữ liệu', retry: 'Thử lại', overview: 'Tổng quan',
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
        errorLoad: 'Failed to load data', retry: 'Retry', overview: 'Overview',
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
        // Filter-field ui. 'modern' (opaque) by default; 'pastel' fields are a translucent base (no backdrop-filter)
        // tinted on hover/focus — same knob as svc-list's fieldUi.
        fieldUi: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String }, txt: { type: Object },

        _loading: { state: true },
        _error: { state: true },
        _rows: { state: true }, // toàn bộ dòng sản phẩm đã build (chưa lọc filter)
        _startDate: { state: true }, _endDate: { state: true },
        _category: { state: true }, _product: { state: true },
        _currency: { state: true }, // 'vi' = VND (gốc), 'en' = quy đổi + hiển thị USD — xem tool/revenue-helper.js
        _narrow: { state: true }, // component < NARROW_PX wide (ResizeObserver) — chart layout only, CSS does the rest
    };

    constructor() {
        super();
        this.ui = 'modern'; this.fieldUi = 'modern'; this.theme = ''; this.mainColors = ''; this.textColor = '';
        this.lang = 'vi'; this.txt = null;
        this._loading = true;
        this._error = '';
        this._rows = [];
        this._startDate = ''; this._endDate = '';
        this._category = 'all'; this._product = 'all';
        this._currency = 'vi';
        this._narrow = true; // mobile first until measured
        this._resizeObs = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' });
        this._resizeObs = new ResizeObserver(([entry]) => {
            const narrow = entry.contentRect.width < NARROW_PX;
            if (narrow !== this._narrow) this._narrow = narrow;
        });
        this._resizeObs.observe(this);
        this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
        this._resizeObs?.disconnect();
        this._resizeObs = null;
    }

    async _dcLoad() {
        this._loading = true;
        this._error = '';
        try {
            const [invoices, products] = await Promise.all([invoiceSvc.findAll(), productSvc.findAll()]);
            this._rows = buildRows(invoices, products);
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
    _dhCurrency(currency) { this._currency = currency; }

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
        const t = this._txt;
        if (this._loading) return this._rbSkeleton();
        if (this._error) return html`
            <div class="rpt">
                <div class="rpt-state is-error" role="alert">
                    <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                    <span>${t.errorLoad}</span>
                    <button type="button" class="rpt-btn" @click=${() => this._dcLoad()}>${t.retry}</button>
                </div>
            </div>`;
        return html`
            <div class="rpt">
                ${this._rbFilters()}
                <div class="rpt-section">
                    <h3 class="rpt-h">${t.overview}</h3>
                    ${this._rbCurrency()}
                </div>
                ${this._rbKpis()}
                ${!this._comFilteredRows.length ? html`
                    <div class="rpt-state">
                        <iconify-icon icon="ri:calendar-close-line"></iconify-icon>
                        <span>${t.emptyRange}</span>
                    </div>` : html`
                    <div class="rpt-grid">
                        ${this._rbMonthlyChart()}
                        ${this._rbTopProducts()}
                        ${this._rbProductChart()}
                        ${this._rbDetailTable()}
                    </div>
                `}
            </div>
        `;
    }

    _rbSkeleton() {
        return html`
            <div class="rpt" aria-busy="true" aria-label=${this._txt.loading}>
                <div class="rpt-skel rpt-skel-filters"></div>
                <div class="rpt-kpis">${[0, 1, 2, 3].map(() => html`<div class="rpt-skel rpt-skel-kpi"></div>`)}</div>
                <div class="rpt-grid">
                    <div class="rpt-skel rpt-skel-chart"></div>
                    <div class="rpt-skel rpt-skel-chart"></div>
                </div>
            </div>
        `;
    }

    _rbFilters() {
        const t = this._txt, ui = this.fieldUi || 'modern', h = '40px';
        const { categories, products } = this._comFilterOptions;
        const categoryOptions = [{ label: t.allCategories, value: 'all' }, ...categories.map((c) => ({ label: c, value: c }))];
        const productOptions = [{ label: t.allProducts, value: 'all' }, ...products.map((p) => ({ label: p, value: p }))];
        return html`
            <div class="rpt-filters">
                <div class="rpt-field rpt-field-time">
                    <span class="rpt-label"><iconify-icon icon="ri:calendar-2-line"></iconify-icon>${t.filterTime}</span>
                    <div class="rpt-range">
                        <web-datetime .value=${this._startDate} dateMax=${this._endDate} height=${h} ui=${ui} theme=${this.theme}
                            @change=${(e) => this._dhStartDate(e)}></web-datetime>
                        <iconify-icon class="rpt-range-sep" icon="ri:arrow-right-line"></iconify-icon>
                        <web-datetime .value=${this._endDate} dateMin=${this._startDate} height=${h} ui=${ui} theme=${this.theme}
                            @change=${(e) => this._dhEndDate(e)}></web-datetime>
                    </div>
                </div>
                <div class="rpt-field">
                    <span class="rpt-label"><iconify-icon icon="ri:folder-3-line"></iconify-icon>${t.filterCategory}</span>
                    <web-select .options=${categoryOptions} .value=${this._category} height=${h} ui=${ui} theme=${this.theme}
                        @change=${(e) => this._dhCategory(e)}></web-select>
                </div>
                <div class="rpt-field">
                    <span class="rpt-label"><iconify-icon icon="ri:shopping-bag-3-line"></iconify-icon>${t.filterProduct}</span>
                    <web-select .options=${productOptions} .value=${this._product} height=${h} searchable ui=${ui} theme=${this.theme}
                        @change=${(e) => this._dhProduct(e)}></web-select>
                </div>
            </div>
        `;
    }

    // VND / USD — a segmented switch next to the figures it changes (one tap instead of a dropdown)
    _rbCurrency() {
        const t = this._txt;
        return html`
            <div class="rpt-seg" role="radiogroup" aria-label=${t.filterCurrency}>
                ${[['vi', t.currencyVnd], ['en', t.currencyUsd]].map(([value, label]) => html`
                    <button type="button" role="radio" class=${this._currency === value ? 'is-on' : ''}
                        aria-checked=${this._currency === value ? 'true' : 'false'} @click=${() => this._dhCurrency(value)}>${label}</button>`)}
            </div>
        `;
    }

    _rfGrowth(growth) {
        const up = growth >= 0;
        return html`
            <span class="rpt-growth ${up ? 'is-up' : 'is-down'}">
                <iconify-icon icon=${up ? 'ri:arrow-right-up-line' : 'ri:arrow-right-down-line'}></iconify-icon>${Math.abs(growth).toFixed(1)}%
            </span>`;
    }

    _rfKpi(icon, label, value, growth) {
        return html`
            <div class="rpt-kpi">
                <div class="rpt-kpi-head">
                    <span class="rpt-kpi-icon"><iconify-icon icon=${icon}></iconify-icon></span>
                    <span class="rpt-kpi-label">${label}</span>
                </div>
                <div class="rpt-kpi-value">${value}</div>
                ${growth != null ? html`<div class="rpt-kpi-sub">${this._rfGrowth(growth)}<span>${this._txt.vsPrev}</span></div>` : nothing}
            </div>
        `;
    }

    _rbKpis() {
        const t = this._txt, cur = this._currency;
        const d = this._comDashboard;
        const p = this._comPrevDashboard;
        return html`
            <div class="rpt-kpis">
                ${this._rfKpi('ri:money-dollar-circle-line', t.totalRevenue, fmtMoney(d.revenue, cur), calculateGrowth(d.revenue, p.revenue))}
                ${this._rfKpi('ri:line-chart-line', t.totalProfit, fmtMoney(d.profit, cur), calculateGrowth(d.profit, p.profit))}
                ${this._rfKpi('ri:percent-line', t.margin, `${d.margin.toFixed(1)}%`, d.margin - p.margin)}
                ${this._rfKpi('ri:shopping-cart-2-line', t.totalUnits, this._comLocaleNumber(d.units), calculateGrowth(d.units, p.units))}
            </div>
        `;
    }

    // Compact plot area — ECharts' default grid leaves ~10% margins, a lot on a phone
    get _comGrid() { return { left: 4, right: 12, top: 28, bottom: 4, containLabel: true }; }

    _rbMonthlyChart() {
        const t = this._txt;
        const currency = this._currency;
        // Quy đổi NGAY khi build dataset (không phải trong formatter) — <svc-graph>'s bảng dữ liệu
        // nội bộ đọc thẳng dataset.source, không đi qua formatter nào của component cha, nên nếu để
        // giá trị gốc VND trong source thì bảng đó luôn hiện VND bất kể currency đang chọn.
        const source = [[t.month, t.revenue, t.profit], ...this._comMonthly.map((m) => [
            monthLabel(m.month, this.lang), convertCurrency(m.revenue, currency), convertCurrency(m.profit, currency),
        ])];
        return html`
            <svc-graph class="rpt-chart" ui=${this.ui} theme=${this.theme} .mainColors=${this.mainColors}
                title=${t.monthlyChartTitle} height=${this._narrow ? '260px' : '320px'} table
                .option=${{
                    tooltip: { trigger: 'axis', valueFormatter: (v) => fmtCompactDisplay(v, currency) },
                    grid: this._comGrid,
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
            <section class="rpt-panel">
                <h3 class="rpt-panel-title">${t.topProductsTitle}</h3>
                ${!top.length ? html`<div class="rpt-empty">${t.noProduct}</div>` : html`
                    <ol class="rpt-top">
                        ${top.map((p, i) => html`
                            <li class="rpt-top-row">
                                <span class="rpt-rank ${i < 3 ? 'is-podium' : ''}">${i + 1}</span>
                                <span class="rpt-top-name" title=${p.productName}>${p.productName}</span>
                                <span class="rpt-top-rev">${fmtMoney(p.revenue, this._currency)}</span>
                                <span class="rpt-top-bar"><span style="width:${(p.quantity / maxQty) * 100}%"></span></span>
                                <span class="rpt-top-qty">${this._comLocaleNumber(p.quantity)}</span>
                            </li>
                        `)}
                    </ol>
                `}
            </section>
        `;
    }

    // Wide: vertical bars under rotated names. Narrow: horizontal bars, one row per product — names stay
    // readable (truncated) and the chart grows with the product count instead of squeezing the labels.
    _rbProductChart() {
        const t = this._txt;
        const currency = this._currency;
        const rows = this._comByProduct;
        const source = [[t.product, t.revenue], ...rows.map((p) => [p.productName, convertCurrency(p.revenue, currency)])];
        const valueLabel = (p) => fmtCompactDisplay(p.value[1], currency);
        const option = this._narrow
            ? {
                grid: { ...this._comGrid, top: 8, right: 16 },
                xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
                yAxis: { type: 'category', inverse: true, axisLabel: { width: 120, overflow: 'truncate' } },
                series: [{ type: 'bar', encode: { x: 1, y: 0 }, barMaxWidth: 16, label: { show: true, position: 'right', formatter: valueLabel } }],
            }
            : {
                grid: this._comGrid,
                xAxis: { type: 'category', axisLabel: { interval: 0, rotate: 20, width: 110, overflow: 'truncate' } },
                yAxis: { type: 'value', axisLabel: { formatter: (v) => fmtCompactDisplay(v, currency) } },
                series: [{ type: 'bar', barMaxWidth: 36, label: { show: true, position: 'top', formatter: valueLabel } }],
            };
        const height = this._narrow ? `${Math.max(220, rows.length * 30 + 24)}px` : '320px';
        return html`
            <svc-graph class="rpt-chart rpt-wide" ui=${this.ui} theme=${this.theme} .mainColors=${this.mainColors}
                title=${t.byProductChartTitle} height=${height} table
                .option=${{ tooltip: { trigger: 'axis', valueFormatter: (v) => fmtCompactDisplay(v, currency) }, dataset: { source }, ...option }}
            ></svc-graph>
        `;
    }

    // One markup, two layouts (container query on the panel): a card per product on a phone (name on top,
    // labelled figures in a 2-col grid — data-label), a real aligned table once the panel is wide enough.
    _rbDetailTable() {
        const t = this._txt, cur = this._currency;
        const byProduct = this._comByProduct;
        const totals = this._comDashboard;
        const cells = (units, revenue, cost, profit, margin, badge) => [
            [t.colUnits, this._comLocaleNumber(units)],
            [t.colRevenue, fmtMoney(revenue, cur)],
            [t.colCost, fmtMoney(cost, cur)],
            [t.colProfit, fmtMoney(profit, cur)],
            [t.colMargin, badge ? html`<span class="rpt-badge ${margin < 0 ? 'is-down' : ''}">${margin.toFixed(1)}%</span>` : `${margin.toFixed(1)}%`],
        ].map(([label, value]) => html`<span class="rpt-dcell" role="cell" data-label=${label}>${value}</span>`);
        return html`
            <section class="rpt-panel rpt-wide rpt-detail">
                <h3 class="rpt-panel-title">${t.detailTableTitle}</h3>
                ${!byProduct.length ? html`<div class="rpt-empty">${t.noProduct}</div>` : html`
                    <div class="rpt-dtable" role="table" aria-label=${t.detailTableTitle}>
                        <div class="rpt-drow is-head" role="row">
                            ${[t.colProduct, t.colUnits, t.colRevenue, t.colCost, t.colProfit, t.colMargin].map((h) => html`<span role="columnheader">${h}</span>`)}
                        </div>
                        ${byProduct.map((p) => html`
                            <div class="rpt-drow" role="row">
                                <span class="rpt-dname" role="rowheader">${p.productName}</span>
                                ${cells(p.quantity, p.revenue, p.cost, p.profit, p.margin, true)}
                            </div>
                        `)}
                        <div class="rpt-drow is-total" role="row">
                            <span class="rpt-dname" role="rowheader">${t.total}</span>
                            ${cells(totals.units, totals.revenue, totals.cost, totals.profit, totals.margin, false)}
                        </div>
                    </div>
                `}
            </section>
        `;
    }
}

// Tag name 'svc-finance-report', NOT 'svc-finance-report-division' — avoids a global Custom
// Elements registry collision (same rationale as svc-talk).
if (!customElements.get('svc-finance-report')) customElements.define('svc-finance-report', SvcFinanceReport);
export default SvcFinanceReport;
