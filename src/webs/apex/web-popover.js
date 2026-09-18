import { LitElement, html, unsafeCSS } from 'lit';
import styles from './styles/web-popover.css?inline';
import { cssInline } from '@/services/helper.js';

const TXT_STD = {
	vi: { fullscreenEnter: 'Phóng to', fullscreenExit: 'Thu nhỏ', close: 'Đóng' },
	en: { fullscreenEnter: 'Fullscreen', fullscreenExit: 'Exit fullscreen', close: 'Close' },
};

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
		manualClose: { type: Boolean }, // true → CHỈ đóng khi cha tự set open=false (vd 1 nút "Đóng" riêng bên trong) — chặn CẢ outside-click LẪN bấm lại trigger để đóng (persistent chỉ chặn outside-click, trigger bấm lại vẫn đóng bình thường)
		fullscreen: { type: Boolean }, // true → hiện nút toggle fullscreen ở góc .web-popover-content
		closeable: { type: Boolean }, // true → hiện nút đóng ở góc .web-popover-content, kế nút fullscreen
		lang: { type: String },
		txt: { type: Object },
		_fullscreen: { type: Boolean, state: true },
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
		this.placementGap = 0;
		this.persistent = false;
		this.manualClose = false;
		this.fullscreen = false;
		this.closeable = false;
		this.lang = 'vi';
		this.txt = null;
		this._fullscreen = false;
		this._handleOutsideClick = this._handleOutsideClick.bind(this);
		this._updatePosition = this._updatePosition.bind(this);
		this._markDragged = this._markDragged.bind(this);
		this._toggleFullscreen = this._toggleFullscreen.bind(this);
		this._close = this._close.bind(this);
		// true trong khoảng giữa lượt kéo (trigger, vd <web-fab movable>, tự phát event 'drag' —
		// xem web-fab.js's _handleMouseMove) và cú click "thả tay" ngay sau đó — trình duyệt vẫn tự
		// phát 1 click synthetic lên đúng phần tử đang ở dưới con trỏ lúc thả ra dù đã kéo đi rất xa,
		// nên _toggle() dưới đây không thể chỉ dựa vào "click có đúng target hay không" để phân biệt
		// kéo-thả với bấm thật — phải tự đánh dấu qua chính event 'drag' đã có sẵn.
		this._suppressNextToggle = false;
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('mousedown', this._handleOutsideClick);
		window.addEventListener('scroll', this._updatePosition, true);
		window.addEventListener('resize', this._updatePosition);
		this.addEventListener('drag', this._updatePosition);
		this.addEventListener('drag', this._markDragged);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		window.removeEventListener('mousedown', this._handleOutsideClick);
		window.removeEventListener('scroll', this._updatePosition, true);
		window.removeEventListener('resize', this._updatePosition);
		this.removeEventListener('drag', this._updatePosition);
		this.removeEventListener('drag', this._markDragged);
	}

	_markDragged() {
		this._suppressNextToggle = true;
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
				// Mỗi lần mở lại luôn bắt đầu ở chế độ thường — fullscreen không "dính" qua lượt mở kế tiếp.
				this._fullscreen = false;
			}
		}
		if (changedProperties.has('_fullscreen') && this.open) this._updatePosition();
	}

	_toggle(e) {
		e.stopPropagation();
		// Vừa kéo trigger xong (xem _markDragged) — bỏ qua đúng 1 click "thả tay" này, không toggle,
		// rồi xoá cờ ngay để lần bấm THẬT kế tiếp vẫn hoạt động bình thường.
		if (this._suppressNextToggle) {
			this._suppressNextToggle = false;
			return;
		}
		// manualClose — đang mở thì bấm lại trigger KHÔNG đóng (chỉ đóng qua cha tự set open=false,
		// vd 1 nút "Đóng" riêng) — vẫn cho mở bình thường lúc đang đóng.
		if (this.open && this.manualClose) return;
		this.open = !this.open;
	}

	get _txt() {
		const d = this.txt ?? TXT_STD;
		return d[this.lang] ?? d.vi ?? {};
	}

	_toggleFullscreen(e) {
		e.stopPropagation();
		this._fullscreen = !this._fullscreen;
	}

	// Nút "Đóng" riêng bên trong content (closeable) — luôn đóng được bất kể manualClose (đúng cái
	// "nút Đóng riêng" mà comment của manualClose ở trên nhắc tới), khác với bấm lại trigger/bấm ra
	// ngoài (2 đường đóng bị manualClose/persistent chặn).
	_close(e) {
		e.stopPropagation();
		this.open = false;
	}

	_handleOutsideClick(e) {
		if (!this.open || this.persistent || this.manualClose) return;
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

	// Fullscreen: near-full-viewport box instead of trigger-relative placement. Sets an explicit
	// width (normally left auto — see _updatePosition()'s reset of it below) so
	// .web-popover-content becomes a definite-size containing block on BOTH axes, same trick
	// already relied on for height; the ::slotted(*) rule in the CSS is what actually stretches
	// the slotted panel (e.g. .tlk-panel/.aid-panel, both fixed-px-wide by default) to fill it.
	_applyFullscreen(content) {
		const inset = 16;
		content.style.top = `${inset}px`;
		content.style.left = `${inset}px`;
		content.style.right = 'auto';
		content.style.width = `${window.innerWidth - inset * 2}px`;
		content.style.height = `${window.innerHeight - inset * 2}px`;
	}

	_updatePosition() {
		if (!this.open) return;
		const content = this.shadowRoot.querySelector('.web-popover-content');
		if (!content) return;

		// Clear any size cap left from a previous run before measuring — otherwise scrollHeight/
		// offsetWidth would reflect the already-clamped layout instead of the content's true,
		// unconstrained size (e.g. a slotted panel using height:100% would already have collapsed
		// to fit the previous clamp, so its natural full height could never be re-measured). Width
		// is only ever set inline by _applyFullscreen() below — normal mode needs it back at auto.
		content.style.height = '';
		content.style.width = '';

		if (this._fullscreen) {
			this._applyFullscreen(content);
			return;
		}

		const tr = this._triggerRect();
		if (!tr) return;

		// .web-popover-content renders in the top layer (popover) — its fixed position is always
		// relative to the true viewport, same coordinate space as getBoundingClientRect(),
		// so no ancestor-transform offset compensation is needed here anymore.
		const cw = content.offsetWidth || 200;
		// +20% over the content's raw measured size — still hard-clamped to `available` below,
		// so this only gives content extra breathing room when the viewport has space to spare
		// (e.g. a flex panel like .tlk-panel gets a taller message area instead of hugging its
		// own minimum content height); it never pushes the popover past the viewport edge.
		const HEIGHT_BOOST = 1.36;
		const naturalH = ((content.scrollHeight || content.offsetHeight) + 8) * HEIGHT_BOOST;
		const gap = parseFloat(this.placementGap || 4);
		const margin = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const [side, align] = (this.placement || 'bottom-start').split('-');

		const spaceBelow = vh - margin - (tr.bottom + gap);
		const spaceAbove = tr.top - gap - margin;

		// 1. Pick whichever side has room for the full content. Only flip off the
		// requested side when it can't fit AND the other side genuinely has more
		// space — otherwise flipping just moves the cut-off to the other edge
		// (e.g. a fab pinned near the bottom: 'bottom' placement has little room
		// below, but flipping to 'top' only helps if there's more room above it).
		let resolvedSide = side;
		if (side === 'bottom' && naturalH > spaceBelow && spaceAbove > spaceBelow) {
			resolvedSide = 'top';
		} else if (side === 'top' && naturalH > spaceAbove && spaceBelow > spaceAbove) {
			resolvedSide = 'bottom';
		}

		// 2. Cap height to whatever's actually available on the resolved side, so content
		// that still doesn't fit scrolls internally (see overflow-y:auto in the CSS)
		// instead of spilling past the viewport edge and getting visually cut off.
		const available = Math.max(resolvedSide === 'top' ? spaceAbove : spaceBelow, 100);
		const ch = Math.min(naturalH, available);

		let top = resolvedSide === 'top' ? tr.top - ch - gap : tr.bottom + gap;
		let left = align === 'end' ? tr.right - cw : tr.left;

		if (top < margin) top = margin;
		if (top + ch > vh - margin) top = Math.max(margin, vh - margin - ch);

		// 3. Clamp horizontal: keep within viewport
		if (left + cw > vw - margin) left = vw - cw - margin;
		if (left < margin) left = margin;

		content.style.top = `${top}px`;
		content.style.left = `${left}px`;
		content.style.right = 'auto';
		// Always an explicit px height (not just a conditional max-height): this is what makes
		// .web-popover-content a "definite height" containing block, so a slotted panel that
		// fills it with height:100% (see e.g. svc-talk.css's .tlk-panel) shrinks to match exactly
		// and can push the shrinkage into its own internal scroll region instead of relying on
		// this outer overflow-y:auto — which stays only as a fallback for plain content that
		// doesn't manage its own internal scrolling.
		content.style.height = `${ch}px`;
	}

	render() {
		const uiConfig = this.constructor.uiConfigs[this.ui || 'modern'];
		const inlineStyle = cssInline(this.stys || {});
		return html`
			<div class="${uiConfig.wrap}" style="${inlineStyle}">
				<div class="web-popover-trigger" @click=${this._toggle}>
					<slot name="trigger"></slot>
				</div>
				<div class="${uiConfig.content} ${this.open ? 'show' : ''} ${this._fullscreen ? 'fullscreen' : ''}" popover="manual">
					${(this.fullscreen || this.closeable) ? html`
						<div class="web-popover-actions">
							${this.fullscreen ? html`
								<button class="web-popover-fullscreen-btn ${this._fullscreen ? 'is-active' : ''}"
									title=${this._fullscreen ? this._txt.fullscreenExit : this._txt.fullscreenEnter}
									@click=${this._toggleFullscreen}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="currentColor" d="M10 3H3v7h2V5h5zm0 16H5v-5H3v7h7zm11-5h-2v5h-5v2h7zm0-11h-7v2h5v5h2z" />
                  </svg>
								</button>
							` : ''}
							${this.closeable ? html`
								<button class="web-popover-close-btn" title=${this._txt.close} @click=${this._close}>
									<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 9l-6 6m0-6l6 6m6-3a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />
                  </svg>
								</button>
							` : ''}
						</div>
					` : ''}
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
