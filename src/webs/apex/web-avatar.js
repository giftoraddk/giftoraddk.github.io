import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-avatar.css?inline'

export class WebAvatar extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        src: { type: String },
        name: { type: String },
        size: { type: String }, // CSS value
        shape: { type: String }, // 'circle', 'square'
        status: { type: String }, // 'online', 'away', 'busy'
        theme: { type: String },
        ui: { type: String } // modern, spatial
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-avatar',
            },
            spatial: {
                wrap: 'spatial web-avatar',
            }
        }
    }

    constructor() {
        super()
        this.src = ''
        this.name = ''
        this.size = '40px'
        this.shape = 'circle'
        this.status = ''
        this.theme = ''
        this.ui = 'modern'
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
        if (changedProperties.has('size')) {
            this.style.setProperty('--avatar-size', this.size)
        }
    }

    _getInitials() {
        if (!this.name) return ''
        return this.name.split(' ').map(n => n[0]).join('').substr(0, 2)
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
      <div class="${uiConfig.wrap} ${this.shape}" title="${this.name}">
        ${this.src
                ? html`<img src="${this.src}" alt="${this.name}" @error=${() => this.src = ''}>`
                : html`<span class="initials">${this._getInitials()}</span>`
            }
        ${this.status ? html`<div class="status-dot ${this.status}"></div>` : ''}
      </div>
    `
    }
}

if (!customElements.get('web-avatar')) {
    customElements.define('web-avatar', WebAvatar)
}

export default WebAvatar
