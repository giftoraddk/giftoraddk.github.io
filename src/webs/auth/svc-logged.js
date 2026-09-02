import { LitElement, html, nothing } from 'lit';
import 'iconify-icon';
import { auth, parseRoles, hasAccess } from '@/webs/auth/tools/service.js';
import { txtLingo } from '@/services/helper.js';

function _buildRoutes(items) {
    const pageRequire = {};
    for (const item of items) {
        const path = item.href.replace(/\/$/, '') || '/admin';
        pageRequire[path] = item.require;
    }
    return { pageRequire, navOrder: items };
}

const TXT_STD = {
    vi: { logout: 'Đăng xuất' },
    en: { logout: 'Logout' }
}

export class SvcLogged extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        _user:    { state: true },
        txt:      { type: Object },
        lang:     { type: String },
        pathLink: { type: String },
        menus:    { type: String },
    };

    constructor() {
        super();
        this._user         = null;
        this._onBeforeSwap = this._dcHideIfNeeded.bind(this);
        this._onPageLoad   = this._dcInit.bind(this);
        this.txt           = null;
        this.lang          = 'vi';
        this.pathLink      = '/admin/';
        this.menus         = '';
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('astro:before-swap', this._onBeforeSwap);
        document.addEventListener('astro:page-load',   this._onPageLoad);
        this._dcInit();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('astro:before-swap', this._onBeforeSwap);
        document.removeEventListener('astro:page-load',   this._onPageLoad);
    }

    // ==========================================
    // DATA CORE FUNCTIONS
    // ==========================================

    // _dcHideIfNeeded — hide before view-transition swap if incoming page requires admin
    _dcHideIfNeeded(e) {
        if (e.newDocument.head.querySelector('meta[name="page-admin-only"]')) {
            document.documentElement.style.visibility = 'hidden';
        }
    }

    /**
     * Flow guard trang admin-only: current page meta -> redirect nếu thiếu quyền, hoặc hiện trang
     */
    async _dcInit() {
        // [1] CHECK: Trang hiện tại có cần quyền admin/permission không — không thì khỏi làm gì thêm
        const requiresAdmin = !!document.head.querySelector('meta[name="page-admin-only"]');
        const user          = await auth.get();
        this._user          = user;
        if (!requiresAdmin) return;

        // [2] PROCESS: Parse roles + xác định có đủ quyền cơ bản để vào khu vực admin không
        const { roles, isAdmin, hasAnyPerm } = parseRoles(user);
        const ok = user?.status === 'active' && (isAdmin || hasAnyPerm);

        // [3] EXECUTE: Redirect nếu thiếu quyền
        //   [3.a] NO_BASIC_PERM: Chưa login hoặc không có quyền nào — về login kèm redirect
        if (!ok) {
            location.replace(this.pathLink + 'login?redirect=' + encodeURIComponent(location.pathname));
            return;
        }
        //   [3.b] PAGE_FORBIDDEN: Có quyền cơ bản nhưng không phải admin — check riêng trang hiện tại
        if (!isAdmin) {
            const { pageRequire, navOrder } = _buildRoutes(this.menus ? JSON.parse(this.menus) : []);
            const currentPath = location.pathname.replace(/\/$/, '') || '/admin';
            const required     = pageRequire[currentPath];
            if (!hasAccess(roles, required)) {
                const first = navOrder.find(({ require: req }) => hasAccess(roles, req));
                location.replace(first ? first.href : this.pathLink + 'login');
                return;
            }
        }

        // [4] RETURN: Đủ quyền — hiện lại trang (đã ẩn sẵn qua _dcHideIfNeeded trước view-transition)
        document.documentElement.style.visibility = '';
    }

    // ==========================================
    // DATA FOOTER FUNCTIONS
    // ==========================================

    async _dfLogout() {
        await auth.clear();
        location.href = this.pathLink + 'login';
    }

    // ==========================================
    // COMPUTED FUNCTIONS
    // ==========================================

    get _comIsAdmin() {
        return !!(this._user?.status === 'active' && parseRoles(this._user).isAdmin);
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        const u = this._user;
        if (!u || u.status !== 'active') return nothing;

        return html`
            <div style="display:flex;position:fixed;top:0.6rem;right:1rem;z-index:200;background:rgba(0,0,0,0.55);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:0.25rem;align-items:center;gap:0.5rem;font-size:0.78rem;color:white;">
                <iconify-icon icon="ri:shield-user-line" style="opacity:0.7;font-size:1rem"></iconify-icon>
                <span style="max-width:7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.display_name || u.email}</span>
                ${this._comIsAdmin ? html`
                    <span style="font-size:0.65rem;background:color-mix(in oklab,var(--color-primary) 25%,transparent);color:var(--color-primary);border-radius:999px;padding:1px 6px;flex-shrink:0">admin</span>
                ` : nothing}
                <button
                    @click=${this._dfLogout}
                    style="background:rgba(255,255,255,0.12);border:none;border-radius:999px;padding:2px 8px;cursor:pointer;color:white;font-size:0.72rem;flex-shrink:0;margin-left:2px"
                >${this._txt.logout}</button>
            </div>
        `;
    }
}

if (!customElements.get('svc-logged')) customElements.define('svc-logged', SvcLogged);
