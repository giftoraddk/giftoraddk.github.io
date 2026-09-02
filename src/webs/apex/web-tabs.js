import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-tabs.css?inline'

export class WebTabs extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        tabs:       { type: Array  }, // [{ id: 'tab1', label: 'Tab 1' }]
        active:     { type: String }, // active tab id — also settable via attribute active="tab1"
        theme:      { type: String },
        ui:         { type: String }, // modern | spatial
        align:      { type: String }, // left | center | right
        size:       { type: String }, // sm | md | lg | xl
        mainColors: { type: String }, // pipe-separated 5 colors
        textColor:  { type: String },
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap:   'modern web-tabs',
                header: 'tabs-header',
                item:   'tab-item',
            },
            spatial: {
                wrap:   'spatial web-tabs',
                header: 'tabs-header',
                item:   'tab-item',
            },
        }
    }

    constructor() {
        super()
        this.tabs       = []
        this.active     = ''
        this.theme      = ''
        this.ui         = 'modern'
        this.align      = 'left'
        this.size       = 'md'
        this.mainColors = ''
        this.textColor  = ''
    }

    get _colors() {
        const [primary = '', secondary = '', accent = '', info = '', warning = '']
            = (this.mainColors || '').split('|').map(c => c.trim())
        return { primary, secondary, accent, info, warning }
    }

    _applyCSS() {
        this.theme
            ? this.setAttribute('data-theme', this.theme)
            : this.removeAttribute('data-theme')
        const c = this._colors
        const vars = {
            '--color-primary':      c.primary,
            '--color-secondary':    c.secondary,
            '--color-accent':       c.accent,
            '--color-info':         c.info,
            '--color-warning':      c.warning,
            '--color-base-content': this.textColor,
        }
        for (const [k, v] of Object.entries(vars)) {
            v ? this.style.setProperty(k, v) : this.style.removeProperty(k)
        }
    }

    firstUpdated() {
        if (!this.active && this.tabs.length > 0) {
            this.active = this.tabs[0].id
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') || changedProperties.has('mainColors')
            || changedProperties.has('textColor')) {
            this._applyCSS()
        }
    }

    _selectTab(id) {
        if (this.active === id) return
        this.active = id
        this.dispatchEvent(new CustomEvent('change', {
            detail:   { active: id, activeTab: id },
            bubbles:  true,
            composed: true,
        }))
    }

    // Lăn chuột dọc trên header → cuộn ngang (chỉ khi tabs thật sự tràn) — chuột thường không
    // có cách nào cuộn ngang 1 dải tab, trackpad/touch thì đã tự cuộn qua overflow-x.
    _dhWheel(e) {
        const el = e.currentTarget
        if (el.scrollWidth <= el.clientWidth) return
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY
            e.preventDefault()
        }
    }

    render() {
        const cfg  = this.constructor.uiConfigs[this.ui || 'modern']
        const size = this.size || 'md'
        return html`
            <div class="${cfg.wrap} size-${size}">
                <div class="${cfg.header} align-${this.align || 'left'}" @wheel=${this._dhWheel}>
                    ${this.tabs.map(tab => html`
                        <div
                            class="${cfg.item} ${this.active === tab.id ? 'active' : ''}"
                            @click=${() => this._selectTab(tab.id)}
                        >${tab.label}</div>
                    `)}
                </div>
                <div class="tabs-content" part="content">
                    ${this.tabs.map(tab => html`
                        <div
                            class="tab-panel ${this.active === tab.id ? 'active' : ''}"
                            part="${this.active === tab.id ? 'panel active-panel' : 'panel'}"
                        >
                            <slot name="${tab.id}"></slot>
                        </div>
                    `)}
                </div>
            </div>
        `
    }
}

if (!customElements.get('web-tabs')) {
    customElements.define('web-tabs', WebTabs)
}

export default WebTabs
