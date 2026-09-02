import { LitElement, html, nothing } from 'lit';
import 'iconify-icon';
import css from './styles/svc-roles.css?inline';
import { auth, parseRoles } from '@/webs/auth/tools/service.js';
import { createService } from '@/services/crud.js';
import { injectStyles, txtLingo } from '@/services/helper.js';
import { ORDER_PRESETS, roleCaps } from '@/services/schemas/roles-constant.js';
import '@/webs/apex/web-select.js';
import '@/webs/apex/web-table.js';
import '@/webs/apex/web-checkbox.js';

// ── Fallback table list ────────────────────────────────────────────────────
// Used only when no `tables` prop is provided.
// Prefer passing `tables` from the layout so this list never needs updating.
const TABLES_STD = [
    'posts', 'products', 'orders', 'comments',
    'reviews', 'events', 'faqs', 'users', 'invoice',
    'talents', 'jobs', 'proposals', // talent marketplace — xem docs/new_feature.md §6.2
];

// ── i18n ──────────────────────────────────────────────────────────────────
const TXT_STD = {
    vi: {
        title: 'Phân quyền người dùng', tableLabel: 'Bảng dữ liệu',
        colName: 'Tên / Email', colUsername: 'Tên đăng nhập',
        loading: 'Đang tải…', empty: 'Không có người dùng',
        errLoad: 'Không thể tải danh sách', errSave: 'Lỗi lưu quyền',
    },
    en: {
        title: 'User Role Management', tableLabel: 'Table',
        colName: 'Name / Email', colUsername: 'Username',
        loading: 'Loading…', empty: 'No users found',
        errLoad: 'Failed to load users', errSave: 'Failed to save roles',
    },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * <svc-roles tables='["posts","products"]' lang="vi">
 *
 * Props:
 *   tables  — JSON array string or comma-separated table names.
 *             Derives the dropdown list and scope of role edits.
 *             Pass from the layout so it stays in sync with allMenuItems.
 *   dataTable — Firestore collection that holds user documents (default: "users").
 *   lang    — "vi" | "en"
 *   ui      — "" | "spatial"
 *
 * Visibility: renders nothing unless auth.isAdmin() returns true.
 */
export class SvcRoles extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        lang:     { type: String },
        txt:      { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        ui:       { type: String },
        theme:    { type: String },
        dataTable: { type: String },
        server:   { type: String }, // adapter đã registerAdapter — mặc định 'auth'
        // JSON array string or comma-separated — e.g. '["posts","products","orders"]'
        tables:   { type: String },
        // ── Internal state ──────────────────────────────────────────────────
        _open:    { state: true },
        _table:   { state: true }, // currently selected table name
        _users:   { state: true },
        _loading: { state: true },
        _error:   { state: true },
        _saving:  { state: true }, // Set<userId> — rows with an in-flight Firestore write
        _isAdmin: { state: true },
    };

    constructor() {
        super();
        this.lang     = 'vi';
        this.txt      = null;
        this.ui       = '';
        this.theme    = 'dark';
        this.dataTable = 'users';
        this.server   = 'auth';
        this.tables   = '';
        this._open    = false;
        this._table   = '';   // resolved in connectedCallback after `tables` prop is set
        this._users   = [];
        this._loading = false;
        this._error   = '';
        this._saving  = new Set();
        this._isAdmin = false;
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    async connectedCallback() {
        super.connectedCallback();
        injectStyles('svc-roles-styles', css);
        // `tables` prop is already applied by the time connectedCallback fires,
        // so _tables is ready here.
        if (!this._table) this._table = this._tables[0] ?? TABLES_STD[0];
        this._isAdmin = await auth.isAdmin();
    }

    updated(changed) {
        // If the `tables` prop changes at runtime (e.g. navigation), make sure
        // the selected table is still in the new list; if not, reset to the first.
        if (changed.has('tables') && !this._tables.includes(this._table)) {
            this._table = this._tables[0] ?? '';
        }
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcLoad() {
        this._loading = true;
        this._error   = '';
        try {
            const rows  = await this._svc.findAll();
            this._users = rows.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
        } catch (err) {
            this._error = `${this._txt.errLoad}: ${err.message}`;
        } finally {
            this._loading = false;
        }
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhOpen() {
        this._open = true;
        if (!this._users.length) this._dcLoad();
    }

    _dhClose() { this._open = false; }

    _dhTableChange(e) { this._table = e.detail?.value ?? this._table; }

    /**
     * Flow toggle preset quyền: (userId, preset, checked) -> roles string mới ghi DB
     */
    async _dhTogglePreset(userId, preset, checked) {
        // [1] CHECK: Bỏ qua nếu user không tồn tại hoặc là Super Admin (không sửa được)
        const user = this._users.find(u => u.id === userId);
        if (!user || this._comIsSuper(user)) return;

        // [2] PROCESS: Tính tập preset đang check + build lại roles string cho đúng table
        const checkedNow = new Set(this._comCheckedPresets(user.roles, this._table));
        if (checked) checkedNow.add(preset);
        else         checkedNow.delete(preset);
        const newRoles = this._comNewRoles(user.roles, this._table, checkedNow);

        // [3] EXECUTE: Optimistic update UI trước, ghi DB sau — rollback nếu ghi lỗi
        //   [3.a] OPTIMISTIC: Cập nhật UI ngay + đánh dấu đang lưu (disable checkbox)
        this._users  = this._users.map(u => u.id === userId ? { ...u, roles: newRoles } : u);
        this._saving = new Set([...this._saving, userId]);
        try {
            //   [3.b] SAVE_DB: Ghi roles mới vào Firestore
            const now = await this._svc.now();
            await this._svc.update(userId, { roles: newRoles, updated_at: now });
        } catch (err) {
            //   [3.c] HANDLE_ERR: Rollback UI về roles cũ + báo lỗi
            this._users = this._users.map(u => u.id === userId ? { ...u, roles: user.roles } : u);
            alert(`${this._txt.errSave}: ${err.message}`);
        } finally {
            const s = new Set(this._saving);
            s.delete(userId);
            this._saving = s;
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _svc() { return createService((this.dataTable || 'users').split('~')[0], '', this.server); }

    /**
     * Resolved table list from the `tables` prop.
     * Accepts JSON array string ('["posts","products"]') or comma-separated ("posts,products").
     * Falls back to TABLES_STD when the prop is empty.
     */
    get _tables() {
        const raw = (this.tables || '').trim();
        if (!raw) return TABLES_STD;
        if (raw.startsWith('[')) {
            try { return JSON.parse(raw); } catch {}
        }
        return raw.split(',').map(t => t.trim()).filter(Boolean);
    }

    /** True for the built-in "admin" global role — bypasses all table-level checks. */
    _comIsSuper(user) {
        return parseRoles(user).isAdmin;
    }

    /**
     * Returns the subset of ORDER_PRESETS whose full capability set is already
     * present in `rolesStr` for `table`. A preset is considered "checked" only
     * when every single capability it defines is in the roles string.
     */
    _comCheckedPresets(rolesStr, table) {
        const { roles } = parseRoles(rolesStr);
        return ORDER_PRESETS.filter(preset =>
            roleCaps(preset, table).every(c => roles.includes(c))
        );
    }

    /**
     * Rebuilds the full roles string after toggling a preset.
     * - Capabilities for all OTHER tables are left untouched (otherCaps).
     * - This table's capabilities become the union of all checked presets.
     */
    _comNewRoles(currentRolesStr, table, checkedPresets) {
        const { roles } = parseRoles(currentRolesStr);
        const otherCaps = roles.filter(r => !r.startsWith(`${table}.`));
        const tableCaps = new Set();
        for (const preset of checkedPresets) {
            for (const cap of roleCaps(preset, table)) tableCaps.add(cap);
        }
        return [...otherCaps, ...tableCaps].join('|');
    }

    /** Schema for web-table: name + username + one checkbox column per preset. */
    _comSchema() {
        return [
            {
                field: 'display_name',
                label: this._txt.colName,
                width: '220px',
                render: (_v, row) => html`
                    <div class="sr-user-name">
                        ${row.display_name || row.email || row.id}
                        ${this._comIsSuper(row) ? html`<span class="sr-badge-super">Super Admin</span>` : nothing}
                        ${this._saving.has(row.id) ? html`<span class="sr-saving-dot"></span>` : nothing}
                    </div>
                    ${row.email ? html`<div class="sr-user-email">${row.email}</div>` : nothing}
                `,
            },
            {
                field: 'username',
                label: this._txt.colUsername,
                width: '160px',
                render: (v) => v || '—',
            },
            // One column per preset — each cell is an independent checkbox
            ...ORDER_PRESETS.map(preset => ({
                field:  preset,
                label:  preset[0].toUpperCase() + preset.slice(1),
                width:  '120px',
                align:  'center',
                render: (_v, row) => html`
                    <web-checkbox
                        .checked=${this._comCheckedPresets(row.roles, this._table).includes(preset)}
                        ?disabled=${this._comIsSuper(row) || this._saving.has(row.id)}
                        ui=${this.ui || 'modern'}
                        @change=${(e) => this._dhTogglePreset(row.id, preset, e.detail.checked)}
                    ></web-checkbox>
                `,
            })),
        ];
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (!this._isAdmin) return nothing;
        return html`
            <button class="sr-fab" title=${this._txt.title} @click=${this._dhOpen}>
                <iconify-icon icon="ri:shield-user-line"></iconify-icon>
            </button>
            ${this._open ? this._rbScreen() : nothing}
        `;
    }

    _rbScreen() {
        return html`
            <div class="sr-screen${this.ui === 'spatial' ? ' sr-spatial' : ''}">
                ${this._rbHeader()}
                <div class="sr-body">
                    ${this._rbSelector()}
                    ${this._rbContent()}
                </div>
            </div>
        `;
    }

    _rbHeader() {
        return html`
            <div class="sr-header">
                <iconify-icon icon="ri:shield-keyhole-line" style="font-size:18px;opacity:.7"></iconify-icon>
                <span class="sr-title">${this._txt.title}</span>
                <span class="sr-badge-admin">Super Admin</span>
                <button class="sr-btn-close" @click=${this._dhClose}>
                    <iconify-icon icon="ri:close-line"></iconify-icon>
                </button>
            </div>
        `;
    }

    _rbSelector() {
        // Options are derived from _tables — they update automatically when the prop changes
        const options = this._tables.map(t => ({ value: t, label: t }));
        return html`
            <div class="sr-selector-row">
                <span class="sr-selector-label">${this._txt.tableLabel}</span>
                <web-select
                    style="max-width: 12rem"
                    .options=${options}
                    .value=${this._table}
                    ui=${this.ui || 'modern'}
                    lang=${this.lang}
                    height="36px"
                    ?searchable=${false}
                    @change=${this._dhTableChange}
                ></web-select>
            </div>
        `;
    }

    _rbContent() {
        if (this._loading) return html`<div class="sr-loading">${this._txt.loading}</div>`;
        if (this._error)   return html`<div class="sr-error">${this._error}</div>`;
        if (!this._users.length) return html`<div class="sr-empty">${this._txt.empty}</div>`;
        return html`
            <div class="sr-table-wrap">
                <web-table
                    .data=${this._users}
                    .schema=${this._comSchema()}
                    lang=${this.lang}
                    ui=${this.ui || 'spatial'}
                    height="auto"
                ></web-table>
            </div>
        `;
    }
}

if (!customElements.get('svc-roles')) customElements.define('svc-roles', SvcRoles);
