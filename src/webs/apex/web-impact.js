// src/webs/apex/web-impact.js
//
// Hiệu ứng pháo hoa/ăn mừng sinh nhật vẽ trực tiếp bằng <canvas> (2D context), viết tay hoàn
// toàn — không dùng thư viện animation nào (không gsap, không tween-lib). Ý tưởng port lại từ
// bản demo hook/hpbd.html, nhưng viết lại thành Lit component tái dùng được: vị trí nổ luôn NGẪU
// NHIÊN trong khung hình (không cố định vài góc như demo gốc), và có nhiều KIỂU pháo hoa khác
// nhau được chọn ngẫu nhiên mỗi lần nổ thay vì chỉ 1 kiểu confetti+glitter duy nhất.
//
// Vì sao canvas chứ không phải DOM/CSS animation: mỗi lượt ăn mừng bắn nhiều đợt nổ, mỗi đợt
// hàng chục-hàng trăm particle cùng lúc — tạo/huỷ từng đó DOM node + Lit re-render mỗi frame sẽ
// rất nặng. 1 canvas overlay + 1 vòng requestAnimationFrame tự quản lý mảng particle (không qua
// Lit reactive state) là cách rẻ nhất để đạt số lượng đó mượt mà.
//
// Mỗi frame ctx.clearRect() xoá sạch canvas rồi vẽ lại toàn bộ particle theo vị trí mới — canvas
// trong suốt đè lên nội dung trang nên KHÔNG thể để lại vệt mờ kiểu motion-blur (sẽ làm nhoè cả
// trang phía dưới). Vệt sáng lấp lánh của các loại "spark" vì vậy được giả lập bằng 1 đoạn thẳng
// vẽ ngược theo hướng vận tốc hiện tại (dài theo tốc độ) mỗi frame, không phải trail tích luỹ qua
// nhiều frame — rẻ và không cần buffer riêng.
//
// `trigger` — đổi giá trị (bất kỳ) → 1 lượt ăn mừng mới.
//
// `duration` (giây, mặc định 12) — thời gian tồn tại THẬT SỰ của MỖI lần nổ (từ lúc nổ tới lúc
// particle sống lâu nhất của lần đó tàn hẳn), KHÔNG phải độ dài cả lượt ăn mừng — số lần nổ
// (`bursts`) là 1 prop riêng, không suy ra từ `duration`. Áp dụng bằng time-dilation RIÊNG CHO
// TỪNG KIỂU NỔ: mỗi kiểu có 1 hằng số TYPE_MAX_LIFE = mốc life dài nhất mà kiểu đó được tune (vd
// willow tune tới 3.6s, ring chỉ 1.7s). Mỗi particle được cấp `durScale = duration / TYPE_MAX_LIFE`
// của ĐÚNG kiểu đang spawn (không dùng 1 hằng số baseline chung cho mọi kiểu) — nhờ vậy particle
// sống lâu nhất của BẤT KỲ kiểu nào cũng kéo dài chính xác bằng `duration` giây (6s theo mặc
// định), dù mỗi kiểu vốn được tune với độ dài gốc rất khác nhau. Vật lý chạy theo
// `simDt = dt / p.durScale` (lưu trên từng particle, xem _step()/_stepParticle()) còn tuổi thọ
// (`life`/`splitAt`) nhân với `durScale` khi spawn — quỹ đạo (vị trí theo % vòng đời) giữ NGUYÊN
// hình dạng đã tune, chỉ chạy chậm/dài hơn theo thời gian thực.
//
// `bursts` (mặc định 36) — TỔNG SỐ LẦN PHÁT NỔ trong 1 lượt ăn mừng (mỗi lần 1 kiểu TYPE_SPAWNERS
// ngẫu nhiên, 1 vị trí ngẫu nhiên). `spread` (giây, mặc định = duration/bursts) = GIÃN CÁCH CHÍNH
// XÁC giữa 2 lần nổ liên tiếp: lần i bắn đúng tại mốc i × spread (lần đầu bắn ngay, không random
// lệch — random chỉ còn ở vị trí + kiểu nổ). Mặc định duration/bursts nghĩa là CẢ LOẠT bursts lần
// nổ rải đều gói gọn trong đúng `duration` giây đầu, mỗi lần vẫn sống đủ `duration` giây riêng —
// bursts càng lớn nhịp bắn càng dồn dập (kiểu finale), không kéo lê tổng thời gian theo số lần nổ.
// Vd mặc định bursts=36, duration=12 → cứ ~0.33s nổ 1 lần suốt 12s đầu, lần cuối tàn hẳn ở mốc
// ~24s. Vd bursts=2, duration=6 → giãn cách 3s: lần 1 tại 0s sống tới 6s, lần 2 tại 3s sống tới
// 9s — tổng nhìn thấy (bursts-1)×spread + duration = 9s.
// Vị trí (x, y) của MỖI lần nổ luôn ngẫu nhiên trong khung hình, không phụ thuộc lần trước.
//
// Vận tốc bị "drag" mỗi frame theo Math.pow(drag, simDt*60) thay vì nhân phẳng — nếu nhân phẳng
// (không quy theo thời gian) thì tốc độ giảm tốc sẽ phụ thuộc refresh rate/độ trễ frame thực tế,
// khiến chuyển động giật/không đều khi fps dao động. Fade in/out cũng dùng smoothstep thay vì
// tuyến tính để particle xuất hiện/biến mất êm hơn, không "bật/tắt" đột ngột.
//
// Tối ưu render (xem _step/_drawParticle):
//   - KHÔNG dùng shadowBlur — là thao tác đắt nhất của canvas 2D (mỗi hình phải blur qua buffer
//     riêng). Cũng KHÔNG thay bằng lớp "halo" stroke alpha thấp: stroke đặc không blur nhìn như
//     đường VIỀN cứng bao quanh tia chứ không ra quầng sáng. Tia spark chỉ vẽ lõi màu sạch +
//     chấm sáng trắng ở đầu; glitter fill hình thoi + chớp alpha (twinkle) — đủ cảm giác pháo hoa.
//   - KHÔNG save()/restore() từng particle (đẩy/khôi phục cả state stack mỗi lần) — chỉ set đúng
//     các thuộc tính cần đổi; hình cần xoay (confetti/glitter) dùng setTransform() đặt trực tiếp
//     rồi reset về ma trận dpr gốc.
//   - Dọn particle chết bằng nén mảng in-place 1 lượt (ghi đè bằng con trỏ write) thay vì
//     splice() từng phần tử trong vòng lặp (dịch chuyển đuôi mảng mỗi lần xoá — O(n²)).
//
// Các kiểu nổ (spawn theo TYPE_SPAWNERS, chọn ngẫu nhiên qua prop `types` mỗi đợt):
//   'confetti'      — giấy vụn + kim tuyến rơi theo trọng lực (giống demo gốc)
//   'chrysanthemum' — pháo hoa hình cầu cổ điển, các tia toả đều 360°, có vệt sáng
//   'ring'          — 2 vòng tròn tia đồng tâm toả đều, tốc độ cố định theo vòng
//   'willow'        — tia vàng mảnh, rơi rũ chậm như cành liễu (trọng lực + drag cao, sống lâu)
//   'heart'         — các tia bắn theo hướng dọc đường cong tham số hình trái tim
//   'crossette'     — vài tia dày bắn ra, giữa đường mỗi tia tự nổ tách thành 1 chùm nhỏ (2 pha)
//   'palm'          — vài tia dày dài bắn hình nón hẹp lên cao rồi rũ xuống như tàu cọ
import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-impact.css?inline'

const TWO_PI = Math.PI * 2
// Mốc life dài nhất mà mỗi kiểu nổ được tune tới (khớp cận trên của rand(...) trong spawn* bên
// dưới) — dùng làm mẫu số cho durScale RIÊNG của từng kiểu (xem typeDurScale()), để particle sống
// lâu nhất của MỌI kiểu đều kéo dài đúng bằng `duration` giây, bất kể kiểu đó vốn tune ngắn/dài
// khác nhau. Xem time-dilation ở comment đầu file.
const TYPE_MAX_LIFE = {
    confetti: 2.2, chrysanthemum: 2.4, ring: 1.7, willow: 3.6, heart: 2.1, crossette: 2.0, palm: 2.8,
}
const COLORS_STD = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffffff', '#c77dff']
const WILLOW_COLORS  = ['#ffd166', '#ffb703', '#fff3b0', '#ffffff']
const HEART_COLORS   = ['#ff4d6d', '#f72585', '#ff8fa3', '#ffffff', '#ffb3c6']
const PALM_COLORS    = ['#ffb703', '#fb8500', '#ffd166', '#ffffff']

function rand(a, b) { return a + Math.random() * (b - a) }
function pick(arr) { return arr[(Math.random() * arr.length) | 0] }
function smoothstep(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
}
// durScale > 1 = kiểu này chạy dài/chậm hơn mốc tune gốc (TYPE_MAX_LIFE) để vươn tới `duration`;
// < 1 = ngắn/nhanh hơn (duration nhỏ hơn mốc tune gốc của kiểu đó).
function typeDurScale(duration, maxLife) { return Math.max(0.25, duration / maxLife) }

function spawnConfetti(self, x, y) {
    const count = Math.round(70 * self.scale)
    const colors = self._palette()
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.confetti)
    for (let i = 0; i < count; i++) {
        const isGlitter = Math.random() < 0.45
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * TWO_PI
        const speed = rand(260, 760) * (isGlitter ? 0.75 : 1)
        self._particles.push(self._newParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
            shape: isGlitter ? 'glitter' : 'confetti',
            life: rand(1.1, 2.2) * durScale,
            size: isGlitter ? rand(1.2, 2.8) : rand(4, 9),
            color: pick(colors),
            gravity: 980,
            drag: isGlitter ? 0.992 : 0.985,
            rot: rand(0, TWO_PI), vr: rand(-8, 8),
            twinkle: rand(8, 16), phase: rand(0, TWO_PI),
            wobble: rand(4, 14), wobbleSpeed: rand(6, 12),
            durScale,
        }))
    }
}

function spawnChrysanthemum(self, x, y) {
    const count = Math.round(90 * self.scale)
    const palette = self._palette()
    const primary = pick(palette)
    const secondary = pick(palette)
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.chrysanthemum)
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * TWO_PI
        const speed = rand(180, 420)
        self._particles.push(self._newParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
            shape: 'spark',
            life: rand(1.4, 2.4) * durScale,
            size: rand(2, 3.4),
            color: Math.random() < 0.82 ? primary : secondary,
            gravity: 420, drag: 0.978, streakK: 0.05, streakMax: 26,
            durScale,
        }))
    }
}

function spawnRing(self, x, y) {
    const count = Math.round(64 * self.scale)
    const color = pick(self._palette())
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.ring)
    for (let ring = 0; ring < 2; ring++) {
        const speed = 260 + ring * 90
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TWO_PI + rand(-0.03, 0.03)
            self._particles.push(self._newParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
                shape: 'spark', life: rand(1.3, 1.7) * durScale, size: rand(2, 3),
                color, gravity: 360, drag: 0.982, streakK: 0.045, streakMax: 22,
                durScale,
            }))
        }
    }
}

function spawnWillow(self, x, y) {
    const count = Math.round(50 * self.scale)
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.willow)
    for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6
        const speed = rand(140, 260)
        self._particles.push(self._newParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
            shape: 'spark', life: rand(2.6, 3.6) * durScale, size: rand(1.6, 2.4),
            color: pick(WILLOW_COLORS), gravity: 260, drag: 0.965, streakK: 0.09, streakMax: 34,
            durScale,
        }))
    }
}

function spawnHeart(self, x, y) {
    const count = Math.round(70 * self.scale)
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.heart)
    for (let i = 0; i < count; i++) {
        const t = (i / count) * TWO_PI
        // Đường cong tham số hình trái tim chuẩn — dùng làm HƯỚNG bắn (không phải toạ độ), mỗi
        // particle bay dọc theo hướng này nên cả chùm giãn ra thành hình trái tim khi nổ.
        const hx = 16 * Math.pow(Math.sin(t), 3)
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
        const len = Math.hypot(hx, hy) || 1
        const dirX = hx / len, dirY = hy / len
        const speed = rand(240, 320)
        self._particles.push(self._newParticle(x, y, dirX * speed, dirY * speed, {
            shape: Math.random() < 0.5 ? 'glitter' : 'spark',
            life: rand(1.5, 2.1) * durScale, size: rand(2, 3.4),
            color: pick(HEART_COLORS), gravity: 340, drag: 0.975, streakK: 0.05, streakMax: 20,
            rot: rand(0, TWO_PI), vr: rand(-4, 4), twinkle: rand(8, 14), phase: rand(0, TWO_PI),
            durScale,
        }))
    }
}

function spawnCrossette(self, x, y) {
    const count = Math.round(24 * self.scale)
    const color = pick(self._palette())
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.crossette)
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * TWO_PI
        const speed = rand(200, 320)
        self._particles.push(self._newParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
            shape: 'spark', life: rand(1.6, 2.0) * durScale, size: rand(2.6, 3.6),
            color, gravity: 380, drag: 0.978, streakK: 0.05, streakMax: 24,
            splitAt: rand(0.45, 0.7) * durScale,
            durScale,
        }))
    }
}

// Chùm nổ phụ khi 1 tia 'crossette' tới mốc splitAt giữa đường bay — xem _stepParticle(). Kế
// thừa `p.durScale` của particle cha (không tự tính durScale riêng theo TYPE_MAX_LIFE) — chùm phụ
// chỉ là 1 pha ngắn ăn theo đợt nổ cha, không phải 1 kiểu nổ độc lập cần vươn tới đủ `duration`.
function spawnCrossetteChildren(self, p) {
    const colors = self._palette()
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * TWO_PI
        const speed = rand(80, 160)
        self._particles.push(self._newParticle(p.x, p.y, p.vx * 0.3 + Math.cos(angle) * speed, p.vy * 0.3 + Math.sin(angle) * speed, {
            shape: 'spark', life: rand(0.5, 0.8) * p.durScale, size: rand(1.4, 2),
            color: pick(colors), gravity: 300, drag: 0.97, streakK: 0.04, streakMax: 14,
            durScale: p.durScale,
        }))
    }
}

function spawnPalm(self, x, y) {
    const count = Math.round(14 * self.scale)
    const durScale = typeDurScale(self.duration, TYPE_MAX_LIFE.palm)
    for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
        const speed = rand(320, 460)
        self._particles.push(self._newParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
            shape: 'spark', life: rand(2.0, 2.8) * durScale, size: rand(3, 4.2),
            color: pick(PALM_COLORS), gravity: 300, drag: 0.965, streakK: 0.12, streakMax: 46,
            durScale,
        }))
    }
}

const TYPE_SPAWNERS = {
    confetti: spawnConfetti,
    chrysanthemum: spawnChrysanthemum,
    ring: spawnRing,
    willow: spawnWillow,
    heart: spawnHeart,
    crossette: spawnCrossette,
    palm: spawnPalm,
}

export const IMPACT_TYPES = Object.keys(TYPE_SPAWNERS)

export class WebImpact extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        trigger:  {},          // Number|String — đổi giá trị (bất kỳ) → 1 lượt ăn mừng mới, không đọc giá trị
        types:    { type: Array },   // danh sách kiểu nổ được phép chọn ngẫu nhiên; mặc định null = dùng hết IMPACT_TYPES
        bursts:   { type: Number },  // tổng số LẦN PHÁT NỔ / lượt ăn mừng (mặc định 36) — mỗi lần 1 kiểu + vị trí ngẫu nhiên
        duration: { type: Number },  // giây — thời gian tồn tại của MỖI lần nổ (mặc định 12s), xem time-dilation ở đầu file
        spread:   { type: Number },  // giây — giãn cách chính xác giữa 2 lần nổ liên tiếp; mặc định null = duration/bursts
        scale:    { type: Number },  // hệ số nhân số particle mỗi đợt nổ — giảm để nhẹ máy hơn
        colors:   { type: Array },   // bảng màu tuỳ biến cho các kiểu dùng self._palette(); mặc định COLORS_STD
        auto:     { type: Boolean }, // true = tự chạy 1 lượt ngay sau khi mount (không cần chờ đổi trigger)
    }

    constructor() {
        super()
        this.trigger  = null
        this.types    = null
        this.bursts   = 36
        this.duration = 12
        this.spread   = null
        this.scale    = 1
        this.colors   = null
        this.auto     = false

        this._particles   = []
        this._spawnTimers = []
        this._mounted = false
        this._raf  = null
        this._last = null
        this._W = 0
        this._H = 0
        this._dpr = 1

        this._onResize = () => this._resize()
        this._tick = (now) => {
            if (this._last == null) this._last = now
            const dt = Math.min(0.033, (now - this._last) / 1000)
            this._last = now
            this._step(dt)
            this._raf = requestAnimationFrame(this._tick)
        }
    }

    firstUpdated() {
        this._canvas = this.renderRoot.querySelector('canvas')
        this._ctx = this._canvas.getContext('2d')
        this._resize()
        window.addEventListener('resize', this._onResize)
        this._raf = requestAnimationFrame(this._tick)
        this._mounted = true
        if (this.auto) this._celebrate()
    }

    willUpdate(changed) {
        if (this._mounted && changed.has('trigger') && this.trigger != null) this._celebrate()
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        cancelAnimationFrame(this._raf)
        window.removeEventListener('resize', this._onResize)
        this._spawnTimers.forEach(clearTimeout)
    }

    _resize() {
        this._dpr = Math.min(window.devicePixelRatio || 1, 2)
        this._W = window.innerWidth
        this._H = window.innerHeight
        this._canvas.width  = Math.floor(this._W * this._dpr)
        this._canvas.height = Math.floor(this._H * this._dpr)
        this._canvas.style.width  = this._W + 'px'
        this._canvas.style.height = this._H + 'px'
        this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0)
    }

    _palette() { return (this.colors && this.colors.length) ? this.colors : COLORS_STD }

    // Không set `spread` riêng → mặc định = duration/bursts: CẢ LOẠT bursts lần nổ rải đều gói
    // gọn trong đúng `duration` giây đầu (vd bursts=36, duration=12 → ~0.33s/lần suốt 12s), mỗi
    // lần vẫn sống đủ `duration` giây riêng — bursts càng lớn nhịp bắn càng dồn dập kiểu finale,
    // không kéo lê tổng thời gian theo số lần nổ.
    _comSpread() { return this.spread != null ? this.spread : this.duration / Math.max(1, this.bursts) }

    // `overrides.life`/`overrides.splitAt`/`overrides.durScale` đã được spawn* tính sẵn theo
    // TYPE_MAX_LIFE riêng của từng kiểu (xem typeDurScale() và comment đầu file) — hàm này chỉ
    // merge với default, không tự scale gì thêm.
    _newParticle(x, y, vx, vy, overrides) {
        return Object.assign({
            x, y, vx, vy,
            age: 0, life: 1.5,
            size: 3, color: '#fff',
            gravity: 400, drag: 0.98,
            shape: 'spark', streakK: 0.05, streakMax: 24,
            rot: 0, vr: 0, twinkle: 0, phase: 0, wobble: 0, wobbleSpeed: 0,
            split: false, splitAt: null, durScale: 1,
        }, overrides)
    }

    _celebrate() {
        this._spawnTimers.forEach(clearTimeout)
        this._spawnTimers = []
        const pool = (this.types && this.types.length) ? this.types : IMPACT_TYPES
        const n = Math.max(1, this.bursts)
        const spread = this._comSpread()
        // Đợt i bắn ĐÚNG tại mốc i × spread — giãn cách chính xác, dự đoán được (đợt đầu ngay lập
        // tức); random chỉ còn ở vị trí + kiểu nổ, không random thời điểm nữa.
        for (let i = 0; i < n; i++) {
            const delay = i * spread
            this._spawnTimers.push(setTimeout(() => {
                const x = rand(this._W * 0.06, this._W * 0.94)
                const y = rand(this._H * 0.08, this._H * 0.65)
                const fn = TYPE_SPAWNERS[pick(pool)] || spawnChrysanthemum
                fn(this, x, y)
            }, delay * 1000))
        }
    }

    _step(dt) {
        const ctx = this._ctx
        ctx.clearRect(0, 0, this._W, this._H)
        // Nén mảng in-place bằng con trỏ write: particle còn sống được ghi dồn về đầu, cuối vòng
        // cắt đuôi 1 lần — thay cho splice() từng phần tử (O(n²), xem comment đầu file). Duyệt
        // xuôi bằng index nên chùm crossette con push vào cuối mảng NGAY TRONG vòng lặp này vẫn
        // được bước/vẽ luôn ở frame hiện tại, không lọt frame.
        const arr = this._particles
        let w = 0
        for (let i = 0; i < arr.length; i++) {
            const p = arr[i]
            p.age += dt
            if (p.age >= p.life) continue
            // simDt: "thời gian giả lập" sau khi co giãn theo durScale RIÊNG của particle này
            // (khác nhau giữa các kiểu nổ, xem comment đầu file) — quỹ đạo (vị trí theo % vòng
            // đời) giữ nguyên hình dạng đã tune sẵn, chỉ chạy chậm/dài hơn theo thời gian thực;
            // p.age vẫn cộng dồn theo dt THẬT (không co giãn) để so đúng với p.life đã nhân durScale.
            this._stepParticle(p, dt / p.durScale)
            this._drawParticle(ctx, p)
            arr[w++] = p
        }
        arr.length = w
        ctx.globalAlpha = 1
    }

    _stepParticle(p, simDt) {
        p.vy += p.gravity * simDt
        // Math.pow(drag, simDt*60) thay vì `vx *= drag` phẳng — quy giảm tốc về "mỗi giây" thay
        // vì "mỗi frame" nên tốc độ giảm tốc không phụ thuộc refresh rate/độ trễ frame thực tế,
        // xem giải thích ở đầu file.
        const dragStep = Math.pow(p.drag, simDt * 60)
        p.vx *= dragStep
        p.vy *= dragStep
        p.x += p.vx * simDt + Math.sin(p.age * p.wobbleSpeed + p.phase) * p.wobble * simDt
        p.y += p.vy * simDt
        p.rot += p.vr * simDt
        if (p.splitAt != null && !p.split && p.age >= p.splitAt) {
            p.split = true
            spawnCrossetteChildren(this, p)
        }
    }

    // Không save()/restore(), không shadowBlur, và cũng KHÔNG vẽ lớp "halo" giả glow — stroke
    // đặc alpha thấp không có blur nhìn như 1 đường VIỀN cứng bao quanh tia (rất xấu) chứ không
    // ra quầng sáng; thà bỏ hẳn, giữ tia lõi sạch + chấm sáng trắng ở đầu là đủ cảm giác pháo
    // hoa. Xem "Tối ưu render" ở comment đầu file. Hình cần xoay đặt thẳng ma trận qua
    // setTransform rồi trả về ma trận dpr gốc sau khi vẽ.
    _drawParticle(ctx, p) {
        const fadeIn = 0.12
        const t = p.age / p.life
        // smoothstep thay vì tuyến tính — particle mờ dần êm ở 2 đầu thay vì "bật/tắt" tuyến tính
        const alpha = t < fadeIn ? smoothstep(0, fadeIn, t) : 1 - smoothstep(fadeIn, 1, t)
        if (alpha <= 0) return
        const dpr = this._dpr

        if (p.shape === 'confetti') {
            ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr)
            ctx.rotate(p.rot)
            ctx.globalAlpha = alpha
            ctx.fillStyle = p.color
            ctx.fillRect(-p.size * 0.55, -p.size * 0.25, p.size, p.size * 0.5)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        } else if (p.shape === 'glitter') {
            ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr)
            ctx.rotate(p.rot)
            const spark = 0.45 + 0.55 * Math.abs(Math.sin(p.age * p.twinkle + p.phase))
            // hình thoi fill đặc, chớp sáng bằng alpha (twinkle) — không viền/halo
            ctx.beginPath()
            ctx.moveTo(0, -p.size)
            ctx.lineTo(p.size * 0.65, 0)
            ctx.lineTo(0, p.size)
            ctx.lineTo(-p.size * 0.65, 0)
            ctx.closePath()
            ctx.globalAlpha = alpha * spark
            ctx.fillStyle = p.color
            ctx.fill()
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        } else {
            // 'spark' — vệt sáng giả lập theo hướng vận tốc hiện tại (không phải trail tích luỹ
            // qua nhiều frame, xem giải thích ở đầu file), cộng 1 chấm sáng trắng ở đầu tia.
            const speed = Math.hypot(p.vx, p.vy)
            const dirX = speed > 0.0001 ? p.vx / speed : 0
            const dirY = speed > 0.0001 ? p.vy / speed : 0
            const len = Math.max(p.size, Math.min(p.streakMax, speed * p.streakK))
            // vệt lõi duy nhất, không viền/halo — sạch, không có đường bao cứng quanh tia
            ctx.strokeStyle = p.color
            ctx.lineCap = 'round'
            ctx.lineWidth = p.size
            ctx.globalAlpha = alpha
            ctx.beginPath()
            ctx.moveTo(p.x - dirX * len, p.y - dirY * len)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
            ctx.globalAlpha = alpha * 0.85
            ctx.fillStyle = '#fff'
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * 0.35, 0, TWO_PI)
            ctx.fill()
        }
    }

    render() {
        return html`<canvas></canvas>`
    }
}

if (!customElements.get('web-impact')) customElements.define('web-impact', WebImpact)

export default WebImpact
