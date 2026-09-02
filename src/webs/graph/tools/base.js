import { LitElement, html, nothing } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import * as echarts from 'echarts/core';
import css from '../styles/graph-shared.css?inline';
import '@/webs/apex/web-toggle.js';
import { BOOL_ATTR, readThemeColors, resolveFallbackColors, mainColorsArray, datasetTable, themedSeries, themedAxis } from './shared.js';

// Shared by svc-graph.js (bar/line/area) and svc-pie.js (pie/doughnut/polar) — everything except
// which echarts chart-types/components get registered (each leaf file does `echarts.use([...])`
// with only what it needs, then extends this class). See tools/shared.js for the small helpers.
export class GraphChartBase extends LitElement {
	createRenderRoot() {
		return this;
	}

	static properties = {
		ui: { type: String },
		theme: { type: String },
		// Lit's default attribute name is the property name lower-cased with no separators
		// ("mainColors" -> "maincolors"), NOT kebab-case — `attribute:` must be set explicitly
		// for any multi-word property or the `main-colors="..."` markup silently never binds.
		mainColors: { type: String, attribute: 'main-colors' },
		title: { type: String },
		height: { type: String },
		option: { type: Object }, // raw ECharts option — set as `.option = {...}` (JS) or `option='{...}'` (JSON attribute, Lit auto-parses)
		table: { type: Boolean, converter: BOOL_ATTR },
		tableWidth: { type: String, attribute: 'table-width' },
		_tableVisible: { state: true },
	};

	constructor() {
		super();
		this.ui = 'modern';
		// Empty by default so the component doesn't force its own `data-theme` and instead
		// inherits whatever theme is already active on an ancestor (e.g. `<html data-theme>`).
		this.theme = '';
		this.mainColors = '';
		this.title = '';
		this.height = '400px';
		this.option = null;
		this.table = false;
		this.tableWidth = 'auto';
		this._tableVisible = false;
		this._chart = null;
		this._canvasRef = createRef();
	}

	// ==========================================
	// LIFECYCLE
	// ==========================================

	connectedCallback() {
		super.connectedCallback();
		this._injectStyles();
		this._tableVisible = this.table;
		this._dcObserveGlobalTheme();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._resizeObserver?.disconnect();
		this._resizeObserver = null;
		clearTimeout(this._resizeTimer);
		this._themeObserver?.disconnect();
		this._themeObserver = null;
		this._chart?.dispose();
		this._chart = null;
	}

	_injectStyles() {
		const id = 'svc-graph-styles';
		if (document.getElementById(id)) return;
		const s = document.createElement('style');
		s.id = id;
		s.textContent = css;
		document.head.appendChild(s);
	}

	firstUpdated() {
		this._dcMount();
	}

	updated(changed) {
		if (changed.has('theme')) {
			if (this.theme) this.setAttribute('data-theme', this.theme);
			else this.removeAttribute('data-theme');
		}
		if (changed.has('table')) this._tableVisible = this.table;

		if (!['option', 'mainColors', 'theme', 'height'].some((k) => changed.has(k))) return;

		if (this._chart) {
			if (changed.has('height')) this._chart.resize();
			this._chart.setOption(this._comThemedOption, { notMerge: true });
		} else {
			this._dcMount();
		}
	}

	// ==========================================
	// DATA CORE
	// ==========================================

	_dcMount() {
		const el = this._canvasRef.value;
		if (!el || this._chart || !this.option) return;
		this._chart = echarts.init(el);
		this._chart.setOption(this._comThemedOption, { notMerge: true });
		this._dcObserveResize(el);
	}

	// ECharts never resizes itself — it has to be told to re-measure its container explicitly.
	_dcObserveResize(el) {
		if (this._resizeObserver) return;
		this._resizeObserver = new ResizeObserver(() => {
			clearTimeout(this._resizeTimer);
			this._resizeTimer = setTimeout(() => this._chart?.resize(), 100);
		});
		this._resizeObserver.observe(el);
	}

	// Colors are resolved once (via getComputedStyle) and baked into the option as plain strings —
	// they only get recomputed when this component's own `theme`/`mainColors`/`option`/`height`
	// props change (see `updated()`). A page-wide theme toggle that only flips `data-theme` on
	// `<html>` never touches those props, so the chart would otherwise be stuck with stale colors.
	_dcObserveGlobalTheme() {
		if (this._themeObserver) return;
		this._themeObserver = new MutationObserver(() => this._chart?.setOption(this._comThemedOption, { notMerge: true }));
		this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	}

	// ==========================================
	// COMPUTED
	// ==========================================

	get _comColors() {
		const arr = mainColorsArray(this.mainColors);
		return arr.length ? arr : resolveFallbackColors(this);
	}

	// Merges resolved theme colors as defaults — any key the caller's own `option` already sets wins —
	// and layers in the bar-on-top / translucent-area defaults from `themedSeries`, plus a dimmed
	// default grid-line style from `themedAxis` (see tools/shared.js).
	get _comThemedOption() {
		const { text } = readThemeColors(this);
		const merged = {
			backgroundColor: 'transparent',
			textStyle: { color: text },
			color: this._comColors,
			...this.option,
		};
		if (Array.isArray(merged.series)) merged.series = themedSeries(merged.series);
		if (merged.xAxis !== undefined) merged.xAxis = themedAxis(merged.xAxis, text);
		if (merged.yAxis !== undefined) merged.yAxis = themedAxis(merged.yAxis, text);
		return merged;
	}

	// `dataset.source` (2D array: header + rows) is the one data shape this component understands
	// for the table/legend — see tools/shared.js. Anything else (raw series[].data, xAxis.data) still
	// renders fine as a chart, it just won't produce a synced table/legend.
	get _comTable() {
		return datasetTable(this.option?.dataset?.source);
	}

	// ==========================================
	// DATA HEAD
	// ==========================================

	_dhToggleTable(e) {
		this._tableVisible = e.detail.active;
	}

	// ==========================================
	// RENDER
	// ==========================================

	render() {
		const isSpatial = this.ui === 'spatial';
		return html`
			<div class="graph-card ${isSpatial ? 'spatial' : ''}">
				<div class="graph-header">
					<div class="graph-title">${this.title}</div>
					<web-toggle ui=${this.ui} .active=${this._tableVisible} @change=${this._dhToggleTable}></web-toggle>
				</div>
				<div class="graph-layout">
					<div class="graph-pane">
						<div class="graph-canvas" style="height:${this.height}" ${ref(this._canvasRef)}></div>
						${this._rbLegend()}
					</div>
					${this._tableVisible ? this._rbTable() : nothing}
				</div>
			</div>
		`;
	}

	// ==========================================
	// RENDER BLOCKS
	// ==========================================

	// Legend labels come from the same `dataset.source` used by the table, but which part depends on
	// the dataset's shape:
	// - bar/line/polar-bar (label column + N series columns): legend = header row's series names.
	// - pie/doughnut (label + single value column): legend = each row's own label, not the header.
	_rbLegend() {
		const table = this._comTable;
		if (!table) return nothing;
		const colors = this._comColors;
		const names = table.header.length === 2 ? table.rows.map((r) => r[0]) : table.header.slice(1);
		return html`
			<div class="graph-legend-row">
				${names.map((name, i) => html`
					<span class="graph-legend-item">
						<i class="graph-legend-dot" style="background:${colors[i % colors.length]}"></i>${name}
					</span>
				`)}
			</div>
		`;
	}

	_rbTable() {
		const table = this._comTable;
		if (!table) {
			console.warn('[svc-graph] table bật nhưng option.dataset.source không có dữ liệu dạng bảng — bỏ qua.');
			return nothing;
		}
		return html`
			<div class="graph-table-pane" style="width:${this.tableWidth}; max-height:${this.height}">
				<table class="graph-data-table">
					<thead>
						<tr>
							${table.header.map((h) => html`<th>${h}</th>`)}
						</tr>
					</thead>
					<tbody>
						${table.rows.map((row) => html`
							<tr>
								${row.map((cell) => html`<td>${cell}</td>`)}
							</tr>
						`)}
					</tbody>
				</table>
			</div>
		`;
	}
}
