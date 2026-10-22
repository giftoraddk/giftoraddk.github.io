// src/packages/auth/svc-records.js
//
// <svc-records> — manages ONE table on its own, driven by the `schema` it's handed, inside any container
// (a svc-node popover here). `class SvcRecords extends SvcResources`: loading/paging (conductor), server-side
// search/filter/sort, save / soft-delete / reorder / delete-all, CSV import/export, revisions (svc-diffs),
// permissions — all svc-resources's own. What changes is only the view:
//   - Shadow DOM + static styles (svc-resources is Light DOM + injected CSS, which can't reach into a popover)
//   - a panel header (icon, title, record count, import / export / delete-all / reload / add) above <svc-list>
//     (mobile-first, extends app/record-table.js) instead of svc-resources's own toolbar
//   - dialogs as bottom sheets
//
//   <svc-records dataTable="products" orderable revalidate btnDeleteAll>
//   el.schema = productsSchema             // (lang) => columns — re-resolved when `lang` changes
//   el.columns = [...]                     // optional: fewer list columns than the form (schema) has
//   creatable=false → no Add / Import (rows written elsewhere, e.g. the radar crawler)
//   fnDivision="ecommerce.product" → a "Create with AI" button on the New form: opens that department's <svc-fn> in a
//     bottom sheet (the Title typed so far becomes the topic and starts at once); the department runs its own steps,
//     you review/approve there, the Worker writes the record (draft) — then the form closes and the list reloads.
//
// An <svc-assist slot="toolbar"> child can fill the form (assist:* events, handled by svc-resources).

import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import css from './css/svc-records.css?inline';
import { txtLingo } from '@/services/tools/util.js';
import { SvcResources, TXT_STD as ADMIN_TXT } from './svc-resources.js';
import './svc-list.js';

const TXT_STD = {
    vi: { ...ADMIN_TXT.vi, add: 'Thêm', error: 'Không tải được dữ liệu', retry: 'Thử lại', reload: 'Tải lại', noTable: 'Chưa chọn bảng (dataTable).', noPerm: 'Không có quyền',
        fnRun: 'Tạo bằng AI', fnRunHint: 'Giao cho phòng ban AI tạo tự động', fnTitle: 'Phòng ban AI tạo {name}' },
    en: { ...ADMIN_TXT.en, add: 'Add', error: 'Could not load data', retry: 'Retry', reload: 'Reload', noTable: 'No table set (dataTable).', noPerm: 'No permission',
        fnRun: 'Create with AI', fnRunHint: 'Let the AI department create it', fnTitle: 'AI department creates {name}' },
};

// One page-level toast for every panel (svc-resources pages render their own <web-toast>).
function ensureToast(ui) {
    if (document.querySelector('web-toast')) return;
    const el = document.createElement('web-toast');
    el.ui = ui;
    document.body.appendChild(el);
}

export class SvcRecords extends SvcResources {
    static styles = unsafeCSS(css);

    // Merged by Lit with SvcResources's own properties.
    static properties = {
        heading: { type: String }, // panel title (default: dataTable)
        icon:    { type: String },
        columns: { attribute: false }, // list columns (default: the schema's `width` columns)
        creatable: { type: Boolean }, // false = rows come from elsewhere (radar crawler) — no Add, no CSV import
        fnDivision: { type: String }, // '<sector>.<fn>' — department that creates rows of this table ("Create with AI")
        _fnOpen:    { state: true },
        _fnCommand: { state: true }, // { id, text } — topic handed to <svc-fn> (llm/tool/command.js, taken once per id)
    };

    constructor() {
        super();
        this.heading = '';
        this.icon = 'ri:database-2-line';
        this.columns = null;
        this.creatable = true;
        this.fnDivision = '';
        this._fnOpen = false;
        this._fnCommand = null;
    }

    // Shadow DOM — skips SvcResources's Light DOM override. Every lookup in SvcResources goes through renderRoot.
    createRenderRoot() { return LitElement.prototype.createRenderRoot.call(this); }

    connectedCallback() {
        super.connectedCallback();
        ensureToast(this.ui);
    }

    get _txt()        { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _tableEl()    { return this.renderRoot?.querySelector('svc-list'); }
    get _dialogType() { return 'mobile'; }

    // ── "Create with AI" — the table's department (<svc-fn>, llm package, loaded on first use) ──

    async _dhOpenFn() {
        const title = String(this._tableEl?._collectFlat?.().title ?? '').trim();
        await import('@/packages/llm/svc-fn.js');
        this._fnCommand = title ? { id: `${this._table}:${Date.now()}`, text: title } : null;
        this._fnOpen = true;
    }

    // web-dialog không persistent tự đóng (✕ / bấm nền / ESC) bằng sự kiện 'close' — không phải 'cancel' — nên phải nghe cả
    // 'close', nếu không _fnOpen kẹt ở true và lần bấm "Tạo bằng AI" sau không đổi gì → dialog không mở lại. Các sự kiện
    // này bubbles + composed: chỉ nhận khi đến từ CHÍNH dialog (dialog/popover con trong <svc-fn> đóng không kéo theo sheet).
    _dhCloseFn(e) {
        if (e && e.target !== e.currentTarget) return;
        this._fnOpen = false;
    }

    // Worker just saved the approved result as a record (status draft) — drop the half-filled New form, reload so the row shows up.
    _dhFnRecorded() {
        this._fnOpen = false;
        this._tableEl?.closeEdit();
        this._dhReset();
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    render() {
        return html`
            <div class="sys">
                ${this._rbHead()}
                ${this._rbBody()}
            </div>
            ${this._rbAddons()}
            ${this._rbDialogs()}
            ${this._rbFnSheet()}
        `;
    }

    _rbFnSheet() {
        if (!this.fnDivision) return nothing;
        const name = String(this.heading || this._table).replace(/^(Quản lý|Manage)\s+/i, '');
        return html`
            <web-dialog type=${this._dialogType} ?open=${this._fnOpen} lang=${this.lang} .ui=${this.ui} maxWidth="760px"
                title=${this._txt.fnTitle.replace('{name}', name.toLowerCase())}
                @close=${this._dhCloseFn} @cancel=${this._dhCloseFn} @confirm=${this._dhCloseFn}>
                ${this._fnOpen ? html`
                    <div class="sys-fn">
                        <svc-fn embedded division=${this.fnDivision} .command=${this._fnCommand}
                            ui=${this.ui} theme=${this.theme} lang=${this.lang}
                            @fn-recorded=${this._dhFnRecorded}></svc-fn>
                    </div>` : nothing}
            </web-dialog>
        `;
    }

    _rbHead() {
        const t = this._txt, p = this._perms;
        const busy = this._loading || this._serverLoading;
        return html`
            <div class="sys-head">
                <span class="sys-icon"><iconify-icon icon=${this.icon}></iconify-icon></span>
                <div class="sys-title">
                    <span class="sys-h1">${this.heading || this._table}</span>
                    <span class="sys-muted">${busy
                        ? html`<iconify-icon class="sys-spin" icon="ri:loader-4-line"></iconify-icon>`
                        : `${this._data.length} ${t.records}`}</span>
                </div>
                ${!this.single ? html`
                    <div class="sys-actions">
                        <slot name="toolbar"></slot>
                        ${this.creatable ? html`
                            <input class="sad-csv-input" type="file" accept=".csv" hidden @change=${this._dfImportCsv}>
                            <button type="button" class="sys-icon-btn" title=${p.edit ? t.import : t.noPerm} aria-label=${t.import}
                                ?disabled=${this._importing || !p.edit} @click=${this._dhImportClick}>
                                <iconify-icon class=${this._importing ? 'sys-spin' : ''}
                                    icon=${this._importing ? 'ri:loader-4-line' : p.edit ? 'ri:upload-cloud-2-line' : 'ri:lock-line'}></iconify-icon>
                            </button>` : nothing}
                        <button type="button" class="sys-icon-btn" title=${t.export} aria-label=${t.export} @click=${this._dfExportCsv}>
                            <iconify-icon icon="ri:download-cloud-2-line"></iconify-icon>
                        </button>
                        <button type="button" class="sys-icon-btn" title=${t.reload} aria-label=${t.reload} ?disabled=${busy} @click=${this._dhReset}>
                            <iconify-icon icon="ri:refresh-line"></iconify-icon>
                        </button>
                        ${this.btnDeleteAll && p.deleteAll ? html`
                            <button type="button" class="sys-icon-btn is-danger" title=${t.deleteAll} aria-label=${t.deleteAll}
                                ?disabled=${!this._data.length || this._deletingAll} @click=${() => { this._deleteAllOpen = true; }}>
                                <iconify-icon icon="ri:delete-bin-2-line"></iconify-icon>
                            </button>` : nothing}
                        ${this.creatable ? html`
                            <button type="button" class="sys-add" title=${p.edit ? t.add : t.noPerm} ?disabled=${!p.edit || this._loading} @click=${this._dhOpenNew}>
                                <iconify-icon icon=${p.edit ? 'ri:add-line' : 'ri:lock-line'}></iconify-icon><span>${t.add}</span>
                            </button>` : nothing}
                    </div>` : nothing}
            </div>
        `;
    }

    _rbBody() {
        const t = this._txt;
        if (!this._table) return html`<div class="sys-state">${t.noTable}</div>`;
        if (this._loading) return html`
            <div class="sys-state"><iconify-icon class="sys-spin" icon="ri:loader-4-line"></iconify-icon>${t.loading}</div>`;
        if (this._error) return html`
            <div class="sys-state is-error">
                <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                <span>${t.error}: ${this._error}</span>
                <button type="button" class="sys-retry" @click=${() => this._dcLoad()}>${t.retry}</button>
            </div>`;
        return html`
            <svc-list
                .data=${this._data} .schema=${this._cols} .columns=${this.columns ?? []} .perms=${this._perms}
                lang=${this.lang} ui=${this.ui} theme=${this.theme}
                .locationSuggest=${this.locationSuggest} ?hideUpload=${this.hideUpload}
                ?aiLoading=${this._aiLoading} ?single=${this.single} pageSize=${this.pageSize} ?orderable=${this.orderable}
                editable deletable ?history=${!!this.diffsTable && this._perms.history}
                ai=${this._comAiConfig}
                @wt-save=${this._dfSave} @wt-delete=${this._dfDeleteExec} @wt-move=${this._dfMove}
                @wt-open-history=${this._dhOpenHistory}
                @wt-query-change=${this._dhQueryChange}>
                ${this.fnDivision && this._perms.edit ? html`
                    <button slot="new-actions" type="button" class="sys-fn-btn" title=${t.fnRunHint} @click=${this._dhOpenFn}>
                        <iconify-icon icon="ri:sparkling-2-line"></iconify-icon><span>${t.fnRun}</span>
                    </button>` : nothing}
            </svc-list>
        `;
    }
}

if (!customElements.get('svc-records')) customElements.define('svc-records', SvcRecords);
