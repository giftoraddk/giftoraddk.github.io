import { LitElement, html, unsafeCSS } from 'lit'
import styles from './css/web-toggle.css?inline'
import pastelStyles from './css/pastel.css?inline'

export class WebToggle extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(pastelStyles), unsafeCSS(styles)]

    static properties = {
        active: { type: Boolean, reflect: true },
        disabled: { type: Boolean },
        label: { type: String },
        color: { type: String }, // primary, secondary, accent, info, warning, success, error — trống: primary (modern) / tint a→b (pastel)
        theme: { type: String },
        ui: { type: String } // modern, pastel
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-toggle',
            },
            pastel: {
                wrap: 'pastel web-toggle',
            }
        }
    }

    constructor() {
        super()
        this.active = false
        this.disabled = false
        this.label = ''
        this.color = ''
        this.theme = ''
        this.ui = 'modern'
        // On the host, not the inner box: a click anywhere on it — a screen reader's, the keyboard's or a script's
        // el.click() (svc-node's panel agent) — toggles it.
        this.addEventListener('click', () => this._toggle())
        this.addEventListener('keydown', (e) => {
            if (e.key !== ' ' && e.key !== 'Enter') return
            e.preventDefault()
            this._toggle()
        })
    }

    // A switch to assistive tech (and to the panel agent's snapshot): role, focus, state, name — the page may still set
    // its own role / tabindex / aria-label.
    connectedCallback() {
        super.connectedCallback()
        if (!this.hasAttribute('role')) this.setAttribute('role', 'switch')
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0')
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
        this.setAttribute('aria-checked', String(this.active))
        this.toggleAttribute('aria-disabled', this.disabled)
        if (this.label && !this.hasAttribute('aria-label')) this.setAttribute('aria-label', this.label)
    }

    _toggle() {
        if (this.disabled) return
        this.active = !this.active
        this.dispatchEvent(new CustomEvent('change', {
            detail: { active: this.active },
            bubbles: true,
            composed: true
        }))
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
      <div class="${uiConfig.wrap} ${this.color ? `color-${this.color}` : ''} ${this.active ? 'active' : ''} ${this.disabled ? 'disabled' : ''}">
        <div class="toggle-track">
          <div class="toggle-thumb"></div>
        </div>
        ${this.label ? html`<span class="label">${this.label}</span>` : ''}
      </div>
    `
    }
}

if (!customElements.get('web-toggle')) {
    customElements.define('web-toggle', WebToggle)
}

export default WebToggle
