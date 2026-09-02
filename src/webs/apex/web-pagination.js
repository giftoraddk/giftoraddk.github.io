import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-pagination.css?inline'

export class WebPagination extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        total: { type: Number },
        current: { type: Number },
        pageSize: { type: Number },
        theme: { type: String },
        ui: { type: String } // modern, spatial
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-pagination',
                btn: 'page-btn',
            },
            spatial: {
                wrap: 'spatial web-pagination',
                btn: 'page-btn glass-btn',
            }
        }
    }

    constructor() {
        super()
        this.total = 0
        this.current = 1
        this.pageSize = 10
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

    get _totalPages() {
        return Math.ceil(this.total / this.pageSize)
    }

    _goToPage(page) {
        if (page < 1 || page > this._totalPages || page === this.current) return
        this.current = page
        this.dispatchEvent(new CustomEvent('change', {
            detail: { current: this.current },
            bubbles: true,
            composed: true
        }))
    }

    _getPages() {
        const total = this._totalPages
        const current = this.current
        const pages = []

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i)
        } else {
            pages.push(1)
            if (current > 4) pages.push('...')

            const start = Math.max(2, current - 2)
            const end = Math.min(total - 1, current + 2)

            for (let i = start; i <= end; i++) pages.push(i)

            if (current < total - 3) pages.push('...')
            pages.push(total)
        }
        return pages
    }

    render() {
        if (this.total === 0) return html``

        const pages = this._getPages()
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']

        return html`
      <div class="${uiConfig.wrap}">
        <button class="${uiConfig.btn}" ?disabled=${this.current === 1} @click=${() => this._goToPage(this.current - 1)}>
          <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        ${pages.map(page => {
            if (page === '...') return html`<span class="dots">...</span>`
            return html`
            <button 
              class="${uiConfig.btn} ${this.current === page ? 'active' : ''}" 
              @click=${() => this._goToPage(page)}>
              ${page}
            </button>
          `
        })}

        <button class="${uiConfig.btn}" ?disabled=${this.current === this._totalPages} @click=${() => this._goToPage(this.current + 1)}>
          <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `
    }
}

if (!customElements.get('web-pagination')) {
    customElements.define('web-pagination', WebPagination)
}

export default WebPagination
