import { LitElement, html, css } from 'lit';
import './web-text.js';
import './web-select.js';
import './web-button.js';

const TXT_STD = {
    vi: { ph: 'Tìm kiếm...', clear: 'Xoá lọc' },
    en: { ph: 'Search...',   clear: 'Clear filter' },
}

const CHIP_LIMIT = 9;

export class WebBoxsSearch extends LitElement {
    static properties = {
        items:        { type: Array },
        tags:         { type: Array },
        field:        { type: String },
        multi:        { type: Boolean },
        color:        { type: String },
        ui:           { type: String },
        placeholder:  { type: String },
        txt:   { type: Object },
        lang:  { type: String },
        active:       { type: Array },
        query:        { type: String },
        _expanded:      { state: true },
    };

    static styles = css`
        :host { display: block; width: 100%; margin-bottom: 1.25rem; }
        .wbs-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
        .wbs-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 2px; align-items: center; }
        .wbs-filter-select { flex-shrink: 0; }
        .wbs-filter-trigger { border-radius: 99px; }
    `;

    constructor() {
        super();
        this.items        = [];
        this.field        = 'tags';
        this.multi        = false;
        this.color        = 'primary';
        this.ui           = 'modern';
        this.placeholder  = '';
        this.txt   = null;
        this.lang  = 'vi';
        this.active       = [];
        this.query        = '';
        this._active   = new Set();
        this._query     = '';
        this._timer     = null;
        this._expanded  = false;
    }

    willUpdate(changed) {
        if (changed.has('active')) this._active = new Set(this.active || []);
        if (changed.has('query'))  this._query  = this.query || '';
    }

    // ── Derived ───────────────────────────────────────────────────────────────

    get _extractedTags() {
        if (this.tags?.length) return [...this.tags];
        const set = new Set();
        for (const item of this.items || []) {
            const val = item[this.field];
            if (Array.isArray(val)) val.forEach(t => t && set.add(String(t)));
            else if (typeof val === 'string') val.split('|').filter(Boolean).forEach(t => set.add(t));
        }
        return [...set].sort();
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    _toggle(tag) {
        if (this.multi) {
            this._active.has(tag) ? this._active.delete(tag) : this._active.add(tag);
        } else {
            const already = this._active.has(tag);
            this._active.clear();
            if (!already) this._active.add(tag);
        }
        this.requestUpdate();
        this._emit();
    }

    _clear() {
        this._active.clear();
        this._query = '';
        this.requestUpdate();
        this._emit();
    }

    _onSelectChange(e) {
        const val = e.detail.value;
        if (this.multi) {
            this._active = new Set(Array.isArray(val) ? val : []);
        } else {
            this._active.clear();
            if (val) this._active.add(val);
        }
        this.requestUpdate();
        this._emit();
    }

    _showMore() {
        this._expanded = true;
    }

    _onSearch(e) {
        if (!e.detail) return;
        clearTimeout(this._timer);
        const val = e.detail.value ?? '';
        this._timer = setTimeout(() => {
            this._query = val;
            this._emit();
        }, 200);
    }

    _emit() {
        this.dispatchEvent(new CustomEvent('filter', {
            detail: {
                active: [...this._active],
                query: this._query,
                field: this.field,
            },
            bubbles:  true,
            composed: true,
        }));
    }

    get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

    // ── Render ────────────────────────────────────────────────────────────────

    render() {
        const tags   = this._extractedTags;
        const dirty  = this._active.size > 0 || this._query;
        const showAll  = this._expanded || tags.length <= CHIP_LIMIT;
        const shown    = showAll ? tags : tags.slice(0, CHIP_LIMIT);
        const hasMore  = !showAll && tags.length > CHIP_LIMIT;
        const selectValue = this.multi ? [...this._active] : ([...this._active][0] ?? null);

        return html`
            <div class="wbs-wrap">
                <web-text
                    type="search"
                    .value=${this._query}
                    .ui=${this.ui}
                    .placeholder=${this.placeholder || this._txt.ph}
                    height="45px"
                    @input=${this._onSearch}
                ></web-text>

                ${tags.length ? html`
                    <div class="wbs-chips">
                        <web-select
                            class="wbs-filter-select"
                            .options=${tags.map(tag => ({ label: tag, value: tag }))}
                            .value=${selectValue}
                            .multiple=${this.multi}
                            .ui=${this.ui}
                            height="32px"
                            @change=${this._onSelectChange}
                        >
                            <web-button
                                slot="trigger"
                                class="wbs-filter-trigger"
                                type="outline"
                                square
                                height="32px"
                                fontSize="1rem"
                                .ui=${this.ui}
                                prefix="ri:filter-3-line"
                            ></web-button>
                        </web-select>
                        ${shown.map(tag => html`
                            <web-button
                                .type=${this._active.has(tag) ? 'fill' : 'outline'}
                                .color=${this._active.has(tag) ? this.color : ''}
                                .ui=${this.ui}
                                .suffix=${this._active.has(tag) ? 'ri:close-line' : ''}
                                height="32px"
                                fontSize="0.82rem"
                                rounded="99px"
                                @clicked=${() => this._toggle(tag)}
                            >${tag}</web-button>
                        `)}
                        ${hasMore ? html`
                            <web-button
                                type="outline"
                                .ui=${this.ui}
                                height="32px"
                                fontSize="0.82rem"
                                rounded="99px"
                                square
                                prefix="ri:more-line"
                                @clicked=${this._showMore}
                            ></web-button>
                        ` : ''}
                        ${dirty ? html`
                            <web-button
                                type="outline"
                                color="error"
                                .ui=${this.ui}
                                height="32px"
                                fontSize="0.82rem"
                                rounded="99px"
                                prefix="ri:filter-off-line"
                                @clicked=${this._clear}
                            >${this._txt.clear}</web-button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

if (!customElements.get('web-boxs-search')) {
    customElements.define('web-boxs-search', WebBoxsSearch);
}

export default WebBoxsSearch;
