// src/packages/apex/web-table.js
//
// <web-table> — a plain read-only table in the <svc-list> look (auth/svc-list.js): one floating card, sticky LEAD
// column (thumbnail / initials + title + status pill), the other columns scroll sideways, alternate rows tinted,
// tap a sortable header to sort (asc → desc → off). Three props only:
//
//   columns  [{ field, label, key?, width?, align?, render?(v, row), lead?, sub?, thumb?, opts?, sortable?, hint? }]
//            lead  = title column (default: first column) · sub = pill under the title (default: first column with opts)
//            thumb = image column (string, '|'-separated → first) · opts = [{ value, label, tone? }] labels a value
//   data     rows (objects; `key` may be a dot path)
//   tints    [a, b] theme colour names ('info accent' works too) — a: header glow + row tint, b: second glow
//
// Tap a row → 'wt-row' { row } (bubbles, composed). CRUD lives in auth/app/record-table.js + <svc-list>.

import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { getPath } from '@/services/tools/util';
import { resolveTints } from '@/packages/node/tool/tints.js';
import css from './css/web-table.css?inline';
import 'iconify-icon';

const TONES = ['success', 'error', 'warning', 'info', 'accent', 'secondary']; // pill colour by option order
const AVATAR_TONES = ['primary', 'info', 'accent', 'secondary', 'success', 'warning']; // initials — no alarming red
const COL_MIN = 56; // narrowest scroll column (px)
const FR_PX = 96;   // 1fr → this many px minimum on a phone

/** Two initials of a title — first letters of its first two words ("Vỏ Da Hộ Chiếu" → "VD"), else its first two. */
export const initialsOf = (text) => {
	const words = String(text ?? '').normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) || [];
	const chars = words.length > 1 ? words.slice(0, 2).map(w => [...w][0]) : [...(words[0] || '')].slice(0, 2);
	return chars.join('').toLocaleUpperCase('vi');
};

/** A stable tone per title, so an item keeps its colour across renders / pages. */
export const toneOf = (text) => {
	let h = 0;
	for (const c of String(text ?? '')) h = (h * 31 + c.codePointAt(0)) | 0;
	return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
};

/** opts as [{ value, label, tone? }] — plain strings allowed. */
export const optsOf = (col) => (col?.opts ?? []).map(o => (typeof o === 'string' ? { value: o, label: o } : o));

/** A cell as shown — render(value, row), else the option label, else the value (+ suffix). Shared with
 *  auth/app/record-table.js so <svc-list> shows cells the same way. */
export function cellText(col, row) {
	if (!col) return '';
	const v = getPath(row, col.key || col.field) ?? '';
	if (col.render) return col.render(v, row);
	const opt = col.opts && optsOf(col).find(o => String(o.value) === String(v));
	if (opt) return opt.label;
	return col.suffix && v !== '' ? `${v} ${col.suffix}` : v;
}

/** First image of an image column ('|'-separated list) — '' when none. */
export const thumbSrcOf = (col, row) => (col ? String(getPath(row, col.key || col.field) ?? '').split('|').find(Boolean) ?? '' : '');

/** Pill tone of an option: its own `tone`, else by its order in opts. */
export const toneOfOpt = (opts, i) => opts[i]?.tone ?? (i >= 0 ? TONES[i % TONES.length] : 'neutral');

/** Column `width` → grid track + its minimum px. px/rem stay fixed; fr (or none) grows past a phone-sized minimum. */
export function trackOf(col) {
	const m = String(col.width ?? '').trim().match(/^([\d.]+)(px|rem|fr)?$/);
	if (!m) return { track: `minmax(${FR_PX}px, 1fr)`, min: FR_PX };
	const n = Number(m[1]);
	if (m[2] === 'fr') return { track: `minmax(${Math.round(n * FR_PX)}px, ${n}fr)`, min: Math.round(n * FR_PX) };
	const px = Math.max(Math.round(m[2] === 'rem' ? n * 16 : n), COL_MIN);
	return { track: `${px}px`, min: px };
}

const EMPTY = { vi: 'Không có dữ liệu', en: 'No data' };

export class WebTable extends LitElement {
	static styles = unsafeCSS(css);

	static properties = {
		columns: { type: Array },
		data:    { type: Array },
		tints:   { type: Array, converter: { fromAttribute: v => String(v ?? '').split(/[\s,]+/).filter(Boolean) } },
		_sort:     { state: true }, // { field, dir } | null
		_scrolled: { state: true }, // columns slid under the lead cell → its edge shadow
	};

	constructor() {
		super();
		this.columns = [];
		this.data = [];
		this.tints = null;
		this._sort = null;
		this._scrolled = false;
	}

	// ── Columns ─────────────────────────────────────────────────────────────────

	get _lead() { return this.columns.find(c => c.lead) ?? this.columns[0]; }

	get _sub() {
		const lead = this._lead;
		return this.columns.find(c => c.sub && c !== lead) ?? this.columns.find(c => c !== lead && optsOf(c).length);
	}

	get _thumb() { return this.columns.find(c => c.thumb); }

	get _scrollCols() {
		const { _lead: lead, _sub: sub, _thumb: thumb } = this;
		return this.columns.filter(c => c !== lead && c !== sub && c !== thumb);
	}

	get _leadW() { return this._thumb ? 232 : 196; }

	/** Every row gets the same explicit width, so fr tracks resolve identically and columns line up. */
	get _gridVars() {
		const tracks = this._scrollCols.map(trackOf);
		const cols = [`${this._leadW}px`, ...tracks.map(t => t.track)].join(' ');
		const min = this._leadW + tracks.reduce((a, t) => a + t.min, 0);
		return `--wt-cols:${cols};--wt-min:${min}px`;
	}

	get _tintVars() {
		if (!this.tints) return '';
		const [a, b] = resolveTints(this.tints);
		return `--wt-a:var(--color-${a});--wt-b:var(--color-${b});`;
	}

	get _rows() {
		const rows = this.data || [];
		const { field, dir } = this._sort ?? {};
		const col = field && this.columns.find(c => c.field === field);
		if (!col) return rows;
		return [...rows].sort((a, b) => {
			const av = getPath(a, col.key || col.field) ?? '', bv = getPath(b, col.key || col.field) ?? '';
			const cmp = typeof av === 'number' && typeof bv === 'number'
				? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
			return dir === 'asc' ? cmp : -cmp;
		});
	}

	// ── Data Head ───────────────────────────────────────────────────────────────

	_dhSort(col) {
		if (!col?.sortable) return;
		const cur = this._sort?.field === col.field ? this._sort.dir : null;
		this._sort = cur === 'desc' ? null : { field: col.field, dir: cur === 'asc' ? 'desc' : 'asc' };
	}

	_dhScroll(e) {
		const scrolled = e.target.scrollLeft > 2;
		if (scrolled !== this._scrolled) this._scrolled = scrolled;
	}

	_dhRow(row) {
		this.dispatchEvent(new CustomEvent('wt-row', { detail: { row }, bubbles: true, composed: true }));
	}

	// ── Render ──────────────────────────────────────────────────────────────────

	render() {
		const rows = this._rows;
		const lang = document.documentElement.lang === 'en' ? 'en' : 'vi';
		return html`
			<div class="wt" style=${this._tintVars}>
				<div class="wt-scroll ${this._scrolled ? 'is-scrolled' : ''}" style=${this._gridVars} @scroll=${this._dhScroll} role="table">
					<div class="wt-row wt-head" role="row">
						${this._rfHead(this._lead, true)}
						${this._scrollCols.map(col => this._rfHead(col))}
					</div>
					${rows.map((row, i) => this._rfRow(row, i))}
				</div>
				${rows.length ? nothing : html`
					<div class="wt-empty"><iconify-icon icon="ri:inbox-2-line"></iconify-icon><span>${EMPTY[lang]}</span></div>`}
			</div>
		`;
	}

	_rfHead(col, lead = false) {
		const dir = this._sort?.field === col?.field ? this._sort.dir : null;
		return html`
			<div class="wt-cell ${lead ? 'wt-lead' : ''} ${col?.sortable ? 'is-sortable' : ''} ${dir ? 'is-sorted' : ''}"
				style="text-align:${col?.align || 'left'}" role="columnheader" tabindex=${col?.sortable ? '0' : '-1'}
				aria-sort=${dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
				@click=${() => this._dhSort(col)}
				@keydown=${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._dhSort(col); } }}>
				<span class="wt-head-label">${col?.label ?? ''}
					${col?.sortable ? html`<iconify-icon class="wt-sort"
						icon=${dir === 'asc' ? 'ri:arrow-up-line' : dir === 'desc' ? 'ri:arrow-down-line' : 'ri:arrow-up-down-line'}></iconify-icon>` : nothing}
				</span>
				${col?.hint ? html`<span class="wt-head-hint">${col.hint}</span>` : nothing}
			</div>
		`;
	}

	_rfRow(row, i) {
		const lead = this._lead, title = cellText(lead, row);
		return html`
			<div class="wt-row ${i % 2 ? 'is-alt' : ''}" role="row" tabindex="0"
				@click=${() => this._dhRow(row)}
				@keydown=${(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) this._dhRow(row); }}>
				<div class="wt-cell wt-lead" role="cell">
					${this._thumb ? this._rfThumb(row, title) : nothing}
					<span class="wt-lead-text">
						<span class="wt-title">${title === '' || title == null ? '—' : title}</span>
						${this._rfPill(row)}
					</span>
				</div>
				${this._scrollCols.map(col => {
					const v = cellText(col, row);
					return html`<div class="wt-cell" role="cell" style="text-align:${col.align || 'left'}">
						${v === '' || v == null ? html`<span class="wt-dim">—</span>` : html`<span class="wt-val">${v}</span>`}</div>`;
				})}
			</div>
		`;
	}

	/** The row's first image, else the two initials of its title on a tone of its own. */
	_rfThumb(row, title) {
		const src = thumbSrcOf(this._thumb, row);
		if (src) return html`<img class="wt-thumb" src=${src} alt="" loading="lazy" decoding="async" />`;
		return html`<span class="wt-thumb is-initials" data-tone=${toneOf(title)} aria-hidden="true">${initialsOf(title) || '—'}</span>`;
	}

	_rfPill(row) {
		const col = this._sub;
		if (!col) return nothing;
		const label = cellText(col, row);
		if (label === '' || label == null) return nothing;
		const opts = optsOf(col);
		const i = opts.findIndex(o => String(o.value) === String(getPath(row, col.key || col.field) ?? ''));
		return html`<span class="wt-pill" data-tone=${toneOfOpt(opts, i)}>${label}</span>`;
	}
}

if (!customElements.get('web-table')) customElements.define('web-table', WebTable);
export default WebTable;
