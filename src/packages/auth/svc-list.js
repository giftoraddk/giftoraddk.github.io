// src/packages/auth/svc-list.js
//
// <svc-list> — mobile-first VIEW over app/record-table.js: `class SvcList extends RecordTable`, so the schema,
// column filter/search/sort state (incl. serverExecutor → wt-query-change), save/validate (_doSave), the
// field renderer (_rfField), repeater state, events and public API (openNew, applyAiDraft, closeEdit,
// saveCurrentEdit, filteredData) are RecordTable's own. The list look is shared with apex/web-table.js (its
// helpers: initials, tones, column tracks). Only the rendering is here:
//
//   - toolbar: search pill with a column picker (filter icon → search in any searchable / text column) and a
//     "Server" toggle: on = the parent re-queries the whole table (wt-query-change searches, prefix match —
//     see worker-adapter.js applyQueryOpts), off = filters the loaded rows (contains). Plus a filter/sort
//     menu (same dropdown as the column picker), reorder toggle, `actions` slot and a segmented quick filter
//     (first `filterable` column with opts)
//   - reorder mode (orderable): drag handle per row — Pointer Events, so mouse, touch and pen alike, auto-scrolls the
//     nearest scroller; ↑/↓ on the focused handle moves one step. Plus "to top" and "unpin" (tools/rank.js: a row
//     without `rank` falls back to sorting by last edit). Emits wt-move { id, prevId | nextId } / { id, direction }.
//   - list card: sticky LEAD cell (thumbnail + title + status pill), remaining columns scroll sideways,
//     sticky chevron; tap a header to sort (asc → desc → off)
//   - tap a row → detail/edit view in place (RecordTable's fields, sticky Save), back returns to that row
//   - slot "new-actions": extra buttons on the right of the "New" form header (svc-records: "Create with AI")
//
// Optional schema keys on top of RecordTable's: lead (sticky title column — default: first required text
// column), sub (pill under the title — default: first select column), thumb (image column — default: first
// photor column), hint (second header line), opts[].tone (pill colour: success|error|warning|info|…).

import { html, nothing, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { repeat } from 'lit/directives/repeat.js';
import { txtLingo } from '@/services/tools/lingo.js';
import { getPath } from '@/services/tools/util.js';
import { RANK_FIELD } from '@/services/tools/rank.js';
import { RecordTable, TXT_STD as BASE_TXT } from './app/record-table.js';
import { initialsOf, toneOf, optsOf, toneOfOpt, trackOf, thumbSrcOf } from '@/packages/apex/web-table.js';
import '@/packages/apex/web-pagination.js';
import css from './css/svc-list.css?inline';
import pmCss from '@/packages/adopted/css/prose-mirror.css?inline';

const TXT_STD = {
    vi: {
        ...BASE_TXT.vi,
        empty: 'Chưa có dữ liệu', noMatch: 'Không có kết quả phù hợp', save: 'Lưu', cancel: 'Huỷ',
        confirmDel: 'Xoá dòng này?', no: 'Huỷ', history: 'Lịch sử',
        aiFilling: 'AI đang điền dữ liệu…', all: 'Tất cả', searchBy: 'Tìm theo {col}', searchIn: 'Tìm trong cột',
        server: 'Server', serverOn: 'Tìm trên toàn bảng (máy chủ)', serverOff: 'Chỉ lọc dữ liệu đã tải', clearSearch: 'Xoá tìm kiếm', filters: 'Lọc & sắp xếp', asc: 'Tăng dần', desc: 'Giảm dần',
        sortBy: 'Sắp xếp theo', clear: 'Xoá bộ lọc', reorder: 'Sắp xếp thứ tự', newRow: 'Thêm mới', back: 'Quay lại',
        delete: 'Xoá', noPerm: 'Không có quyền', view: 'Xem nội dung', close: 'Đóng',
        top: 'Lên đầu', drag: 'Kéo để đổi thứ tự (phím ↑/↓)', unpin: 'Bỏ ưu tiên — về sắp theo ngày sửa', auto: 'Tự động — sắp theo ngày sửa',
    },
    en: {
        ...BASE_TXT.en,
        empty: 'No data yet', noMatch: 'No matching rows', save: 'Save', cancel: 'Cancel',
        confirmDel: 'Delete this row?', no: 'Cancel', history: 'History',
        aiFilling: 'AI is filling in data…', all: 'All', searchBy: 'Search {col}', searchIn: 'Search in column',
        server: 'Server', serverOn: 'Searches the whole table (server)', serverOff: 'Filters the loaded rows only', clearSearch: 'Clear search', filters: 'Filter & sort', asc: 'Ascending', desc: 'Descending',
        sortBy: 'Sort by', clear: 'Clear filters', reorder: 'Reorder', newRow: 'New', back: 'Back',
        delete: 'Delete', noPerm: 'No permission', view: 'View content', close: 'Close',
        top: 'Move to top', drag: 'Drag to reorder (↑/↓ keys)', unpin: 'Unpin — back to sorting by last edit', auto: 'Automatic — sorted by last edit',
    },
};

const NOT_SEARCHABLE = ['photor', 'password', 'repeater', 'editor'];
const END_W = 44;     // chevron column
const END_REORDER_W = 112; // top · pin · drag handle
const SEARCH_DEBOUNCE_MS = 380;
const DRAG_EDGE = 56;      // px from the scroller's edge where a drag auto-scrolls
const DRAG_SPEED = 18;     // max px per frame

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Nearest vertically scrolling ancestor, across shadow roots and slots (svc-node popover, dialog, page). */
function scrollParentOf(node) {
    for (let n = node; n;) {
        n = n.assignedSlot || n.parentElement || n.getRootNode?.().host || null;
        if (!n || n === document.documentElement || n === document.body) break;
        const oy = getComputedStyle(n).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
    }
    return document.scrollingElement || document.documentElement;
}

export class SvcList extends RecordTable {
    static styles = [unsafeCSS(css), unsafeCSS(pmCss)];

    // Merged by Lit with RecordTable's own properties.
    static properties = {
        // Form-field ui. 'modern' (opaque) by default; 'pastel' fields are a translucent base (no backdrop-filter),
        // so the canvas shows faintly through them — opt in where that reads well.
        fieldUi:      { type: String },
        caption:      { type: String }, // lead header text (default: the lead column's label)
        leadWidth:    { type: Number }, // px of the sticky lead column (0 = auto)
        // Search pill — its own state (not RecordTable's per-column _colSearch): server vs local is a toggle here,
        // not a property of the column. Applied in _clientFilteredData (local) / _serverQuery (server).
        _searchField:  { state: true }, // column it targets (null = default)
        _searchText:   { state: true },
        _searchServer: { state: true }, // null = default (the column's own serverExecutor), else the toggle
        _menu:         { state: true }, // open dropdown: 'search' (column picker) | 'filters' | null
        _reorder:     { state: true },
        _scrolled:    { state: true },  // columns slid under the lead cell → its edge shadow
        _more:        { state: true },  // columns still hidden past the right edge → the chevron's edge shadow
        _stuck:       { state: true },  // detail header pinned over the scrolling form → opaque + shadow
    };

    constructor() {
        super();
        this.height = 'auto';
        this.fieldUi = 'modern';
        this.caption = '';
        this.leadWidth = 0;
        this._searchField = null;
        this._searchText = '';
        this._searchServer = null;
        this._menu = null;
        this._searchTimer = null;
        this._reorder = false;
        this._scrolled = false;
        this._more = false;
        this._stuck = false;
        this._resizeObs = null;
        this._stuckObs = null;
        this._returnTo = null; // row id to scroll back to when the detail view closes
        this._drag = null;     // live drag (plain field — rows move by inline transform, no re-render mid-drag)
        this._onDragMove = this._onDragMove.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);
        this._onDragCancel = this._onDragCancel.bind(this);
    }

    // ── RecordTable overrides ──────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _fieldUi() { return this.fieldUi || 'modern'; }
    get _fieldHeight() { return '40px'; }

    willUpdate(changed) {
        super.willUpdate(changed);
        if (changed.has('_searchText') || changed.has('_searchField') || changed.has('_searchServer')) this._page = 1;
        // The row being edited vanished (deleted / filtered out server-side) → back to the list
        if (changed.has('data') && !this.single && this._editId && this._editId !== 'new'
            && !(this.data || []).some(r => r.id === this._editId)) {
            this._editId = null;
        }
    }

    connectedCallback() {
        super.connectedCallback();
        // Panel resized (fullscreen toggle, rotation) → the edge shadows may appear / go
        this._resizeObs = new ResizeObserver(() => this._measureScroll());
        this._resizeObs.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._resizeObs?.disconnect();
        this._resizeObs = null;
        this._stuckObs?.disconnect();
        this._stuckObs = null;
        this._dragFinish(false);
    }

    updated(changed) {
        super.updated(changed);
        if (['data', 'columns', 'schema', '_editId', '_reorder', '_page'].some(k => changed.has(k))) this._measureScroll();
        if (changed.has('_editId')) this._observeStuck();
        if (changed.has('_editId') && this._editId == null && this._returnTo) {
            const id = this._returnTo;
            this._returnTo = null;
            this.renderRoot.querySelector(`.sl-row[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
        }
    }

    _dhScroll(e) { this._measureScroll(e.target); }

    /** Which edge shadows the horizontal scroll needs — only writes state when it actually changes. */
    _measureScroll(el = this.renderRoot?.querySelector('.sl-scroll')) {
        if (!el) return;
        const scrolled = el.scrollLeft > 2;
        const more = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        if (scrolled !== this._scrolled) this._scrolled = scrolled;
        if (more !== this._more) this._more = more;
    }

    /**
     * The detail header is see-through at rest (nothing under it yet — it blends into the panel) and opaque
     * only once it's pinned over the scrolling form. A 1px probe sits right above it: scrolled out of the
     * (ancestor-clipped) view while above the header = the header is stuck. Works whatever the scroller is.
     */
    _observeStuck() {
        this._stuckObs?.disconnect();
        this._stuckObs = null;
        const probe = this.renderRoot?.querySelector('.sl-stuck-probe');
        if (!probe) { this._stuck = false; return; }
        this._stuckObs = new IntersectionObserver(([e]) => {
            const head = probe.nextElementSibling;
            this._stuck = !e.isIntersecting && !!head && e.boundingClientRect.top < head.getBoundingClientRect().top;
        });
        this._stuckObs.observe(probe);
    }

    /** + the search pill when it filters locally. */
    get _clientFilteredData() {
        const data = super._clientFilteredData;
        const col = this._searchCol, q = this._searchText.trim().toLowerCase();
        if (!q || !col || this._serverSearch) return data;
        return data.filter(r => String(getPath(r, col.key || col.field) ?? '').toLowerCase().includes(q));
    }

    /** Server searches come from the search pill only (svc-list has no per-column search inputs). */
    get _serverQuery() {
        const query = super._serverQuery, col = this._searchCol, q = this._searchText.trim();
        return { ...query, searches: this._serverSearch && col && q ? { [col.field]: q } : {} };
    }

    // ── Columns ─────────────────────────────────────────────────────────────────

    /** Column roles, worked out once per columns / schema change (RecordTable's _colInfo cache) — not per row. */
    _buildColInfo(src) {
        const info = super._buildColInfo(src), display = info.display;
        const hasOpts = c => optsOf(c).length > 0;
        const lead = display.find(c => c.lead)
            ?? display.find(c => c.required && (!c.type || c.type === 'text'))
            ?? display.find(c => !c.type || c.type === 'text')
            ?? display[0];
        const sub = display.find(c => c.sub && c !== lead) ?? display.find(c => c.type === 'select' && hasOpts(c) && c !== lead);
        // Image column — also looked up in `schema`, so a trimmed `columns` list keeps its thumbnails.
        const all = [...src, ...(this.schema || [])];
        const quick = src.find(c => c.filterable && hasOpts(c));
        // Search pill targets: `searchable` first (server ones lead), then plain text-ish columns.
        const rank = c => (c.searchable ? (c.serverExecutor ? 0 : 1) : 2);
        const search = src.filter(c => c.label && (c.searchable
            || (c.width && !NOT_SEARCHABLE.includes(c.type) && !(c.type === 'select' && hasOpts(c)))))
            .sort((a, b) => rank(a) - rank(b));
        return {
            ...info, lead, sub, quick, search,
            thumb: all.find(c => c.thumb) ?? all.find(c => c.type === 'photor'),
            scroll: display.filter(c => c !== lead && c !== sub),
            menuFilters: src.filter(c => c.filterable && hasOpts(c) && c !== quick),
            sort: src.filter(c => c.sortable),
        };
    }

    get _lead() { return this._colInfo.lead; }
    get _sub() { return this._colInfo.sub; }
    get _thumb() { return this._colInfo.thumb; } // set → every row gets a thumb (its image, else its initials)
    get _scrollCols() { return this._colInfo.scroll; }
    get _quickFilterCol() { return this._colInfo.quick; }
    get _searchCols() { return this._colInfo.search; }
    get _menuFilterCols() { return this._colInfo.menuFilters; }
    get _sortCols() { return this._colInfo.sort; }

    get _searchCol() {
        const cols = this._searchCols, lead = this._lead;
        return cols.find(c => c.field === this._searchField)
            ?? (lead?.searchable ? lead : null)
            ?? cols.find(c => c.searchable)
            ?? (cols.includes(lead) ? lead : cols[0]);
    }

    /** Active conditions set from the filter menu (badge on its button). */
    get _filterCount() {
        const n = this._menuFilterCols.filter(c => this._colFilters[c.field] || this._colFilters[c.field] === 0).length;
        return n + (this._colSort ? 1 : 0);
    }

    get _serverSearch() { return this._searchServer ?? Boolean(this._searchCol?.serverExecutor); }

    get _hasQuery() {
        return Boolean(this._searchText.trim()) || Object.values(this._colFilters).some(v => v || v === 0);
    }

    get _leadW() { return this.leadWidth || (this._thumb ? 208 : 172); }

    /** Every row gets the same explicit width, so fr tracks resolve identically and columns line up. */
    get _gridVars() {
        const tracks = this._scrollCols.map(trackOf);
        const end = this._reorder ? END_REORDER_W : END_W;
        const cols = [`${this._leadW}px`, ...tracks.map(t => t.track), `${end}px`].join(' ');
        const min = this._leadW + tracks.reduce((a, t) => a + t.min, 0) + end;
        return `--sl-cols:${cols};--sl-min:${min}px`;
    }

    // ── Data Head ───────────────────────────────────────────────────────────────

    /** Server mode re-queries after a pause in typing (spares DB reads); local mode filters on render. */
    _dhSearchInput(value) {
        this._searchText = value;
        clearTimeout(this._searchTimer);
        if (!this._serverSearch) return;
        this._searchTimer = setTimeout(() => this._emitQueryChange(), value ? SEARCH_DEBOUNCE_MS : 0);
    }

    /** Point the search at another column — the typed text moves with it. */
    _dhSearchColumn(field) {
        this._menu = null;
        if (this._searchCol?.field === field) return;
        this._searchServer ??= this._serverSearch; // the toggle stays as shown — a column never flips it
        this._searchField = field;
        if (this._searchText.trim() && this._serverSearch) this._emitQueryChange();
        this.updateComplete.then(() => this.renderRoot.querySelector('.sl-search input')?.focus());
    }

    /** "Server" toggle — moving the text between server and local re-queries without it / with it. */
    _dhSearchServer(on) {
        if (on === this._serverSearch) return;
        this._searchServer = on;
        clearTimeout(this._searchTimer);
        if (this._searchText.trim()) this._emitQueryChange();
    }

    /** Header tap: asc → desc → off (RecordTable's _dhColSort toggles a repeated direction off). */
    _dhSortCycle(col) {
        if (!col?.sortable || !this._perms.sort) return;
        const cur = this._colSort?.field === col.field ? this._colSort.dir : null;
        this._dhColSort(col.field, cur === 'asc' || cur === 'desc' ? 'desc' : 'asc');
    }

    /** Reorder works on the list in its own (rank) order — a column sort would make "the row above" meaningless. */
    _dhReorder() {
        this._reorder = !this._reorder;
        if (!this._reorder || !this._colSort) return;
        const server = this._colsByField[this._colSort.field]?.serverExecutor;
        this._colSort = null;
        if (server) this._emitQueryChange();
    }

    /** Picking a sort leaves reorder mode. */
    _dhColSort(field, dir) {
        this._reorder = false;
        super._dhColSort(field, dir);
    }

    // ── Reorder: drag (Pointer Events — mouse / touch / pen) ─────────────────────

    _dhDragStart(e, id) {
        if (this._drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const rowEl = e.currentTarget.closest('.sl-row');
        const rows = [...this.renderRoot.querySelectorAll('.sl-scroll > .sl-row[data-id]')];
        const from = rows.indexOf(rowEl);
        if (from < 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const scroller = scrollParentOf(this);
        this._drag = {
            id, from, to: from, rows, rowEl, scroller,
            pointerId: e.pointerId, startY: e.clientY, y: e.clientY, top0: scroller.scrollTop, raf: 0,
            h: rowEl.getBoundingClientRect().height,
            mids: rows.map(r => { const b = r.getBoundingClientRect(); return b.top + b.height / 2; }),
        };
        rowEl.classList.add('is-drag');
        rowEl.parentElement.classList.add('is-sorting');
        window.addEventListener('pointermove', this._onDragMove);
        window.addEventListener('pointerup', this._onDragEnd);
        window.addEventListener('pointercancel', this._onDragCancel);
    }

    _onDragMove(e) {
        const d = this._drag;
        if (!d || e.pointerId !== d.pointerId) return;
        e.preventDefault();
        d.y = e.clientY;
        this._dragLayout();
        this._dragAutoScroll();
    }

    _onDragEnd(e) { if (e.pointerId === this._drag?.pointerId) this._dragFinish(true); }
    _onDragCancel(e) { if (e.pointerId === this._drag?.pointerId) this._dragFinish(false); }

    /** Dragged row follows the pointer (+ whatever the scroller scrolled); rows it passes slide one row-height over. */
    _dragLayout() {
        const d = this._drag;
        const dy = d.y - d.startY + (d.scroller.scrollTop - d.top0);
        const center = d.mids[d.from] + dy;
        let to = d.from;
        for (let j = d.from + 1; j < d.rows.length && center > d.mids[j]; j++) to = j;
        for (let j = d.from - 1; j >= 0 && center < d.mids[j]; j--) to = j;
        d.to = to;
        d.rows.forEach((r, j) => {
            const shift = j === d.from ? dy : j > d.from && j <= to ? -d.h : j < d.from && j >= to ? d.h : 0;
            r.style.transform = shift ? `translateY(${shift}px)` : '';
        });
    }

    _dragAutoScroll() {
        const d = this._drag;
        cancelAnimationFrame(d.raf);
        const isDoc = d.scroller === document.scrollingElement || d.scroller === document.documentElement;
        const box = isDoc ? { top: 0, bottom: window.innerHeight } : d.scroller.getBoundingClientRect();
        const over = d.y < box.top + DRAG_EDGE ? d.y - (box.top + DRAG_EDGE)
            : d.y > box.bottom - DRAG_EDGE ? d.y - (box.bottom - DRAG_EDGE) : 0;
        if (!over) return;
        const step = Math.max(-DRAG_SPEED, Math.min(DRAG_SPEED, over / 3));
        d.raf = requestAnimationFrame(() => {
            if (this._drag !== d) return;
            d.scroller.scrollTop += step;
            this._dragLayout();
            this._dragAutoScroll();
        });
    }

    _dragFinish(commit) {
        const d = this._drag;
        if (!d) return;
        this._drag = null;
        cancelAnimationFrame(d.raf);
        window.removeEventListener('pointermove', this._onDragMove);
        window.removeEventListener('pointerup', this._onDragEnd);
        window.removeEventListener('pointercancel', this._onDragCancel);
        // is-sorting (the slide transition) goes first, so clearing the transforms snaps instead of animating back
        d.rowEl.parentElement?.classList.remove('is-sorting');
        d.rowEl.classList.remove('is-drag');
        d.rows.forEach(r => { r.style.transform = ''; });
        if (commit && d.to !== d.from) this._emitMove(d.id, d.rows.map(r => r.dataset.id), d.to);
    }

    /** ↑/↓ on the focused handle = one step, Home = to the top. */
    _dhDragKey(e, id) {
        if (e.key === 'Home') { e.preventDefault(); this._doMove(id, { direction: 'top' }); return; }
        const step = { ArrowUp: -1, ArrowDown: 1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const order = this._pagedData.map(r => r.id);
        const from = order.indexOf(id), to = from + step;
        if (from < 0 || to < 0 || to >= order.length) return;
        this._emitMove(id, order, to);
        // repeat() moves the row's node — moving a focused node drops focus, so hand it back to the same handle
        this.updateComplete.then(() => this.renderRoot.querySelector(`.sl-row[data-id="${CSS.escape(id)}"] .sl-handle`)?.focus());
    }

    /** `order` = row ids as shown; `id` moves to index `to` → tell the parent its new neighbour (it may be filtered). */
    _emitMove(id, order, to) {
        const ids = order.filter(x => x !== id);
        ids.splice(to, 0, id);
        const prevId = ids[to - 1], nextId = ids[to + 1];
        this._doMove(id, prevId ? { prevId } : { nextId });
    }

    _dhClearAll() {
        const q = this._serverQuery;
        const server = Object.keys(q.searches).length || Object.values(q.filters).some(v => v || v === 0) || q.sort;
        clearTimeout(this._searchTimer);
        this._searchText = '';
        this._colFilters = {};
        this._colSort = null;
        if (server) this._emitQueryChange();
    }

    _dhRowOpen(row) {
        if (this._reorder || !this.editable) return;
        this._editId = row.id;
        this._deleteId = null;
        this._repeaterState = {};
        this._returnTo = row.id;
    }

    _dhCloseDetail() {
        this._editId = null;
        this._deleteId = null;
        this._repeaterState = {};
        this._newDraft = {};
    }

    // ── Render ──────────────────────────────────────────────────────────────────

    render() {
        const style = this.height && this.height !== 'auto' ? `height:${this.height}` : '';
        if (this.single) {
            return html`<div class="sl" style=${style}>${this._rfEditRow({ ...(this.data?.[0] ?? {}), ...this._newDraft }, this.aiLoading)}</div>`;
        }
        return html`
            <div class="sl" style=${style} @keydown=${this._onKeydown}>
                ${this._editId != null ? this._rfDetail() : this._rfList()}
                ${this._preview ? html`
                    <div class="sl-preview" @click=${() => (this._preview = null)}>
                        <div class="sl-preview-panel" @click=${(e) => e.stopPropagation()}>
                            <button class="sl-icon-btn sl-preview-close" type="button" aria-label=${this._txt.close} @click=${() => (this._preview = null)}>
                                <iconify-icon icon="ri:close-line"></iconify-icon></button>
                            <div class="Editor">${unsafeHTML(this._preview)}</div>
                        </div>
                    </div>` : nothing}
            </div>
        `;
    }

    _onKeydown(e) {
        if (e.key !== 'Escape') return;
        if (this._menu) this._menu = null;
        else if (this._preview) this._preview = null;
    }

    _dhMenu(name) { this._menu = this._menu === name ? null : name; }

    _rfList() {
        const t = this._txt, filtered = this._clientFilteredData, hasThumbs = Boolean(this._thumb);
        return html`
            ${this._rfToolbar()}
            <div class="sl-card">
                <div class="sl-scroll ${this._scrolled ? 'is-scrolled' : ''} ${this._more ? 'has-more' : ''}" style=${this._gridVars} @scroll=${this._dhScroll}>
                    ${this._rfHead()}
                    ${repeat(this._pagedData, row => row.id, (row, i) => this._rfRow(row, i, hasThumbs))}
                </div>
                ${filtered.length === 0 ? html`
                    <div class="sl-empty">
                        <iconify-icon icon=${this._hasQuery ? 'ri:search-eye-line' : 'ri:inbox-2-line'}></iconify-icon>
                        <span>${this._hasQuery ? t.noMatch : t.empty}</span>
                        ${this._hasQuery ? html`<button type="button" class="sl-link" @click=${this._dhClearAll}>${t.clear}</button>` : nothing}
                    </div>` : nothing}
            </div>
            ${this.pageSize > 0 && filtered.length > this.pageSize ? html`
                <div class="sl-pagination">
                    <web-pagination total=${filtered.length} current=${this._page} pageSize=${this.pageSize}
                        ui=${this.ui || 'modern'} theme=${this.theme || 'light'}
                        @change=${(e) => { this._page = e.detail.current; }}></web-pagination>
                </div>` : nothing}
        `;
    }

    // ── Toolbar ─────────────────────────────────────────────────────────────────

    _rfToolbar() {
        const t = this._txt, quick = this._quickFilterCol, count = this._filterCount;
        const hasFilterMenu = this._menuFilterCols.length || this._sortCols.length;
        return html`
            <div class="sl-toolbar">
                ${this._menu ? html`<div class="sl-scrim" @click=${() => (this._menu = null)}></div>` : nothing}
                <div class="sl-tools">
                    ${this._rfSearch()}
                    ${hasFilterMenu ? html`
                        <div class="sl-menu-anchor">
                            <button type="button" class="sl-icon-btn ${this._menu === 'filters' || count ? 'is-on' : ''}" title=${t.filters} aria-label=${t.filters}
                                aria-haspopup="menu" aria-expanded=${this._menu === 'filters'} @click=${() => this._dhMenu('filters')}>
                                <iconify-icon icon="ri:equalizer-2-line"></iconify-icon>
                                ${count ? html`<span class="sl-badge">${count}</span>` : nothing}
                            </button>
                            ${this._menu === 'filters' ? this._rfFilterMenu() : nothing}
                        </div>` : nothing}
                    ${this.orderable ? html`
                        <button type="button" class="sl-icon-btn ${this._reorder ? 'is-on' : ''}" title=${this._perms.sort ? t.reorder : t.noPerm}
                            aria-label=${t.reorder} aria-pressed=${this._reorder} ?disabled=${!this._perms.sort}
                            @click=${this._dhReorder}>
                            <iconify-icon icon=${this._perms.sort ? 'ri:drag-move-2-line' : 'ri:lock-line'}></iconify-icon>
                        </button>` : nothing}
                    <slot name="actions"></slot>
                </div>
                ${quick ? this._rfSegments(quick) : nothing}
            </div>
        `;
    }

    _rfSearch() {
        const t = this._txt, col = this._searchCol, cols = this._searchCols;
        if (!col) return html`<span class="sl-grow"></span>`;
        return html`
            <div class="sl-search-wrap">
                <label class="sl-search">
                    <iconify-icon icon=${this._serverSearch ? 'ri:cloud-line' : 'ri:search-line'}
                        title=${this._serverSearch ? t.serverOn : t.serverOff}></iconify-icon>
                    <input type="text" enterkeyhint="search" placeholder=${fill(t.searchBy, { col: col.label })}
                        aria-label=${fill(t.searchBy, { col: col.label })}
                        .value=${this._searchText} @input=${(e) => this._dhSearchInput(e.target.value)} />
                    ${this._searchText ? html`
                        <button type="button" class="sl-search-clear" aria-label=${t.clearSearch} @click=${() => this._dhSearchInput('')}>
                            <iconify-icon icon="ri:close-circle-fill"></iconify-icon></button>` : nothing}
                    ${cols.length ? html`
                        <button type="button" class="sl-search-col ${this._menu === 'search' ? 'is-on' : ''}" title=${t.searchIn}
                            aria-label=${t.searchIn} aria-haspopup="listbox" aria-expanded=${this._menu === 'search'}
                            @click=${(e) => { e.preventDefault(); this._dhMenu('search'); }}>
                            <iconify-icon icon="ri:filter-3-line"></iconify-icon>
                        </button>` : nothing}
                </label>
                ${this._menu === 'search' ? html`
                    <div class="sl-menu">
                        <div class="sl-menu-head">
                            <span class="sl-menu-title">${t.searchIn}</span>
                            <button type="button" role="switch" class="sl-toggle ${this._serverSearch ? 'is-on' : ''}"
                                aria-checked=${this._serverSearch} title=${this._serverSearch ? t.serverOn : t.serverOff}
                                @click=${() => this._dhSearchServer(!this._serverSearch)}>
                                <iconify-icon icon=${this._serverSearch ? 'ri:checkbox-circle-fill' : 'ri:checkbox-blank-circle-line'}></iconify-icon>${t.server}
                            </button>
                        </div>
                        <div class="sl-menu-hint">${this._serverSearch ? t.serverOn : t.serverOff}</div>
                        <div role="listbox" aria-label=${t.searchIn}>
                            ${cols.map(c => html`
                                <button type="button" role="option" class="sl-menu-item ${c === col ? 'is-active' : ''}" aria-selected=${c === col}
                                    @click=${() => this._dhSearchColumn(c.field)}>
                                    <span class="sl-menu-text">${c.label}</span>
                                    ${c === col ? html`<iconify-icon icon="ri:check-line"></iconify-icon>` : nothing}
                                </button>`)}
                        </div>
                    </div>` : nothing}
            </div>
        `;
    }

    _rfSegments(col) {
        const t = this._txt, cur = String(this._colFilters[col.field] ?? '');
        return html`
            <div class="sl-seg" role="tablist" aria-label=${col.label || ''}>
                ${[{ value: '', label: t.all }, ...optsOf(col)].map(o => html`
                    <button type="button" role="tab" class="sl-seg-btn ${cur === String(o.value) ? 'is-active' : ''}"
                        aria-selected=${cur === String(o.value)} @click=${() => this._dhColFilter(col.field, o.value)}>${o.label}</button>`)}
            </div>
        `;
    }

    /** Filter & sort dropdown — same menu as the column picker; stays open while picking several conditions. */
    _rfFilterMenu() {
        const t = this._txt, sort = this._colSort;
        return html`
            <div class="sl-menu is-anchored" role="menu" aria-label=${t.filters}>
                ${this._menuFilterCols.map(col => {
                    const cur = String(this._colFilters[col.field] ?? '');
                    return html`
                        <div class="sl-menu-title sl-menu-section">${col.label}</div>
                        ${[{ value: '', label: t.all }, ...optsOf(col)].map(o => html`
                            <button type="button" role="menuitemradio" class="sl-menu-item ${cur === String(o.value) ? 'is-active' : ''}"
                                aria-checked=${cur === String(o.value)} @click=${() => this._dhColFilter(col.field, o.value)}>
                                <span class="sl-menu-text">${o.label}</span>
                                ${cur === String(o.value) ? html`<iconify-icon icon="ri:check-line"></iconify-icon>` : nothing}
                            </button>`)}`;
                })}
                ${this._sortCols.length ? html`
                    <div class="sl-menu-title sl-menu-section">${t.sortBy}</div>
                    ${this._sortCols.map(col => {
                        const dir = sort?.field === col.field ? sort.dir : null;
                        return html`
                            <button type="button" role="menuitemcheckbox" class="sl-menu-item ${dir ? 'is-active' : ''}" aria-checked=${Boolean(dir)}
                                ?disabled=${!this._perms.sort} @click=${() => this._dhSortCycle(col)}>
                                <span class="sl-menu-text">${col.label}</span>
                                ${dir ? html`<span class="sl-menu-meta">${t[dir]}</span>
                                    <iconify-icon icon=${dir === 'asc' ? 'ri:sort-asc' : 'ri:sort-desc'}></iconify-icon>` : nothing}
                            </button>`;
                    })}` : nothing}
                ${this._hasQuery || sort ? html`
                    <div class="sl-menu-foot">
                        <button type="button" class="sl-link" @click=${this._dhClearAll}>
                            <iconify-icon icon="ri:filter-off-line"></iconify-icon>${t.clear}</button>
                    </div>` : nothing}
            </div>
        `;
    }

    // ── Rows ────────────────────────────────────────────────────────────────────

    _rfHeadCell(col, lead = false) {
        const sortable = col?.sortable && this._perms.sort;
        const dir = this._colSort?.field === col?.field ? this._colSort.dir : null;
        return html`
            <div class="sl-cell ${lead ? 'sl-lead' : ''} ${sortable ? 'is-sortable' : ''} ${dir ? 'is-sorted' : ''}"
                style="text-align:${col?.align || 'left'}" role="columnheader"
                aria-sort=${dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'} tabindex=${sortable ? '0' : '-1'}
                @click=${() => this._dhSortCycle(col)}
                @keydown=${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._dhSortCycle(col); } }}>
                <span class="sl-head-label">
                    ${lead ? (this.caption || col?.label || '') : (col?.label || '')}
                    ${col?.sortable ? html`<iconify-icon class="sl-sort"
                        icon=${dir === 'asc' ? 'ri:arrow-up-line' : dir === 'desc' ? 'ri:arrow-down-line' : 'ri:arrow-up-down-line'}></iconify-icon>` : nothing}
                </span>
                ${col?.hint ? html`<span class="sl-head-hint">${col.hint}</span>` : nothing}
            </div>
        `;
    }

    _rfHead() {
        return html`
            <div class="sl-row sl-head" role="row">
                ${this._rfHeadCell(this._lead, true)}
                ${this._scrollCols.map(col => this._rfHeadCell(col))}
                <div class="sl-cell sl-end"></div>
            </div>
        `;
    }

    /** The row's first image, else the two initials of its title on a tone of its own. */
    _rfThumb(row, size = '') {
        const src = thumbSrcOf(this._thumb, row);
        if (src) return html`<img class="sl-thumb ${size}" src=${src} alt="" loading="lazy" decoding="async" />`;
        const title = this._cellVal(this._lead, row);
        return html`<span class="sl-thumb is-initials ${size}" data-tone=${toneOf(title)} aria-hidden="true">${initialsOf(title) || '—'}</span>`;
    }

    _rfPill(row) {
        const col = this._sub;
        if (!col) return nothing;
        const v = getPath(row, col.key || col.field);
        const opts = optsOf(col);
        const i = opts.findIndex(o => String(o.value) === String(v ?? ''));
        const label = this._cellVal(col, row);
        if (label === '' || label == null) return nothing;
        const tone = toneOfOpt(opts, i);
        return html`<span class="sl-pill" data-tone=${tone}>${label}</span>`;
    }

    _rfRow(row, i, hasThumbs) {
        const lead = this._lead;
        const open = !this._reorder && this.editable;
        const title = this._cellVal(lead, row);
        return html`
            <div class="sl-row ${i % 2 ? 'is-alt' : ''} ${open ? 'is-open' : ''}" data-id=${row.id} role="row"
                tabindex=${open ? '0' : '-1'}
                @click=${() => this._dhRowOpen(row)}
                @keydown=${(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) this._dhRowOpen(row); }}>
                <div class="sl-cell sl-lead">
                    ${hasThumbs ? this._rfThumb(row) : nothing}
                    <span class="sl-lead-text">
                        <span class="sl-title" style=${this._colorOf(lead, row)}>${title === '' || title == null ? '—' : title}</span>
                        ${this._rfPill(row)}
                    </span>
                </div>
                ${this._scrollCols.map(col => this._rfCell(col, row))}
                <div class="sl-cell sl-end">
                    ${this._reorder ? this._rfMoves(row)
                        : open ? html`<span class="sl-chevron"><iconify-icon icon="ri:arrow-right-s-line"></iconify-icon></span>` : nothing}
                </div>
            </div>
        `;
    }

    _rfMoves(row) {
        const t = this._txt, pinned = Boolean(row[RANK_FIELD]);
        return html`
            <div class="sl-moves">
                <button type="button" class="sl-icon-btn sl-move" title=${t.top} aria-label=${t.top}
                    @click=${(e) => { e.stopPropagation(); this._doMove(row.id, { direction: 'top' }); }}>
                    <iconify-icon icon="ri:arrow-up-double-line"></iconify-icon></button>
                <button type="button" class="sl-icon-btn sl-move ${pinned ? 'is-pinned' : ''}" title=${pinned ? t.unpin : t.auto}
                    aria-label=${pinned ? t.unpin : t.auto} ?disabled=${!pinned}
                    @click=${(e) => { e.stopPropagation(); this._doMove(row.id, { direction: 'unpin' }); }}>
                    <iconify-icon icon=${pinned ? 'ri:pushpin-2-fill' : 'ri:pushpin-2-line'}></iconify-icon></button>
                <button type="button" class="sl-icon-btn sl-move sl-handle" title=${t.drag} aria-label=${t.drag}
                    @pointerdown=${(e) => this._dhDragStart(e, row.id)}
                    @keydown=${(e) => this._dhDragKey(e, row.id)}
                    @click=${(e) => e.stopPropagation()}>
                    <iconify-icon icon="ri:draggable"></iconify-icon></button>
            </div>`;
    }

    _colorOf(col, row) {
        if (!col?.color) return '';
        return `color:${typeof col.color === 'function' ? col.color(getPath(row, col.key || col.field), row) : col.color}`;
    }

    _rfCell(col, row) {
        const style = `text-align:${col.align || 'left'};${this._colorOf(col, row)}`;
        if (col.type === 'editor' || col.type === 'textarea') {
            const v = getPath(row, col.key || col.field) ?? '';
            const text = v && typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
            const has = text.replace(/<[^>]*>/g, '').trim().length > 0;
            return html`
                <div class="sl-cell" style=${style}>
                    ${has ? html`
                        <button type="button" class="sl-icon-btn sl-doc" title=${this._txt.view} aria-label=${this._txt.view}
                            @click=${(e) => { e.stopPropagation(); this._preview = col.type === 'editor' ? text : `<pre>${text.replace(/</g, '&lt;')}</pre>`; }}>
                            <iconify-icon icon="ri:file-text-line"></iconify-icon></button>` : html`<span class="sl-dim">—</span>`}
                </div>
            `;
        }
        const v = this._cellVal(col, row);
        return html`<div class="sl-cell" style=${style}>${v === '' || v == null ? html`<span class="sl-dim">—</span>` : html`<span class="sl-val">${v}</span>`}</div>`;
    }

    // ── Detail / edit ───────────────────────────────────────────────────────────

    _rfDetail() {
        const t = this._txt, isNew = this._editId === 'new', canDelete = this._perms.delete;
        const row = isNew ? this._newDraft : (this.data || []).find(r => r.id === this._editId);
        if (!row) return this._rfList();
        const title = isNew ? t.newRow : (this._cellVal(this._lead, row) || t.newRow);
        return html`
            <div class="sl-detail">
                <div class="sl-stuck-probe" aria-hidden="true"></div>
                <div class="sl-detail-head ${this._stuck ? 'is-stuck' : ''}">
                    <button type="button" class="sl-icon-btn" title=${t.back} aria-label=${t.back} @click=${this._dhCloseDetail}>
                        <iconify-icon icon="ri:arrow-left-s-line"></iconify-icon></button>
                    ${isNew || !this._thumb ? nothing : this._rfThumb(row, 'is-lg')}
                    <div class="sl-detail-title">
                        <span class="sl-title">${title}</span>
                        ${isNew ? nothing : this._rfPill(row)}
                    </div>
                    ${isNew ? html`<div class="sl-detail-actions"><slot name="new-actions"></slot></div>`
                        : this.deletable ? html`
                            <div class="sl-detail-actions">
                                <button type="button" class="sl-icon-btn sl-del ${this._deleteId === row.id ? 'is-on' : ''}"
                                    title=${canDelete ? t.delete : t.noPerm} aria-label=${t.delete} ?disabled=${!canDelete}
                                    @click=${() => (this._deleteId = this._deleteId === row.id ? null : row.id)}>
                                    <iconify-icon icon=${canDelete ? 'ri:delete-bin-line' : 'ri:lock-line'}></iconify-icon></button>
                            </div>` : nothing}
                </div>
                ${!isNew && this._deleteId === row.id ? html`
                    <div class="sl-confirm" role="alert">
                        <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                        <span>${t.confirmDel}</span>
                        <button type="button" class="sl-btn" @click=${() => (this._deleteId = null)}>${t.no}</button>
                        <button type="button" class="sl-btn is-danger" @click=${() => this._doDelete(row.id)}>${t.yes}</button>
                    </div>` : nothing}
                ${this._rfEditRow(row, isNew && this.aiLoading)}
            </div>
        `;
    }

    /** The edit form: `.wt-edit-inner` is where RecordTable's _collectFlat() reads the fields. */
    _rfEditRow(row, aiOverlay = false) {
        const t = this._txt, canEdit = this._perms.edit;
        // Delete lives in the detail header (_rfDetail) — `single` has no header, and never had delete
        const extras = row?.id && this.history;
        return html`
            <div class="sl-form-wrap">
                ${aiOverlay ? html`
                    <div class="sl-ai-loading">
                        <iconify-icon icon="ri:loader-4-line" class="sl-spin"></iconify-icon>
                        <span>${t.aiFilling}</span>
                    </div>` : nothing}
                <div class="sl-form wt-edit-inner">${this._writeCols.map(col => this._rfField(col, row))}</div>

                ${extras ? html`
                    <div class="sl-extras">
                        <button type="button" class="sl-action" @click=${() => this._emit('wt-open-history', { id: row.id })}>
                            <iconify-icon icon="ri:history-line"></iconify-icon>${t.history}</button>
                    </div>` : nothing}

                <div class="sl-foot">
                    ${!this.single ? html`<button type="button" class="sl-btn" @click=${this._dhCloseDetail}>${t.cancel}</button>` : nothing}
                    <button type="button" class="sl-btn is-primary" ?disabled=${!canEdit} title=${canEdit ? '' : t.noPerm} @click=${() => this._doSave()}>
                        <iconify-icon icon=${canEdit ? 'ri:save-line' : 'ri:lock-line'}></iconify-icon>${t.save}</button>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('svc-list')) customElements.define('svc-list', SvcList);
