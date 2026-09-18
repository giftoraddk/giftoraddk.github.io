// src/webs/llm/svc-talk.js
//
// <svc-talk> — 1 nhóm chat vui vẻ, tự nhiên giữa sếp và các "phòng ban AI". Cloned from
// src/webs/division/svc-talk.js (domain-isolation clone — viết mới độc lập, không import/extends
// từ division/) — TOÀN BỘ pipeline/chatter/approve giữ nguyên hành vi, CHỈ đổi backend của
// `divisions`+`talks` (chuyên môn + hội thoại/job) sang Cloudflare D1 (LLM_DB, xem
// tools/server.js, worker/) thay vì Firestore. Bảng nghiệp vụ cuối (`products`/`posts`/
// `finance_reports`) và context đọc (`products`/`invoices`) GIỮ NGUYÊN Firestore `DB_ALL` — những
// bảng đó dùng chung với các trang admin khác (/admin/products, /admin/posts, /admin/report) không
// thuộc phạm vi domain này.
//
// <web-fab> (trigger, `movable`) + <web-popover> (nội dung chat) — web-popover.js đã tự làm đúng
// thứ cần ở đây: Popover API top-layer, tự đóng khi bấm ra ngoài, VÀ tự lắng nghe event 'drag' mà
// web-fab.js dispatch khi kéo — nên panel luôn bám đúng vị trí fab kể cả đang kéo dở, không chỉ
// lúc mở.
//
// Cơ chế trò chuyện (tools/chatter.js): MỌI tin nhắn của sếp được gửi tới TỪNG division đang
// active, LẦN LƯỢT (turn-based, cùng 1 hàng đợi tuần tự toàn cục this._queue — không phải tất cả
// cùng lúc). Mỗi division tự quyết định 1 câu trả lời tự nhiên NGẮN GỌN (chit-chat bình thường)
// VÀ tự nhận biết tin nhắn đó có phải 1 yêu cầu công việc thật thuộc chuyên môn mình không — nếu
// có, tự rút ra topic rồi chạy pipeline chuyên môn thật (tools/engine.js + tools/image.js) ngay
// sau lượt chat, rồi báo kết quả kèm nút Duyệt/Tạo lại.
//
// 1 D1 table DUY NHẤT (`talks`) — mỗi row là 1 "bubble" trong nhóm chat, kind:'chat' (câu nói
// thường) hoặc kind:'job' (tiến trình + kết quả pipeline, đọc/ghi bag `fields` phẳng).
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-fab.js'
import '@/webs/apex/web-popover.js'
import '@/webs/apex/web-avatar.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-dialog.js'
import './svc-progress.js'
import { auth } from '@/webs/auth/tools/service.js'
import { createService } from '@/services/crud.js'
import { txtLingo, toastEmit, pickLang } from '@/services/helper.js'
import { LLM_DB } from './tools/server.js'
import { runTextStep, regenerateCall, generateJsonWithRetry, allFieldKeys, LANGUAGE_OPTIONS, resolveAi } from './tools/engine.js'
import { runImageStep, runImageConcept, runImageGenerate, escapeAttr, stripLeadingFigure } from './tools/image.js'
import { decideChatterReply } from './tools/chatter.js'
import { syncKnowFromOutputTable } from './tools/know-sync.js'
import { PRODUCTION_DIVISION_SEED } from './tools/seed-production.js'
import { MARKETING_DIVISION_SEED } from './tools/seed-marketing.js'
import { FINANCE_DIVISION_SEED } from './tools/seed-finance.js'
import { computeOverview, computeReceivablesPayables, assessRisk } from './tools/finance-helper.js'
import styles from './styles/svc-talk.css?inline'

// Seed mặc định — 'marketing'/'production'/'finance' không có admin popup riêng trong domain này
// (processTable: '' ở mọi seed) nên LUÔN seed qua đây (_dcEnsureSeeds).
const DEFAULT_SEEDS = { marketing: MARKETING_DIVISION_SEED, production: PRODUCTION_DIVISION_SEED, finance: FINANCE_DIVISION_SEED }

const TXT_STD = {
    vi: {
        panelTitle: 'Tổ đội gánh kèo',
        placeholder: 'Nhắn gì đó cho cả nhóm…',
        empty: 'Chưa có tin nhắn nào — thử chào mọi người xem!',
        thinking: '🕒 Đang xử lý đợi em chút nhé…',
        resumeAfterProduct: 'Sản phẩm đã có rồi ạ! Để em triển khai ngay đây ạ 💪',
        awaitingReviewMsg: '⏸️ Đang chờ sếp xem & quyết định — bấm Xem chi tiết nhé',
        errGeneric: 'Có lỗi xảy ra, thử lại nhé',
        doneGeneric: 'Xong rồi ạ, sếp xem giúp em',
        approvedMsg: 'Đã tạo bài viết mới',
        approve: 'Duyệt', regenerate: 'Tạo lại', retry: 'Thử lại', preview: 'Xem chi tiết',
        approveOk: 'Đã tạo bài viết mới từ kết quả này', approveFail: 'Tạo bài viết thất bại',
        headPrefix: 'Trưởng phòng',
        targetingPrefix: 'Đang nhắn riêng', mentionEmpty: 'Không tìm thấy phòng ban nào',
    },
    en: {
        panelTitle: 'My company',
        placeholder: 'Say something to the team…',
        empty: 'No messages yet — try saying hi!',
        thinking: '🕒 Let me work on this one…',
        resumeAfterProduct: 'The product is ready now — I\'ll get started right away 💪',
        awaitingReviewMsg: '⏸️ Waiting for your review — tap Preview to decide',
        errGeneric: 'Something went wrong, please retry',
        doneGeneric: 'Done — please take a look',
        approvedMsg: 'A new post was created',
        approve: 'Approve', regenerate: 'Regenerate', retry: 'Retry', preview: 'Preview',
        approveOk: 'A new post was created from this result', approveFail: 'Failed to create post',
        headPrefix: 'Head of',
        targetingPrefix: 'Talking to', mentionEmpty: 'No department found',
    },
}

export class SvcTalk extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object },

        _authUser:   { state: true },
        _divisions:  { state: true },
        _log:        { state: true }, // talks docs, sorted created_at asc
        _draft:      { state: true },
        _typingId:   { state: true }, // division id đang "gõ" câu chat (chưa persist) — feedback tức thời
        _previewJobId: { state: true }, // id job (kind:'job' talks doc) đang mở popup "Xem chi tiết", '' = đóng
        _runningSub:   { state: true }, // Set<"stepId-callKey"> sub-step đang chạy thật (feedback live cho popup preview)
        _regeneratingImage: { state: true }, // đang chờ nút "Tạo lại ảnh" trong popup preview (_dhRegenerateImage)
        _pendingJobs:  { state: true }, // Set<jobId> job đang có 1 hành động (retry/resume/regenerate/duyệt...) chưa xong — disable nút tương ứng, tránh bấm nhiều lần chạy chồng chéo/duyệt trùng
        _targetDivisionId: { state: true }, // '' = tin nhắn gửi cho CẢ nhóm (mặc định); khác rỗng = CHỈ đúng division này trả lời (chọn qua menu "/")
        _mentionOpen:  { state: true }, // đang hiện menu "/" chọn phòng ban
        _mentionQuery: { state: true }, // text gõ sau "/" để lọc menu
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this._authUser  = null
        this._divisions = []
        this._log       = []
        this._draft     = ''
        this._typingId  = ''
        this._previewJobId = ''
        this._runningSub   = new Set()
        this._regeneratingImage = false
        this._pendingJobs  = new Set()
        this._targetDivisionId = ''
        this._mentionOpen  = false
        this._mentionQuery = ''
        // Hàng đợi tuần tự toàn cục — 1 division "nói" tại 1 thời điểm (cả câu chat lẫn pipeline
        // chuyên môn), tránh gọi AI chồng chéo. Không phải Lit property, chỉ 1 instance tồn tại.
        this._queue = Promise.resolve()
    }

    async connectedCallback() {
        super.connectedCallback()
        this._authUser = await auth.get()
        try {
            const rows = await createService('divisions', '', LLM_DB).findAll()
            this._divisions = await this._dcEnsureSeeds(rows.filter(d => d.status === 'active'))
        } catch (err) {
            console.error('[llm/svc-talk] failed to load divisions:', err.message)
            this._divisions = []
        }
        try {
            this._log = await createService('talks', '', LLM_DB).findAll({ sortBy: 'created_at', order: 'asc' })
        } catch (err) {
            console.error('[llm/svc-talk] failed to load talks:', err.message)
            this._log = []
        }
    }

    // Đảm bảo mỗi seed mặc định (DEFAULT_SEEDS) có mặt trong `activeRows` — đọc thẳng nếu đã tồn
    // tại (kể cả bị tắt active thì bỏ qua, tôn trọng lựa chọn tắt của admin), seed mới nếu chưa có.
    async _dcEnsureSeeds(activeRows) {
        const byId = new Map(activeRows.map(d => [d.id, d]))
        for (const [id, seed] of Object.entries(DEFAULT_SEEDS)) {
            if (byId.has(id)) continue
            try {
                const svc = createService('divisions', '', LLM_DB)
                const existing = await svc.findById(id)
                if (existing) { if (existing.status === 'active') byId.set(id, existing); continue }
                const now = await svc.now()
                const doc = { ...seed, created_at: now, updated_at: now, deleted_at: null, index: 0 }
                await svc.set(id, doc)
                byId.set(id, { id, ...doc })
            } catch (err) {
                console.error(`[llm/svc-talk] failed to seed division '${id}':`, err.message)
            }
        }
        return [...byId.values()]
    }

    updated(changed) {
        if (changed.has('_log') || changed.has('_typingId')) this._scrollToBottom()
    }

    _scrollToBottom() {
        const el = this.shadowRoot?.querySelector('.tlk-messages')
        if (el) el.scrollTop = el.scrollHeight
    }

    _dhPreview(jobId) { this._previewJobId = jobId }
    _dhClosePreview() { this._previewJobId = '' }

    // Nút "Duyệt" bấm NGAY trong popup xem chi tiết (khác nút Duyệt ở bubble chat, vốn không cần
    // đóng gì) — duyệt xong thì đóng luôn popup, tránh sếp phải tự bấm đóng thêm lần nữa.
    async _dhApproveAndClose(jobId) {
        await this._dfApprove(jobId)
        this._dhClosePreview()
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    // Gõ "/" (đầu tin nhắn) mở menu chọn ĐÍCH DANH 1 phòng ban (xem _comMentionMatches/
    // _dhSelectMention) — lọc dần theo chữ gõ sau "/".
    _dhInput(e) {
        this._draft = e.detail.value
        if (this._draft.startsWith('/')) {
            this._mentionQuery = this._draft.slice(1)
            this._mentionOpen = true
        } else {
            this._mentionOpen = false
        }
    }

    _dhKeydown(e) {
        if (e.key === 'Escape' && this._mentionOpen) { this._mentionOpen = false; return }
        if (e.key === 'Enter' && !e.isComposing) this._dhSend()
    }

    // Menu "/" đang mở — Enter/bấm nút gửi đều CHỌN đúng phòng ban đầu tiên khớp (không gửi
    // nguyên chữ "/..." như 1 tin nhắn thật).
    _dhSend() {
        if (this._mentionOpen) {
            const first = this._comMentionMatches[0]
            if (first) this._dhSelectMention(first)
            return
        }
        const content = (this._draft || '').trim()
        if (!content) return
        this._draft = ''
        this._dfPostBoss(content)
    }

    // Chọn 1 phòng ban từ menu "/" — set target DÍNH (sticky) tới khi sếp tự bấm xoá (_dhClearTarget)
    // hoặc chọn phòng ban khác — MỌI tin nhắn gửi tiếp theo chỉ đúng phòng ban này trả lời/xử lý
    // (xem _reactTurn's `targetDivisionId`), không phát cho cả nhóm như mặc định.
    _dhSelectMention(division) {
        this._targetDivisionId = division.id
        this._draft = ''
        this._mentionOpen = false
        this._mentionQuery = ''
    }

    _dhClearTarget() { this._targetDivisionId = '' }

    // ── Data Footer ────────────────────────────────────────────────────────────

    async _dfPostBoss(content) {
        const svc = createService('talks', '', LLM_DB)
        const now = await svc.now()
        const doc = await svc.create({ kind: 'chat', from: 'boss', content, created_at: now, updated_at: now })
        this._log = [...this._log, doc]
        // Chụp lại target NGAY LÚC GỬI (không đọc `this._targetDivisionId` sống bên trong _reactTurn
        // — lượt đó có thể chạy trễ hơn do hàng đợi _queue, lúc đó sếp có thể đã đổi/xoá target rồi).
        this._enqueue(() => this._reactTurn(content, this._targetDivisionId))
    }

    _enqueue(fn) {
        this._queue = this._queue.then(fn).catch(err => console.error('[llm/svc-talk] turn failed:', err.message))
    }

    // Đánh dấu 1 job đang có hành động chờ xử lý (`_pendingJobs`) trong SUỐT thời gian `asyncFn`
    // chạy — dùng để disable nút tương ứng ở bubble/popup preview, tránh bấm 2 lần chạy chồng chéo
    // (vd double-click "Duyệt" tạo trùng 2 record, double-click "Duyệt & tiếp tục" chạy trùng step
    // kế). Bỏ qua NGAY nếu job đã đang pending — không cần đợi `_enqueue`'s hàng đợi mới biết.
    _withJobPending(jobId, asyncFn) {
        if (this._pendingJobs.has(jobId)) return
        this._pendingJobs = new Set(this._pendingJobs).add(jobId)
        this._enqueue(async () => {
            try { await asyncFn() }
            finally {
                const next = new Set(this._pendingJobs); next.delete(jobId); this._pendingJobs = next
            }
        })
    }

    _runJobGuarded(jobId, division, fromIndex) {
        this._withJobPending(jobId, () => this._runJob(jobId, division, fromIndex))
    }

    // Lượt phản ứng của TỪNG division, LẦN LƯỢT, cho 1 tin nhắn của sếp — mỗi division tự quyết
    // định câu trả lời tự nhiên + có phải việc thật thuộc chuyên môn không (xem tools/chatter.js).
    // Câu chat của TẤT CẢ division post xong hết (nhanh, lần lượt) TRƯỚC, việc thật (isTask) mới
    // chạy sau đó — không để 1 pipeline nặng (có thể vài chục giây, có bước tạo ảnh) chặn mất câu
    // chat của division kế tiếp, giữ đúng cảm giác "trò chuyện tự nhiên, vui vẻ" sếp muốn.
    // `targetDivisionId` (chọn qua menu "/", xem _dhSelectMention) — khác rỗng thì CHỈ đúng division
    // đó tham gia lượt này (chat + nhận task), mọi division khác im lặng hoàn toàn.
    async _reactTurn(bossContent, targetDivisionId) {
        const pendingJobs = []
        // Đang nhắn ĐÍCH DANH 1 phòng ban (targetDivisionId) — coi như KHÔNG có phòng production để
        // chờ, dù thật ra có active: cơ chế "chờ sản phẩm" (willWaitForProduct + auto-dispatch bên
        // dưới) vốn ngầm lôi production vào cuộc dù sếp chỉ nhắn đích danh 1 phòng khác, phá đúng lời
        // hứa "chỉ phòng đó trả lời". Chỉ áp dụng khi có target — lượt broadcast (targetDivisionId
        // rỗng) giữ nguyên hành vi chờ-sản-phẩm như cũ.
        const hasProductionDivision = !targetDivisionId && !!this._divisions.find(d => d.id === 'production')
        const divisionsThisTurn = targetDivisionId
            ? this._divisions.filter(d => d.id === targetDivisionId)
            : this._divisions
        for (const division of this._sortProductionFirst(divisionsThisTurn, d => d.id)) {
            // Division đang CHỜ 1 sản phẩm liên quan (job 'waiting_product' của nó chưa được đánh
            // thức — xem _wakeWaitingJobs) thì im lặng HOÀN TOÀN lượt này — không chit-chat, không tự
            // nhận task mới — cho tới khi sếp duyệt sản phẩm đó xong. Chỉ "lên tiếng" trở lại đúng lúc
            // được đánh thức (xem _wakeWaitingJobs's tin nhắn `resumeAfterProduct`).
            if (this._hasWaitingJob(division.id)) continue
            this._typingId = division.id
            let decision
            try {
                decision = await decideChatterReply(this._comAi(division), division, this._comRecentHistory(), bossContent)
            } catch (err) {
                console.error(`[llm/svc-talk] chatter failed for ${division.id}:`, err.message)
                decision = null
            }
            this._typingId = ''
            if (!decision) continue

            // AI tự dò ngôn ngữ của tin nhắn sếp thay vì lệ thuộc division.lang cố định — pickLang
            // vừa chuẩn hoá giá trị AI trả về (chỉ 'vi'/'en'), vừa fallback an toàn nếu AI trả rác.
            if (decision.lang) this.lang = pickLang({ vi: 'vi', en: 'en' }, decision.lang)

            // Division `requiresProduct` (không phải chính production) SẮP PHẢI chờ sản phẩm liên
            // quan (chưa tồn tại + có phòng production để chờ) thì câu "em triển khai ngay" của
            // chatter.js NGAY LƯỢT NÀY là nói sai sự thật (thật ra phải chờ duyệt) — biết trước điều
            // này ở đây để BỎ LUÔN câu chat xác nhận, dành lời "bắt đầu làm" cho đúng lúc thật sự
            // được đánh thức (_wakeWaitingJobs's `resumeAfterProduct`).
            let existingProduct
            let willWaitForProduct = false
            if (decision.isTask && decision.topic && division.id !== 'production' && division.meta?.requiresProduct) {
                existingProduct = await this._resolveProduct(decision.topic)
                willWaitForProduct = !existingProduct && hasProductionDivision
            }

            if (decision.reply && !willWaitForProduct) {
                const svc = createService('talks', '', LLM_DB)
                const now = await svc.now()
                const msg = await svc.create({ kind: 'chat', from: division.id, content: decision.reply, created_at: now, updated_at: now })
                this._log = [...this._log, msg]
            }
            if (decision.isTask && decision.topic) pendingJobs.push({ division, topic: decision.topic, language: this.lang, existingProduct })
        }

        // 'production' xử lý trước — nếu phòng khác CŨNG cần sản phẩm cho đúng topic này (division
        // `requiresProduct`), sẽ tự nhận ra job production vừa tạo TRONG CÙNG lượt này
        // (`productionJobThisTurn`) thay vì tạo trùng 1 job production nữa.
        const ordered = this._sortProductionFirst(pendingJobs, j => j.division.id)
        let productionJobThisTurn = null

        for (const { division, topic, language, existingProduct } of ordered) {
            if (division.id === 'production') {
                if (productionJobThisTurn) continue // đã có 1 job production chạy lượt này rồi, bỏ qua tránh tạo trùng
                const job = await this._createJobDoc(division, topic, { language })
                productionJobThisTurn = job
                await this._runJob(job.id, division)
                continue
            }
            if (!division.meta?.requiresProduct) {
                const job = await this._createJobDoc(division, topic, { language })
                await this._runJob(job.id, division)
                continue
            }

            // Sản phẩm khớp topic đã tồn tại từ trước (resolve 1 lần duy nhất ở lượt chat phía trên,
            // dùng lại ở đây — không gọi lại _resolveProduct lần 2 cho cùng 1 topic).
            if (existingProduct) {
                const job = await this._createJobDoc(division, topic, { language })
                await this._runJob(job.id, division)
                continue
            }
            let productionJob = productionJobThisTurn
            if (!productionJob) {
                // `hasProductionDivision` đã tự thành false khi đang nhắn đích danh 1 phòng ban khác
                // production (xem khai báo ở trên) — coi như không có production để chờ trong trường
                // hợp đó, y hệt trường hợp production thật sự không active.
                const productionDivision = hasProductionDivision ? this._divisions.find(d => d.id === 'production') : null
                if (!productionDivision) {
                    // Không có phòng production active (hoặc đang nhắn đích danh 1 phòng khác) —
                    // fallback chạy thẳng, tránh treo job mãi mãi / tránh production tự chạy thay khi
                    // sếp không hề nhắn tới nó.
                    const job = await this._createJobDoc(division, topic, { language })
                    await this._runJob(job.id, division)
                    continue
                }
                productionJob = await this._createJobDoc(productionDivision, topic, { language })
                productionJobThisTurn = productionJob
                await this._runJob(productionJob.id, productionDivision)
            }
            // Đăng ký job CHỜ sếp duyệt sản phẩm ở trên — pipeline thật chỉ chạy khi _dfApprove() của
            // job production đó gọi _wakeWaitingJobs() (xem đó).
            await this._createJobDoc(division, topic, { status: 'waiting_product', waitingOnJobId: productionJob.id, language })
        }
    }

    _topicKey(topic) { return (topic || '').trim().toLowerCase() }

    // Division này có đang bị "khoá" chờ 1 sản phẩm liên quan chưa được duyệt không — dùng để im
    // lặng hoàn toàn division đó trong _reactTurn (xem đó) cho tới khi _wakeWaitingJobs() xử lý xong.
    _hasWaitingJob(divisionId) {
        return this._log.some(d => d.kind === 'job' && d.division === divisionId && d.status === 'waiting_product')
    }

    // Phòng "Sản phẩm & Vận hành" luôn được xếp lên ĐẦU — cả lượt chat (division "lên tiếng" trước)
    // lẫn lượt dispatch job — vì mọi phòng khác `requiresProduct` đều phụ thuộc dữ liệu sản phẩm nó
    // tạo ra (xem _runJob's product-context inheritance). `idOf` tách id ra khỏi từng dạng phần tử
    // khác nhau (division thô ở lượt chat, {division,topic} ở lượt dispatch job).
    _sortProductionFirst(items, idOf) {
        return [...items].sort((a, b) => (idOf(a) === 'production' ? -1 : 0) - (idOf(b) === 'production' ? -1 : 0))
    }

    async _createJobDoc(division, topic, extra = {}) {
        const svc = createService('talks', '', LLM_DB)
        const now = await svc.now()
        const job = await svc.create({
            kind: 'job', from: division.id, division: division.id, topic,
            language: division.lang || 'vi', colors: '', status: 'queued', error: '',
            fields: Object.fromEntries(allFieldKeys(division).map(k => [k, ''])),
            approved: false, createdPostId: '', created_at: now, updated_at: now,
            ...extra,
        })
        this._log = [...this._log, job]
        return job
    }

    // Sản phẩm khớp topic (so khớp title, không phân biệt hoa/thường) đã tồn tại trong bảng
    // `products` chưa — MVP-level exact match, chưa fuzzy search. `products` GIỮ NGUYÊN Firestore
    // DB_ALL (không đổi backend).
    async _resolveProduct(topic) {
        try {
            const rows = await createService('products').findAll()
            const needle = this._topicKey(topic)
            return rows.find(p => this._topicKey(p.title) === needle) || null
        } catch (err) {
            console.error('[llm/svc-talk] failed to resolve product:', err.message)
            return null
        }
    }

    // Tóm tắt gọn tên/mô tả/nội dung THẬT của 1 sản phẩm — dùng làm giá trị field `productContext`
    // (xem _runJob) cho division khác đọc qua contextKeys, ép AI viết bám sát sản phẩm thật thay vì
    // tự bịa lại từ đầu. `content` là HTML đầy đủ — bóc tag + cắt ngắn tránh chiếm quá nhiều token.
    _comProductContext(product) {
        const plain = (product.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const snippet = plain.length > 400 ? `${plain.slice(0, 400)}…` : plain
        return [product.title, product.description, snippet].filter(Boolean).join(' — ')
    }

    // Số liệu tài chính THẬT (doanh thu/công nợ/rủi ro tính lại từ `invoices`, xem
    // tools/finance-helper.js) — dùng làm giá trị field `financialContext` cho division 'finance'
    // (xem _runJob), TƯƠNG TỰ _comProductContext() ở trên nhưng cho division không neo vào 1 sản
    // phẩm nào. `invoices` GIỮ NGUYÊN Firestore DB_ALL. Load lỗi -> trả 1 câu báo THIẾU dữ liệu
    // thay vì để AI tự bịa số, buộc câu trả lời rơi vào NEED MORE DATA.
    async _comFinanceContext() {
        try {
            const invoices = await createService('invoices').findAll()
            const overview = computeOverview(invoices)
            const debt = computeReceivablesPayables(invoices)
            const risk = assessRisk(invoices)
            const vnd = n => `${Math.round(n).toLocaleString('vi-VN')}đ`
            return [
                `Doanh thu ròng: ${vnd(overview.net)} (tổng đã thu ${vnd(overview.gross)}, mất do huỷ/trả ${vnd(overview.lost)})`,
                `Số đơn: ${overview.orderCount} (huỷ/trả: ${overview.lostCount}), giá trị TB/đơn: ${vnd(overview.avgOrder)}`,
                `Đơn chờ xác nhận đã nhận tiền: ${debt.pendingConfirmCount} (${vnd(debt.pendingConfirmAmount)})`,
                `Đơn cần hoàn tiền cho khách: ${debt.pendingRefundCount} (${vnd(debt.pendingRefundAmount)})`,
                `Mức rủi ro hiện tại: ${risk.level} — ${risk.reasons.join('; ')}`,
            ].join('\n')
        } catch (err) {
            console.error('[llm/svc-talk] failed to build finance context:', err.message)
            return '(Không tải được số liệu tài chính thật — dữ liệu không đủ, phải trả lời NEED MORE DATA thay vì suy đoán)'
        }
    }

    // Sau khi 1 job production được duyệt (đã tạo xong sản phẩm ở `products`, xem _dfApprove) —
    // đánh thức mọi job khác đang 'waiting_product' chờ đúng job này: chuyển 'queued' rồi enqueue
    // chạy pipeline thật qua hàng đợi tuần tự toàn cục (không chạy trực tiếp — tôn trọng đúng 1
    // pipeline AI tại 1 thời điểm).
    async _wakeWaitingJobs(productionJobId) {
        const waiters = this._log.filter(d => d.kind === 'job' && d.status === 'waiting_product' && d.waitingOnJobId === productionJobId)
        for (const w of waiters) {
            const division = this._divisions.find(d => d.id === w.division)
            if (!division) continue
            const svc = createService('talks', '', LLM_DB)
            const now = await svc.now()
            // `resumed: true` — dùng NGAY trên chính job bubble này để hiện text
            // `resumeAfterProduct` thay vì text "đang xử lý" mặc định (xem _rfJobContent) — KHÔNG
            // post thêm 1 tin nhắn 'chat' riêng nữa.
            await svc.update(w.id, { status: 'queued', resumed: true, updated_at: now })
            this._log = this._log.map(d => d.id === w.id ? { ...d, status: 'queued', resumed: true, updated_at: now } : d)
            this._enqueue(() => this._runJob(w.id, division))
        }
    }

    // Chạy trọn pipeline chuyên môn của 1 job doc từ step chưa xong tiếp theo (status 'queued'/
    // chưa từng chạy -> từ đầu; 'stepN' do lỗi trước đó -> tiếp tục từ step N; 'done' -> chạy lại
    // từ đầu, dùng cho nút "Tạo lại") — persist D1 + patch `_log` sau MỖI step. `fromIndex`
    // (optional) ép chạy từ ĐÚNG index đó, bỏ qua suy luận từ `doc.status` — dùng khi resume sau 1
    // lượt DỪNG chờ quyết định (xem _dhResumeStep/_dhImageChoice): status lúc đó là 'awaiting_review'
    // (không map được sang index qua quy ước `step${id}` như bình thường).
    async _runJob(jobId, division, fromIndex) {
        const svc = createService('talks', '', LLM_DB)
        let doc = this._log.find(d => d.id === jobId)
        if (!doc) return
        // Division cần sản phẩm có sẵn (`requiresProduct`, vd marketing) thì kế thừa từ sản phẩm đó
        // TRƯỚC khi chạy: (1) tags — dùng thẳng, không để AI generate lại; (2) `productContext` — 1
        // field NGỮ CẢNH (không phải output, chỉ đọc qua contextKeys) tóm tắt tên/mô tả/nội dung
        // sản phẩm thật, để step phân tích đầu tiên "hiểu sản phẩm" và viết đúng thay vì đoán chung
        // chung chỉ từ chuỗi topic ngắn. Sản phẩm có thể vừa được tạo SAU khi job này đã tạo (job
        // từng ở trạng thái 'waiting_product'), nên phải resolve lại ở ĐÂY, không phải lúc tạo job doc.
        if (division.meta?.requiresProduct) {
            const needsTags = !(doc.fields.tags || '').trim()
            const needsContext = !(doc.fields.productContext || '').trim()
            if (needsTags || needsContext) {
                const product = await this._resolveProduct(doc.topic)
                if (product) {
                    const patch = {}
                    if (needsTags && product.tags) patch.tags = product.tags
                    if (needsContext) patch.productContext = this._comProductContext(product)
                    if (Object.keys(patch).length) {
                        doc = { ...doc, fields: { ...doc.fields, ...patch } }
                        await svc.update(jobId, { fields: doc.fields, updated_at: await svc.now() })
                        this._log = this._log.map(d => d.id === jobId ? doc : d)
                    }
                }
            }
        } else if (division.id === 'finance' && !(doc.fields.financialContext || '').trim()) {
            // Division 'finance' không neo vào 1 sản phẩm nào — bơm SỐ LIỆU TÀI CHÍNH THẬT (doanh
            // thu/công nợ/rủi ro thật, xem _comFinanceContext) thay cho productContext ở nhánh
            // trên, cùng lý do: tránh AI tự bịa số.
            const patch = { financialContext: await this._comFinanceContext() }
            doc = { ...doc, fields: { ...doc.fields, ...patch } }
            await svc.update(jobId, { fields: doc.fields, updated_at: await svc.now() })
            this._log = this._log.map(d => d.id === jobId ? doc : d)
        }
        const steps = division.meta.steps
        const startIdx = fromIndex ?? (doc.status === 'queued' || !doc.status
            ? 0
            : Math.max(steps.findIndex(s => `step${s.id}` === doc.status), 0))
        this._runningSub = new Set() // job trước (nếu có) đã tự dọn sạch qua _runSub's finally — reset phòng thân

        for (let i = startIdx; i < steps.length; i++) {
            const step = steps[i]
            const isLast = i === steps.length - 1
            try {
                const patch = await this._runStep(jobId, step, division, doc)
                // doc.fields có thể đã được _patchJobFields cập nhật thêm (từng call xong dần)
                // trong lúc step chạy — đọc lại bản mới nhất từ _log trước khi merge patch cuối,
                // tránh patch cuối "đè lùi" mất field vừa patch sớm hơn trong CÙNG step.
                doc = this._log.find(d => d.id === jobId) || doc
                const now = await svc.now()
                const fields = { ...doc.fields, ...patch }

                // Step ảnh CHƯA chọn AI/Bỏ qua — patch mới chỉ dịch xong concept (chưa có pics) —
                // dừng NGAY tại ĐÚNG step này (KHÔNG đánh dấu step xong), chờ _dhImageChoice() chọn
                // xong mới chạy tiếp (xem svc-progress.js's image-choice banner).
                if (step.type === 'image' && !doc.imageChoice && !patch.pics) {
                    // String(step.id) — D1 bind số JS qua sqlite3_bind_double() (REAL); cột
                    // pausedStepId khai TEXT nên SQLite lưu thành "3.0" nếu bind thẳng số, ép
                    // string trước để bind qua bind_text(), lưu sạch "3" (xem _comPausedStep's
                    // comment ở svc-progress.js — đọc vẫn qua Number() để chịu được data cũ "N.0").
                    doc = { ...doc, fields, status: 'awaiting_review', pausedStepId: String(step.id), updated_at: now }
                    await svc.update(jobId, { fields, status: doc.status, pausedStepId: doc.pausedStepId, updated_at: now })
                    this._log = this._log.map(d => d.id === jobId ? doc : d)
                    return
                }

                // MỌI step `type:'text'` (trừ step cuối) đều dừng lại ngay sau khi xong, chờ sếp
                // bấm "Duyệt" (_dhResumeStep) mới chạy step kế — step ảnh có cơ chế chờ riêng ở
                // nhánh phía trên (concept/AI/Bỏ qua), không cần dừng thêm lần nữa ở đây.
                const pause = !isLast && step.type === 'text'
                doc = {
                    ...doc, fields,
                    status: pause ? 'awaiting_review' : (isLast ? 'done' : `step${step.id}`),
                    pausedStepId: pause ? String(step.id) : '',
                    error: '', updated_at: now,
                }
                await svc.update(jobId, { fields, status: doc.status, pausedStepId: doc.pausedStepId, error: '', updated_at: now })
                this._log = this._log.map(d => d.id === jobId ? doc : d)
                if (pause) return
            } catch (err) {
                doc = this._log.find(d => d.id === jobId) || doc
                const now = await svc.now()
                doc = { ...doc, status: `step${step.id}`, error: err.message || String(err), updated_at: now }
                await svc.update(jobId, { fields: doc.fields, status: doc.status, error: doc.error, updated_at: now }).catch(() => {})
                this._log = this._log.map(d => d.id === jobId ? doc : d)
                return
            }
        }
    }

    // `jobId` — cần để onPatch/runSub biết patch/đánh dấu đúng job nào đang chạy trong `_log` (chỉ
    // 1 job chạy thật tại 1 thời điểm — hàng đợi _queue tuần tự toàn cục — nên `_runningSub` dùng
    // chung 1 Set duy nhất, không cần scope theo jobId).
    _runStep(jobId, step, division, doc) {
        const ai = this._comAi(division)
        const runSub = (key, fn) => this._runSub(step.id, key, fn)
        if (step.type === 'image') {
            // Chưa quyết định AI/Bỏ qua (doc.imageChoice rỗng) — CHỈ dịch concept (rẻ, an toàn),
            // KHÔNG tự gọi Hugging Face — _runJob tự dừng ngay sau patch này chờ _dhImageChoice().
            if (!doc.imageChoice) {
                return runImageConcept({
                    topic: doc.topic, fields: doc.fields,
                    contextKeys: step.concept?.contextKeys || [],
                    generateJson: opts => generateJsonWithRetry(ai, { ...opts, errMessage: this._txt.errGeneric }),
                    hasData: key => key === 'concept' ? !!(doc.fields.imagePrompt || '').trim() : false,
                    runSub,
                })
            }
            // 'skip' — sếp tự làm ảnh qua trang khác, không cần patch gì thêm ở đây.
            if (doc.imageChoice === 'skip') return Promise.resolve({})
            // 'ai' — đã có sẵn imagePrompt (từ lượt dịch concept ở trên) — gọi thẳng nửa tốn kém.
            return runImageGenerate({ topic: doc.topic, fields: doc.fields, colors: doc.colors, runSub })
        }
        const langOpt = LANGUAGE_OPTIONS.find(o => o.value === doc.language) || LANGUAGE_OPTIONS[0]
        return runTextStep(step, {
            topic: doc.topic, languageName: langOpt.name, ai, fields: doc.fields,
            errMessage: this._txt.errGeneric,
            runSub,
            onPatch: partial => this._patchJobFields(jobId, partial),
        })
    }

    // Đánh dấu 1 call/sub-step đang chạy thật (spinner ở <svc-progress>, popup preview) — luôn
    // dọn sạch (finally) kể cả lỗi, tránh spinner treo mãi khi call ném lỗi.
    async _runSub(stepId, key, fn) {
        const k = `${stepId}-${key}`
        this._runningSub = new Set(this._runningSub).add(k)
        try {
            return await fn()
        } finally {
            const next = new Set(this._runningSub); next.delete(k)
            this._runningSub = next
        }
    }

    // Patch field NGAY khi 1 call text-step xong (không đợi cả step lớn) — để popup preview hiển
    // thị nội dung sớm nhất có thể thay vì phải chờ hết step. Chỉ cập nhật state cục bộ `_log`
    // (feedback UI tức thời) — bản D1 chính thức vẫn chỉ ghi 1 lần ở cuối step trong `_runJob`,
    // không ghi rời từng call.
    _patchJobFields(jobId, partial) {
        this._log = this._log.map(d => d.id === jobId ? { ...d, fields: { ...d.fields, ...partial } } : d)
    }

    // Duyệt kết quả — đọc division.meta.output để biết ghi vào bảng nào, copy field nào từ
    // `fields` phẳng. Tạo bài MỚI (không đụng bản ghi có sẵn nào). Guard qua `_pendingJobs` NGAY
    // đầu hàm (trước await đầu tiên) — chỉ check `doc.approved` không đủ, vì `_log` chỉ cập nhật
    // SAU KHI svc.create() xong, double-click trong lúc đang chờ tạo record sẽ tạo trùng 2 record.
    // `output.table` (products/posts/finance_reports) GIỮ NGUYÊN Firestore DB_ALL — bảng nghiệp vụ
    // chung với các trang admin khác, không thuộc phạm vi domain này.
    async _dfApprove(jobId) {
        if (this._pendingJobs.has(jobId)) return
        const doc = this._log.find(d => d.id === jobId)
        if (!doc || doc.approved || doc.status !== 'done') return
        const division = this._divisions.find(d => d.id === doc.division)
        const output = division?.meta?.output
        if (!output) return
        this._pendingJobs = new Set(this._pendingJobs).add(jobId)
        try {
            const svc = createService(output.table)
            const now = await svc.now()
            const payload = {
                status: output.status || 'draft',
                created_at: now, updated_at: now, deleted_at: null,
                scope: 'public', secure: '', tags: '', index: 0, actors: '',
                user_id: this._authUser?.id || null,
            }
            for (const k of output.fields) payload[k] = doc.fields[k] ?? ''
            const created = await svc.create(payload)
            await createService('talks', '', LLM_DB).update(jobId, { approved: true, createdPostId: created.id, updated_at: now })
            this._log = this._log.map(d => d.id === jobId ? { ...d, approved: true, createdPostId: created.id } : d)
            toastEmit(this._txt.approveOk, 'success')
            // Record vừa duyệt (output.table 'products'/'posts'/'finance_reports') — đồng bộ NGAY
            // vào `know` (D1, LLM_DB) để <svc-aide> có dữ liệu trả lời ngay, không cần đợi admin
            // sửa gì thêm (xem tools/know-sync.js — best-effort, tự nuốt lỗi, tự no-op nếu table
            // khác).
            syncKnowFromOutputTable(created, output.table)
            // Mirror job đã duyệt vào collection tiến trình của popup admin (division.meta.processTable)
            // — mọi seed trong domain này đặt processTable:'' (không có admin popup riêng), nên
            // nhánh này luôn bị bỏ qua; giữ lại nguyên vẹn để không lệch hành vi nếu sau này có.
            if (division.meta.processTable) {
                await createService(division.meta.processTable).set(created.id, {
                    id: created.id, record_id: created.id, relation: output.table,
                    topic: doc.topic, language: doc.language, colors: doc.colors,
                    status: 'done', error: '', fields: doc.fields,
                    created_at: now, updated_at: now,
                }).catch(err => console.error('[llm/svc-talk] failed to mirror job into processTable:', err.message))
            }
            // Duyệt xong 1 sản phẩm (output.table === 'products') — đánh thức mọi job khác đang
            // chờ đúng sản phẩm này (xem _reactTurn's `requiresProduct` dispatch).
            if (output.table === 'products') await this._wakeWaitingJobs(jobId)
        } catch (err) {
            toastEmit(`${this._txt.approveFail}: ${err.message}`, 'error')
        }
        const next = new Set(this._pendingJobs); next.delete(jobId); this._pendingJobs = next
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _bossName() { return this._authUser?.display_name || 'Boss' }

    // Job 'waiting_product' KHÔNG hiện bubble nào trong chat cả — division đang bị khoá chờ sản
    // phẩm (xem _hasWaitingJob/_reactTurn) phải im lặng HOÀN TOÀN, kể cả tấm thẻ job của chính nó,
    // cho tới khi thật sự được đánh thức (_wakeWaitingJobs tự post `resumeAfterProduct` + job đổi
    // status sang 'queued' lúc đó mới lọt qua filter này và hiện ra).
    get _comVisibleLog() {
        return this._log.filter(m => !(m.kind === 'job' && m.status === 'waiting_product'))
    }

    _comAi(division) { return resolveAi(division?.ai) }

    // Prefix "Trưởng phòng"/"Head of" trước tên phòng ban khi hiển thị tác giả tin nhắn — không
    // phải division.title thô, để rõ đây là người đứng đầu phòng ban đang "nói", không phải chính
    // cái phòng ban (xem TXT_STD.headPrefix).
    _comDivisionName(id) {
        const title = this._divisions.find(d => d.id === id)?.title || id
        return `${this._txt.headPrefix} ${title}`
    }
    _comDivisionAvatar(id) { return this._divisions.find(d => d.id === id)?.pics || '' }

    // Danh sách phòng ban khớp menu "/" — lọc dần theo chữ gõ sau "/" (so khớp tên hiển thị lẫn
    // title thô), rỗng thì hiện TẤT CẢ phòng ban đang active.
    get _comMentionMatches() {
        const q = (this._mentionQuery || '').trim().toLowerCase()
        if (!q) return this._divisions
        return this._divisions.filter(d => this._comDivisionName(d.id).toLowerCase().includes(q) || (d.title || '').toLowerCase().includes(q))
    }

    // Vài tin gần nhất (cả sếp lẫn mọi division) làm ngữ cảnh cho tools/chatter.js — chỉ lấy
    // kind:'chat' (bỏ job progress, không cần thiết cho việc "nói chuyện tự nhiên").
    _comRecentHistory() {
        return this._log
            .filter(m => m.kind === 'chat')
            .slice(-8)
            .map(m => ({ author: m.from === 'boss' ? this._bossName : this._comDivisionName(m.from), content: m.content }))
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (!this._divisions.length) return html``
        return html`
            <web-popover ui=${this.ui} theme=${this.theme} lang=${this.lang} placement="top-end" placementGap="0" placement="top-end" placementGap="0" fullscreen>
                <web-fab slot="trigger" icon="ri:message-ai-3-line" size="lg" rounded="50%" x="99%" y="80%" movable ui="modern" theme=${this.theme}></web-fab>
                <div class="tlk-panel">
                    <div class="tlk-head">
                        <span class="tlk-title">${this._txt.panelTitle}</span>
                    </div>
                    <div class="tlk-messages">
                        ${!this._comVisibleLog.length ? html`<div class="tlk-empty">${this._txt.empty}</div>` : ''}
                        ${this._comVisibleLog.map(m => this._rfMessage(m))}
                        ${this._typingId ? this._rfTyping(this._typingId) : ''}
                    </div>
                    <div class="tlk-composer-wrap">
                        ${this._mentionOpen ? this._rfMentionMenu() : ''}
                        ${this._targetDivisionId && !this._mentionOpen ? this._rfTargetChip() : ''}
                        <div class="tlk-composer">
                            <web-text placeholder=${this._txt.placeholder} .value=${this._draft} height="36px"
                                @input=${this._dhInput} @keydown=${this._dhKeydown}></web-text>
                            <web-button type="soft" color="primary" height="36px" square rounded="50%" @clicked=${this._dhSend}>
                                <iconify-icon icon="ri:send-plane-2-fill" width="18"></iconify-icon>
                            </web-button>
                        </div>
                    </div>
                </div>
            </web-popover>
            ${this._rfPreviewDialog()}
        `
    }

    // Popup "Xem chi tiết" — <svc-progress editable> (cây macro/sub-step + sửa field trung
    // gian inline), mở từ nút Preview trong 1 job bubble bất kỳ (đang xử lý/lỗi/đã xong) — không
    // cần rời khỏi khung chat để xem/chỉnh toàn bộ tiến trình.
    _rfPreviewDialog() {
        const doc = this._log.find(d => d.id === this._previewJobId)
        const division = doc && this._divisions.find(d => d.id === doc.division)
        return html`
            <web-dialog ?open=${!!(doc && division)} title=${doc?.topic || division?.title || ''} lang=${this.lang}
                maxWidth="720px" ui=${this.ui} theme=${this.theme}
                @cancel=${this._dhClosePreview} @close=${this._dhClosePreview}>
                ${doc && division ? html`
                    <div class="tlk-preview">
                        <svc-progress .division=${division} .doc=${doc} .runningSub=${this._runningSub}
                            editable approvable ?regeneratingImage=${this._regeneratingImage}
                            ?busy=${this._pendingJobs.has(doc.id)}
                            ai=${this._comAi(division)} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                            @field-change=${e => this._dhProgressFieldChange(doc.id, e)}
                            @retry-step=${() => this._runJobGuarded(doc.id, division)}
                            @regenerate-image=${() => this._enqueue(() => this._dhRegenerateImage(doc.id, division))}
                            @photo-upload=${e => this._dhPhotoUpload(doc.id, e.detail.url)}
                            @approve=${() => this._dhApproveAndClose(doc.id)}
                            @resume-step=${() => this._dhResumeStep(doc.id, division)}
                            @regenerate-call=${e => this._dhRegenerateCall(doc.id, division, e.detail.stepId, e.detail.callKey, e.detail.instruction)}
                            @image-choice=${e => this._dhImageChoice(doc.id, division, e.detail.choice)}></svc-progress>
                    </div>
                ` : ''}
            </web-dialog>
        `
    }

    // `field-change` từ <svc-progress> — field TRUNG GIAN (topicAnalysis, contentPillars,
    // imagePrompt...), không phải output field — persist NGAY vào `talks` doc (không có nút "Lưu"
    // riêng cho các field này).
    async _dhProgressFieldChange(jobId, e) {
        const { key, value } = e.detail
        this._patchJobFields(jobId, { [key]: value })
        const doc = this._log.find(d => d.id === jobId)
        const svc = createService('talks', '', LLM_DB)
        const now = await svc.now()
        await svc.update(jobId, { fields: doc.fields, updated_at: now })
    }

    // `photo-upload` từ <svc-progress> (sub-step 'upload', job đã done) — user tự upload ảnh từ
    // máy tính để THAY ảnh AI đã tạo.
    async _dhPhotoUpload(jobId, url) {
        const doc = this._log.find(d => d.id === jobId)
        if (!doc || url === doc.fields.pics) return
        const bodyContent = stripLeadingFigure(doc.fields.content)
        const figure = url
            ? `<figure data-media-wrap="image" data-align="center"><img src="${escapeAttr(url)}" alt="${escapeAttr(doc.fields.title || doc.topic)}"></figure>`
            : ''
        const patch = { pics: url, content: `${figure}${bodyContent}` }
        this._patchJobFields(jobId, patch)
        const svc = createService('talks', '', LLM_DB)
        const now = await svc.now()
        await svc.update(jobId, { fields: { ...doc.fields, ...patch }, updated_at: now })
    }

    // `resume-step` từ <svc-progress> — sếp bấm "Duyệt" sau 1 step vừa xong (MỌI step
    // `type:'text'` trừ step cuối đều dừng lại chờ, xem _runJob) — chạy tiếp từ ĐÚNG step KẾ TIẾP
    // step vừa bị khoá (không lùi lại chạy lại chính step đó, vì nó đã xong thật).
    _dhResumeStep(jobId, division) {
        if (this._pendingJobs.has(jobId)) return
        const doc = this._log.find(d => d.id === jobId)
        if (!doc || doc.status !== 'awaiting_review') return
        const steps = division.meta.steps
        // Number() — D1 bind số JS qua REAL nên `pausedStepId` (cột TEXT) lưu thành "3.0", không
        // phải "3" (xem svc-progress.js's _comPausedStep cùng lý do) — Number() chịu được cả 2 dạng.
        const pausedIdx = steps.findIndex(s => Number(s.id) === Number(doc.pausedStepId))
        // Xoá NGAY `pausedStepId` cục bộ trước khi chạy tiếp — D1/doc.status thật chỉ cập nhật SAU
        // KHI step kế chạy xong, nếu không banner "chờ duyệt" + tab step cũ sẽ còn hiện nguyên
        // suốt lúc step kế đang xử lý. Patch cục bộ này để <svc-progress> tự chuyển sang xem
        // step kế (qua autoRunningStep) NGAY khi bấm, không cần đợi.
        this._log = this._log.map(d => d.id === jobId ? { ...d, status: `step${doc.pausedStepId}`, pausedStepId: '' } : d)
        this._runJobGuarded(jobId, division, pausedIdx === -1 ? 0 : pausedIdx + 1)
    }

    // `regenerate-call` từ <svc-progress> — sếp muốn AI viết lại RIÊNG 1 sub-step (call) kèm
    // chỉ dẫn thêm vừa gõ — granular hơn hẳn regenerate-step: chạy được bất kỳ lúc nào call đó đã
    // có dữ liệu, không cần job đang paused đúng step chứa nó, và KHÔNG đụng status/pausedStepId
    // của job (chỉ patch field của đúng call đó).
    _dhRegenerateCall(jobId, division, stepId, callKey, instruction) {
        this._withJobPending(jobId, async () => {
            const doc = this._log.find(d => d.id === jobId)
            if (!doc) return
            const step = division.meta.steps.find(s => s.id === stepId)
            if (!step || step.type !== 'text') return
            const ai = this._comAi(division)
            const langOpt = LANGUAGE_OPTIONS.find(o => o.value === doc.language) || LANGUAGE_OPTIONS[0]
            const patch = await regenerateCall(step, callKey, instruction, {
                topic: doc.topic, languageName: langOpt.name, ai, fields: doc.fields,
                errMessage: this._txt.errGeneric,
                runSub: (key, fn) => this._runSub(step.id, key, fn),
                onPatch: partial => this._patchJobFields(jobId, partial),
            })
            const updated = this._log.find(d => d.id === jobId)
            const fields = { ...updated.fields, ...patch }
            const svc = createService('talks', '', LLM_DB)
            const now = await svc.now()
            await svc.update(jobId, { fields, updated_at: now })
            this._log = this._log.map(d => d.id === jobId ? { ...d, fields } : d)
        })
    }

    // `image-choice` từ <svc-progress> — sếp chọn 'ai' (gọi AI sinh ảnh thật) hay 'skip' (bỏ
    // qua, tự làm qua 3 nút mở trang ngoài) tại đúng step ảnh đang bị khoá — lưu lựa chọn rồi chạy
    // LẠI đúng step đó (không phải step kế), vì step ảnh mới chỉ dịch xong concept, chưa thật sự
    // xong. Bọc NGUYÊN thân hàm (kể cả 2 await đầu) qua `_withJobPending` — nếu chỉ guard trước khi
    // gọi `_runJob` thì vẫn có khe hở bấm 2 lần trong lúc đang chờ D1 ghi `imageChoice`.
    _dhImageChoice(jobId, division, choice) {
        this._withJobPending(jobId, async () => {
            const doc = this._log.find(d => d.id === jobId)
            if (!doc) return
            const svc = createService('talks', '', LLM_DB)
            const now = await svc.now()
            await svc.update(jobId, { imageChoice: choice, updated_at: now })
            this._log = this._log.map(d => d.id === jobId ? { ...d, imageChoice: choice, updated_at: now } : d)
            const steps = division.meta.steps
            const pausedIdx = steps.findIndex(s => Number(s.id) === Number(doc.pausedStepId))
            await this._runJob(jobId, division, pausedIdx === -1 ? steps.findIndex(s => s.type === 'image') : pausedIdx)
        })
    }

    // `regenerate-image` từ <svc-progress> — tái dùng concept ảnh đã dịch trước đó (hasData
    // luôn true), gọi qua `_enqueue` ở call site như mọi lệnh gọi AI khác (hàng đợi tuần tự toàn
    // cục). `_regeneratingImage` tự guard double-click riêng của nút này; cộng thêm vào
    // `_pendingJobs` để CÁC nút khác của CÙNG job (bubble/preview) cũng disable trong lúc chờ.
    async _dhRegenerateImage(jobId, division) {
        if (this._regeneratingImage || this._pendingJobs.has(jobId)) return
        this._pendingJobs = new Set(this._pendingJobs).add(jobId)
        this._regeneratingImage = true
        try {
            const doc = this._log.find(d => d.id === jobId)
            const step = division.meta.steps.find(s => s.type === 'image')
            const ai = this._comAi(division)
            const patch = await runImageStep({
                topic: doc.topic, fields: doc.fields, colors: doc.colors,
                contextKeys: step?.concept?.contextKeys || [],
                generateJson: opts => generateJsonWithRetry(ai, { ...opts, errMessage: this._txt.errGeneric }),
                hasData: () => true,
                runSub: (key, fn) => this._runSub(step.id, key, fn),
            })
            this._patchJobFields(jobId, patch)
            const updated = this._log.find(d => d.id === jobId)
            const svc = createService('talks', '', LLM_DB)
            const now = await svc.now()
            await svc.update(jobId, { fields: updated.fields, updated_at: now })
        } catch (err) {
            toastEmit(err.message || String(err), 'error')
        }
        this._regeneratingImage = false
        const nextPending = new Set(this._pendingJobs); nextPending.delete(jobId); this._pendingJobs = nextPending
    }

    // Menu "/" chọn ĐÍCH DANH 1 phòng ban — hiện ngay TRÊN composer (bottom:100% qua CSS).
    _rfMentionMenu() {
        const matches = this._comMentionMatches
        return html`
            <div class="tlk-mention-menu">
                ${matches.length ? matches.map(d => html`
                    <button class="tlk-mention-item" @click=${() => this._dhSelectMention(d)}>
                        <web-avatar src=${this._comDivisionAvatar(d.id)} name=${this._comDivisionName(d.id)} size="22px"
                            ui=${this.ui} theme=${this.theme}></web-avatar>
                        <span>${this._comDivisionName(d.id)}</span>
                    </button>
                `) : html`<div class="tlk-mention-empty">${this._txt.mentionEmpty}</div>`}
            </div>
        `
    }

    // Chip báo đang nhắn riêng cho 1 phòng ban cụ thể (xem _dhSelectMention) — bấm ✕ để quay lại
    // gửi cho cả nhóm như mặc định.
    _rfTargetChip() {
        return html`
            <div class="tlk-target">
                <span>${this._txt.targetingPrefix}: ${this._comDivisionName(this._targetDivisionId)}</span>
                <button class="tlk-target-clear" @click=${this._dhClearTarget}>
                    <iconify-icon icon="ri:close-line"></iconify-icon>
                </button>
            </div>
        `
    }

    _rfMessage(m) {
        const mine = m.from === 'boss'
        const name = mine ? this._bossName : this._comDivisionName(m.from)
        return html`
            <div class="tlk-msg ${mine ? 'mine' : ''}">
                <web-avatar src=${mine ? '' : this._comDivisionAvatar(m.from)} name=${name} size="28px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="tlk-bubble">
                    <span class="tlk-author">${name}</span>
                    ${m.kind === 'job' ? this._rfJobContent(m) : html`<p class="tlk-content">${m.content}</p>`}
                </div>
            </div>
        `
    }

    _rfTyping(divisionId) {
        return html`
            <div class="tlk-msg">
                <web-avatar src=${this._comDivisionAvatar(divisionId)} name=${this._comDivisionName(divisionId)} size="28px"
                    ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="tlk-bubble"><span class="tlk-author">${this._comDivisionName(divisionId)}</span>
                    <p class="tlk-content tlk-typing">•••</p>
                </div>
            </div>
        `
    }

    _rfJobContent(m) {
        const t = this._txt
        const division = this._divisions.find(d => d.id === m.division)
        // Luôn có sẵn — cho phép xem toàn bộ tiến trình/kết quả hiện có bất kể job đang chạy/lỗi/xong.
        const previewBtn = html`
            <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                @clicked=${() => this._dhPreview(m.id)}>${t.preview}</web-button>
        `
        // Status format ('queued'|'stepN'|'done') không tự phân biệt "step N vừa xong" với "step N
        // vừa lỗi" — phải dựa vào `m.error` (chỉ set khi _runJob thật sự catch lỗi ở đúng step đó).
        if (m.error) {
            const pending = this._pendingJobs.has(m.id)
            return html`
                <p class="tlk-content">⚠️ ${m.error || t.errGeneric}</p>
                <div class="tlk-actions">
                    <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                        ?loading=${pending} ?disabled=${pending}
                        @clicked=${() => this._runJobGuarded(m.id, division)}>${t.retry}</web-button>
                    ${previewBtn}
                </div>
            `
        }
        // Job đang DỪNG chờ sếp xem/quyết định (mọi step text xong đều dừng chờ Duyệt, hoặc chọn
        // AI/Bỏ qua cho ảnh — xem _runJob) — nút quyết định thật nằm TRONG popup preview
        // (<svc-progress>'s banner), bubble ở đây chỉ báo hiệu + dẫn vào xem.
        if (m.status === 'awaiting_review') {
            return html`
                <p class="tlk-content">${t.awaitingReviewMsg}</p>
                <div class="tlk-actions">${previewBtn}</div>
            `
        }
        if (m.status !== 'done') {
            // `m.resumed` (xem _wakeWaitingJobs) — job vừa hết bị khoá chờ sản phẩm, hiện text "bắt
            // đầu làm" thay vì text "đang xử lý" mặc định, NGAY TRÊN bubble này. KHÔNG hiện nút Thử
            // lại ở đây — tensor.js đã có idle-timeout nên 1 call AI treo/mất kết nối cuối cùng vẫn
            // reject thật, rơi vào nhánh `m.error` phía trên.
            return html`
                <p class="tlk-content">${m.resumed ? t.resumeAfterProduct : t.thinking}</p>
                <div class="tlk-actions">${previewBtn}</div>
            `
        }
        if (m.approved) return html`<p class="tlk-content">✅ ${t.approvedMsg}</p>`

        const outputFields = division?.meta?.output?.fields || []
        const summary = outputFields.slice(0, 2).map(k => m.fields?.[k]).filter(Boolean).join(' — ') || t.doneGeneric
        const pending = this._pendingJobs.has(m.id)
        return html`
            <p class="tlk-content">✅ ${summary}</p>
            <div class="tlk-actions">
                ${division?.meta?.output ? html`
                    <web-button type="fill" color="primary" height="26px" ui=${this.ui} theme=${this.theme}
                        ?loading=${pending} ?disabled=${pending}
                        @clicked=${() => this._dfApprove(m.id)}>${t.approve}</web-button>
                    <web-button type="soft" height="26px" ui=${this.ui} theme=${this.theme}
                        ?disabled=${pending}
                        @clicked=${() => this._runJobGuarded(m.id, division)}>${t.regenerate}</web-button>
                ` : ''}
                ${previewBtn}
            </div>
        `
    }
}

// Tag name 'svc-talk', NOT 'svc-talk' — avoids a global Custom Elements registry collision
// with division/svc-talk.js (see svc-progress.js's header for the full rationale) — matters even
// though LayoutAdmin.astro now mounts only this version (division/svc-talk.js's own script/tag no
// longer loaded there), since either file could still be mounted standalone elsewhere later.
if (!customElements.get('svc-talk')) customElements.define('svc-talk', SvcTalk)
export default SvcTalk
