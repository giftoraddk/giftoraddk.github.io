import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-toggle.css?inline'

export class WebToggle extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        active: { type: Boolean, reflect: true },
        disabled: { type: Boolean },
        label: { type: String },
        theme: { type: String },
        ui: { type: String } // modern, spatial
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-toggle',
            },
            spatial: {
                wrap: 'spatial web-toggle glass',
            }
        }
    }

    constructor() {
        super()
        this.active = false
        this.disabled = false
        this.label = ''
        this.theme = ''
        this.ui = 'modern'
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
      <div class="${uiConfig.wrap} ${this.active ? 'active' : ''} ${this.disabled ? 'disabled' : ''}" @click=${this._toggle}>
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
