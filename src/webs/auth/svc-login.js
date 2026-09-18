import { LitElement, html, nothing } from 'lit';
import 'iconify-icon';
import '../apex/web-text.js';
import css from './styles/svc-login.css?inline';
import { auth, parseRoles } from './tools/service.js';
import { injectStyles, txtLingo } from '@/services/helper.js';
import { createService } from '@/services/crud.js';
import { supabase } from '@/services/supabase.js';

const TXT_STD = {
    vi: { title: 'Đăng nhập quản trị', subtitle: 'Dành cho quản trị viên và nhân viên có quyền', emailLabel: 'Email', emailPh: 'Email', passwordLabel: 'Mật khẩu', passwordPh: '••••••••', submitting: 'Đang xác thực…', submit: 'Đăng nhập', or: 'hoặc', google: 'Đăng nhập với Google', hint: '', errRequired: 'Vui lòng nhập đầy đủ thông tin', errFailed: 'Sai email hoặc mật khẩu', errNotActive: 'Tài khoản chưa được kích hoạt — cần đổi status thành active', errPermission: 'Tài khoản không có quyền truy cập khu vực này', errNetwork: 'Không thể kết nối máy chủ', errGoogle: 'Đăng nhập Google thất bại' },
    en: { title: 'Admin Login', subtitle: 'For admins and authorized staff', emailLabel: 'Email', emailPh: 'admin@cafe.vn', passwordLabel: 'Password', passwordPh: '••••••••', submitting: 'Authenticating…', submit: 'Sign In', or: 'or', google: 'Sign in with Google', hint: '', errRequired: 'Please fill in all fields', errFailed: 'Invalid email or password', errNotActive: 'Account not yet activated — set status to active', errPermission: 'Account does not have access to this area', errNetwork: 'Cannot connect to server', errGoogle: 'Google sign-in failed' }
}

export class SvcLogin extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        pathLink:  { type: String },
        dataTable: { type: String }, // "table~nested" — Supabase `profiles` table (via Worker, server='DB_ACC')
        server:    { type: String }, // adapter đã registerAdapter — mặc định 'DB_ACC' (Worker-proxied Supabase, xem crud.js)
        // true → mount này là cổng đăng nhập KHÁCH THƯỜNG (vd /gift/login, pathLink không phải
        // khu vực admin) — chỉ cần session active là tự redirect ngay lúc mount, không cần
        // isAdmin/hasAnyPerm. Mặc định false (giữ đúng hành vi cổng admin) — BẮT BUỘC phải giữ
        // false cho pathLink dẫn vào khu vực admin thật: nếu lỡ để true, 1 session khách (không
        // quyền) ghé /admin/login sẽ tự redirect vào pathLink (vd /admin/), rồi svc-logged.js's
        // page guard lại bounce NGƯỢC về /admin/login?redirect=... → lặp vô hạn.
        guestOk:   { type: Boolean },
        txt:       { type: Object },
        lang:      { type: String },
        _loading:  { state: true },
        _error:    { state: true },
        _showPass: { state: true },
        _email:    { state: true },
        _password: { state: true },
    };

    constructor() {
        super();
        this.pathLink  = '/admin/';
        this.dataTable = 'profiles';
        this.server    = 'DB_ACC';
        this.guestOk   = false;
        this.txt       = null;
        this.lang      = 'vi';
        this._loading  = false;
        this._error    = '';
        this._showPass = false;
        this._email    = '';
        this._password = '';
    }

    connectedCallback() {
        super.connectedCallback();
        injectStyles('svc-login-styles', css);
        // If already logged in (this app's own session cache), redirect immediately — cổng khách
        // (guestOk) chỉ cần active, cổng admin (mặc định) vẫn cần isAdmin/hasAnyPerm như trước.
        auth.get().then(async user => {
            if (user?.status === 'active') {
                if (this.guestOk) { this._redirect(); return; }
                const { isAdmin, hasAnyPerm } = parseRoles(user);
                if (isAdmin || hasAnyPerm) { this._redirect(); return; }
            }
            // No app-cached session yet — check whether Supabase already has one (e.g. we just
            // landed back here after an OAuth redirect, or a Supabase session survived a hard
            // reload before auth.set() ever ran for it). allowCreate:true because this is exactly
            // the path a first-time Google sign-in completes through — without it, a brand-new
            // account's profile row never gets created and login fails with "not activated".
            const { data } = await supabase.auth.getSession();
            if (data?.session) await this._completeSession(data.session, { allowCreate: true });
        });
    }

    _redirect() {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('redirect') || this.pathLink;
        window.location.href = target;
    }

    get _svc() { return createService((this.dataTable || 'profiles').split('~')[0], '', this.server); }

    /** Existing profile row only — password login is for pre-existing admin accounts, never auto-created. */
    async _fetchProfile(userId) {
        return this._svc.findById(userId);
    }

    /** Find-or-create — same shape as before (status/email/username/display_name/avatar/roles/meta),
     *  just keyed by the Supabase auth user id instead of a freshly generated ulid, and sourced
     *  from Supabase's user object instead of Firebase's. */
    async _findOrCreateProfile(supaUser) {
        const existing = await this._svc.findById(supaUser.id);
        if (existing) return existing;
        const doc = {
            status: 'active', email: supaUser.email, username: null,
            display_name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email,
            avatar: supaUser.user_metadata?.avatar_url || '',
            roles: 'user', connections: '',
            meta: { provider: supaUser.app_metadata?.provider || 'email' },
        };
        await this._svc.set(supaUser.id, doc);
        return { id: supaUser.id, ...doc };
    }

    /** Shared by both the password-login path and the post-OAuth-redirect path in connectedCallback. */
    async _completeSession(session, { allowCreate = false } = {}) {
        const profile = allowCreate
            ? await this._findOrCreateProfile(session.user)
            : await this._fetchProfile(session.user.id);

        if (!profile || profile.status !== 'active') {
            this._error = this._txt.errNotActive;
            return;
        }
        if (!this.guestOk) {
            const { isAdmin, hasAnyPerm } = parseRoles(profile);
            if (!isAdmin && !hasAnyPerm) {
                this._error = this._txt.errPermission;
                return;
            }
        }
        await auth.set(profile, session.access_token);
        this._redirect();
    }

    async _dhSubmit(e) {
        e.preventDefault();
        if (this._loading) return;

        const input    = this._email.trim();
        const password = this._password;

        if (!input || !password) {
            this._error = this._txt.errRequired;
            return;
        }

        this._loading = true;
        this._error   = '';

        try {
            if (!input.includes('@')) {
                // Username-based login retired along with the custom Firestore-AES password
                // scheme — Supabase Auth verifies by email. Existing username-only accounts need
                // their email set (or a password reset) before they can sign in again.
                this._error = this._txt.errFailed;
                return;
            }

            const { data, error } = await supabase.auth.signInWithPassword({ email: input, password });
            if (error || !data?.session) {
                this._error = this._txt.errFailed;
                return;
            }

            await this._completeSession(data.session);
        } catch {
            this._error = this._txt.errNetwork;
        } finally {
            this._loading = false;
        }
    }

    // Google sign-in via Supabase Auth — full-page redirect (Supabase's signInWithOAuth doesn't
    // do a popup flow the way the old Firebase Auth code did; completion is picked back up in
    // connectedCallback when the browser lands back on this page with a session already set).
    async _dhGoogle() {
        if (this._loading) return;
        this._loading = true;
        this._error   = '';
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.href },
            });
            if (error) this._error = this._txt.errGoogle;
        } catch (err) {
            console.error('[svc-login] Google login failed:', err);
            this._error = this._txt.errGoogle;
        } finally {
            this._loading = false;
        }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        return html`
            <div class="lg-card">
                <div class="lg-head">
                    <iconify-icon icon="ri:shield-keyhole-line" class="lg-icon"></iconify-icon>
                    <div class="lg-title">${this._txt.title}</div>
                    <div class="lg-sub">${this._txt.subtitle}</div>
                </div>

                <form class="lg-form" @submit=${this._dhSubmit}>
                    <div class="lg-field">
                        <label class="lg-label">${this._txt.emailLabel}</label>
                        <web-text
                            placeholder="${this._txt.emailPh}"
                            height="45px"
                            ?disabled=${this._loading}
                            @input=${e => { if (e.detail?.value !== undefined) this._email = e.detail.value; }}
                        ></web-text>
                    </div>

                    <div class="lg-field">
                        <label class="lg-label">${this._txt.passwordLabel}</label>
                        <div class="lg-pass-wrap">
                            <web-text
                                .type=${this._showPass ? 'text' : 'password'}
                                placeholder="${this._txt.passwordPh}"
                                height="45px"
                                ?disabled=${this._loading}
                                @input=${e => { if (e.detail?.value !== undefined) this._password = e.detail.value; }}
                            ></web-text>
                            <iconify-icon
                                icon=${this._showPass ? 'ri:eye-off-line' : 'ri:eye-line'}
                                class="lg-eye"
                                @click=${() => { this._showPass = !this._showPass; }}>
                            </iconify-icon>
                        </div>
                    </div>

                    ${this._error ? html`
                        <div class="lg-error">
                            <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                            ${this._error}
                        </div>` : nothing}

                    <button class="lg-btn" type="submit" ?disabled=${this._loading}>
                        ${this._loading
                            ? html`<iconify-icon icon="ri:loader-4-line" style="animation:spin 0.8s linear infinite"></iconify-icon> ${this._txt.submitting}`
                            : html`<iconify-icon icon="ri:login-circle-line"></iconify-icon> ${this._txt.submit}`}
                    </button>
                </form>

                <div class="lg-divider">${this._txt.or}</div>

                <button class="lg-google" type="button" ?disabled=${this._loading} @click=${this._dhGoogle}>
                    <iconify-icon icon="flat-color-icons:google"></iconify-icon>
                    ${this._txt.google}
                </button>

                <div class="lg-hint">
                    ${this._txt.hint}
                </div>
            </div>

            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>`;
    }
}

if (!customElements.get('svc-login')) customElements.define('svc-login', SvcLogin);
