// src/packages/apex/web-datetime.js
//
// <web-datetime> — a field that opens <web-calendar> (./web-calendar.js, plain Lit — no calendar library)
// in a popover. Same API as before:
//
//   type         'default' (date) | 'datetime' (date + time) | 'month' | 'year'
//   value        'YYYY-MM-DD' | 'YYYY-MM-DD, HH:mm' | 'MM' | 'YYYY'
//   dateMin / dateMax, placeholder, disabled, theme, ui ('modern' | 'pastel'), height, lang, txt
//
// Event: `change` { value } (bubbles, composed) on every pick. The field shows the value localized
// (01/08/2026 · Aug 1, 2026 · Tháng 8); `value` itself keeps the formats above.
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import './web-calendar.js';
import { parseDateValue } from './web-calendar.js';
import styles from './css/web-datetime.css?inline';
import { txtLingo } from '@/services/tools/lingo.js';
import pastelStyles from './css/pastel.css?inline';

const TXT_STD = {
	vi: { ph: 'Chọn ngày…', phDatetime: 'Chọn ngày giờ…', phMonth: 'Chọn tháng…', phYear: 'Chọn năm…' },
	en: { ph: 'Select date…', phDatetime: 'Select date & time…', phMonth: 'Select month…', phYear: 'Select year…' },
};

const MARGIN = 8; // px kept between the popover and the viewport edge / the field
const PANEL_W = 320;
const ICONS = { default: 'ri:calendar-2-line', datetime: 'ri:calendar-schedule-line', month: 'ri:calendar-event-line', year: 'ri:calendar-line' };

export class WebDateTime extends LitElement {
	static shadowRootOptions = { mode: 'open' };
	static styles = [unsafeCSS(pastelStyles), unsafeCSS(styles)];

	static properties = {
		type:        { type: String },
		value:       { type: String },
		dateMin:     { type: String },
		dateMax:     { type: String },
		placeholder: { type: String },
		disabled:    { type: Boolean },
		theme:       { type: String },
		ui:          { type: String },
		height:      { type: String },
		txt:         { type: Object },
		lang:        { type: String },
		isOpen:      { type: Boolean, state: true },
	};

	constructor() {
		super();
		this.type = 'default';
		this.value = '';
		this.dateMin = '1970-01-01';
		this.dateMax = '2470-12-31';
		this.placeholder = '';
		this.disabled = false;
		this.theme = '';
		this.ui = 'modern';
		this.height = '36px';
		this.txt = null;
		this.lang = 'vi';
		this.isOpen = false;
		this._closing = false; // fading out — the calendar stays mounted until the popover is hidden
		this._hideTimer = null;

		this._onOutside = this._onOutside.bind(this);
		this._place = this._place.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('pointerdown', this._onOutside, { capture: true });
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		clearTimeout(this._hideTimer);
		window.removeEventListener('pointerdown', this._onOutside, { capture: true });
		this._unlisten();
	}

	updated(changed) {
		if (changed.has('theme')) {
			if (this.theme && this.theme !== 'system') this.setAttribute('data-theme', this.theme);
			else this.removeAttribute('data-theme');
		}
	}

	get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
	get _menu() { return this.renderRoot?.querySelector('.dropdown-menu'); }

	// ── Open / close ─────────────────────────────────────────────────────────

	_onOutside(e) {
		if (this.isOpen && !e.composedPath().includes(this)) this._close();
	}

	_toggle() {
		if (this.disabled) return;
		if (this.isOpen) return this._close();
		clearTimeout(this._hideTimer);
		this._closing = false;
		this.isOpen = true;
		this.updateComplete.then(() => {
			this._showPopover();
			this._place();
			window.addEventListener('scroll', this._place, true);
			window.addEventListener('resize', this._place);
			this.renderRoot.querySelector('web-calendar')?.focusGrid();
		});
	}

	_close({ refocus = false } = {}) {
		if (!this.isOpen) return;
		this.isOpen = false;
		this._closing = true;
		this._unlisten();
		this._scheduleHidePopover();
		if (refocus) this.renderRoot.querySelector('.datetime-trigger')?.focus();
	}

	_unlisten() {
		window.removeEventListener('scroll', this._place, true);
		window.removeEventListener('resize', this._place);
	}

	// Promote .dropdown-menu to the top layer via the native Popover API — plain position:fixed isn't enough
	// if any ancestor has transform/filter/backdrop-filter (a new containing block for fixed descendants)
	// combined with overflow:hidden (then clips it). The top layer bypasses both at any nesting depth.
	_showPopover() {
		clearTimeout(this._hideTimer);
		const menu = this._menu;
		if (menu?.showPopover && !menu.matches(':popover-open')) {
			try { menu.showPopover(); } catch {}
		}
	}

	// Leaving the top layer mid fade-out would drop the menu back under ancestor transforms while it's still
	// animating (it visibly jumps) — hide only once the close transition ends (timeout = no transitionend).
	_scheduleHidePopover() {
		const menu = this._menu;
		clearTimeout(this._hideTimer);
		const finish = () => {
			menu?.removeEventListener('transitionend', onEnd);
			clearTimeout(this._hideTimer);
			if (this.isOpen) return;
			if (menu?.matches(':popover-open')) {
				try { menu.hidePopover(); } catch {}
			}
			this._closing = false;
			this.requestUpdate(); // unmount the calendar — the next open starts on the value's month again
		};
		if (!menu?.hidePopover || !menu.matches(':popover-open')) return finish();
		const onEnd = (e) => { if (e.target === menu) finish(); };
		menu.addEventListener('transitionend', onEnd);
		this._hideTimer = setTimeout(finish, 450);
	}

	/** Below the field when it fits, else above; clamped into the viewport (top layer = viewport space). */
	_place() {
		if (!this.isOpen) return;
		const trigger = this.renderRoot.querySelector('.datetime-trigger');
		const menu = this._menu;
		if (!trigger || !menu) return;
		const width = Math.min(PANEL_W, window.innerWidth - MARGIN * 2);
		menu.style.width = `${width}px`;
		const r = trigger.getBoundingClientRect();
		const h = menu.getBoundingClientRect().height || 360;
		const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - width - MARGIN));
		const below = window.innerHeight - r.bottom - MARGIN, above = r.top - MARGIN;
		const up = below < h && above > below;
		menu.style.left = `${left}px`;
		menu.style.top = `${up ? Math.max(MARGIN, r.top - Math.min(h, above) - 4) : r.bottom + 4}px`;
		menu.style.maxHeight = `${(up ? above : below) - 4}px`;
	}

	// ── Pick ─────────────────────────────────────────────────────────────────

	_onPick(e) {
		e.stopPropagation();
		const { value, done } = e.detail;
		this.value = value;
		this.dispatchEvent(new CustomEvent('change', { detail: { value }, bubbles: true, composed: true }));
		if (done) this._close({ refocus: true });
	}

	_onKeydown(e) {
		if (e.key === 'Escape' && this.isOpen) {
			e.stopPropagation();
			this._close({ refocus: true });
		}
	}

	// ── Display ──────────────────────────────────────────────────────────────

	get _display() {
		const v = String(this.value ?? '');
		if (!v) return '';
		const loc = this.lang === 'en' ? 'en-US' : 'vi-VN';
		if (this.type === 'year') return v;
		if (this.type === 'month') {
			const m = Number(v);
			if (!m) return v;
			const name = new Intl.DateTimeFormat(loc, { month: 'long' }).format(new Date(2020, m - 1, 1));
			return name.charAt(0).toLocaleUpperCase() + name.slice(1);
		}
		const { date, time } = parseDateValue(v);
		if (!date) return v;
		const [y, m, d] = date.split('-').map(Number);
		const opts = this.lang === 'en' ? { month: 'short', day: 'numeric', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' };
		const text = new Intl.DateTimeFormat(loc, opts).format(new Date(y, m - 1, d));
		return this.type === 'datetime' ? `${text} · ${time || '00:00'}` : text;
	}

	get _placeholder() {
		const t = this._txt;
		return this.placeholder || { datetime: t.phDatetime, month: t.phMonth, year: t.phYear }[this.type] || t.ph;
	}

	render() {
		const pastel = this.ui === 'pastel' ? 'pastel' : '';
		const shown = this._display;
		return html`
			<div class="web-datetime ${pastel}" style="--core-height: ${this.height}" @keydown=${this._onKeydown}>
				<button type="button" class="datetime-trigger ${this.isOpen ? 'open' : ''}" ?disabled=${this.disabled}
					aria-haspopup="dialog" aria-expanded=${this.isOpen ? 'true' : 'false'} @click=${this._toggle}>
					<iconify-icon class="dt-icon" icon=${ICONS[this.type] ?? ICONS.default}></iconify-icon>
					<span class="selected-value ${shown ? '' : 'placeholder'}">${shown || this._placeholder}</span>
					<iconify-icon class="chevron" icon="ri:arrow-down-s-line"></iconify-icon>
				</button>

				<div class="dropdown-menu ${this.isOpen ? 'show' : ''}" popover="manual" role="dialog" aria-label=${this._placeholder}>
					${this.isOpen || this._closing ? html`
						<web-calendar type=${this.type} .value=${this.value ?? ''} dateMin=${this.dateMin || ''} dateMax=${this.dateMax || ''}
							lang=${this.lang} @calendar-change=${this._onPick}></web-calendar>` : nothing}
				</div>
			</div>
		`;
	}
}

if (!customElements.get('web-datetime')) customElements.define('web-datetime', WebDateTime);

export default WebDateTime;
