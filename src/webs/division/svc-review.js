// src/webs/division/svc-review.js
//
// <svc-review> — form output cuối (title/description/content/pics qua <svc-editor>) + nút Tạo
// lại/Lưu. Tách khỏi svc-marketing.js's cũ `_rbReviewPhase` (theo hook/superpowers/specs/2026-09-
// 05-division-talk-design.md) — presentational, KHÔNG tự biết Firestore, chỉ nhận `doc`/`txt` qua
// prop và phát field-change/regenerate/save cho cha (svc-marketing.js) tự xử lý persist.
import { LitElement, html, unsafeCSS } from 'lit'
import { keyed } from 'lit/directives/keyed.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-textarea.js'
import '@/webs/apex/web-button.js'
import '@/webs/media/svc-editor.js'
import styles from './styles/svc-review.css?inline'

export class SvcReview extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        doc:     { type: Object },  // job-like doc: {fields: {title, description, content, pics}, ...}
        ai:      { type: String },
        loading: { type: Boolean }, // cha set true trong lúc chờ _dfSave() — loading nút Lưu
        ui:      { type: String }, theme: { type: String }, lang: { type: String },
        txt:     { type: Object },  // {titleLabel, descLabel, contentLabel, picsLabel, contentPlaceholder, regenerate, save}
    }

    constructor() {
        super()
        this.doc = null
        this.ai = ''
        this.loading = false
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi'
        this.txt = {}
    }

    _dhField(key, value) {
        this.dispatchEvent(new CustomEvent('field-change', { detail: { key, value }, bubbles: true, composed: true }))
    }

    _dhRegenerate() { this.dispatchEvent(new CustomEvent('regenerate', { bubbles: true, composed: true })) }
    _dhSave()       { this.dispatchEvent(new CustomEvent('save', { bubbles: true, composed: true })) }

    render() {
        if (!this.doc) return html``
        const t = this.txt
        return html`
            <div class="rvw-review">
                <div class="rvw-field">
                    <label>${t.titleLabel}</label>
                    <web-text ui=${this.ui} .value=${this.doc.fields.title}
                        @input=${e => this._dhField('title', e.detail.value)}></web-text>
                </div>
                <div class="rvw-field">
                    <label>${t.descLabel}</label>
                    <web-textarea .value=${this.doc.fields.description} .ui=${this.ui} rows="4"
                        @input=${e => this._dhField('description', e.detail.value)}></web-textarea>
                </div>
                ${this.doc.fields.pics ? html`
                    <div class="rvw-field">
                        <label>${t.picsLabel}</label>
                        <img class="rvw-pics" src=${this.doc.fields.pics} alt="" />
                    </div>
                ` : ''}
                <div class="rvw-field">
                    <label>${t.contentLabel}</label>
                    ${keyed(this.doc.fields.pics, html`
                        <svc-editor .value=${this.doc.fields.content} .ui=${this.ui} .theme=${this.theme}
                            ai=${this.ai} placeholder=${t.contentPlaceholder}
                            @change=${e => this._dhField('content', e.detail.html)}></svc-editor>
                    `)}
                </div>
                <div class="rvw-actions">
                    <web-button type="soft" ui=${this.ui} theme=${this.theme}
                        @clicked=${this._dhRegenerate}>${t.regenerate}</web-button>
                    <web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
                        ?loading=${this.loading} @clicked=${this._dhSave}>${t.save}</web-button>
                </div>
            </div>
        `
    }
}

if (!customElements.get('svc-review')) customElements.define('svc-review', SvcReview)
export default SvcReview
