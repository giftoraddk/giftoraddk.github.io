import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-fab.css?inline'
import '@/webs/apex/web-button.js'
import 'iconify-icon'

// height passed to web-button, scaled off the same --height-selector chain it already falls back to
const SIZE_SCALE = { sm: 0.75, md: 1, lg: 1.25, xl: 1.5 }
const VARIANTS = {
    primary:   { type: 'fill', color: 'primary' },
    secondary: { type: 'fill', color: 'secondary' },
    base:      { type: 'soft', color: 'base-content' },
}

export class WebFab extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        icon: { type: String },
        badge: { type: String }, // small corner badge (eg. cart/unread count) — falsy hides it
        theme: { type: String },
        position: { type: String }, // CSS position type: 'fixed' (default), 'absolute', 'static'
        // Corner/coordinate on the positioned box's containing block. '%' is
        // edge-relative (0% flush start edge, 100% flush end edge, self-compensating
        // for the fab's own size — same math as CSS background-position); any other
        // unit (px, rem, …) is a literal inset from the start edge (left/top), no
        // compensation. x default '100%' + y default '1rem' → flush right, near top.
        x: { type: String },
        y: { type: String },
        size: { type: String }, // 'sm', 'md', 'lg'
        variant: { type: String }, // 'primary', 'secondary', 'base'
        ui: { type: String }, // modern, spatial
        // Named `movable`, not `draggable` — that name shadows the native HTML
        // draggable attribute/property, which turns on the browser's own HTML5
        // drag-and-drop and hijacks mousemove, breaking the mouse-based drag below.
        movable: { type: Boolean },
        _isDragging: { state: true },
        _hasMoved: { state: true }
    }

    constructor() {
        super()
        this.icon = 'lucide:plus'
        this.badge = ''
        this.theme = ''
        this.position = 'fixed'
        this.x = '99%'
        this.y = '1%'
        this.size = 'md'
        this.variant = 'primary'
        this.ui = 'modern'
        this.movable = false

        this._isDragging = false
        this._hasMoved = false
        this._dragged = false // once true, a manual drag has placed the fab — never re-apply x/y again
        this._startX = 0
        this._startY = 0
        this._initialX = 0
        this._initialY = 0

        this._handleMouseMove = this._handleMouseMove.bind(this)
        this._handleMouseUp = this._handleMouseUp.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        window.addEventListener('mousemove', this._handleMouseMove)
        window.addEventListener('mouseup', this._handleMouseUp)
        window.addEventListener('touchmove', this._handleMouseMove, { passive: false })
        window.addEventListener('touchend', this._handleMouseUp)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener('mousemove', this._handleMouseMove)
        window.removeEventListener('mouseup', this._handleMouseUp)
        window.removeEventListener('touchmove', this._handleMouseMove)
        window.removeEventListener('touchend', this._handleMouseUp)
    }

    // Position/drag act on `this` (the host), never the inner <web-button> — the
    // host is the light-DOM node any consumer (e.g. web-popover's slotted-trigger
    // measurement) sees and measures, so it has to be the element that's actually
    // position:fixed and the one that visually moves.
    _handleMouseDown(e) {
        if (!this.movable) return
        this._isDragging = true
        this._hasMoved = false
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY

        this._startX = clientX
        this._startY = clientY

        const rect = this.getBoundingClientRect()
        this._initialX = rect.left
        this._initialY = rect.top
    }

    _handleMouseMove(e) {
        if (!this._isDragging) return

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY

        const dx = clientX - this._startX
        const dy = clientY - this._startY

        // Threshold to distinguish click from drag
        if (!this._hasMoved && Math.sqrt(dx * dx + dy * dy) > 5) {
            this._hasMoved = true
            this._dragged = true
            this.style.transition = 'none'
            // x/y positioning (left/top + --fab-tx/--fab-ty) is now superseded by
            // literal px left/top below — clear it so it can't double-offset the drag.
            this.style.removeProperty('--fab-tx')
            this.style.removeProperty('--fab-ty')
            if (e.type === 'touchmove') e.preventDefault()
        }

        if (this._hasMoved) {
            if (e.type === 'touchmove') e.preventDefault()
            let newX = this._initialX + dx
            let newY = this._initialY + dy

            // Constrain to viewport
            const rect = this.getBoundingClientRect()
            newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX))
            newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY))

            this.style.zIndex = '99'
            this.style.position = 'fixed'
            this.style.left = `${newX}px`
            this.style.top = `${newY}px`
            this.style.bottom = 'auto'
            this.style.right = 'auto'

            this.dispatchEvent(new CustomEvent('drag', { bubbles: true, composed: true }))
        }
    }

    _handleMouseUp(e) {
        if (!this._isDragging) return
        this._isDragging = false
        this.style.transition = ''

        if (this._hasMoved) {
            // Prevent the subsequent click event
            e.preventDefault()
            e.stopPropagation()
            // Reset moved state after a tick to allow _handleClick to see it if needed
            setTimeout(() => { this._hasMoved = false }, 0)
        }
    }

    _handleClick(e) {
        if (this._hasMoved) {
            e.preventDefault()
            e.stopPropagation()
            this._hasMoved = false // Reset for next interaction
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
        // Reflected onto the host (not a shadow-DOM class) — see web-fab.css's
        // `:host(.dragging)` rule, styling the same element the drag JS moves.
        if (changedProperties.has('_hasMoved')) {
            this.classList.toggle('dragging', this._hasMoved)
        }
        this._dcApplyPosition()
    }

    // Resolves position/x/y onto the host's own inline style — attribute selectors
    // can't match arbitrary x/y values, so left/top/position + the --fab-tx/--fab-ty
    // custom props (consumed by web-fab.css's `transform`) are set directly here.
    _dcApplyPosition() {
        if (this._dragged) return // a manual drag already owns left/top — never overwrite it

        this.style.position = this.position || 'fixed'
        if (this.position === 'static') {
            this.style.left = this.style.top = this.style.right = this.style.bottom = ''
            this.style.removeProperty('--fab-tx')
            this.style.removeProperty('--fab-ty')
            return
        }

        const isPct = v => typeof v === 'string' && v.trim().endsWith('%')
        this.style.left = this.x
        this.style.top = this.y
        this.style.right = 'auto'
        this.style.bottom = 'auto'
        this.style.setProperty('--fab-tx', isPct(this.x) ? `-${this.x}` : '0')
        this.style.setProperty('--fab-ty', isPct(this.y) ? `-${this.y}` : '0')
    }

    render() {
        const { type, color } = VARIANTS[this.variant] || VARIANTS.primary
        const scale = SIZE_SCALE[this.size] || SIZE_SCALE.md

        return html`
            <div class="drag-overlay" style="display: ${this._hasMoved ? 'block' : 'none'}"></div>
            <div class="fab-inner">
                <web-button
                    type=${type}
                    color=${color}
                    height="calc(var(--height-selector, 2.25rem) * ${scale})"
                    fontSize="calc(1rem * ${scale})"
                    rounded="50%"
                    square
                    ui=${this.ui}
                    theme=${this.theme}
                    @mousedown=${this._handleMouseDown}
                    @touchstart=${this._handleMouseDown}
                    @click=${this._handleClick}
                >
                    <iconify-icon icon="${this.icon}"></iconify-icon>
                </web-button>
                ${this.badge ? html`<span class="fab-badge">${this.badge}</span>` : ''}
            </div>
        `
    }
}

if (!customElements.get('web-fab')) {
    customElements.define('web-fab', WebFab)
}

export default WebFab
