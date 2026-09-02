// Overlay is a native <dialog> (showModal) rather than a `position: fixed` div — any
// ancestor with `transform`/`filter`/`backdrop-filter` (e.g. the spatial glass panes in
// web-split.js) creates a new containing block, which would shrink a `position: fixed`
// overlay down to that ancestor's box instead of the full viewport. The browser's
// top-layer (native <dialog>) is immune to this, same technique as web-gallery.js's
// fullscreen popup.
import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-dialog.css?inline'

const TXT_STD = {
  vi: { cancel: 'Huỷ', confirm: 'Xác nhận' },
  en: { cancel: 'Cancel', confirm: 'Confirm' },
}

export class WebDialog extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(styles)]
  static _openCount = 0 // shared across all <web-dialog> instances — see _lockScroll/_unlockScroll

  static properties = {
    open:       { type: Boolean, reflect: true },
    title:      { type: String },
    maxWidth:   { type: String },
    theme:      { type: String },
    ui:         { type: String }, // modern, spatial
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
      spatial: {
        wrap: 'spatial web-dialog-overlay',
        content: 'spatial web-dialog-content',
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
    const d = this.txt ?? TXT_STD
    return d[this.lang] ?? d.vi ?? {}
  }

  close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))
  }

  _fxContent() {
    const el = this.shadowRoot.querySelector('.web-dialog-content')
    if (!el) return
    el.classList.remove('is-persistent-fx')
    // force reflow so removing+re-adding the class restarts the animation
    void el.offsetWidth
    el.classList.add('is-persistent-fx')
    el.addEventListener('animationend', () => el.classList.remove('is-persistent-fx'), { once: true })
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
      <dialog class="${uiConfig.wrap}${isSheet ? ' sheet-overlay' : ''}" @click=${onOverlayClick} @cancel=${this._handleNativeCancel}>
        <div class="${uiConfig.content}${isSheet ? ' sheet-content' : ''}" style="max-width: ${this.maxWidth}">
          ${isSheet ? html`<div class="dialog-handle"></div>` : ''}
          <div class="dialog-header">
            <slot name="header">
              <div class="title">${this.title}</div>
              ${!this.persistent ? html`
                <div class="close-btn" @click=${() => this.close()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              ` : ''}
            </slot>
          </div>
          <div class="dialog-body">
            <slot></slot>
          </div>
          <div class="dialog-footer">
            ${this.persistent ? html`
              <button class="dialog-btn dialog-btn-cancel" ?disabled=${this.disabled} @click=${this._handleCancel}>
                ${this._txt.cancel}
              </button>
              <button class="dialog-btn dialog-btn-confirm" ?disabled=${this.disabled} @click=${this._handleConfirm}>
                ${this._txt.confirm}
              </button>
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
