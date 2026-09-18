// src/webs/llm/svc-aide.js
//
// <svc-aide> — trợ lý hỏi-đáp tri thức đa lĩnh vực (luật/sản phẩm/y khoa/kỹ thuật/tài chính/FAQ...)
// cho KHÁCH VÃNG LAI (guest, không cần đăng nhập), UX clone từ src/webs/division/svc-sale.js
// (fab+popover, lịch sử chat IndexedDB, 1 lượt hỏi-đáp trực tiếp mỗi lần) — nhưng kiến thức đọc từ
// schema MỚI hoàn toàn `know`/`rel` (D1/LLM_DB) qua semantic search THẬT (Cloudflare Vectorize +
// Workers AI embedding, xem hook/knowledge_database_cloudflare_d1_vectorize.md), KHÔNG dùng lại
// kiến trúc `mind`/services/mind.js cũ. Retrieval chạy server-side (`POST /v1/search`, xem
// worker/packages/llm-worker/src/search.ts) — component này KHÔNG tự tải `know`/`rel` về nữa, chỉ gửi câu hỏi lên.
//
// ĐÃ THAY THẾ division/svc-sale.js trên CoreShop.astro (storefront) — file đó vẫn còn trong code
// (không xoá, có thể tự mount lại nơi khác nếu cần) nhưng không còn được mount ở đâu. Prop
// `division` (mặc định 'aide') chọn chuyên môn/persona đọc từ bảng `divisions` — CoreShop.astro
// dùng `division="sale"` (tools/seed-sale.js) để có persona tư vấn bán hàng; nơi khác dùng mặc định
// 'aide' cho persona trợ lý tri thức chung.
//
// KHÁC svc-sale.js ở 1 điểm cố ý, GIỮ NGUYÊN kể cả khi division="sale": đây là 1 engine hỏi-đáp
// CHUNG, KHÔNG có lead-capture/extractPhone/hotline — không tự nhận diện số điện thoại khách để
// lại hay tự lưu vào `customers`. Nếu cần lead-capture thật (như svc-sale.js cũ từng có), nên thêm
// dưới dạng tính năng opt-in phía trên nền tảng này, không hardcode vào engine chung — xem
// tools/aide-engine.js's header.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-fab.js'
import '@/webs/apex/web-popover.js'
import '@/webs/apex/web-avatar.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import { createService } from '@/services/crud.js'
import { llmJson } from '@/services/api.js'
import Storager from '@/services/storager.js'
import { txtLingo, pickLang } from '@/services/helper.js'
import { LLM_DB } from './tools/server.js'
import { resolveAi } from './tools/engine.js'
import { decideAideReply } from './tools/aide-engine.js'
import { AIDE_DIVISION_SEED } from './tools/seed-aide.js'
import { SALE_DIVISION_SEED } from './tools/seed-sale.js'
import styles from './styles/svc-aide.css?inline'

const VISITOR_KEY = 'aide-visitor-id'
const _logKey = (visitorId) => `aide-chats-${visitorId}`

// Chuyên môn CHỌN ĐƯỢC qua prop `division` (mặc định 'aide') — mỗi entry seed 1 lần vào bảng
// `divisions` (D1) nếu chưa tồn tại, giống DEFAULT_SEEDS's cơ chế ở llm/svc-talk.js. 'sale' dùng
// CHUNG widget/engine này (không có lead-capture riêng, xem tools/seed-sale.js's header) — chỉ đổi
// persona/role đọc bởi tools/aide-engine.js's decideAideReply().
const DIVISION_SEEDS = { aide: AIDE_DIVISION_SEED, sale: SALE_DIVISION_SEED }

// Rotation interval (ms) between filler variants WITHIN the same stage — see _rfTyping()/
// _dfPostGuest()'s stageTimer, same UX contract as division/svc-sale.js's STAGE_ROTATE_MS.
const STAGE_ROTATE_MS = 2500

const TXT_STD = {
    vi: {
        panelTitle: 'Trợ lý tri thức',
        placeholder: 'Hỏi gì đó…',
        empty: 'Chào bạn! Có gì cần hỏi cứ hỏi thoải mái nhé.',
        thinkingStages: {
            retrieving: ['🔎 Đang tìm thông tin liên quan…', '🔎 Đang tra cứu kiến thức…'],
            answering:  ['✍️ Đang soạn câu trả lời…', '✍️ Sắp xong rồi nha…'],
            retrying:   ['🔁 Đang thử lại để trả lời chính xác hơn…', '🔁 Đợi mình chỉnh lại câu trả lời chút nhé…'],
        },
        errGeneric: 'Có lỗi xảy ra, thử lại giúp mình nhé',
        sourcesPrefix: 'Nguồn',
    },
    en: {
        panelTitle: 'Knowledge assistant',
        placeholder: 'Ask something…',
        empty: 'Hi there! Feel free to ask anything.',
        thinkingStages: {
            retrieving: ['🔎 Looking up relevant info…', '🔎 Checking the knowledge base…'],
            answering:  ['✍️ Writing a reply…', '✍️ Almost there…'],
            retrying:   ['🔁 Trying again for a better answer…', '🔁 Give me a moment to refine that…'],
        },
        errGeneric: 'Something went wrong, please try again',
        sourcesPrefix: 'Source',
    },
}

export class SvcAide extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object },
        // Forward cho <web-fab> nội bộ — cùng cơ chế x/y đã dùng bởi svc-pay-warden.js/
        // svc-pay-stats.js/svc-cart.js/division's svc-sale.js, để nơi mount tự xếp fab này đúng vị
        // trí trong cùng 1 stack fab-nổi-cố-định thay vì hardcode ngay trong component.
        x: { type: String },
        y: { type: String },
        // Lọc theo know.type — '|'-joined (vd "law|faq"), '' = mọi loại. Cho phép 1 lần triển khai
        // scope trợ lý này vào 1 tập domain cụ thể mà không cần đổi code, chỉ đổi attribute.
        types: { type: String },
        // Chuyên môn (doc id trong bảng `divisions`) — mặc định 'aide' (trợ lý tri thức chung),
        // đổi sang 'sale' để dùng persona tư vấn bán hàng (xem DIVISION_SEEDS) — vd CoreShop.astro
        // mount <svc-aide division="sale"> thay cho division/svc-sale.js cũ.
        division: { type: String },

        _division: { state: true },
        _log:      { state: true }, // chat entries, sorted created_at asc — cached in IndexedDB via Storager, see _dfPersistLog()
        _draft:    { state: true },
        _busy:     { state: true }, // đang chờ AI trả lời lượt vừa gửi — disable composer tránh gửi chồng
        _stage:    { state: true }, // 'retrieving' | 'answering' | 'retrying' — xem tools/aide-engine.js's onStage
        _stageIdx: { state: true }, // luân phiên biến thể text trong cùng 1 stage, xem _rfTyping()
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.x = '99%'; this.y = '65%'
        this.types = ''
        this.division = 'aide'
        this._division  = null
        this._log        = []
        this._draft      = ''
        this._busy       = false
        this._visitorId  = ''
        this._stage      = 'answering'
        this._stageIdx   = 0
        this._stageTimer = null // setInterval id — không phải reactive state, xem _dfPostGuest()
    }

    async connectedCallback() {
        super.connectedCallback()
        this._visitorId = this._dcVisitorId()
        try {
            this._division = await this._dcEnsureDivision()
        } catch (err) {
            console.error('[llm/svc-aide] failed to load division:', err.message)
            this._division = { id: this.division, ...(DIVISION_SEEDS[this.division] || AIDE_DIVISION_SEED) }
        }
        this._log = await Storager.get(_logKey(this._visitorId), [])
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

    async _dcEnsureDivision() {
        const svc = createService('divisions', '', LLM_DB)
        const existing = await svc.findById(this.division)
        if (existing) return existing
        const seed = DIVISION_SEEDS[this.division] || AIDE_DIVISION_SEED
        const now = await svc.now()
        const doc = { ...seed, created_at: now, updated_at: now, deleted_at: null, index: 0 }
        await svc.set(this.division, doc)
        return { id: this.division, ...doc }
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

    _dhSend() {
        if (this._busy) return
        const content = (this._draft || '').trim()
        if (!content) return
        this._draft = ''
        this._dfPostGuest(content)
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    // Lưu toàn bộ _log hiện tại vào IndexedDB (Storager, TTL mặc định 1 ngày) — gọi lại sau mỗi
    // lần _log đổi để history sống sót qua reload/đóng-mở lại popover trong ngày, KHÔNG cần giữ
    // mãi (khách vãng lai, không tài khoản) — cùng cơ chế division/svc-sale.js's _dfPersistLog.
    async _dfPersistLog() {
        await Storager.set(_logKey(this._visitorId), this._log)
    }

    async _dfPostGuest(content) {
        const now = Date.now()
        const doc = { id: crypto.randomUUID(), visitorId: this._visitorId, from: 'guest', content, created_at: now, updated_at: now }
        this._log = [...this._log, doc]
        await this._dfPersistLog()
        this._busy = true
        this._stage = 'retrieving'
        this._stageIdx = 0
        this._stageTimer = setInterval(() => { this._stageIdx++ }, STAGE_ROTATE_MS)
        try {
            const recentHistory = this._log
                .slice(-6)
                .map(m => ({ author: m.from === 'guest' ? 'Visitor' : (this._division?.title || 'Aide'), content: m.content }))
            const ai = resolveAi(this._division?.ai)
            const types = this.types ? this.types.split('|').filter(Boolean) : undefined
            // Semantic search — server-side Vectorize + `rel` expansion, see worker/packages/llm-worker/src/search.ts.
            // Replaces the old client-side keyword scorer (tools/know-retrieval.js, deleted) — no
            // longer loads the whole `know`/`rel` tables into every guest's browser.
            const { evidence } = await llmJson('/v1/search', { method: 'POST', body: { query: content, types, limit: 5, maxExtra: 3 } })
            const onStage = (stage) => { this._stage = stage; this._stageIdx = 0 }
            const result = await decideAideReply(ai, this._division, evidence, recentHistory, content, this.lang, onStage)
            if (result.lang) this.lang = pickLang({ vi: 'vi', en: 'en' }, result.lang)
            const replyNow = Date.now()
            const reply = {
                id: crypto.randomUUID(), visitorId: this._visitorId, from: 'aide',
                content: result.reply || this._txt.errGeneric,
                // Nguồn hiển thị đọc THẲNG từ evidence (dữ liệu đã lấy), không hỏi AI tự báo cáo
                // citation — xem tools/aide-engine.js's header, đáng tin hơn.
                sources: evidence.map(e => e.title).filter(Boolean),
                created_at: replyNow, updated_at: replyNow,
            }
            this._log = [...this._log, reply]
            await this._dfPersistLog()
        } catch (err) {
            // err?.message (không err.message trần) — lỗi tới đây có thể KHÔNG phải Error thật, xem
            // division/svc-sale.js's cùng cảnh báo tại vị trí tương đương.
            console.error('[llm/svc-aide] reply failed:', err?.message ?? err)
            const fallback = { id: crypto.randomUUID(), visitorId: this._visitorId, from: 'aide', content: this._txt.errGeneric }
            this._log = [...this._log, fallback]
            await this._dfPersistLog()
        } finally {
            this._busy = false
            clearInterval(this._stageTimer)
            this._stageTimer = null
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        return html`
            <web-popover ui=${this.ui} theme=${this.theme} lang=${this.lang} placement="top-end" placementGap="0" fullscreen>
                <web-fab slot="trigger" icon="ri:customer-service-2-line" size="lg" rounded="50%" x=${this.x} y=${this.y} movable ui="modern" theme=${this.theme}></web-fab>
                <div class="aid-panel">
                    <div class="aid-head">
                        <div class="aid-head-id">
                            <web-avatar src=${this._division?.pics || ''} icon="ri:customer-service-2-line" name=${this._division?.title || this._txt.panelTitle} size="26px"
                                ui=${this.ui} theme=${this.theme}></web-avatar>
                            <span class="aid-title">${this._division?.title || this._txt.panelTitle}</span>
                        </div>
                    </div>
                    <div class="aid-messages">
                        ${!this._log.length ? html`<div class="aid-empty">${this._txt.empty}</div>` : ''}
                        ${this._log.map(m => this._rfMessage(m))}
                        ${this._busy ? this._rfTyping() : ''}
                    </div>
                    <div class="aid-composer">
                        <web-text placeholder=${this._txt.placeholder} .value=${this._draft} height="36px" ?disabled=${this._busy}
                            @input=${this._dhInput} @keydown=${this._dhKeydown}></web-text>
                        <web-button type="soft" color="primary" height="36px" square rounded="50%" ?loading=${this._busy} ?disabled=${this._busy}
                            @clicked=${this._dhSend}>
                            <iconify-icon icon="ri:send-plane-2-fill" width="18"></iconify-icon>
                        </web-button>
                    </div>
                </div>
            </web-popover>
        `
    }

    _rfMessage(m) {
        const mine = m.from === 'guest'
        return html`
            <div class="aid-msg ${mine ? 'mine' : ''}">
                ${!mine ? html`<web-avatar src=${this._division?.pics || ''} icon="ri:customer-service-2-line" name=${this._division?.title || ''} size="26px"
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
                <web-avatar src=${this._division?.pics || ''} icon="ri:customer-service-2-line" name=${this._division?.title || ''} size="26px"
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
