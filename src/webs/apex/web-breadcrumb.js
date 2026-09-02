import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-breadcrumb.css?inline'

export class WebBreadcrumb extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        items: { type: Array }, // [{ label: 'Home', href: '/' }]
        theme: { type: String },
        ui: { type: String } // modern, spatial
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-breadcrumb',
            },
            spatial: {
                wrap: 'spatial web-breadcrumb',
            }
        }
    }

    constructor() {
        super()
        this.items = []
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

    _handleClick(e, item) {
        if (item.href) {
            e.preventDefault()
            this.dispatchEvent(new CustomEvent('navigate', {
                detail: { item },
                bubbles: true,
                composed: true
            }))
        }
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
      <nav class="${uiConfig.wrap}">
        ${this.items.map((item, index) => html`
          <div class="breadcrumb-item ${item.href ? 'link' : ''} ${index === this.items.length - 1 ? 'last' : ''}"
               @click=${(e) => this._handleClick(e, item)}>
            ${item.label}
          </div>
          ${index < this.items.length - 1 ? html`
            <div class="separator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          ` : ''}
        `)}
      </nav>
    `
    }
}

if (!customElements.get('web-breadcrumb')) {
    customElements.define('web-breadcrumb', WebBreadcrumb)
}

export default WebBreadcrumb
