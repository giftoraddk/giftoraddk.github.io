import { LitElement, html, css, unsafeCSS } from 'lit';
import tooltipStyles from './styles/web-tooltip.css?inline';

export class WebTooltip extends LitElement {
    static properties = {
        placement: { type: String },
        show: { type: Boolean, reflect: true },
        maxWidth: { type: String },
        ui: { type: String } // modern, spatial
    };

    static get uiConfigs() {
        return {
            modern: {
                content: 'tooltip-content',
            },
            spatial: {
                content: 'tooltip-content spatial',
            }
        }
    }

    static styles = [unsafeCSS(tooltipStyles)];

    constructor() {
        super();
        this.placement = 'top';
        this.show = false;
        this.maxWidth = '200px';
        this.ui = 'modern';
        this._handleMouseEnter = this._handleMouseEnter.bind(this);
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
        this._updatePosition = this._updatePosition.bind(this);
    }

    _handleMouseEnter() {
        this.show = true;
    }

    _handleMouseLeave() {
        this.show = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('mouseenter', this._handleMouseEnter);
        this.addEventListener('mouseleave', this._handleMouseLeave);
        this.addEventListener('focusin', this._handleMouseEnter);
        this.addEventListener('focusout', this._handleMouseLeave);
        window.addEventListener('scroll', this._updatePosition, true);
        window.addEventListener('resize', this._updatePosition);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('mouseenter', this._handleMouseEnter);
        this.removeEventListener('mouseleave', this._handleMouseLeave);
        this.removeEventListener('focusin', this._handleMouseEnter);
        this.removeEventListener('focusout', this._handleMouseLeave);
        window.removeEventListener('scroll', this._updatePosition, true);
        window.removeEventListener('resize', this._updatePosition);
    }

    updated(changedProperties) {
        if (!changedProperties.has('show')) return;
        if (this.show) {
            this._showPopover();
            this._updatePosition();
        } else {
            this._hidePopover();
        }
    }

    // Promote .tooltip-container to the top layer via the native Popover API — plain
    // position:fixed isn't enough if any ancestor has transform/filter/backdrop-filter
    // (creates a new containing block for fixed descendants) combined with overflow:hidden/
    // auto (then clips it, vd bên trong 1 khung chat scroll). Top-layer rendering bypasses cả
    // 2 trường hợp bất kể lồng sâu bao nhiêu — cùng kỹ thuật với web-dropdown/web-select/
    // web-popover, xem hook/web-apex.rst.
    _showPopover() {
        const content = this.shadowRoot.querySelector('.tooltip-container');
        if (content?.showPopover && !content.matches(':popover-open')) {
            try { content.showPopover(); } catch {}
        }
    }

    _hidePopover() {
        const content = this.shadowRoot.querySelector('.tooltip-container');
        if (content?.hidePopover && content.matches(':popover-open')) {
            try { content.hidePopover(); } catch {}
        }
    }

    _updatePosition() {
        if (!this.show) return;
        const content = this.shadowRoot.querySelector('.tooltip-container');
        // :host bọc sát trigger (display: inline-block, không tự position:fixed) — đo trực
        // tiếp :host thay vì phải lục slot, khác web-popover (trigger của nó có thể tự
        // position:fixed nên phải đo đúng element gán vào slot).
        const rect = this.getBoundingClientRect();
        if (!content || (!rect.width && !rect.height)) return;

        const cw = content.offsetWidth || 0;
        const ch = content.offsetHeight || 0;
        const gap = 8;
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // .tooltip-container render ở top layer (popover) — fixed luôn tính theo viewport thật,
        // cùng hệ toạ độ với getBoundingClientRect(), không cần bù offset ancestor transform.
        let top = this.placement === 'bottom' ? rect.bottom + gap
            : this.placement === 'top' ? rect.top - ch - gap
            : rect.top + rect.height / 2 - ch / 2;
        let left = this.placement === 'right' ? rect.right + gap
            : this.placement === 'left' ? rect.left - cw - gap
            : rect.left + rect.width / 2 - cw / 2;

        if (left + cw > vw - margin) left = vw - cw - margin;
        if (left < margin) left = margin;
        if (top + ch > vh - margin) top = vh - ch - margin;
        if (top < margin) top = margin;

        content.style.top = `${top}px`;
        content.style.left = `${left}px`;
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
            <div class="tooltip-trigger">
                <slot id="trigger-slot" @slotchange=${this._handleSlotChange}></slot>
            </div>
            <div class="tooltip-container ${uiConfig.content} ${this.placement} ${this.show ? 'show' : ''}" popover="manual">
                <slot name="content" id="content-slot"></slot>
            </div>
        `;
    }

    _handleSlotChange() {
        const slot = this.shadowRoot.querySelector('#trigger-slot');
        const nodes = slot.assignedNodes({ flatten: true }).filter(node => node.nodeType === Node.ELEMENT_NODE);

        if (nodes.length >= 2) {
            // If we have at least 2 elements, the second one is likely intended as content
            // if it doesn't have a slot="content" attribute yet.
            const contentNode = nodes[1];
            if (!contentNode.getAttribute('slot')) {
                contentNode.setAttribute('slot', 'content');
            }
        }
    }
}

customElements.define('web-tooltip', WebTooltip);
