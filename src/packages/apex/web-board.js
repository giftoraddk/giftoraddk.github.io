import { LitElement, html } from 'lit'
import { txtLingo } from '@/services/tools/lingo.js'
import { _Fusion, injectStyles, watchHtmlAttr, cssInline } from '@/services/tools/util'
import { state as conductorState, all as conductorAll, get as conductorGet } from '@/services/core/conductor'
import { cacheGet as _layoutGet, cacheSet as _layoutSet } from '@/services/core/crud'
import boxStyles   from './css/web-box.css?inline'
import boardStyles from './css/web-board.css?inline'
import { bgTemplate } from '@/packages/adopted/svc-underlay.js'
import { sectionBg } from '@/packages/apex/tool/recursive-render.js'
import '@/packages/apex/web-boxs.js'
import '@/packages/apex/web-dialog.js'

// ============================================================================
// OVERVIEW — web-board: page-level shell of web-board > web-boxs > web-box > web-cell
// (hook/ARCHITECT.rst). Owns the SECTION list (sort, saved layout, drag/resize, owner
// handles), pre-fetches non-paged section data once, and mounts one <web-boxs> per section
// — or, for `sec.component`, one custom element created with the DOM API (never an HTML string).
// ============================================================================

// Fields svc-setting.js can edit per section — allowlist so conductor-internal fields (data, _page…) never leak in.
const OVERRIDE_KEYS = ['config']

// sec.component must be a custom-element name — rules out <script>/<iframe>/<img onerror> from section data.
const CUSTOM_TAG = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/

const TXT_STD = {
    vi: { pick: 'Chọn section', empty: 'Chưa có nội dung', removeTitle: 'Xóa section?', removeBody: 'Bạn có chắc muốn xóa section này? Hành động này không thể hoàn tác.' },
    en: { pick: 'Choose a section', empty: 'No content yet', removeTitle: 'Remove section?', removeBody: 'Remove this section? This cannot be undone.' },
}

const jsonAttr = (fallback) => ({ converter: { fromAttribute: v => { try { return JSON.parse(v) } catch { return fallback } } } })
const byOrder = (a, b) => (a.sort ?? 9999) - (b.sort ?? 9999)
const kebab = (k) => k.replace(/([A-Z])/g, m => '-' + m.toLowerCase())

export class WebBoard extends LitElement {

    createRenderRoot() { return this } // light DOM — Tailwind & global styles apply inside

    static properties = {
        theme:      { type: String },
        // Astro truyền object thành chuỗi attribute → converter JSON; bind .variant=${…} trong Lit thì gán object thẳng.
        variant:    jsonAttr({}),
        container:  { type: Boolean },
        draggable:  { type: Boolean },
        resizable:  { type: Boolean },
        responsive: { type: Boolean }, // container queries cho span cột — áp lên wb-board + forward xuống mọi <web-boxs>
        handles:    { type: String },  // 'absolute' (góc trên-phải) | 'static' (trong flow, luôn hiện)
        unlock:     { type: String },
        lang:       { type: String },  // theo <html lang> (BtnLang.astro), forward xuống web-boxs
        sections:   jsonAttr([]),
        owner:      { type: Boolean }, // true → ⚙/✕ trên section configurable (sec.configList?.length)
        txt:        { type: Object },
        _items:         { state: true },
        _live:          { state: true },
        _ready:         { state: true },
        _confirmRemove: { state: true }, // { sec, i } chờ xác nhận xóa, null = không có
    }

    constructor() {
        super()
        this.theme      = 'light'
        this.variant    = {}
        this.container  = false
        this.draggable  = false
        this.resizable  = false
        this.responsive = false
        this.handles    = 'absolute'
        this.unlock     = ''
        this.lang       = 'vi'
        this.sections   = []
        this.owner      = false
        this.txt        = null
        this._items     = []
        this._live      = {}
        this._ready     = false
        this._confirmRemove = null
        this._components = new Map() // sec.id → element (created once, attributes patched in place)
        this._dragIdx   = null
        this._dragOver  = null
        this._resize    = null
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    connectedCallback() {
        super.connectedCallback()
        _Fusion.run(this.unlock)
        // Sections from an embedded <script type="application/json"> child — read before Lit's first render replaces it.
        const jsonEl = this.querySelector('script[type="application/json"]')
        if (jsonEl) {
            try { this.sections = JSON.parse(jsonEl.textContent) } catch {}
            jsonEl.remove()
        }
        // SSR outline cho crawler không chạy JS (components/Seo/BoardOutline.astro) — JS đã chạy thì nội dung
        // thật sắp render, gỡ đi để không trùng lặp (screen reader / Googlebot sau render).
        this.querySelector(':scope > [data-board-outline]')?.remove()
        this._dcInit()
        this._unsubConductor = conductorState.subscribe(s => {
            this._dcMergeSectionOverrides(s.sections ?? [])
            this._dcSyncVariant(s)
        })
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._unwatchTheme?.()
        this._unwatchLang?.()
        this._unsubConductor?.()
    }

    willUpdate(changed) {
        if (changed.has('sections') && this.sections.length) this._items = [...this.sections].sort(byOrder)
        if (changed.has('_items')) {
            const ids = new Set(this._items.map(s => s.id))
            for (const id of this._components.keys()) if (!ids.has(id)) this._components.delete(id)
        }
    }

    updated() {
        this.querySelectorAll('.wb-item img:not([draggable="false"])').forEach(img => { img.draggable = false })
    }

    get _layoutKey() { return `board_layout${location.pathname}` } // per-pathname — each page independent
    get _itemEls()   { return this.querySelectorAll(':scope > .wb-board > .wb-item') } // not a nested board's items
    get _txt()       { return txtLingo(this.txt, TXT_STD, this.lang) }

    // variant: { theme, light: {...}, dark: {...} } (landing) hoặc phẳng { ui, mainColors, textColor } (shop)
    get _activeVariant() {
        const v = this.variant || {}
        return v[this.theme] ?? v
    }

    get _ui()         { return this._activeVariant.ui || 'pastel' }
    get _mainColors() { return this._activeVariant.mainColors || '' }
    get _textColor()  { return this._activeVariant.textColor || '' }

    // ==========================================
    // DATA CORE
    // ==========================================

    async _dcInit() {
        if (this.sections.length) this._items = [...this.sections].sort(byOrder)
        // BtnTheme/BtnLang đổi attribute trên <html> (không reload) — theo dõi cả hai.
        this._unwatchTheme = watchHtmlAttr('data-theme', (v) => { this.theme = v || 'light' })
        this._unwatchLang  = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' })
        // Cùng id với web-boxs — web-box.css chỉ vào <head> 1 lần.
        injectStyles('web-box-styles', boxStyles)
        injectStyles('web-board-styles', boardStyles)
        await this._dcLoadLayout()
        await this._dcLoadSections()
        this._ready = true
    }

    // Fired on every conductor change — only re-renders when a value actually differs.
    _dcMergeSectionOverrides(conductorSections) {
        if (!conductorSections.length || !this._items.length) return
        const byId = new Map(conductorSections.map(s => [s.id, s]))
        let changed = false
        const next = this._items.map(item => {
            const ov = byId.get(item.id)
            if (!ov) return item
            const patch = {}
            for (const k of OVERRIDE_KEYS) {
                if (ov[k] !== undefined && ov[k] !== item[k]) { patch[k] = ov[k]; changed = true }
            }
            return Object.keys(patch).length ? { ...item, ...patch } : item
        })
        if (changed) this._items = next
    }

    // Đồng bộ theme/ui/mainColors/textColor từ conductor root (svc-setting.js patch) vào đúng theme key của variant —
    // không thì lần re-render kế tiếp ghi đè giá trị svc-setting vừa đổi.
    _dcSyncVariant(s) {
        if (s.theme !== undefined && s.theme !== this.theme) this.theme = s.theme
        const patch = {}
        for (const k of ['ui', 'mainColors', 'textColor']) if (s[k] !== undefined) patch[k] = s[k]
        if (!Object.keys(patch).length) return
        const base = this.variant || {}
        const key  = s.theme ?? this.theme
        this.variant = (base[key] !== undefined || base.light !== undefined || base.dark !== undefined)
            ? { ...base, [key]: { ...base[key], ...patch } }
            : { ...base, ...patch }
    }

    async _dcSaveLayout() {
        await _layoutSet(this._layoutKey, this._items.map((s, i) => ({ id: s.id, col: s.col ?? '12', sort: i })), 0)
    }

    async _dcLoadLayout() {
        const layout = await _layoutGet(this._layoutKey)
        if (!Array.isArray(layout) || !layout.length) return
        const byId   = new Map(this._items.map(s => [s.id, s]))
        const saved  = [...layout].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
            .map(({ id, col }) => byId.has(id) ? { ...byId.get(id), col } : null).filter(Boolean)
        const savedIds = new Set(layout.map(l => l.id))
        if (saved.length) this._items = [...saved, ...this._items.filter(s => !savedIds.has(s.id))]
    }

    // Non-paged data sections fetched in PARALLEL (was one await per section); paged ones fetch themselves in web-boxs.
    async _dcLoadSections() {
        const targets = this._items.filter(sec => !sec.component && !(sec.loadLimit > 0) && (sec.dataTable || sec.dataSrc))
        const entries = await Promise.all(targets.map(async (sec) => {
            try {
                await conductorAll(sec.id, { dataTable: sec.dataTable, dataSrc: sec.dataSrc, cache: sec.cache })
                return [sec.id, conductorGet(sec.id)?.data ?? []]
            } catch { return [sec.id, []] }
        }))
        this._live = Object.fromEntries(entries)
    }

    // ==========================================
    // DATA HEAD — Drag / Drop
    // ==========================================

    _dhDragStart(e, idx) {
        if (!e.currentTarget.draggable) { e.preventDefault(); return }
        this._dragIdx = idx
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(idx))
        const target = e.currentTarget
        requestAnimationFrame(() => target?.classList.add('is-dragging'))
    }

    _dhDragOver(e, idx) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (this._dragOver !== idx) { this._dragOver = idx; this.requestUpdate() }
    }

    _dhDragLeave(_e, idx) {
        if (this._dragOver === idx) { this._dragOver = null; this.requestUpdate() }
    }

    _dhDrop(e, idx) {
        e.preventDefault()
        const from = this._dragIdx
        if (from == null || from === idx) { this._dhDragEnd(); return }
        const arr = [...this._items]
        const [moved] = arr.splice(from, 1)
        arr.splice(idx, 0, moved)
        this._items    = arr
        this._dragIdx  = null
        this._dragOver = null
        this._dcSaveLayout()
        this._emit('block-reorder', { sections: this._items })
    }

    _dhDragEnd() {
        this._itemEls.forEach(el => { el.draggable = false; el.classList.remove('is-dragging') })
        this._dragIdx  = null
        this._dragOver = null
        this.requestUpdate()
    }

    _dhHandleDown(e, idx) {
        e.stopPropagation()
        const el = this._itemEls[idx]
        if (!el) return
        el.draggable = true
        const reset = () => { el.draggable = false }
        el.addEventListener('pointerup',     reset, { once: true })
        el.addEventListener('pointercancel', reset, { once: true })
    }

    // ==========================================
    // DATA HEAD — Resize (gi-col-x)
    // ==========================================

    _dhResizeStart(e, idx) {
        e.preventDefault()
        e.stopPropagation()
        const board = this.querySelector(':scope > .wb-board')
        const gap   = parseFloat(getComputedStyle(board).columnGap) || 8
        const w0    = parseInt(this._items[idx]?.col) || 12
        this._resize = { idx, x0: e.clientX, w0, cur: w0, colW: (board.getBoundingClientRect().width - 11 * gap) / 12 }
        board.classList.add('is-resizing')
        const onMove = (ev) => this._dhResizeMove(ev)
        const onUp   = () => {
            this._dhResizeEnd()
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup',   onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup',   onUp)
    }

    _dhResizeMove(e) {
        const r = this._resize
        if (!r) return
        const w = Math.max(1, Math.min(12, r.w0 + Math.round((e.clientX - r.x0) / r.colW)))
        if (r.cur === w) return
        r.cur = w
        const el = this._itemEls[r.idx]
        if (!el) return
        for (let i = 1; i <= 12; i++) el.classList.remove(`gi-col-${i}`)
        el.classList.add(`gi-col-${w}`)
    }

    _dhResizeEnd() {
        const r = this._resize
        if (!r) return
        this._resize = null
        this.querySelector(':scope > .wb-board')?.classList.remove('is-resizing')
        const col = String(r.cur)
        if (String(this._items[r.idx]?.col) === col) return
        const arr = [...this._items]
        arr[r.idx] = { ...arr[r.idx], col }
        this._items = arr
        this._dcSaveLayout()
        this._emit('block-resize', { sections: this._items })
    }

    // ==========================================
    // DATA HEAD — owner actions
    // ==========================================

    _emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
    }

    _dhConfigure(sec, i) { this._emit('section-configure', { sectionId: sec.id, index: i }) }

    // 2 bước: ✕ chỉ mở dialog; 'section-remove' bắn lên consumer CHỈ khi bấm Xác nhận.
    _dhRemoveClick(sec, i) { this._confirmRemove = { sec, i } }
    _dhCancelRemove()      { this._confirmRemove = null }
    _dhConfirmRemove() {
        const pending = this._confirmRemove
        this._confirmRemove = null
        if (pending) this._emit('section-remove', { sectionId: pending.sec.id, index: pending.i })
    }

    // ==========================================
    // RENDER BODY — section → web-boxs | custom element
    // ==========================================

    // sec.configKey (kể cả rỗng) = section thuộc flow configurable; `owner` + configList quyết định clickable.
    _rbEmpty(sec, i) {
        const configurable = this.owner && sec.configList?.length > 0
        return html`
            <div class="wb-empty${configurable ? ' is-clickable' : ''}"
                @click=${configurable ? () => this._dhConfigure(sec, i) : null}>
                ${configurable ? this._txt.pick : this._txt.empty}
            </div>
        `
    }

    _rfConfirmRemoveDialog() {
        if (!this.owner || !this._confirmRemove) return ''
        return html`
            <web-dialog open title=${this._txt.removeTitle} ui=${this._ui} theme=${this.theme} maxWidth="360px" persistent
                @confirm=${this._dhConfirmRemove} @cancel=${this._dhCancelRemove}>
                <p>${this._txt.removeBody}</p>
            </web-dialog>
        `
    }

    // Element created ONCE per section and patched in place: theme/lang changes no longer destroy its state,
    // and nothing from section data is ever parsed as HTML.
    _rbComponent(sec) {
        if (!CUSTOM_TAG.test(sec.component)) {
            console.warn(`[web-board] section "${sec.id}": "${sec.component}" is not a custom-element name — skipped`)
            return ''
        }
        let el = this._components.get(sec.id)
        if (el?.localName !== sec.component) {
            el = document.createElement(sec.component)
            this._components.set(sec.id, el)
        }
        const attrs = { ui: this._ui, theme: this.theme, mainColors: this._mainColors, textColor: this._textColor, lang: this.lang }
        if (sec.dataSrc)   attrs.dataSrc   = sec.dataSrc
        if (sec.dataTable) attrs.dataTable = sec.dataTable
        for (const [k, v] of Object.entries(sec)) if (k.startsWith('dataSrc') && k !== 'dataSrc' && v != null) attrs[kebab(k)] = v
        for (const [k, v] of Object.entries(attrs)) if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v)
        return html`<div class="${sec.container ? 'gi-container' : ''}">${el}</div>`
    }

    _rbBoxs(sec) {
        if (sec.component) return this._rbComponent(sec)

        const filterState = {
            sectionId: sec.id,
            emptyText: sec.emptyText || '',
            tags:      sec.tags?.data        ?? [],
            field:     sec.tags?.filterField ?? 'tags',
            color:     sec.tags?.filterColor ?? 'primary',
            active:    [],
            query:     '',
            ranges:     [], // { key, label, min, max }[] — numeric price-range chips
            rangeField: 'pricing',
            rangeKey:   '',
            ...(sec.filterState || {}),
        }
        const source = sec.dataTable || sec.dataSrc
        // loadLimit > 0: web-boxs tự fetch phân trang (conductor all/more) — chỉ bind nguồn, không .data.
        const paged = sec.loadLimit > 0 && source
        const data  = paged ? undefined : source ? (this._live[sec.id] ?? []) : (sec.data || [])

        return html`
        <div style="position:relative;${cssInline(sec.stys || {})}">
            ${bgTemplate(sectionBg(sec.config))}
            <div class="${sec.container ? 'gi-container' : ''}">
                <web-boxs
                    .config=${sec.config || {}}
                    .data=${data}
                    .dataSrc=${paged ? sec.dataSrc || '' : undefined}
                    .dataTable=${paged ? sec.dataTable || '' : undefined}
                    .loadLimit=${paged ? sec.loadLimit : 0}
                    .cache=${sec.cache}
                    .filters=${sec.filters}
                    .col=${sec.col}
                    .filterState=${filterState}
                    .stysWrap=${{ gap: '1rem' }}
                    .mainColors=${this._mainColors}
                    .textColor=${this._textColor}
                    animeQueue="150ms"
                    list=${sec.list ?? (sec.config?.slider ? 'slider' : '')}
                    ui=${this._ui}
                    theme=${this.theme}
                    lang=${this.lang}
                    ?showSearch=${!!sec.showSearch}
                    ?masonry=${!!sec.masonry}
                    ?responsive=${sec.responsive ?? this.responsive}
                    ?zoom=${!!sec.zoom}
                ></web-boxs>
            </div>
        </div>
        `
    }

    // ==========================================
    // RENDER
    // ==========================================

    _rbHandles(sec, i) {
        const configurable = this.owner && sec.configList?.length
        if (!this.draggable && !this.resizable && !configurable) return ''
        return html`
            <div class="wb-handles wb-handles-${this.handles === 'static' ? 'static' : 'absolute'}">
                ${this.owner && this.draggable ? html`<span class="wb-drag-handle"   @pointerdown=${(e) => this._dhHandleDown(e, i)}>⠿</span>` : ''}
                ${this.owner && this.resizable ? html`<span class="wb-resize-handle" @pointerdown=${(e) => this._dhResizeStart(e, i)}>↔</span>` : ''}
                ${configurable ? html`<span class="wb-config-handle" @click=${() => this._dhConfigure(sec, i)}>⚙</span>` : ''}
                ${configurable ? html`<span class="wb-remove-handle" @click=${() => this._dhRemoveClick(sec, i)}>⤫</span>` : ''}
            </div>`
    }

    render() {
        const drag = this.draggable
        return html`
            <div class="gi-wrap wb-board${this.responsive ? ' responsive' : ''}${this._ready ? ' is-ready' : ''}">
                ${this._items.map((sec, i) => html`
                    <div
                        id="${sec.id}"
                        class="gi gi-col-${sec.col || '12'} wb-item${this._dragOver === i ? ' wb-over' : ''}"
                        data-section="${sec.id || i}"
                        @dragstart=${drag ? (e) => this._dhDragStart(e, i) : null}
                        @dragover=${drag  ? (e) => this._dhDragOver(e, i)  : null}
                        @dragleave=${drag ? (e) => this._dhDragLeave(e, i) : null}
                        @drop=${drag      ? (e) => this._dhDrop(e, i)      : null}
                        @dragend=${drag   ? () => this._dhDragEnd()        : null}
                    >
                        ${this._rbHandles(sec, i)}
                        ${sec.configKey !== undefined && !sec.config ? this._rbEmpty(sec, i) : this._rbBoxs(sec)}
                    </div>
                `)}
            </div>
            ${this._rfConfirmRemoveDialog()}
        `
    }
}

if (!customElements.get('web-board')) customElements.define('web-board', WebBoard)
