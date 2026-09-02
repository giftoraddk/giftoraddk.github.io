import { LitElement, html, nothing } from 'lit';
import 'iconify-icon';
import '../apex/web-text.js';
import css from './styles/svc-login.css?inline';
import { auth, parseRoles } from './tools/service.js';
import { ulid, apexDecode, injectStyles, txtLingo } from '@/services/helper.js';
import { createService } from '@/services/crud.js';

const SUPER  = import.meta.env.PUBLIC_SUPER ?? '';

const getDomain = (url) => new URL(url).host.replace(/^www\./, '');

// Preload sớm — Safari (và Safari-engine trên iOS) chỉ cho phép signInWithPopup() mở popup thật
// nếu nó chạy gần như ngay trong lúc xử lý sự kiện click gốc; 1 `await import(...)` THẬT (chờ
// tải chunk qua mạng) xen giữa lệnh gọi `signInWithPopup` là đủ để WebKit coi popup đó không còn
// gắn với thao tác người dùng nữa và tự chặn — im lặng, không throw, không lỗi gì cả. Gọi trước
// ở đây (connectedCallback, xem bên dưới) để lúc _dhGoogle() thật sự chạy, import() đã nằm sẵn
// trong cache — chỉ còn resolve qua microtask, Safari vẫn tính đó là "vừa mới người dùng bấm".
// Cùng kỹ thuật với svc-bay-login.js — xem comment đầu file đó để biết thêm chi tiết.
let _firebaseAuthModules = null;
function _preloadFirebaseAuth() {
    _firebaseAuthModules ??= Promise.all([
        import('firebase/auth'),
        import('@/services/firestore.js'),
    ]);
    return _firebaseAuthModules;
}

const TXT_STD = {
    vi: { title: 'Đăng nhập quản trị', subtitle: 'Dành cho quản trị viên và nhân viên có quyền', emailLabel: 'Email hoặc tên đăng nhập', emailPh: 'Email', passwordLabel: 'Mật khẩu', passwordPh: '••••••••', submitting: 'Đang xác thực…', submit: 'Đăng nhập', or: 'hoặc', google: 'Đăng nhập với Google', hint: '', errRequired: 'Vui lòng nhập đầy đủ thông tin', errFailed: 'Sai email hoặc mật khẩu', errNotActive: 'Tài khoản chưa được kích hoạt — cần đổi status thành active', errPermission: 'Tài khoản không có quyền truy cập khu vực này', errNetwork: 'Không thể kết nối máy chủ', errGoogle: 'Đăng nhập Google thất bại' },
    en: { title: 'Admin Login', subtitle: 'For admins and authorized staff', emailLabel: 'Email or username', emailPh: 'admin@cafe.vn', passwordLabel: 'Password', passwordPh: '••••••••', submitting: 'Authenticating…', submit: 'Sign In', or: 'or', google: 'Sign in with Google', hint: '', errRequired: 'Please fill in all fields', errFailed: 'Invalid email or password', errNotActive: 'Account not yet activated — set status to active', errPermission: 'Account does not have access to this area', errNetwork: 'Cannot connect to server', errGoogle: 'Google sign-in failed' }
}

export class SvcLogin extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        pathLink:  { type: String },
        dataTable: { type: String }, // "table~nested" — Firestore users collection
        server:    { type: String }, // adapter đã registerAdapter — mặc định 'auth'
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
        this.dataTable = 'users';
        this.server    = 'auth';
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
        _preloadFirebaseAuth(); // fire-and-forget — nạp trước cho lúc bấm nút Google, xem comment đầu file
        // If already logged in, redirect immediately — cổng khách (guestOk) chỉ cần active,
        // cổng admin (mặc định) vẫn cần isAdmin/hasAnyPerm như trước.
        auth.get().then(user => {
            if (user?.status !== 'active') return;
            if (this.guestOk) { this._redirect(); return; }
            const { isAdmin, hasAnyPerm } = parseRoles(user);
            if (isAdmin || hasAnyPerm) this._redirect();
        });
    }

    _redirect() {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('redirect') || this.pathLink;
        window.location.href = target;
    }

    // Tìm user theo email hoặc username (schema users: email unique, username optional unique)
    async _findUser(input) {
        const svc     = createService((this.dataTable || 'users').split('~')[0], '', this.server);
        const byEmail = await svc.findAll({ filters: { email: input } });
        if (byEmail.length) return byEmail[0];
        const byUser  = await svc.findAll({ filters: { username: input } });
        return byUser[0] ?? null;
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
            // ── Do not comment out this code.
            if (input.toLowerCase() === 'admin@apex') {
                const domain = getDomain(window.location.href);
                if (!SUPER || btoa(`${password}~${domain}`) !== SUPER.replace('~','')) {
                    this._error = this._txt.errFailed;
                    return;
                }
                await auth.set({ id: 'super', email: 'admin@apex', display_name: 'Super Admin', roles: 'admin', status: 'active' }, '');
                this._redirect();
                return;
            }

            const user = await this._findUser(input);

            if (!user || !user.password) {
                this._error = this._txt.errFailed;
                return;
            }

            // status phải là active (pending/banned/suspended đều bị chặn)
            if (user.status !== 'active') {
                this._error = this._txt.errNotActive;
                return;
            }

            // Giải mã password đã lưu bằng apexDecode rồi so sánh.
            // Fallback plain text cho tài khoản tạo thủ công / legacy.
            let verified = false;
            try {
                verified = (await apexDecode(user.password)) === password;
            } catch {
                verified = user.password === password;
            }

            if (!verified) {
                this._error = this._txt.errFailed;
                return;
            }

            // Kiểm tra quyền: admin hoặc có ít nhất một table permission (vd: posts.read)
            const { isAdmin, hasAnyPerm } = parseRoles(user);
            if (!isAdmin && !hasAnyPerm) {
                this._error = this._txt.errPermission;
                return;
            }

            await auth.set(user, '');
            this._redirect();
        } catch {
            this._error = this._txt.errNetwork;
        } finally {
            this._loading = false;
        }
    }

    // Flow đăng nhập Google popup: (none) -> redirect theo pathLink (hoặc lỗi hiển thị). KHÁC
    // _dhSubmit() — đăng nhập bên thứ 3 (Google/GitHub...) coi như 1 khách bình thường, KHÔNG áp
    // permission gate (isAdmin/hasAnyPerm) như _dhSubmit — permission gate đó CHỈ dành cho đăng
    // nhập email/password (khu vực admin thật). Tìm-hoặc-tạo user theo email Google (giống hệt
    // svc-bay-login.js) rồi cho vào thẳng, chỉ còn check status active.
    async _dhGoogle() {
        if (this._loading) return;
        this._loading = true;
        this._error   = '';
        try {
            // AUTH_POPUP: dùng _preloadFirebaseAuth() (đã kích hoạt từ connectedCallback) thay vì
            // await import() ngay tại đây, để lệnh mở popup chạy sát nhất có thể với thao tác click
            // gốc (xem comment đầu file — Safari chặn popup nếu có await import() thật xen giữa).
            const [{ getAuth, GoogleAuthProvider, signInWithPopup }, { getFirebaseApp }] = await _preloadFirebaseAuth();
            const { user: gUser } = await signInWithPopup(getAuth(getFirebaseApp(this.server)), new GoogleAuthProvider());

            // Chặn TRƯỚC khi query Firestore nếu Google không trả về email — createService's
            // Firestore adapter (_buildConstraints trong services/firestore.js) BỎ QUA hẳn 1
            // `where()` khi filter value rỗng/null, nghĩa là findAll({filters:{email:''}}) sẽ
            // thành query KHÔNG LỌC GÌ CẢ trên toàn bảng `users` — có thể vô tình khớp vào BẤT KỲ
            // record đầu tiên nào (kể cả admin) thay vì "không tìm thấy". Đặc biệt quan trọng ở
            // đây vì không còn permission gate nào chặn lại phía sau nữa.
            if (!gUser?.email) {
                this._error = this._txt.errGoogle;
                return;
            }

            // FIND_OR_CREATE: tìm user theo email trong bảng `users`, chưa có thì tạo mới với
            // status active + meta đánh dấu provider google (không có password) — cùng khuôn
            // svc-bay-login.js's _dhGoogle().
            const svc = createService((this.dataTable || 'users').split('~')[0], '', this.server);
            const existing = (await svc.findAll({ filters: { email: gUser.email } }))[0];
            const user = existing ?? await (async () => {
                const id  = ulid();
                const doc = {
                    status: 'active', email: gUser.email, username: null, password: null,
                    display_name: gUser.displayName || gUser.email, avatar: gUser.photoURL || '',
                    roles: 'user', connections: '',
                    meta: { provider: 'google', provider_id: gUser.uid },
                };
                await svc.set(id, doc);
                return { id, ...doc };
            })();

            // status phải là active (pending/banned/suspended đều bị chặn) — kể cả tài khoản vừa tạo
            if (user.status !== 'active') {
                this._error = this._txt.errNotActive;
                return;
            }

            await auth.set(user, '');
            this._redirect();
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
