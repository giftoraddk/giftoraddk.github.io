import { LitElement, html, unsafeCSS } from 'lit'
import css from './styles/web-colors.css?inline'

const COLORS_STD = ['#2ebd85', '#f5465c', '#a855f7', '#00c7d4', '#fbbf24']
const HEX_RE = /^#[0-9a-fA-F]{6}$/

const TXT_STD = {
    vi: { add: 'Thêm', delete: 'Xóa' },
    en: { add: 'Add',  delete: 'Delete' },
}

export class WebColors extends LitElement {
    static styles = [unsafeCSS(css)]

    static properties = {
        ui:           { type: String },
        theme:        { type: String },
        value:        { type: String, reflect: true },
        disabled:     { type: Boolean },
        single:       { type: Boolean },
        _items:       { state: true },
        txt:   { type: Object },
        lang:  { type: String },
    }

    constructor() {
        super()
        this.ui           = 'modern'
        this.theme        = ''
        this.value        = ''
        this.disabled     = false
        this.single       = false
        this._items       = ['']
        this.txt   = null
        this.lang  = 'vi'
    }

    willUpdate(changed) {
        if (changed.has('value')) {
            const current = this.single
                ? (this._items[0] ?? '')
                : this._items.join('|')
            if (this.value !== current) {
                const parsed = this.value
                    ? this.value.split(/[|,]/).map(c => c.trim()).filter(Boolean)
                    : []
                this._items = parsed.length ? parsed : ['']
            }
        }
    }

    _emit() {
        const joined = this.single
            ? (this._items[0] ?? '')
            : this._items.join('|')
        this.value = joined
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: joined },
            bubbles: true,
            composed: true,
        }))
    }

    _dhSwatch(i, e) {
        this._items = this._items.map((c, idx) => idx === i ? e.target.value : c)
        this._emit()
    }

    _dhHexInput(i, e) {
        const val = e.target.value.trim()
        this._items = this._items.map((c, idx) => idx === i ? val : c)
        if (HEX_RE.test(val)) this._emit()
    }

    _dhHexChange(i, e) {
        const val = e.target.value.trim()
        if (HEX_RE.test(val)) {
            this._items = this._items.map((c, idx) => idx === i ? val : c)
            this._emit()
        } else {
            this.requestUpdate()
        }
    }

    _dhAdd()      { this._items = [...this._items, '#ffffff'] }
    _dhDelete(i)  {
        const next = this._items.filter((_, idx) => idx !== i)
        this._items = next.length ? next : [...COLORS_STD]
        this._emit()
    }

    _rfRow(color, i, hideBtns = false) {
        const last = i === this._items.length - 1
        const safe = HEX_RE.test(color) ? color : '#ffffff'

        return html`
            <div class="wc-row">
                <input
                    class="wc-swatch"
                    type="color"
                    .value=${safe}
                    ?disabled=${this.disabled}
                    @input=${e => this._dhSwatch(i, e)}
                />
                <input
                    class="wc-hex"
                    type="text"
                    maxlength="7"
                    .value=${color}
                    ?disabled=${this.disabled}
                    @input=${e => this._dhHexInput(i, e)}
                    @change=${e => this._dhHexChange(i, e)}
                />
                ${hideBtns ? '' : last ? html`
                    <button class="wt-btn wt-add" ?disabled=${this.disabled} @click=${this._dhAdd} title="${this._txt.add}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                ` : html`
                    <button class="wt-btn wt-del" ?disabled=${this.disabled} @click=${() => this._dhDelete(i)} title="${this._txt.delete}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                `}
            </div>
        `
    }

    get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

    render() {
        if (this.single) {
            return html`
                <div class="web-colors single">
                    <div class="wc-row">${this._rfRow(this._items[0] ?? '#ffffff', 0, true)}</div>
                </div>`
        }
        return html`
            <div class="web-colors">
                ${this._items.map((color, i) => this._rfRow(color, i))}
            </div>
        `
    }
}

if (!customElements.get('web-colors')) customElements.define('web-colors', WebColors)
export default WebColors
