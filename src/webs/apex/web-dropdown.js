import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-dropdown.css?inline'
import { cssInline } from '@/services/helper.js';
import 'iconify-icon'
import './web-button.js'

export class WebDropdown extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        label: { type: String },
        icon: { type: String },
        items: { type: Array }, // [{ label, icon, value, classes }]
        disabled: { type: Boolean },
        theme: { type: String },
        stys: { type: Object },
        ui: { type: String }, // modern, spatial
        isOpen: { type: Boolean, state: true },
        height: { type: String },
        placement: { type: String }, // 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
        placementGap: { type: Number }, // gap between trigger and menu (px)
        opt: { type: Object }, // button options: { type, color, rounded, square, prefix, suffix, fontSize, ... }
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-dropdown',
                trigger: 'dropdown-trigger',
                menu: 'dropdown-menu shadow-lg rounded-xl',
                item: 'option-item'
            },
            spatial: {
                wrap: 'spatial web-dropdown',
                trigger: 'dropdown-trigger rounded-full',
                menu: 'dropdown-menu backdrop-blur-xl border border-white/20 rounded-3xl',
                item: 'option-item hover:bg-white/10'
            }
        }
    }

    constructor() {
        super()
        this.label = ''
        this.icon = ''
        this.items = []
        this.disabled = false
        this.theme = ''
        this.ui = 'modern'
        this.isOpen = false
        this.height = '36px'
        this.placement = 'bottom-start'
        this.placementGap = 8
        this.opt = {}
        this._hideTimer = null
        this._handleOutsideClick = this._handleOutsideClick.bind(this)
        this._updateDropdownPosition = this._updateDropdownPosition.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        window.addEventListener('mousedown', this._handleOutsideClick, { capture: true })
        window.addEventListener('scroll', this._updateDropdownPosition, true)
        window.addEventListener('resize', this._updateDropdownPosition)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        clearTimeout(this._hideTimer)
        window.removeEventListener('mousedown', this._handleOutsideClick, { capture: true })
        window.removeEventListener('scroll', this._updateDropdownPosition, true)
        window.removeEventListener('resize', this._updateDropdownPosition)
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
        if (changedProperties.has('isOpen') && this.isOpen) {
            this._showPopover()
            this._updateDropdownPosition()
        }
    }

    _handleOutsideClick(e) {
        if (!this.isOpen) return
        const isInside = e.composedPath().includes(this)
        if (!isInside) {
            this._closeDropdown()
        }
    }

    _closeDropdown() {
        this.isOpen = false
        const menu = this.shadowRoot.querySelector('.dropdown-menu')
        if (menu) menu.style.maxHeight = ''
        this._scheduleHidePopover()
    }

    // Promote .dropdown-menu to the top layer via the native Popover API — plain
    // position:fixed isn't enough if any ancestor has transform/filter/backdrop-filter
    // (creates a new containing block for fixed descendants) combined with overflow:hidden
    // (then clips it). Top-layer rendering bypasses both regardless of nesting depth.
    _showPopover() {
        clearTimeout(this._hideTimer)
        const menu = this.shadowRoot.querySelector('.dropdown-menu')
        if (menu?.showPopover && !menu.matches(':popover-open')) {
            try { menu.showPopover() } catch {}
        }
    }

    _hidePopover() {
        const menu = this.shadowRoot.querySelector('.dropdown-menu')
        if (menu?.hidePopover && menu.matches(':popover-open')) {
            try { menu.hidePopover() } catch {}
        }
    }

    // Removing from the top layer immediately (synchronous hidePopover()) mid fade-out drops the
    // menu back into normal flow while it's still visually animating — it then re-clips/jumps
    // against whatever ancestor transform it was escaping (see _showPopover comment), which reads
    // as the menu "sliding down" right before it vanished. Waiting for the CSS transition to finish
    // keeps it promoted for the whole close animation; the timeout is a fallback in case
    // transitionend never fires (e.g. reduced-motion, no matching transition).
    _scheduleHidePopover() {
        const menu = this.shadowRoot.querySelector('.dropdown-menu')
        if (!menu?.hidePopover || !menu.matches(':popover-open')) return
        clearTimeout(this._hideTimer)
        const finish = () => {
            menu.removeEventListener('transitionend', onEnd)
            clearTimeout(this._hideTimer)
            if (!this.isOpen) this._hidePopover()
        }
        const onEnd = (e) => { if (e.target === menu) finish() }
        menu.addEventListener('transitionend', onEnd)
        this._hideTimer = setTimeout(finish, 450)
    }

    _toggleDropdown(e) {
        e.stopPropagation()
        if (this.disabled) return
        this.isOpen = !this.isOpen
    }

    _updateDropdownPosition() {
        if (!this.isOpen) return

        const trigger = this.shadowRoot.querySelector('.dropdown-trigger')
        const menu = this.shadowRoot.querySelector('.dropdown-menu')
        if (!trigger || !menu) return

        // .dropdown-menu renders in the top layer (popover) — its fixed position is always
        // relative to the true viewport, same coordinate space as getBoundingClientRect(),
        // so no ancestor-transform offset compensation is needed here anymore.
        const tr = trigger.getBoundingClientRect()
        const mw = Math.max(tr.width, 160)
        const mh = (menu.scrollHeight || menu.offsetHeight) + 8
        const gap = parseFloat(this.placementGap || 8)
        const margin = 8
        const vw = window.innerWidth
        const vh = window.innerHeight

        const [side, align] = (this.placement || 'bottom-start').split('-')

        // 1. Calculate initial position based on placement
        let top = side === 'top' ? tr.top - mh - gap : tr.bottom + gap
        let left = align === 'end' ? tr.right - mw : tr.left

        // 2. Clamp vertical: flip if overflows
        if (side === 'bottom' && top + mh > vh - margin) {
            top = tr.top - mh - gap
        } else if (side === 'top' && top < margin) {
            top = tr.bottom + gap
        }
        if (top < margin) top = margin

        // 3. Clamp horizontal: keep within viewport
        if (left + mw > vw - margin) left = vw - mw - margin
        if (left < margin) left = margin

        menu.style.minWidth = `${mw}px`
        menu.style.top = `${top}px`
        menu.style.left = `${left}px`
        menu.style.right = 'auto'
    }

    _selectItem(item) {
        this.dispatchEvent(new CustomEvent('clicked', {
            detail: { name: 'dropdown', value: item },
            bubbles: true,
            composed: true
        }))
        this._closeDropdown()
    }

    render() {
        const o = this.opt || {};
        const style = cssInline({
            '--core-height': this.height,
            ...(this.stys || {})
        });
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern'];
        const iconOnly = !this.label && !!this.icon;

        return html`
      <div class="${uiConfig.wrap}" style="${style}">

        <web-button 
          class="${uiConfig.trigger} ${this.isOpen ? 'open' : ''}"
          .disabled=${this.disabled}
          .height=${this.height}
          .theme=${this.theme}
          .ui=${this.ui}
          .type=${o.type || (iconOnly ? 'ghost' : 'outline')}
          .color=${o.color || ''}
          
          .rounded=${o.rounded || ''}
          
          .square=${o.square !== undefined ? o.square : iconOnly}
          
          
          .fontSize=${o.fontSize || '1rem'}
          .prefix=${o.prefix || ''}
          .suffix=${o.suffix || ''}
          @click=${this._toggleDropdown}
          style="pointer-events: ${this.disabled ? 'none' : 'auto'};"
        >
          ${this.icon ? html`<iconify-icon icon="${this.icon}" slot="prefix"></iconify-icon>` : ''}
          ${this.label ? html`<span>${this.label}</span>` : ''}
          <slot name="trigger"></slot>
        </web-button>

        <div class="${uiConfig.menu} ${this.isOpen ? 'show' : ''}" popover="manual">
          <div class="options-list">
            ${this.items.map(item => html`
              <div class="${uiConfig.item} ${item.classes || ''}" @click=${() => this._selectItem(item)}>
                ${item.icon ? html`<iconify-icon icon="${item.icon}"></iconify-icon>` : ''}
                <span>${item.label || item.name || item.value}</span>
              </div>
            `)}
            <slot name="menu"></slot>
          </div>
        </div>
      </div>
    `
    }
}

if (!customElements.get('web-dropdown')) {
    customElements.define('web-dropdown', WebDropdown)
}

export default WebDropdown
