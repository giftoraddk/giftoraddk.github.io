import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import styles from './styles/web-expansion.css?inline'

// Accordion / expansion panel with named-slot API matching web-tabs and web-steps.
// .panels = [{id, label, icon?}]  →  <div slot="id">...</div> per panel
// .active  = initially open panel id(s), comma-separated when .multiple
// .multiple = allow multiple panels open simultaneously (default: false = accordion)

export class WebExpansion extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        panels:     { type: Array  }, // [{id, label, icon?}]
        active:     { type: String }, // open panel id; '' = all closed
        multiple:   { type: Boolean }, // accordion (false) vs multi-open (true)
        ui:         { type: String }, // 'modern' | 'spatial'
        theme:      { type: String },
        size:       { type: String }, // sm | md | lg | xl
        mainColors: { type: String }, // pipe-separated 5 colors
        textColor:  { type: String },
        _openSet:   { state: true }, // internal: Set<string> of currently open ids
    }

    constructor() {
        super()
        this.panels     = []
        this.active     = ''
        this.multiple   = false
        this.ui         = 'modern'
        this.theme      = ''
        this.size       = 'md'
        this.mainColors = ''
        this.textColor  = ''
        this._openSet   = new Set()
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
        // Seed open state from .active on first paint
        this._openSet = this._parseActive(this.active)
    }

    updated(changed) {
        if (changed.has('theme') || changed.has('mainColors')
            || changed.has('textColor')) {
            this._applyCSS()
        }
        // Reflect programmatic .active changes (skip when _toggle already updated _openSet)
        if (changed.has('active') && !changed.has('_openSet')) {
            this._openSet = this._parseActive(this.active)
        }
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    // Splits a comma-separated active string into a Set of ids
    _parseActive(str) {
        return new Set((str || '').split(',').map(s => s.trim()).filter(Boolean))
    }

    // ── Events ────────────────────────────────────────────────────────────────

    _toggle(id) {
        const next = new Set(this._openSet)
        if (next.has(id)) {
            next.delete(id)
        } else {
            if (!this.multiple) next.clear() // accordion: close others
            next.add(id)
        }
        this._openSet = next
        this.active   = [...next].join(',')
        this.dispatchEvent(new CustomEvent('change', {
            detail:   { active: this.active, open: [...next] },
            bubbles:  true,
            composed: true,
        }))
    }

    // ── Render ────────────────────────────────────────────────────────────────

    render() {
        const size = this.size || 'md'
        return html`
            <div class="web-expansion ${this.ui || 'modern'} size-${size}">
                ${this.panels.map(panel => {
                    const isOpen = this._openSet.has(panel.id)
                    return html`
                        <div class="exp-item ${isOpen ? 'open' : ''}">
                            <div class="exp-header" @click=${() => this._toggle(panel.id)}>
                                ${panel.icon ? html`
                                    <iconify-icon class="exp-icon" icon=${panel.icon}></iconify-icon>
                                ` : ''}
                                <span class="exp-label">${panel.label}</span>
                                <svg class="chevron" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            <div class="exp-content">
                                <div class="exp-panel">
                                    <slot name="${panel.id}"></slot>
                                </div>
                            </div>
                        </div>
                    `
                })}
            </div>
        `
    }
}

if (!customElements.get('web-expansion')) customElements.define('web-expansion', WebExpansion)
export default WebExpansion
