// src/packages/apex/web-calendar.js
//
// <web-calendar> — inline date / month / year picker in plain Lit (no calendar library), styled like the
// User Portal (auth/app/svc-profile.js): soft base-content tints, round nav buttons, 18px card. Used inside
// <web-datetime>'s popover; works on its own too.
//
//   type     'default' (date) | 'datetime' (date + time) | 'month' | 'year'
//   value    'YYYY-MM-DD' | 'YYYY-MM-DD, HH:mm' | 'MM' | 'YYYY' — also reads ISO / 'YYYY-MM-DD HH:mm:ss'
//   dateMin / dateMax  'YYYY-MM-DD' (inclusive)
//   lang / txt         vi | en, txt overrides TXT_STD per language
//
// Event: `calendar-change` { value, done } — bubbles, not composed (a host like <web-datetime> turns it into
// its own `change`). `done` = the pick is complete (date / month / year clicked, Today, Clear, or Done in
// datetime mode), i.e. a popover may close now.
//
// Keyboard (day grid): arrows ±1 day / ±1 week, PageUp / PageDown ±1 month, Home / End week start / end,
// Enter / Space pick.
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import styles from './css/web-calendar.css?inline';
import { txtLingo } from '@/services/tools/util.js';

const TXT_STD = {
	vi: {
		weekdays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
		today: 'Hôm nay', clear: 'Xoá', done: 'Xong', time: 'Giờ',
		prev: 'Trước', next: 'Sau', pickMonth: 'Chọn tháng', pickYear: 'Chọn năm',
	},
	en: {
		weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
		today: 'Today', clear: 'Clear', done: 'Done', time: 'Time',
		prev: 'Previous', next: 'Next', pickMonth: 'Choose month', pickYear: 'Choose year',
	},
};

const YEARS_PAGE = 12;
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** y, m (0-based), d → 'YYYY-MM-DD' — local calendar numbers, never through UTC. */
export const isoDate = (y, m, d) => {
	const dt = new Date(y, m, d);
	return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

export const todayIso = () => { const n = new Date(); return isoDate(n.getFullYear(), n.getMonth(), n.getDate()); };
const nowTime = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };

/**
 * Any accepted value → { date: 'YYYY-MM-DD' | '', time: 'HH:mm' | '' }. A timestamp with a zone (…Z, +07:00)
 * is shown in local time; a plain 'YYYY-MM-DD[ T,]HH:mm' is taken as written.
 */
export function parseDateValue(value) {
	const s = String(value ?? '').trim();
	if (!s) return { date: '', time: '' };
	const zoned = /T.*(Z|[+-]\d{2}:?\d{2})$/i.test(s);
	const m = !zoned && s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T,]+(\d{2}):(\d{2}))?/);
	if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : '' };
	const d = new Date(/^\d{9,}$/.test(s) ? Number(s) : s); // epoch ms as a string, or any Date-parsable text
	if (Number.isNaN(d.getTime())) return { date: '', time: '' };
	return { date: isoDate(d.getFullYear(), d.getMonth(), d.getDate()), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** { date, time } → the value string for `type` ('YYYY-MM-DD, HH:mm' for datetime, as before). */
export const formatDateValue = (type, date, time) => (!date ? '' : type === 'datetime' ? `${date}, ${time || '00:00'}` : date);

const locale = (lang) => (lang === 'en' ? 'en-US' : 'vi-VN');

export class WebCalendar extends LitElement {
	static styles = [unsafeCSS(styles)];

	static properties = {
		type: { type: String },
		value: { type: String },
		dateMin: { type: String },
		dateMax: { type: String },
		lang: { type: String },
		txt: { type: Object },
		_view: { state: true }, // 'days' | 'months' | 'years'
		_y: { state: true }, // shown year
		_m: { state: true }, // shown month, 0-based
		_focus: { state: true }, // 'YYYY-MM-DD' — the day grid's roving tab stop
	};

	constructor() {
		super();
		this.type = 'default';
		this.value = '';
		this.dateMin = '';
		this.dateMax = '';
		this.lang = 'vi';
		this.txt = null;
		this._view = 'days';
		const n = new Date();
		this._y = n.getFullYear();
		this._m = n.getMonth();
		this._focus = todayIso();
		this._syncedFor = null;
	}

	get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
	get _parsed() { return parseDateValue(this.value); }

	willUpdate(changed) {
		// Open on the value's month (or today's) — only when value / type really change, so browsing months
		// isn't reset by an unrelated re-render
		if ((changed.has('value') || changed.has('type')) && this._syncedFor !== `${this.type}|${this.value}`) {
			this._syncedFor = `${this.type}|${this.value}`;
			this._syncToValue();
		}
	}

	_syncToValue() {
		const t = this.type, v = String(this.value ?? '');
		const n = new Date();
		if (t === 'month') {
			this._view = 'months';
			this._y = n.getFullYear();
			return;
		}
		if (t === 'year') {
			this._view = 'years';
			this._y = Number(v) || n.getFullYear();
			return;
		}
		this._view = 'days';
		const { date } = this._parsed;
		const focus = date || this._clamp(todayIso());
		const [y, m] = focus.split('-').map(Number);
		this._y = y;
		this._m = m - 1;
		this._focus = focus;
	}

	/** Public: focus the current day / month / year (a popover calls this once it has opened). */
	focusGrid() {
		this.updateComplete.then(() => this.renderRoot.querySelector('.cal-grid [tabindex="0"]')?.focus());
	}

	// ── Range ────────────────────────────────────────────────────────────────

	_clamp(date) {
		if (this.dateMin && date < this.dateMin) return this.dateMin;
		if (this.dateMax && date > this.dateMax) return this.dateMax;
		return date;
	}

	_dayOff(date) { return Boolean((this.dateMin && date < this.dateMin) || (this.dateMax && date > this.dateMax)); }
	// A month / year is off only when it lies wholly outside [dateMin, dateMax]
	_monthOff(y, m) {
		const key = `${y}-${pad(m + 1)}`;
		return Boolean((this.dateMin && key < this.dateMin.slice(0, 7)) || (this.dateMax && key > this.dateMax.slice(0, 7)));
	}
	_yearOff(y) {
		return Boolean((this.dateMin && y < Number(this.dateMin.slice(0, 4))) || (this.dateMax && y > Number(this.dateMax.slice(0, 4))));
	}

	// ── Navigation ───────────────────────────────────────────────────────────

	_shiftMonth(delta) {
		const d = new Date(this._y, this._m + delta, 1);
		this._y = d.getFullYear();
		this._m = d.getMonth();
		// keep the keyboard stop inside the shown month
		const day = Math.min(Number(this._focus.slice(8)) || 1, new Date(this._y, this._m + 1, 0).getDate());
		this._focus = isoDate(this._y, this._m, day);
	}

	_dhPrev() {
		if (this._view === 'days') this._shiftMonth(-1);
		else this._y -= this._view === 'months' ? 1 : YEARS_PAGE;
	}

	_dhNext() {
		if (this._view === 'days') this._shiftMonth(1);
		else this._y += this._view === 'months' ? 1 : YEARS_PAGE;
	}

	_dhTitle() { this._view = this._view === 'days' ? 'months' : 'years'; }

	// ── Picks ────────────────────────────────────────────────────────────────

	_emit(value, done) {
		this.value = value;
		this._syncedFor = `${this.type}|${value}`; // our own pick — don't jump the view
		this.dispatchEvent(new CustomEvent('calendar-change', { detail: { value, done }, bubbles: true }));
	}

	_dhDay(date) {
		if (this._dayOff(date)) return;
		this._focus = date;
		const [y, m] = date.split('-').map(Number);
		this._y = y;
		this._m = m - 1;
		const time = this._parsed.time;
		this._emit(formatDateValue(this.type, date, time), this.type !== 'datetime');
	}

	_dhMonth(m) {
		if (this._monthOff(this._y, m)) return;
		if (this.type === 'month') return this._emit(pad(m + 1), true);
		this._m = m;
		this._focus = isoDate(this._y, m, 1);
		this._view = 'days';
	}

	_dhYear(y) {
		if (this._yearOff(y)) return;
		if (this.type === 'year') return this._emit(String(y), true);
		this._y = y;
		this._view = 'months';
	}

	_dhTime(e) {
		const time = e.target.value;
		if (!time) return;
		const date = this._parsed.date || this._clamp(todayIso());
		this._emit(formatDateValue('datetime', date, time), false);
	}

	_dhToday() {
		const n = new Date();
		if (this.type === 'month') return this._emit(pad(n.getMonth() + 1), true);
		if (this.type === 'year') return this._emit(String(n.getFullYear()), true);
		const date = this._clamp(todayIso());
		this._focus = date;
		const [y, m] = date.split('-').map(Number);
		this._y = y;
		this._m = m - 1;
		this._view = 'days';
		this._emit(formatDateValue(this.type, date, this.type === 'datetime' ? nowTime() : ''), this.type !== 'datetime');
	}

	_dhClear() { this._emit('', true); }

	_dhDone() { this._emit(this.value, true); }

	_onGridKey(e) {
		if (this._view !== 'days') return;
		const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
		const [y, m, d] = this._focus.split('-').map(Number);
		let next = null;
		if (step) next = isoDate(y, m - 1, d + step);
		else if (e.key === 'PageUp' || e.key === 'PageDown') {
			const delta = e.key === 'PageUp' ? -1 : 1;
			const last = new Date(y, m - 1 + delta + 1, 0).getDate();
			next = isoDate(y, m - 1 + delta, Math.min(d, last));
		} else if (e.key === 'Home' || e.key === 'End') {
			const wd = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
			next = isoDate(y, m - 1, d + (e.key === 'Home' ? -wd : 6 - wd));
		}
		if (!next) return;
		e.preventDefault();
		this._focus = next;
		const [ny, nm] = next.split('-').map(Number);
		this._y = ny;
		this._m = nm - 1;
		this.focusGrid();
	}

	// ── Render ───────────────────────────────────────────────────────────────

	_rbHead() {
		const t = this._txt, loc = locale(this.lang);
		let title, prevOff, nextOff;
		if (this._view === 'days') {
			title = cap(new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(new Date(this._y, this._m, 1)));
			const prev = new Date(this._y, this._m - 1, 1), next = new Date(this._y, this._m + 1, 1);
			prevOff = this._monthOff(prev.getFullYear(), prev.getMonth());
			nextOff = this._monthOff(next.getFullYear(), next.getMonth());
		} else if (this._view === 'months') {
			title = String(this._y);
			prevOff = this._yearOff(this._y - 1);
			nextOff = this._yearOff(this._y + 1);
		} else {
			const start = this._yearsStart;
			title = `${start} – ${start + YEARS_PAGE - 1}`;
			prevOff = this._yearOff(start - 1);
			nextOff = this._yearOff(start + YEARS_PAGE);
		}
		const canZoomOut = this._view !== 'years';
		return html`
			<div class="cal-head">
				<button type="button" class="cal-nav" aria-label=${t.prev} ?disabled=${prevOff} @click=${this._dhPrev}>
					<iconify-icon icon="ri:arrow-left-s-line"></iconify-icon>
				</button>
				<button type="button" class="cal-title" ?disabled=${!canZoomOut} aria-label=${this._view === 'days' ? t.pickMonth : t.pickYear}
					@click=${this._dhTitle}>
					<span>${title}</span>
					${canZoomOut ? html`<iconify-icon icon="ri:arrow-down-s-line"></iconify-icon>` : nothing}
				</button>
				<button type="button" class="cal-nav" aria-label=${t.next} ?disabled=${nextOff} @click=${this._dhNext}>
					<iconify-icon icon="ri:arrow-right-s-line"></iconify-icon>
				</button>
			</div>
		`;
	}

	get _yearsStart() { return this._y - (((this._y % YEARS_PAGE) + YEARS_PAGE) % YEARS_PAGE); }

	_rbDays() {
		const t = this._txt;
		const selected = this._parsed.date, today = todayIso();
		const offset = (new Date(this._y, this._m, 1).getDay() + 6) % 7; // Monday first
		const cells = Array.from({ length: 42 }, (_, i) => {
			const d = new Date(this._y, this._m, 1 - offset + i);
			return { iso: isoDate(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), out: d.getMonth() !== this._m, wd: i % 7 };
		});
		return html`
			<div class="cal-weekdays" aria-hidden="true">${t.weekdays.map((w, i) => html`<span class=${i > 4 ? 'is-weekend' : ''}>${w}</span>`)}</div>
			<div class="cal-grid cal-days" role="grid" @keydown=${this._onGridKey}>
				${cells.map((c) => {
					const off = this._dayOff(c.iso);
					const cls = [c.out && 'is-out', c.iso === selected && 'is-on', c.iso === today && 'is-today', c.wd > 4 && 'is-weekend'].filter(Boolean).join(' ');
					return html`
						<button type="button" class="cal-day ${cls}" data-date=${c.iso} role="gridcell"
							tabindex=${c.iso === this._focus ? '0' : '-1'} ?disabled=${off}
							aria-selected=${c.iso === selected ? 'true' : 'false'} aria-current=${c.iso === today ? 'date' : nothing}
							@click=${() => this._dhDay(c.iso)}>${c.day}</button>`;
				})}
			</div>
		`;
	}

	/** The picked month (0-based) / year — from `value` for type month / year, else from its date part. */
	get _selMonth() {
		if (this.type === 'month') return Number(this.value) - 1;
		const { date } = this._parsed;
		return date && Number(date.slice(0, 4)) === this._y ? Number(date.slice(5, 7)) - 1 : -1;
	}

	get _selYear() { return this.type === 'year' ? Number(this.value) || null : Number(this._parsed.date.slice(0, 4)) || null; }

	_rbMonths() {
		const fmt = new Intl.DateTimeFormat(locale(this.lang), { month: this.lang === 'en' ? 'short' : 'long' });
		const n = new Date(), sel = this._selMonth;
		const stop = sel >= 0 ? sel : this.type === 'month' ? n.getMonth() : this._m; // the one Tab lands on
		return html`
			<div class="cal-grid cal-cells" role="grid">
				${Array.from({ length: 12 }, (_, m) => html`
					<button type="button" role="gridcell"
						class="cal-cell ${m === sel ? 'is-on' : ''} ${m === n.getMonth() && this._y === n.getFullYear() ? 'is-today' : ''}"
						tabindex=${m === stop ? '0' : '-1'} aria-selected=${m === sel ? 'true' : 'false'}
						?disabled=${this._monthOff(this._y, m)} @click=${() => this._dhMonth(m)}>${cap(fmt.format(new Date(2020, m, 1)))}</button>`)}
			</div>
		`;
	}

	_rbYears() {
		const start = this._yearsStart, now = new Date().getFullYear(), sel = this._selYear;
		const inPage = (y) => y >= start && y < start + YEARS_PAGE;
		const stop = inPage(sel) ? sel : inPage(this._y) ? this._y : start;
		return html`
			<div class="cal-grid cal-cells" role="grid">
				${Array.from({ length: YEARS_PAGE }, (_, i) => {
					const y = start + i;
					return html`
						<button type="button" role="gridcell" class="cal-cell ${y === sel ? 'is-on' : ''} ${y === now ? 'is-today' : ''}"
							tabindex=${y === stop ? '0' : '-1'} aria-selected=${y === sel ? 'true' : 'false'}
							?disabled=${this._yearOff(y)} @click=${() => this._dhYear(y)}>${y}</button>`;
				})}
			</div>
		`;
	}

	_rbFoot() {
		const t = this._txt, datetime = this.type === 'datetime';
		return html`
			${datetime ? html`
				<label class="cal-time">
					<iconify-icon icon="ri:time-line"></iconify-icon>
					<span>${t.time}</span>
					<input type="time" step="60" .value=${this._parsed.time || ''} @change=${this._dhTime} />
				</label>` : nothing}
			<div class="cal-foot">
				<button type="button" class="cal-link" @click=${this._dhToday}>${t.today}</button>
				<button type="button" class="cal-link is-muted" ?disabled=${!this.value} @click=${this._dhClear}>${t.clear}</button>
				${datetime ? html`<button type="button" class="cal-done" @click=${this._dhDone}>${t.done}</button>` : nothing}
			</div>
		`;
	}

	render() {
		const body = { days: this._rbDays, months: this._rbMonths, years: this._rbYears }[this._view] ?? this._rbDays;
		return html`
			<div class="cal" data-view=${this._view}>
				${this._rbHead()}
				${body.call(this)}
				${this._rbFoot()}
			</div>
		`;
	}
}

if (!customElements.get('web-calendar')) customElements.define('web-calendar', WebCalendar);

export default WebCalendar;
