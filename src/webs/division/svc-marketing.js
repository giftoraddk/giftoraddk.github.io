// src/webs/division/svc-marketing.js
//
// <svc-marketing> — generic AI content-generation popup, attached to any web-table row via the
// `marketing` prop (mirrors svc-diffs.js's `history` integration). Public API: open(recordId).
//
// 4-step AI pipeline (see tools/prompts.js): Strategy Analysis -> Content Strategy -> Content
// Generation -> Image Generation. Progress persisted to Firestore collection `mktTable` (default
// 'mkt'), 1 doc per record_id, overwritten on regenerate — so a failed step can retry without
// redoing earlier steps. Final title/description/content/pics are only written to `table`
// (default 'records') when the user clicks Save.
//
// Self-contained like svc-diffs.js/svc-assist.js — no separate tools/service.js.
import { LitElement, html, unsafeCSS } from 'lit'
import { keyed } from 'lit/directives/keyed.js'
import '@/webs/apex/web-dialog.js'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-textarea.js'
import '@/webs/apex/web-select.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-steps.js'
import '@/webs/apex/web-colors.js'
import '@/webs/media/svc-editor.js'
import '@/webs/media/svc-photor.js'
import { createService } from '@/services/crud.js'
import { generateText, demoteModel } from '@/services/tensor.js'
import { txtLingo, toastEmit } from '@/services/helper.js'
import {
    buildStep1Prompt, buildStep2Prompt, buildStep3TitleDescPrompt, buildStep3ContentPrompt,
    buildImageConceptPrompt, buildImagePrompt, IMAGE_NEGATIVE_PROMPT,
    STEP1_KEYS, STEP1_GROUPS, STEP2_KEYS, STEP2_GROUPS, MKT_ALL_KEYS, LANGUAGE_OPTIONS,
} from './tools/prompts.js'
import { uploadImageBlob } from '@/webs/media/tools/photor.js'
import styles from './styles/svc-marketing.css?inline'

const LANGUAGE_SELECT_OPTS = LANGUAGE_OPTIONS.map(o => ({ value: o.value, label: o.label }))

const STEPS = [
    { id: 1, vi: 'Phân tích', en: 'Strategy Analysis' },
    { id: 2, vi: 'Chiến lược',en: 'Content Strategy' },
    { id: 3, vi: 'Nội dung',  en: 'Content Generation' },
    { id: 4, vi: 'Tạo ảnh',   en: 'Image Generation' },
]

// Tiến trình con hiển thị lồng dưới mỗi step lớn (feedback "đang làm việc" chi tiết hơn) — key
// khớp với key truyền vào _runSub() ở từng _runStepN.
const SUB_STEPS = {
    1: [
        { key: 'g1', vi: 'Chủ đề & khách hàng',   en: 'Topic & customer' },
        { key: 'g2', vi: 'Nhu cầu & nỗi đau',     en: 'Needs & pain points' },
        { key: 'g3', vi: 'Động lực & insight',    en: 'Motivation & insight' },
    ],
    // key ở đây chính là mkt field name (khác step 1's g1/g2/g3 abstraction) — STEP2_GROUPS mỗi
    // group chỉ 1 field, _rfSubContent(2, key) đọc thẳng this._doc.mkt[key] không cần map ngược.
    2: [
        { key: 'contentPillars', vi: 'Trụ cột nội dung', en: 'Content pillars' },
        { key: 'funnelStrategy', vi: 'Chiến lược phễu',  en: 'Funnel strategy' },
        { key: 'contentAngles',  vi: 'Góc độ nội dung',  en: 'Content angles' },
    ],
    3: [
        { key: 'titleDesc', vi: 'Tiêu đề & mô tả',   en: 'Title & description' },
        { key: 'content',   vi: 'Nội dung bài viết', en: 'Article content' },
    ],
    4: [
        { key: 'concept',  vi: 'Mô tả ảnh',   en: 'Image concept' },
        { key: 'generate', vi: 'Tạo ảnh',     en: 'Generate image' },
        { key: 'upload',   vi: 'Tải ảnh lên', en: 'Upload image' },
    ],
}

const MKT_LABELS = {
    vi: {
        topicAnalysis: 'Phân tích chủ đề', targetCustomer: 'Khách hàng mục tiêu',
        customerSituation: 'Tình huống hiện tại', customerNeeds: 'Nhu cầu',
        painPoints: 'Nỗi đau', customerDesires: 'Mong muốn',
        fearsObjections: 'Nỗi sợ & phản đối', buyingMotivation: 'Động lực mua hàng',
        customerInsight: 'Insight khách hàng', contentPillars: 'Trụ cột nội dung',
        funnelStrategy: 'Chiến lược phễu', contentAngles: 'Góc độ nội dung',
    },
    en: {
        topicAnalysis: 'Topic Analysis', targetCustomer: 'Target Customer',
        customerSituation: 'Customer Situation', customerNeeds: 'Customer Needs',
        painPoints: 'Pain Points', customerDesires: 'Customer Desires',
        fearsObjections: 'Fears & Objections', buyingMotivation: 'Buying Motivation',
        customerInsight: 'Customer Insight', contentPillars: 'Content Pillars',
        funnelStrategy: 'Funnel Strategy', contentAngles: 'Content Angles',
    },
}

const TXT_STD = {
    vi: {
        title: 'AI Marketing',
        topicLabel: 'Chủ đề', topicPlaceholder: 'Nhập chủ đề cần viết nội dung marketing…',
        languageLabel: 'Ngôn ngữ nội dung',
        colorsLabel: 'Màu chủ đạo cho ảnh (bỏ trống = ngẫu nhiên)',
        generate: 'Tạo nội dung',
        errNeedTopic: 'Vui lòng nhập chủ đề', errNeedAi: 'Cần cấu hình AI để dùng tính năng này',
        errBadResponse: 'AI trả dữ liệu không hợp lệ',
        retry: 'Thử lại',
        titleLabel: 'Tiêu đề', descLabel: 'Mô tả', contentLabel: 'Nội dung', picsLabel: 'Ảnh minh họa',
        contentPlaceholder: 'Nội dung bài viết…',
        regenerate: 'Tạo lại', save: 'Lưu',
        regenerateImage: 'Tạo lại ảnh',
        promptCopied: 'Đã copy prompt ảnh — dán vào ô chat nếu trang không tự điền sẵn',
        saveOk: 'Đã lưu vào bài viết', saveFail: 'Lưu thất bại',
    },
    en: {
        title: 'AI Marketing',
        topicLabel: 'Topic', topicPlaceholder: 'Enter a topic to generate marketing content…',
        languageLabel: 'Content language',
        colorsLabel: 'Image accent colors (leave empty = random)',
        generate: 'Generate content',
        errNeedTopic: 'Please enter a topic', errNeedAi: 'AI must be configured to use this feature',
        errBadResponse: 'AI returned invalid data',
        retry: 'Retry',
        titleLabel: 'Title', descLabel: 'Description', contentLabel: 'Content', picsLabel: 'Image',
        contentPlaceholder: 'Article content…',
        regenerate: 'Regenerate', save: 'Save',
        regenerateImage: 'Regenerate image',
        promptCopied: 'Image prompt copied — paste it in the chat box if not auto-filled',
        saveOk: 'Saved to record', saveFail: 'Save failed',
    },
}

function _freshDoc(recordId, relation, language) {
    return {
        id: recordId, record_id: recordId, relation,
        topic: '', language: language || 'vi', colors: '',
        status: 'idle', error: '',
        mkt: Object.fromEntries(MKT_ALL_KEYS.map(k => [k, ''])),
        draft: { title: '', description: '', content: '', pics: '', imagePrompt: '' },
        created_at: null, updated_at: null,
    }
}

// alt="" attribute của <img> chèn vào content phải escape — title là text tự do (có thể chứa
// dấu ngoặc kép) được nội suy thẳng vào chuỗi HTML.
function _escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Bóc <figure> ảnh CŨ (nếu có) khỏi ĐẦU content trước khi chèn ảnh MỚI — cần thiết khi regenerate
// ảnh SAU KHI step 4 đã từng thành công (nút "Tạo lại ảnh" ở review phase, xem _dfRegenerateImage),
// tránh chèn trùng 2 <figure> liên tiếp. Vô hại (no-op) ở lượt chạy pipeline đầu tiên vì content
// lúc đó chưa có figure nào.
function _stripLeadingFigure(content) {
    return (content || '').replace(/^\s*<figure data-media-wrap="image"[^>]*>[\s\S]*?<\/figure>\s*/, '')
}

// Cùng quy ước mask key với src/services/tensor.js: splice `~k!t@d~` vào giữa key để né grep
// văn bản thuần trong bundle đã build — bóc marker này ra trước khi dùng.
const _MASK_MARKER = '~k!t@d~'
function _unmaskEnv(s) {
    return s?.includes(_MASK_MARKER) ? s.split(_MASK_MARKER).join('') : s
}

// Dò chữ Hán/Kana/Hangul lẫn vào response của ngôn ngữ Latin — xem _hasForeignScript().
const _CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿가-힣豈-﫿]/
const _CJK_LANGS = new Set(['Chinese', 'Japanese', 'Korean'])

export class SvcMarketing extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        table:    { type: String },  // bảng đích ghi title/description/content, mặc định 'records'
        mktTable: { type: String },  // collection lưu tiến trình, mặc định 'mkt'
        ai:       { type: String },
        ui:       { type: String }, theme: { type: String }, lang: { type: String },
        txt:      { type: Object },

        _open:        { state: true },
        _recordId:    { state: true },
        _phase:       { state: true },  // 'input' | 'running' | 'review'
        _doc:         { state: true },
        _loading:     { state: true },  // đang chờ _dfSave()
        _runningStep: { state: true },  // 0 = không có step nào đang chạy, 1-4 = step đang chạy
        _failedStep:  { state: true },  // 0 = không lỗi, 1-4 = step lỗi cần retry
        _error:       { state: true },
        _runningSubSteps: { state: true },  // Set<"step-key"> sub-step đang loading (feedback UI)
        _doneSubSteps:    { state: true },  // Set<"step-key"> sub-step đã xong trong lượt chạy hiện tại
        _regeneratingImage: { state: true }, // đang chờ nút "Tạo lại ảnh" ở review phase (_dfRegenerateImage)
    }

    constructor() {
        super()
        this.table    = 'records'
        this.mktTable = 'mkt'
        this.ai       = ''
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi'; this.txt = null
        this._open        = false
        this._recordId    = ''
        this._phase        = 'input'
        this._doc          = _freshDoc('', this.table, this.lang)
        this._loading       = false
        this._runningStep   = 0
        this._failedStep    = 0
        this._error         = ''
        this._runningSubSteps = new Set()
        this._doneSubSteps    = new Set()
        this._regeneratingImage = false
        this._reqId          = 0 // guard chống race khi đóng popup/regenerate giữa lúc đang chờ AI — không phải Lit property
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    async open(recordId) {
        if (!recordId) return
        this._recordId = recordId
        this._open      = true
        this._error      = ''
        await this._dcLoadMkt(recordId)
    }

    close() { this._reqId++; this._open = false }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcLoadMkt(recordId) {
        this._runningStep = 0
        this._failedStep  = 0
        // <svc-marketing> là 1 instance dùng lại cho nhiều row (svc-admin.js gọi open(id) mỗi
        // lần) — xoá sạch tiến trình con của lượt trước, tránh hiện nhầm dấu tick của record A
        // khi vừa mở record B.
        this._runningSubSteps = new Set()
        this._doneSubSteps    = new Set()
        this._regeneratingImage = false
        try {
            const existing = await this._svc.findById(recordId)
            if (existing?.status === 'done') {
                this._doc = existing
                this._phase = 'review'
            } else if (existing?.status && existing.status !== 'idle') {
                this._doc = existing
                this._failedStep = Number(String(existing.status).replace('step', '')) || 0
                this._error = existing.error || ''
                this._phase = 'running'
            } else {
                this._doc = _freshDoc(recordId, this.table, this.lang)
                this._phase = 'input'
            }
        } catch (err) {
            console.error('[svc-marketing] load failed:', err.message)
            this._doc = _freshDoc(recordId, this.table, this.lang)
            this._phase = 'input'
        }
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhTopicInput(e)    { this._doc = { ...this._doc, topic: e.detail.value } }
    _dhLanguageChange(e) { this._doc = { ...this._doc, language: e.detail.value } }
    _dhColorsChange(e)   { this._doc = { ...this._doc, colors: e.detail.value } }
    _dhFieldEdit(key, value) { this._doc = { ...this._doc, draft: { ...this._doc.draft, [key]: value } } }

    // <svc-photor> ở sub-step 'upload' (review phase, xem _rfSubContent) — user tự upload ảnh từ
    // máy tính để THAY ảnh AI đã tạo. Thay hẳn <figure> ảnh cũ trong content bằng ảnh mới (hoặc bỏ
    // hẳn nếu user bấm nút xoá trong <svc-photor>, url rỗng) — cùng cách _dfRegenerateImage() làm,
    // rồi persist ngay vào doc mkt (KHÔNG đụng tới bản ghi cuối cùng ở `table`, chỉ ghi khi Lưu).
    async _dhPhotorUpload(e) {
        const url = e.detail.value || ''
        if (url === this._doc.draft.pics) return
        const bodyContent = _stripLeadingFigure(this._doc.draft.content)
        const figure = url
            ? `<figure data-media-wrap="image" data-align="center"><img src="${_escapeAttr(url)}" alt="${_escapeAttr(this._doc.draft.title || this._doc.topic)}"></figure>`
            : ''
        const now = await this._svc.now()
        this._doc = { ...this._doc, draft: { ...this._doc.draft, pics: url, content: `${figure}${bodyContent}` }, updated_at: now }
        await this._svc.set(this._recordId, this._doc)
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    /**
     * Flow pipeline AI: chạy step fromStep..4 tuần tự, ghi Firestore ngay sau mỗi step thành
     * công (retry không mất kết quả step trước) -> phase 'review' khi xong step 4.
     */
    async _dfRunPipeline(fromStep = 1) {
        if (fromStep === 1) {
            const topic = (this._doc.topic || '').trim()
            if (!topic) { this._error = this._txt.errNeedTopic; return }
            if (!this.ai) { this._error = this._txt.errNeedAi; return }
            // Chạy mới từ đầu (không phải retry 1 step lẻ) — xoá sạch trạng thái sub-step của
            // LƯỢT TRƯỚC, tránh step 2/3/4 hiện nhầm dấu tick xanh "đã xong" từ lần chạy cũ trong
            // lúc step 1 của lượt mới còn đang chạy.
            this._runningSubSteps = new Set()
            this._doneSubSteps    = new Set()
        }
        this._error       = ''
        this._failedStep  = 0
        this._phase        = 'running'
        const reqId = ++this._reqId

        for (let step = fromStep; step <= 4; step++) {
            this._runningStep = step
            try {
                const patch = await this._dfCallStep(step, reqId)
                if (reqId !== this._reqId) return
                const now = await this._svc.now()
                this._doc = step >= 3
                    ? { ...this._doc, draft: { ...this._doc.draft, ...patch }, status: step === 4 ? 'done' : `step${step}`, error: '', updated_at: now, created_at: this._doc.created_at || now }
                    : { ...this._doc, mkt: { ...this._doc.mkt, ...patch }, status: `step${step}`, error: '', updated_at: now, created_at: this._doc.created_at || now }
                await this._svc.set(this._recordId, this._doc)
            } catch (err) {
                if (reqId !== this._reqId) return
                this._runningStep = 0
                this._failedStep  = step
                this._error         = err.message || String(err)
                this._doc            = { ...this._doc, status: `step${step}`, error: this._error }
                await this._svc.set(this._recordId, this._doc).catch(err => console.error('[svc-marketing] failed to persist error state:', err.message))
                return
            }
        }
        this._runningStep = 0
        this._phase         = 'review'
    }

    _dfCallStep(step, reqId) {
        const langOpt = LANGUAGE_OPTIONS.find(o => o.value === this._doc.language) || LANGUAGE_OPTIONS[0]
        if (step === 1) return this._runStep1(this._doc.topic, langOpt.name, reqId)
        if (step === 2) return this._runStep2(this._doc.topic, langOpt.name, reqId)
        if (step === 3) return this._runStep3(this._doc.topic, langOpt.name, reqId)
        return this._runStep4(this._doc.topic, reqId)
    }

    // Xoá trạng thái sub-step của 1 step cụ thể trước khi chạy lại (fresh run hoặc retry riêng
    // step đó) — không đụng tới sub-step của step khác. `onlyKeys` (tuỳ chọn) chỉ xoá đúng những
    // key đó, giữ nguyên các key còn lại — dùng khi retry riêng generate/upload của step 4 mà
    // không muốn xoá luôn 'concept' đã xong (không cần dịch lại prompt ảnh mỗi lần retry).
    _subReset(step, onlyKeys) {
        const drop = s => new Set([...s].filter(k => {
            if (!k.startsWith(`${step}-`)) return true
            return onlyKeys ? !onlyKeys.includes(k.slice(`${step}-`.length)) : false
        }))
        this._runningSubSteps = drop(this._runningSubSteps)
        this._doneSubSteps    = drop(this._doneSubSteps)
    }

    // Bọc 1 sub-step: đánh dấu đang chạy -> chạy fn() -> đánh dấu xong (hoặc bỏ khỏi "đang chạy"
    // nếu lỗi, KHÔNG đánh dấu xong). reqId guard giống pattern _dfRunPipeline — bỏ qua update UI
    // nếu popup đã đóng/regenerate giữa lúc sub-step đang chạy (tránh set state trên lượt cũ).
    async _runSub(reqId, step, key, fn) {
        const k = `${step}-${key}`
        if (reqId === this._reqId) {
            const running = new Set(this._runningSubSteps).add(k)
            const done    = new Set(this._doneSubSteps); done.delete(k)
            this._runningSubSteps = running
            this._doneSubSteps    = done
        }
        try {
            const result = await fn()
            if (reqId === this._reqId) {
                const running = new Set(this._runningSubSteps); running.delete(k)
                this._runningSubSteps = running
                this._doneSubSteps    = new Set(this._doneSubSteps).add(k)
            }
            return result
        } catch (err) {
            if (reqId === this._reqId) {
                const running = new Set(this._runningSubSteps); running.delete(k)
                this._runningSubSteps = running
            }
            throw err
        }
    }

    // Group/field đã có dữ liệu THẬT từ lượt chạy trước (vd retry sau khi macro step lỗi ở
    // group/field KHÁC) — đánh dấu done ngay, không gọi lại AI, chỉ trả về giá trị đã có. Đây là
    // gốc của "bấm Thử lại chỉ xử lý lại đúng sub-step lỗi" — _dfRunPipeline retry luôn gọi lại
    // NGUYÊN macro step, nhưng mỗi group/field bên trong tự bỏ qua nếu đã xong từ lần chạy trước.
    _skipIfDone(reqId, step, key, keys, src) {
        if (!this._comSubHasData(step, key)) return null
        if (reqId === this._reqId) this._doneSubSteps = new Set(this._doneSubSteps).add(`${step}-${key}`)
        return this._pick(src, keys)
    }

    // 9 field chia thành 3 lệnh gọi AI riêng (STEP1_GROUPS, 3 field/lệnh) — 1 lệnh duy nhất cho
    // cả 9 field từng bị cắt cụt giữa chừng (Unterminated string) khi model viết dài hơn dự tính,
    // vượt maxTokens. 3 group độc lập với nhau (không group nào cần kết quả group khác) nên chạy
    // song song (Promise.all) thay vì tuần tự để có kết quả nhanh hơn — mỗi group đã tự retry
    // riêng qua _generateJson nếu bị lỗi/rate-limit, nên chạy đồng thời không tệ hơn tuần tự.
    async _runStep1(topic, languageName, reqId) {
        this._subReset(1)
        const results = await Promise.all(STEP1_GROUPS.map((keys, i) => {
            const key = `g${i + 1}`
            const skip = this._skipIfDone(reqId, 1, key, keys, this._doc.mkt)
            if (skip) return skip
            return this._runSub(reqId, 1, key, async () => {
                const { system, user } = buildStep1Prompt(topic, languageName, keys)
                const obj = await this._generateJson(system, user, 1200, 0.7, languageName)
                const partial = this._pick(obj, keys)
                // Hiện ngay nội dung group này (không đợi 2 group song song kia xong) — xem
                // _rfSubContent(). Chỉ update hiển thị cục bộ; _dfRunPipeline vẫn merge+persist
                // lại đúng 1 lần sau khi cả 3 group xong như cũ (idempotent, không ghi Firestore
                // thêm ở đây).
                if (reqId === this._reqId) this._doc = { ...this._doc, mkt: { ...this._doc.mkt, ...partial } }
                return partial
            })
        }))
        return results.reduce((mkt, r) => ({ ...mkt, ...r }), {})
    }

    // 3 field chia thành 3 lệnh gọi AI riêng (STEP2_GROUPS, 1 field/lệnh) — 1 lệnh duy nhất cho cả
    // 3 field từng bị cắt cụt giữa chừng (Unterminated string ở ~1191 ký tự dù maxTokens:1200).
    // 3 field độc lập với nhau (không field nào cần kết quả field khác) nên chạy song song
    // (Promise.all), giống _runStep1.
    async _runStep2(topic, languageName, reqId) {
        this._subReset(2)
        const results = await Promise.all(STEP2_GROUPS.map(keys => {
            const key = keys[0]
            const skip = this._skipIfDone(reqId, 2, key, keys, this._doc.mkt)
            if (skip) return skip
            return this._runSub(reqId, 2, key, async () => {
                const { system, user } = buildStep2Prompt(topic, languageName, this._doc.mkt, keys)
                const obj = await this._generateJson(system, user, 600, 0.75, languageName)
                const partial = this._pick(obj, keys)
                if (reqId === this._reqId) this._doc = { ...this._doc, mkt: { ...this._doc.mkt, ...partial } }
                return partial
            })
        }))
        return results.reduce((mkt, r) => ({ ...mkt, ...r }), {})
    }

    // content (bài viết đầy đủ) tách khỏi title/description — content dài hơn hẳn 2 field kia,
    // gộp chung 1 lệnh dễ khiến content bị cắt cụt trước khi model kịp viết xong. content phụ
    // thuộc title đã chốt (đưa vào prompt cho mạch lạc) nên 2 lệnh này PHẢI tuần tự, không chạy
    // song song được như step 1.
    async _runStep3(topic, languageName, reqId) {
        this._subReset(3)
        const titleDescKeys = ['title', 'description']
        const skipTitleDesc = this._skipIfDone(reqId, 3, 'titleDesc', titleDescKeys, this._doc.draft)
        const { title, description } = skipTitleDesc || await this._runSub(reqId, 3, 'titleDesc', async () => {
            const { system, user } = buildStep3TitleDescPrompt(topic, languageName, this._doc.mkt)
            const obj = await this._generateJson(system, user, 500, 0.75, languageName)
            const partial = {
                title:       typeof obj.title === 'string' ? obj.title : '',
                description: typeof obj.description === 'string' ? obj.description : '',
            }
            if (reqId === this._reqId) this._doc = { ...this._doc, draft: { ...this._doc.draft, ...partial } }
            return partial
        })

        const skipContent = this._skipIfDone(reqId, 3, 'content', ['content'], this._doc.draft)
        const content = skipContent?.content ?? await this._runSub(reqId, 3, 'content', async () => {
            const { system, user } = buildStep3ContentPrompt(topic, languageName, this._doc.mkt, title)
            const obj = await this._generateJson(system, user, 3000, 0.75, languageName)
            const value = typeof obj.content === 'string' ? obj.content : ''
            if (reqId === this._reqId) this._doc = { ...this._doc, draft: { ...this._doc.draft, content: value } }
            return value
        })

        return { title, description, content }
    }

    // Step 4a (concept): dịch/diễn giải topic (có thể viết bằng bất kỳ ngôn ngữ nào) sang 1 mô tả
    // cảnh/vật thể tiếng Anh CỤ THỂ trước khi gọi model ảnh — đưa thẳng topic thô ngôn ngữ khác
    // tiếng Anh vào model từng khiến ảnh sai hẳn chủ đề (CLIP text encoder của SD3 không hiểu tốt
    // ngôn ngữ khác tiếng Anh, rơi về mặc định stock-photo chung chung, vd "quà tri ân" ra toàn
    // ảnh chân dung phụ nữ). Chỉ chạy 1 lần (không nằm trong retry loop generate/upload của
    // _runImageGenerate) — dịch lại không giúp ích gì nếu lỗi thật sự nằm ở việc gọi Hugging Face,
    // chỉ tốn thêm 1 lệnh AI mỗi lần retry; xem buildImageConceptPrompt (prompts.js).
    async _runStep4(topic, reqId) {
        this._subReset(4)
        const skipConcept = this._skipIfDone(reqId, 4, 'concept', ['imagePrompt'], this._doc.draft)
        const subject = skipConcept?.imagePrompt || await this._runSub(reqId, 4, 'concept', async () => {
            const { system, user } = buildImageConceptPrompt(topic, this._doc.mkt)
            const obj = await this._generateJson(system, user, 150, 0.7, 'English')
            const value = typeof obj.imagePrompt === 'string' && obj.imagePrompt.trim() ? obj.imagePrompt.trim() : topic
            if (reqId === this._reqId) this._doc = { ...this._doc, draft: { ...this._doc.draft, imagePrompt: value } }
            return value
        })
        const promptText = buildImagePrompt(subject, this._doc.colors)
        return this._runImageGenerate(promptText, reqId)
    }

    // Step 4b/4c (generate/upload) — tách riêng khỏi _runStep4 để dùng lại được cho cả pipeline
    // gốc lẫn nút "Tạo lại ảnh" thủ công ở review phase (_dfRegenerateImage, chỉ regenerate ảnh,
    // KHÔNG dịch lại concept). KHÔNG gọi generateText()/AI JSON — chỉ 1 network call thật (Hugging
    // Face Inference API trả thẳng bytes ảnh, xem src/services/photor.js's uploadImageBlob) nên
    // không có rủi ro JSON-parse/truncation như step 1-3. Ảnh được chèn (prepend) vào content hiện
    // có — tự bóc figure ảnh CŨ trước (xem _stripLeadingFigure) vì hàm này giờ có thể chạy NHIỀU
    // lần trên cùng 1 doc (khác trước đây khi step 4 pipeline chỉ chạy đúng 1 lần).
    //
    // Model free serverless của HF thỉnh thoảng trả 503 "model đang load" ở lần gọi đầu (cold
    // start) hoặc lỗi mạng thoáng qua — retry có backoff tăng dần (không delay ở lần đầu), cùng
    // cách tiếp cận đã dùng cho _generateJson.
    async _runImageGenerate(promptText, reqId) {
        const hfKey = _unmaskEnv(import.meta.env.PUBLIC_HUGGIN)
        if (!hfKey) throw new Error('PUBLIC_HUGGIN chưa được cấu hình')

        let lastErr
        for (let attempt = 1; attempt <= 3; attempt++) {
            this._subReset(4, ['generate', 'upload'])
            if (attempt > 1) await new Promise(r => setTimeout(r, attempt * 3000))
            try {
                const blob = await this._runSub(reqId, 4, 'generate', async () => {
                    const res = await fetch('https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers', {
                        method: 'POST',
                        headers: { authorization: `Bearer ${hfKey}`, 'content-type': 'application/json' },
                        body: JSON.stringify({ inputs: promptText, parameters: { negative_prompt: IMAGE_NEGATIVE_PROMPT } }),
                    })
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        throw new Error(`Hugging Face ${res.status}: ${err.error || res.statusText}`)
                    }
                    return res.blob()
                })
                const url    = await this._runSub(reqId, 4, 'upload', async () => {
                    const u = await uploadImageBlob(blob)
                    if (reqId === this._reqId) this._doc = { ...this._doc, draft: { ...this._doc.draft, pics: u } }
                    return u
                })
                const figure = `<figure data-media-wrap="image" data-align="center"><img src="${_escapeAttr(url)}" alt="${_escapeAttr(this._doc.draft.title || this._doc.topic)}"></figure>`
                return { pics: url, content: `${figure}${_stripLeadingFigure(this._doc.draft.content)}` }
            } catch (err) {
                lastErr = err
                console.warn(`[svc-marketing] image generation attempt ${attempt}/3 failed:`, err.message)
            }
        }
        throw lastErr
    }

    // Nút "Tạo lại ảnh" — chỉ hiện ở review phase (xem _rfSubContent(4,'generate')). Tái dùng
    // concept/mô tả ảnh đã dịch trước đó (this._doc.draft.imagePrompt), KHÔNG đụng gì tới
    // title/description/content/mkt — khác hẳn nút "Tạo lại" (regenerate) reset về hẳn phase
    // 'input', làm lại từ đầu topic.
    async _dfRegenerateImage() {
        if (this._regeneratingImage) return
        this._regeneratingImage = true
        const reqId = this._reqId
        try {
            const subject = this._doc.draft.imagePrompt || this._doc.topic
            const promptText = buildImagePrompt(subject, this._doc.colors)
            const patch = await this._runImageGenerate(promptText, reqId)
            if (reqId === this._reqId) {
                const now = await this._svc.now()
                this._doc = { ...this._doc, draft: { ...this._doc.draft, ...patch }, updated_at: now }
                await this._svc.set(this._recordId, this._doc)
            }
        } catch (err) {
            toastEmit(err.message || String(err), 'error')
        }
        this._regeneratingImage = false
    }

    // 3 nút tròn mở prompt ảnh trên site AI thứ 3 (ChatGPT/Gemini qua AI Studio/Claude), đều thử
    // prefill sẵn qua query param — luôn copy prompt vào clipboard trước làm phương án dự phòng
    // chắc chắn hoạt động (vd tài khoản/khu vực nào đó không hỗ trợ prefill), user vẫn dán tay
    // được ngay. Gemini dùng AI Studio (`prompt=`) thay vì gemini.google.com/app (`q=`) — theo
    // đúng link user cung cấp.
    _dfOpenExternalAI(site) {
        const subject = this._doc.draft.imagePrompt || this._doc.topic
        const prompt  = buildImagePrompt(subject, this._doc.colors)
        navigator.clipboard?.writeText(prompt).catch(() => {})
        const q = encodeURIComponent(prompt)
        const urls = {
            chatgpt: `https://chatgpt.com/?q=${q}`,
            claude:  `https://claude.ai/new?q=${q}`,
            gemini:  `https://aistudio.google.com/prompts/new_chat?model=gemini-3.1-flash-lite-image&prompt=${q}`,
        }
        window.open(urls[site], '_blank', 'noopener')
        toastEmit(this._txt.promptCopied, 'success')
    }

    async _dfSave() {
        this._loading = true
        try {
            const svc = createService(this.table || 'records')
            const now = await svc.now()
            const payload = {
                title:       this._doc.draft.title,
                description: this._doc.draft.description,
                content:     this._doc.draft.content,
                updated_at:  now,
            }
            if (this._doc.draft.pics) payload.pics = this._doc.draft.pics
            await svc.update(this._recordId, payload)
            toastEmit(this._txt.saveOk, 'success')
            // Gửi kèm field vừa ghi (không kèm updated_at — nơi nghe patch local state hiển thị,
            // không cần giá trị timestamp server) để nơi gọi (vd svc-admin.js) cập nhật lại _data
            // ngay không cần đọc lại Firestore.
            const { updated_at, ...savedFields } = payload
            this.dispatchEvent(new CustomEvent('marketing:saved', { detail: { id: this._recordId, ...savedFields }, bubbles: true, composed: true }))
            this.close()
        } catch (err) {
            toastEmit(`${this._txt.saveFail}: ${err.message}`, 'error')
        }
        this._loading = false
    }

    _dfRegenerate() {
        this._reqId++
        this._runningStep = 0
        this._failedStep  = 0
        this._error         = ''
        this._doc            = _freshDoc(this._recordId, this.table, this._doc.language)
        this._phase           = 'input'
    }

    // ── AI response parsing (self-contained, mirrors svc-assist.js) ──────────────

    // Vài model free-tier (đặc biệt reasoning model) in suy luận TRƯỚC khi tới JSON thật dù
    // prompt đã dặn "không giải thích gì thêm" — JSON thật luôn là khối {...} CUỐI CÙNG trong
    // response, nên tìm từ '{' cuối tới '}' cuối thay vì chỉ strip code-fence ở đầu/cuối chuỗi.
    _cleanJson(raw) {
        const text  = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
        const start = text.lastIndexOf('{')
        const end   = text.lastIndexOf('}')
        if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1)
        return text
    }

    _parseJsonObject(raw) {
        let parsed
        try { parsed = JSON.parse(this._cleanJson(raw)) } catch (err) {
            console.error('[svc-marketing] JSON.parse failed:', err.message, '\nraw response:', raw)
            throw new Error(this._txt.errBadResponse)
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            console.error('[svc-marketing] parsed value is not a plain object:', parsed, '\nraw response:', raw)
            throw new Error(this._txt.errBadResponse)
        }
        return parsed
    }

    // Model free-tier thỉnh thoảng lẫn nguyên cụm chữ Hán/Nhật/Hàn vào response dù system prompt
    // đã yêu cầu 1 ngôn ngữ Latin (vd "Tết, 周年庆, kick-off năm mới" — bản thân JSON vẫn hợp lệ,
    // _parseJsonObject không bắt được lỗi này) — chỉ kiểm khi ngôn ngữ đích KHÔNG phải chính CJK
    // (Chinese/Japanese/Korean), tránh false-positive khi model được yêu cầu viết đúng 1 trong 3
    // ngôn ngữ đó.
    _hasForeignScript(obj, languageName) {
        if (_CJK_LANGS.has(languageName)) return false
        return Object.values(obj).some(v => typeof v === 'string' && _CJK_PATTERN.test(v))
    }

    // Gọi AI + parse JSON, tự động thử lại ngầm tối đa 3 lần trước khi báo lỗi thật cho UI —
    // model free-tier đôi khi trả response hỏng (cắt cụt, lẫn suy luận, lẫn ngôn ngữ khác) một
    // cách ngẫu nhiên, lần gọi lại thường trúng model/kết quả khác ổn định hơn mà người dùng
    // không cần tự bấm "Thử lại" thủ công.
    async _generateJson(system, user, maxTokens, temperature, languageName) {
        let lastErr
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const raw = await generateText(this._comJsonAi, [{ role: 'user', content: user }], { system, maxTokens, temperature })
                const obj = this._parseJsonObject(raw)
                if (this._hasForeignScript(obj, languageName)) {
                    console.error('[svc-marketing] response lẫn ký tự ngôn ngữ khác:', obj)
                    throw new Error(this._txt.errBadResponse)
                }
                return obj
            } catch (err) {
                lastErr = err
                console.warn(`[svc-marketing] JSON generation attempt ${attempt}/3 failed:`, err.message)
                // _parseJsonObject lỗi = request tới model đó ĐÃ THÀNH CÔNG (có text trả về), chỉ
                // là text không phải JSON hợp lệ — tensor.js's createAIStream() không tự demote
                // trong trường hợp này (nó chỉ demote khi request thật sự lỗi mạng/HTTP), nên nếu
                // không ép demote thủ công, lần retry kế tiếp sẽ lặp lại ĐÚNG model vừa trả dữ liệu
                // hỏng thay vì thử model khác — đây chính là nguyên nhân lỗi "AI trả dữ liệu không
                // hợp lệ" vẫn lặp lại dù đã retry 3 lần.
                await demoteModel(this._comJsonAi).catch(() => {})
            }
        }
        throw lastErr
    }

    _pick(obj, keys) {
        const out = {}
        for (const k of keys) out[k] = typeof obj[k] === 'string' ? obj[k] : ''
        return out
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _svc() { return createService(this.mktTable || 'mkt') }

    // Ghim model cho các lệnh gọi JSON strict (không dùng this.ai trực tiếp — config đó để
    // tensor.js tự xoay vòng qua mọi model kể cả reasoning-model, gây response lẫn suy luận
    // thay vì JSON — xem hook debug 2026-09). PUBLIC_NVID~pinned~<model> ép model cụ thể qua
    // trước (nvidia/nemotron-3.5-lightning-30b-a3b — general-purpose, KHÔNG phải reasoning
    // model), rồi mới rơi xuống this.ai làm lưới an toàn nếu model ghim lỗi/hết quota.
    get _comJsonAi() {
        const nvid   = import.meta.env.PUBLIC_NVID
        const pinned = nvid ? `${nvid}~pinned~nvidia/nemotron-3.5-lightning-30b-a3b` : ''
        return [pinned, this.ai].filter(Boolean).join('|')
    }

    _comStepState(n) {
        const keys = n === 1 ? STEP1_KEYS : n === 2 ? STEP2_KEYS : n === 3 ? ['title', 'description', 'content'] : ['pics']
        const src  = n >= 3 ? this._doc.draft : this._doc.mkt
        const done = keys.every(k => (src[k] || '').toString().trim())
        if (done) return 'done'
        if (this._runningStep === n) return 'running'
        if (this._failedStep === n) return 'failed'
        return 'pending'
    }

    // Sub-step `key` đã có dữ liệu THẬT trong doc đã lưu chưa — dùng làm fallback "done" khi
    // record được mở thẳng vào phase 'review' từ Firestore (không có Set tracking của lượt chạy
    // hiện tại). Ánh xạ key -> field(s) khớp với _rfSubContent().
    _comSubHasData(stepId, key) {
        if (stepId === 1) {
            const keys = STEP1_GROUPS[Number(key.slice(1)) - 1] || [] // 'g1' -> 0, 'g2' -> 1, 'g3' -> 2
            return keys.some(k => (this._doc.mkt[k] || '').trim())
        }
        if (stepId === 2) return !!(this._doc.mkt[key] || '').trim()
        if (stepId === 3 && key === 'titleDesc') return !!(this._doc.draft.title || this._doc.draft.description)
        if (stepId === 3 && key === 'content')   return !!(this._doc.draft.content || '').trim()
        if (stepId === 4 && key === 'concept') return !!(this._doc.draft.imagePrompt || '').trim()
        // 'generate'/'upload' — review phase luôn coi là "có dữ liệu" (không rơi về 'pending') dù
        // pics tạm thời rỗng (vd user vừa bấm nút xoá ảnh trong <svc-photor>, xem _dhPhotorUpload)
        // — nếu không, sub-step sẽ tự collapse mất (web-steps' multi-open ẩn nội dung của step
        // 'pending'), khiến chính cái ô upload mà user cần bấm lại cũng biến mất theo.
        if (stepId === 4) return this._phase === 'review' || !!this._doc.draft.pics
        return false
    }

    // ── Render Body ────────────────────────────────────────────────────────────

    render() {
        return html`
            <web-dialog ?open=${this._open} title=${this._txt.title} lang=${this.lang}
                maxWidth="860px" ui=${this.ui} theme=${this.theme}
                @cancel=${() => this.close()} @close=${() => this.close()}>
                ${this._phase === 'input'   ? this._rbInputPhase()   : ''}
                ${this._phase === 'running' ? this._rbRunningPhase() : ''}
                ${this._phase === 'review'  ? this._rbReviewPhase()  : ''}
            </web-dialog>
        `
    }

    _rbInputPhase() {
        const t = this._txt
        return html`
            <div class="smk-input">
                <div class="smk-field">
                    <label>${t.topicLabel}</label>
                    <web-text ui=${this.ui} placeholder=${t.topicPlaceholder}
                        .value=${this._doc.topic} @input=${this._dhTopicInput}></web-text>
                </div>
                <div class="smk-field">
                    <label>${t.languageLabel}</label>
                    <web-select .options=${LANGUAGE_SELECT_OPTS} .value=${this._doc.language} .ui=${this.ui}
                        ?searchable=${false} @change=${this._dhLanguageChange}></web-select>
                </div>
                <div class="smk-field">
                    <label>${t.colorsLabel}</label>
                    <web-colors .value=${this._doc.colors} .ui=${this.ui} .theme=${this.theme}
                        .lang=${this.lang} @change=${this._dhColorsChange}></web-colors>
                </div>
                ${this._error ? html`<div class="smk-error">${this._error}</div>` : ''}
                <web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
                    ?disabled=${!this._doc.topic?.trim()}
                    @clicked=${() => this._dfRunPipeline(1)}>${t.generate}</web-button>
            </div>
        `
    }

    _rbRunningPhase() {
        const t = this._txt
        return html`
            <div class="smk-running">
                ${this._rfMacroSteps()}
                ${this._failedStep ? html`
                    <div class="smk-error">
                        ${this._error ? html`<span>${this._error}</span>` : ''}
                        <web-button type="soft" color="primary" ui=${this.ui} theme=${this.theme}
                            @clicked=${() => this._dfRunPipeline(this._failedStep || 1)}>${t.retry}</web-button>
                    </div>
                ` : ''}
            </div>
        `
    }

    // our status vocab ('pending'|'running'|'failed'|'done') -> web-steps' ('pending'|'active'|'error'|'done').
    _comWebStatus(state) {
        return state === 'running' ? 'active' : state === 'failed' ? 'error' : state
    }

    // `active` cho <web-steps> (step nào được xem mặc định, dùng chung cho cả progress-line và
    // slot content nào mở sẵn) — step đang chạy/lỗi được ưu tiên; nếu không còn step nào đang
    // chạy (review phase, mọi step đã done) thì mặc định mở step CUỐI CÙNG đã có dữ liệu, người
    // dùng tự bấm step khác để xem lại (linear mode cho phép xem mọi step done mà không đụng tiến
    // độ thật — xem prop `linear` của web-steps.js).
    get _comActiveMacroStep() {
        if (this._runningStep) return String(this._runningStep)
        if (this._failedStep)  return String(this._failedStep)
        for (let i = STEPS.length; i >= 1; i--) {
            if (this._comStepState(i) !== 'pending') return String(i)
        }
        return String(STEPS[0].id)
    }

    // Step lớn dạng horizontal (<web-steps linear>, không isVertical) — step nhỏ lồng bên trong
    // vẫn dạng vertical (xem _rfSubStepsWeb). linear mode: click 1 step đã done/đang active để
    // xem/thu gọn nội dung của nó (chặn nhảy tới step 'pending' chưa tới lượt); progress
    // line + icon check/spin/lỗi web-steps tự vẽ, không cần tự quản CSS/markup riêng. Dùng lại y
    // hệt cho cả running phase và review phase (2 nơi gọi cùng 1 hàm này).
    _rfMacroSteps() {
        const items = STEPS.map(s => ({
            id:     String(s.id),
            label:  s[this.lang] ?? s.vi,
            status: this._comWebStatus(this._comStepState(s.id)),
        }))
        return html`
            <web-steps linear size="md" ui=${this.ui} theme=${this.theme} class="horizontal-custom"
                .steps=${items} active=${this._comActiveMacroStep}>
                ${STEPS.map(s => html`<div slot=${String(s.id)} style="margin: 1rem">${this._rfSubStepsWeb(s.id)}</div>`)}
            </web-steps>
        `
    }

    // Tiến trình con lồng bên trong slot content của step lớn — cũng 1 <web-steps> con (nhỏ hơn,
    // size="sm") thay vì div tự vẽ, tiêu đề của mỗi sub-step (label) đã kèm sẵn icon loading/done
    // do web-steps tự vẽ (không còn "dư title loading" tách rời khỏi tên sub-step như bản cũ).
    // status ưu tiên Set tracking của lượt chạy hiện tại (feedback loading tức thời), rơi xuống
    // _comSubHasData() (đọc thẳng doc đã lưu) khi record mở thẳng vào phase 'review' từ Firestore
    // và chưa chạy pipeline lần nào trong session — nếu không, review 1 record cũ sẽ không xem lại
    // được step nào (Set tracking rỗng toàn bộ dù dữ liệu đã có sẵn trong doc).
    _rfSubStepsWeb(stepId) {
        const subs = SUB_STEPS[stepId]
        if (!subs?.length) return ''
        const items = subs.map(s => {
            const k = `${stepId}-${s.key}`
            const status = this._runningSubSteps.has(k) ? 'active'
                : (this._doneSubSteps.has(k) || this._comSubHasData(stepId, s.key)) ? 'done'
                : 'pending'
            return { id: s.key, label: s[this.lang] ?? s.vi, status }
        })
        if (items.every(i => i.status === 'pending')) return ''
        const active = items.find(i => i.status === 'active')?.id
            ?? [...items].reverse().find(i => i.status === 'done')?.id
            ?? items[0].id
        return html`
            <web-steps isVertical multiple linear size="sm" ui=${this.ui} theme=${this.theme}
                .steps=${items} active=${active}>
                ${subs.map(s => html`<div slot=${s.key}>${this._rfSubContent(stepId, s.key)}</div>`)}
            </web-steps>
        `
    }

    // Nội dung thật của 1 sub-step, hiện NGAY khi nó xong (không đợi cả step lớn xong) — đọc
    // trực tiếp this._doc.mkt/draft vì _runStepN đã ghi live vào đó ngay khi từng sub-step trả
    // kết quả (xem _runStep1/_runStep3/_runStep4), không cần state riêng để cache lại.
    _rfSubContent(stepId, key) {
        const t = this._txt
        if (stepId === 1) {
            const idx  = Number(key.slice(1)) - 1 // 'g1' -> 0, 'g2' -> 1, 'g3' -> 2
            const keys = STEP1_GROUPS[idx]
            if (!keys) return ''
            const labels = MKT_LABELS[this.lang] ?? MKT_LABELS.vi
            return html`
                <div class="smk-sub-content">
                    ${keys.map(k => this._doc.mkt[k] ? html`
                        <div class="smk-mkt-item">
                            <div class="smk-mkt-label">${labels[k]}</div>
                            <div class="smk-mkt-value">${this._doc.mkt[k]}</div>
                        </div>
                    ` : '')}
                </div>
            `
        }
        if (stepId === 2) {
            // key ở đây chính là mkt field name (STEP2_GROUPS mỗi group 1 field) và sub-step đã tự
            // hiện đúng tên field đó làm label (web-steps' step.label) — không lặp lại label ở đây
            // nữa, chỉ cần hiện value.
            return this._doc.mkt[key] ? html`
                <div class="smk-sub-content"><div class="smk-mkt-value">${this._doc.mkt[key]}</div></div>
            ` : ''
        }
        if (stepId === 3 && key === 'titleDesc') {
            return html`
                <div class="smk-sub-content">
                    <div class="smk-mkt-item"><div class="smk-mkt-label">${t.titleLabel}</div><div class="smk-mkt-value">${this._doc.draft.title}</div></div>
                    <div class="smk-mkt-item"><div class="smk-mkt-label">${t.descLabel}</div><div class="smk-mkt-value">${this._doc.draft.description}</div></div>
                </div>
            `
        }
        if (stepId === 3 && key === 'content') {
            const plain = this._doc.draft.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            if (!plain) return ''
            const snippet = plain.length > 160 ? `${plain.slice(0, 160)}…` : plain
            return html`<div class="smk-sub-content"><div class="smk-mkt-value">${snippet}</div></div>`
        }
        if (stepId === 4 && key === 'concept' && this._doc.draft.imagePrompt) {
            return html`<div class="smk-sub-content"><div class="smk-mkt-value">${this._doc.draft.imagePrompt}</div></div>`
        }
        // Nút "Tạo lại ảnh" — chỉ hiện ở review phase (đã có ảnh xong xuôi, xem _dfRegenerateImage)
        // — lúc đang chạy pipeline (running phase) bấm vào đây không có ý nghĩa gì.
        if (stepId === 4 && key === 'generate' && this._phase === 'review') {
            return html`
                <div class="smk-sub-content smk-generate-actions">
                    <web-button type="soft" ui=${this.ui} theme=${this.theme} prefix="ri:refresh-line"
                        ?loading=${this._regeneratingImage} ?disabled=${this._regeneratingImage}
                        @clicked=${() => this._dfRegenerateImage()}>${t.regenerateImage}</web-button>
                    <web-button square rounded="50%" height="32px" type="soft" ui=${this.ui} theme=${this.theme}
                        prefix="simple-icons:openai" title="ChatGPT"
                        @clicked=${() => this._dfOpenExternalAI('chatgpt')}></web-button>
                    <web-button square rounded="50%" height="32px" type="soft" ui=${this.ui} theme=${this.theme}
                        prefix="simple-icons:googlegemini" title="Gemini"
                        @clicked=${() => this._dfOpenExternalAI('gemini')}></web-button>
                    <web-button square rounded="50%" height="32px" type="soft" ui=${this.ui} theme=${this.theme}
                        prefix="simple-icons:anthropic" title="Claude"
                        @clicked=${() => this._dfOpenExternalAI('claude')}></web-button>
                </div>
            `
        }
        // svc-photor chỉ hiện ở review phase — cho phép user tự upload ảnh từ máy tính để THAY
        // ảnh AI đã tạo (vd không ưng kết quả AI/muốn dùng ảnh thật của mình), xem _dhPhotorUpload.
        if (stepId === 4 && key === 'upload') {
            if (this._phase !== 'review' && !this._doc.draft.pics) return ''
            return html`
                <div class="smk-sub-content">
                    ${this._phase === 'review' ? html`
                        <svc-photor .value=${this._doc.draft.pics} .ui=${this.ui} .lang=${this.lang}
                            @change=${e => this._dhPhotorUpload(e)}></svc-photor>
                    ` : ''}
                    ${this._doc.draft.pics ? html`<img class="smk-pics-preview smk-pics-preview-sm" src=${this._doc.draft.pics} alt="" />` : ''}
                </div>
            `
        }
        return ''
    }

    _rbReviewPhase() {
        const t = this._txt
        return html`
            <div class="smk-review">
                <div class="smk-field">
                    <label>${t.titleLabel}</label>
                    <web-text ui=${this.ui} .value=${this._doc.draft.title}
                        @input=${e => this._dhFieldEdit('title', e.detail.value)}></web-text>
                </div>
                <div class="smk-field">
                    <label>${t.descLabel}</label>
                    <web-textarea .value=${this._doc.draft.description} .ui=${this.ui} rows="4"
                        @input=${e => this._dhFieldEdit('description', e.detail.value)}></web-textarea>
                </div>
                ${this._doc.draft.pics ? html`
                    <div class="smk-field">
                        <label>${t.picsLabel}</label>
                        <img class="smk-pics-preview" src=${this._doc.draft.pics} alt="" />
                    </div>
                ` : ''}
                <div class="smk-field">
                    <label>${t.contentLabel}</label>
                    ${keyed(this._doc.draft.pics, html`
                        <svc-editor .value=${this._doc.draft.content} .ui=${this.ui} .theme=${this.theme}
                            ai=${this.ai} placeholder=${t.contentPlaceholder}
                            @change=${e => this._dhFieldEdit('content', e.detail.html)}></svc-editor>
                    `)}
                </div>
                <div style="padding: 1rem 0">
                  ${this._rfMacroSteps()}
                </div>
                <div class="smk-review-actions">
                    <web-button type="soft" ui=${this.ui} theme=${this.theme}
                        @clicked=${() => this._dfRegenerate()}>${t.regenerate}</web-button>
                    <web-button type="fill" color="primary" ui=${this.ui} theme=${this.theme}
                        ?loading=${this._loading} @clicked=${() => this._dfSave()}>${t.save}</web-button>
                </div>
            </div>
        `
    }
}

if (!customElements.get('svc-marketing')) customElements.define('svc-marketing', SvcMarketing)
export default SvcMarketing
