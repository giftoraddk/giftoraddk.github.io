// src/packages/llm/svc-aide.js
//
// <svc-aide> — trợ lý tư vấn / hỏi-đáp tri thức cho KHÁCH VÃNG LAI (không cần đăng nhập). Cả lượt trả lời chạy ở Worker:
// POST /v1/fn/aide tra kiến thức (`know`/`rel`, Vectorize + FTS) của `owner` rồi trả lời theo persona phòng Tư vấn của
// ngành (fn/base/consult.ts ⊕ sector ⊕ override) — trình duyệt chỉ gửi câu hỏi + vài lượt chat gần nhất, không có
// prompt/persona nào ở đây. Không lead-capture/extractPhone/hotline — 1 engine hỏi-đáp chung.
//
// Prop `division` (mặc định 'ecommerce.consult'; id cũ 'aide'/'sale' vẫn nhận) chọn phòng Tư vấn của 1 ngành.
//
// Nút góc phải header mở <svc-division> ngay trong panel — quản lý phòng ban + kho kiến thức của `owner` (nạp từ API,
// MCP token); lưu xong panel nhận lại face qua `division-change`. Chỉ hiện cho người quản lý được trợ lý này (_dcPerms):
// nhúng trên site khách (owner gán cứng), khách vãng lai không thấy nút.
//
// Tên/avatar từ GET /v1/fn/sectors (face, public). Lịch sử chat chỉ nằm ở trình duyệt (IndexedDB, storager.js) — Worker
// không lưu gì của khách: tách theo phòng Tư vấn + theo TÀI KHOẢN đang đăng nhập (khách vãng lai: id ngẫu nhiên của
// trình duyệt), giữ 30 ngày (HISTORY_DAYS) — dòng cũ hơn bị bỏ mỗi lần đọc/ghi. Đổi tài khoản → tải lịch sử của người mới.
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-fab.js'
import '@/packages/apex/web-popover.js'
import '@/packages/apex/web-avatar.js'
import '@/packages/apex/web-text.js'
import '@/packages/apex/web-button.js'
import './svc-division.js'
import { txtLingo, pickLang } from '@/services/tools/util.js'
import { cacheGet, cacheSet, cacheRemove } from '@/services/core/storager.js'
import { fnApi, fnApiFor } from './service/fn-api.js'
import { resolveOwner, siteHost, onLocalHost, onOwnerChange, hubDenied } from './service/hub.js'
import { auth } from '@/packages/auth/service/service.js'
import { parseRoles, hasAccess } from '@/packages/auth/tool/roles.js'
import { canonicalDivision, findFunction, displayTitle, displayAbout } from './tool/divisions.js'
import { CONSULT_ICON } from './tool/sectors.js'
import { takeCommand } from './tool/command.js'
import styles from './css/svc-aide.css?inline'

const VISITOR_KEY = 'aide-visitor-id'
const HISTORY_DAYS = 30 // lịch sử chat giữ bao lâu — cùng mức với nhóm chat svc-talk (worker fn/retention.ts)
const HISTORY_MS = HISTORY_DAYS * 86_400_000
/** 1 lịch sử / phòng Tư vấn / kho trả lời / người: 'u:<user id>' khi đăng nhập, 'v:<visitor id>' khi là khách. `scope` tách
 *  các trợ lý cùng phòng nhưng khác kho (trang chủ site="…" ≠ trang ngành cùng ecommerce.consult) — không lẫn lịch sử,
 *  và không gửi nhầm câu chuyện của trợ lý này lên AI làm ngữ cảnh cho trợ lý kia. */
const _logKey = (division, scope, who) => `aide-chats:${division}:${scope}:${who}`
const _legacyKey = (visitorId) => `aide-chats-${visitorId}` // trước đây: 1 lịch sử chung mọi tài khoản trên trình duyệt
/** Chỉ các dòng còn trong HISTORY_DAYS — dòng không có created_at (bản cũ) cũng bỏ. */
const _fresh = (log) => {
    const since = Date.now() - HISTORY_MS
    return (Array.isArray(log) ? log : []).filter(m => Number(m?.created_at) >= since)
}
const QUESTION_MAX = 2000 // cùng GUEST_MAX Worker cắt (fn/talk.ts) — cắt luôn ở client + hiện qua maxlength cho khách thấy

// Tra cứu + trả lời là 1 request ở Worker — nhãn chờ đổi theo thời gian để khách biết vẫn đang chạy
const STAGE_ANSWER_MS = 2500
const STAGE_RETRY_MS = 15000

// Rotation interval (ms) between filler variants WITHIN the same stage — see _rfTyping()/
// _dfPostGuest()'s stageTimer.
const STAGE_ROTATE_MS = 2500

// Hỏi lại khi khách im lặng (như Zap Support, hook/ZAP-SUPPORT.rst §2.2): trợ lý trả lời xong mà khách im → câu hỏi lại soạn
// sẵn (TXT_STD.follow — câu thứ n, bốc ngẫu nhiên 1 trong 3), chờ gấp đôi mỗi lần: `follow` giây · 2^n (90 → 180 → 360 s),
// ≤ FOLLOW_MAX lần / lịch sử / ngày. Chỉ ở trình duyệt: không gọi Worker, không tốn lượt AI, không gửi lên AI làm ngữ cảnh.
const FOLLOW_SEC = 90
const FOLLOW_MAX = 3
const FOLLOW_RESUME_MS = 5 * 60_000 // khách xen ngang rồi lại im → hỏi tiếp sau ≥ 5 phút, không đếm lại (vẫn ≤ 3 / ngày)
const FOLLOW_RETRY_MS = 15_000      // tới giờ mà tab đang ẩn / đang chờ AI → hoãn
const FOLLOW_STALE_MS = 60_000      // mở lại trang khi đã quá giờ hỏi → bỏ, không gửi câu hỏi lại cũ ngay khi vào
const VI_MARKS = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i

/**
 * Ngôn ngữ của câu hỏi lại = ngôn ngữ khách đang dùng, không phải ngôn ngữ giao diện: tin cuối của khách có dấu tiếng Việt →
 * 'vi'; không thì câu trả lời thật cuối của trợ lý (AI trả lời theo ngôn ngữ khách — khách gõ không dấu vẫn ra tiếng Việt)
 * có dấu → 'vi'; còn lại có chữ → 'en'; không đoán được → `fallback`.
 */
const _chatLang = (log, fallback) => {
    const guest = log.findLast(m => m.from === 'guest')?.content ?? ''
    const reply = log.findLast(m => m.from === 'aide' && !m.follow && !m.error)?.content ?? ''
    if (VI_MARKS.test(guest) || VI_MARKS.test(reply)) return 'vi'
    return /\p{L}/u.test(guest + reply) ? 'en' : fallback
}

const TXT_STD = {
    vi: {
        panelTitle: 'Trợ lý tri thức',
        manage: 'Quản lý phòng ban',
        placeholder: 'Hỏi gì đó…',
        empty: 'Chào bạn! Có gì cần hỏi cứ hỏi thoải mái nhé.',
        thinkingStages: {
            retrieving: ['🔎 Đang tìm thông tin liên quan…', '🔎 Đang tra cứu kiến thức…'],
            answering:  ['✍️ Đang soạn câu trả lời…', '✍️ Sắp xong rồi nha…'],
            retrying:   ['🔁 Đang thử lại để trả lời chính xác hơn…', '🔁 Đợi mình chỉnh lại câu trả lời chút nhé…'],
        },
        errGeneric: 'Có lỗi xảy ra, thử lại giúp mình nhé',
        sourcesPrefix: 'Nguồn',
        // Hỏi lại khi khách im lặng — [lần 1, lần 2, lần 3] × 3 cách nói (hỏi còn thắc mắc → gỡ băn khoăn → chào kết)
        follow: [
            ['Bạn còn thắc mắc gì thêm không ạ? Mình sẵn sàng giải đáp ngay cho bạn nhé!',
                'Thông tin vừa rồi đã giúp được bạn chưa ạ? Bạn còn băn khoăn điểm nào không?',
                'Bạn ơi, mình có thể giúp gì thêm cho bạn không ạ?'],
            ['Bạn đang cân nhắc giữa các lựa chọn nào ạ? Cho mình biết nhu cầu của bạn, mình tư vấn giúp bạn chọn cái phù hợp nhất nhé!',
                'Bạn còn lưỡng lự điều gì không ạ? Mình giải thích kỹ hơn giúp bạn nhé!',
                'Bạn có cần mình gửi thêm thông tin chi tiết không ạ?'],
            ['Nếu bạn cần thêm thời gian suy nghĩ cũng không sao ạ — khi nào cần cứ nhắn mình nhé. Chúc bạn một ngày tốt lành!',
                'Khi bạn sẵn sàng, mình hướng dẫn bạn bắt đầu ngay ạ. Còn cần thêm thời gian thì cứ nhắn mình bất cứ lúc nào nhé!',
                'Cảm ơn bạn đã quan tâm! Khi nào cần hỗ trợ, bạn cứ nhắn mình nhé.'],
        ],
    },
    en: {
        panelTitle: 'Knowledge assistant',
        manage: 'Manage division',
        placeholder: 'Ask something…',
        empty: 'Hi there! Feel free to ask anything.',
        thinkingStages: {
            retrieving: ['🔎 Looking up relevant info…', '🔎 Checking the knowledge base…'],
            answering:  ['✍️ Writing a reply…', '✍️ Almost there…'],
            retrying:   ['🔁 Trying again for a better answer…', '🔁 Give me a moment to refine that…'],
        },
        errGeneric: 'Something went wrong, please try again',
        sourcesPrefix: 'Source',
        follow: [
            ['Is there anything else you would like to know? I am happy to help!',
                'Did that answer your question? Is anything still unclear?',
                'Can I help you with anything else?'],
            ['Are you comparing a few options? Tell me what you need and I will help you pick the best fit!',
                'Is anything still holding you back? I can explain it in more detail!',
                'Would you like me to share more details?'],
            ['No rush if you need more time to think — just message me whenever you are ready. Have a great day!',
                'Whenever you are ready, I can help you get started. And if you need more time, just message me anytime!',
                'Thanks for stopping by! Message me whenever you need help.'],
        ],
    },
}

export class SvcAide extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object },
        // Forward cho <web-fab> nội bộ — cùng cơ chế x/y để nơi mount tự xếp fab này đúng vị trí
        // trong cùng 1 stack fab-nổi-cố-định thay vì hardcode ngay trong component.
        x: { type: String },
        y: { type: String },
        // Lọc theo know.type — '|'-joined (vd "law|faq"), '' = mọi loại. Cho phép 1 lần triển khai
        // scope trợ lý này vào 1 tập domain cụ thể mà không cần đổi code, chỉ đổi attribute.
        types: { type: String },
        // Phòng Tư vấn của 1 ngành ('<sector>.consult') — id cũ 'aide'/'sale' vẫn nhận (tool/divisions.js).
        division: { type: String },
        // Chủ kho kiến thức (hubs.id = user id của người mua gói) — trợ lý CHỈ trả lời từ know.owner này.
        // Gán cứng khi nhúng cho khách (<svc-aide owner="…">, id gửi trong email mua gói). Để trống = hub của
        // tài khoản đang đăng nhập, không có thì '' (kiến thức chung) — resolve mỗi lượt hỏi, xem service/hub.js.
        owner: { type: String },
        // Trợ lý riêng của 1 site nền tảng (vd trang chủ site="chatzui.com", không `owner`): kho riêng owner '@<host>' —
        // kiến thức, persona, face của riêng site đó, không lẫn kiến thức ngành (owner '') hay trợ lý khác. Chỉ chạy trên
        // đúng site đó (Worker so Origin — copy thẻ đi là bị chặn), chỉ admin / quyền `know` quản lý; ⚙ ẩn Loại + Dùng cho.
        // Có `owner` thì owner thắng, `site` bỏ qua — khách hàng giới hạn site ở Nạp từ API & MCP → Site được nhúng.
        site: { type: String },
        // true = chỉ render nội dung panel (.aid-panel), bỏ <web-fab>+<web-popover> — dùng khi nơi
        // mount khác đã tự lo trigger+popover của riêng nó (vd <svc-node>'s overlay component).
        embedded: { type: Boolean, reflect: true },
        // { id, text } — câu hỏi <svc-ask> chuyển tới (node có `chat`): gửi như khách tự gõ, 1 lần mỗi id
        command: { attribute: false },
        // Chế độ dùng thử (page /system/<sector>): ngành chưa phát hành vẫn trả lời người ĐÃ đăng nhập, mỗi câu tính vào
        // lượt tin nhắn thử của ngành — Worker tự quyết và đếm (fn/trial.ts); ngành đã mở thì như thường.
        trial: { type: Boolean },
        // Hỏi lại khi khách im lặng: số giây chờ lần đầu (gấp đôi mỗi lần), 0 = tắt — <svc-aide follow="0">. Xem _dfArmFollow().
        follow: { type: Number },

        _division: { state: true },
        _log:      { state: true }, // chat entries, sorted created_at asc — cached in IndexedDB via cacheGet/cacheSet, see _dfPersistLog()
        _draft:    { state: true },
        _busy:     { state: true }, // đang chờ AI trả lời lượt vừa gửi — disable composer tránh gửi chồng
        _stage:    { state: true }, // 'retrieving' | 'answering' | 'retrying' — đổi theo thời gian chờ, xem _dfPostGuest()
        _stageIdx: { state: true }, // luân phiên biến thể text trong cùng 1 stage, xem _rfTyping()
        _manage:   { state: true }, // true = panel đang hiện <svc-division> (nút góc phải header) thay cho khung chat
        _canManage: { state: true }, // có nút ⚙ không — xem _dcPerms()
        // 'ok' | 'pending' (owner gán cứng, đang hỏi Worker) | mã từ chối 'hub_*' — khác 'ok' thì không render gì: khách
        // của site không thấy trợ lý của 1 hub hết hạn / sai site / tắt nhúng, và không tốn lượt AI nào. Xem _dcFace().
        _access: { state: true },
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.x = '99%'; this.y = '65%'
        this.types = ''
        this.division = 'ecommerce.consult'
        this.owner = ''
        this.site = ''
        this.embedded = false
        this.command = null
        this.trial = false
        this.follow = FOLLOW_SEC
        this._followTimer = null // setTimeout id của lần hỏi lại kế tiếp — xem _dfArmFollow()
        this._division  = null
        this._log        = []
        this._draft      = ''
        this._busy       = false
        this._visitorId  = ''
        this._stage      = 'answering'
        this._stageIdx   = 0
        this._stageTimer = null // setInterval id — không phải reactive state, xem _dfPostGuest()
        this._manage     = false
        this._canManage  = false
        this._logKey     = '' // khoá IndexedDB của lịch sử đang hiện — '' = chưa biết là ai (chưa tải xong)
        this._offOwner   = null
        this._access     = 'ok'
        this._ready      = Promise.resolve() // face + lịch sử đã tải — lệnh từ ngoài chờ nó, kẻo lịch sử tải sau đè mất
    }

    async connectedCallback() {
        super.connectedCallback()
        this._visitorId = this._dcVisitorId()
        cacheRemove(_legacyKey(this._visitorId)) // bản cũ không tách tài khoản, không hạn — bỏ hẳn
        this._offOwner = onOwnerChange(() => {
            this._dcLoadLog()
            this._dcPerms()
            this._dcReface() // đăng nhập/đăng xuất: chủ hub / admin luôn được dùng, khách thì theo Worker
        })
        this._dcPerms()
        this._ready = (async () => {
            await this._dcReface()
            await this._dcLoadLog()
        })()
        await this._ready
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._offOwner?.()
        this._offOwner = null
        this._dfStopFollow()
    }

    willUpdate(changed) {
        // Phòng Tư vấn khác (ngành khác) → lịch sử riêng của phòng đó
        if (changed.has('division') && changed.get('division') !== undefined && this.isConnected) this._dcLoadLog()
        const reowned = ['owner', 'site'].some((k) => changed.has(k) && changed.get(k) !== undefined)
        if (reowned && this.isConnected) {
            this._dcPerms()
            this._dcReface()
            this._dcLoadLog() // kho khác → lịch sử khác (_logKey scope)
        }
        if (changed.has('command')) this._dhCommand()
        if (changed.has('follow') && changed.get('follow') !== undefined && this.isConnected) this._dfArmFollow()
    }

    // Nút ⚙ (quản lý phòng ban + kho kiến thức) chỉ cho người đăng nhập quản lý được trợ lý này: admin, người có quyền
    // `know`, hoặc chủ của nó — `owner` trống (hub của chính họ, kể cả người vừa mua gói chưa có hub, cần nút "Kích hoạt
    // MCP") hoặc đúng id của họ. Khách vãng lai trên site nhúng (owner gán cứng, chưa đăng nhập) không thấy. Chỉ là giao
    // diện — Worker vẫn kiểm từng lệnh ghi.
    async _dcPerms() {
        const user = await auth.get().catch(() => null)
        if (user?.status !== 'active') {
            this._canManage = false
            this._manage = false
            return
        }
        const { roles, isAdmin } = parseRoles(user)
        // site="…" không owner = kho chung của site nền tảng → chỉ admin / quyền `know`, không phải "hub của chính mình".
        this._canManage = isAdmin || hasAccess(roles, 'know') || (!this.owner && !this.site) || this.owner === user.id
        if (!this._canManage) this._manage = false
    }

    // Lịch sử của ĐÚNG người đang dùng (tài khoản, không thì khách) ở phòng này, chỉ 7 ngày gần nhất.
    async _dcLoadLog() {
        const user = await auth.get().catch(() => null)
        const scope = this.owner ? `o:${this.owner}` : this._site ? `s:${this._site}` : 'auto'
        const key = _logKey(canonicalDivision(this.division), scope, user?.id ? `u:${user.id}` : `v:${this._visitorId}`)
        this._logKey = key
        const log = _fresh(await cacheGet(key))
        if (this._logKey !== key) return // đã đổi người/phòng lần nữa trong lúc đọc
        this._log = log
        this._draft = ''
        this._dfArmFollow() // lịch sử khác → hẹn hỏi lại theo lịch sử đó (quá giờ thì bỏ)
    }

    // Face + quyền chạy: owner gán cứng thì ẩn tới khi Worker trả lời (không nháy nút rồi mới ẩn); owner tự động (hub
    // của chính người đăng nhập, hoặc kiến thức chung) không bao giờ bị từ chối nên hiện ngay.
    async _dcReface() {
        const owner = this.owner, site = this.site
        // site="…" trên 1 trang không phải site đó (thẻ bị copy đi) → ẩn ngay, không hỏi Worker; Worker vẫn chặn lần nữa.
        if (this._site && !this._onSite()) return this._dhDenied('hub_domain')
        if (owner) this._access = 'pending'
        const face = await this._dcFace()
        if (owner === this.owner && site === this.site) this._division = face // owner/site đổi trong lúc chờ → lượt sau ghi
    }

    /** Owner gửi lên Worker — xem service/hub.js resolveOwner (site="…" không owner = '@<host>', kho riêng của site). */
    _owner() { return resolveOwner(this.owner, this._site) }

    /** `site` chuẩn hoá (chữ thường, bỏ www.) — '' khi không khai hoặc đã có `owner`. */
    get _site() { return this.owner ? '' : siteHost(this.site) }

    /** Trang hiện tại có phải `site` không (localhost luôn coi là đúng — chạy thử trước khi deploy). */
    _onSite() { return onLocalHost() || siteHost(location.host) === this._site }

    _dhDenied(code) {
        if (this._access !== code) console.warn(`[llm/svc-aide] hidden on this site — ${code} (owner ${this.owner}): see the assistant settings → Load from API & MCP.`)
        this._access = code
        this._manage = false
    }

    // Tên/avatar của phòng Tư vấn (face) — persona ở Worker, không bao giờ về trình duyệt. Cũng là lượt hỏi quyền đầu
    // tiên: Worker từ chối owner cho trang này (hubDenied) → trợ lý ẩn hẳn.
    async _dcFace() {
        const id = canonicalDivision(this.division)
        const res = await fnApi.sectors(await this._owner())
        if (hubDenied(res)) this._dhDenied(res.code)
        else {
            this._access = 'ok'
            if (!res.ok) console.error('[llm/svc-aide] failed to load the division face:', res.message)
        }
        const fn = res.ok ? findFunction(res.data, id) : null
        return {
            id, kind: fn?.kind || 'chat', title: fn ? displayTitle(fn, this.lang) : '', description: fn ? displayAbout(fn, this.lang) : '',
            pics: fn?.pics || '', status: fn?.status || 'active',
        }
    }

    // Khách vãng lai không có tài khoản — 1 id ngẫu nhiên cache localStorage, sống xuyên suốt các
    // lượt ghé thăm SAU của cùng trình duyệt (không định danh cross-device, đủ dùng cho MVP).
    _dcVisitorId() {
        try {
            let id = localStorage.getItem(VISITOR_KEY)
            if (!id) { id = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, id) }
            return id
        } catch {
            return crypto.randomUUID() // localStorage bị chặn (private mode...) — vẫn chạy được, chỉ mất lịch sử qua lần ghé sau
        }
    }

    updated(changed) {
        if (changed.has('_log')) this._scrollToBottom()
    }

    _scrollToBottom() {
        const el = this.shadowRoot?.querySelector('.aid-messages')
        if (el) el.scrollTop = el.scrollHeight
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhInput(e) { this._draft = e.detail.value }
    _dhKeydown(e) { if (e.key === 'Enter' && !e.isComposing) this._dhSend() }

    // Câu hỏi từ <svc-ask> — đang chờ trả lời lượt trước thì nó nằm lại trong ô nhập, khách tự gửi sau.
    async _dhCommand() {
        const content = takeCommand(this.command)
        if (!content) return
        await this._ready
        this._manage = false
        this._draft = content
        this._dhSend()
    }

    _dhSend() {
        if (this._busy) return
        const content = (this._draft || '').trim().slice(0, QUESTION_MAX)
        if (!content) return
        this._draft = ''
        this._dfPostGuest(content)
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    // Lưu toàn bộ _log hiện tại vào IndexedDB — gọi lại sau mỗi lần _log đổi để history sống sót
    // qua reload/đóng-mở lại popover trong phiên (khách vãng lai, không tài khoản).
    async _dfPersistLog(key = this._logKey) {
        if (!key) return
        this._log = _fresh(this._log)
        await cacheSet(key, this._log)
    }

    async _dfPostGuest(content) {
        const now = Date.now()
        const doc = { id: crypto.randomUUID(), visitorId: this._visitorId, from: 'guest', content, created_at: now, updated_at: now }
        // Bỏ các dòng lỗi-mặc-định (errGeneric fallback của lượt trước) và câu hỏi lại soạn sẵn (không mang thông tin) — đưa
        // vào history chỉ làm AI bối rối / lặp lại.
        const history = this._log.filter(m => !m.error && !m.follow).slice(-6).map(m => ({ from: m.from === 'guest' ? 'guest' : 'aide', content: m.content }))
        const key = this._logKey // lượt này thuộc người/phòng lúc gửi — đổi tài khoản giữa chừng thì câu trả lời bỏ đi
        this._dfStopFollow() // khách nhắn → dừng lần hỏi lại đang hẹn
        this._log = [...this._log, doc]
        await this._dfPersistLog(key)
        this._busy = true
        this._dfStage('retrieving')
        this._stageTimer = setInterval(() => { this._stageIdx++ }, STAGE_ROTATE_MS)
        const stageTimers = [setTimeout(() => this._dfStage('answering'), STAGE_ANSWER_MS), setTimeout(() => this._dfStage('retrying'), STAGE_RETRY_MS)]
        try {
            const types = this.types ? this.types.split('|').filter(Boolean) : undefined
            const res = await fnApiFor(this.trial).aide({
                division: this._division?.id || canonicalDivision(this.division), content, history,
                owner: await this._owner(), types, lang: this.lang,
            })
            if (hubDenied(res)) return this._dhDenied(res.code) // hết hạn / đổi site giữa chừng — ẩn, không ghi lượt lỗi
            if (!res.ok) throw new Error(res.message)
            if (res.data.lang) this.lang = pickLang({ vi: 'vi', en: 'en' }, res.data.lang)
            const replyNow = Date.now()
            const reply = {
                id: crypto.randomUUID(), visitorId: this._visitorId, from: 'aide',
                content: res.data.reply || this._txt.errGeneric,
                // Nguồn = tiêu đề các dòng Worker đã lấy làm bằng chứng — không hỏi AI tự báo citation.
                sources: res.data.sources ?? [],
                created_at: replyNow, updated_at: replyNow,
            }
            // Worker trả 200 nhưng reply rỗng — cùng đánh dấu như lượt lỗi (catch bên dưới), loại khỏi history.
            if (!res.data.reply) reply.error = true
            if (this._logKey !== key) return
            this._log = [...this._log, reply]
            await this._dfPersistLog(key)
            this._dfArmFollow()
        } catch (err) {
            // err?.message (không err.message trần) — lỗi tới đây có thể KHÔNG phải Error thật.
            console.error('[llm/svc-aide] reply failed:', err?.message ?? err)
            if (this._logKey !== key) return
            const at = Date.now()
            const fallback = { id: crypto.randomUUID(), visitorId: this._visitorId, from: 'aide', content: this._txt.errGeneric, error: true, created_at: at, updated_at: at }
            this._log = [...this._log, fallback]
            await this._dfPersistLog(key)
        } finally {
            this._busy = false
            clearInterval(this._stageTimer)
            stageTimers.forEach(clearTimeout)
            this._stageTimer = null
        }
    }

    _dfStage(stage) {
        this._stage = stage
        this._stageIdx = 0
    }

    _dfStopFollow() {
        clearTimeout(this._followTimer)
        this._followTimer = null
    }

    /**
     * Hẹn lần hỏi lại kế tiếp theo _log hiện tại: tin cuối là câu trả lời thật của trợ lý (không lỗi; câu hỏi lại trước cũng
     * tính) và hôm nay chưa hỏi đủ FOLLOW_MAX lần. Lần n (0, 1, 2 — đếm cả ngày) chờ `follow` · 2^n giây kể từ tin cuối; khách
     * vừa xen ngang (chưa hỏi lại lần nào sau tin của khách) mà hôm nay đã hỏi → chờ ≥ FOLLOW_RESUME_MS. Tới giờ: tin cuối
     * vẫn là tin đó (khách chưa nhắn, chưa đổi lịch sử) mới gửi; tab ẩn / đang chờ AI → hoãn FOLLOW_RETRY_MS.
     */
    _dfArmFollow() {
        this._dfStopFollow()
        const sec = Number(this.follow) || 0
        const last = this._log.at(-1)
        if (sec <= 0 || this._access !== 'ok' || !last || last.from !== 'aide' || last.error) return
        const dayStart = new Date().setHours(0, 0, 0, 0)
        const today = this._log.filter(m => m.follow && m.created_at >= dayStart).length
        if (today >= FOLLOW_MAX) return
        const since = this._log.slice(this._log.findLastIndex(m => m.from === 'guest') + 1).filter(m => m.follow).length
        const wait = sec * 1000 * 2 ** today
        const due = Number(last.created_at) + (today > 0 && since === 0 ? Math.max(FOLLOW_RESUME_MS, wait) : wait)
        if (due < Date.now() - FOLLOW_STALE_MS) return
        const key = this._logKey
        const fire = () => {
            this._followTimer = null
            if (this._logKey !== key || this._log.at(-1) !== last) return
            if (this._busy || document.visibilityState === 'hidden') { this._followTimer = setTimeout(fire, FOLLOW_RETRY_MS); return }
            // Theo ngôn ngữ khách đang chat (_chatLang); txt riêng không khai follow → mẫu chuẩn
            const lang = _chatLang(this._log, this.lang)
            const steps = txtLingo(this.txt, TXT_STD, lang).follow ?? (TXT_STD[lang] ?? TXT_STD.vi).follow
            const options = steps?.[today] ?? []
            const content = options[Math.floor(Math.random() * options.length)]
            if (!content) return // để trống câu lần n = dừng chuỗi ở đó
            const at = Date.now()
            this._log = [...this._log, { id: crypto.randomUUID(), visitorId: this._visitorId, from: 'aide', content, follow: true, created_at: at, updated_at: at }]
            this._dfPersistLog(key).then(() => this._dfArmFollow())
        }
        this._followTimer = setTimeout(fire, Math.max(0, due - Date.now()))
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (this._access !== 'ok') return nothing
        return this.embedded ? this._rbPanel() : html`
            <web-popover ui=${this.ui} theme=${this.theme} lang=${this.lang} placement="top-end" placementGap="0" fullscreen>
                <web-fab slot="trigger" icon=${CONSULT_ICON} size="lg" rounded="50%" x=${this.x} y=${this.y} movable ui="modern" theme=${this.theme}></web-fab>
                ${this._rbPanel()}
            </web-popover>
        `
    }

    _rbPanel() {
        if (this._manage) return html`
            <div class="aid-panel">
                <svc-division class="aid-division" closable division=${this.division} owner=${this.owner} site=${this.site} .value=${this._division}
                    ui=${this.ui} theme=${this.theme} lang=${this.lang}
                    @division-close=${() => (this._manage = false)}
                    @division-change=${(e) => (this._division = e.detail.division)}></svc-division>
            </div>
        `
        return html`
            <div class="aid-panel">
                <div class="aid-head">
                    <div class="aid-head-id">
                        <iconify-icon class="aid-head-icon" icon=${CONSULT_ICON}></iconify-icon>
                        <span class="aid-title">${this._division?.title || this._txt.panelTitle}</span>
                    </div>
                    ${this._canManage ? html`
                        <button class="aid-head-btn" type="button" title=${this._txt.manage} aria-label=${this._txt.manage}
                            @click=${() => (this._manage = true)}>
                            <iconify-icon icon="ri:settings-4-line"></iconify-icon>
                        </button>` : ''}
                </div>
                <div class="aid-messages">
                    ${!this._log.length ? html`<div class="aid-empty">${this._txt.empty}</div>` : ''}
                    ${this._log.map(m => this._rfMessage(m))}
                    ${this._busy ? this._rfTyping() : ''}
                </div>
                <div class="aid-composer">
                    <web-text placeholder=${this._txt.placeholder} .value=${this._draft} height="36px" ?disabled=${this._busy}
                        maxlength=${QUESTION_MAX} @input=${this._dhInput} @keydown=${this._dhKeydown}></web-text>
                    <web-button type="soft" color="primary" height="36px" square rounded="50%" ?loading=${this._busy} ?disabled=${this._busy}
                        @click=${this._dhSend}>
                        <iconify-icon icon="ri:send-plane-2-fill" width="18"></iconify-icon>
                    </web-button>
                </div>
            </div>
        `
    }

    _rfMessage(m) {
        const mine = m.from === 'guest'
        return html`
            <div class="aid-msg ${mine ? 'mine' : ''}">
                ${!mine ? html`<web-avatar src=${this._division?.pics || ''} icon=${CONSULT_ICON} name=${this._division?.title || ''} size="26px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>` : ''}
                <div class="aid-bubble">
                    <p class="aid-content">${m.content}</p>
                    ${m.sources?.length ? html`<p class="aid-sources">${this._txt.sourcesPrefix}: ${m.sources.join(', ')}</p>` : ''}
                </div>
            </div>
        `
    }

    _rfTyping() {
        const variants = this._txt.thinkingStages[this._stage] || this._txt.thinkingStages.answering
        const text = variants[this._stageIdx % variants.length]
        return html`
            <div class="aid-msg">
                <web-avatar src=${this._division?.pics || ''} icon=${CONSULT_ICON} name=${this._division?.title || ''} size="26px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="aid-bubble"><p class="aid-content aid-typing">${text}</p></div>
            </div>
        `
    }
}

// Tag name 'svc-aide' — consistent prefix with this domain's other custom elements
// (svc-talk/progress/review), reducing future collision risk with any other domain's widget.
if (!customElements.get('svc-aide')) customElements.define('svc-aide', SvcAide)
export default SvcAide
