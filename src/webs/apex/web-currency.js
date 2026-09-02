import { LitElement, html, unsafeCSS } from 'lit'
import tailwindCSS from './styles/web-currency.css?inline'

export class WebCurrency extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(tailwindCSS)]

  static properties = {
    theme: { type: String },
    value: { type: Number, reflect: true },
    step: { type: Number },
    format: { type: Boolean },
    precision: { type: Number },
    min: { type: Number },
    max: { type: Number },
    placeholder: { type: String },
    disabled: { type: Boolean },
    suffix: { type: String },
    prefix: { type: String },
    ui: { type: String },
    height: { type: String }

  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-currency',
      },
      spatial: {
        wrap: 'spatial web-currency',
      }
    }
  }

  constructor() {
    super()
    this.value = 0
    this.step = 100
    this.format = false
    this.precision = 0
    this.min = -Infinity
    this.max = Infinity
    this.placeholder = '0'
    this.disabled = false
    this.suffix = ''
    this.prefix = ''
    this.ui = 'modern'
    this.height = '36px'
    this._displayValue = ''

  }

  firstUpdated() {
    this._updateDisplayValue()
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme) {
      this.setAttribute('data-theme', this.theme)
    } else if (changedProperties.has('theme') && !this.theme) {
      this.removeAttribute('data-theme')
    }
    if (
      changedProperties.has('value') ||
      changedProperties.has('format') ||
      changedProperties.has('precision')
    ) {
      this._updateDisplayValue()
    }
  }

  _updateDisplayValue() {
    this._displayValue = this._formatNumber(this.value)
    const input = this.shadowRoot.querySelector('input')
    if (input) {
      input.value = this._displayValue
    }
  }

  _formatNumber(num) {
    if (num === null || num === undefined || isNaN(num) || num === '') return ''

    const locale = this.format ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: this.precision,
      maximumFractionDigits: this.precision,
    }).format(num)
  }

  _parseNumber(str) {
    if (str === null || str === undefined || str === '') return 0

    // Remove all thousands separators
    // If format: thousands is '.', decimal is ','
    // If not: thousands is ',', decimal is '.'
    let cleanStr = str
    if (this.format) {
      cleanStr = cleanStr.replace(/\./g, '').replace(/,/g, '.')
    } else {
      cleanStr = cleanStr.replace(/,/g, '')
    }

    const num = parseFloat(cleanStr)
    return isNaN(num) ? 0 : num
  }

  _handleInput(e) {
    const input = e.target
    let val = input.value

    // If user is typing a decimal separator, don't format yet to allow them to continue
    const decimalChar = this.format ? ',' : '.'
    if (val.endsWith(decimalChar)) {
      return
    }

    const numericValue = this._parseNumber(val)
    this.value = this._clamp(numericValue)

    this._emitEvent('input')
  }

  _handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this._increment()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this._decrement()
    } else if (e.key === 'Enter') {
      this._updateDisplayValue()
      this._emitEvent('change')
      this.shadowRoot.querySelector('input').blur()
    }
  }

  _handleBlur() {
    this._updateDisplayValue()
    this._emitEvent('change')
  }

  _clamp(num) {
    return Math.min(Math.max(num, this.min), this.max)
  }

  _increment() {
    if (this.disabled) return
    this.value = this._clamp(this.value + this.step)
    this._updateDisplayValue()
    this._emitEvent('input')
    this._emitEvent('change')
  }

  _decrement() {
    if (this.disabled) return
    this.value = this._clamp(this.value - this.step)
    this._updateDisplayValue()
    this._emitEvent('input')
    this._emitEvent('change')
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
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
    return html`
      <div 
        class="${uiConfig.wrap} ${this.disabled ? 'opacity-50 pointer-events-none' : ''}"
        style="--core-height: ${this.height}"
      >

        ${this.prefix ? html`<span class="prefix-text">${this.prefix}</span>` : ''}
        <input
          type="text"
          class="currency-input"
          .value=${this._displayValue}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          @input=${this._handleInput}
          @blur=${this._handleBlur}
          @keydown=${this._handleKeyDown}
        />
        ${this.suffix ? html`<span class="suffix-text">${this.suffix}</span>` : ''}
        <div class="controls">
          <button class="control-btn" @click=${this._increment} tabindex="-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
          <button class="control-btn" @click=${this._decrement} tabindex="-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    `
  }
}

if (!customElements.get('web-currency')) {
  customElements.define('web-currency', WebCurrency)
}

export default WebCurrency
