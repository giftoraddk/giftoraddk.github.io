import { LitElement, html, unsafeCSS } from 'lit'
import css from './styles/web-texts.css?inline'
import './web-text.js'

const TXT_STD = {
  vi: { add: 'Thêm', delete: 'Xóa' },
  en: { add: 'Add',  delete: 'Delete' }
}

export class WebTexts extends LitElement {
    static styles = [unsafeCSS(css)]

    static properties = {
        ui:           { type: String },
        theme:        { type: String },
        value:        { type: String, reflect: true },
        placeholder:  { type: String },
        disabled:     { type: Boolean },
        single:       { type: Boolean },
        segments:     { type: Number },
        segmentHints: { type: String },
        height:       { type: String },
        _items:       { state: true },
        txt:  { type: Object },
        lang: { type: String },
    }

    constructor() {
        super()
        this.ui           = 'modern'
        this.theme        = ''
        this.value        = ''
        this.placeholder  = ''
        this.disabled     = false
        this.single       = false
        this.segments     = 0
        this.segmentHints = ''
        this.height       = '36px'
        this._items       = ['']
        this.txt  = null
        this.lang = 'vi'
    }

    willUpdate(changed) {
        if (this.segments > 0) {
            // segments mode: split/join by ~ — re-parse whenever value or segments changes
            if (changed.has('value') || changed.has('segments')) {
                const parts = this.value ? this.value.split('~') : []
                this._items = Array.from({ length: Math.max(this.segments, parts.length) }, (_, i) => parts[i] ?? '')
            }
        } else if (changed.has('value')) {
            // pipe mode: guard against re-parsing our own emitted value
            const current = this._items.filter(s => s !== '').join('|')
            if (this.value !== current) {
                const parsed = this.value ? this.value.split('|').filter(s => s !== '') : []
                this._items = parsed.length ? parsed : ['']
            }
        }
    }

    _emit() {
        const joined = this.segments > 0
            ? this._items.join('~')
            : this.single
                ? (this._items[0] ?? '')
                : this._items.filter(s => s !== '').join('|')
        this.value = joined
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: joined },
            bubbles: true,
            composed: true,
        }))
    }

    _dhAdd() {
        this._items = [...this._items, '']
    }

    _dhDelete(i) {
        const next = this._items.filter((_, idx) => idx !== i)
        this._items = next.length ? next : ['']
        this._emit()
    }

    // Live 'input' — chỉ TÍNH giá trị để báo ra ngoài (không ghi vào _items/value thật).
    // Trạng thái thật vẫn chỉ commit lúc blur/Enter qua _dhChange()/_emit() bên dưới — nếu
    // _dhInput() ghi luôn vào _items thì tái phát sinh đúng bug "gõ tag 2 bị reset" đã fix
    // trước đó (willUpdate() sẽ so _items với `value` cũ và re-parse sai giữa chừng).
    _dhInput(i, e) {
        e.stopPropagation()
        const val = e.detail?.value ?? ''
        const items = this._items.map((s, idx) => idx === i ? val : s)
        const joined = this.segments > 0
            ? items.join('~')
            : this.single
                ? (items[0] ?? '')
                : items.filter(s => s !== '').join('|')
        this.dispatchEvent(new CustomEvent('input', { detail: { value: joined }, bubbles: true, composed: true }))
    }

    _dhChange(i, e) {
        e.stopPropagation()
        const val = e.detail?.value ?? ''
        this._items = this._items.map((s, idx) => idx === i ? val : s)
        this._emit()
    }

    _rfWebText(item, i) {
        const ph = (this.segmentHints ? this.segmentHints.split('~')[i] : null) ?? this.placeholder
        return html`<web-text
            .value=${item}
            .ui=${this.ui}
            .theme=${this.theme}
            .placeholder=${ph}
            .disabled=${this.disabled}
            .height=${this.height}
            @input=${e => this._dhInput(i, e)}
            @change=${e => this._dhChange(i, e)}
        ></web-text>`
    }

    get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

    render() {
        // segments mode: fixed tilde-separated inputs, no +/× buttons
        if (this.segments > 0) {
            return html`
                <div class="web-texts segments">
                    ${this._items.map((item, i) => html`
                        <div class="wt-row">${this._rfWebText(item, i)}</div>
                    `)}
                </div>`
        }

        // single mode: 1 input, no +/× buttons
        if (this.single) {
            return html`
                <div class="web-texts single">
                    <div class="wt-row">${this._rfWebText(this._items[0] ?? '', 0)}</div>
                </div>`
        }

        const last = this._items.length - 1
        return html`
            <div class="web-texts">
                ${this._items.map((item, i) => html`
                    <div class="wt-row">
                        ${this._rfWebText(item, i)}
                        ${i === last ? html`
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
                `)}
            </div>`
    }
}

if (!customElements.get('web-texts')) customElements.define('web-texts', WebTexts)

export default WebTexts
