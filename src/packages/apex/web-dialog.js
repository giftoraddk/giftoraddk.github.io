// Overlay is a native <dialog> (showModal) rather than a `position: fixed` div — any
// ancestor with `transform`/`filter`/`backdrop-filter` (e.g. glass/backdrop-filter panes in
// web-split.js) creates a new containing block, which would shrink a `position: fixed`
// overlay down to that ancestor's box instead of the full viewport. The browser's
// top-layer (native <dialog>) is immune to this, same technique as web-gallery.js's
// fullscreen popup.
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import styles from './css/web-dialog.css?inline'
import { a11yTxt } from './tool/a11y.js'
import './web-button.js'
import pastelStyles from './css/pastel.css?inline'
import { txtLingo } from '@/services/tools/lingo.js'

const TXT_STD = {
  vi: { cancel: 'Huỷ', confirm: 'Xác nhận' },
  en: { cancel: 'Cancel', confirm: 'Confirm' },
}

export class WebDialog extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(pastelStyles), unsafeCSS(styles)]
  static _openCount = 0 // shared across all <web-dialog> instances — see _lockScroll/_unlockScroll

  static properties = {
    open:       { type: Boolean, reflect: true },
    title:      { type: String },
    maxWidth:   { type: String },
    theme:      { type: String },
    ui:         { type: String }, // modern, pastel
    type:       { type: String }, // modal (default, centered) | mobile (bottom sheet — handle + slide-up)
    persistent: { type: Boolean },
    lang:       { type: String },
    txt:        { type: Object },
    disabled:   { type: Boolean }, // true → khoá 2 nút Huỷ/Xác nhận (persistent footer) trong khi caller đang xử lý async, ép user phải đợi
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'web-dialog-overlay',
        content: 'web-dialog-content',
      },
      pastel: {
        wrap: 'pastel web-dialog-overlay',
        content: 'pastel web-dialog-content',
      }
    }
  }

  constructor() {
    super()
    this.open       = false
    this.title      = ''
    this.theme      = ''
    this.ui         = 'modern'
    this.type       = 'modal'
    this.maxWidth   = '1200px'
    this.persistent = false
    this.lang       = 'vi'
    this.txt        = null
    this.disabled   = false
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme) {
      this.setAttribute('data-theme', this.theme)
    } else if (changedProperties.has('theme') && !this.theme) {
      this.removeAttribute('data-theme')
    }
    if (changedProperties.has('open')) {
      const d = this.shadowRoot?.querySelector('dialog.web-dialog-overlay')
      if (!d) return
      if (this.open && !d.open) {
        this._lockScroll()
        d.showModal()
      } else if (!this.open && d.open) {
        d.close()
        this._unlockScroll()
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unlockScroll() // component removed while still open — don't leave <html> stuck at overflow: hidden
  }

  // Reference-counted so 2 dialogs open at once (rare, but possible) don't have the first
  // close() re-enable scroll while the second is still open — locks <html> itself (not
  // <body>) so the scrollbar's own gutter disappears too, matching a real bottom-sheet feel.
  _lockScroll() {
    if (this._scrollLocked) return
    this._scrollLocked = true
    if (WebDialog._openCount === 0) document.documentElement.style.overflow = 'hidden'
    WebDialog._openCount++
  }

  _unlockScroll() {
    if (!this._scrollLocked) return
    this._scrollLocked = false
    WebDialog._openCount = Math.max(0, WebDialog._openCount - 1)
    if (WebDialog._openCount === 0) document.documentElement.style.removeProperty('overflow')
  }

  get _txt() {
    return txtLingo(this.txt, TXT_STD, this.lang)
  }

  close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))
  }

  // "Không đóng được" — nhún nhẹ tại chỗ. Web Animations trên property `scale` (không phải class đổi `animation`/`transform`):
  // đổi `animation` bằng class thì lúc gỡ class, animation vào của sheet (translateY + opacity) chạy lại từ đầu → sheet giật/nhấp nháy.
  // Sheet scale neo ở mép dưới (transform-origin, xem css) nên đứng yên tại chỗ, chỉ phồng lên.
  _fxContent() {
    const el = this.shadowRoot.querySelector('.web-dialog-content')
    if (!el?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    this._fx?.cancel()
    this._fx = el.animate([{ scale: 1 }, { scale: 1.03 }, { scale: 1 }], { duration: 180, easing: 'cubic-bezier(.25,.8,.25,1)' })
  }

  _handleCancel() {
    if (this.disabled) return
    this.open = false
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))
  }

  _handleConfirm() {
    if (this.disabled) return
    this.open = false
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }))
  }

  // Native <dialog> fires a cancelable 'cancel' event on ESC before closing itself —
  // route it through the same persistent/non-persistent logic as an overlay click.
  _handleNativeCancel(e) {
    e.preventDefault()
    if (this.persistent) this._fxContent()
    else this.close()
  }

  render() {
    const uiConfig = this.constructor.uiConfigs[this.ui] || this.constructor.uiConfigs['modern']
    const isSheet  = this.type === 'mobile'
    const onOverlayClick = (e) => {
      if (e.target !== e.currentTarget) return // click landed on inner content, not the backdrop
      this.persistent ? this._fxContent() : this.close()
    }

    return html`
      <dialog class="${uiConfig.wrap}${isSheet ? ' sheet-overlay' : ''}" aria-labelledby=${this.title ? 'dialog-title' : nothing}
        @click=${onOverlayClick} @cancel=${this._handleNativeCancel}>
        <div class="${uiConfig.content}${isSheet ? ' sheet-content' : ''}" style="max-width: ${this.maxWidth}">
          ${isSheet ? html`<div class="dialog-handle" aria-hidden="true"></div>` : ''}
          <div class="dialog-header">
            <slot name="header">
              <div class="title${!this.persistent ? ' truncate' : ''}" id="dialog-title">${this.title}</div>
              ${!this.persistent ? html`
                <web-button class="close-btn" type="ghost" color="base-content" square rounded="50%" height="32px" ui=${this.ui}
                  prefix="ri:close-line" iconSize="1.25rem" label=${a11yTxt('close')} @click=${() => this.close()}></web-button>
              ` : ''}
            </slot>
          </div>
          <div class="dialog-body">
            <slot></slot>
          </div>
          <div class="dialog-footer">
            ${this.persistent ? html`
              <web-button type="ghost" color="error" ui=${this.ui} ?disabled=${this.disabled} @click=${this._handleCancel}>${this._txt.cancel}</web-button>
              <web-button type="soft" color="primary" ui=${this.ui} ?disabled=${this.disabled} @click=${this._handleConfirm}>${this._txt.confirm}</web-button>
            ` : html`<slot name="footer"></slot>`}
          </div>
        </div>
      </dialog>
    `
  }
}

if (!customElements.get('web-dialog')) {
  customElements.define('web-dialog', WebDialog)
}

export default WebDialog
