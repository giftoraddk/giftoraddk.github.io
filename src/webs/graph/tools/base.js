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

	// `createRenderRoot()` renders into light DOM (see top), so this element's own children never
	// get a scoped stylesheet — they need `css` injected into whichever root they actually live in.
	// That root is `document` when used at page level (see src/pages/ui/spatial.astro), but when
	// nested inside ANOTHER component's Shadow DOM (e.g. <svc-graph> inside <svc-finance-report>,
	// which uses Lit's default shadow root), `document.head`'s stylesheet never crosses that shadow
	// boundary — the chart rendered with zero styling (no card background/padding, unstyled table).
	// `getRootNode()` returns the actual root (the ShadowRoot itself has no <head>, so the <style>
	// goes directly on it) — fixes both cases with 1 code path instead of assuming top-level only.
	_injectStyles() {
		const id = 'svc-graph-styles';
		const root = this.getRootNode();
		const target = root instanceof ShadowRoot ? root : document.head;
		if (target.querySelector(`#${id}`)) return;
		const s = document.createElement('style');
		s.id = id;
		s.textContent = css;
		target.appendChild(s);
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
					</div>
					${this._tableVisible ? this._rbTable() : nothing}
				</div>
			</div>
		`;
	}

	// ==========================================
	// RENDER BLOCKS
	// ==========================================

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
