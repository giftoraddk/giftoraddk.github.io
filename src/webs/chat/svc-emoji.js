import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/svc-emoji.css?inline'
import 'iconify-icon'
import '@/webs/apex/web-popover.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-tabs.js'
import { txtLingo, emit } from '@/services/helper.js'
import { EMOJI_CATEGORIES, EMOJIS } from './tools/emoji-data.js'

const TXT_STD = {
    vi: {
        searchPh: 'Tìm emoji…', empty: 'Không tìm thấy emoji',
        categories: { smileys: 'Cảm xúc', people: 'Con người', animals: 'Động vật', food: 'Đồ ăn', activities: 'Hoạt động', travel: 'Du lịch', objects: 'Đồ vật', symbols: 'Ký hiệu' },
    },
    en: {
        searchPh: 'Search emoji…', empty: 'No emoji found',
        categories: { smileys: 'Smileys', people: 'People', animals: 'Animals', food: 'Food', activities: 'Activities', travel: 'Travel', objects: 'Objects', symbols: 'Symbols' },
    },
}

export class SvcEmoji extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        theme:      { type: String },
        ui:         { type: String }, // modern, spatial
        lang:       { type: String },
        txt:        { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        placement:  { type: String }, // passed through to web-popover
        height:     { type: String }, // trigger button size, default 36px
        _search:    { state: true },
        _activeCat: { state: true },
    }

    constructor() {
        super()
        this.theme     = ''
        this.ui        = 'modern'
        this.lang      = 'vi'
        this.txt       = null
        this.placement = 'top-start'
        this.height    = '36px'
        this._search    = ''
        this._activeCat = EMOJI_CATEGORIES[0].id
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
    }

    // ── COMPUTED ──────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    // EMOJI_CATEGORIES (tools/emoji-data.js) chỉ giữ `id` + label tiếng Việt mặc định — label
    // hiển thị thật lấy từ TXT_STD.categories theo `lang`, khỏi phải song ngữ hoá cả file data.
    get _comCategories() {
        const cats = this._txt.categories ?? {}
        return EMOJI_CATEGORIES.map(c => ({ ...c, label: cats[c.id] ?? c.label }))
    }

    get _comFiltered() {
        const q = this._search.trim().toLowerCase()
        if (q) {
            return EMOJIS.filter(e => e.name.includes(q) || e.keywords.some(k => k.includes(q)))
        }
        return EMOJIS.filter(e => e.category === this._activeCat)
    }

    // ── HANDLERS ──────────────────────────────────────────────────────────────

    _dhSearch(e) {
        this._search = e.detail.value
    }

    _dhCategory(e) {
        this._activeCat = e.detail.active
    }

    _dhPick(emoji) {
        emit(this, 'emoji-pick', { char: emoji.char, name: emoji.name })
        this.shadowRoot.querySelector('web-popover').open = false
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    _rbGrid() {
        const items = this._comFiltered
        if (!items.length) return html`<div class="emoji-empty">${this._txt.empty}</div>`
        return html`
            <div class="emoji-grid">
                ${items.map(e => html`
                    <button class="emoji-btn" title=${e.name} @click=${() => this._dhPick(e)}>${e.char}</button>
                `)}
            </div>
        `
    }

    render() {
        return html`
            <web-popover ui=${this.ui} theme=${this.theme} placement=${this.placement}>
                <button class="emoji-trigger" slot="trigger" type="button" style="--core-height: ${this.height}">
                    <iconify-icon icon="ri:emotion-line" width="20px"></iconify-icon>
                </button>
                <div class="emoji-panel">
                    <web-text placeholder=${this._txt.searchPh} .value=${this._search} ui=${this.ui} theme=${this.theme}
                        @input=${this._dhSearch}></web-text>
                    ${!this._search ? html`
                        <web-tabs .tabs=${this._comCategories} active=${this._activeCat} ui=${this.ui} theme=${this.theme}
                            size="sm" @change=${this._dhCategory}></web-tabs>
                    ` : ''}
                    ${this._rbGrid()}
                </div>
            </web-popover>
        `
    }
}

if (!customElements.get('svc-emoji')) {
    customElements.define('svc-emoji', SvcEmoji)
}

export default SvcEmoji
