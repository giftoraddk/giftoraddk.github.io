// src/packages/auth/svc-resources.js
//
// Port từ astro-micro's src/webs/auth/svc-resources.js — bảng quản trị CRUD (svc-list) cho 1 dataTable:
// thêm/sửa/xoá mềm, sắp xếp, CSV import/export, lịch sử (svc-diffs).
// Khác bản gốc:
//   - Backend qua crud.js adapter theo `server` (''/DB_ALL = D1 auth, 'DB_ACC' profiles, 'DB_LLMD1' llm).
//   - Update gộp key dot-path ('meta.sku') vào object hiện có rồi ghi cả cột — Supabase/D1 không hiểu dot-path.
//   - Ngày giờ ghi ISO string (D1 text / Postgres timestamptz), không phải epoch-ms như Firestore cũ.
//
// <svc-resources dataTable="posts" lang="vi" orderable>
// Search/filter/sort cấu hình theo cột trong schema { searchable, filterable, sortable, serverExecutor } —
// cột serverExecutor phát `wt-query-change` để svc-resources query lại phía server.
// `schema` = mảng cột, hoặc hàm (lang) => mảng cột (resolve lại khi `lang` đổi — xem _cols).
//
// Là lớp cơ sở của svc-records.js (cùng luồng dữ liệu, khác phần hiển thị) — lớp con chỉ override:
//   createRenderRoot (Shadow DOM), _tableEl (bảng con: svc-list), _dialogType, render/_rb*.
// Mọi tra DOM đi qua this.renderRoot nên chạy được cả Light DOM (ở đây) lẫn Shadow DOM (lớp con).

import { LitElement, html } from 'lit';
import 'iconify-icon';
import css from './css/svc-resources.css?inline';
import { auth } from './service/service.js';
import { can } from './tool/roles.js';
import { triggerRebuild } from './service/rebuild.js';
import { ulid, buildNested, injectStyles, txtLingo, toastEmit, isObject } from '@/services/tools/util.js';
import {
    deepMerge, asObject, parseCsvText, recordsToCsv, downloadCsv, csvWriteCols, csvRowToFlat,
} from '@/services/tools/records.js';
import { createService, invalidate as cacheInvalidate } from '@/services/core/crud.js';
import {
    all as conductorAll, more as conductorMore, get as conductorGet,
    subscribe as conductorSubscribe, make as conductorMake,
} from '@/services/core/conductor.js';
import { DEFAULT_CHAIN } from '@/services/shared/tensor-api.js';
import { syncKnowFromOutputTable } from '@/packages/llm/service/know-sync.js';
import '@/packages/apex/web-button.js';
import '@/packages/apex/web-dialog.js';
import './svc-list.js';
import '@/packages/apex/web-toast.js';
import './app/svc-diffs.js';

export const TXT_STD = {
    vi: { loading: 'Đang tải…', add: '+ Thêm', error: 'Lỗi', records: 'bản ghi', export: 'Xuất CSV', import: 'Nhập CSV', importDone: 'Kết quả nhập CSV', importOk: 'bản ghi đã nhập thành công', importSkip: 'bản ghi bị bỏ qua', importRow: 'Dòng', required: 'là bắt buộc', saveOk: 'Đã lưu thành công', saveFail: 'Lưu thất bại', deleteAll: 'Xoá toàn bộ', deleteAllTitle: 'Xoá toàn bộ dữ liệu', deleteAllAsk: 'Xoá vĩnh viễn TẤT CẢ bản ghi của bảng', deleteAllHint: 'Dữ liệu bị xoá thật khỏi DB, KHÔNG thể khôi phục. Nên "Xuất CSV" để sao lưu trước.', deleteAllOk: 'Đã xoá', deleteAllFail: 'Xoá thất bại', restoreOk: 'Đã khôi phục' },
    en: { loading: 'Loading…', add: '+ Add', error: 'Error', records: 'records', export: 'Export CSV', import: 'Import CSV', importDone: 'Import result', importOk: 'records imported', importSkip: 'records skipped', importRow: 'Row', required: 'is required', saveOk: 'Saved successfully', saveFail: 'Save failed', deleteAll: 'Delete all', deleteAllTitle: 'Delete all records', deleteAllAsk: 'Permanently delete ALL records of table', deleteAllHint: 'Data is removed from the DB and CANNOT be restored. Export CSV first as a backup.', deleteAllOk: 'Deleted', deleteAllFail: 'Delete failed', restoreOk: 'Restored' },
};

// deepMerge / CSV round-trip helpers live in services/tools/records.js (shared with svc-records.js)

export class SvcResources extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        ui:              { type: String  },
        theme:           { type: String  },
        server:          { type: String  }, // tên adapter crud.js — '' = DB_ALL (D1 của auth)
        schema:          { type: Array   },
        dataTable:       { type: String  },
        lang:            { type: String  },
        txt:             { type: Object  },
        orderField:      { type: String  },
        limitCount:      { type: Number  },
        pageSize:        { type: Number  },
        realtime:        { type: Boolean },
        preloadPages:    { type: Number  },
        orderable:       { type: Boolean },
        // Bảng có trang SSG phụ thuộc (vd posts) — sau mỗi lần ghi gọi thêm triggerRebuild()
        revalidate:      { type: Boolean },
        diffsTable:      { type: String  },
        perms:           { type: Object  }, // { edit, delete, sort, history } — false tắt thao tác đó
        locationSuggest: { type: String  }, // passthrough field type 'location' của svc-list
        hideUpload:      { type: Boolean }, // passthrough field type 'photor' của svc-list
        // Bảng luôn tối đa 1 bản ghi — svc-list mở sẵn form edit, ẩn toolbar
        single:          { type: Boolean },
        // Hiện nút "Xoá toàn bộ" ở toolbar (kèm dialog xác nhận) — vẫn cần quyền delete
        btnDeleteAll:    { type: Boolean },
        // Passthrough cho <svc-assist hint/multiple/count> — nơi gọi tự quyết định
        assistHint:      { type: String  },
        assistMultiple:  { type: Boolean },
        assistCount:     { type: Number  },
        // Field mặc định ghép vào mỗi record AI sinh (vd ảnh — AI không tự sinh URL)
        assistSeed:      { type: Object  },
        _data:           { state: true },
        _loading:        { state: true },
        _serverLoading:  { state: true }, // đang query lại — spinner ở toolbar
        _error:          { state: true },
        _importing:      { state: true },
        _importReport:   { state: true },
        _serverFilters:  { state: true }, // { [field]: value } — exact match
        _serverSearches: { state: true }, // { [field]: string } — prefix, dùng entry đầu
        _serverSort:     { state: true }, // { field, dir } | null
        _authUser:       { state: true },
        _aiLoading:      { state: true }, // forward xuống <svc-list aiLoading>
        _deleteAllOpen:  { state: true },
        _deletingAll:    { state: true },
    };

    constructor() {
        super();
        this.ui              = 'pastel';
        this.theme           = 'dark';
        this.server          = '';
        this.schema          = [];
        this.dataTable       = '';
        this.lang            = 'vi';
        this.txt             = null;
        this.orderField      = '';
        this.limitCount      = 0;
        this.pageSize        = 50;
        this.realtime        = false;
        this.preloadPages    = 2;
        this.orderable       = false;
        this.revalidate      = false;
        this.diffsTable      = 'revisions';
        this.perms           = {};
        this.locationSuggest = '';
        this.hideUpload      = false;
        this.single          = false;
        this.btnDeleteAll    = false;
        this.assistHint      = '';
        this.assistMultiple  = false;
        this.assistCount     = 6;
        this.assistSeed      = {};
        this._data           = [];
        this._loading        = true;
        this._serverLoading  = false;
        this._error          = '';
        this._importing      = false;
        this._importReport   = null;
        this._serverFilters  = {};
        this._serverSearches = {};
        this._serverSort     = null;
        this._authUser       = null;
        this._aiLoading      = false;
        this._deleteAllOpen  = false;
        this._deletingAll    = false;
        this._unsub          = null;
        this._unsubConductor = null;
        // <svc-assist> có thể do trang đặt làm con của svc-resources (ngoài template) — nghe ngay trên host
        this._dcAuth = this._dcAuth.bind(this);
        this.addEventListener('assist:fields',  e => this._dhAssistFields(e));
        this.addEventListener('assist:records', e => this._dhAssistRecords(e));
        this.addEventListener('assist:loading', e => this._dhAssistLoading(e));
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    async connectedCallback() {
        super.connectedCallback();
        if (this.renderRoot === this) injectStyles('svc-resources-styles', css); // Light DOM only — a Shadow DOM subclass brings static styles
        window.addEventListener('account-change', this._dcAuth); // svc-account: sign-in / sign-out → quyền đổi
        window.addEventListener('login-success', this._dcAuth);
        await this._dcAuth();
        this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('account-change', this._dcAuth);
        window.removeEventListener('login-success', this._dcAuth);
        this._unsub?.();
        this._unsubConductor?.();
    }

    // ==========================================
    // DATA CORE FUNCTIONS
    // ==========================================

    async _dcAuth() { this._authUser = await auth.get(); }

    async _dcLoad(isRefetch = false) {
        if (!this._table) { this._loading = false; return; }

        this._unsub?.();
        this._unsubConductor?.();
        this._unsub = this._unsubConductor = null;

        if (isRefetch) this._serverLoading = true;
        else           this._loading       = true;
        this._error = '';

        // Có điều kiện server (hoặc single) → đọc thẳng findAll; còn lại đi conductor phân trang + cache
        const hasServerConditions =
            Object.values(this._serverFilters).some(v => v || v === 0) ||
            Object.values(this._serverSearches).some(q => q) ||
            this._serverSort !== null || this.orderable || !!this.orderField || this.single;

        const done = () => { this._loading = false; this._serverLoading = false; };
        const fail = (err) => { this._error = err.message; done(); };

        if (hasServerConditions) {
            const opts = this._comQueryOpts();
            try {
                if (this.realtime) {
                    this._unsub = await this._svc.listen(opts, data => { this._data = data; done(); }, fail);
                } else {
                    this._data = await this._svc.findAll(opts);
                    done();
                }
            } catch (err) { fail(err); }
            return;
        }

        const sectionId     = this._sectionId;
        const conductorOpts = { dataTable: this._table, limit: this.pageSize, server: this.server };
        try {
            await conductorAll(sectionId, conductorOpts);
            this._data = conductorGet(sectionId)?.data ?? [];
            this._unsubConductor = conductorSubscribe(sectionId, s => { this._data = s?.data ?? []; });
            done();
            this._preload(sectionId, conductorOpts);
        } catch (err) { fail(err); }
    }

    async _preload(sectionId, opts) {
        for (let i = 0; i < this.preloadPages; i++) {
            if (conductorGet(sectionId)?._hasMore === false) break;
            await conductorMore(sectionId, opts);
        }
    }

    _syncConductor() {
        if (this._unsubConductor) conductorMake(this._sectionId, { data: this._data });
    }

    // Luôn purge cache runtime; bảng có trang SSG (revalidate) thì trigger rebuild site
    _dfRevalidate() {
        cacheInvalidate({ dataTable: this._table, server: this.server });
        if (this.revalidate) triggerRebuild();
    }

    // ==========================================
    // DATA FOOTER FUNCTIONS
    // ==========================================

    /**
     * Flow lưu 1 record (create/update): wt-save event -> ghi DB + đồng bộ _data/conductor
     */
    async _dfSave(e) {
        const { id, data: flat } = e.detail;

        // [2] PROCESS: Áp `col.transform` — UPDATE bỏ field rỗng (không ghi đè giá trị cũ bằng rỗng)
        const writeMap = Object.fromEntries(this._cols.filter(c => c.write !== false && c.type).map(c => [c.key || c.field, c]));
        for (const k of Object.keys(flat)) {
            const col = writeMap[k];
            if (!col?.transform) continue;
            if (flat[k] === '' && id !== null) delete flat[k];
            else if (flat[k] !== '')           flat[k] = await col.transform(flat[k]);
        }

        // [3] EXECUTE: create nếu id null, update ngược lại + đồng bộ state cục bộ
        const now = await this._svc.now();
        try {
            if (id === null) {
                //   [3.a] CREATE: id mới, prepend vào _data
                const newId   = ulid();
                const docData = this._buildNewDoc(flat, this._data.length, now);
                await this._svc.set(newId, docData);
                this._data = [{ id: newId, ...docData }, ...this._data];
                this._dfSyncKnow({ id: newId, ...docData });
                this._dfCapture(newId, 'created');
            } else {
                //   [3.b] UPDATE: ghi field thay đổi + actors, merge vào đúng row
                const existing = this._data.find(r => r.id === id);
                await this._svc.update(id, {
                    ...this._comNestedPatch(existing, flat),
                    updated_at: now,
                    actors:     this._comActors(existing?.actors, 'updated'),
                });
                this._data = this._data.map(r => r.id === id ? deepMerge(r, buildNested(flat)) : r);
                this._dfSyncKnow(this._data.find(r => r.id === id));
                this._dfCapture(id);
            }
            this._syncConductor();
            this._dfRevalidate();
            this._tableEl?.closeEdit(id);
            toastEmit(this._txt.saveOk, 'success');
        } catch (err) {
            //   [3.c] HANDLE_ERR: giữ form đang mở để user thử lại
            toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error');
        }
    }

    // Đồng bộ ngay vào `know` (D1) khi bảng là output của division — tự no-op với bảng khác
    _dfSyncKnow(record) { if (record) syncKnowFromOutputTable(record, this._table); }

    // 1 revision cho record vừa ghi DB thành công (svc-diffs, best-effort — không await). Import CSV hàng loạt không ghi.
    _dfCapture(id, action = '', record = this._data.find(r => r.id === id)) {
        if (this.diffsTable && record) this.renderRoot.querySelector('svc-diffs')?.capture(id, record, action);
    }

    /**
     * Flow khôi phục 1 phiên bản: diffs-restore { id, version, snapshot } -> ghi snapshot đè lên record
     */
    async _dhRestore(e) {
        // [1] CHECK: svc-diffs đã kiểm quyền manage_versions + hỏi xác nhận; record phải còn trong danh sách
        const { id, version, snapshot } = e.detail ?? {};
        const existing = this._data.find(r => r.id === id);
        if (!existing || !snapshot) return;

        // [3] EXECUTE: Ghi snapshot (doc store merge sâu: khoá con thêm SAU phiên bản đó vẫn giữ) + revision 'restored'
        const now = await this._svc.now();
        const patch = { ...snapshot, updated_at: now, actors: this._comActors(existing.actors, 'restored') };
        try {
            await this._svc.update(id, patch);
            this._data = this._data.map(r => r.id === id ? deepMerge(r, patch) : r);
            this._syncConductor();
            this._dfRevalidate();
            this._dfCapture(id, 'restored');
            toastEmit(`${this._txt.restoreOk} v${version}`, 'success');
        } catch (err) { toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error'); }
    }

    /**
     * Flow soft-delete 1 record: wt-delete event -> set deleted_at, gỡ khỏi _data/conductor
     */
    async _dfDeleteExec(e) {
        const { id } = e.detail;
        if (!id) return;

        const now = await this._svc.now();
        try {
            const existing = this._data.find(r => r.id === id);
            await this._svc.update(id, {
                deleted_at: now,
                updated_at: now,
                actors:     this._comActors(existing?.actors, 'deleted'),
            });
            this._dfCapture(id, 'deleted', existing);
            this._data = this._data.filter(r => r.id !== id);
            this._syncConductor();
            this._dfRevalidate();
        } catch (err) { toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error'); }
    }

    /**
     * Flow xoá toàn bộ: confirm dialog -> xoá THẬT mọi row của bảng phía server (không chỉ trang đang tải)
     */
    async _dfDeleteAll() {
        // [1] CHECK: Đóng dialog; thiếu quyền hoặc đang chạy dở thì bỏ qua
        this._deleteAllOpen = false;
        if (!this._perms.delete || this._deletingAll) return;
        this._deletingAll = true;

        try {
            // [3] EXECUTE: 1 lệnh DELETE phía Worker + dọn state cục bộ
            const deleted = await this._svc.purge();
            this._data = [];
            this._syncConductor();
            this._dfRevalidate();
            toastEmit(`${this._txt.deleteAllOk} ${deleted} ${this._txt.records}`, 'success');
        } catch (err) {
            // [3.c] HANDLE_ERR: báo lỗi, tải lại để hiện đúng dữ liệu còn trên DB
            toastEmit(`${this._txt.deleteAllFail}: ${err.message}`, 'error');
            this._dcLoad(true);
        } finally {
            this._deletingAll = false;
        }
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
        } catch (err) { toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error'); }
    }

    _dfExportCsv() {
        // Xuất đúng view đang lọc của svc-list (giá trị thô, header = storage key — xem records.js)
        const data = this._tableEl?.filteredData ?? this._data;
        downloadCsv(recordsToCsv(data, this._cols), `${this._table}.csv`);
    }

    /**
     * Flow import CSV: File -> N record ghi DB + báo cáo ok/failed theo dòng
     */
    async _dfImportCsv(e) {
        // [1] CHECK: Bỏ qua nếu không chọn file hoặc không đủ 1 header + 1 dòng dữ liệu
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const rows = parseCsvText(await file.text());
        if (!rows.length) return;

        const writeCols = csvWriteCols(this._cols);

        const now = await this._svc.now();
        this._importing = true;
        const okRows = [], failed = [];

        for (let i = 0; i < rows.length; i++) {
            const rowNum = i + 2;

            // [2] PROCESS: Map header -> field schema (records.js); thiếu field required -> failed, bỏ qua dòng
            const { flat, missing } = csvRowToFlat(rows[i], writeCols);
            if (missing) { failed.push({ rowNum, reason: `"${missing.label}" ${this._txt.required}` }); continue; }

            // [3] EXECUTE: Ghi từng dòng, gom kết quả theo dòng
            try {
                const newId   = ulid();
                const docData = this._buildNewDoc(flat, this._data.length + okRows.length, now);
                await this._svc.set(newId, docData);
                okRows.push({ id: newId, ...docData });
            } catch (err) { failed.push({ rowNum, reason: err.message }); }
        }

        // [4] RETURN: Đồng bộ _data với các dòng ghi thành công + báo cáo
        if (okRows.length) { this._data = [...this._data, ...okRows]; this._syncConductor(); this._dfRevalidate(); }
        this._importing    = false;
        this._importReport = { ok: okRows.length, failed };
    }

    // ==========================================
    // DATA HEAD FUNCTIONS
    // ==========================================

    _dhOpenNew() { this._tableEl?.openNew(); }

    // 'assist:fields' từ <svc-assist> — mode single phủ lên record hiện có (giữ id → UPDATE)
    _dhAssistFields(e) {
        const table = this._tableEl;
        if (this.single) table?.applyAiDraft(e.detail.fields);
        else             table?.openNew(e.detail.fields);
    }

    /**
     * Flow bulk-create từ AI: 'assist:records' (assistMultiple) -> N record ghi DB
     */
    async _dhAssistRecords(e) {
        // [2] PROCESS: rows đã NESTED — assistSeed làm fallback, row[i] luôn ưu tiên
        const rows  = e.detail.rows;
        const now   = await this._svc.now();
        const start = this._data.length;

        // [3] EXECUTE: Ghi thẳng từng row (không qua form review), index nối tiếp cuối _data
        const created = [];
        try {
            for (let i = 0; i < rows.length; i++) {
                const newId   = ulid();
                const docData = this._buildNewDoc({ ...this.assistSeed, ...rows[i] }, start + i, now);
                await this._svc.set(newId, docData);
                created.push({ id: newId, ...docData });
            }
            toastEmit(this._txt.saveOk, 'success');
        } catch (err) {
            toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error');
        }

        // [4] RETURN: Đồng bộ phần đã ghi được
        if (!created.length) return;
        this._data = [...this._data, ...created];
        this._syncConductor();
        this._dfRevalidate();
    }

    _dhAssistLoading(e) { this._aiLoading = e.detail.loading; }

    // Public — caller ép lưu dòng đang edit dở trước khi đóng dialog bọc ngoài; trả Promise để await
    saveCurrentEdit() { return this._tableEl?.saveCurrentEdit() ?? Promise.resolve(); }

    _dhImportClick() { this.renderRoot.querySelector('.sad-csv-input')?.click(); }

    _dhOpenHistory(e) {
        const id = e.detail?.id;
        if (!id) return;
        const row = this._data.find(r => r.id === id);
        this.renderRoot.querySelector('svc-diffs')?.open(id, row?.title || row?.name || row?.display_name || '');
    }
    _dhReset() {
        conductorMake(this._sectionId, { data: [], _cursor: null, _hasMore: null, _page: 0 });
        cacheInvalidate({ dataTable: this._table, server: this.server });
        this._dcLoad();
    }

    _dhQueryChange(e) {
        const { filters = {}, searches = {}, sort = null } = e.detail || {};
        this._serverFilters  = filters;
        this._serverSearches = searches;
        this._serverSort     = sort;
        this._dcLoad(true);
    }

    // ==========================================
    // COMPUTED FUNCTIONS
    // ==========================================

    get _table()     { return (this.dataTable || '').split('~')[0].trim(); }
    get _tableEl()   { return this.renderRoot?.querySelector('#sad-table'); }
    get _dialogType() { return ''; } // web-dialog type — '' = centered modal; svc-records: 'mobile' sheet

    /** Resolved column schema — `schema` may be an array or (lang) => array; cached per (schema, lang). */
    get _cols() {
        if (this._colsFor?.schema !== this.schema || this._colsFor?.lang !== this.lang) {
            const s = this.schema;
            this._colsFor = { schema: s, lang: this.lang, cols: (typeof s === 'function' ? s(this.lang) : s) ?? [] };
        }
        return this._colsFor.cols;
    }
    // Nhãn schema theo field và dot-path ('meta.sku') — svc-diffs hiện tên cột thay vì tên field
    get _comFieldLabels() {
        const labels = {};
        for (const c of this._cols) {
            if (!c.label) continue;
            if (c.field) labels[c.field] ??= c.label;
            if (c.key) labels[c.key] ??= c.label;
        }
        return labels;
    }

    get _sectionId() { return `admin__${this._table}`; }
    get _txt()       { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _svc()       { return createService(this._table, '', this.server || 'DB_ALL'); }
    get _comAiConfig() { return DEFAULT_CHAIN; }

    get _perms() {
        const p     = this.perms || {};
        // Level/token v2 lẫn token cũ (hook/AUTH_V2.rst) — không có record nên scope chưa xét ở đây
        const _can  = (...caps) => caps.some(c => can(this._authUser, this._table, c));
        return {
            edit:   p.edit   !== undefined ? Boolean(p.edit)   : _can('create', 'update'),
            delete: p.delete !== undefined ? Boolean(p.delete) : _can('delete'),
            sort:   p.sort   !== undefined ? Boolean(p.sort)   : _can('update'),
            history: p.history !== undefined ? Boolean(p.history) : _can('view_history'),
        };
    }

    _comUserId() { return this._authUser?.id ?? ''; }

    // Lưu tối đa 9 lượt gần nhất "userId~iso~action", nối bằng "|"
    _comActors(existing, action) {
        const entries = (existing || '').split('|').filter(Boolean);
        entries.push(`${this._comUserId()}~${new Date().toISOString()}~${action}`);
        return entries.slice(-9).join('|');
    }

    // Supabase/D1 không hiểu key dot-path — gộp vào object hiện có của cột rồi ghi nguyên cột
    _comNestedPatch(existing, flat) {
        return Object.fromEntries(Object.entries(buildNested(flat)).map(([k, v]) => {
            const base = isObject(v) ? asObject(existing?.[k]) : null;
            return [k, base ? deepMerge(base, v) : v];
        }));
    }

    _comQueryOpts() {
        const searchEntries = Object.entries(this._serverSearches).filter(([, q]) => q);
        const hasFilters    = Object.values(this._serverFilters).some(v => v || v === 0);
        const hasSearch     = searchEntries.length > 0;
        const keyOf         = (field) => this._cols.find(c => c.field === field)?.key || field;
        const opts          = {};

        const filters = Object.fromEntries(
            Object.entries(this._serverFilters).filter(([, v]) => v || v === 0).map(([f, v]) => [keyOf(f), v])
        );
        if (Object.keys(filters).length) opts.filters = filters;

        if (hasSearch) {
            const [searchField, searchQuery] = searchEntries[0];
            opts.searchField = keyOf(searchField);
            opts.searchValue = searchQuery;
        }

        if (this._serverSort?.field) {
            opts.sortBy = this._serverSort.field;
            opts.order  = this._serverSort.dir;
        } else if (!hasFilters && !hasSearch) {
            // Sort mặc định chỉ khi không filter/search — tránh cần index phức hợp phía DB
            if (this.orderable)       opts.sortBy = 'index';
            else if (this.orderField) opts.sortBy = this.orderField;
            else                      { opts.sortBy = 'updated_at'; opts.order = 'desc'; }
        }

        if (this.limitCount > 0) opts.maxCount = this.limitCount;
        return opts;
    }

    _buildNewDoc(flat, insertIndex, now) {
        const data = buildNested(flat);
        // `default` của cột — field hệ thống mà form chung/CSV không điền
        for (const col of this._cols) {
            if (col.default === undefined) continue;
            if (data[col.field] == null || data[col.field] === '') data[col.field] = col.default;
        }
        return {
            ...data,
            // CSV import có thể mang ngày gốc — giữ nguyên thay vì luôn đóng dấu `now`
            created_at: data.created_at ?? now,
            updated_at: data.updated_at ?? now,
            deleted_at: data.deleted_at ?? null,
            actors:  this._comActors('', 'created'),
            user_id: this._comUserId() || null,
            scope:   data.scope  || 'public',
            secure:  data.secure || '',
            index:   this.orderable ? insertIndex : (data.index ?? 0),
        };
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    render() {
        if (this._loading) return html`<div class="sad-loading">${this._txt.loading}</div>`;
        if (this._error)   return html`<div class="sad-error">${this._txt.error}: ${this._error}</div>`;

        return html`
            <web-toast .ui=${this.ui}></web-toast>

            <div class="sad-wrap">
                ${!this.single ? this._rbToolbar() : ''}

                <svc-list
                    id="sad-table"
                    .data=${this._data}
                    .schema=${this._cols}
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
                    ?history=${!!this.diffsTable && this._perms.history}
                    ai=${this._comAiConfig}
                    height="auto"
                    @wt-save=${this._dfSave}
                    @wt-delete=${this._dfDeleteExec}
                    @wt-move=${this._dfMove}
                    @wt-open-history=${this._dhOpenHistory}
                    @wt-query-change=${this._dhQueryChange}
                ></svc-list>
            </div>

            ${this._rbAddons()}
            ${this._rbDialogs()}`;
    }

    // Revision history panel — shared by every view of this data (svc-records reuses it)
    _rbAddons() {
        return html`
            ${this.diffsTable ? html`
                <svc-diffs dataTable=${this.diffsTable} relation=${this._table} lang=${this.lang} .ui=${this.ui}
                    .labels=${this._comFieldLabels} @diffs-restore=${this._dhRestore}></svc-diffs>
            ` : ''}`;
    }

    _rbDialogs() {
        return html`
            ${this.btnDeleteAll ? html`
                <web-dialog
                    type=${this._dialogType}
                    ?open=${this._deleteAllOpen}
                    title=${this._txt.deleteAllTitle}
                    lang=${this.lang}
                    .ui=${this.ui}
                    maxWidth="440px"
                    persistent
                    @confirm=${this._dfDeleteAll}
                    @cancel=${() => { this._deleteAllOpen = false; }}>
                    <div style="margin:1rem">
                        <p style="margin:0 0 .5rem">
                            <iconify-icon icon="ri:error-warning-line" style="color:var(--color-error);vertical-align:-2px"></iconify-icon>
                            ${this._txt.deleteAllAsk} <strong>${this._table}</strong>?
                        </p>
                        <p style="margin:0;opacity:.7">${this._txt.deleteAllHint}</p>
                    </div>
                </web-dialog>
            ` : ''}

            <web-dialog
                type=${this._dialogType}
                ?open=${!!this._importReport}
                title=${this._txt.importDone}
                lang=${this.lang}
                maxWidth="480px"
                @confirm=${() => { this._importReport = null; }}
                @cancel=${() => { this._importReport = null; }}>
                ${this._importReport ? this._rfImportReport() : ''}
            </web-dialog>`;
    }

    _rbToolbar() {
        const canEdit = this._perms.edit;
        return html`
            <div class="sad-toolbar">
                <span class="sad-count">
                    ${this._serverLoading
                        ? html`<iconify-icon icon="ri:loader-4-line" class="sad-spin"></iconify-icon>`
                        : html`${this._data.length} ${this._txt.records}`}
                </span>
                <div class="sad-toolbar-btns">
                    <input class="sad-csv-input" type="file" accept=".csv" hidden @change=${this._dfImportCsv}>
                    <slot name="toolbar-start"></slot>
                    <web-button type="fill" color="primary" height="28px" ?disabled=${!canEdit} @click=${this._dhOpenNew}>${this._txt.add}</web-button>
                    <web-button type="soft" height="28px" ?disabled=${this._importing || !canEdit} ?loading=${this._importing} @click=${this._dhImportClick}>
                        <iconify-icon slot="prefix" icon=${canEdit ? 'ri:upload-2-line' : 'ri:lock-line'}></iconify-icon>
                        ${this._txt.import}
                    </web-button>
                    <web-button type="soft" height="28px" @click=${this._dfExportCsv}>
                        <iconify-icon slot="prefix" icon="ri:download-2-line"></iconify-icon>
                        ${this._txt.export}
                    </web-button>
                    ${this.btnDeleteAll ? html`
                        <web-button type="soft" color="error" height="28px"
                            ?disabled=${!this._perms.delete || !this._data.length || this._deletingAll} ?loading=${this._deletingAll}
                            @click=${() => { this._deleteAllOpen = true; }}>
                            <iconify-icon slot="prefix" icon=${this._perms.delete ? 'ri:delete-bin-2-line' : 'ri:lock-line'}></iconify-icon>
                            ${this._txt.deleteAll}
                        </web-button>
                    ` : ''}
                    <web-button type="ghost" height="28px" square title="Reset cache &amp; reload" @click=${this._dhReset}>
                        <iconify-icon icon="ri:refresh-line"></iconify-icon>
                    </web-button>
                </div>
            </div>
        `;
    }

    _rfImportReport() {
        const { ok, failed } = this._importReport;
        return html`
            <div style="margin:1rem">
                <p style="margin:0 0 .5rem">
                    <iconify-icon icon="ri:check-line" style="color:var(--color-success);vertical-align:-2px"></iconify-icon>
                    <strong>${ok}</strong> ${this._txt.importOk}
                </p>
                ${failed.length ? html`
                    <p style="margin:0 0 .4rem;opacity:.75">
                        <iconify-icon icon="ri:close-line" style="color:var(--color-error);vertical-align:-2px"></iconify-icon>
                        <strong>${failed.length}</strong> ${this._txt.importSkip}:
                    </p>
                    <ul class="sad-import-report">
                        ${failed.map(f => html`<li>${this._txt.importRow} ${f.rowNum}: ${f.reason}</li>`)}
                    </ul>` : ''}
            </div>`;
    }
}

if (!customElements.get('svc-resources')) customElements.define('svc-resources', SvcResources);
