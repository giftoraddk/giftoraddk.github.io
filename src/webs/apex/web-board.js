import { LitElement, html } from 'lit'
import { _Fusion, injectStyles, watchHtmlAttr } from '@/services/helper'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { cssInline } from "@/services/helper.js";
import { state as conductorState, all as conductorAll, get as conductorGet } from '@/services/conductor.js'
import boxStyles   from './styles/web-box.css?inline'
import boardStyles from './styles/web-board.css?inline'
import { bgTemplate } from '@/webs/underlay/svc-underlay.js'
import '@/webs/apex/web-boxs.js'
import '@/webs/apex/web-dialog.js'

// Fields svc-setting.js can edit per section (xem _sectionsFromPages / _comSectionsForm) —
// allowlist tránh rò rỉ field nội bộ của conductor section (data, _loadingMore, _page, …)
// vào board item khi merge.
const OVERRIDE_KEYS = ['config']

export class WebBoard extends LitElement {

    createRenderRoot() { return this } // light DOM — Tailwind & global styles apply inside

    static properties = {
        theme:      { type: String },
        // Astro serializes object props passed to a custom element as a plain string attribute
        // (no JSX-style property binding like Lit's own .prop= syntax) — cần converter JSON tự
        // parse lại, giống hệt cách `sections` bên dưới đã làm. Bind trực tiếp qua .variant=${...}
        // trong 1 lit template (vd svc-bay-sections.js) thì bỏ qua converter này, gán object thẳng.
        variant:    { converter: { fromAttribute: v => { try { return JSON.parse(v) } catch { return {} } } } },
        container:  { type: Boolean },
        draggable:  { type: Boolean },
        resizable:  { type: Boolean },
        responsive: { type: Boolean }, // container queries cho span cột (xem web-box.css) — áp lên chính wb-board + forward xuống mọi <web-boxs> con
        handles:    { type: String }, // 'absolute' (mặc định, đè lên góc trên-phải) | 'static' (nằm trong flow, luôn hiện, đẩy nội dung xuống)
        unlock:     { type: String },
        lang:       { type: String }, // 'vi' | 'en' — theo dõi <html lang> (xem BtnLang.astro), forward xuống web-boxs/web-boxs-search i18n (TXT_STD)
        sections:   { converter: { fromAttribute: v => { try { return JSON.parse(v) } catch { return [] } } } },
        owner:      { type: Boolean }, // true → hiện wb-config-handle (⚙) + wb-remove-handle (✕) trên section configurable (sec.configList?.length) — gate owner tập trung ở đây, consumer không cần tự ẩn/hiện configList theo owner nữa
        _items:         { state: true },
        _live:          { state: true },
        _ready:         { state: true },
        _confirmRemove: { state: true }, // { sec, i } đang chờ xác nhận xóa qua web-dialog, null = không có
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
        this._items     = []
        this._live      = {}
        this._ready     = false
        this._confirmRemove = null
        this._dragIdx   = null
        this._dragOver  = null
        this._resizeIdx = null
        this._resizeCur = null
        this._resizeW0  = null
        this._resizeX0  = null
        this._colW      = null
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    connectedCallback() {
        super.connectedCallback()
        _Fusion.run(this.unlock)
        // Read sections from embedded <script type="application/json"> child, then
        // remove it immediately — keeps DOM clean. Must run before Lit's first render
        // replaces the light-DOM children. API responses are cached 5 min via storager.
        const jsonEl = this.querySelector('script[type="application/json"]')
        if (jsonEl) {
            try { this.sections = JSON.parse(jsonEl.textContent) } catch {}
            jsonEl.remove()
        }
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
        if (changed.has('sections') && this.sections.length)
            this._items = this._sortBySortField(this.sections)
    }

    updated() {
        this.querySelectorAll('.wb-item img:not([draggable="false"])').forEach(img => {
            img.draggable = false
        })
    }

    // ── Keys (per-pathname so each page is fully independent) ─────────────────

    get _layoutKey() { return `board_layout${location.pathname}` }

    // ── Variant (theme-aware ui/color resolution) ──────────────────────────────
    // variant có thể là { theme, light: {...}, dark: {...} } (landing pages) hoặc
    // 1 object phẳng { ui, mainColors, textColor(s) } (shop pages, không phân biệt theme)
    // — resolve theo this.theme (đã reactive qua _themeObserver) nếu là dạng theme-keyed.
    get _activeVariant() {
        const v = this.variant || {}
        return v[this.theme] ?? v
    }

    get _ui()         { return this._activeVariant.ui || 'spatial' }
    get _mainColors() { return this._activeVariant.mainColors || '' }
    get _textColor()  { return this._activeVariant.textColor || this._activeVariant.textColor || '' }

    // ── Storager (cached single import) ───────────────────────────────────────

    async _store() {
        if (!this._storager) this._storager = (await import('@/services/storager')).default
        return this._storager
    }

    // Sort sections by their `sort` field (ascending); sections without sort go last
    _sortBySortField(arr) {
        return [...arr].sort((a, b) => (a.sort ?? 9999) - (b.sort ?? 9999))
    }

    // ==========================================
    // DATA CORE
    // ==========================================

    async _dcInit() {
        if (this.sections.length) this._items = this._sortBySortField(this.sections)

        // BtnTheme.astro/BtnLang.astro set attributes on <html> + a cookie on toggle (no
        // reload) — watch both so web-boxs/web-boxs-search's TXT_STD i18n and theme-dependent
        // rendering actually react.
        this._unwatchTheme = watchHtmlAttr('data-theme', (v) => { this.theme = v || 'light' })
        this._unwatchLang  = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi' })

        this._dcInjectStyles()
        await this._dcLoadLayout()
        await this._dcLoadSections()
        this._ready = true
    }

    _dcInjectStyles() {
        injectStyles('web-board-styles', boxStyles + '\n' + boardStyles)
    }

    // Fired on every conductor change — only re-renders when a value actually differs.
    _dcMergeSectionOverrides(conductorSections) {
        if (!conductorSections.length || !this._items.length) return
        let changed = false
        const next = this._items.map(item => {
            const ov = conductorSections.find(s => s.id === item.id)
            if (!ov) return item
            const patch = {}
            for (const k of OVERRIDE_KEYS) {
                if (ov[k] !== undefined && ov[k] !== item[k]) { patch[k] = ov[k]; changed = true }
            }
            return Object.keys(patch).length ? { ...item, ...patch } : item
        })
        if (changed) this._items = next
    }

    // Đồng bộ theme/ui/mainColors/textColor với conductor root state (patch từ svc-setting.js)
    // vào this.variant ở đúng theme key đang sửa — nếu không, giá trị variant chỉ được set 1 lần
    // từ Astro SSR, và lần re-render kế tiếp (vd sau _dcMergeSectionOverrides) sẽ ghi đè mất giá
    // trị svc-setting.js vừa patch() trực tiếp lên DOM.
    _dcSyncVariant(s) {
        if (s.theme !== undefined && s.theme !== this.theme) this.theme = s.theme

        const patch = {}
        if (s.ui         !== undefined) patch.ui         = s.ui
        if (s.mainColors !== undefined) patch.mainColors = s.mainColors
        if (s.textColor  !== undefined) patch.textColor = s.textColor
        if (!Object.keys(patch).length) return

        const base = this.variant || {}
        const key  = s.theme ?? this.theme
        this.variant = (base[key] !== undefined || base.light !== undefined || base.dark !== undefined)
            ? { ...base, [key]: { ...base[key], ...patch } }
            : { ...base, ...patch }
    }

    async _dcSaveLayout() {
        const layout = this._items.map((s, i) => ({ id: s.id, col: s.col ?? '12', sort: i }))
        ;(await this._store()).set(this._layoutKey, layout, 0)
    }

    async _dcLoadLayout() {
        const S      = await this._store()
        const layout = await S.get(this._layoutKey)
        if (!Array.isArray(layout) || !layout.length) return

        const byId    = new Map(this._items.map(s => [s.id, s]))
        const sorted  = [...layout].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        const saved   = sorted.map(({ id, col }) => byId.has(id) ? { ...byId.get(id), col } : null).filter(Boolean)
        const savedIds = new Set(layout.map(l => l.id))
        const extra   = this._items.filter(s => !savedIds.has(s.id))
        if (saved.length) this._items = [...saved, ...extra]
    }

    async _dcLoadSections() {
        const live = {}
        for (const sec of this._items) {
            if (sec.component) continue
            if (sec.loadLimit > 0) continue   // web-boxs tự fetch phân trang, xem _rbBoxs()
            if (!sec.dataTable && !sec.dataSrc) continue
            try {
                await conductorAll(sec.id, { dataTable: sec.dataTable, dataSrc: sec.dataSrc, cache: sec.cache })
                live[sec.id] = conductorGet(sec.id)?.data ?? []
            } catch { live[sec.id] = [] }
        }
        this._live = live
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
        if (from == null || from === idx) { this._dhDragEnd(e); return }
        const arr = [...this._items]
        const [moved] = arr.splice(from, 1)
        arr.splice(idx, 0, moved)
        this._items    = arr
        this._dragIdx  = null
        this._dragOver = null
        this._dcSaveLayout()
        this.dispatchEvent(new CustomEvent('block-reorder', { detail: { sections: this._items }, bubbles: true, composed: true }))
    }

    _dhDragEnd(_e) {
        this.querySelectorAll('.wb-item').forEach(el => {
            el.draggable = false
            el.classList.remove('is-dragging')
        })
        this._dragIdx  = null
        this._dragOver = null
        this.requestUpdate()
    }

    _dhHandleDown(e, idx) {
        e.stopPropagation()
        const el = this.querySelectorAll('.wb-item')[idx]
        if (!el) return
        el.draggable = true
        const reset = () => { el.draggable = false }
        el.addEventListener('pointerup',     reset, { once: true })
        el.addEventListener('pointercancel', reset, { once: true })
    }

    // ==========================================
    // DATA HEAD — Resize (based on gi-col-x)
    // ==========================================

    _dhResizeStart(e, idx) {
        e.preventDefault()
        e.stopPropagation()
        const board = this.querySelector('.wb-board')
        const gap   = parseFloat(getComputedStyle(board).columnGap) || 8
        this._colW      = (board.getBoundingClientRect().width - 11 * gap) / 12
        this._resizeIdx = idx
        this._resizeX0  = e.clientX
        this._resizeW0  = parseInt(this._items[idx]?.col) || 12
        this._resizeCur = this._resizeW0
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
        if (this._resizeIdx == null) return
        const newW = Math.max(1, Math.min(12, this._resizeW0 + Math.round((e.clientX - this._resizeX0) / this._colW)))
        if (this._resizeCur === newW) return
        this._resizeCur = newW
        const el = this.querySelectorAll('.wb-item')[this._resizeIdx]
        if (!el) return
        for (let i = 1; i <= 12; i++) el.classList.remove(`gi-col-${i}`)
        el.classList.add(`gi-col-${newW}`)
    }

    _dhResizeEnd() {
        if (this._resizeIdx == null) return
        const idx  = this._resizeIdx
        const newW = String(this._resizeCur)
        this._resizeIdx = null
        this.querySelector('.wb-board')?.classList.remove('is-resizing')
        if (String(this._items[idx]?.col) !== newW) {
            const arr = [...this._items]
            arr[idx]  = { ...arr[idx], col: newW }
            this._items = arr
            this._dcSaveLayout()
            this.dispatchEvent(new CustomEvent('block-resize', { detail: { sections: this._items }, bubbles: true, composed: true }))
        }
    }

    // ==========================================
    // RENDER BODY — section → web-boxs
    // ==========================================

    _dhConfigure(sec, i) {
        this.dispatchEvent(new CustomEvent('section-configure', { detail: { sectionId: sec.id, index: i }, bubbles: true, composed: true }))
    }

    // 2 bước: click ✕ chỉ mở dialog xác nhận (_confirmRemove), bắn 'section-remove' lên
    // consumer CHỈ khi bấm Xác nhận trong _rfConfirmRemoveDialog() — component gọi web-board
    // (vd svc-channel-sections.js) không cần tự làm confirm dialog riêng nữa.
    _dhRemoveClick(sec, i) {
        this._confirmRemove = { sec, i }
    }

    _dhConfirmRemove() {
        const pending = this._confirmRemove
        this._confirmRemove = null
        if (!pending) return
        this.dispatchEvent(new CustomEvent('section-remove', { detail: { sectionId: pending.sec.id, index: pending.i }, bubbles: true, composed: true }))
    }

    _dhCancelRemove() {
        this._confirmRemove = null
    }

    // sec.configKey (kể cả rỗng) đánh dấu "section thuộc flow configurable" — section khác
    // không set field này (vd sec.component, hoặc config tĩnh) không bị ảnh hưởng, vẫn đi
    // thẳng _rbBoxs() như trước. `owner` quyết định clickable hay không (tập trung ở đây, xem
    // comment prop `owner`) — configList vẫn phải có ít nhất 1 phần tử mới cho phép click.
    _rbEmpty(sec, i) {
        const configurable = this.owner && sec.configList?.length > 0
        return html`
            <div class="wb-empty${configurable ? ' is-clickable' : ''}"
                @click=${configurable ? () => this._dhConfigure(sec, i) : null}>
                ${configurable ? 'Chọn section' : 'Chưa có nội dung'}
            </div>
        `
    }

    _rfConfirmRemoveDialog() {
        if (!this.owner || !this._confirmRemove) return ''
        return html`
            <web-dialog open title="Xóa section?" ui=${this._ui} theme=${this.theme} maxWidth="360px" persistent
                @confirm=${this._dhConfirmRemove} @cancel=${this._dhCancelRemove}>
                <p>Bạn có chắc muốn xóa section này? Hành động này không thể hoàn tác.</p>
            </web-dialog>
        `
    }

    _rbBoxs(sec) {
        if (sec.component) {
            const dataSrcAttr   = sec.dataSrc   ? ` dataSrc="${sec.dataSrc}"`     : ''
            const dataTableAttr = sec.dataTable ? ` dataTable="${sec.dataTable}"` : ''
            const extraApis   = Object.entries(sec)
                .filter(([k]) => k.startsWith('dataSrc') && k !== 'dataSrc')
                .map(([k, v]) => ` ${k.replace(/([A-Z])/g, m => '-' + m.toLowerCase())}="${v}"`)
                .join('')
            const attrs = `ui="${this._ui}" theme="${this.theme}" mainColors="${this._mainColors}" textColor="${this._textColor}" lang="${this.lang}"${dataSrcAttr}${dataTableAttr}${extraApis}`
            return unsafeHTML(`<div class="${sec.container ? 'gi-container' : ''}"><${sec.component} ${attrs}></${sec.component}></div>`)
        }

        const filterState = {
            sectionId: sec.id,
            emptyText: sec.emptyText || '',
            tags:      sec.tags?.data        ?? [],
            field:     sec.tags?.filterField ?? 'tags',
            color:     sec.tags?.filterColor ?? 'primary',
            active:    [],
            query:     '',
            ranges:      [], // { key, label, min, max }[] — numeric price-range chips (see web-boxs.js's _applyFilter)
            rangeField:  'pricing',
            rangeKey:    '',
            ...(sec.filterState || {}),
        }

        // Paginated sections (loadLimit > 0): web-boxs tự fetch qua conductor (all/more),
        // KHÔNG pre-fetch/pass .data — chỉ bind dataSrc/dataTable/loadLimit để _loadData() tự trigger.
        const paged = sec.loadLimit > 0 && (sec.dataTable || sec.dataSrc)
        const data  = (!paged && (sec.dataTable || sec.dataSrc)) ? (this._live[sec.id] ?? []) : (sec.data || [])
        const list  = sec.list ?? (sec.config?.slider ? 'slider' : '')

        // Only render section-level bg when config uses tiers layout; config.bg in card configs is card-level (used by web-box internally)
        const bg   = sec.config?.tiers?.length ? sec.config?.bg : null
        const bgEl = bgTemplate(bg)

        return html`
        <div style="position:relative;${cssInline(sec.stys || {})}">
            ${bgEl}
            <div class="${sec.container ? 'gi-container' : ''}">
                ${paged ? html`
                <web-boxs
                    .config=${sec.config || {}}
                    .dataSrc=${sec.dataSrc || ''}
                    .dataTable=${sec.dataTable || ''}
                    .loadLimit=${sec.loadLimit}
                    .cache=${sec.cache}
                    .filters=${sec.filters}
                    .col=${sec.col}
                    .filterState=${filterState}
                    .stysWrap=${{ gap: '1rem' }}
                    .mainColors=${this._mainColors}
                    .textColor=${this._textColor}
                    animeQueue="150ms"
                    list=${list}
                    ui=${this._ui}
                    theme=${this.theme}
                    lang=${this.lang}
                    ?showSearch=${!!sec.showSearch}
                    ?masonry=${!!sec.masonry}
                    ?responsive=${sec.responsive ?? this.responsive}
                    ?zoom=${!!sec.zoom}
                ></web-boxs>
                ` : html`
                <web-boxs
                    .config=${sec.config || {}}
                    .data=${data}
                    .col=${sec.col}
                    .filterState=${filterState}
                    .stysWrap=${{ gap: '1rem' }}
                    .mainColors=${this._mainColors}
                    .textColor=${this._textColor}
                    animeQueue="150ms"
                    list=${list}
                    ui=${this._ui}
                    theme=${this.theme}
                    lang=${this.lang}
                    ?showSearch=${!!sec.showSearch}
                    ?masonry=${!!sec.masonry}
                    ?responsive=${sec.responsive ?? this.responsive}
                    ?zoom=${!!sec.zoom}
                ></web-boxs>
                `}
            </div>
        </div>
        `
    }

    // ==========================================
    // RENDER
    // ==========================================

    render() {
        return html`
            <div class="gi-wrap wb-board${this.responsive ? ' responsive' : ''}${this._ready ? ' is-ready' : ''}">
                ${this._items.map((sec, i) => html`
                    <div
                        id="${sec.id}"
                        class="gi gi-col-${sec.col || '12'} wb-item${this._dragOver === i ? ' wb-over' : ''}"
                        data-section="${sec.id || i}"
                        @dragstart=${this.draggable ? (e) => this._dhDragStart(e, i) : null}
                        @dragover=${this.draggable  ? (e) => this._dhDragOver(e, i)  : null}
                        @dragleave=${this.draggable ? (e) => this._dhDragLeave(e, i) : null}
                        @drop=${this.draggable      ? (e) => this._dhDrop(e, i)      : null}
                        @dragend=${this.draggable   ? (e) => this._dhDragEnd(e)      : null}
                    >
                        ${this.draggable || this.resizable || (this.owner && sec.configList?.length) ? html`
                        <div class="wb-handles wb-handles-${this.handles === 'static' ? 'static' : 'absolute'}">
                            ${this.owner && this.draggable ? html`<span class="wb-drag-handle"   @pointerdown=${(e) => this._dhHandleDown(e, i)}>⠿</span>` : ''}
                            ${this.owner && this.resizable ? html`<span class="wb-resize-handle" @pointerdown=${(e) => this._dhResizeStart(e, i)}>↔</span>` : ''}
                            ${this.owner && sec.configList?.length ? html`<span class="wb-config-handle" @click=${() => this._dhConfigure(sec, i)}>⚙</span>` : ''}
                            ${this.owner && sec.configList?.length ? html`<span class="wb-remove-handle" @click=${() => this._dhRemoveClick(sec, i)}>⤫</span>` : ''}
                        </div>` : ''}
                        ${sec.configKey !== undefined && !sec.config ? this._rbEmpty(sec, i) : this._rbBoxs(sec)}
                    </div>
                `)}
            </div>
            ${this._rfConfirmRemoveDialog()}
        `
    }
}

if (!customElements.get('web-board')) customElements.define('web-board', WebBoard)
