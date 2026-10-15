import { LitElement, html, nothing, unsafeCSS } from 'lit'
import tailwindCSS from './css/web-button.css?inline'
import 'iconify-icon';
import { iconLabel } from './tool/a11y.js';
import pastelStyles from './css/pastel.css?inline';

// Inlined from astro-micro's src/services/helper.js — that file isn't ported to astro-mega (same
// gap already documented/fixed the same way in src/packages/adopted/svc-player.js).
const _isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
const _kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
function cssInline(style) {
  if (!_isObject(style)) return '';
  return Object.entries(style)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${_kebab(k)}: ${v}`)
    .join('; ');
}

export class WebButton extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(pastelStyles), unsafeCSS(tailwindCSS)]

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
    ui: { type: String }, // modern, pastel
    mode: { type: String }, // 'button', 'badge'
    label: { type: String }, // aria-label — BẮT BUỘC nên có với nút chỉ có icon (square); có chữ thì không cần
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-button',
      },
      pastel: {
        wrap: 'pastel web-button',
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
    this.label = ''
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme) {
      this.setAttribute('data-theme', this.theme)
    } else if (changedProperties.has('theme') && !this.theme) {
      this.removeAttribute('data-theme')
    }
  }

  // Native click (composed) bị chặn ngay trong shadow — ra ngoài chỉ còn đúng 1 CustomEvent 'click',
  // nên @click trên <web-button> chạy 1 lần, và không chạy khi loading/disabled
  _handleClick(e) {
    e.stopPropagation();
    if (this.loading || this.disabled) return;
    this.dispatchEvent(new CustomEvent('click', {
      detail: { name: 'button', value: this.textContent.trim() },
      bubbles: true,
      composed: true
    }));
  }

  // Tên truy cập: `label` > chữ trong slot (tự là tên, không cần aria-label) > tên icon (dự phòng cuối).
  get _ariaLabel() {
    if (this.label) return this.label
    if (this.textContent.trim()) return ''
    return iconLabel(this.prefix || this.suffix)
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
      borderRadius: this.rounded || (isBadge ? '1rem' : 'var(--core-radius, .5rem)'),
      fontSize: this.fontSize || (isBadge ? '.7rem' : 'var(--text-xs, .75rem)'),
      padding: this.padding || (isBadge ? '0 .5rem' : (this.square ? '0' : '0 .75rem')),
      ...(this.stys || {})
    });

    const cls = `${uiConfig.wrap} ${type} ${color} ${this.disabled ? 'disabled' : ''} ${this.loading ? 'loading' : ''} ${this.square ? 'web-square' : ''} ${isBadge ? 'web-badge-mode' : ''}`
    const icon = (name, side) => html`<iconify-icon class="${side}-icon" icon="${name}" aria-hidden="true" style="${this.iconSize ? `font-size:${this.iconSize}` : ''}"></iconify-icon>`
    const inner = html`
        ${this.loading ? html`<span class="loader" aria-hidden="true"></span>` : ''}
        ${this.prefix ? icon(this.prefix, 'prefix') : html`<slot name="prefix"></slot>`}
        <slot @slotchange=${() => this.requestUpdate()}></slot>
        ${this.suffix ? icon(this.suffix, 'suffix') : html`<slot name="suffix"></slot>`}`

    // Badge chỉ là nhãn hiển thị — <span>, không phải <button> (không chen vào thứ tự Tab, không bị đọc là nút).
    if (isBadge) return html`<span class="${cls}" style="${style}" @click=${this._handleClick}>${inner}</span>`

    return html`
      <button
        type="button"
        class="${cls}"
        style="${style}"
        aria-label=${this._ariaLabel || nothing}
        aria-busy=${this.loading ? 'true' : nothing}
        ?disabled=${isDisabled}
        @click=${this._handleClick}
      >${inner}</button>
    `
  }
}

if (!customElements.get('web-button')) {
  customElements.define('web-button', WebButton)
}

export default WebButton
