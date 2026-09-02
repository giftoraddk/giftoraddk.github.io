// src/webs/bay/svc-bay-login.js
// UI đăng nhập (email/password + Google popup) — viết mới, KHÔNG import svc-channel-login.js.
// Dùng chung bảng `users` với mọi domain khác (server 'auth' — project Firebase riêng cho
// đăng nhập, xem docs/CRUD.rst § Nhiều kết nối Firestore) vì đây là infra chung, không phải
// dữ liệu riêng của channel.
import { LitElement, html, unsafeCSS, nothing } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import styles from './styles/svc-bay-login.css?inline'
import { createService } from '@/services/crud.js'
import { ulid, apexDecode, txtLingo, emit } from '@/services/helper.js'
import { auth } from './tools/service.js'

// Preload sớm — Safari (và Safari-engine trên iOS) chỉ cho phép signInWithPopup() mở popup thật
// nếu nó chạy gần như ngay trong lúc xử lý sự kiện click gốc; 1 `await import(...)` THẬT (chờ
// tải chunk qua mạng) xen giữa lệnh gọi `signInWithPopup` là đủ để WebKit coi popup đó không còn
// gắn với thao tác người dùng nữa và tự chặn — im lặng, không throw, không lỗi gì cả (đúng hiện
// tượng "popup blocked" đang gặp). Gọi trước ở đây (connectedCallback, xem bên dưới) để lúc
// _dhGoogle() thật sự chạy, import() đã nằm sẵn trong cache — chỉ còn resolve qua microtask,
// Safari vẫn tính đó là "vừa mới người dùng bấm".
let _firebaseAuthModules = null
function _preloadFirebaseAuth() {
    _firebaseAuthModules ??= Promise.all([
        import('firebase/auth'),
        import('@/services/firestore.js'),
    ])
    return _firebaseAuthModules
}

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

    /**
     * Flow dò phiên đăng nhập sẵn có: (none) -> bay-logged-in event nếu có, ngược lại hiện form
     */
    async connectedCallback() {
        super.connectedCallback()
        _preloadFirebaseAuth() // fire-and-forget — nạp trước cho lúc bấm nút Google, xem comment đầu file
        // [1] CHECK: dò session đã lưu (auth.set() ở lượt trước) — ngầm trong lúc layer loading
        // còn che, tránh loé form ra rồi tắt ngay
        const user = await auth.get()
        // [3] EXECUTE: có sẵn phiên hợp lệ thì bắn thẳng bay-logged-in cho svc-bay.js
        if (user) { this._emitLoggedIn(user); return }
        // [4] RETURN: chưa có session thì tắt cờ checking, cho form hiện ra
        this._checking = false
    }

    _emitLoggedIn(user) { emit(this, 'bay-logged-in', { user }) }

    /**
     * Flow đăng nhập email/password: {email, password} -> bay-logged-in event (hoặc lỗi hiển thị)
     */
    async _dhSubmit(e) {
        e.preventDefault()
        // [1] CHECK: chặn double-submit khi đang xử lý
        if (this._loading) return
        const email = this._email.trim()
        const password = this._password
        //   [1.a] IF_INVALID: bắt buộc nhập đủ email + password
        if (!email || !password) { this._error = this._txt.errRequired; return }

        this._loading = true
        this._error = ''
        try {
            const svc  = createService('users', '', 'auth')
            const user = (await svc.findAll({ filters: { email } }))[0]
            //   [1.b] IF_NOT_FOUND: không tìm thấy user, hoặc user tồn tại nhưng không có password
            // (tài khoản chỉ đăng ký qua Google, chưa có mật khẩu local)
            if (!user || !user.password) { this._error = this._txt.errFailed; return }
            //   [1.c] IF_NOT_ACTIVE: tài khoản chưa được kích hoạt
            if (user.status !== 'active') { this._error = this._txt.errNotActive; return }

            // [2] PROCESS: xác thực mật khẩu — apexDecode là mã hoá hiện hành, fallback so sánh
            // chuỗi thô để tương thích ngược với user cũ tạo trước khi đổi sang apexDecode
            let verified = false
            try { verified = (await apexDecode(user.password)) === password }
            catch { verified = user.password === password }
            //   [2.a] IF_MISMATCH: sai mật khẩu thì báo lỗi, dừng flow
            if (!verified) { this._error = this._txt.errFailed; return }

            // [3] EXECUTE: lưu session (localStorage) + báo cho svc-bay.js đã đăng nhập thành công
            await auth.set(user, '')
            this._emitLoggedIn(user)
        } catch {
            //   [3.a] HANDLE_ERR: lỗi bất kỳ (network, Firestore...) → báo lỗi chung, không throw ra ngoài
            this._error = this._txt.errFailed
        } finally {
            this._loading = false
        }
    }

    /**
     * Flow đăng nhập Google popup: (none) -> bay-logged-in event (hoặc lỗi hiển thị)
     */
    async _dhGoogle() {
        // [1] CHECK: chặn double-submit khi đang xử lý
        if (this._loading) return
        this._loading = true
        this._error = ''
        try {
            // [3] EXECUTE: đăng nhập Google + đồng bộ user record trong Firestore + lưu session
            //   [3.a] AUTH_POPUP: dùng _preloadFirebaseAuth() (đã kích hoạt từ connectedCallback)
            //   thay vì await import() ngay tại đây, để lệnh mở popup chạy sát nhất có thể với
            //   thao tác click gốc (xem comment đầu file — Safari chặn popup nếu có await
            //   import() thật xen giữa) — mở popup Google lấy thông tin tài khoản thật
            const [{ getAuth, GoogleAuthProvider, signInWithPopup }, { getFirebaseApp }] = await _preloadFirebaseAuth()
            const { user: gUser } = await signInWithPopup(getAuth(getFirebaseApp('auth')), new GoogleAuthProvider())

            //   [3.b] FIND_OR_CREATE: tìm user theo email trong bảng `users` (server 'auth'), chưa
            //   có thì tạo mới với status active + meta đánh dấu provider google (không có password)
            const svc = createService('users', '', 'auth')
            const existing = (await svc.findAll({ filters: { email: gUser.email } }))[0]
            const user = existing ?? await (async () => {
                const id  = ulid()
                const doc = {
                    status: 'active', email: gUser.email, username: null, password: null,
                    display_name: gUser.displayName || gUser.email, avatar: gUser.photoURL || '',
                    roles: 'user', connections: '',
                    meta: { provider: 'google', provider_id: gUser.uid },
                }
                await svc.set(id, doc)
                return { id, ...doc }
            })()

            //   [3.c] IF_NOT_ACTIVE: tài khoản (kể cả vừa tạo) chưa được kích hoạt thì dừng, không lưu session
            if (user.status !== 'active') { this._error = this._txt.errNotActive; return }
            //   [3.d] SAVE_DB: lưu session (localStorage) + báo cho svc-bay.js đã đăng nhập thành công
            await auth.set(user, '')
            this._emitLoggedIn(user)
        } catch (err) {
            //   [3.e] HANDLE_ERR: lỗi bất kỳ (popup bị đóng, network, Firestore...) → log + báo lỗi chung
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
