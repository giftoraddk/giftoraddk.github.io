import { LitElement, html, unsafeCSS } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import styles from './styles/web-toast.css?inline'

export class WebToast extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(styles)]

  static properties = {
    toasts: { type: Array, state: true },
    timeout: { type: Number },
    ui: { type: String }, // modern, spatial
    placement: { type: String } // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-toast',
      },
      spatial: {
        wrap: 'spatial web-toast glass',
      }
    }
  }

  constructor() {
    super()
    this.toasts = []
    this.timeout = 7000
    this.ui = 'modern'
    this.placement = 'bottom-center'
    window.addEventListener('web-toast-show', (e) => this.add(e.detail))
  }

  add({ message, type = 'info', duration, ui, actionLabel, onAction }) {
    const toastDuration = duration || this.timeout
    const id = Math.random().toString(36).substr(2, 9)
    const toastUi = ui || this.ui
    const toast = { id, message, type, duration: toastDuration, show: false, closing: false, ui: toastUi, actionLabel, onAction }
    this.toasts = [...this.toasts, toast]

    setTimeout(() => {
      this.toasts = this.toasts.map(t => t.id === id ? { ...t, show: true } : t)
    }, 10)

    if (toastDuration > 0) {
      setTimeout(() => this.remove(id), toastDuration)
    }
  }

  remove(id) {
    const toast = this.toasts.find(t => t.id === id)
    if (!toast || toast.closing) return

    this.toasts = this.toasts.map(t => t.id === id ? { ...t, closing: true } : t)

    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id)
    }, 500) // Buffer for smooth cleanup
  }

  render() {
    return html`
      <div class="toast-container ${this.placement}">
        ${repeat(this.toasts, (t) => t.id, (t) => {
      const uiConfig = this.constructor.uiConfigs[t.ui || 'modern']
      return html`
          <div class="toast-wrapper ${t.show ? 'show' : ''} ${t.closing ? 'closing' : ''}">
            <div class="${uiConfig.wrap} ${t.type}" style="--duration: ${t.duration}ms">
              <div class="icon">
                ${this._renderIcon(t.type)}
              </div>
              <div class="message">${t.message}</div>
              ${t.actionLabel ? html`
                <div class="action-btn" @click=${() => { t.onAction?.(); this.remove(t.id) }}>${t.actionLabel}</div>
              ` : ''}
              <div class="close-btn" @click=${() => this.remove(t.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div class="progress-bar"></div>
            </div>
          </div>
        `})}
      </div>
    `
  }

  _renderIcon(type) {
    const icons = {
      success: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
      info: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
      warning: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      error: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    }
    return icons[type] || icons.info
  }
}

if (!customElements.get('web-toast')) {
  customElements.define('web-toast', WebToast)
}

// Global helper
window.webToast = (detail) => {
  window.dispatchEvent(new CustomEvent('web-toast-show', { detail }))
}

export default WebToast
