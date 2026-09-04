import { LitElement, html, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { dataInit, cssInline, txtLingo, emit, getPath } from '@/services/helper.js';
import css from './styles/web-table.css?inline';
import pmCss from '@/webs/media/styles/prose-mirror.css?inline';
import 'iconify-icon';
import '@/webs/apex/web-pagination.js';

// Field components — registered globally, available inside Shadow DOM
import '@/webs/apex/web-select.js';
import '@/webs/apex/web-currency.js';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-texts.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-datetime.js';
import '@/webs/apex/web-location-map.js';
import '@/webs/media/svc-photor.js';
import '@/webs/media/svc-editor.js';

const TXT_STD = {
	vi: { empty: 'Không có dữ liệu', save: 'Lưu', cancel: 'Huỷ', required: 'là bắt buộc', confirmDel: 'Xoá dòng này?', yes: 'Xoá', no: 'Huỷ', history: 'Lịch sử', marketing: 'Marketing', aiFilling: 'AI đang điền dữ liệu…', addRow: 'Thêm dòng' },
	en: { empty: 'No data', save: 'Save', cancel: 'Cancel', required: 'is required', confirmDel: 'Delete this row?', yes: 'Delete', no: 'Cancel', history: 'History', marketing: 'Marketing', aiFilling: 'AI is filling in data…', addRow: 'Add row' },
};

export class WebTable extends LitElement {
	static styles = [unsafeCSS(css), unsafeCSS(pmCss)];

	static properties = {
		data:        { type: Array,  converter: { fromAttribute: v => dataInit(v, []) } },
		columns:     { type: Array,  converter: { fromAttribute: v => dataInit(v, []) } },
		schema:      { type: Array },
		orderable:   { type: Boolean },
		editable:    { type: Boolean },
		deletable:   { type: Boolean },
		history:     { type: Boolean },
		marketing:   { type: Boolean },
		// `data` luôn tối đa 1 bản ghi (vd sectionItems của 1 section hero/contact) — bỏ hẳn
		// grid/list/pagination, luôn hiện ĐÚNG 1 form edit mở sẵn (data[0] nếu có, "Thêm mới"
		// nếu chưa) — không cần bấm dòng/nút "+" nào, xem render()/_rfSingle()/willUpdate().
		single:      { type: Boolean },
		// svc-assist đang chờ AI trả kết quả (xem svc-admin.js @assist:loading) — phủ overlay
		// loading lên ĐÚNG form sắp bị điền vào (form "Thêm mới" ở grid mode, hoặc form single
		// duy nhất) để người dùng biết dữ liệu đang được map vào, không chỉ dựa vào spinner nhỏ
		// trên nút xác nhận của svc-assist. Xem _rfEditRow(row, aiOverlay).
		aiLoading:   { type: Boolean },
		ui:          { type: String },
		theme:       { type: String },
		mainColors:  { type: String },
		textColor:   { type: String },
		stys:        { type: Object },
		height:      { type: String },
		lang:        { type: String },
		txt:         { type: Object },
		ai:          { type: String },
		pageSize:    { type: Number },
		perms:       { type: Object }, // { edit, delete, sort } — false disables the action
		// Gợi ý mặc định cho field type 'location' khi đang rỗng (vd room.location của channel
		// — xem svc-channel-sections.js) — không ép giá trị nếu field đã có sẵn dữ liệu.
		locationSuggest: { type: String },
		// Passthrough cho field type 'photor' — ẩn nút chọn ảnh, xem svc-photor.js prop cùng tên.
		hideUpload: { type: Boolean },
		// State
		_editId:     { state: true },
		_deleteId:   { state: true },
		_page:       { state: true },
		_colFilters: { state: true }, // { [field]: value } — per-column select filters
		_colSearch:  { state: true }, // { [field]: string } — per-column text search
		_colSort:    { state: true }, // { field, dir: 'asc'|'desc' } | null
		_preview:    { state: true }, // HTML string — editor content preview overlay
		_repeaterState: { state: true },
	};

	static get uiConfigs() {
		return {
			modern:  { wrap: 'modern web-table' },
			spatial: { wrap: 'spatial web-table glass' },
		};
	}

	constructor() {
		super();
		this.data = [];
		this.columns = [];
		this.schema = [];
		this.orderable = false;
		this.editable = false;
		this.deletable = false;
		this.history = false;
		this.marketing = false;
		this.single = false;
		this.aiLoading = false;
		this.ui = 'modern';
		this.theme = 'light';
		this.mainColors = '';
		this.textColor = '';
		this.stys = {};
		this.height = '100%';
		this.lang = 'vi';
		this.txt = null;
		this.ai = '';
		this.pageSize = 0;
		this.perms = {};
		this.locationSuggest = '';
		this.hideUpload = false;
		this._editId = null;
		this._deleteId = null;
		this._page = 1;
		this._colFilters = {};
		this._colSearch = {};
		this._colSort = null;
		this._colSearchTimers = {}; // debounce timers per field — not a Lit property
		this._preview = null;
		this._repeaterState = {};
		this._newDraft = {}; // prefill cho form "Thêm mới" — không phải Lit property, luôn set CÙNG lúc với _editId nên khỏi cần reactive riêng, xem openNew()
	}

	// ── Public API ──────────────────────────────────────────────────────────────

	/** `initial` (tuỳ chọn) — object NESTED cùng shape 1 row thật (vd { meta: { address: '...' } }),
	 *  dùng để mồi sẵn form "Thêm mới" (vd svc-assist.js sinh nhanh qua AI, xem svc-admin.js
	 *  _dhAssistFields()). Rỗng thì form "Thêm mới" trống như trước giờ. */
	openNew(initial = {}) { this._newDraft = initial ?? {}; this._editId = 'new'; this._repeaterState = {}; }

	/** Giống openNew() nhưng KHÔNG đụng _editId — dùng ở mode `single` khi AI-fill lên 1 record
	 *  ĐÃ có sẵn (data[0].id thật): nếu gọi openNew() ở đây sẽ ép _editId='new', khiến _doSave()
	 *  hiểu lầm đây là CREATE (tạo dòng trùng) thay vì UPDATE. _rfSingle() sẽ overlay _newDraft
	 *  lên trên data[0] để render form — xem svc-admin.js _dhAssistFields(). */
	applyAiDraft(fields = {}) { this._newDraft = fields ?? {}; this._repeaterState = {}; }

	/** Called by the parent once a `wt-save` has been persisted — collapses the row iff it's still the one saved. */
	closeEdit(id) {
		const key = id ?? 'new';
		if (this._editId === key) this._editId = null;
		this._newDraft = {}; // xoá draft AI-fill đã dùng xong, tránh đè lại lần mở form kế tiếp
		this._repeaterState = {}; // form đóng — bỏ state local, lần sau mở lại seed fresh từ data thật
		this._pendingSaves?.get(key)?.(); // báo cho saveCurrentEdit() (nếu đang chờ) biết ghi xong — xem saveCurrentEdit()
		this._pendingSaves?.delete(key);
	}

	/** Ép lưu dòng đang mở edit dở (nếu có) — cho phép 1 component cha ở xa (vd dialog bọc ngoài
	 *  đóng lại) chủ động lưu thay vì để mất thay đổi khi user quên bấm nút Lưu trong bảng.
	 *  Trả về Promise chờ tới khi parent thật sự ghi xong (gọi closeEdit() lại) — cho phép caller
	 *  await trước khi tự refresh, tránh đọc lại dữ liệu CŨ ngay lúc ghi còn dở dang. Có timeout
	 *  an toàn: nếu ghi lỗi (parent không gọi closeEdit() khi catch) thì không chờ vô hạn. */
	saveCurrentEdit() {
		if (this._editId == null) return Promise.resolve();
		const key = this._editId;
		const emitted = this._doSave();
		if (!emitted) return Promise.resolve(); // validate lỗi (thiếu field required) — _doSave() không emit gì, không có gì để chờ
		return new Promise(resolve => {
			this._pendingSaves ??= new Map();
			this._pendingSaves.set(key, resolve);
			setTimeout(resolve, 8000);
		});
	}

	/** Filtered + sorted data — accessible by parent (e.g. for CSV export) */
	get filteredData() { return this._clientFilteredData; }

	// ── Computed ────────────────────────────────────────────────────────────────

	get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

	get _displayCols() {
		const src = this.columns?.length ? this.columns : (this.schema || []);
		return src.filter(c => c.width);
	}

	get _writeCols() {
		return (this.schema?.length ? this.schema : (this.columns || []))
			.filter(c => c.write !== false && c.type);
	}

	get _hasCtrl() { return this.editable || this.deletable || this.orderable; }

	get _perms() {
		const p = this.perms || {};
		return { edit: p.edit !== false, delete: p.delete !== false, sort: p.sort !== false };
	}

	get _colsByField() {
		const src = this.columns?.length ? this.columns : (this.schema || []);
		return Object.fromEntries(src.map(c => [c.field, c]));
	}

	/** Client-side filtered + sorted data. Skips server-condition columns (already filtered by Firestore). */
	get _clientFilteredData() {
		const byField = this._colsByField;
		let data = this.data || [];

		for (const [field, val] of Object.entries(this._colFilters)) {
			if (!val && val !== 0) continue;
			const col = byField[field];
			if (col?.serverExecutor) continue;
			data = data.filter(r => String(getPath(r, col?.key || field) ?? '') === String(val));
		}

		for (const [field, q] of Object.entries(this._colSearch)) {
			if (!q) continue;
			const col = byField[field];
			if (col?.serverExecutor) continue;
			const lq = q.toLowerCase();
			data = data.filter(r => String(getPath(r, col?.key || field) ?? '').toLowerCase().includes(lq));
		}

		if (this._colSort?.field && this._colSort?.dir) {
			const { field, dir } = this._colSort;
			const col = byField[field];
			if (col && !col.serverExecutor) {
				data = [...data].sort((a, b) => {
					const av = getPath(a, col.key || field) ?? '';
					const bv = getPath(b, col.key || field) ?? '';
					const cmp = typeof av === 'number' && typeof bv === 'number'
						? av - bv
						: String(av).localeCompare(String(bv), undefined, { numeric: true });
					return dir === 'asc' ? cmp : -cmp;
				});
			}
		}

		return data;
	}

	get _pagedData() {
		const data = this._clientFilteredData;
		if (!this.pageSize) return data;
		const start = (this._page - 1) * this.pageSize;
		return data.slice(start, start + this.pageSize);
	}

	get _gridStyle() {
		const ctrl = this._hasCtrl ? this.orderable ? '78px ' : '30px ' : '';
		return `grid-template-columns: ${ctrl}${this._displayCols.map(c => c.width || '1fr').join(' ')}`;
	}

	// ── Theme / CSS ──────────────────────────────────────────────────────────────

	get colors() {
		const [primary = '#2ebd85', secondary = '#f5465c', accent = '#a855f7', info = '#00c7d4', warning = '#fbbf24'] =
			(this.mainColors || '').split('|').map(c => c.trim());
		return { primary, secondary, accent, info, warning };
	}

	get allStyles() {
		const c = this.colors;
		return {
			...this.stys,
			color: this.textColor || '',
			'--color-primary': c.primary, '--color-secondary': c.secondary,
			'--color-accent': c.accent, '--color-info': c.info, '--color-warning': c.warning,
			...(this.textColor ? { '--color-base-content': this.textColor } : {}),
		};
	}

	willUpdate(changed) {
		if (changed.has('data') || changed.has('_colFilters') || changed.has('_colSearch') || changed.has('_colSort')) {
			this._page = 1;
		}
		// single: _editId luôn bám data[0]?.id (hoặc 'new' nếu chưa có bản ghi nào) — không có
		// UI nào set _editId thủ công ở mode này (không có dòng để bấm), _doSave() vẫn đọc
		// _editId để biết CREATE (null) hay UPDATE (id thật) nên phải giữ đồng bộ ở đây.
		if (this.single && (changed.has('data') || changed.has('single'))) {
			this._editId = this.data?.[0]?.id ?? 'new';
		}
	}

	updated(changed) {
		if (changed.has('theme') || changed.has('mainColors') || changed.has('textColor')) {
			this._applyCSS();
		}
	}

	_applyCSS() {
		this.setAttribute('data-theme', this.theme || 'light');
		Object.entries(this.allStyles).forEach(([k, v]) => {
			if (!k.startsWith('--')) return;
			if (v) this.style.setProperty(k, v);
			else   this.style.removeProperty(k);
		});
	}

	// ── Events ───────────────────────────────────────────────────────────────────

	_emit(type, detail) { emit(this, type, detail); }

	/** Collect server-condition column constraints and emit wt-query-change to parent. */
	_emitQueryChange() {
		const byField = this._colsByField;
		const serverFilters = {};
		const serverSearches = {};
		let serverSort = null;

		for (const [f, v] of Object.entries(this._colFilters)) {
			if (byField[f]?.serverExecutor) serverFilters[f] = v;
		}
		for (const [f, q] of Object.entries(this._colSearch)) {
			if (byField[f]?.serverExecutor) serverSearches[f] = q;
		}
		if (this._colSort?.field && byField[this._colSort.field]?.serverExecutor) {
			serverSort = this._colSort;
		}

		this._emit('wt-query-change', { filters: serverFilters, searches: serverSearches, sort: serverSort });
	}

	// ── Column header interactions ────────────────────────────────────────────────

	_dhColFilter(field, val) {
		const f = { ...this._colFilters };
		if (!val && val !== 0) delete f[field]; else f[field] = val;
		this._colFilters = f;
		if (this._colsByField[field]?.serverExecutor) this._emitQueryChange();
	}

	_dhColSearch(field, val) {
		if (this._colsByField[field]?.serverExecutor) {
			// Debounce server-side search to avoid excessive Firestore reads
			clearTimeout(this._colSearchTimers[field]);
			this._colSearchTimers[field] = setTimeout(() => {
				const s = { ...this._colSearch };
				if (!val) delete s[field]; else s[field] = val;
				this._colSearch = s;
				this._emitQueryChange();
			}, 380);
		} else {
			const s = { ...this._colSearch };
			if (!val) delete s[field]; else s[field] = val;
			this._colSearch = s;
		}
	}

	_dhColSort(field, dir) {
		// Toggle: clicking active sort clears it
		this._colSort = this._colSort?.field === field && this._colSort?.dir === dir
			? null : { field, dir };
		if (this._colsByField[field]?.serverExecutor) this._emitQueryChange();
	}

	// ── Save / Delete / Move ─────────────────────────────────────────────────────

	_collectFlat() {
		const flat = {};
		this.shadowRoot.querySelectorAll('.wt-edit-inner [data-field]').forEach(el => {
			const key = el.dataset.field;
			const col = this._writeCols.find(c => (c.key || c.field) === key);
			if (!col || col.type === 'repeater') return;
			const raw = el.value ?? '';
			flat[key] = col.type === 'number' ? Number(raw || 0) : String(raw);
		});
		// repeater: mảng object nested — không đọc qua [data-field] (mỗi dòng nhiều input, không
		// map 1-1), lấy thẳng từ _repeaterState (xem _rfField() case 'repeater').
		for (const col of this._writeCols.filter(c => c.type === 'repeater')) {
			flat[col.key || col.field] = this._repeaterState[col.key || col.field] ?? [];
		}
		return flat;
	}

	/**
	 * Flow lưu form đang mở: DOM inputs -> emit 'wt-save' { id, data } cho parent tự ghi DB
	 * Trả về true/false đã thật sự emit hay chưa — dùng bởi saveCurrentEdit() để biết có gì
	 * cần chờ hay không (validate lỗi thì false, không emit gì).
	 */
	_doSave() {
		// [1] CHECK: Gom flat data từ DOM inputs (+ _repeaterState cho field repeater) rồi
		//     validate field required — thiếu thì báo lỗi + huỷ save, không emit gì
		const flat = this._collectFlat();
		for (const col of this._writeCols.filter(c => c.required)) {
			const k = col.key || col.field;
			const invalid = col.type === 'repeater'
				? !Array.isArray(flat[k]) || flat[k].length === 0
				: !String(flat[k] ?? '').trim();
			if (invalid) { alert(`"${col.label}" ${this._txt.required}`); return false; }
		}

		// [3] EXECUTE: Emit 'wt-save' — parent (svc-admin.js) tự ghi Firestore/adapter
		this._emit('wt-save', { id: this._editId === 'new' ? null : this._editId, data: flat });

		// [4] RETURN: true — đã emit, saveCurrentEdit() có gì để chờ
		return true;
	}

	_doDelete(id) { this._deleteId = null; this._emit('wt-delete', { id }); }
	_doMove(id, direction) { this._emit('wt-move', { id, direction }); }

	// ── Repeater field (type: 'repeater') ─────────────────────────────────────────

	_dhRepeaterAdd(key, itemSchema) {
		const blank = Object.fromEntries((itemSchema ?? [{ field: 'title' }]).map(s => [s.field, '']));
		this._repeaterState = { ...this._repeaterState, [key]: [...(this._repeaterState[key] || []), blank] };
	}

	_dhRepeaterRemove(key, idx) {
		const arr = [...(this._repeaterState[key] || [])];
		arr.splice(idx, 1);
		this._repeaterState = { ...this._repeaterState, [key]: arr };
	}

	_dhRepeaterInput(key, idx, field, value) {
		const arr = [...(this._repeaterState[key] || [])];
		arr[idx] = { ...arr[idx], [field]: value };
		this._repeaterState = { ...this._repeaterState, [key]: arr };
	}

	// ── Helpers ──────────────────────────────────────────────────────────────────

	_cellVal(col, row) {
		const v = getPath(row, col.key || col.field) ?? '';
		if (col.render) return col.render(v, row);
		return col.suffix && v !== '' ? `${v} ${col.suffix}` : v;
	}

	_handleScroll(e) {
		this._emit('table-scroll', { target: e.target, scrollTop: e.target.scrollTop, scrollHeight: e.target.scrollHeight, clientHeight: e.target.clientHeight });
	}

	// ── Render ───────────────────────────────────────────────────────────────────

	// single: chỉ render form edit (data[0] nếu có, this._newDraft rỗng nếu chưa) — bỏ hẳn
	// grid-head/list/pagination, không cần .grid-table bọc ngoài (không có gì để cuộn/căn cột).
	_rfSingle() {
		const uiConfig = this.constructor.uiConfigs[this.ui || 'modern'];
		// _newDraft overlay lên trên record thật (nếu có) — giữ id/field khác khi AI chỉ điền 1
		// phần, xem applyAiDraft().
		const row       = { ...(this.data?.[0] ?? {}), ...this._newDraft };
		return html`
			<div data-theme=${this.theme} class="${uiConfig.wrap} wt-single" style="${cssInline({ ...this.allStyles, height: this.height })}">
				${this._rfEditRow(row, this.aiLoading)}
			</div>
		`;
	}

	render() {
		if (this.single) return this._rfSingle();
		const inlineStyle = cssInline({ ...this.allStyles, height: this.height });
		const uiConfig    = this.constructor.uiConfigs[this.ui || 'modern'];
		const filtered    = this._clientFilteredData;

		return html`
			<div data-theme=${this.theme} class="${uiConfig.wrap}" style="${inlineStyle}">
				${this._preview ? html`
					<div class="wt-preview-backdrop" @click=${() => this._preview = null}>
						<div class="wt-preview-panel" @click=${(e) => e.stopPropagation()}>
							<web-button class="wt-preview-close" square height="26px" type="soft"
								ui=${this.ui} theme=${this.theme} prefix="ri:close-line"
								@clicked=${() => this._preview = null}></web-button>
							<div class="Editor">${unsafeHTML(this._preview)}</div>
						</div>
					</div>
				` : ''}
				<div class="grid-table" @scroll=${this._handleScroll}>

					<!-- Header -->
					<div class="grid-head">
						<div class="grid-row header" style="${this._gridStyle}">
							${this._hasCtrl ? html`<div class="grid-cell wt-ctrl-head"></div>` : ''}
							${this._displayCols.map(col => this._rfColHead(col))}
						</div>
					</div>

					<!-- Body -->
					<div class="grid-body">
						${this._editId === 'new' ? this._rfEditRow(this._newDraft, this.aiLoading) : ''}

						${this._pagedData.map(row => html`
							<div class="wt-row-group">
								<div class="grid-row ${this._editId === row.id ? 'is-open' : ''}" style="${this._gridStyle}">
									${this._rfCtrlCell(row)}
									${this._displayCols.map(col => this._rfBodyCell(col, row))}
								</div>
								${this._deleteId === row.id ? this._rfDeleteConfirm(row) : ''}
								${this._editId   === row.id ? this._rfEditRow(row)       : ''}
							</div>
						`)}

						${filtered.length === 0 && this._editId !== 'new'
							? html`<div class="wt-empty">${this._txt.empty}</div>` : ''}
					</div>
				</div>

				${this.pageSize > 0 && filtered.length > this.pageSize ? html`
					<div class="wt-pagination">
						<web-pagination
							total=${filtered.length}
							current=${this._page}
							pageSize=${this.pageSize}
							ui=${this.ui || 'modern'}
							theme=${this.theme || 'light'}
							@change=${(e) => { this._page = e.detail.current; }}
						></web-pagination>
					</div>
				` : ''}
			</div>
		`;
	}

	// ── Render Fragments ─────────────────────────────────────────────────────────

	_rfColHead(col) {
		const hasCtrls     = col.searchable || col.filterable;
		const isAsc        = this._colSort?.field === col.field && this._colSort?.dir === 'asc';
		const isDesc       = this._colSort?.field === col.field && this._colSort?.dir === 'desc';
		const opts         = (col.opts || []).map(o => typeof o === 'string' ? { value: o, label: o } : o);
		const curFilter    = this._colFilters[col.field] ?? '';
		const curSearch    = this._colSearch[col.field]  ?? '';
		const labelJustify = col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'space-between';

		return html`
			<div class="grid-cell wt-head-cell ${hasCtrls ? 'has-ctrls' : ''}">
				<div class="wt-head-label" style="justify-content:${labelJustify}">
					<span>${col.label || ''}</span>
					${col.sortable ? html`
						<div class="wt-head-sort">
							<web-button square height="18px" type=${isAsc ? 'soft' : 'ghost'} color=${isAsc ? 'primary' : ''}
								ui=${this.ui} theme=${this.theme} prefix="ri:sort-asc"
								title=${this._perms.sort ? 'A→Z' : 'Không có quyền'} ?disabled=${!this._perms.sort}
								@clicked=${() => this._dhColSort(col.field, 'asc')}></web-button>
							<web-button square height="18px" type=${isDesc ? 'soft' : 'ghost'} color=${isDesc ? 'primary' : ''}
								ui=${this.ui} theme=${this.theme} prefix="ri:sort-desc"
								title=${this._perms.sort ? 'Z→A' : 'Không có quyền'} ?disabled=${!this._perms.sort}
								@clicked=${() => this._dhColSort(col.field, 'desc')}></web-button>
						</div>
					` : ''}
				</div>
				${col.searchable ? html`
					<web-texts
						.value=${curSearch}
						.ui=${this.ui}
						height="26px"
						single
						@input=${e => { if (e.detail?.value !== undefined) this._dhColSearch(col.field, e.detail.value); }}
					></web-texts>
				` : ''}
				${col.filterable && opts.length ? html`
					<web-select
						.options=${[{ value: '', label: 'All' }, ...opts]}
						.value=${curFilter || ''}
						.ui=${this.ui}
						height="26px"
						@change=${e => this._dhColFilter(col.field, e.detail.value)}
					></web-select>
				` : ''}
			</div>
		`;
	}

	_rfCtrlCell(row) {
		if (!this._hasCtrl) return '';
		const isOpen    = this._editId   === row.id;
		const isDel     = this._deleteId === row.id;
		const canEdit   = this._perms.edit;
		const canDelete = this._perms.delete;
		const canSort   = this._perms.sort;

		const MOVE_BTNS = [
			{ dir: 'up',     title: 'Lên trên',    icon: 'ri:arrow-up-s-line'      },
			{ dir: 'down',   title: 'Xuống dưới',  icon: 'ri:arrow-down-s-line'    },
			{ dir: 'top',    title: 'Lên đầu',     icon: 'ri:arrow-up-double-line' },
			{ dir: 'bottom', title: 'Xuống cuối',  icon: 'ri:arrow-down-double-line' },
		];

		return html`
			<div class="grid-cell wt-ctrl-cell">
				<div class="wt-act-row">
					${this.editable ? html`
						<web-button square height="22px" type=${isOpen ? 'fill' : 'ghost'} color=${isOpen ? 'primary' : ''}
							ui=${this.ui} theme=${this.theme} prefix=${canEdit ? 'ri:edit-line' : 'ri:lock-line'}
							title=${canEdit ? 'Edit' : 'Không có quyền'} ?disabled=${!canEdit}
							@clicked=${() => { this._editId = isOpen ? null : row.id; this._deleteId = null; this._repeaterState = {}; }}></web-button>` : ''}
					${this.deletable ? html`
						<web-button square height="22px" type=${isDel ? 'fill' : 'ghost'} color="error"
							ui=${this.ui} theme=${this.theme} prefix=${canDelete ? 'ri:delete-bin-line' : 'ri:lock-line'}
							title=${canDelete ? 'Delete' : 'Không có quyền'} ?disabled=${!canDelete}
							@clicked=${() => { this._deleteId = isDel ? null : row.id; this._editId = null; }}></web-button>` : ''}
				</div>
				${this.orderable ? html`
					<div class="wt-sort-col">
						<div class="wt-sort-row">
							${MOVE_BTNS.slice(0, 2).map(({ dir, title, icon }) => html`
								<web-button square height="22px" type="ghost" ui=${this.ui} theme=${this.theme} prefix=${icon}
									title=${title} ?disabled=${!canSort} @clicked=${() => this._doMove(row.id, dir)}></web-button>`)}
						</div>
						<div class="wt-sort-row">
							${MOVE_BTNS.slice(2).map(({ dir, title, icon }) => html`
								<web-button square height="22px" type="ghost" ui=${this.ui} theme=${this.theme} prefix=${icon}
									title=${title} ?disabled=${!canSort} @clicked=${() => this._doMove(row.id, dir)}></web-button>`)}
						</div>
					</div>` : ''}
			</div>
		`;
	}

	_rfBodyCell(col, row) {
		const align      = col.align || 'left';
		const colorStyle = col.color
			? `color:${typeof col.color === 'function' ? col.color(getPath(row, col.key || col.field), row) : col.color}`
			: '';
		const style = `text-align:${align};${colorStyle}`;

		if (col.type === 'editor' || col.type === 'textarea') {
			const v     = getPath(row, col.key || col.field) ?? '';
			const plain = String(v).replace(/<[^>]*>/g, '').trim();
			return html`
				<div class="grid-cell wt-cell-editor" style="${style}">
					${plain.length ? html`
						<web-button square height="26px" type="ghost" ui=${this.ui} theme=${this.theme} prefix="ri:file-text-line"
							title="Xem nội dung" @click=${e => e.stopPropagation()}
							@clicked=${() => { this._preview = String(v); }}></web-button>
					` : ''}
				</div>
			`;
		}

		return html`
			<div class="grid-cell" style="${style}"><div class="grid-cell-body">${this._cellVal(col, row)}</div></div>
		`;
	}

	_rfDeleteConfirm(row) {
		return html`
			<div class="wt-del-confirm">
				<iconify-icon icon="ri:error-warning-line"></iconify-icon>
				<span>${this._txt.confirmDel}</span>
				<web-button height="28px" type="fill" color="error" ui=${this.ui} theme=${this.theme}
					@clicked=${() => this._doDelete(row.id)}>${this._txt.yes}</web-button>
				<web-button height="28px" type="soft" ui=${this.ui} theme=${this.theme}
					@clicked=${() => this._deleteId = null}>${this._txt.no}</web-button>
			</div>
		`;
	}

	// `aiOverlay` — svc-assist đang chờ AI cho ĐÚNG record này (xem prop aiLoading) — phủ lớp
	// loading che tạm form, tránh người dùng tưởng nhấn xác nhận không có phản hồi gì.
	_rfEditRow(row, aiOverlay = false) {
		const canEdit = this._perms.edit;
		return html`
			<div class="wt-edit-row">
				${aiOverlay ? html`
					<div class="wt-ai-loading">
						<iconify-icon icon="ri:loader-4-line" class="wt-spin"></iconify-icon>
						<span>${this._txt.aiFilling}</span>
					</div>
				` : ''}
				<div class="wt-edit-inner">
					${this._writeCols.map(col => this._rfField(col, row))}
				</div>
				<div class="wt-edit-actions">
					${!this.single ? html`
						<web-button type="soft" ui=${this.ui} theme=${this.theme}
							@clicked=${() => this._editId = null}>${this._txt.cancel}</web-button>
					` : ''}
					<web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
						prefix=${canEdit ? 'ri:save-line' : 'ri:lock-line'} ?disabled=${!canEdit}
						@clicked=${() => this._doSave()}>${this._txt.save}</web-button>
					${row?.id && (this.history || this.marketing) ? html`
						<div class="wt-trailing-actions">
							${this.history ? html`
								<web-button type="soft" ui=${this.ui} theme=${this.theme} prefix="ri:history-line"
									@clicked=${() => this._emit('wt-open-history', { id: row.id })}>${this._txt.history}</web-button>
							` : ''}
							${this.marketing ? html`
								<web-button type="soft" ui=${this.ui} theme=${this.theme} prefix="ri:magic-line"
									@clicked=${() => this._emit('wt-open-marketing', { id: row.id })}>${this._txt.marketing}</web-button>
							` : ''}
						</div>
					` : ''}
				</div>
			</div>
		`;
	}

	_rfField(col, row) {
		const storageKey = col.key || col.field;
		const val        = row ? (getPath(row, storageKey) ?? '') : '';
		const opts       = (col.opts ?? []).map(o => typeof o === 'string' ? { value: o, label: o } : o);
		const fullRow    = ['textarea', 'photor', 'editor', 'location', 'repeater'].includes(col.type);

		let input;
		switch (col.type) {
			case 'select':
				input = html`<web-select data-field=${storageKey} .options=${opts} .value=${val||null} .ui=${this.ui} height="32px"></web-select>`;
				break;
			case 'number':
				input = html`<web-currency data-field=${storageKey} .value=${Number(val||0)} .ui=${this.ui} height="32px" suffix=${col.suffix??''}></web-currency>`;
				break;
			case 'datetime':
				input = html`<web-datetime data-field=${storageKey} .value=${String(val??'')} .ui=${this.ui} height="32px"></web-datetime>`;
				break;
			case 'password':
				input = html`<input type="password" class="wt-input" data-field=${storageKey}
					autocomplete="new-password" placeholder=${!row?.id ? '' : '(để trống = giữ nguyên)'} />`;
				break;
			case 'textarea':
				input = html`<web-textarea data-field=${storageKey} .value=${String(val??'')} .ui=${this.ui} rows="3"></web-textarea>`;
				break;
			case 'editor':
				input = html`<svc-editor data-field=${storageKey} .value=${String(val??'')} .ui=${this.ui} .theme=${this.theme}
					ai=${this.ai || [import.meta.env.PUBLIC_NVID, import.meta.env.PUBLIC_GROQ, import.meta.env.PUBLIC_OPER].filter(Boolean).join('|')} placeholder="Nhập nội dung…"></svc-editor>`;
				break;
			case 'photor':
				input = html`<svc-photor data-field=${storageKey} .value=${String(val??'')} .ui=${this.ui} ?hideUpload=${this.hideUpload}
					?multiple=${col.multiple ?? false} .limit=${col.limit ?? 0}></svc-photor>`;
				break;
			case 'location':
				// Rỗng → gợi ý sẵn locationSuggest (vd room.location của channel) làm điểm bắt
				// đầu, owner tự sửa/xác nhận lại — không ép nếu field đã có dữ liệu sẵn.
				input = html`<web-location-map data-field=${storageKey} geo .value=${String(val || this.locationSuggest || '')}
					.ui=${this.ui} .theme=${this.theme}></web-location-map>`;
				break;
			case 'repeater': {
				// Lazy-seed từ row hiện tại lần đầu render field này trong 1 phiên edit (xem
				// openNew/applyAiDraft/closeEdit reset _repeaterState = {} khi đổi phiên) — sau
				// đó chỉ mutate qua _dhRepeater*(), KHÔNG đọc lại row nữa (tránh mất edit dở nếu
				// component re-render vì lý do khác, vd theme đổi).
				if (!(storageKey in this._repeaterState)) {
					const initial = Array.isArray(val) ? val : [];
					this._repeaterState = { ...this._repeaterState, [storageKey]: initial.map(o => ({ ...o })) };
				}
				const itemSchema = col.itemSchema ?? [{ field: 'title', label: col.label, type: 'text' }];
				const rows = this._repeaterState[storageKey] || [];
				input = html`
					<div class="wt-repeater">
						${rows.map((r, idx) => html`
							<div class="wt-repeater-row">
								${itemSchema.map(sub => html`
									<input class="wt-input" placeholder=${sub.label ?? ''}
										.value=${String(r[sub.field] ?? '')}
										@input=${e => this._dhRepeaterInput(storageKey, idx, sub.field, e.target.value)} />
								`)}
								<web-button square height="32px" type="soft" ui=${this.ui} theme=${this.theme}
									prefix="ri:delete-bin-line" title=${this._txt.yes}
									@clicked=${() => this._dhRepeaterRemove(storageKey, idx)}></web-button>
							</div>
						`)}
						<web-button class="wt-btn-repeater-add" type="dash" color="primary" ui=${this.ui} theme=${this.theme}
							prefix="ri:add-line" @clicked=${() => this._dhRepeaterAdd(storageKey, itemSchema)}>${this._txt.addRow}</web-button>
					</div>
				`;
				break;
			}
			default:
				input = html`<web-texts data-field=${storageKey} .value=${String(val??'')} .ui=${this.ui}
					height="32px" .segments=${col.segments??0} .segmentHints=${col.segmentHints??''}
					?single=${!col.multi && !(col.segments > 0)}></web-texts>`;
		}

		return html`
			<div class="wt-field ${fullRow ? 'full' : ''}">
				<div class="wt-field-label">${col.label}${col.required ? ' *' : ''}</div>
				${input}
			</div>
		`;
	}
}

customElements.define('web-table', WebTable);
