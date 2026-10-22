import { LitElement, html, unsafeCSS } from 'lit'
import styles from './css/web-radio.css?inline'
import pastelStyles from './css/pastel.css?inline'

export class WebRadio extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(pastelStyles), unsafeCSS(styles)]

  static properties = {
    options: { type: Array },
    value: { type: String },
    name: { type: String },
    horizontal: { type: Boolean },
    disabled: { type: Boolean },
    theme: { type: String },
    ui: { type: String } // modern, pastel
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-radio-group',
        item: 'web-radio',
      },
      pastel: {
        wrap: 'pastel web-radio-group',
        item: 'web-radio',
      }
    }
  }

  constructor() {
    super()
    this.options = []
    this.value = ''
    this.name = `radio-${Math.random().toString(36).substr(2, 9)}`
    this.horizontal = false
    this.disabled = false
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

  // Bấm lại đúng option đang chọn → bỏ chọn (value về '') thay vì giữ nguyên như radio chuẩn
  // (radio chuẩn chỉ đổi lựa chọn, không untick được) — cần cho các chỗ dùng web-radio như 1
  // toggle độc lập trên từng dòng (vd đánh dấu ưu tiên), không phải nhóm chọn-1-trong-nhiều.
  _select(optionValue) {
    if (this.disabled) return
    this.value = this.value === optionValue ? '' : optionValue
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }))
  }

  render() {
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
    return html`
      <div class="${uiConfig.wrap} ${this.horizontal ? 'horizontal' : ''}">
        ${this.options.map(opt => html`
          <div class="${uiConfig.item} ${this.value === opt.value ? 'checked' : ''} ${this.disabled || opt.disabled ? 'disabled' : ''}" 
               @click=${() => this._select(opt.value)}>
            <div class="radio-circle">
              <div class="radio-dot"></div>
            </div>
            <span class="label">${opt.label}</span>
          </div>
        `)}
      </div>
    `
  }
}

if (!customElements.get('web-radio')) {
  customElements.define('web-radio', WebRadio)
}

export default WebRadio
