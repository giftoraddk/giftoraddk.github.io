import { LitElement, html, unsafeCSS } from 'lit'
import styles from './css/web-checkbox.css?inline'
import pastelStyles from './css/pastel.css?inline'

export class WebCheckbox extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(pastelStyles), unsafeCSS(styles)]

    static properties = {
        checked: { type: Boolean, reflect: true },
        disabled: { type: Boolean },
        label: { type: String },
        color: { type: String }, // primary, secondary, accent, info, warning, success, error — trống: primary (modern) / tint a→b (pastel)
        theme: { type: String },
        ui: { type: String }, // modern, pastel
        rounded: { type: String } // custom border-radius cho .checkbox-box, vd "50%" — để trống dùng mặc định 6px (--checkbox-radius)
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-checkbox',
            },
            pastel: {
                wrap: 'pastel web-checkbox',
            }
        }
    }

    constructor() {
        super()
        this.checked = false
        this.disabled = false
        this.label = ''
        this.color = ''
        this.theme = ''
        this.ui = 'modern'
        this.rounded = ''
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
    }

    _toggle() {
        if (this.disabled) return
        this.checked = !this.checked
        this.dispatchEvent(new CustomEvent('change', {
            detail: { checked: this.checked },
            bubbles: true,
            composed: true
        }))
    }

    _handleKeydown(e) {
        if (this.disabled) return
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            this._toggle()
        }
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
      <div 
        class="${uiConfig.wrap} ${this.color ? `color-${this.color}` : ''} ${this.checked ? 'checked' : ''} ${this.disabled ? 'disabled' : ''}" 
        @click=${this._toggle}
        @keydown=${this._handleKeydown}
        role="checkbox"
        aria-checked="${this.checked}"
        aria-disabled="${this.disabled}"
        tabindex="${this.disabled ? '-1' : '0'}"
      >
        <div class="checkbox-box" style="${this.rounded ? `--checkbox-radius: ${this.rounded}` : ''}">
          <svg class="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 12 9 17 20 6"></polyline>
          </svg>
        </div>
        ${this.label ? html`<span class="label">${this.label}</span>` : ''}
      </div>
    `
    }
}

if (!customElements.get('web-checkbox')) {
    customElements.define('web-checkbox', WebCheckbox)
}

export default WebCheckbox
