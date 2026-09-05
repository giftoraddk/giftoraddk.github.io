import { LitElement, html } from 'lit';
import 'iconify-icon';
import css from './styles/svc-admin.css?inline';
import { auth, parseRoles } from '@/webs/auth/tools/service.js';
import { ulid, buildNested, injectStyles, txtLingo, getPath, toastEmit } from '@/services/helper.js';
import { createService, invalidate as cacheInvalidate } from '@/services/crud.js';
import { triggerRebuild } from '@/webs/auth/tools/helper.js';
import { all as conductorAll, more as conductorMore, get as conductorGet, subscribe as conductorSubscribe, make as conductorMake } from '@/services/conductor.js';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-dialog.js';
import '@/webs/apex/web-table.js';
import '@/webs/apex/web-toast.js';
import '@/webs/auth/svc-diffs.js';
import '@/webs/auth/svc-assist.js';
import '@/webs/division/svc-marketing.js';

const TXT_STD = {
    vi: { loading: 'Đang tải…', add: '+ Thêm', error: 'Lỗi', records: 'bản ghi', export: 'Xuất CSV', import: 'Nhập CSV', importDone: 'Kết quả nhập CSV', importOk: 'bản ghi đã nhập thành công', importSkip: 'bản ghi bị bỏ qua', importRow: 'Dòng', required: 'là bắt buộc', saveOk: 'Đã lưu thành công', saveFail: 'Lưu thất bại' },
    en: { loading: 'Loading…', add: '+ Add', error: 'Error', records: 'records', export: 'Export CSV', import: 'Import CSV', importDone: 'Import result', importOk: 'records imported', importSkip: 'records skipped', importRow: 'Row', required: 'is required', saveOk: 'Saved successfully', saveFail: 'Save failed' },
};

// ── Module-level helpers ──────────────────────────────────────────────────────

function deepMerge(target, source) {
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
        out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object')
            ? deepMerge(out[k], v) : v;
    }
    return out;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

// Tokenizes the WHOLE text char-by-char (not line-by-line first) so a quoted cell containing
// a real newline (vd textarea `description`/`content` xuất từ _dfExportCsv) không bị tách
// nhầm thành nhiều "dòng" — quote state phải sống xuyên suốt qua ký tự \n/\r\n.
function _parseCsvRows(text) {
    const rows = []; let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
            if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') inQ = false;
            else cur += ch;
        } else if (ch === '"') inQ = true;
        else if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '\r') { /* skip — \n (below) closes the row */ }
        else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
}

function _parseCsvText(text) {
    const rows = _parseCsvRows(text.replace(/^﻿/, '')).filter(r => r.some(c => c.trim() !== ''));
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(vals => Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()])));
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * <svc-admin dataTable="posts" lang="vi" orderable>
 *
 * Search, filter, and sort controls live in web-table column headers, configured
 * per-column via schema: { searchable, filterable, sortable, serverExecutor }.
 *
 * When a column has serverExecutor: true, web-table emits `wt-query-change`
 * with { filters, searches, sort } — svc-admin re-queries Firestore with those
 * constraints. All other columns are filtered client-side inside web-table.
 *
 * Firestore index notes:
 *  - Equality filters (filterable) are auto-indexed.
 *  - Prefix search (searchable) combined with orderBy needs a composite index
 *    when another orderBy is already active (sortable prop or orderField).
 */
export class SvcAdmin extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        ui:             { type: String  },
        theme:          { type: String  },
        server:         { type: String  }, // adapter name đã registerAdapter — mặc định '' = firestore
        schema:         { type: Array   },
        dataTable:      { type: String  },
        lang:           { type: String  },
        // Override i18n cho toàn bộ TXT_STD (đa ngôn ngữ) — xem txtLingo() trong helper.js.
        txt:            { type: Object  },
        orderField:     { type: String  },
        limitCount:     { type: Number  },
        pageSize:       { type: Number  },
        realtime:       { type: Boolean },
        preloadPages:   { type: Number  },
        orderable:      { type: Boolean },
        // Bật cho bảng có trang build tĩnh (SSG) phụ thuộc (vd 'posts' — src/pages/post/[id].astro
        // đọc qua fetchCollection() lúc build) — sau mỗi save/delete/import/AI-bulk-create thành
        // công, ngoài invalidate() cache runtime (luôn chạy, mọi bảng) còn gọi triggerRebuild()
        // (deployHook.js) để kích hoạt rebuild site, vì HTML SSG không tự cập nhật khi Firestore
        // đổi. Không bật cho bảng chỉ có consumer client-side (orders/inventory/staff/users) —
        // rebuild toàn site cho những bảng đó là lãng phí, IndexedDB cache đã đủ (xem
        // hook/geo-platform-plan.md §B).
        revalidate:     { type: Boolean },
        diffsTable:     { type: String  },
        marketingTable: { type: String  },
        perms:          { type: Object  }, // { edit, delete, sort } — false disables the action
        // Passthrough cho field type 'location' của web-table.js — gợi ý mặc định khi field
        // đang rỗng (vd room.location, xem svc-channel-sections.js).
        locationSuggest: { type: String },
        // Passthrough cho field type 'photor' của web-table.js — ẩn nút chọn ảnh, xem
        // svc-photor.js prop cùng tên. Không gộp vào `perms` vì đây là quyết định của
        // nơi gọi (context-specific), không phải quyền hạn theo role như edit/delete/sort.
        hideUpload:     { type: Boolean },
        // `dataTable` này luôn tối đa 1 bản ghi (vd sectionItems của 1 section hero/contact) —
        // forward xuống web-table.js (luôn hiện form edit mở sẵn, bỏ grid/list/pagination) +
        // ẩn hẳn toolbar (+ Thêm/CSV/trợ lý AI — không cái nào còn ý nghĩa khi chỉ có 1 bản ghi).
        single:         { type: Boolean },
        // Passthrough cho <svc-assist hint=...> — schema chung (vd recordsSchema dùng cho MỌI
        // section không phải products) không tự nói lên đây là section loại gì (FAQ/Hero/Team/…)
        // — nơi gọi biết rõ (vd svc-bay-sections.js truyền label section đang sửa) nên truyền
        // xuống để AI ghép chủ đề chọn + loại section, xem svc-assist.js _dhPickChip/_hintLine.
        assistHint:     { type: String },
        // Passthrough cho <svc-assist multiple/count> — bật chế độ "tạo nhanh nhiều bản ghi"
        // thay vì mặc định 1 bản ghi (vd products: catalog lặp lại nhiều item, khác hero/contact
        // chỉ có đúng 1 bản ghi/section). Nơi gọi tự quyết định (vd svc-bay-sections.js chỉ bật
        // cho dataTable="products"), xem _dhAssistRecords().
        assistMultiple: { type: Boolean },
        assistCount:    { type: Number  },
        // Field mặc định ghép vào MỖI record AI sinh khi assistMultiple — bù cho field AI luôn bỏ
        // qua (vd products.pics type 'photor' nằm trong SKIP_TYPES của svc-assist.js, AI
        // không bao giờ tự sinh URL ảnh) — không gộp vào schema vì đây là giá trị fallback tĩnh,
        // không phải cột cho AI điền. rows[i] (AI trả) luôn ưu tiên hơn — xem _dhAssistRecords().
        assistSeed:     { type: Object },
        // Internal state ────────────────────────────────────────────────────
        _data:          { state: true },
        _loading:       { state: true },
        _serverLoading: { state: true }, // re-fetch in progress — shows spinner in toolbar
        _error:         { state: true },
        _importing:     { state: true },
        _importReport:  { state: true },
        // Server-condition query constraints — set by wt-query-change from web-table
        _serverFilters:  { state: true }, // { [field]: value } equality conditions
        _serverSearches: { state: true }, // { [field]: string } prefix search (first entry used)
        _serverSort:     { state: true }, // { field, dir } | null
        _authUser:       { state: true }, // current logged-in user — drives permission checks
        _aiLoading:      { state: true }, // <svc-assist> đang chờ AI — forward xuống <web-table aiLoading> để phủ overlay lên form sắp bị điền
    };

    constructor() {
        super();
        this.ui             = 'spatial';
        this.theme          = 'dark';
        this.server         = '';
        this.schema         = [];
        this.dataTable      = '';
        this.lang           = 'vi';
        this.txt            = null;
        this.orderField     = '';
        this.limitCount     = 0;
        this.pageSize       = 50;
        this.realtime       = false;
        this.preloadPages    = 2;
        this._unsubConductor = null;
        this.orderable      = false;
        this.revalidate     = false;
        this.diffsTable        = 'revisions';
        this.marketingTable = '';
        this.perms          = {};
        this.locationSuggest = '';
        this.hideUpload      = false;
        this.single          = false;
        this.assistHint      = '';
        this.assistMultiple  = false;
        this.assistCount     = 6;
        this.assistSeed      = {};
        this._data          = [];
        this._loading       = true;
        this._serverLoading = false;
        this._error         = '';
        this._importing     = false;
        this._importReport  = null;
        this._serverFilters  = {};
        this._serverSearches = {};
        this._serverSort     = null;
        this._authUser       = null;
        this._aiLoading      = false;
        this._unsub          = null;
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    async connectedCallback() {
        super.connectedCallback();
        injectStyles('svc-admin-styles', css);
        this._authUser = await auth.get();
        this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unsub) this._unsub();
        this._unsubConductor?.();
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcLoad(isRefetch = false) {
        if (!this._table) { this._loading = false; return; }

        if (this._unsub) { this._unsub(); this._unsub = null; }
        this._unsubConductor?.();
        this._unsubConductor = null;

        if (isRefetch) this._serverLoading = true;
        else           this._loading       = true;
        this._error = '';

        // single: tối đa 1 bản ghi — không có gì để phân trang/cache, và quan trọng hơn: đường
        // conductor phân trang (_fetchFirestorePage) giả định adapter trả {data,hasMore,cursor}
        // kiểu Firestore, còn các adapter local tuỳ biến (baySection/channelSection/…)
        // .findAll() trả thẳng array — đi nhánh này sẽ ném "rows is not iterable". Đọc thẳng qua
        // _svc.findAll() (cùng đường đã dùng cho hasServerConditions khác) an toàn với mọi adapter.
        const hasServerConditions =
            Object.values(this._serverFilters).some(v => v || v === 0) ||
            Object.values(this._serverSearches).some(q => q) ||
            this._serverSort !== null ||
            this.orderable ||
            !!this.orderField ||
            this.single;

        if (hasServerConditions) {
            const opts = this._comQueryOpts();
            try {
                if (this.realtime) {
                    this._unsub = await this._svc.listen(opts,
                        data => { this._data = data; this._loading = false; this._serverLoading = false; },
                        err  => { this._error = err.message; this._loading = false; this._serverLoading = false; }
                    );
                } else {
                    this._data          = await this._svc.findAll(opts);
                    this._loading       = false;
                    this._serverLoading = false;
                }
            } catch (err) {
                this._error         = err.message;
                this._loading       = false;
                this._serverLoading = false;
            }
            return;
        }

        // Conductor path — paginated load + background preload
        const sectionId     = `admin__${this._table}`;
        const conductorOpts = { dataTable: this._table, limit: this.pageSize, server: this.server };
        try {
            await conductorAll(sectionId, conductorOpts);
            this._data = conductorGet(sectionId)?.data ?? [];
            this._unsubConductor = conductorSubscribe(sectionId, s => { this._data = s?.data ?? []; });
            this._loading       = false;
            this._serverLoading = false;
            this._preload(sectionId, conductorOpts);
        } catch (err) {
            this._error         = err.message;
            this._loading       = false;
            this._serverLoading = false;
        }
    }

    async _preload(sectionId, opts) {
        for (let i = 0; i < this.preloadPages; i++) {
            if (conductorGet(sectionId)?._hasMore === false) break;
            await conductorMore(sectionId, opts);
        }
    }

    _syncConductor() {
        if (this._unsubConductor) conductorMake(`admin__${this._table}`, { data: this._data });
    }

    /**
     * Flow revalidate sau khi ghi (Layer A luôn chạy, Layer B chỉ khi prop `revalidate` bật):
     * write thành công -> purge cache runtime của (dataTable, server) + (nếu cần) trigger rebuild
     * cho các trang SSG phụ thuộc — xem chi tiết ở khai báo prop `revalidate` + hook/geo-platform-plan.md §B.
     */
    _dfRevalidate() {
        cacheInvalidate({ dataTable: this._table, server: this.server });
        if (this.revalidate) triggerRebuild();
    }

    // ── Firestore writes ───────────────────────────────────────────────────────

    /**
     * Flow lưu 1 record (create/update): wt-save event -> ghi Firestore + đồng bộ _data/conductor
     */
    async _dfSave(e) {
        const { id, data: flat } = e.detail;

        // [2] PROCESS: Áp `col.transform` cho field có khai báo — bỏ field rỗng khi UPDATE (không
        //     ghi đè giá trị cũ bằng rỗng), transform field còn giá trị
        const writeCols = this.schema.filter(c => c.write !== false && c.type);
        const writeMap  = Object.fromEntries(writeCols.map(c => [c.key || c.field, c]));
        for (const k of Object.keys(flat)) {
            const col = writeMap[k];
            if (!col?.transform) continue;
            if (flat[k] === '' && id !== null) delete flat[k];
            else if (flat[k] !== '')           flat[k] = await col.transform(flat[k]);
        }

        // [3] EXECUTE: Ghi Firestore (create nếu id null, update ngược lại) + đồng bộ state cục bộ
        const now = await this._svc.now();
        try {
            if (id === null) {
                //   [3.a] CREATE: Tạo id mới, ghi doc, prepend vào _data
                const newId   = ulid();
                const docData = this._buildNewDoc(flat, this._data.length, now);
                await this._svc.set(newId, docData);
                this._data = [deepMerge({ id: newId }, buildNested(flat)), ...this._data];
                this._syncConductor();
                this._dfRevalidate();
            } else {
                //   [3.b] UPDATE: Ghi đè field thay đổi + actors, merge vào đúng row trong _data
                const existing = this._data.find(r => r.id === id);
                await this._svc.update(id, {
                    ...flat,
                    updated_at: now,
                    actors:     this._comActors(existing?.actors, 'updated'),
                });
                this._data = this._data.map(r => r.id === id ? deepMerge(r, buildNested(flat)) : r);
                this._syncConductor();
                this._dfRevalidate();
            }
            this.querySelector('#sad-table')?.closeEdit(id);
            toastEmit(this._txt.saveOk, 'success');
        } catch (err) {
            //   [3.c] HANDLE_ERR: Báo lỗi qua toast, giữ nguyên form đang mở để user thử lại
            toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error');
        }
    }

    /**
     * Flow soft-delete 1 record: wt-delete event -> set deleted_at, gỡ khỏi _data/conductor
     */
    async _dfDeleteExec(e) {
        // [1] CHECK: Bỏ qua nếu event thiếu id
        const { id } = e.detail;
        if (!id) return;

        // [3] EXECUTE: Soft-delete (chỉ set deleted_at, không xoá thật) + gỡ khỏi state cục bộ
        const now = await this._svc.now();
        try {
            const existing = this._data.find(r => r.id === id);
            await this._svc.update(id, {
                deleted_at: now,
                updated_at: now,
                actors:     this._comActors(existing?.actors, 'deleted'),
            });
            this._data = this._data.filter(r => r.id !== id);
            this._syncConductor();
            this._dfRevalidate();
        } catch (err) { alert(err.message); }
    }

    async _dfMove(e) {
        const { id, direction } = e.detail;
        const idx = this._data.findIndex(r => r.id === id);
        if (idx === -1) return;
        const arr = [...this._data];
        const [row] = arr.splice(idx, 1);
        switch (direction) {
            case 'top':    arr.unshift(row); break;
            case 'up':     arr.splice(Math.max(0, idx - 1), 0, row); break;
            case 'down':   arr.splice(Math.min(arr.length, idx + 1), 0, row); break;
            case 'bottom': arr.push(row); break;
        }
        this._data = arr.map((r, i) => ({ ...r, index: i }));
        this._syncConductor();
        const now = await this._svc.now();
        try {
            await this._svc.batch(arr.map((r, i) => ({
                id:   r.id,
                data: { index: i, updated_at: now, actors: this._comActors(r.actors, 'updated') },
            })));
            this._dfRevalidate();
        } catch (err) { alert(err.message); }
    }

    // ── CSV ────────────────────────────────────────────────────────────────────

    _dfExportCsv() {
        // Export the filtered view from web-table (respects active column filters/search/sort).
        // Re-importable columns (same `write !== false || csvWrite` gate as _dfImportCsv's
        // writeCols) export the RAW stored value, not `col.render` — render is grid display
        // formatting and is lossy for round-trip (pricing "299000~999000~hộp" -> "299.000 đ",
        // score "4.9~11" -> "4.9 (11)", vat "0.08" -> "8%", ...). Only genuinely read-only
        // columns (write: false, not csvWrite — e.g. orders.js's 3 `meta` sub-extraction
        // columns) keep using render, since there is no separate raw value to fall back to.
        const tableEl = this.querySelector('#sad-table');
        const data    = tableEl?.filteredData ?? this._data;
        const allCols = this.schema.filter(c => c.type !== 'photor' && c.type !== 'password' && c.width);

        // `meta` is ONE JSONB column in the DB (xem hook/SCHEMA.rst / data/products.csv) — schemas
        // just split it into per-sub-field editors for the grid (vd products.js sku/unit/stockMeta
        // dùng key: 'meta.sku'/'meta.unit'/'meta.stock'). Exporting each of those as its own CSV
        // column ("meta.sku","meta.unit",...) leaks the split and no longer matches the raw row
        // shape, so collapse them back into a single trailing "meta" JSON column here — this also
        // already round-trips on import for free via _dfImportCsv's "unknown header starting with
        // '{' -> JSON.parse -> dot-path merge" branch.
        const metaCols  = allCols.filter(c => (c.key || '').startsWith('meta.'));
        const plainCols = allCols.filter(c => !metaCols.includes(c));
        const cols      = metaCols.length ? [...plainCols, { __metaRaw: true }] : plainCols;

        // Header = actual storage key (col.key || col.field, same expr as the row lookup below) —
        // NOT col.label. col.label is a translated display string (vi/en) so it can't identify a
        // column reliably (breaks re-import across language switches, and doesn't match the real
        // DB field name — vd score/pricing/vat/tags phải là "score"/"pricing"/"vat"/"tags" như
        // trong bảng gốc, không phải "Đánh giá"/"Giá bán"/...).
        const header  = cols.map(c => `"${c.__metaRaw ? 'meta' : (c.key || c.field)}"`).join(',');
        const body    = data.map(row =>
            cols.map(col => {
                if (col.__metaRaw) {
                    const raw = typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta ?? {});
                    return `"${raw.replace(/"/g, '""')}"`;
                }
                const v           = getPath(row, col.key || col.field) ?? '';
                const importable  = col.write !== false || col.csvWrite;
                const raw = importable
                    ? (col.suffix && v !== '' ? `${v} ${col.suffix}` : v)
                    : (col.render ? col.render(v, row) : v);
                return `"${String(raw).replace(/"/g, '""')}"`;
            }).join(',')
        ).join('\n');
        const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `${this._table}.csv` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Flow import CSV: File -> N record ghi Firestore + báo cáo ok/failed theo dòng
     */
    async _dfImportCsv(e) {
        // [1] CHECK: Bỏ qua nếu không chọn file hoặc file rỗng (không đủ 1 header + 1 data row)
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const text = await file.text();
        const rows = _parseCsvText(text);
        if (!rows.length) return;

        // `csvWrite: true` lets a field opt back into CSV import even with `write: false` —
        // needed for computed-but-seedable columns like products.score (read-only in the
        // grid/edit form, but still expected to arrive via bulk CSV import).
        const writeCols = this.schema.filter(c => (c.write !== false || c.csvWrite) && c.type && c.type !== 'password');
        // keyMap: (col.key || col.field) — matches the storage-key header _dfExportCsv now writes.
        // labelMap/fieldMap kept as fallback so older exports (label header) or hand-written CSVs
        // (bare field name) still import fine.
        const keyMap    = Object.fromEntries(writeCols.map(c => [c.key || c.field, c]));
        const labelMap  = Object.fromEntries(writeCols.map(c => [c.label, c]));
        const fieldMap  = Object.fromEntries(writeCols.map(c => [c.field, c]));

        const now = await this._svc.now();
        this._importing = true;
        const okRows = [], failed = [];

        for (let i = 0; i < rows.length; i++) {
            const csvRow = rows[i];
            const rowNum = i + 2;
            const flat   = {};

            // [2] PROCESS: Map header CSV -> field schema (label hoặc field name); header lạ dạng
            //     JSON ("{...}") được gộp vào 1 object con cùng tên header (dot-path)
            for (const [header, val] of Object.entries(csvRow)) {
                const col = keyMap[header] || labelMap[header] || fieldMap[header];
                if (!col) {
                    const trimmed = (val || '').trim();
                    if (trimmed.startsWith('{')) {
                        try {
                            for (const [k, v] of Object.entries(JSON.parse(trimmed))) {
                                const dk = `${header}.${k}`;
                                if (dk in flat) continue;
                                // dk may itself match a schema column (vd meta -> {"stock":5} ->
                                // "meta.stock" == products.js stockMeta's key) — honor its `type`
                                // instead of always flattening to a string.
                                const subCol = keyMap[dk];
                                flat[dk] = subCol?.type === 'number' ? Number(v || 0) : String(v ?? '');
                            }
                        } catch {}
                    }
                    continue;
                }
                const storageKey = col.key || col.field;
                flat[storageKey] = col.type === 'number' ? Number(val || 0) : val;
            }

            //   [2.a] IF_MISSING_REQUIRED: Thiếu field required -> đánh dấu failed, bỏ qua dòng này
            const missingCol = writeCols.filter(c => c.required).find(c =>
                !String(flat[c.key || c.field] ?? '').trim()
            );
            if (missingCol) { failed.push({ rowNum, reason: `"${missingCol.label}" ${this._txt.required}` }); continue; }

            // [3] EXECUTE: Ghi từng row vào Firestore, gom kết quả ok/failed theo dòng
            try {
                const newId   = ulid();
                const docData = this._buildNewDoc(flat, this._data.length + okRows.length, now);
                await this._svc.set(newId, docData);
                okRows.push({ id: newId, ...buildNested(flat) });
            } catch (err) { failed.push({ rowNum, reason: err.message }); }
        }

        // [4] RETURN: Đồng bộ _data với các row ghi thành công, trả báo cáo import
        if (okRows.length) { this._data = [...this._data, ...okRows]; this._syncConductor(); this._dfRevalidate(); }
        this._importing    = false;
        this._importReport = { ok: okRows.length, failed };
    }

    // ── Data Head ─────────────────────────────────────────────────────────────

    _dhOpenNew() { this.querySelector('#sad-table')?.openNew(); }

    // Nhận 'assist:fields' từ <svc-assist> — fields đã NESTED sẵn (xem helper.js buildNested()).
    // Mode `single` không có form "Thêm mới" để mở (data[0] luôn tồn tại hoặc
    // là bản ghi đang sửa) — dùng applyAiDraft() overlay lên record hiện có, giữ nguyên id để
    // _doSave() hiểu đây là UPDATE, không phải CREATE. Ngược lại (grid thường) vẫn mồi vào form
    // "Thêm mới" như trước.
    _dhAssistFields(e) {
        const table = this.querySelector('#sad-table');
        if (this.single) table?.applyAiDraft(e.detail.fields);
        else              table?.openNew(e.detail.fields);
    }

    /**
     * Flow bulk-create từ AI: 'assist:records' (assistMultiple) -> N record ghi Firestore
     */
    async _dhAssistRecords(e) {
        // [2] PROCESS: rows đã NESTED sẵn (xem svc-assist.js buildNested) — assistSeed merge TRƯỚC
        //     làm fallback cho field AI bỏ qua (vd products.pics), row[i] luôn ưu tiên hơn
        const rows  = e.detail.rows;
        const now   = await this._svc.now();
        const start = this._data.length;

        // [3] EXECUTE: Ghi thẳng từng row (bỏ qua form review từng cái, giống luồng CSV import
        //     _dfImportCsv) — index nối tiếp cuối this._data, đúng hành vi "+ Thêm" thường
        const created = [];
        for (let i = 0; i < rows.length; i++) {
            const newId   = ulid();
            const docData = this._buildNewDoc({ ...this.assistSeed, ...rows[i] }, start + i, now);
            await this._svc.set(newId, docData);
            created.push({ id: newId, ...docData });
        }

        // [4] RETURN: Đồng bộ _data/conductor + báo thành công
        this._data = [...this._data, ...created];
        this._syncConductor();
        this._dfRevalidate();
        toastEmit(this._txt.saveOk, 'success');
    }

    // 'assist:loading' từ <svc-assist> — forward xuống <web-table aiLoading> để phủ overlay lên
    // đúng form sắp bị AI điền vào (xem web-table.js _rfEditRow aiOverlay).
    _dhAssistLoading(e) { this._aiLoading = e.detail.loading; }

    // Public — gọi từ component cha (vd svc-channel-sections.js đóng dialog Sửa section) để
    // ép lưu dòng đang mở edit dở trong bảng trước khi dialog bọc ngoài đóng lại. Trả nguyên
    // Promise của #sad-table để caller await được — thiếu return thì caller không biết khi
    // nào ghi xong, dễ đọc lại dữ liệu cũ ngay khi ghi còn dở dang.
    saveCurrentEdit() { return this.querySelector('#sad-table')?.saveCurrentEdit() ?? Promise.resolve(); }

    _dhImportClick() { this.querySelector('.sad-csv-input').click(); }

    _dhOpenHistory(e) {
        const { id } = e.detail ?? {};
        if (!id) return;
        this.querySelector('svc-diffs')?.open(id);
    }

    _dhOpenMarketing(e) {
        const { id } = e.detail ?? {};
        if (!id) return;
        this.querySelector('svc-marketing')?.open(id);
    }

    // 'marketing:saved' từ <svc-marketing> sau khi ghi title/description/content(/pics) vào
    // Firestore — patch thẳng vào _data (cùng cách _dfSave() merge sau khi sửa 1 row qua form
    // thường) để bảng hiện đúng dữ liệu mới ngay, không cần đọc lại Firestore.
    _dhMarketingSaved(e) {
        const { id, ...fields } = e.detail ?? {};
        if (!id) return;
        this._data = this._data.map(r => r.id === id ? deepMerge(r, buildNested(fields)) : r);
        this._syncConductor();
        this._dfRevalidate();
    }

    _dhReset() {
        const sectionId = `admin__${this._table}`;
        conductorMake(sectionId, { data: [], _cursor: null, _hasMore: null, _page: 0 });
        this._dcLoad();
    }

    /** Fired by web-table when a server-condition column's filter/search/sort changes. */
    _dhQueryChange(e) {
        const { filters = {}, searches = {}, sort = null } = e.detail || {};
        this._serverFilters  = filters;
        this._serverSearches = searches;
        this._serverSort     = sort;
        this._dcLoad(true);
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _table() { return (this.dataTable || '').split('~')[0].trim(); }
    get _txt()   { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _perms() {
        const p     = this.perms || {};
        const roles = parseRoles(this._authUser).roles;
        const full  = roles.includes('admin') || roles.includes(`${this._table}.admin`);
        const _can  = (...caps) => full || caps.some(c => roles.includes(`${this._table}.${c}`));
        return {
            edit:   p.edit   !== undefined ? Boolean(p.edit)   : _can('create', 'update'),
            delete: p.delete !== undefined ? Boolean(p.delete) : _can('delete'),
            sort:   p.sort   !== undefined ? Boolean(p.sort)   : _can('update'),
        };
    }

    _comUserId() { return this._authUser?.id ?? ''; }

    get _svc()    { return createService(this._table, '', this.server || 'firestore'); }

    get _comAiConfig() { return [import.meta.env.PUBLIC_NVID, import.meta.env.PUBLIC_GROQ, import.meta.env.PUBLIC_OPER].filter(Boolean).join('|'); }

    _comActors(existing, action) {
        const entry   = `${this._comUserId()}~${new Date().toISOString()}~${action}`;
        const entries = (existing || '').split('|').filter(Boolean);
        entries.push(entry);
        return entries.slice(-9).join('|');
    }

    _comQueryOpts() {
        const searchEntries = Object.entries(this._serverSearches).filter(([, q]) => q);
        const hasFilters    = Object.values(this._serverFilters).some(v => v || v === 0);
        const hasSearch     = searchEntries.length > 0;

        const opts = {};

        const filters = Object.fromEntries(
            Object.entries(this._serverFilters)
                .filter(([, v]) => v || v === 0)
                .map(([field, val]) => {
                    const schemaCol = this.schema.find(c => c.field === field);
                    return [schemaCol?.key || field, val];
                })
        );
        if (Object.keys(filters).length) opts.filters = filters;

        if (hasSearch) {
            const [searchField, searchQuery] = searchEntries[0];
            const schemaCol = this.schema.find(c => c.field === searchField);
            opts.searchField = schemaCol?.key || searchField;
            opts.searchValue = searchQuery;
        }

        if (this._serverSort?.field) {
            opts.sortBy = this._serverSort.field;
            opts.order  = this._serverSort.dir;
        } else if (!hasFilters && !hasSearch) {
            if (this.orderable)       opts.sortBy = 'index';
            else if (this.orderField) opts.sortBy = this.orderField;
        }

        if (this.limitCount > 0) opts.maxCount = this.limitCount;

        return opts;
    }

    _buildNewDoc(flat, insertIndex, now) {
        const data = buildNested(flat);
        return {
            ...data,
            created_at: now, updated_at: now, deleted_at: null,
            actors:  this._comActors('', 'created'),
            user_id: this._comUserId() || null,
            scope:   data.scope  || 'public',
            secure:  data.secure || '',
            index:   this.orderable ? insertIndex : (data.index ?? 0),
        };
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (this._loading) return html`<div class="sad-loading">${this._txt.loading}</div>`;
        if (this._error)   return html`<div class="sad-error">${this._txt.error}: ${this._error}</div>`;

        return html`
            <web-toast .ui=${this.ui}></web-toast>

            <div class="sad-wrap">

                ${this._perms.edit ? html`
                    <svc-assist ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        ai=${this._comAiConfig} .schema=${this.schema} hint=${this.assistHint}
                        ?multiple=${this.assistMultiple} count=${this.assistCount}
                        @assist:fields=${this._dhAssistFields}
                        @assist:records=${this._dhAssistRecords}
                        @assist:loading=${this._dhAssistLoading}
                    ></svc-assist>
                ` : ''}
                
                ${!this.single ? html`
                    <div class="sad-toolbar">
                        <span class="sad-count">
                            ${this._serverLoading
                                ? html`<iconify-icon icon="ri:loader-4-line" class="sad-spin"></iconify-icon>`
                                : html`${this._data.length} ${this._txt.records}`
                            }
                        </span>
                        <div class="sad-toolbar-btns">
                            <input class="sad-csv-input" type="file" accept=".csv" hidden @change=${this._dfImportCsv}>
                            <web-button type="fill" color="primary" height="28px" ?disabled=${!this._perms.edit} @clicked=${this._dhOpenNew}>${this._txt.add}</web-button>
                            <web-button type="soft" height="28px" ?disabled=${this._importing || !this._perms.edit} ?loading=${this._importing} @clicked=${this._dhImportClick}>
                                <iconify-icon slot="prefix" icon=${!this._perms.edit ? 'ri:lock-line' : 'ri:upload-2-line'}></iconify-icon>
                                ${this._txt.import}
                            </web-button>
                            <web-button type="soft" height="28px" @clicked=${this._dfExportCsv}>
                                <iconify-icon slot="prefix" icon="ri:download-2-line"></iconify-icon>
                                ${this._txt.export}
                            </web-button>
                            <web-button type="ghost" height="28px" square title="Reset cache &amp; reload" @clicked=${this._dhReset}>
                                <iconify-icon icon="ri:refresh-line"></iconify-icon>
                            </web-button>
                        </div>
                    </div>
                ` : ''}

                <web-table
                    id="sad-table"
                    .data=${this._data}
                    .schema=${this.schema}
                    .perms=${this._perms}
                    lang=${this.lang}
                    .ui=${this.ui}
                    .theme=${this.theme}
                    .locationSuggest=${this.locationSuggest}
                    ?hideUpload=${this.hideUpload}
                    ?aiLoading=${this._aiLoading}
                    ?single=${this.single}
                    pageSize=${this.pageSize}
                    ?orderable=${this.orderable}
                    editable
                    deletable
                    ?history=${!!this.diffsTable}
                    ?marketing=${!!this.marketingTable}
                    ai=${this._comAiConfig}
                    height="auto"
                    @wt-save=${this._dfSave}
                    @wt-delete=${this._dfDeleteExec}
                    @wt-move=${this._dfMove}
                    @wt-open-history=${this._dhOpenHistory}
                    @wt-open-marketing=${this._dhOpenMarketing}
                    @wt-query-change=${this._dhQueryChange}
                ></web-table>
            </div>

            ${this.diffsTable ? html`
                <svc-diffs
                    for=${this.id}
                    dataTable=${this.diffsTable}
                    relation=${this._table}
                    lang=${this.lang}
                    .ui=${this.ui}
                ></svc-diffs>
            ` : ''}

            ${this.marketingTable ? html`
                <svc-marketing
                    table=${this._table}
                    mktTable=${this.marketingTable}
                    ai=${this._comAiConfig}
                    lang=${this.lang}
                    .ui=${this.ui}
                    .theme=${this.theme}
                    @marketing:saved=${this._dhMarketingSaved}
                ></svc-marketing>
            ` : ''}

            <web-dialog
                ?open=${!!this._importReport}
                title=${this._txt.importDone}
                lang=${this.lang}
                maxWidth="480px"
                @confirm=${() => { this._importReport = null; }}
                @cancel=${()  => { this._importReport = null; }}>
                ${this._importReport ? this._rfImportReport() : ''}
            </web-dialog>`;
    }

    _rfImportReport() {
        const { ok, failed } = this._importReport;
        return html`
            <div style="font-size:.875rem;line-height:1.7">
                <p style="margin:0 0 .5rem">
                    <iconify-icon icon="ri:check-line" style="color:var(--color-success,#22c55e);vertical-align:-2px"></iconify-icon>
                    <strong>${ok}</strong> ${this._txt.importOk}
                </p>
                ${failed.length ? html`
                    <p style="margin:0 0 .4rem;opacity:.75">
                        <iconify-icon icon="ri:close-line" style="color:var(--color-error,#ef4444);vertical-align:-2px"></iconify-icon>
                        <strong>${failed.length}</strong> ${this._txt.importSkip}:
                    </p>
                    <ul class="sad-import-report">
                        ${failed.map(f => html`<li>${this._txt.importRow} ${f.rowNum}: ${f.reason}</li>`)}
                    </ul>` : ''}
            </div>`;
    }
}

if (!customElements.get('svc-admin')) customElements.define('svc-admin', SvcAdmin);
