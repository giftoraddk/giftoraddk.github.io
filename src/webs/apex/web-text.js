import { LitElement, html, unsafeCSS } from 'lit'
import tailwindCSS from './styles/web-text.css?inline'

export class WebText extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(tailwindCSS)]

  static properties = {
    theme: { type: String },
    ui: { type: String }, // modern, spatial
    value: { type: String, reflect: true },
    placeholder: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    type: { type: String },
    prefix: { type: String },
    suffix: { type: String },
    clearable: { type: Boolean },
    height: { type: String }

  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-text',
      },
      spatial: {
        wrap: 'spatial web-text glass px-3 py-1',
      }
    }
  }

  constructor() {
    super()
    this.value = ''
    this.placeholder = ''
    this.disabled = false
    this.readonly = false
    this.type = 'text'
    this.prefix = ''
    this.suffix = ''
    this.clearable = false
    this.height = '36px'
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
    // Native `input` is composed (crosses the shadow boundary by spec) and would
    // otherwise keep bubbling out under the same name as our own CustomEvent below —
    // external listeners would see both, and the native one has no `detail.value`
    // (UIEvent.detail defaults to 0), silently corrupting consumer state.
    e.stopPropagation()
    this.value = e.target.value
    this._emitEvent('input')
  }

  _handleChange(e) {
    e.stopPropagation() // see _handleInput — same native/custom event-name collision
    this.value = e.target.value
    this._emitEvent('change')
  }

  _handleClear() {
    if (this.disabled || this.readonly) return
    this.value = ''
    const input = this.shadowRoot.querySelector('input')
    if (input) input.value = ''
    this._emitEvent('input')
    this._emitEvent('change')
    this._emitEvent('clear')
  }

  _emitEvent(name) {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    )
  }

  render() {
    const showClear = this.clearable && this.value && !this.disabled && !this.readonly
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']

    return html`
      <div 
        class="${uiConfig.wrap} ${this.disabled ? 'opacity-50 pointer-events-none' : ''}"
        style="--core-height: ${this.height}"
      >
        ${this.prefix ? html`<span class="prefix-text">${this.prefix}</span>` : ''}
        <input
          .type=${this.type}
          class="text-input"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          @input=${this._handleInput}
          @change=${this._handleChange}
        />
        ${showClear ? html`
          <button class="clear-btn" @click=${this._handleClear} tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : ''}
        ${this.suffix ? html`<span class="suffix-text">${this.suffix}</span>` : ''}
      </div>
    `

  }
}

if (!customElements.get('web-text')) {
  customElements.define('web-text', WebText)
}

export default WebText
