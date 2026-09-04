/**
 * web-setting — Generic settings panel (FAB + dialog) không phụ thuộc bất kỳ store nào.
 *
 * Props:
 *   schema  {Array}   — form sections: [{ title, fields[], open? }]
 *   values  {Object}  — current config (state shape với root fields + sections[])
 *   title   {String}  — dialog title
 *   icon    {String}  — FAB iconify icon
 *   ui      {String}  — 'modern' | 'spatial'
 *
 * Field schema (trong mỗi field của schema):
 *   { label, type: 'text'|'select'|'photor', root: 'key' }         — root-level field
 *   { label, type, sec: { id, key } }                                      — section field
 *   { label, type, sec: { id, parent, key } }                              — nested section field
 *   opts (select), hint (placeholder), full (full-width), multiple/limit (photor)
 *
 * Events (bubbles + composed):
 *   setting-save    — e.detail = draft object khi user nhấn Lưu
 *   setting-preview — e.detail = draft object khi user thay đổi field
 *   setting-cancel  — e.detail = values gốc khi user hủy
 *
 * @example
 * const el = document.querySelector('web-setting')
 * el.schema = [{ title: 'Giao diện', fields: [{ label: 'UI', type: 'select', root: 'ui', opts: [...] }] }]
 * el.values = state.get()
 * el.addEventListener('setting-save', e => patch(e.detail))
 */

import { LitElement, html, css } from 'lit'

const TXT_STD = {
    vi: { title: 'Cài đặt', cancel: 'Hủy', save: 'Lưu & áp dụng' },
    en: { title: 'Settings', cancel: 'Cancel', save: 'Save & apply' },
}
import 'iconify-icon'
import './web-dialog.js'
import './web-button.js'
import './web-text.js'
import './web-select.js'
import './web-expansion.js'
import './web-texts.js'
import './web-colors.js'
import '../media/svc-photor.js'

export class WebSetting extends LitElement {

    // ==========================================
    // STYLES
    // ==========================================

    static styles = css`
        :host {
            display: block;
            position: fixed;
            bottom: 1rem; right: 1rem;
            z-index: 98;
        }

        .fab {
            width: 2.75rem; height: 2.75rem;
            border-radius: 50%;
            border: 1px solid;
            background-color: color-mix(in oklab, var(--color-base-content) 10%, transparent);
            backdrop-filter: blur(12px);
            color: var(--color-base-content);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 1.25rem;
            box-shadow: 0 2px 12px rgba(0,0,0,0.18);
            transition: transform 0.25s ease, background 0.2s ease;
        }
        .fab:hover {
            transform: scale(1.1) rotate(45deg);
            color: var(--color-primary);
            background: color-mix(in oklab, var(--color-primary) 25%, transparent);
        }

        /* ── Collapse list ─────────────────────────────────────────────────── */
        .dlg-body {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 2px;
        }

        /* ── Fields grid inside each collapse ──────────────────────────────── */
        .fld-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 0 16px 16px;
        }

        .fld { display: flex; flex-direction: column; gap: 4px; }
        .fld.full { grid-column: 1 / -1; }
        .fld label { font-size: 12px; font-weight: 600; opacity: 0.7; }

        .dlg-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 4px; }

        /* ── Group nesting (view → sections) ───────────────────────────────── */
        .grp-inner {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 4px 0px 4px 12px;
            border-left: 2px solid color-mix(in oklab, var(--color-base-content, #fff) 50%, transparent);
        }
    `

    // ==========================================
    // PROPERTIES
    // ==========================================

    static properties = {
        ui:           { type: String },
        title:        { type: String },
        icon:         { type: String },
        schema:       { type: Array  },
        values:       { type: Object },
        _open:        { state: true  },
        _draft:       { state: true  },
        txt:   { type: Object },
        lang:  { type: String },
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    constructor() {
        super()
        this.ui           = 'spatial'
        this.title        = ''
        this.icon         = 'ri:magic-line'
        this.schema       = []
        this.values       = {}
        this._open        = false
        this._draft       = {}
        this.txt   = null
        this.lang  = 'vi'
    }

    willUpdate(changed) {
        if (changed.has('values') && !this._open) {
            this._draft = this._clone(this.values)
        }
    }

    // ==========================================
    // DATA CORE FUNCTIONS
    // ==========================================

    // _clone - Deep clone object
    _clone(s) {
        try { return JSON.parse(JSON.stringify(s)) } catch { return {} }
    }

    // _getVal - Đọc giá trị field từ draft theo schema field descriptor
    _getVal(f) {
        const d = this._draft
        if (f.root) return d[f.root] ?? ''
        const sec = f.sec
        const s   = (d.sections ?? []).find(s => s.id === sec.id) ?? {}
        return sec.parent ? (s[sec.parent]?.[sec.key] ?? '') : (s[sec.key] ?? '')
    }

    // _setVal - Ghi giá trị field vào draft và emit preview
    _setVal(f, val) {
        const d = this._draft
        if (f.root) {
            this._draft = { ...d, [f.root]: val }
        } else {
            const sec      = f.sec
            const sections = (d.sections ?? []).map(s => {
                if (s.id !== sec.id) return s
                if (sec.parent) return { ...s, [sec.parent]: { ...s[sec.parent], [sec.key]: val } }
                return { ...s, [sec.key]: val }
            })
            this._draft = { ...d, sections }
        }
        this._emitPreview()
    }

    // ==========================================
    // DATA HEAD FUNCTIONS (DIALOG)
    // ==========================================

    // _dhOpen - Mở dialog, reset draft về values hiện tại
    _dhOpen() {
        this._draft = this._clone(this.values)
        this._open  = true
    }

    // _dhCancel - Hủy, khôi phục draft và emit cancel
    _dhCancel() {
        this._draft = this._clone(this.values)
        this._open  = false
        this.dispatchEvent(new CustomEvent('setting-cancel',
            { detail: this._clone(this.values), bubbles: true, composed: true }))
    }

    // _dhSave - Lưu draft, emit setting-save
    _dhSave() {
        this.dispatchEvent(new CustomEvent('setting-save',
            { detail: this._clone(this._draft), bubbles: true, composed: true }))
        this._open = false
    }

    // _emitPreview - Emit setting-preview khi draft thay đổi
    _emitPreview() {
        this.dispatchEvent(new CustomEvent('setting-preview',
            { detail: this._clone(this._draft), bubbles: true, composed: true }))
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

    // [1] render - FAB + dialog với expansion sections
    render() {
        return html`
            <button class="fab" @click=${() => this._dhOpen()}>
                <iconify-icon icon=${this.icon}></iconify-icon>
            </button>

            <web-dialog .open=${this._open} title=${this.title || this._txt.title} maxWidth="640px" .ui=${this.ui} @close=${() => this._dhCancel()}>
                <div class="dlg-body">
                    ${(this.schema ?? []).map((sec, i) => sec.sections
                        ? this._rfGroup(sec, i)
                        : this._rfSection(sec, i)
                    )}
                </div>

                <div slot="footer" class="dlg-footer">
                    <web-button type="outline" ui=${this.ui} height="36px"
                        @click=${() => this._dhCancel()}>${this._txt.cancel}</web-button>
                    <web-button color="primary" ui=${this.ui} height="36px"
                        @click=${() => this._dhSave()}>${this._txt.save}</web-button>
                </div>
            </web-dialog>`
    }

    // [1.1] _rfGroup - Expansion bọc nhiều sections con (group theo view)
    _rfGroup(group, i) {
        const id = `g${i}`
        return html`
            <web-expansion
                .panels=${[{ id, label: group.title }]}
                .active=${(group.open ?? i === 0) ? id : ''}
                .ui=${this.ui}
            >
                <div slot=${id} class="grp-inner">
                    ${group.sections.map(sec => this._rfSection(sec))}
                </div>
            </web-expansion>`
    }

    // [1.2] _rfSection - Expansion cho một section (fields)
    _rfSection(sec) {
        return html`
            <web-expansion
                .panels=${[{ id: 's', label: sec.title }]}
                .active=${sec.open ? 's' : ''}
                .ui=${this.ui}
            >
                <div slot="s" class="fld-grid">
                    ${sec.fields.map(f => this._rfField(f))}
                </div>
            </web-expansion>`
    }

    // [1.3] _rfField - Render một field theo descriptor
    _rfField(f) {
        const val      = String(this._getVal(f))
        const onChange = e => this._setVal(f, e.detail?.value ?? e.target?.value ?? '')
        const cls      = f.full ? 'fld full' : 'fld'

        const ctrl = f.type === 'select'
            ? html`<web-select .options=${f.opts} .value=${val || null}
                       .ui=${this.ui} placeholder="—" height="36px"
                       @change=${onChange}></web-select>`
            : f.type === 'photor'
            ? html`<svc-photor .value=${val}
                       .ui=${this.ui} height="36px" ?multiple=${f.multiple ?? false} .limit=${f.limit ?? 0}
                       @change=${onChange}></svc-photor>`
            : f.type === 'texts'
            ? html`<web-texts .value=${val} .ui=${this.ui} .placeholder=${f.hint ?? ''}
                       @change=${onChange}></web-texts>`
            : f.type === 'colors'
            ? html`<web-colors .value=${val} .ui=${this.ui} ?single=${f.single ?? false}
                       @change=${onChange}></web-colors>`
            : html`<web-text type="text" .value=${val} .placeholder=${f.hint ?? ''}
                       .ui=${this.ui} height="36px" @input=${onChange}></web-text>`

        return html`<div class=${cls}><label>${f.label}</label>${ctrl}</div>`
    }
}

if (!customElements.get('web-setting')) customElements.define('web-setting', WebSetting)
export default WebSetting
