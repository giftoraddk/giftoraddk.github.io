import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-textarea.css?inline'

export class WebTextarea extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        value: { type: String },
        placeholder: { type: String },
        label: { type: String },
        disabled: { type: Boolean },
        rows: { type: Number },
        theme: { type: String },
        ui: { type: String } // modern, spatial
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-textarea-container',
                textarea: 'textarea-wrapper',
            },
            spatial: {
                wrap: 'spatial web-textarea-container',
                textarea: 'textarea-wrapper glass px-3 py-1',
            }
        }
    }

    constructor() {
        super()
        this.value = ''
        this.placeholder = ''
        this.label = ''
        this.disabled = false
        this.rows = 4
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

    _handleInput(e) {
        // Native `input` is composed (crosses the shadow boundary by spec) and would otherwise
        // keep bubbling out under the same name as our own CustomEvent below — external listeners
        // would see BOTH (native one has no `detail.value`, UIEvent.detail defaults to 0), and
        // since it arrives right after our correct CustomEvent, it silently wipes out whatever the
        // listener just set (`e.detail?.value` → `(0)?.value` → undefined → `?? ''`) — every
        // keystroke visually "typed" then instantly cleared. Same fix as web-text.js.
        e.stopPropagation()
        this.value = e.target.value
        this.dispatchEvent(new CustomEvent('input', {
            detail: { value: this.value },
            bubbles: true,
            composed: true
        }))
    }

    _handleChange(e) {
        e.stopPropagation() // see _handleInput — same native/custom event-name collision
        this.value = e.target.value
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: this.value },
            bubbles: true,
            composed: true
        }))
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
      <div class="${uiConfig.wrap}">
        ${this.label ? html`<label class="label">${this.label}</label>` : ''}
        <div class="${uiConfig.textarea}">
          <textarea
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            rows=${this.rows}
            @input=${this._handleInput}
            @change=${this._handleChange}
          ></textarea>
        </div>
      </div>
    `
    }
}

if (!customElements.get('web-textarea')) {
    customElements.define('web-textarea', WebTextarea)
}

export default WebTextarea
