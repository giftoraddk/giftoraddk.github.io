import { LitElement, html, unsafeCSS } from 'lit'
import tailwindCSS from './styles/web-button.css?inline'
import { cssInline } from '@/services/helper.js';
import 'iconify-icon';

export class WebButton extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(tailwindCSS)]

  static properties = {
    theme: { type: String },
    type: { type: String }, // fill, outline, ghost, dash, soft
    color: { type: String }, // primary, secondary, accent, info, warning, success, error, base-content
    rounded: { type: String }, // value of border-radius
    height: { type: String }, // default 36px
    width: { type: String }, // default auto
    square: { type: Boolean },
    loading: { type: Boolean },
    disabled: { type: Boolean },
    prefix: { type: String }, // icon name (iconify), xem web-cell.js's iconPart() cùng quy ước
    suffix: { type: String },
    iconSize: { type: String }, // font-size của icon prefix/suffix — mặc định lấy từ CSS .prefix-icon/.suffix-icon (1.2em) nếu không set
    fontSize: { type: String },
    padding: { type: String },
    stys: { type: Object },
    ui: { type: String }, // modern, spatial
    mode: { type: String }, // 'button', 'badge'
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-button',
      },
      spatial: {
        wrap: 'spatial web-button',
      }
    }
  }

  constructor() {
    super()
    this.theme = ''
    this.type = 'fill'
    this.height = ''
    this.width = 'auto'
    this.color = ''
    this.loading = false
    this.disabled = false
    this.ui = 'modern'
    this.mode = 'button'
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme) {
      this.setAttribute('data-theme', this.theme)
    } else if (changedProperties.has('theme') && !this.theme) {
      this.removeAttribute('data-theme')
    }
  }

  _handleClick(e) {
    if (this.loading || this.disabled) {
      e.stopPropagation();
      return;
    }
    this.dispatchEvent(new CustomEvent('clicked', {
      detail: { name: 'button', value: this.textContent.trim() },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const isBadge = this.mode === 'badge'
    const type = `type-${this.type || 'fill'}`
    const color = this.color ? `color-${this.color}` : ''
    const width = this.width ? this.width : 'auto'
    const isDisabled = this.disabled || this.loading
    
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
    
    const style = cssInline({
      '--core-height': this.height || (isBadge ? '18px' : '36px'),
      width,
      borderRadius: this.rounded || isBadge ? '1rem' : 'var(--core-radius, .5rem)',
      fontSize: this.fontSize || (isBadge ? '.7rem' : 'var(--text-xs, .75rem)'),
      padding: this.padding || (isBadge ? '0 .5rem' : (this.square ? '0' : '0 .75rem')),
      ...(this.stys || {})
    });

    return html`
      <button
        class="${uiConfig.wrap} ${type} ${color} ${this.disabled ? 'disabled' : ''} ${this.loading ? 'loading' : ''} ${this.square ? 'web-square' : ''} ${isBadge ? 'web-badge-mode' : ''}"
        style="${style}"
        ?disabled=${isDisabled}
        @click=${this._handleClick}
      >
        ${this.loading ? html`
          <div class="loading-spinner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          </div>
        ` : ''}
        ${this.prefix
          ? html`<iconify-icon class="prefix-icon" icon="${this.prefix}" style="${this.iconSize ? `font-size:${this.iconSize}` : ''}"></iconify-icon>`
          : html`<slot name="prefix"></slot>`}
        <slot></slot>
        ${this.suffix
          ? html`<iconify-icon class="suffix-icon" icon="${this.suffix}" style="${this.iconSize ? `font-size:${this.iconSize}` : ''}"></iconify-icon>`
          : html`<slot name="suffix"></slot>`}
      </button>
    `
  }
}

if (!customElements.get('web-button')) {
  customElements.define('web-button', WebButton)
}

export default WebButton
