import { LitElement, html, unsafeCSS } from 'lit';
import { Calendar } from 'vanilla-calendar-pro';
import calendarStyles from 'vanilla-calendar-pro/styles/index.css?inline';
import calendarLayoutStyles from 'vanilla-calendar-pro/styles/layout.css?inline';
import styles from './styles/web-datetime.css?inline';

const TXT_STD = {
	vi: { ph: 'Chọn ngày...' },
	en: { ph: 'Select date...' },
}

export class WebDateTime extends LitElement {
	static shadowRootOptions = { mode: 'open' };
	static styles = [unsafeCSS(calendarStyles), unsafeCSS(calendarLayoutStyles), unsafeCSS(styles)];

	static properties = {
		type:         { type: String },
		value:        { type: String },
		dateMin:      { type: String },
		dateMax:      { type: String },
		placeholder:  { type: String },
		disabled:     { type: Boolean },
		theme:        { type: String },
		ui:           { type: String },
		isOpen:       { type: Boolean, state: true },
		height:       { type: String },
		txt:   { type: Object },
		lang:  { type: String },
	};

	static get uiConfigs() {
		return {
			modern: {
				wrap: 'modern web-datetime',
				trigger: 'datetime-trigger',
				dropdown: 'dropdown-menu',
			},
			spatial: {
				wrap: 'spatial web-datetime',
				trigger: 'spatial datetime-trigger',
				dropdown: 'spatial dropdown-menu',
			},
		};
	}

	constructor() {
		super();
		this.type = 'default';
		this.value = '';
		this.dateMin = '1970-01-01';
		this.dateMax = '2470-12-31';
		this.placeholder  = '';
		this.disabled     = false;
		this.theme        = 'system';
		this.ui           = 'modern';
		this.isOpen       = false;
		this.height       = '36px';
		this.calendar     = null;
		this.txt   = null;
		this.lang  = 'vi';
		this._hideTimer = null;

		this._handleOutsideClick = this._handleOutsideClick.bind(this);
		this._updateDropdownPosition = this._updateDropdownPosition.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('mousedown', this._handleOutsideClick, { capture: true });
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		clearTimeout(this._hideTimer);
		window.removeEventListener('mousedown', this._handleOutsideClick, { capture: true });
		window.removeEventListener('scroll', this._updateDropdownPosition, true);
		window.removeEventListener('resize', this._updateDropdownPosition);
	}

	updated(changedProperties) {
		if (changedProperties.has('theme') && this.theme) {
			this.setAttribute('data-theme', this.theme);
			if (this.calendar) this.calendar.set({ selectedTheme: this.theme });
		} else if (changedProperties.has('theme') && !this.theme) {
			this.removeAttribute('data-theme');
			if (this.calendar) this.calendar.set({ selectedTheme: 'default' });
		}
	}

	_handleOutsideClick(e) {
		if (!this.isOpen) return;
		const isInside = e.composedPath().includes(this);
		if (!isInside) {
			this._closeDropdown();
		}
	}

	_closeDropdown() {
		this.isOpen = false;
		window.removeEventListener('scroll', this._updateDropdownPosition, true);
		window.removeEventListener('resize', this._updateDropdownPosition);
		this._scheduleHidePopover();
	}

	// Promote .dropdown-menu to the top layer via the native Popover API — plain
	// position:fixed isn't enough if any ancestor has transform/filter/backdrop-filter
	// (creates a new containing block for fixed descendants) combined with overflow:hidden
	// (then clips it). Top-layer rendering bypasses both regardless of nesting depth.
	_showPopover() {
		clearTimeout(this._hideTimer);
		const dropdown = this.shadowRoot.querySelector('.dropdown-menu');
		if (dropdown?.showPopover && !dropdown.matches(':popover-open')) {
			try { dropdown.showPopover(); } catch {}
		}
	}

	_hidePopover() {
		const dropdown = this.shadowRoot.querySelector('.dropdown-menu');
		if (dropdown?.hidePopover && dropdown.matches(':popover-open')) {
			try { dropdown.hidePopover(); } catch {}
		}
	}

	// Removing from the top layer immediately (synchronous hidePopover()) mid fade-out drops the
	// dropdown back into normal flow while it's still visually animating — it then re-clips/jumps
	// against whatever ancestor transform it was escaping (see _showPopover comment), which reads
	// as the dropdown "sliding down" right before it vanished. Waiting for the CSS transition to
	// finish keeps it promoted for the whole close animation; the timeout is a fallback in case
	// transitionend never fires (e.g. reduced-motion, no matching transition).
	_scheduleHidePopover() {
		const dropdown = this.shadowRoot.querySelector('.dropdown-menu');
		if (!dropdown?.hidePopover || !dropdown.matches(':popover-open')) return;
		clearTimeout(this._hideTimer);
		const finish = () => {
			dropdown.removeEventListener('transitionend', onEnd);
			clearTimeout(this._hideTimer);
			if (!this.isOpen) this._hidePopover();
		};
		const onEnd = (e) => { if (e.target === dropdown) finish(); };
		dropdown.addEventListener('transitionend', onEnd);
		this._hideTimer = setTimeout(finish, 450);
	}

	_toggleDropdown(e) {
		e.stopPropagation();
		if (this.disabled) return;
		this.isOpen = !this.isOpen;

		if (this.isOpen) {
			this.updateComplete.then(() => {
				this._showPopover();
				this._initCalendar();
				this._updateDropdownPosition();

				window.addEventListener('scroll', this._updateDropdownPosition, true);
				window.addEventListener('resize', this._updateDropdownPosition);
			});
		} else {
			this._closeDropdown();
		}
	}

	_updateDropdownPosition() {
		if (!this.isOpen) return;

		const trigger = this.shadowRoot.querySelector('.datetime-trigger');
		const dropdown = this.shadowRoot.querySelector('.dropdown-menu');
		if (!trigger || !dropdown) return;

		dropdown.style.width = '272px'; // Match library width

		const rect = trigger.getBoundingClientRect();
		const dropdownRect = dropdown.getBoundingClientRect();

		// .dropdown-menu renders in the top layer (popover) — its fixed position is always
		// relative to the true viewport, same coordinate space as getBoundingClientRect(),
		// so no ancestor-transform offset compensation is needed here.
		const margin = 8;
		const dropdownWidth = 272;

		let targetLeft = rect.left;
		if (targetLeft + dropdownWidth > window.innerWidth - margin) {
			targetLeft = window.innerWidth - dropdownWidth - margin;
		}
		if (targetLeft < margin) targetLeft = margin;

		dropdown.style.left = `${targetLeft}px`;

		const dropdownHeight = dropdownRect.height || 300; // Fallback if not yet rendered
		const spaceBelow = window.innerHeight - rect.bottom - margin;
		const spaceAbove = rect.top - margin;

		if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
			const actualHeight = Math.min(dropdownHeight, spaceAbove);
			dropdown.style.top = `${rect.top - actualHeight - 4}px`;
			dropdown.style.maxHeight = `${spaceAbove}px`;
		} else {
			dropdown.style.top = `${rect.bottom + 4}px`;
			dropdown.style.maxHeight = `${spaceBelow}px`;
		}
	}

	_initCalendar() {
		const calendarEl = this.shadowRoot.querySelector('#calendar');
		if (!calendarEl || this.calendar) return;

		const options = {
			type: this.type === 'datetime' ? 'default' : this.type,
			inputMode: false,
			selectedTheme: this.theme,
			dateMin: this.dateMin,
			dateMax: this.dateMax,
			selectionTimeMode: this.type === 'datetime' ? 24 : null,
			onClickDate: (self, event) => {
				this._handleSelection(self);
				if (this.type !== 'datetime') {
					this._closeDropdown();
				}
			},
			onChangeTime: (self) => {
				this._handleSelection(self);
			},
			onClickMonth: (self) => {
				if (this.type === 'month') {
					this.value = self.context.selectedMonth !== undefined ? (self.context.selectedMonth + 1).toString().padStart(2, '0') : '';
					this._closeDropdown();
					this._dispatchEvent();
				}
			},
			onClickYear: (self) => {
				if (this.type === 'year') {
					this.value = self.context.selectedYear?.toString() || '';
					this._closeDropdown();
					this._dispatchEvent();
				}
			},
		};

		this.calendar = new Calendar(calendarEl, options);
		this.calendar.init();
	}

	_handleSelection(self) {
		if (self.context.selectedDates && self.context.selectedDates[0]) {
			let newValue = self.context.selectedDates[0];
			if (self.context.selectedTime) {
				newValue += ', ' + self.context.selectedTime;
			}
			this.value = newValue;
		} else {
			this.value = '';
		}
		this._dispatchEvent();
	}

	_dispatchEvent() {
		this.dispatchEvent(
			new CustomEvent('change', {
				detail: { value: this.value },
				bubbles: true,
				composed: true,
			}),
		);
	}

	get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

	render() {
		const uiConfig = this.constructor.uiConfigs[this.ui || 'modern'];
		return html`
			<div class="${uiConfig.wrap}" style="--core-height: ${this.height}">
				<div class="${uiConfig.trigger} ${this.isOpen ? 'open' : ''} ${this.disabled ? 'disabled' : ''}" @click=${this._toggleDropdown}>
					<div class="selected-value ${!this.value ? 'placeholder' : ''}">${this.value || this.placeholder || this._txt.ph}</div>
					<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</div>

				<div class="${uiConfig.dropdown} ${this.isOpen ? 'show' : ''}" popover="manual">
					<div id="calendar"></div>
				</div>
			</div>
		`;
	}
}

if (!customElements.get('web-datetime')) {
	customElements.define('web-datetime', WebDateTime);
}

export default WebDateTime;
