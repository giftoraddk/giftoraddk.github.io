// src/webs/bay/svc-bay-login.js
// UI đăng nhập (email/password + Google) — viết mới, KHÔNG import svc-channel-login.js.
// Dùng chung bảng `users` với mọi domain khác (server 'DB_ACC' — nay là Supabase Postgres `profiles`
// qua Cloudflare Worker, xem hook/cloudflare-worker.md) vì đây là infra chung, không phải dữ liệu
// riêng của channel.
import { LitElement, html, unsafeCSS, nothing } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import styles from './styles/svc-bay-login.css?inline'
import { createService } from '@/services/crud.js'
import { txtLingo, emit } from '@/services/helper.js'
import { auth } from './tools/service.js'
import { supabase } from '@/services/supabase.js'

const TXT_STD = {
    vi: {
        title: 'Đăng nhập', sub: 'Cần tài khoản thật để tạo/tham gia kênh',
        emailPh: 'Email', passPh: 'Mật khẩu', submit: 'Đăng nhập', submitting: 'Đang xác thực…',
        or: 'hoặc', google: 'Đăng nhập với Google',
        errRequired: 'Vui lòng nhập đầy đủ thông tin',
        errFailed: 'Sai email hoặc mật khẩu, hoặc tài khoản chưa tồn tại',
        errNotActive: 'Tài khoản chưa được kích hoạt',
        errGoogle: 'Đăng nhập Google thất bại',
    },
    en: {
        title: 'Sign in', sub: 'A real account is required to create/join a channel',
        emailPh: 'Email', passPh: 'Password', submit: 'Sign in', submitting: 'Verifying…',
        or: 'or', google: 'Sign in with Google',
        errRequired: 'Please fill in all fields',
        errFailed: 'Wrong email or password, or the account does not exist',
        errNotActive: 'This account has not been activated',
        errGoogle: 'Google sign-in failed',
    },
}

export class SvcBayLogin extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        lang:      { type: String },
        txt:       { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        _email:    { state: true },
        _password: { state: true },
        _loading:  { state: true },
        _error:    { state: true },
        _checking: { state: true },
    }

    constructor() {
        super()
        this.lang      = 'vi'
        this.txt       = null
        this._email    = ''
        this._password = ''
        this._loading  = false
        this._error    = ''
        this._checking = true // đang dò phiên đăng nhập sẵn có — che form bằng layer loading tới khi biết chắc
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _svc() { return createService('profiles', '', 'DB_ACC') }

    /**
     * Flow dò phiên đăng nhập sẵn có: (none) -> bay-logged-in event nếu có, ngược lại hiện form.
     * Cũng dò luôn phiên Supabase (vd vừa quay lại sau redirect OAuth Google) nếu app-cache chưa
     * có — xem _completeSession().
     */
    async connectedCallback() {
        super.connectedCallback()
        const user = await auth.get()
        if (user) { this._emitLoggedIn(user); return }

        const { data } = await supabase.auth.getSession()
        if (data?.session) {
            await this._completeSession(data.session)
            if (!this._error) return
        }
        this._checking = false
    }

    _emitLoggedIn(user) { emit(this, 'bay-logged-in', { user }) }

    /** Find-or-create profile row, keyed by the Supabase auth user id, then save session + emit. */
    async _completeSession(session) {
        const existing = await this._svc.findById(session.user.id)
        const user = existing ?? await (async () => {
            const doc = {
                status: 'active', email: session.user.email, username: null, password: null,
                display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
                avatar: session.user.user_metadata?.avatar_url || '',
                roles: 'user', connections: '',
                meta: { provider: session.user.app_metadata?.provider || 'email' },
            }
            await this._svc.set(session.user.id, doc)
            return { id: session.user.id, ...doc }
        })()

        if (user.status !== 'active') { this._error = this._txt.errNotActive; return }
        await auth.set(user, session.access_token)
        this._emitLoggedIn(user)
    }

    /**
     * Flow đăng nhập email/password: {email, password} -> bay-logged-in event (hoặc lỗi hiển thị)
     */
    async _dhSubmit(e) {
        e.preventDefault()
        if (this._loading) return
        const email = this._email.trim()
        const password = this._password
        if (!email || !password) { this._error = this._txt.errRequired; return }

        this._loading = true
        this._error = ''
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error || !data?.session) { this._error = this._txt.errFailed; return }
            await this._completeSession(data.session)
        } catch {
            this._error = this._txt.errFailed
        } finally {
            this._loading = false
        }
    }

    /**
     * Flow đăng nhập Google: (none) -> redirect sang Google (Supabase Auth) -> quay lại trang này,
     * connectedCallback() phát hiện session và hoàn tất (không còn là popup như trước — Supabase's
     * signInWithOAuth điều hướng cả trang, xem hook/cloudflare-worker.md §7-9).
     */
    async _dhGoogle() {
        if (this._loading) return
        this._loading = true
        this._error = ''
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.href },
            })
            if (error) this._error = this._txt.errGoogle
        } catch (err) {
            console.error('[svc-bay-login] Google login failed:', err)
            this._error = this._txt.errGoogle
        } finally {
            this._loading = false
        }
    }

    render() {
        if (this._checking) {
            return html`
                <div class="byl-wrap byl-loading">
                    <iconify-icon icon="ri:loader-4-line" class="byl-spinner"></iconify-icon>
                </div>
            `
        }
        return html`
            <div class="byl-wrap">
                <p class="byl-title">${this._txt.title}</p>
                <p class="byl-sub">${this._txt.sub}</p>

                <form class="byl-field" @submit=${this._dhSubmit} style="gap:.75rem">
                    <div class="byl-field">
                        <span class="byl-label">Email</span>
                        <web-text placeholder=${this._txt.emailPh} height="40px" ?disabled=${this._loading}
                            @input=${e => { this._email = e.detail.value }}></web-text>
                    </div>
                    <div class="byl-field">
                        <span class="byl-label">${this._txt.passPh}</span>
                        <web-text type="password" placeholder=${this._txt.passPh} height="40px" ?disabled=${this._loading}
                            @input=${e => { this._password = e.detail.value }}
                            @keydown=${e => { if (e.key === 'Enter' && !e.isComposing) this._dhSubmit(e) }}></web-text>
                    </div>

                    ${this._error ? html`
                        <div class="byl-error">
                            <iconify-icon icon="ri:error-warning-line"></iconify-icon>${this._error}
                        </div>` : nothing}

                    <web-button type="fill" color="primary" height="45px" width="100%" ?loading=${this._loading} @clicked=${this._dhSubmit}>
                        ${this._loading ? this._txt.submitting : this._txt.submit}
                    </web-button>
                </form>

                <div class="byl-divider">${this._txt.or}</div>

                <button class="byl-google" ?disabled=${this._loading} @click=${this._dhGoogle}>
                    <iconify-icon icon="flat-color-icons:google"></iconify-icon>
                    ${this._txt.google}
                </button>
            </div>
        `
    }
}

if (!customElements.get('svc-bay-login')) customElements.define('svc-bay-login', SvcBayLogin)
