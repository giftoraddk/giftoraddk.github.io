import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-alert.css?inline'

export class WebAlert extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(styles)]

    static properties = {
        type: { type: String }, // 'primary', 'info', 'warning', 'error'
        title: { type: String },
        closable: { type: Boolean },
        theme: { type: String },
        ui: { type: String }, // modern, spatial
        visible: { type: Boolean, state: true }
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-alert',
            },
            spatial: {
                wrap: 'spatial web-alert',
            }
        }
    }

    constructor() {
        super()
        this.type = 'info'
        this.title = ''
        this.closable = false
        this.theme = ''
        this.ui = 'modern'
        this.visible = true
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
    }

    _close() {
        this.visible = false
        this.dispatchEvent(new CustomEvent('close', {
            bubbles: true,
            composed: true
        }))
    }

    render() {
        if (!this.visible) return html``
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']

        return html`
      <div class="${uiConfig.wrap} ${this.type}">
        <div class="icon">
          ${this._renderIcon()}
        </div>
        <div class="alert-content">
          ${this.title ? html`<div class="title">${this.title}</div>` : ''}
          <slot></slot>
        </div>
        ${this.closable ? html`
          <div class="close-btn" @click=${this._close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        ` : ''}
      </div>
    `
    }

  _renderIcon() {
    const common = {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }
    const icons = {
      primary: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
      success: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
      info: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
      warning: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      error: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    }
    return icons[this.type] || icons.info
  }

}

if (!customElements.get('web-alert')) {
  customElements.define('web-alert', WebAlert)
}

export default WebAlert
