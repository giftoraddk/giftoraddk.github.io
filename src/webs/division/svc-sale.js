// src/webs/division/svc-sale.js
//
// <svc-sale> — chat AI "Tư vấn & CSKH" cho KHÁCH VÃNG LAI (guest, không cần đăng
// nhập) trên storefront đơn Shop.astro — khác hẳn svc-talk.js (nội bộ, sếp<->các phòng ban AI,
// nhiều bước pipeline) VÀ svc-chat.js (domain chat P2P giữa 2 người dùng thật trong webs/bay). Ở
// đây chỉ có 1 lượt hỏi-đáp trực tiếp mỗi lần (tools/sale-engine.js — gần giống tools/chatter.js,
// KHÔNG chạy pipeline nhiều bước như tools/engine.js vì không hợp hội thoại trực tiếp).
//
// Danh tính (tên/avatar/model AI riêng) đọc từ 1 doc `divisions` (id 'sale', tools/seed-sale.js) —
// tái dùng UI chỉnh sẵn có ở /admin/divisions, KHÔNG dùng meta.steps/pipeline của division đó.
//
// Khách vãng lai không có tài khoản -> định danh qua `visitorId` (crypto.randomUUID(), cache
// localStorage) — lịch sử chat lưu ở collection RIÊNG `saleChats` (không dùng chung `talks` — khác
// hẳn ngữ nghĩa "job pipeline" của talks, ở đây chỉ là lượt chat phẳng).
//
// Kiến thức sản phẩm/kinh doanh đọc từ collection `mind` — sống trong project Firestore RIÊNG
// (server:'llm', env PUBLIC_DB_LLM — xem hook/CRUD.rst, tools/mind-sync.js) đồng bộ tự động từ
// `products`/`posts`, cộng thêm entry nhập tay/CSV ngoài qua /admin/mind — load 1 lần lúc mở,
// shortlist theo từ khoá + metadata/temporal/authority mỗi lượt hỏi (services/mind.js qua
// tools/sale-engine.js's shortlistMind).
//
// Lead capture: khách để lại số điện thoại (tools/sale-engine.js's extractPhone, regex thuần —
// KHÔNG qua AI) -> _dfSaveCustomer() lưu vào collection `customers` (cùng project 'llm' với
// `mind`) + trả lời kèm hotline cố định từ `divisions.hotline` (đọc từ /admin/divisions) — xem
// hook/SALE.rst.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-fab.js'
import '@/webs/apex/web-popover.js'
import '@/webs/apex/web-avatar.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import { createService } from '@/services/crud.js'
import { txtLingo, pickLang } from '@/services/helper.js'
import { resolveAi } from './tools/engine.js'
import { decideSaleReply, shortlistMind, extractPhone } from './tools/sale-engine.js'
import { SALE_DIVISION_SEED } from './tools/seed-sale.js'
import { MIND_SERVER } from './tools/mind-sync.js'
import styles from './styles/svc-sale.css?inline'

const VISITOR_KEY = 'sale-visitor-id'

const TXT_STD = {
    vi: {
        panelTitle: 'Hỗ trợ & tư vấn',
        placeholder: 'Hỏi gì đó về sản phẩm…',
        empty: 'Chào bạn! Có gì cần tư vấn cứ hỏi thoải mái nhé.',
        thinking: '🕒 Đang xử lý, đợi mình xíu nha!',
        errGeneric: 'Có lỗi xảy ra, thử lại giúp mình nhé',
        wantsHumanHint: '💬 Sẽ có nhân viên liên hệ thêm với bạn nhé',
        leadHotline: (hotline) => `Bạn có thể gọi ngay hotline ${hotline} để được tư vấn nhanh nhất, hoặc cứ yên tâm chờ nhé — bên mình sẽ liên hệ lại với bạn trong thời gian sớm nhất.`,
        leadNoHotline: 'Bên mình sẽ liên hệ lại với bạn trong thời gian sớm nhất nhé.',
    },
    en: {
        panelTitle: 'Support & advice',
        placeholder: 'Ask something about our products…',
        empty: 'Hi there! Feel free to ask anything.',
        thinking: '🕒 Let me check that for you…',
        errGeneric: 'Something went wrong, please try again',
        wantsHumanHint: '💬 A team member will follow up with you',
        leadHotline: (hotline) => `Feel free to call our hotline ${hotline} right away for the fastest support, or simply wait — our team will reach out to you shortly.`,
        leadNoHotline: 'Our team will reach out to you shortly.',
    },
}

export class SvcSale extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object },
        // Forward cho <web-fab> nội bộ — cùng cơ chế x/y đã dùng bởi svc-pay-warden.js/
        // svc-pay-stats.js/svc-cart.js, để nơi mount (CoreShop.astro) tự xếp fab này đúng vị trí
        // trong cùng 1 stack fab-nổi-cố-định thay vì hardcode ngay trong component.
        x: { type: String },
        y: { type: String },

        _division: { state: true },
        _log:      { state: true }, // saleChats docs, sorted created_at asc
        _draft:    { state: true },
        _busy:     { state: true }, // đang chờ AI trả lời lượt vừa gửi — disable composer tránh gửi chồng
        _mind:     { state: true }, // toàn bộ entry active của collection `mind`, load 1 lần lúc mở
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.x = '99%'; this.y = '65%'
        this._division  = null
        this._log        = []
        this._draft      = ''
        this._busy       = false
        this._mind       = []
        this._visitorId  = ''
    }

    async connectedCallback() {
        super.connectedCallback()
        this._visitorId = this._dcVisitorId()
        try {
            this._division = await this._dcEnsureDivision()
        } catch (err) {
            console.error('[svc-sale] failed to load division:', err.message)
            this._division = { id: 'sale', ...SALE_DIVISION_SEED }
        }
        try {
            this._mind = await createService('mind', '', 'llm').findAll({ sortBy: 'updated_at', order: 'desc' })
        } catch (err) {
            console.error('[svc-sale] failed to load mind:', err.message)
            this._mind = []
        }
        try {
            this._log = await createService('saleChats').findAll({ filters: { visitorId: this._visitorId }, sortBy: 'created_at', order: 'asc' })
        } catch (err) {
            console.error('[svc-sale] failed to load sale chat history:', err.message)
            this._log = []
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

    async _dcEnsureDivision() {
        const svc = createService('divisions')
        const existing = await svc.findById('sale')
        if (existing) return existing
        const now = await svc.now()
        const doc = { ...SALE_DIVISION_SEED, created_at: now, updated_at: now, deleted_at: null, index: 0 }
        await svc.set('sale', doc)
        return { id: 'sale', ...doc }
    }

    updated(changed) {
        if (changed.has('_log')) this._scrollToBottom()
    }

    _scrollToBottom() {
        const el = this.shadowRoot?.querySelector('.sal-messages')
        if (el) el.scrollTop = el.scrollHeight
    }

    _dhClose() {
        const pop = this.shadowRoot?.querySelector('web-popover')
        if (pop) pop.open = false
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

    async _dfPostGuest(content) {
        const svc = createService('saleChats')
        const now = await svc.now()
        const doc = await svc.create({ visitorId: this._visitorId, from: 'guest', content, created_at: now, updated_at: now })
        this._log = [...this._log, doc]
        this._busy = true
        try {
            const recentHistory = this._log
                .slice(-6)
                .map(m => ({ author: m.from === 'guest' ? 'Visitor' : (this._division?.title || 'Sale'), content: m.content }))
            const ai = resolveAi(this._division?.ai)
            const shortlist = shortlistMind(this._mind, content)
            // Lead capture — regex DETERMINISTIC trên tin nhắn thật (KHÔNG qua AI, xem
            // tools/sale-engine.js's extractPhone) trước khi hỏi AI, để prompt biết mở rộng schema
            // JSON xin thêm customerName/topic đúng lượt này.
            const phone = extractPhone(content)
            const result = await decideSaleReply(ai, shortlist, recentHistory, content, this.lang, phone)
            if (result.lang) this.lang = pickLang({ vi: 'vi', en: 'en' }, result.lang)
            // Khách vừa để lại số điện thoại — coi như CHẮC CHẮN muốn người thật hỗ trợ (tín hiệu rõ
            // ràng hơn hẳn AI tự đoán wantsHuman), và nối thêm template hotline CỐ ĐỊNH (không để AI
            // tự nhắc — số hotline là 1 fact không được sai/quên, xem _buildSalePrompt's leadNote).
            let replyContent = result.reply || this._txt.errGeneric
            let wantsHuman = result.wantsHuman
            if (phone) {
                wantsHuman = true
                const hotline = (this._division?.hotline || '').trim()
                replyContent = `${replyContent}\n\n${hotline ? this._txt.leadHotline(hotline) : this._txt.leadNoHotline}`
                this._dfSaveCustomer(phone, result.customerName, result.topic)
                    .catch(err => console.error('[svc-sale] failed to save customer lead:', err?.message ?? err))
            }
            const replyNow = await svc.now()
            const reply = await svc.create({
                visitorId: this._visitorId, from: 'sale', content: replyContent,
                wantsHuman, created_at: replyNow, updated_at: replyNow,
            })
            this._log = [...this._log, reply]
        } catch (err) {
            // err?.message (không err.message trần) — lỗi tới đây có thể KHÔNG phải Error thật (vd
            // 1 promise reject với giá trị khác), err.message trần sẽ tự throw TypeError NGAY TRONG
            // catch này, nuốt mất cả nhánh fallback lẫn `this._busy = false` bên dưới — kẹt mãi ở
            // trạng thái "đang gõ" và người dùng không bao giờ thấy bong bóng errGeneric.
            console.error('[svc-sale] reply failed:', err?.message ?? err)
            // Đẩy bong bóng lỗi vào _log NGAY (local, không chờ Firestore) — ghi DB là best-effort
            // phía sau, lỗi ghi DB (network rớt đúng lúc) không được nuốt mất luôn cả bong bóng lỗi
            // hiển thị cho khách.
            const fallback = { id: `local-${this._log.length}`, visitorId: this._visitorId, from: 'sale', content: this._txt.errGeneric }
            this._log = [...this._log, fallback]
            try {
                const errNow = await svc.now()
                await svc.create({ visitorId: this._visitorId, from: 'sale', content: this._txt.errGeneric, created_at: errNow, updated_at: errNow })
            } catch (persistErr) {
                console.error('[svc-sale] failed to persist fallback reply:', persistErr?.message ?? persistErr)
            }
        } finally {
            this._busy = false
        }
    }

    // Lưu/gộp lead vào collection `customers` (server 'llm', cùng project với `mind` — xem
    // hook/SALE.rst) — KEY theo `phone` (idempotent: khách nhắn lại số cũ chỉ cập nhật, không tạo
    // trùng bản ghi). Best-effort, gọi KHÔNG await ở _dfPostGuest (giống tools/mind-sync.js's
    // syncMindFromOutputTable) — lỗi ở đây không được làm hỏng lượt chat đã trả lời thành công.
    // name/topic rỗng ở lượt này (AI không trích được) thì giữ nguyên giá trị cũ đã lưu trước đó,
    // không ghi đè mất thông tin.
    async _dfSaveCustomer(phone, name, topic) {
        const svc = createService('customers', '', MIND_SERVER)
        const existing = await svc.findById(phone).catch(() => null)
        const now = await svc.now()
        await svc.set(phone, {
            visitorId: this._visitorId,
            phone,
            name: (name || existing?.name || '').trim(),
            topic: (topic || existing?.topic || '').trim(),
            status: existing?.status || 'new',
            created_at: existing?.created_at || now, updated_at: now, deleted_at: null,
        })
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        return html`
            <web-popover ui=${this.ui} theme=${this.theme} placement="top-end" placementGap="16" manualClose>
                <web-fab slot="trigger" icon="ri:customer-service-2-line" size="lg" rounded="50%" x=${this.x} y=${this.y} movable ui="modern" theme=${this.theme}></web-fab>
                <div class="sal-panel">
                    <div class="sal-head">
                        <div class="sal-head-id">
                            <web-avatar src=${this._division?.pics || ''} icon="ri:chat-smile-ai-3-line" name=${this._division?.title || this._txt.panelTitle} size="26px"
                                ui=${this.ui} theme=${this.theme}></web-avatar>
                            <span class="sal-title">${this._division?.title || this._txt.panelTitle}</span>
                        </div>
                        <button class="sal-close" @click=${this._dhClose}>
                            <iconify-icon icon="ri:close-line"></iconify-icon>
                        </button>
                    </div>
                    <div class="sal-messages">
                        ${!this._log.length ? html`<div class="sal-empty">${this._txt.empty}</div>` : ''}
                        ${this._log.map(m => this._rfMessage(m))}
                        ${this._busy ? this._rfTyping() : ''}
                    </div>
                    <div class="sal-composer">
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
            <div class="sal-msg ${mine ? 'mine' : ''}">
                ${!mine ? html`<web-avatar src=${this._division?.pics || ''} icon="ri:chat-smile-ai-3-line" name=${this._division?.title || ''} size="26px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>` : ''}
                <div class="sal-bubble">
                    <p class="sal-content">${m.content}</p>
                    ${m.wantsHuman ? html`<p class="sal-hint">${this._txt.wantsHumanHint}</p>` : ''}
                </div>
            </div>
        `
    }

    _rfTyping() {
        return html`
            <div class="sal-msg">
                <web-avatar src=${this._division?.pics || ''} icon="ri:chat-smile-ai-3-line" name=${this._division?.title || ''} size="26px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="sal-bubble"><p class="sal-content sal-typing">${this._txt.thinking}</p></div>
            </div>
        `
    }
}

if (!customElements.get('svc-sale')) customElements.define('svc-sale', SvcSale)
export default SvcSale
