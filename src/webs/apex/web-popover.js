import { LitElement, html, unsafeCSS } from 'lit';
import styles from './styles/web-popover.css?inline';
import { cssInline } from '@/services/helper.js';

export class WebPopover extends LitElement {
	static shadowRootOptions = { mode: 'open' };
	static styles = [unsafeCSS(styles)];

	static properties = {
		open: { type: Boolean, state: true },
		theme: { type: String },
		ui: { type: String }, // modern, spatial
		placement: { type: String }, // 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
		placementGap: { type: Number }, // gap between trigger and content (px)
		stys: { type: Object }, // style for content
		persistent: { type: Boolean }, // true → outside-click does NOT auto-close (caller must close explicitly, e.g. an unsent voice recording)
	};

	static get uiConfigs() {
		return {
			modern: {
				wrap: 'modern web-popover',
				content: 'web-popover-content',
			},
			spatial: {
				wrap: 'spatial web-popover',
				content: 'spatial web-popover-content',
			},
		};
	}

	constructor() {
		super();
		this.open = false;
		this.theme = '';
		this.ui = 'modern';
		this.placement = 'bottom-start';
		this.placementGap = 4;
		this.persistent = false;
		this._handleOutsideClick = this._handleOutsideClick.bind(this);
		this._updatePosition = this._updatePosition.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('mousedown', this._handleOutsideClick);
		window.addEventListener('scroll', this._updatePosition, true);
		window.addEventListener('resize', this._updatePosition);
		this.addEventListener('drag', this._updatePosition);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		window.removeEventListener('mousedown', this._handleOutsideClick);
		window.removeEventListener('scroll', this._updatePosition, true);
		window.removeEventListener('resize', this._updatePosition);
		this.removeEventListener('drag', this._updatePosition);
	}

	updated(changedProperties) {
		if (changedProperties.has('theme') && this.theme) {
			this.setAttribute('data-theme', this.theme);
		} else if (changedProperties.has('theme') && !this.theme) {
			this.removeAttribute('data-theme');
		}
		if (changedProperties.has('open')) {
			if (this.open) {
				this._showPopover();
				this._updatePosition();
			} else {
				this._hidePopover();
			}
		}
	}

	_toggle(e) {
		e.stopPropagation();
		this.open = !this.open;
	}

	_handleOutsideClick(e) {
		if (!this.open || this.persistent) return;
		const path = e.composedPath();
		if (!path.includes(this)) {
			this.open = false;
		}
	}

	// Promote .web-popover-content to the top layer via the native Popover API — plain
	// position:fixed isn't enough if any ancestor has transform/filter/backdrop-filter
	// (creates a new containing block for fixed descendants) combined with overflow:hidden
	// (then clips it). Top-layer rendering bypasses both regardless of nesting depth.
	_showPopover() {
		const content = this.shadowRoot.querySelector('.web-popover-content');
		if (content?.showPopover && !content.matches(':popover-open')) {
			try { content.showPopover(); } catch {}
		}
	}

	_hidePopover() {
		const content = this.shadowRoot.querySelector('.web-popover-content');
		if (content?.hidePopover && content.matches(':popover-open')) {
			try { content.hidePopover(); } catch {}
		}
	}

	// Measures the actual slotted trigger element, not the `.web-popover-trigger`
	// wrapper div. A wrapper's own rect stops tracking its content the moment that
	// content becomes position:fixed itself (e.g. a draggable FAB trigger) — the
	// child is taken out of flow, so the wrapper collapses instead of following it.
	// getBoundingClientRect() on the slotted element itself is always correct,
	// regardless of its own position scheme.
	_triggerRect() {
		const slot = this.shadowRoot.querySelector('slot[name="trigger"]');
		const assigned = slot?.assignedElements({ flatten: true }) ?? [];
		const el = assigned[0] ?? this.shadowRoot.querySelector('.web-popover-trigger');
		return el?.getBoundingClientRect() ?? null;
	}

	_updatePosition() {
		if (!this.open) return;
		const tr = this._triggerRect();
		const content = this.shadowRoot.querySelector('.web-popover-content');
		if (!tr || !content) return;

		// .web-popover-content renders in the top layer (popover) — its fixed position is always
		// relative to the true viewport, same coordinate space as getBoundingClientRect(),
		// so no ancestor-transform offset compensation is needed here anymore.
		const cw = content.offsetWidth || 200;
		const ch = (content.scrollHeight || content.offsetHeight) + 8;
		const gap = parseFloat(this.placementGap || 4);
		const margin = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const [side, align] = (this.placement || 'bottom-start').split('-');

		// 1. Calculate initial position based on placement
		let top = side === 'top' ? tr.top - ch - gap : tr.bottom + gap;
		let left = align === 'end' ? tr.right - cw : tr.left;

		// 2. Clamp vertical: flip if overflows
		if (side === 'bottom' && top + ch > vh - margin) {
			top = tr.top - ch - gap;
		} else if (side === 'top' && top < margin) {
			top = tr.bottom + gap;
		}
		if (top < margin) top = margin;

		// 3. Clamp horizontal: keep within viewport
		if (left + cw > vw - margin) left = vw - cw - margin;
		if (left < margin) left = margin;

		content.style.top = `${top}px`;
		content.style.left = `${left}px`;
		content.style.right = 'auto';
	}

	render() {
		const uiConfig = this.constructor.uiConfigs[this.ui || 'modern'];
		const inlineStyle = cssInline(this.stys || {});
		return html`
			<div class="${uiConfig.wrap}" style="${inlineStyle}">
				<div class="web-popover-trigger" @click=${this._toggle}>
					<slot name="trigger"></slot>
				</div>
				<div class="${uiConfig.content} ${this.open ? 'show' : ''}" popover="manual">
					<slot></slot>
				</div>
			</div>
		`;
	}
}

if (!customElements.get('web-popover')) {
	customElements.define('web-popover', WebPopover);
}

export default WebPopover;
