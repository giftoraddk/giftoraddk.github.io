// src/packages/auth/svc-roles.js
//
// <svc-roles> — phân quyền v2 (hook/AUTH_V2.rst): mỗi user × mỗi bảng = Level (VIEW / EDIT / REVIEW / PUBLISH /
// MANAGE) + Scope (own / all). Level là preset cũ gọn lại: Editor = EDIT, Moderator = REVIEW + PUBLISH, Admin = MANAGE.
// Token cũ (posts.read|posts.update…) vẫn đọc được — tool/roles.js's tableAccess() gom về Level; lần ghi đầu tiên
// viết lại bảng đó theo token v2 (posts.EDIT~own), phần capability lẻ không khớp Level nào được giữ nguyên.
//
// Mobile first, Shadow DOM — mọi breakpoint là container query trên chính component (nó nằm trong panel svc-node
// hẹp lẫn màn full của /admin). Chỉ Super Admin: auth (profiles.ts) chỉ cho admin ghi `roles`.
//
//   <svc-roles lang="vi">                           panel — node `roles` của group System (services/presets/node/system.js), /admin/roles
//   <svc-roles fab tables='["posts","products"]'>   nút nổi + màn full
//     tables    — JSON array hoặc chuỗi phân tách dấu phẩy (mặc định ROLE_TABLES)
//     dataTable — bảng user (mặc định 'profiles'), server mặc định 'DB_ACC' (auth)

import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import css from './css/svc-roles.css?inline';
import { auth } from './service/service.js';
import { parseRoles, tableAccess, withTableAccess, LEVEL_ORDER, SCOPES, ROLE_TABLES, TABLE_BUNDLES, ACCESS_TXT } from './tool/roles.js';
import { createService } from '@/services/core/crud.js';
import { txtLingo } from '@/services/tools/lingo.js';

const TXT_STD = {
    vi: {
        title: 'Phân quyền', users: 'người dùng', search: 'Tìm tên, email, username…',
        reload: 'Tải lại', close: 'Đóng', retry: 'Thử lại',
        loading: 'Đang tải…', empty: 'Không có người dùng', noMatch: 'Không tìm thấy người dùng phù hợp',
        errLoad: 'Không thể tải danh sách', errSave: 'Lỗi lưu quyền', noPerm: 'Chỉ Super Admin được phân quyền',
        scope: 'Phạm vi', superNote: 'Toàn quyền hệ thống — không cần cấp theo bảng',
        clearCustom: 'Xoá quyền lẻ', bundle: 'Áp luôn cho', legacy: 'Bảng cũ — không còn trong menu, chỉ nên gỡ quyền',
        legend: 'Các mức quyền',
        ...ACCESS_TXT.vi,
        levelHints: {
            VIEW: 'Xem danh sách và chi tiết',
            EDIT: 'Tạo, sửa, lưu nháp, gửi duyệt, upload media, xem lịch sử',
            REVIEW: 'Bình luận, duyệt, từ chối, yêu cầu sửa, khôi phục phiên bản',
            PUBLISH: 'Xuất bản, gỡ xuống, lên lịch',
            MANAGE: 'Tất cả mức trên + xoá, nhập / xuất CSV, đổi trạng thái',
        },
    },
    en: {
        title: 'Permissions', users: 'users', search: 'Search name, email, username…',
        reload: 'Reload', close: 'Close', retry: 'Retry',
        loading: 'Loading…', empty: 'No users found', noMatch: 'No matching user',
        errLoad: 'Failed to load users', errSave: 'Failed to save roles', noPerm: 'Only a Super Admin can manage permissions',
        scope: 'Scope', superNote: 'Full system access — no per-table grants needed',
        clearCustom: 'Clear custom capabilities', bundle: 'Also applies to', legacy: 'Legacy table — no longer in the menu, only worth revoking',
        legend: 'Access levels',
        ...ACCESS_TXT.en,
        levelHints: {
            VIEW: 'See the list and details',
            EDIT: 'Create, update, save drafts, submit for review, upload media, see history',
            REVIEW: 'Comment, approve, reject, request edits, restore versions',
            PUBLISH: 'Publish, unpublish, schedule',
            MANAGE: 'Everything above + delete, CSV import / export, change status',
        },
    },
};

export class SvcRoles extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        lang:      { type: String },
        txt:       { type: Object },
        ui:        { type: String },
        theme:     { type: String },
        dataTable: { type: String },
        server:    { type: String },
        tables:    { type: String },
        fab:       { type: Boolean, reflect: true }, // nút nổi + màn full thay vì panel
        _open:     { state: true },
        _table:    { state: true },
        _users:    { state: true },
        _query:    { state: true },
        _loading:  { state: true },
        _error:    { state: true },
        _notice:   { state: true }, // lỗi ghi — hiện trên danh sách, không thay danh sách
        _saving:   { state: true }, // Set<userId> đang ghi
        _isAdmin:  { state: true }, // null = đang kiểm tra
    };

    constructor() {
        super();
        this.lang      = 'vi';
        this.txt       = null;
        this.ui        = '';
        this.theme     = '';
        this.dataTable = 'profiles';
        this.server    = 'DB_ACC';
        this.tables    = '';
        this.fab       = false;
        this._open     = false;
        this._table    = '';
        this._users    = [];
        this._query    = '';
        this._loading  = false;
        this._error    = '';
        this._notice   = '';
        this._saving   = new Set();
        this._isAdmin  = null;
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    async connectedCallback() {
        super.connectedCallback();
        this._isAdmin = await auth.isAdmin();
        if (this._isAdmin && !this.fab) this._dcLoad();
    }

    willUpdate(changed) {
        // Cũng chạy khi gỡ hết quyền của 1 bảng cũ đang chọn — tab của nó biến mất
        if (changed.has('tables') || changed.has('_users') || !this._table) {
            if (!this._allTables.includes(this._table)) this._table = this._tables[0] ?? '';
        }
    }

    // ==========================================
    // DATA CORE FUNCTIONS
    // ==========================================

    async _dcLoad() {
        this._loading = true;
        this._error   = '';
        try {
            const rows  = await this._svc.findAll();
            this._users = rows.sort((a, b) => this._comName(a).localeCompare(this._comName(b)));
        } catch (err) {
            this._error = `${this._txt.errLoad}: ${err.message}`;
        } finally {
            this._loading = false;
        }
    }

    // ==========================================
    // DATA HEAD FUNCTIONS
    // ==========================================

    _dhOpen() {
        this._open = true;
        if (!this._users.length && !this._loading) this._dcLoad();
    }

    _dhClose() { this._open = false; }

    // Màn > 768px: lăn chuột dọc → cuộn ngang dải tab. Hết đường cuộn thì để trang cuộn tiếp.
    _dhTabsWheel(e) {
        if (!matchMedia('(min-width: 769px)').matches) return;
        const el = e.currentTarget;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const max = el.scrollWidth - el.clientWidth;
        if (!delta || max <= 0) return;
        if ((delta < 0 && el.scrollLeft <= 0) || (delta > 0 && el.scrollLeft >= max - 1)) return;
        e.preventDefault();
        el.scrollLeft += e.deltaMode === 1 ? delta * 16 : delta;
    }

    _dhLevel(user, level) {
        const a = tableAccess(user.roles, this._table);
        const levels = new Set(a.levels);
        if (levels.has(level)) levels.delete(level);
        else levels.add(level);
        this._dhSave(user, { ...a, levels });
    }

    _dhScope(user, scope) {
        const a = tableAccess(user.roles, this._table);
        if (a.scope !== scope) this._dhSave(user, { ...a, scope });
    }

    _dhClearCustom(user) {
        this._dhSave(user, { ...tableAccess(user.roles, this._table), custom: [] });
    }

    /**
     * Flow ghi quyền 1 bảng: (user, access mới) -> roles string mới ghi DB
     */
    async _dhSave(user, access) {
        // [1] CHECK: Bỏ qua Super Admin (không sửa được) hoặc user đang ghi dở
        if (this._comIsSuper(user) || this._saving.has(user.id)) return;

        // [2] PROCESS: Build lại token của bảng đang chọn + các bảng bundle kèm (TABLE_BUNDLES)
        const prev  = user.roles;
        const roles = withTableAccess(prev, this._table, access) || 'user';
        if (roles === prev) return;

        // [3] EXECUTE: Optimistic update UI trước, ghi DB sau — rollback nếu lỗi
        this._notice = '';
        this._comPatch(user.id, roles);
        this._saving = new Set([...this._saving, user.id]);
        try {
            await this._svc.update(user.id, { roles, updated_at: await this._svc.now() });
        } catch (err) {
            this._comPatch(user.id, prev);
            this._notice = `${this._txt.errSave}: ${err.message}`;
        } finally {
            const s = new Set(this._saving);
            s.delete(user.id);
            this._saving = s;
        }
    }

    // ==========================================
    // COMPUTED FUNCTIONS
    // ==========================================

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _svc() { return createService((this.dataTable || 'profiles').split('~')[0], '', this.server); }

    get _tables() {
        const raw = (this.tables || '').trim();
        if (!raw) return ROLE_TABLES;
        if (raw.startsWith('[')) {
            try { return JSON.parse(raw); } catch {}
        }
        return raw.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Bảng cũ còn token trong dữ liệu nhưng không có trong `tables` (vd `mind.*`) — thêm tab cuối để gỡ được.
    // Bỏ qua bảng bundle (talks/know/rel…): chúng đi theo bảng chính, không chỉnh riêng.
    get _legacyTables() {
        const listed  = new Set(this._tables);
        const bundled = new Set(Object.values(TABLE_BUNDLES).flat());
        const found   = this._users.flatMap(u => parseRoles(u).roles.filter(r => r.includes('.')).map(r => r.slice(0, r.indexOf('.'))));
        return [...new Set(found)].filter(t => !listed.has(t) && !bundled.has(t)).sort();
    }

    get _allTables() { return [...this._tables, ...this._legacyTables]; }

    get _filtered() {
        const q = this._query.trim().toLowerCase();
        if (!q) return this._users;
        return this._users.filter(u => [u.display_name, u.email, u.username].some(v => (v || '').toLowerCase().includes(q)));
    }

    _comIsSuper(user) { return parseRoles(user).isAdmin; }
    _comName(user)    { return user.display_name || user.email || user.id || ''; }

    _comPatch(userId, roles) {
        this._users = this._users.map(u => u.id === userId ? { ...u, roles } : u);
    }

    // Số user (trừ Super Admin) có quyền trên từng bảng — hiện trên tab
    _comCounts() {
        const counts = Object.fromEntries(this._allTables.map(t => [t, 0]));
        for (const u of this._users) {
            if (this._comIsSuper(u)) continue;
            const { roles } = parseRoles(u);
            for (const t of this._allTables) if (roles.some(r => r.startsWith(`${t}.`))) counts[t]++;
        }
        return counts;
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    render() {
        if (this.fab) {
            if (!this._isAdmin) return nothing;
            return html`
                <button type="button" class="sr-fab" title=${this._txt.title} aria-label=${this._txt.title} @click=${this._dhOpen}>
                    <iconify-icon icon="ri:shield-user-line"></iconify-icon>
                </button>
                ${this._open ? html`
                    <div class="sr-screen" role="dialog" aria-modal="true" aria-label=${this._txt.title}
                        @keydown=${(e) => { if (e.key === 'Escape') this._dhClose(); }}>${this._rbPanel()}</div>` : nothing}
            `;
        }
        if (this._isAdmin === null) return this._rbState('ri:loader-4-line', this._txt.loading, true);
        if (!this._isAdmin) return this._rbState('ri:lock-line', this._txt.noPerm);
        return this._rbPanel();
    }

    _rbPanel() {
        return html`
            <div class="sr">
                ${this._rbHead()}
                <div class="sr-bar">
                    ${this._rbTabs()}
                    ${this._rbSearch()}
                </div>
                ${this._rbLegend()}
                ${this._notice ? html`
                    <div class="sr-notice" role="alert">
                        <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                        <span>${this._notice}</span>
                        <button type="button" class="sr-icon-btn" aria-label=${this._txt.close} @click=${() => { this._notice = ''; }}>
                            <iconify-icon icon="ri:close-line"></iconify-icon>
                        </button>
                    </div>` : nothing}
                ${this._rbBody()}
            </div>
        `;
    }

    _rbHead() {
        const t = this._txt;
        return html`
            <div class="sr-head">
                <span class="sr-head-icon"><iconify-icon icon="ri:shield-keyhole-line"></iconify-icon></span>
                <div class="sr-head-title">
                    <span class="sr-h1">${t.title}</span>
                    <span class="sr-muted">${this._loading
                        ? html`<iconify-icon class="sr-spin" icon="ri:loader-4-line"></iconify-icon>`
                        : `${this._users.length} ${t.users}`}</span>
                </div>
                <button type="button" class="sr-icon-btn" title=${t.reload} aria-label=${t.reload} ?disabled=${this._loading} @click=${() => this._dcLoad()}>
                    <iconify-icon icon="ri:refresh-line"></iconify-icon>
                </button>
                ${this.fab ? html`
                    <button type="button" class="sr-icon-btn" title=${t.close} aria-label=${t.close} @click=${this._dhClose}>
                        <iconify-icon icon="ri:close-line"></iconify-icon>
                    </button>` : nothing}
            </div>
        `;
    }

    _rbTabs() {
        const counts = this._comCounts();
        const legacy = new Set(this._legacyTables);
        return html`
            <div class="sr-tabs" role="tablist" @wheel=${this._dhTabsWheel}>
                ${this._allTables.map(t => html`
                    <button type="button" role="tab" class="sr-tab${legacy.has(t) ? ' is-legacy' : ''}" aria-selected=${t === this._table ? 'true' : 'false'}
                        title=${legacy.has(t) ? this._txt.legacy : t} @click=${() => { this._table = t; }}>
                        <span>${t}</span>
                        ${counts[t] ? html`<span class="sr-tab-count">${counts[t]}</span>` : nothing}
                    </button>`)}
            </div>
        `;
    }

    _rbSearch() {
        return html`
            <label class="sr-search">
                <iconify-icon icon="ri:search-line"></iconify-icon>
                <input type="search" .value=${this._query} placeholder=${this._txt.search} aria-label=${this._txt.search}
                    @input=${(e) => { this._query = e.target.value; }}>
            </label>
        `;
    }

    _rbLegend() {
        const t = this._txt;
        const bundle = TABLE_BUNDLES[this._table];
        const legacy = this._legacyTables.includes(this._table);
        return html`
            <details class="sr-legend">
                <summary><iconify-icon icon="ri:information-line"></iconify-icon>${t.legend}</summary>
                <dl>
                    ${LEVEL_ORDER.map(l => html`<dt>${t.levels[l]}</dt><dd>${t.levelHints[l]}</dd>`)}
                </dl>
            </details>
            ${bundle ? html`<p class="sr-bundle">${t.bundle}: ${bundle.join(', ')}</p>` : nothing}
            ${legacy ? html`<p class="sr-bundle is-legacy">${t.legacy}</p>` : nothing}
        `;
    }

    _rbBody() {
        const t = this._txt;
        if (this._loading && !this._users.length) return this._rbState('ri:loader-4-line', t.loading, true);
        if (this._error) return html`
            <div class="sr-state is-error">
                <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                <span>${this._error}</span>
                <button type="button" class="sr-retry" @click=${() => this._dcLoad()}>${t.retry}</button>
            </div>`;
        if (!this._users.length) return this._rbState('ri:user-line', t.empty);
        const users = this._filtered;
        if (!users.length) return this._rbState('ri:search-line', t.noMatch);
        return html`<div class="sr-list">${users.map(u => this._rbCard(u))}</div>`;
    }

    _rbState(icon, text, spin = false) {
        return html`
            <div class="sr-state">
                <iconify-icon class=${spin ? 'sr-spin' : ''} icon=${icon}></iconify-icon>
                <span>${text}</span>
            </div>
        `;
    }

    _rbCard(user) {
        const isSuper = this._comIsSuper(user);
        const saving  = this._saving.has(user.id);
        const name    = this._comName(user);
        const sub     = [user.email !== name ? user.email : '', user.username ? `@${user.username}` : ''].filter(Boolean).join(' · ');
        return html`
            <article class="sr-card${isSuper ? ' is-super' : ''}" aria-busy=${saving ? 'true' : 'false'}>
                <header class="sr-card-head">
                    <span class="sr-avatar">${user.avatar
                        ? html`<img src=${user.avatar} alt="" loading="lazy" referrerpolicy="no-referrer">`
                        : name.slice(0, 1).toUpperCase()}</span>
                    <div class="sr-who">
                        <span class="sr-name">${name}</span>
                        ${sub ? html`<span class="sr-sub">${sub}</span>` : nothing}
                    </div>
                    ${isSuper ? html`<span class="sr-badge">Super Admin</span>` : nothing}
                    ${saving ? html`<iconify-icon class="sr-spin sr-saving" icon="ri:loader-4-line"></iconify-icon>` : nothing}
                </header>
                ${isSuper ? html`<p class="sr-note">${this._txt.superNote}</p>` : this._rbAccess(user, saving)}
            </article>
        `;
    }

    _rbAccess(user, saving) {
        const t = this._txt;
        const { levels, scope, custom } = tableAccess(user.roles, this._table);
        const any    = levels.size > 0;
        const manage = levels.has('MANAGE');
        const others = [...levels].some(l => l !== 'VIEW');
        return html`
            <div class="sr-levels" role="group" aria-label=${t.legend}>
                ${LEVEL_ORDER.map(l => {
                    // Mức bị bao bởi mức khác (MANAGE bao tất cả, mọi mức bao VIEW) — hiện sáng nhưng không bấm riêng được
                    const inh = l !== 'MANAGE' && (manage || (l === 'VIEW' && others));
                    const on  = levels.has(l) && !inh;
                    return html`
                        <button type="button" class="sr-level${on ? ' is-on' : ''}${inh ? ' is-implied' : ''}"
                            aria-pressed=${on || inh ? 'true' : 'false'} title=${t.levelHints[l]}
                            ?disabled=${saving || inh} @click=${() => this._dhLevel(user, l)}>
                            ${on || inh ? html`<iconify-icon icon="ri:check-line"></iconify-icon>` : nothing}${t.levels[l]}
                        </button>`;
                })}
            </div>
            <div class="sr-foot">
                <span class="sr-label">${t.scope}</span>
                <div class="sr-seg" role="radiogroup" aria-label=${t.scope}>
                    ${SCOPES.map(s => html`
                        <button type="button" role="radio" class="sr-seg-btn" aria-checked=${any && scope === s ? 'true' : 'false'}
                            ?disabled=${saving || !any} @click=${() => this._dhScope(user, s)}>${t.scopes[s]}</button>`)}
                </div>
                ${custom.length ? html`
                    <span class="sr-custom" title=${custom.join(', ')}>
                        +${custom.length} ${t.custom}
                        <button type="button" class="sr-custom-x" title=${t.clearCustom} aria-label=${t.clearCustom}
                            ?disabled=${saving} @click=${() => this._dhClearCustom(user)}>
                            <iconify-icon icon="ri:close-line"></iconify-icon>
                        </button>
                    </span>` : nothing}
            </div>
        `;
    }
}

if (!customElements.get('svc-roles')) customElements.define('svc-roles', SvcRoles);
