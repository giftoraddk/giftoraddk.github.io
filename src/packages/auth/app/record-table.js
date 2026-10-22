// src/packages/auth/app/record-table.js
//
// RecordTable — the schema-driven CRUD core under <svc-list> (svc-list.js `extends RecordTable`). No view of its
// own: it holds the rows + schema, the column filter / search / sort state (serverExecutor columns → 'wt-query-change'
// for the parent to re-query), paging, the edit session (_editId, AI draft, repeater state), save / validate /
// delete / move events and the form-field renderer (_rfField). The subclass draws the list and the form; the form's
// fields must sit under `.wt-edit-inner` — that is where _collectFlat() reads them.
//
// Split out of apex/web-table.js (now a plain display table: columns + data + tints — it shares cellText()).
// Events: wt-save { id, data } · wt-delete { id } · wt-move { id, prevId | nextId | direction } · wt-open-history { id } ·
// wt-query-change { filters, sort } (+ `searches` from the subclass's search box).

import { LitElement, html } from 'lit';
import { txtLingo } from '@/services/tools/lingo.js';
import { dataInit, emit, getPath } from '@/services/tools/util';
import { cellText } from '@/packages/apex/web-table.js';
import { DEFAULT_CHAIN } from '@/services/shared/tensor-api.js';
import 'iconify-icon';

// Field components — registered globally, available inside Shadow DOM
import '@/packages/apex/web-select.js';
import '@/packages/apex/web-currency.js';
import '@/packages/apex/web-button.js';
import '@/packages/apex/web-texts.js';
import '@/packages/apex/web-textarea.js';
import '@/packages/apex/web-datetime.js';
import '@/packages/apex/web-location-map.js';
import '@/packages/adopted/svc-photor.js';
import '@/packages/adopted/svc-editor.js';

export const TXT_STD = {
	vi: { required: 'là bắt buộc', yes: 'Xoá', addRow: 'Thêm dòng' },
	en: { required: 'is required', yes: 'Delete', addRow: 'Add row' },
};

export class RecordTable extends LitElement {
	static properties = {
		data:        { type: Array,  converter: { fromAttribute: v => dataInit(v, []) } },
		columns:     { type: Array,  converter: { fromAttribute: v => dataInit(v, []) } },
		schema:      { type: Array },
		orderable:   { type: Boolean },
		editable:    { type: Boolean },
		deletable:   { type: Boolean },
		history:     { type: Boolean },
		// `data` luôn tối đa 1 bản ghi (vd sectionItems của 1 section hero/contact) — không list/pagination, luôn hiện
		// ĐÚNG 1 form edit mở sẵn (data[0] nếu có, "Thêm mới" nếu chưa), xem willUpdate().
		single:      { type: Boolean },
		// svc-assist đang chờ AI trả kết quả (xem svc-resources.js @assist:loading) — subclass phủ overlay loading lên
		// ĐÚNG form sắp bị điền vào.
		aiLoading:   { type: Boolean },
		ui:          { type: String },
		theme:       { type: String },
		height:      { type: String },
		lang:        { type: String },
		txt:         { type: Object },
		ai:          { type: String },
		pageSize:    { type: Number },
		perms:       { type: Object }, // { edit, delete, sort } — false disables the action
		// Gợi ý mặc định cho field type 'location' khi đang rỗng (vd room.location của channel) — không ép giá trị
		// nếu field đã có sẵn dữ liệu.
		locationSuggest: { type: String },
		// Passthrough cho field type 'photor' — ẩn nút chọn ảnh, xem svc-photor.js prop cùng tên.
		hideUpload: { type: Boolean },
		// State
		_editId:     { state: true },
		_deleteId:   { state: true },
		_page:       { state: true },
		_colFilters: { state: true }, // { [field]: value } — per-column select filters
		_colSort:    { state: true }, // { field, dir: 'asc'|'desc' } | null
		_preview:    { state: true }, // HTML string — editor content preview overlay
		_repeaterState: { state: true },
	};

	constructor() {
		super();
		this.data = [];
		this.columns = [];
		this.schema = [];
		this.orderable = false;
		this.editable = false;
		this.deletable = false;
		this.history = false;
		this.single = false;
		this.aiLoading = false;
		this.ui = 'modern';
		this.theme = 'light';
		this.height = 'auto';
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
		this._colSort = null;
		this._preview = null;
		this._repeaterState = {};
		this._newDraft = {}; // prefill cho form "Thêm mới" — luôn set CÙNG lúc với _editId nên khỏi reactive riêng, xem openNew()
	}

	// ── Public API ──────────────────────────────────────────────────────────────

	/** `initial` (tuỳ chọn) — object NESTED cùng shape 1 row thật (vd { meta: { address: '...' } }), mồi sẵn form
	 *  "Thêm mới" (vd svc-assist.js sinh nhanh qua AI, xem svc-resources.js _dhAssistFields()). */
	openNew(initial = {}) { this._newDraft = initial ?? {}; this._editId = 'new'; this._repeaterState = {}; }

	/** Giống openNew() nhưng KHÔNG đụng _editId — dùng ở mode `single` khi AI-fill lên 1 record ĐÃ có sẵn: openNew()
	 *  sẽ ép _editId='new' khiến _doSave() tạo dòng trùng thay vì UPDATE. Subclass overlay _newDraft lên data[0]. */
	applyAiDraft(fields = {}) { this._newDraft = fields ?? {}; this._repeaterState = {}; }

	/** Called by the parent once a `wt-save` has been persisted — collapses the row iff it's still the one saved. */
	closeEdit(id) {
		const key = id ?? 'new';
		if (this._editId === key) this._editId = null;
		this._newDraft = {}; // xoá draft AI-fill đã dùng xong, tránh đè lại lần mở form kế tiếp
		this._repeaterState = {}; // form đóng — bỏ state local, lần sau mở lại seed fresh từ data thật
		this._pendingSaves?.get(key)?.(); // báo cho saveCurrentEdit() (nếu đang chờ) biết ghi xong
		this._pendingSaves?.delete(key);
	}

	/** Ép lưu dòng đang mở edit dở (nếu có) — vd dialog bọc ngoài đóng lại. Promise chờ tới khi parent ghi xong
	 *  (gọi closeEdit() lại); timeout an toàn nếu ghi lỗi (parent không gọi closeEdit()). */
	saveCurrentEdit() {
		if (this._editId == null) return Promise.resolve();
		const key = this._editId;
		const emitted = this._doSave();
		if (!emitted) return Promise.resolve(); // validate lỗi — không emit gì, không có gì để chờ
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

	/** Column lists derived from `columns` / `schema` — rebuilt only when either array is replaced, since a render
	 *  reads them once per row. Subclasses add their own roles in _buildColInfo(). */
	get _colInfo() {
		const at = this._colInfoAt;
		if (at?.columns !== this.columns || at?.schema !== this.schema) {
			const src = this.columns?.length ? this.columns : (this.schema || []);
			this._colInfoAt = { columns: this.columns, schema: this.schema, info: this._buildColInfo(src) };
		}
		return this._colInfoAt.info;
	}

	_buildColInfo(src) {
		return {
			src,
			display: src.filter(c => c.width),
			write: (this.schema?.length ? this.schema : (this.columns || [])).filter(c => c.write !== false && c.type),
			byField: Object.fromEntries(src.map(c => [c.field, c])),
		};
	}

	get _displayCols() { return this._colInfo.display; }
	get _writeCols() { return this._colInfo.write; }
	get _colsByField() { return this._colInfo.byField; }

	// Form-field look — overridable by subclasses.
	get _fieldUi() { return this.ui; }
	get _fieldHeight() { return '32px'; }

	get _perms() {
		const p = this.perms || {};
		return { edit: p.edit !== false, delete: p.delete !== false, sort: p.sort !== false };
	}

	/** Client-side filtered + sorted data. Skips server-condition columns (already filtered by the server). */
	get _clientFilteredData() {
		const byField = this._colsByField;
		let data = this.data || [];

		for (const [field, val] of Object.entries(this._colFilters)) {
			if (!val && val !== 0) continue;
			const col = byField[field];
			if (col?.serverExecutor) continue;
			data = data.filter(r => String(getPath(r, col?.key || field) ?? '') === String(val));
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

	willUpdate(changed) {
		if (changed.has('data') || changed.has('_colFilters') || changed.has('_colSort')) {
			this._page = 1;
		}
		// single: _editId luôn bám data[0]?.id (hoặc 'new' nếu chưa có bản ghi nào) — _doSave() đọc _editId để biết
		// CREATE (null) hay UPDATE (id thật) nên phải giữ đồng bộ ở đây.
		if (this.single && (changed.has('data') || changed.has('single'))) {
			this._editId = this.data?.[0]?.id ?? 'new';
		}
	}

	// ── Events ───────────────────────────────────────────────────────────────────

	_emit(type, detail) { emit(this, type, detail); }

	/** Server-condition part of the column state { filters, sort } — subclasses add `searches`. */
	get _serverQuery() {
		const byField = this._colsByField;
		const filters = {};
		for (const [f, v] of Object.entries(this._colFilters)) {
			if (byField[f]?.serverExecutor) filters[f] = v;
		}
		const sort = this._colSort?.field && byField[this._colSort.field]?.serverExecutor ? this._colSort : null;
		return { filters, sort };
	}

	/** Emit the server-condition constraints for the parent to re-query. */
	_emitQueryChange() { this._emit('wt-query-change', this._serverQuery); }

	_dhColFilter(field, val) {
		const f = { ...this._colFilters };
		if (!val && val !== 0) delete f[field]; else f[field] = val;
		this._colFilters = f;
		if (this._colsByField[field]?.serverExecutor) this._emitQueryChange();
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
		// repeater: mảng object nested — không đọc qua [data-field] (mỗi dòng nhiều input), lấy thẳng từ _repeaterState
		for (const col of this._writeCols.filter(c => c.type === 'repeater')) {
			flat[col.key || col.field] = this._repeaterState[col.key || col.field] ?? [];
		}
		return flat;
	}

	/**
	 * Flow lưu form đang mở: DOM inputs -> emit 'wt-save' { id, data } cho parent tự ghi DB.
	 * Trả về true/false đã thật sự emit hay chưa — saveCurrentEdit() dùng để biết có gì cần chờ.
	 */
	_doSave() {
		// [1] CHECK: gom flat data rồi validate field required — thiếu thì báo lỗi + huỷ save
		const flat = this._collectFlat();
		for (const col of this._writeCols.filter(c => c.required)) {
			const k = col.key || col.field;
			const invalid = col.type === 'repeater'
				? !Array.isArray(flat[k]) || flat[k].length === 0
				: !String(flat[k] ?? '').trim();
			if (invalid) { alert(`"${col.label}" ${this._txt.required}`); return false; }
		}

		// [2] EXECUTE: emit 'wt-save' — parent (svc-resources.js) tự ghi DB/adapter
		this._emit('wt-save', { id: this._editId === 'new' ? null : this._editId, data: flat });
		return true;
	}

	_doDelete(id) { this._deleteId = null; this._emit('wt-delete', { id }); }
	/** `to` = { prevId } | { nextId } (new neighbour as shown) or { direction: 'top' | 'unpin' } — svc-resources _dfMove. */
	_doMove(id, to = {}) { this._emit('wt-move', { id, ...to }); }

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

	/** A cell as shown in the list — render(), else the option label, else the value (+ suffix). */
	_cellVal(col, row) { return cellText(col, row); }

	// ── Form field ───────────────────────────────────────────────────────────────

	_rfField(col, row) {
		const storageKey = col.key || col.field;
		const val        = row ? (getPath(row, storageKey) ?? '') : '';
		const opts       = (col.opts ?? []).map(o => typeof o === 'string' ? { value: o, label: o } : o);
		const fullRow    = ['textarea', 'photor', 'editor', 'location', 'repeater'].includes(col.type);

		let input;
		switch (col.type) {
			case 'select':
				input = html`<web-select data-field=${storageKey} .options=${opts} .value=${val||null} .ui=${this._fieldUi} height=${this._fieldHeight}></web-select>`;
				break;
			case 'number':
				input = html`<web-currency data-field=${storageKey} .value=${Number(val||0)} .ui=${this._fieldUi} height=${this._fieldHeight} suffix=${col.suffix??''}></web-currency>`;
				break;
			case 'datetime':
				// type="datetime" bật time-of-day picker — cần cho field cửa sổ hiệu lực (effectiveFrom/effectiveTo).
				input = html`<web-datetime type="datetime" data-field=${storageKey} .value=${String(val??'')} .ui=${this._fieldUi} height=${this._fieldHeight}></web-datetime>`;
				break;
			case 'password':
				input = html`<input type="password" class="wt-input" data-field=${storageKey}
					autocomplete="new-password" placeholder=${!row?.id ? '' : '(để trống = giữ nguyên)'} />`;
				break;
			case 'textarea': {
				// Object/array value (vd know.js/rel.js's `meta`) — JSON.stringify; _collectFlat() gửi lại string thô,
				// server coerceIn() tự bỏ qua field đã là string.
				const textVal = val && typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '');
				input = html`<web-textarea data-field=${storageKey} .value=${textVal} .ui=${this._fieldUi} rows="3"></web-textarea>`;
				break;
			}
			case 'editor':
				input = html`<svc-editor data-field=${storageKey} .value=${String(val??'')} .ui=${this._fieldUi} .theme=${this.theme}
					ai=${this.ai || DEFAULT_CHAIN} placeholder="Nhập nội dung…"></svc-editor>`;
				break;
			case 'photor':
				input = html`<svc-photor data-field=${storageKey} .value=${String(val??'')} .ui=${this._fieldUi} ?hideUpload=${this.hideUpload}
					?multiple=${col.multiple ?? false} .limit=${col.limit ?? 0}></svc-photor>`;
				break;
			case 'location':
				// Rỗng → gợi ý sẵn locationSuggest làm điểm bắt đầu, không ép nếu field đã có dữ liệu.
				input = html`<web-location-map data-field=${storageKey} geo .value=${String(val || this.locationSuggest || '')}
					.ui=${this._fieldUi} .theme=${this.theme}></web-location-map>`;
				break;
			case 'repeater': {
				// Lazy-seed từ row lần đầu render field này trong 1 phiên edit (openNew/applyAiDraft/closeEdit reset
				// _repeaterState) — sau đó chỉ mutate qua _dhRepeater*(), không đọc lại row (giữ edit dở khi re-render).
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
								<web-button square height=${this._fieldHeight} type="soft" ui=${this.ui} theme=${this.theme}
									prefix="ri:delete-bin-line" title=${this._txt.yes}
									@click=${() => this._dhRepeaterRemove(storageKey, idx)}></web-button>
							</div>
						`)}
						<web-button class="wt-btn-repeater-add" type="dash" color="primary" ui=${this.ui} theme=${this.theme}
							prefix="ri:add-line" @click=${() => this._dhRepeaterAdd(storageKey, itemSchema)}>${this._txt.addRow}</web-button>
					</div>
				`;
				break;
			}
			default:
				input = html`<web-texts data-field=${storageKey} .value=${String(val??'')} .ui=${this._fieldUi}
					height=${this._fieldHeight} .segments=${col.segments??0} .segmentHints=${col.segmentHints??''}
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
