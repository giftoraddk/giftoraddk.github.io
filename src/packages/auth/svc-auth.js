// src/packages/auth/svc-auth.js
//
// <svc-auth> — sign-in (email-first, then password) + sign-up + Google, all via Supabase Auth.
// Successor of svc-login: standalone redirects to `pathLink`; `embedded` dispatches `login-success`
// instead (consumed by <svc-account>). `profiles` rows go through packages/auth/worker — the Worker,
// not RLS, is the trust boundary (verifies the Supabase JWT, service-role key server-side).
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-text.js'
import '@/packages/apex/web-button.js'
import requester from '@/services/core/requester.js'
import { supabase } from '@/services/shared/supabase.js'
import { auth } from './service/service.js'
import { parseRoles } from './tool/roles.js'
import styles from './css/svc-auth.css?inline'
import { txtLingo } from '@/services/tools/lingo.js'

const ACCOUNT_API = import.meta.env.PUBLIC_AUTH_URL
const PASSWORD_MIN = 6 // Supabase Auth's default minimum
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const _authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {})

const TXT_STD = {
    vi: {
        signinTitle: 'Đăng nhập vào {brand}', signinTitlePlain: 'Đăng nhập', signinSub: 'Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục',
        passwordTitle: 'Nhập mật khẩu', passwordSub: 'Nhập mật khẩu của tài khoản',
        signupTitle: 'Tạo tài khoản', signupSub: 'Chào mừng! Điền thông tin bên dưới để bắt đầu',
        verifyTitle: 'Kiểm tra email', verifySub: 'Chúng tôi đã gửi liên kết xác minh tới',
        google: 'Tiếp tục với Google', or: 'hoặc', continue: 'Tiếp tục', edit: 'Sửa',
        nameLabel: 'Họ tên', nameOptional: 'Không bắt buộc', namePh: 'Nhập họ tên',
        emailLabel: 'Địa chỉ email', emailPh: 'Nhập địa chỉ email',
        passwordLabel: 'Mật khẩu', passwordPh: 'Nhập mật khẩu',
        noAccount: 'Chưa có tài khoản?', signup: 'Đăng ký',
        hasAccount: 'Đã có tài khoản?', signin: 'Đăng nhập',
        resend: 'Gửi lại email', resent: 'Đã gửi lại — kiểm tra hộp thư', back: 'Quay lại đăng nhập',
        errRequired: 'Vui lòng nhập đầy đủ thông tin', errEmail: 'Email không hợp lệ',
        errPasswordShort: `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự`, errFailed: 'Sai email hoặc mật khẩu',
        errExists: 'Email này đã được đăng ký — vui lòng dùng email khác', signinInstead: 'Đăng nhập bằng email này', errSignup: 'Đăng ký thất bại',
        errNotActive: 'Tài khoản chưa được kích hoạt', errPermission: 'Tài khoản không có quyền truy cập khu vực này',
        errNetwork: 'Không thể kết nối máy chủ', errGoogle: 'Đăng nhập Google thất bại',
    },
    en: {
        signinTitle: 'Sign in to {brand}', signinTitlePlain: 'Sign in', signinSub: 'Welcome back! Please sign in to continue',
        passwordTitle: 'Enter your password', passwordSub: 'Enter the password associated with your account',
        signupTitle: 'Create your account', signupSub: 'Welcome! Please fill in the details to get started',
        verifyTitle: 'Check your email', verifySub: 'We sent a verification link to',
        google: 'Continue with Google', or: 'or', continue: 'Continue', edit: 'Edit',
        nameLabel: 'Full name', nameOptional: 'Optional', namePh: 'Enter your name',
        emailLabel: 'Email address', emailPh: 'Enter your email address',
        passwordLabel: 'Password', passwordPh: 'Enter your password',
        noAccount: "Don't have an account?", signup: 'Sign up',
        hasAccount: 'Already have an account?', signin: 'Sign in',
        resend: 'Resend email', resent: 'Sent again — check your inbox', back: 'Back to sign in',
        errRequired: 'Please fill in all fields', errEmail: 'Enter a valid email address',
        errPasswordShort: `Password must be at least ${PASSWORD_MIN} characters`, errFailed: 'Invalid email or password',
        errExists: 'This email is already registered — please use a different one', signinInstead: 'Sign in with this email', errSignup: 'Sign-up failed',
        errNotActive: 'Account not yet activated', errPermission: 'Account does not have access to this area',
        errNetwork: 'Cannot connect to server', errGoogle: 'Google sign-in failed',
    },
}

export class SvcAuth extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        pathLink: { type: String },
        mode: { type: String }, // 'signin' | 'signup' — view shown first
        brand: { type: String }, // "Sign in to {brand}" + wordmark next to the logo
        logo: { type: String }, // iconify name, or an image URL
        // true = cổng KHÁCH THƯỜNG (không cần isAdmin/hasAnyPerm). BẮT BUỘC false cho cổng admin thật.
        guestOk: { type: Boolean },
        hideSignup: { type: Boolean }, // admin gates: a fresh account has no permissions anyway
        embedded: { type: Boolean },
        _view: { state: true }, // 'signin' | 'password' | 'signup' | 'verify'
        _loading: { state: true }, _error: { state: true }, _notice: { state: true }, _showPass: { state: true },
        _name: { state: true }, _email: { state: true }, _password: { state: true },
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.pathLink = '/admin/'
        this.mode = 'signin'
        this.brand = ''
        this.logo = 'ri:shield-keyhole-line'
        this.guestOk = false
        this.hideSignup = false
        this.embedded = false
        this._view = null
        this._loading = false
        this._error = ''
        this._notice = ''
        this._showPass = false
        this._name = ''
        this._email = ''
        this._password = ''
        // Lowercased emails Supabase already rejected as registered — re-submitting one is blocked client-side.
        this._takenEmails = new Set()
        this._pendingFocus = null
    }

    connectedCallback() {
        super.connectedCallback()
        this._dcSession()
    }

    willUpdate(changed) {
        if (changed.has('mode') && !this._view) this._view = this.mode === 'signup' && !this.hideSignup ? 'signup' : 'signin'
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    /** Skips the form for an already-signed-in visitor, and completes a session that just landed
     *  back here from a Google or email-verification redirect (first visit → profile is created). */
    _dcSession() {
        return this._dfRun(async () => {
            const user = await auth.get()
            if (user?.status === 'active' && (this.guestOk || this._comHasAccess(user))) {
                this._afterLogin(user)
                return
            }
            const { data } = await supabase.auth.getSession()
            if (data?.session) await this._dfCompleteSession(data.session, { allowCreate: true })
        })
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    _comHasAccess(profile) {
        const { isAdmin, hasAnyPerm } = parseRoles(profile)
        return isAdmin || hasAnyPerm
    }

    get _comEmailTaken() {
        return this._takenEmails.has(this._email.trim().toLowerCase())
    }

    /** Supabase reports a duplicate two ways: an error when email confirmation is off, and an
     *  obfuscated user with no identities (no error, no session) when it is on. */
    _comIsDuplicate(data, error) {
        if (error) return error.code === 'user_already_exists' || /registered|exists/i.test(error.message)
        return Boolean(!data?.session && data?.user && !data.user.identities?.length)
    }

    _comValidEmail() {
        const email = this._email.trim()
        if (!email) return this._txt.errRequired
        return EMAIL_RE.test(email) ? '' : this._txt.errEmail
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhInput(field) {
        return (e) => { if (e.detail?.value !== undefined) this[field] = e.detail.value }
    }

    _dhEnter(action) {
        return (e) => { if (e.key === 'Enter' && !e.isComposing) action.call(this) }
    }

    _dhGo(view) {
        this._view = view
        this._error = ''
        this._notice = ''
        this._password = ''
        this._showPass = false
        if (view === 'password') this._focus('.au-password')
    }

    _dhContinueEmail() {
        const err = this._comValidEmail()
        if (err) { this._error = err; return }
        this._dhGo('password')
    }

    _focus(selector, { select = false } = {}) {
        // Inputs are disabled mid-request — _dfRun replays this once loading ends.
        if (this._loading) { this._pendingFocus = [selector, { select }]; return }
        this.updateComplete.then(() => {
            const input = this.renderRoot.querySelector(selector)?.shadowRoot?.querySelector('input')
            input?.focus()
            if (select) input?.select()
        })
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    /** Wraps one async auth call: single-flight, clears the old error, maps a throw to errNetwork. */
    async _dfRun(fn) {
        if (this._loading) return
        this._loading = true
        this._error = ''
        try {
            await fn()
        } catch (err) {
            console.error('[svc-auth]', err)
            this._error ||= this._txt.errNetwork
        } finally {
            this._loading = false
            const pending = this._pendingFocus
            this._pendingFocus = null
            if (pending) this._focus(...pending)
        }
    }

    _dfSignIn() {
        return this._dfRun(async () => {
            if (!this._password) { this._error = this._txt.errRequired; return }
            const { data, error } = await supabase.auth.signInWithPassword({ email: this._email.trim(), password: this._password })
            if (error || !data?.session) { this._error = this._txt.errFailed; return }
            await this._dfCompleteSession(data.session)
        })
    }

    _dfSignUp() {
        return this._dfRun(async () => {
            const emailErr = this._comValidEmail()
            if (emailErr) { this._error = emailErr; return }
            if (this._comEmailTaken) { this._focus('.au-email', { select: true }); return }
            if (this._password.length < PASSWORD_MIN) { this._error = this._txt.errPasswordShort; return }
            const { data, error } = await supabase.auth.signUp({
                email: this._email.trim(),
                password: this._password,
                options: { data: { full_name: this._name.trim() || undefined }, emailRedirectTo: window.location.href },
            })
            if (this._comIsDuplicate(data, error)) {
                this._takenEmails.add(this._email.trim().toLowerCase())
                this._focus('.au-email', { select: true })
                return
            }
            if (error) { this._error = this._txt.errSignup; return }
            // Email confirmation on → no session yet; the verification link lands back here (_dcSession).
            if (!data?.session) { this._dhGo('verify'); return }
            await this._dfCompleteSession(data.session, { allowCreate: true })
        })
    }

    _dfResend() {
        return this._dfRun(async () => {
            const { error } = await supabase.auth.resend({
                type: 'signup', email: this._email.trim(), options: { emailRedirectTo: window.location.href },
            })
            if (error) { this._error = this._txt.errSignup; return }
            this._notice = this._txt.resent
        })
    }

    // Full-page redirect (no popup flow in signInWithOAuth) — picked back up in _dcSession.
    _dfGoogle() {
        return this._dfRun(async () => {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
            if (error) this._error = this._txt.errGoogle
        })
    }

    /** Existing profile row only — `token` is the fresh Supabase access token the Worker requires. */
    async _dfFetchProfile(userId, token) {
        const res = await requester({ headers: _authHeaders(token) }).get(`${ACCOUNT_API}/v1/data/profiles/${userId}`)
        if (!res.ok) console.error('[svc-auth] fetchProfile failed:', res.message)
        return res.ok ? res.data : null
    }

    /** Find-or-create keyed by the Supabase user id — PATCH is upsert per the auth contract. */
    async _dfFindOrCreateProfile(supaUser, token) {
        const existing = await this._dfFetchProfile(supaUser.id, token)
        if (existing) return existing
        const meta = supaUser.user_metadata ?? {}
        const doc = {
            status: 'active', email: supaUser.email, username: null,
            display_name: meta.full_name || meta.name || supaUser.email,
            avatar: meta.avatar_url || '',
            roles: 'user', connections: '',
            meta: { provider: supaUser.app_metadata?.provider || 'email' },
        }
        const res = await requester({ headers: _authHeaders(token) }).patch(`${ACCOUNT_API}/v1/data/profiles/${supaUser.id}`, doc)
        if (!res.ok) throw new Error(res.message)
        return { id: supaUser.id, ...doc }
    }

    async _dfCompleteSession(session, { allowCreate = false } = {}) {
        const token = session.access_token
        const profile = allowCreate
            ? await this._dfFindOrCreateProfile(session.user, token)
            : await this._dfFetchProfile(session.user.id, token)

        if (!profile || profile.status !== 'active') { this._error = this._txt.errNotActive; return }
        if (!this.guestOk && !this._comHasAccess(profile)) { this._error = this._txt.errPermission; return }
        await auth.set(profile, token)
        this._afterLogin(profile)
    }

    _afterLogin(profile) {
        if (this.embedded) {
            this.dispatchEvent(new CustomEvent('login-success', { detail: { profile }, bubbles: true, composed: true }))
            return
        }
        const params = new URLSearchParams(window.location.search)
        window.location.href = params.get('redirect') || this.pathLink
    }

    // ── Render Fragments ───────────────────────────────────────────────────────

    _rfLogo() {
        if (!this.logo && !this.brand) return nothing
        const isImage = /[/.]/.test(this.logo)
        return html`
            <div class="au-brand">
                ${this.logo
                    ? isImage ? html`<img class="au-logo-img" src=${this.logo} alt="" />` : html`<iconify-icon class="au-logo" icon=${this.logo}></iconify-icon>`
                    : nothing}
                ${this.brand ? html`<span class="au-wordmark">${this.brand}</span>` : nothing}
            </div>
        `
    }

    _rfField({ label, hint, value, placeholder, field, type = 'text', cls = '', onEnter, error }) {
        const isPassword = type === 'password'
        return html`
            <div class="au-field ${error ? 'is-invalid' : ''}">
                <label class="au-label">${label}${hint ? html`<span class="au-hint">${hint}</span>` : nothing}</label>
                <div class="au-input-wrap">
                    <web-text class=${cls} ui=${this.ui} theme=${this.theme} height="38px"
                        .type=${isPassword && !this._showPass ? 'password' : 'text'} .value=${value} placeholder=${placeholder}
                        ?disabled=${this._loading} @input=${this._dhInput(field)} @keydown=${onEnter ? this._dhEnter(onEnter) : null}></web-text>
                    ${isPassword ? html`<iconify-icon class="au-eye" icon=${this._showPass ? 'ri:eye-off-line' : 'ri:eye-line'}
                        @click=${() => { this._showPass = !this._showPass }}></iconify-icon>` : nothing}
                </div>
                ${error ? html`<div class="au-field-error" role="alert">${error}</div>` : nothing}
            </div>
        `
    }

    _rfGoogle() {
        return html`
            <web-button class="au-google" type="outline" color="base-content" width="100%" height="38px" ?disabled=${this._loading} @click=${this._dfGoogle}>
                <iconify-icon icon="flat-color-icons:google"></iconify-icon>${this._txt.google}
            </web-button>
            <div class="au-divider">${this._txt.or}</div>
        `
    }

    _rfSubmit(onClick, blocked = false) {
        return html`
            <web-button type="fill" color="primary" width="100%" height="38px" suffix="ri:play-fill" iconSize="0.6rem"
                ?loading=${this._loading} ?disabled=${this._loading || blocked} @click=${onClick}>${this._txt.continue}</web-button>
        `
    }

    _rfMessages() {
        return html`
            ${this._error ? html`<div class="au-error" role="alert"><iconify-icon icon="ri:error-warning-line"></iconify-icon>${this._error}</div>` : nothing}
            ${this._notice ? html`<div class="au-notice" role="status"><iconify-icon icon="ri:check-line"></iconify-icon>${this._notice}</div>` : nothing}
        `
    }

    _rfSwitch(question, action, view) {
        return html`<div class="au-footer">${question} <button class="au-link" @click=${() => this._dhGo(view)}>${action}</button></div>`
    }

    // ── Render Body ────────────────────────────────────────────────────────────

    _rbHead(title, sub) {
        return html`
            <div class="au-head">
                ${this._rfLogo()}
                <div class="au-title">${title}</div>
                <div class="au-sub">${sub}</div>
            </div>
        `
    }

    _rbSignin() {
        const t = this._txt
        return html`
            ${this._rbHead(this.brand ? t.signinTitle.replace('{brand}', this.brand) : t.signinTitlePlain, t.signinSub)}
            <div class="au-body">
                ${this._rfGoogle()}
                ${this._rfField({ label: t.emailLabel, value: this._email, placeholder: t.emailPh, field: '_email', type: 'email', onEnter: this._dhContinueEmail })}
                ${this._rfMessages()}
                ${this._rfSubmit(this._dhContinueEmail)}
            </div>
            ${this.hideSignup ? nothing : this._rfSwitch(t.noAccount, t.signup, 'signup')}
        `
    }

    _rbPassword() {
        const t = this._txt
        return html`
            ${this._rbHead(t.passwordTitle, t.passwordSub)}
            <div class="au-body">
                <div class="au-chip">
                    <span class="au-chip-text">${this._email.trim()}</span>
                    <button class="au-chip-edit" aria-label=${t.edit} title=${t.edit} @click=${() => this._dhGo('signin')}>
                        <iconify-icon icon="ri:pencil-line"></iconify-icon>
                    </button>
                </div>
                ${this._rfField({ label: t.passwordLabel, value: this._password, placeholder: t.passwordPh, field: '_password', type: 'password', cls: 'au-password', onEnter: this._dfSignIn })}
                ${this._rfMessages()}
                ${this._rfSubmit(this._dfSignIn)}
            </div>
            ${this.hideSignup ? nothing : this._rfSwitch(t.noAccount, t.signup, 'signup')}
        `
    }

    _rbSignup() {
        const t = this._txt
        const taken = this._comEmailTaken
        // Stays until the email is changed — typing a rejected one back in brings it right back.
        const emailError = taken
            ? html`${t.errExists} <button class="au-link" @click=${() => this._dhGo('signin')}>${t.signinInstead}</button>`
            : null
        return html`
            ${this._rbHead(t.signupTitle, t.signupSub)}
            <div class="au-body">
                ${this._rfGoogle()}
                ${this._rfField({ label: t.nameLabel, hint: t.nameOptional, value: this._name, placeholder: t.namePh, field: '_name' })}
                ${this._rfField({ label: t.emailLabel, value: this._email, placeholder: t.emailPh, field: '_email', type: 'email', cls: 'au-email', error: emailError })}
                ${this._rfField({ label: t.passwordLabel, value: this._password, placeholder: t.passwordPh, field: '_password', type: 'password', onEnter: this._dfSignUp })}
                ${this._rfMessages()}
                ${this._rfSubmit(this._dfSignUp, taken)}
            </div>
            ${this._rfSwitch(t.hasAccount, t.signin, 'signin')}
        `
    }

    _rbVerify() {
        const t = this._txt
        return html`
            <div class="au-head">
                <iconify-icon class="au-verify-icon" icon="ri:mail-send-line"></iconify-icon>
                <div class="au-title">${t.verifyTitle}</div>
                <div class="au-sub">${t.verifySub} <strong>${this._email.trim()}</strong></div>
            </div>
            <div class="au-body">
                ${this._rfMessages()}
                <web-button type="outline" color="base-content" width="100%" height="38px" ?loading=${this._loading} ?disabled=${this._loading} @click=${this._dfResend}>
                    ${t.resend}
                </web-button>
            </div>
            <div class="au-footer"><button class="au-link" @click=${() => this._dhGo('signin')}>${t.back}</button></div>
        `
    }

    render() {
        const views = { signin: this._rbSignin, password: this._rbPassword, signup: this._rbSignup, verify: this._rbVerify }
        return html`<div class="au-card">${(views[this._view] ?? this._rbSignin).call(this)}</div>`
    }
}

if (!customElements.get('svc-auth')) customElements.define('svc-auth', SvcAuth)
export default SvcAuth
