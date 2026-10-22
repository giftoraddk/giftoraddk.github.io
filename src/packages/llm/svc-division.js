// src/packages/llm/svc-division.js
//
// <svc-division> — bảng quản lý 1 phòng ban (bảng `divisions`, LLM_DB) theo giao diện mobile của User
// Portal (auth/app/svc-profile.js): trang chủ có hero + ô thống kê + các nhóm dòng, bấm vào dòng thì
// chuyển sang trang con (có nút quay lại). Dùng CHUNG cho mọi loại phòng ban — nội dung "Chức năng" tự
// theo loại (kind) của phòng ban (GET /v1/fn/sectors):
//   - phòng ban chat (consult): vai trò + nguyên tắc — chỉ admin xem/sửa (GET/POST /v1/fn/override); prompt thật chỉ
//     ghép ở Worker, không bao giờ tới trình duyệt người khác
//   - phòng ban quy trình (product, marketing, finance): xem khung các bước + đầu ra (GET /v1/fn/spec — outline, không
//     có role/task/desc)
// Tên/mô tả/avatar/bật-tắt (face) cũng lưu qua POST /v1/fn/override.
//
// Kiến thức ĐỘC LẬP: mỗi dòng `know` là bản sao tự đủ nội dung, không nối với phòng ban hay bảng nào — kho
// kiến thức thuộc về 1 `owner` (hubs.id = người mua gói; '' = kiến thức chung). Trang Kiến thức liệt kê/sửa
// kiến thức của `owner` (cùng owner svc-aide đang trả lời theo). Trang "Nạp từ API & MCP" (service/hub.js →
// worker/src/hubs.ts): trạng thái hub + MCP token (cấp / cấp lại, gửi email), nạp 1 API JSON (đường dẫn,
// loại) vào know + rel của owner đó, và các nguồn đã lưu để nạp lại. Spec: hook/MCP.rst.
//
// Owner không nhập tay: prop `owner` gán cứng, không thì `site` (svc-aide site="…" — kho riêng '@<host>' của 1 site nền
// tảng: kiến thức + persona + face), không thì hub của tài khoản đang đăng nhập, không thì '' (service/hub.js's
// resolveOwner). Worker vẫn chặn nạp vào owner không phải của mình (trừ admin).
//
// Quyền: sửa phòng ban = admin; sửa tay kiến thức = admin hoặc có token `know.*` (tablePolicy.ts); nạp từ
// API = hub đang có gói (vào đúng owner của mình) hoặc admin (owner bất kỳ). Worker tự embed lại vector.
//
// Events (bubbles + composed): `division-change` { division } sau khi lưu, `division-close` khi bấm
// quay lại ở trang chủ (chỉ hiện khi `closable`).
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import { keyed } from 'lit/directives/keyed.js'
import 'iconify-icon'
import { createService } from '@/services/core/crud.js'
import { pickTxt, txtLingo } from '@/services/tools/lingo.js'
import { auth } from '@/packages/auth/service/service.js'
import { parseRoles, hasAccess } from '@/packages/auth/tool/roles.js'
import { LLM_DB } from './tool/server.js'
import { hub, resolveOwner, siteOwner, onOwnerChange } from './service/hub.js'
import { fnApi } from './service/fn-api.js'
import { canonicalDivision, findFunction, displayTitle, displayAbout } from './tool/divisions.js'
import { CONSULT_ICON } from './tool/sectors.js'
import styles from './css/svc-division.css?inline'

const knowSvc = createService('know', '', LLM_DB)

// Gợi ý loại kiến thức — cùng danh sách với worker/src/knowImport.ts's KNOW_TYPES (worker gửi lại qua /v1/hubs/me).
const KNOW_TYPES = ['product', 'law', 'faq', 'medical', 'technical', 'finance', 'post', 'other']
const KNOW_LIMIT = 200
// ?owner= của "kiến thức chung" (owner '') — cùng hằng SHARED_OWNER ở worker/src/data.ts.
const SHARED_OWNER = '@shared'
const FORM_VIEWS = new Set(['know', 'info', 'hub'])
const splitPaths = (v) => String(v || '').split(',').map((p) => p.trim()).filter(Boolean)

const TXT_STD = {
    vi: {
        title: 'Quản lý phòng ban', back: 'Quay lại',
        statKnow: 'Kiến thức', statSteps: 'Bước', statPrinciples: 'Nguyên tắc', statTypes: 'Loại',
        groupFunction: 'Chức năng', groupKnow: 'Kiến thức', groupInfo: 'Thông tin',
        persona: 'Vai trò & nguyên tắc', pipeline: 'Quy trình xử lý', pipelineSub: '{n} bước · xuất ra {table}',
        status: 'Đang hoạt động', statusSub: 'Tắt để tạm dừng phòng ban',
        active: 'Hoạt động', inactive: 'Tạm dừng',
        knowBase: 'Kho kiến thức',
        info: 'Tên & mô tả', readOnly: 'Chế độ xem — cần tài khoản quản trị để chỉnh sửa.',
        role: 'Vai trò', rolePh: 'Mô tả vai trò của trợ lý…', principles: 'Nguyên tắc', principlePh: 'Một nguyên tắc…',
        addPrinciple: 'Thêm nguyên tắc', remove: 'Xoá',
        steps: 'Các bước', calls: '{n} lượt gọi AI', stepImage: 'Tạo ảnh', output: 'Đầu ra', outputTable: 'Bảng',
        outputStatus: 'Trạng thái bản ghi', requiresProduct: 'Chờ phòng Sản phẩm', stepsNote: 'Các bước là chuyên môn của hệ thống — chỉ xem ở đây.',
        personaPrivate: 'Vai trò & nguyên tắc là chuyên môn riêng — chỉ quản trị viên xem và sửa.', pipelineSignIn: 'Đăng nhập để xem các bước',
        search: 'Tìm kiến thức…', addKnow: 'Thêm kiến thức', emptyKnow: 'Chưa có kiến thức nào.',
        hubRow: 'Nạp từ API & MCP', hubRowSub: 'Đường dẫn API, loại · token MCP cho AI khác',
        ownerOf: 'Kiến thức của owner: {owner}', ownerShared: 'kiến thức chung',
        signIn: 'Đăng nhập tài khoản đã mua gói để nạp kiến thức.', noHub: 'Chưa có hub — mua gói xong token MCP sẽ được gửi qua email. Đã mua rồi thì bấm Kích hoạt.',
        activate: 'Kích hoạt MCP', rotate: 'Cấp lại token', plan: 'Gói', token: 'Token', emailTo: 'Email',
        hubActive: 'Đang hoạt động', hubExpired: 'Hết hạn', emailSent: 'đã gửi {at}', emailFail: 'chưa gửi được ({err})',
        tokenOnce: 'Token chỉ hiện 1 lần — lưu lại ngay.', tokenMailed: 'Đã gửi token tới {email}.', copy: 'Chép', copied: 'Đã chép',
        mcpUrl: 'MCP endpoint', embedHint: 'Nhúng trợ lý dùng kiến thức này: <svc-aide owner="{owner}">',
        groupSites: 'Site được nhúng', sitesLabel: 'Tên miền — mỗi dòng 1 site',
        sitesHint: 'Chỉ các site này chạy được trợ lý của hub (localhost luôn chạy được để thử). Để trống = mọi site.',
        sitesOpen: 'Chưa giới hạn site — ai copy đoạn nhúng cũng chạy được trợ lý và đọc kiến thức này trên site của họ. Thêm tên miền của bạn.',
        sitesExpired: 'Gói đã hết hạn — trợ lý nhúng đang ẩn trên mọi site. Gia hạn là tự bật lại.',
        sitesOff: 'Đã tắt nhúng — trợ lý không chạy trên site nào.',
        groupImport: 'Nạp từ API', apiUrl: 'Đường dẫn API (JSON)', apiUrlPh: 'https://api.example.com/products',
        advanced: 'Tuỳ chọn map field (để trống = tự đoán)',
        itemsPath: 'Đường dẫn mảng (vd data.items)', titleField: 'Field tiêu đề', descField: 'Field nội dung (cách nhau dấu phẩy)', idField: 'Field id', tagsField: 'Field tags',
        preview: 'Xem trước', runImport: 'Nạp dữ liệu', previewOf: 'Tìm thấy {n} mục', mapping: 'Map: mảng "{path}" · tiêu đề "{title}" · id "{id}"',
        imported: 'Đã nạp: {created} mới, {updated} cập nhật, {indexed} đã index, {related} liên kết', skipped: '{n} mục bỏ qua (thuộc owner khác)',
        groupSources: 'Nguồn đã lưu', rerun: 'Nạp lại', removeSource: 'Bỏ nguồn', items: '{n} mục',
        reindex: 'Lập chỉ mục tìm kiếm', reindexSub: '{n} mục chưa được lập chỉ mục', reindexDone: 'Chỉ mục đã đầy đủ', reindexing: 'Đang lập chỉ mục… còn {n}',
        knowNew: 'Kiến thức mới', knowEdit: 'Kiến thức', type: 'Loại', name: 'Tiêu đề', content: 'Nội dung',
        scope: 'Dùng cho', scopeFn: 'Riêng phòng này', scopeSector: 'Cả ngành', scopeAll: 'Mọi ngành', scopeKeep: 'Phòng khác (giữ nguyên)',
        knowActive: 'Đang dùng', knowDraft: 'Nháp', publish: 'Đang dùng cho trợ lý', publishSub: 'Tắt = lưu nháp, trợ lý không tìm thấy',
        titleLabel: 'Tên phòng ban', description: 'Mô tả',
        save: 'Lưu', delete: 'Xoá kiến thức', saved: 'Đã lưu', deleted: 'Đã xoá', errSave: 'Không lưu được, thử lại nhé', errLoad: 'Không tải được dữ liệu',
    },
    en: {
        title: 'Division', back: 'Back',
        statKnow: 'Knowledge', statSteps: 'Steps', statPrinciples: 'Principles', statTypes: 'Types',
        groupFunction: 'Functions', groupKnow: 'Knowledge', groupInfo: 'Details',
        persona: 'Role & principles', pipeline: 'Pipeline', pipelineSub: '{n} steps · outputs to {table}',
        status: 'Active', statusSub: 'Turn off to pause this division',
        active: 'Active', inactive: 'Paused',
        knowBase: 'Knowledge base',
        info: 'Name & description', readOnly: 'View only — an admin account is needed to edit.',
        role: 'Role', rolePh: 'Describe the assistant\'s role…', principles: 'Principles', principlePh: 'A principle…',
        addPrinciple: 'Add principle', remove: 'Remove',
        steps: 'Steps', calls: '{n} AI calls', stepImage: 'Image', output: 'Output', outputTable: 'Table',
        outputStatus: 'Record status', requiresProduct: 'Waits for the Product department', stepsNote: 'Steps are system expertise — view only here.',
        personaPrivate: 'Role & principles are private expertise — only an admin can view and edit them.', pipelineSignIn: 'Sign in to see the steps',
        search: 'Search knowledge…', addKnow: 'Add knowledge', emptyKnow: 'No knowledge yet.',
        hubRow: 'Import from API & MCP', hubRowSub: 'API URL, type · MCP token for other AI agents',
        ownerOf: 'Knowledge of owner: {owner}', ownerShared: 'shared knowledge',
        signIn: 'Sign in with the account that bought a plan to load knowledge.', noHub: 'No hub yet — your MCP token is emailed after buying a plan. Already bought? Press Activate.',
        activate: 'Activate MCP', rotate: 'Reissue token', plan: 'Plan', token: 'Token', emailTo: 'Email',
        hubActive: 'Active', hubExpired: 'Expired', emailSent: 'sent {at}', emailFail: 'not sent ({err})',
        tokenOnce: 'This token is shown once — save it now.', tokenMailed: 'Token emailed to {email}.', copy: 'Copy', copied: 'Copied',
        mcpUrl: 'MCP endpoint', embedHint: 'Embed an assistant on this knowledge: <svc-aide owner="{owner}">',
        groupSites: 'Embed sites', sitesLabel: 'Domains — one site per line',
        sitesHint: 'Only these sites can run this hub\'s assistant (localhost always can, for testing). Empty = every site.',
        sitesOpen: 'No sites set — anyone who copies the embed tag can run the assistant and read this knowledge on their own site. Add your domain.',
        sitesExpired: 'The plan has lapsed — the embedded assistant is hidden on every site. Renewing switches it back on.',
        sitesOff: 'Embedding is off — the assistant runs on no site.',
        groupImport: 'Import from API', apiUrl: 'API URL (JSON)', apiUrlPh: 'https://api.example.com/products',
        advanced: 'Field mapping (blank = guessed)',
        itemsPath: 'Array path (e.g. data.items)', titleField: 'Title field', descField: 'Content fields (comma separated)', idField: 'Id field', tagsField: 'Tags field',
        preview: 'Preview', runImport: 'Import', previewOf: 'Found {n} items', mapping: 'Mapping: array "{path}" · title "{title}" · id "{id}"',
        imported: 'Imported: {created} new, {updated} updated, {indexed} indexed, {related} links', skipped: '{n} skipped (owned by someone else)',
        groupSources: 'Saved sources', rerun: 'Import again', removeSource: 'Remove source', items: '{n} items',
        reindex: 'Build search index', reindexSub: '{n} items not indexed yet', reindexDone: 'Index is complete', reindexing: 'Indexing… {n} left',
        knowNew: 'New knowledge', knowEdit: 'Knowledge', type: 'Type', name: 'Title', content: 'Content',
        scope: 'Used by', scopeFn: 'This department only', scopeSector: 'The whole sector', scopeAll: 'Every sector', scopeKeep: 'Another department (kept)',
        knowActive: 'In use', knowDraft: 'Draft', publish: 'Used by the assistant', publishSub: 'Off = saved as draft, not searchable',
        titleLabel: 'Division name', description: 'Description',
        save: 'Save', delete: 'Delete knowledge', saved: 'Saved', deleted: 'Deleted', errSave: 'Couldn\'t save, please try again', errLoad: 'Couldn\'t load data',
    },
}

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const nowIso = () => new Date().toISOString()

export class SvcDivision extends LitElement {
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        division: { type: String }, // '<sector>.<fn>' — legacy 'aide'/'marketing'… still accepted
        value: { attribute: false }, // already-loaded face { id, kind, title, description, pics, status } — skips the sectors lookup
        closable: { type: Boolean }, // back button on the home view → `division-close`
        // know.owner shown/imported here — the same owner svc-aide answers from. Hard-coded prop wins; blank =
        // the signed-in user's hub, else '' (shared) — resolved into _owner, see service/hub.js's resolveOwner.
        owner: { type: String },
        // Kho riêng của 1 site nền tảng (svc-aide site="…", không `owner`): owner '@<host>' — kiến thức, persona, face
        // riêng của site đó (chỉ admin), ẩn Loại + Dùng cho. Có `owner` thì bỏ qua.
        site: { type: String },
        _owner: { state: true },

        _div: { state: true },
        _outline: { state: true }, // pipeline steps without their method (GET /v1/fn/spec) · null = not loaded / signed out
        _override: { state: true }, // admin only: { face, patch, persona } (GET /v1/fn/override)
        _knows: { state: true }, // null = not loaded yet
        _view: { state: true }, // home | function | knowledge | know | types | info
        _form: { state: true }, // draft of the view being edited
        _query: { state: true },
        _busy: { state: true },
        _notice: { state: true }, // { type: 'ok'|'err', text }
        _can: { state: true }, // { division, know }
        _hub: { state: true }, // /v1/hubs/me payload · null = not loaded · { error } when unavailable
        _issued: { state: true }, // { token, emailed, email } — the raw token, shown once after issue/rotate
        _result: { state: true }, // last import / preview answer
        _sitesDraft: { state: true }, // textarea "Site được nhúng" đang sửa · null = chưa sửa (hiện danh sách đã lưu)
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.division = 'ecommerce.consult'
        this.value = null
        this.closable = false
        this.owner = ''
        this.site = ''
        this._owner = ''
        this._div = null
        this._outline = null
        this._override = null
        this._knows = null
        this._view = 'home'
        this._form = null
        this._query = ''
        this._busy = false
        this._notice = null
        this._can = { division: false, know: false }
        this._hub = null
        this._issued = null
        this._result = null
        this._sitesDraft = null
        this._dcPerms = this._dcPerms.bind(this)
        this._dcHub = this._dcHub.bind(this)
        this._dcOwner = this._dcOwner.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        this._dcPerms()
        window.addEventListener('login-success', this._dcPerms)
        window.addEventListener('hub-change', this._dcHub) // service/hub.js after a purchase
        this._offOwner = onOwnerChange(this._dcOwner) // sign-in/out, purchase → the auto owner may change
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener('login-success', this._dcPerms)
        window.removeEventListener('hub-change', this._dcHub)
        this._offOwner?.()
    }

    willUpdate(changed) {
        if (changed.has('division') || (changed.has('value') && this.value && this.value.id !== this._div?.id)) this._dcLoad()
        if (changed.has('owner') || changed.has('site')) this._dcOwner() // site="…" không owner = kho chung của site ('')
        if (changed.has('site') && changed.get('site') !== undefined) this._dcKnows()
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcPerms() {
        const user = await auth.get()
        const active = user?.status === 'active'
        const { roles, isAdmin } = parseRoles(user)
        this._can = { division: active && isAdmin, know: active && (isAdmin || hasAccess(roles, 'know')) }
        if (this._can.division && this._div && !this._override) this._dcOverride(this._div.id)
        if (this._div) this._dcKnows() // drafts become visible to editors
    }

    async _dcOwner() {
        const want = this.owner, site = this.site
        const owner = await resolveOwner(want, site)
        if (want !== this.owner || site !== this.site || owner === this._owner) return // a newer prop is resolving / nothing changed
        this._owner = owner
        if (this._div) this._dcKnows()
        if (this._view === 'hub') this._dcHub() // backlog (pending) is per owner
    }

    async _dcLoad() {
        const id = canonicalDivision(this.division)
        this._view = 'home'
        this._knows = null
        this._outline = null
        this._override = null
        this._div = this.value?.id === id && this.value.kind ? this.value : await this._dcFace(id)
        // Khung các bước (không có prompt) — cần đăng nhập; khách vãng lai chỉ thấy tên/mô tả
        if (this._div.kind === 'pipeline') {
            fnApi.spec(id).then((res) => { if (res.ok && this._div?.id === id) this._outline = res.data })
        }
        if (this._can.division) this._dcOverride(id)
        this._dcKnows()
    }

    async _dcFace(id) {
        const res = await fnApi.sectors(await resolveOwner(this.owner, this.site))
        const fn = res.ok ? findFunction(res.data, id) : null
        if (!fn) this._flash('err', this._txt.errLoad)
        return {
            id, kind: fn?.kind ?? '', title: fn ? displayTitle(fn, this.lang) : id, description: fn ? displayAbout(fn, this.lang) : '',
            pics: fn?.pics || '', status: fn?.status || 'active',
        }
    }

    // Override đang lưu + persona hiệu lực — chỉ admin (route từ chối người khác). Lưu cả lỗi (không chỉ khi ok) để
    // _persona() phân biệt được "đang tải" (null) với "tải hỏng" — mở/lưu form persona tay không (patch rỗng) lúc
    // chưa tải xong sẽ xoá mất override thật đang lưu ở server (P2-11: patch gửi lên THAY THẾ, không gộp).
    async _dcOverride(id) {
        const res = await fnApi.override(id, this._siteOwner)
        if (this._div?.id !== id) return // 1 lượt tải khác (đổi division) đã ghi đè trong lúc đang chờ
        this._override = res.ok ? res.data : { error: res.message }
        // Form persona đang mở tay-không (override chưa tải xong lúc _openFunction bấm) — điền lại ngay khi có patch thật.
        if (this._view === 'function' && this._div?.kind !== 'pipeline' && !this._form && res.ok) {
            const p = this._personaNow ?? { role: '', principles: [] }
            this._form = { role: p.role || '', principles: [...(p.principles || [])] }
        }
    }

    async _dcKnows() {
        const owner = this._owner
        // '' bị bỏ khỏi query (filter rỗng) — SHARED_OWNER nhờ Worker chỉ trả dòng kiến thức chung, không kéo cả bảng về.
        const opts = { sortBy: 'updated_at', order: 'desc', filters: { owner: owner || SHARED_OWNER } }
        try {
            const rows = (await knowSvc.findAll(opts))
                .filter((k) => (k.owner ?? '') === owner && (this._can.know || k.status === 'active'))
            this._knows = rows.slice(0, KNOW_LIMIT)
        } catch (err) {
            console.error('[llm/svc-division] know load failed:', err?.message ?? err)
            this._knows = []
        }
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _go(view, form = null) {
        this._view = view
        this._form = form
        this._notice = null
    }

    _set(key, value) { this._form = { ...this._form, [key]: value } }

    // Chưa tải xong (hoặc tải hỏng) _override thì KHÔNG được điền form từ patch rỗng — lưu lúc đó sẽ ghi đè
    // (thay vì gộp) 1 patch thật đang lưu ở server bằng patch coi như trống. Mở tay-không, _persona()/_dcOverride
    // tự điền form thật khi patch tải xong (hoặc hiện lỗi nếu tải hỏng).
    _openFunction() {
        if (!this._override || this._override.error) { this._go('function'); return }
        const p = this._personaNow ?? { role: '', principles: [] }
        this._go('function', { role: p.role || '', principles: [...(p.principles || [])] })
    }

    _openKnow(k) {
        this._go('know', k
            ? { id: k.id, type: k.type, title: k.title, description: k.description, status: k.status, version: k.version, sector: k.sector ?? '', fn: k.fn ?? '' }
            : { type: 'faq', title: '', description: '', status: 'active', ...this._scopes().fn, ...this._selfDefaults() })
    }

    _openHub() {
        this._go('hub', { url: '', type: 'product', itemsPath: '', title: '', description: '', id: '', tags: '', ...this._scopes().fn, ...this._selfDefaults() })
        this._result = null
        this._dcHub()
    }

    _setPrinciple(i, value) {
        const principles = [...this._form.principles]
        principles[i] = value
        this._set('principles', principles)
    }

    // ── Data Footer ────────────────────────────────────────────────────────────

    // Face (tên/mô tả/bật-tắt) và vai trò/nguyên tắc (override patch) — cả 2 qua POST /v1/fn/override (admin).
    async _dfSaveDivision(face = {}, personaPatch = null, back = 'home') {
        if (!this._can.division || this._busy) return
        this._busy = true
        try {
            const body = { division: this._div.id, owner: this._siteOwner, face }
            if (personaPatch) body.patch = { ...(this._override?.patch ?? {}), ...personaPatch }
            const res = await fnApi.saveOverride(body)
            if (!res.ok) throw new Error(res.message)
            this._div = { ...this._div, ...face }
            if (personaPatch) this._override = { ...this._override, patch: body.patch, persona: { ...(this._override?.persona ?? {}), ...personaPatch } }
            fnApi.forgetSectors() // tên/avatar mới — lần đọc sectors sau lấy lại
            this.dispatchEvent(new CustomEvent('division-change', { detail: { division: this._div }, bubbles: true, composed: true }))
            this._go(back)
            this._flash('ok', this._txt.saved)
        } catch (err) {
            console.error('[llm/svc-division] save failed:', err?.message ?? err)
            this._flash('err', this._txt.errSave)
        } finally {
            this._busy = false
        }
    }

    _dfSaveFunction() {
        const principles = this._form.principles.map((p) => p.trim()).filter(Boolean)
        this._dfSaveDivision({}, { role: this._form.role.trim(), principles })
    }

    async _dfSaveKnow() {
        const f = this._form
        if (!this._can.know || this._busy || !f.title.trim()) return
        this._busy = true
        try {
            const now = nowIso()
            const data = { type: f.type.trim() || 'other', title: f.title.trim(), description: f.description.trim(), status: f.status, sector: f.sector ?? '', fn: f.fn ?? '', updated_at: now }
            if (f.id) await knowSvc.update(f.id, { ...data, version: (Number(f.version) || 1) + 1 })
            else await knowSvc.create({ ...data, meta: { tags: [] }, version: 1, owner: this._owner, source: '', created_at: now, deleted_at: null })
            await this._dcKnows()
            this._go('knowledge')
            this._flash('ok', this._txt.saved)
        } catch (err) {
            console.error('[llm/svc-division] know save failed:', err?.message ?? err)
            this._flash('err', this._txt.errSave)
        } finally {
            this._busy = false
        }
    }

    async _dfDeleteKnow() {
        if (!this._can.know || this._busy || !this._form?.id) return
        this._busy = true
        try {
            await knowSvc.delete(this._form.id)
            this._knows = this._knows.filter((k) => k.id !== this._form.id)
            this._go('knowledge')
            this._flash('ok', this._txt.deleted)
        } catch (err) {
            console.error('[llm/svc-division] know delete failed:', err?.message ?? err)
            this._flash('err', this._txt.errSave)
        } finally {
            this._busy = false
        }
    }

    async _dcHub() {
        const res = await hub.me(this._owner)
        this._hub = res.ok ? res.data : { error: res.statusCode === 401 ? 'auth' : res.message }
        this._sitesDraft = null // a draft belonged to the owner shown before this load
    }

    async _dfIssue(rotate) {
        if (this._busy) return
        this._busy = true
        this._issued = null
        const res = await hub.issue(rotate)
        this._busy = false
        if (!res.ok) return this._flash('err', res.message)
        const email = res.data.hub?.email
        this._issued = res.data.token ? { token: res.data.token, emailed: res.data.emailed, email } : null
        await this._dcHub()
    }

    async _dfImport(dryRun, source = null) {
        const f = source
            ? { url: source.url, type: source.type, owner: source.owner, itemsPath: source.itemsPath, fields: source.fields, sector: source.sector ?? '', fn: source.fn ?? '' }
            : {
                url: this._form.url.trim(), type: this._form.type.trim(), owner: this._owner, sector: this._form.sector ?? '', fn: this._form.fn ?? '',
                itemsPath: this._form.itemsPath.trim() || undefined,
                fields: {
                    title: this._form.title.trim() || undefined,
                    description: splitPaths(this._form.description).length ? splitPaths(this._form.description) : undefined,
                    id: this._form.id.trim() || undefined,
                    tags: this._form.tags.trim() || undefined,
                },
            }
        if (!f.url || !f.type || this._busy) return
        this._busy = true
        this._result = null
        this._notice = null
        const res = await hub.importApi({ ...f, dryRun })
        this._busy = false
        if (!res.ok) return this._flash('err', res.message)
        this._result = res.data
        if (!dryRun) {
            if (this._hub?.hub && res.data.sources) this._hub = { ...this._hub, hub: { ...this._hub.hub, sources: res.data.sources } }
            if ((res.data.owner ?? '') === this._owner) this._dcKnows()
        }
    }

    /** Loops /v1/hubs/reindex (50 rows a call) until nothing is pending, for this panel's owner. */
    async _dfReindex() {
        if (this._busy) return
        this._busy = true
        this._notice = null
        const owner = this._owner
        try {
            for (let guard = 0; guard < 200; guard++) {
                const res = await hub.reindex({ owner })
                if (!res.ok) return this._flash('err', res.message)
                if (owner === this._owner) this._hub = { ...this._hub, pending: res.data.remaining }
                if (!res.data.remaining || !res.data.processed) break
                this._flash('ok', fill(this._txt.reindexing, { n: res.data.remaining }))
            }
            this._flash('ok', this._txt.reindexDone)
            this._dcKnows()
        } finally {
            this._busy = false
        }
    }

    async _dfSaveSites() {
        if (this._busy || this._sitesDraft === null) return
        this._busy = true
        try {
            const domains = this._sitesDraft.split(/[\s,]+/).map((d) => d.trim()).filter(Boolean)
            const res = await hub.setDomains({ owner: this._owner, domains })
            if (!res.ok) return this._flash('err', res.message)
            this._hub = { ...this._hub, managed: { ...this._hub.managed, domains: res.data.domains } }
            this._sitesDraft = null
            this._flash('ok', this._txt.saved)
        } finally {
            this._busy = false
        }
    }

    async _dfRemoveSource(id) {
        const res = await hub.removeSource(id)
        if (!res.ok) return this._flash('err', res.message)
        this._hub = { ...this._hub, hub: { ...this._hub.hub, sources: res.data.sources } }
    }

    async _copy(text) {
        try { await navigator.clipboard.writeText(text); this._flash('ok', this._txt.copied) } catch { /* clipboard blocked — the text is selectable */ }
    }

    _flash(type, text) { this._notice = { type, text } }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _steps() { return this._outline?.steps ?? [] }
    get _personaNow() { return this._override?.persona ?? null }

    _label(obj, fallback = '') { return pickTxt(obj, this.lang) ?? fallback }

    get _filteredKnows() {
        const q = this._query.trim().toLowerCase()
        const rows = this._knows ?? []
        return q ? rows.filter((k) => `${k.title} ${k.description}`.toLowerCase().includes(q)) : rows
    }

    // ── Pieces ─────────────────────────────────────────────────────────────────

    _switch(on, label) {
        return html`<span class="dv-switch ${on ? 'is-on' : ''}" role="switch" aria-checked=${on ? 'true' : 'false'} aria-label=${label}></span>`
    }

    _row({ icon, label, sub, value, onClick, trail = 'chevron', disabled = false }) {
        return html`
            <button class="dv-row" type="button" ?disabled=${disabled} @click=${onClick}>
                <iconify-icon class="dv-row-icon" icon=${icon}></iconify-icon>
                <span class="dv-row-text">
                    <span class="dv-row-label">${label}</span>
                    ${sub ? html`<span class="dv-row-sub">${sub}</span>` : nothing}
                </span>
                ${value != null && value !== '' ? html`<span class="dv-row-value">${value}</span>` : nothing}
                ${trail === 'chevron' ? html`<iconify-icon class="dv-row-chev" icon="ri:arrow-right-s-line"></iconify-icon>` : trail}
            </button>
        `
    }

    _subHead(title, back = 'home') {
        return html`
            <div class="dv-top">
                <button class="dv-back" type="button" aria-label=${this._txt.back} @click=${() => this._go(back)}>
                    <iconify-icon icon="ri:arrow-left-s-line"></iconify-icon>
                </button>
                <h2 class="dv-h1" title=${title}>${title}</h2>
            </div>
        `
    }

    // Site được chạy trợ lý nhúng của hub đang quản lý (worker fn/access.ts embedHostOk) + vì sao nó đang ẩn, nếu có.
    _sitesTpl(me) {
        const t = this._txt, m = me.managed
        if (!m) return nothing
        const warn = !m.active ? t.sitesExpired : !m.embed ? t.sitesOff : !m.domains.length ? t.sitesOpen : ''
        return html`
            <div class="dv-group-title">${t.groupSites}</div>
            ${warn ? html`<div class="dv-notice is-err">${warn}</div>` : nothing}
            <div class="dv-form">
                <label class="dv-label">${t.sitesLabel}
                    <textarea class="dv-area" rows="3" placeholder=${'shop.com\nblog.shop.com'} .value=${this._sitesDraft ?? m.domains.join('\n')}
                        @input=${(e) => (this._sitesDraft = e.target.value)}></textarea>
                </label>
                <div class="dv-note">${t.sitesHint}</div>
            </div>
            ${this._saveBtn(() => this._dfSaveSites(), this._sitesDraft === null)}
        `
    }

    _saveBtn(onClick, disabled = false) {
        return html`
            <button class="dv-btn dv-btn-main" type="button" ?disabled=${this._busy || disabled} @click=${onClick}>
                ${this._busy ? html`<iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon>` : nothing}${this._txt.save}
            </button>
        `
    }

    _noticeTpl() {
        const n = this._notice
        return n ? html`<div class="dv-notice is-${n.type}" role=${n.type === 'err' ? 'alert' : 'status'}>${n.text}</div>` : nothing
    }

    _readOnlyTpl(can) {
        return can ? nothing : html`<div class="dv-notice">${this._txt.readOnly}</div>`
    }

    _avatar() {
        const d = this._div
        return d.pics
            ? html`<img class="dv-avatar" src=${d.pics} alt="" />`
            : html`<span class="dv-avatar"><iconify-icon icon=${d.kind === 'pipeline' ? 'ri:building-2-line' : CONSULT_ICON}></iconify-icon></span>`
    }

    // ── Views ──────────────────────────────────────────────────────────────────

    _home() {
        const t = this._txt, d = this._div, persona = this._personaNow
        const steps = this._steps
        const pipeline = d.kind === 'pipeline'
        const active = d.status !== 'inactive'
        const stats = [
            [this._knows?.length ?? '–', t.statKnow],
            pipeline ? [steps.length || '–', t.statSteps] : [persona ? persona.principles.length : '–', t.statPrinciples],
            [this._knows ? new Set(this._knows.map((k) => k.type)).size : '–', t.statTypes],
        ]
        return html`
            <div class="dv-top">
                ${this.closable ? html`
                    <button class="dv-back" type="button" aria-label=${t.back}
                        @click=${() => this.dispatchEvent(new CustomEvent('division-close', { bubbles: true, composed: true }))}>
                        <iconify-icon icon="ri:arrow-left-s-line"></iconify-icon>
                    </button>` : nothing}
                <h2 class="dv-h1">${t.title}</h2>
            </div>
            <div class="dv-hero">
                ${this._avatar()}
                <div class="dv-hero-text">
                    <div class="dv-name">${d.title || d.id}</div>
                    ${d.description ? html`<div class="dv-desc">${d.description}</div>` : nothing}
                    <span class="dv-chip ${active ? 'is-ok' : ''}">${active ? t.active : t.inactive}</span>
                </div>
            </div>
            <div class="dv-stats">${stats.map(([n, label]) => html`<div class="dv-stat"><b>${n}</b><span>${label}</span></div>`)}</div>

            <div class="dv-group-title">${t.groupFunction}</div>
            ${pipeline
                ? this._row({ icon: 'ri:flow-chart', label: t.pipeline, sub: this._outline ? fill(t.pipelineSub, { n: steps.length, table: this._outline.output?.table || '—' }) : t.pipelineSignIn, onClick: () => this._go('function') })
                : this._row({ icon: 'ri:user-voice-line', label: t.persona, sub: persona?.role || t.personaPrivate, onClick: () => this._openFunction() })}
            ${this._row({
                icon: 'ri:pulse-line', label: t.status, sub: t.statusSub, disabled: !this._can.division || this._busy,
                onClick: () => this._dfSaveDivision({ status: active ? 'inactive' : 'active' }),
                trail: this._switch(active, t.status),
            })}

            <div class="dv-group-title">${t.groupKnow}</div>
            ${this._row({ icon: 'ri:book-open-line', label: t.knowBase, sub: fill(t.ownerOf, { owner: this._owner || t.ownerShared }), value: this._knows?.length, onClick: () => this._go('knowledge') })}
            ${this._row({ icon: 'ri:download-cloud-2-line', label: t.hubRow, sub: t.hubRowSub, onClick: () => this._openHub() })}

            <div class="dv-group-title">${t.groupInfo}</div>
            ${this._row({ icon: 'ri:edit-line', label: t.info, onClick: () => this._go('info', { title: d.title || '', description: d.description || '' }) })}
            ${this._readOnlyTpl(this._can.division)}
            ${this._noticeTpl()}
        `
    }

    _function() {
        if (this._div.kind === 'pipeline') return this._pipeline()
        return this._persona()
    }

    _persona() {
        const t = this._txt, can = this._can.division
        if (!can) return html`${this._subHead(t.persona)}<div class="dv-notice">${t.personaPrivate}</div>`
        // Chưa tải xong GET /v1/fn/override — form cần patch thật để lưu (gộp, không thay thế), không hiện tay-không.
        if (!this._override) return html`${this._subHead(t.persona)}<div class="dv-empty"><iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon></div>`
        if (this._override.error) return html`${this._subHead(t.persona)}<div class="dv-notice">${this._override.error}</div>`
        if (!this._form) return html`${this._subHead(t.persona)}<div class="dv-empty"><iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon></div>`
        const f = this._form
        return html`
            ${this._subHead(t.persona)}
            ${this._readOnlyTpl(can)}
            <label class="dv-label">${t.role}
                <textarea class="dv-area" rows="3" placeholder=${t.rolePh} .value=${f.role} ?readonly=${!can}
                    @input=${(e) => this._set('role', e.target.value)}></textarea>
            </label>
            <div class="dv-label">${t.principles}</div>
            ${f.principles.map((p, i) => html`
                <div class="dv-principle">
                    <span class="dv-index">${i + 1}</span>
                    <textarea class="dv-area" rows="2" placeholder=${t.principlePh} .value=${p} ?readonly=${!can}
                        @input=${(e) => this._setPrinciple(i, e.target.value)}></textarea>
                    ${can ? html`<button class="dv-icon-btn" type="button" aria-label=${t.remove}
                        @click=${() => this._set('principles', f.principles.filter((_, j) => j !== i))}><iconify-icon icon="ri:close-line"></iconify-icon></button>` : nothing}
                </div>
            `)}
            ${can ? html`
                <button class="dv-link" type="button" @click=${() => this._set('principles', [...f.principles, ''])}>
                    <iconify-icon icon="ri:add-line"></iconify-icon>${t.addPrinciple}
                </button>
                ${this._saveBtn(() => this._dfSaveFunction())}` : nothing}
            ${this._noticeTpl()}
        `
    }

    _pipeline() {
        const t = this._txt, o = this._outline, out = o?.output
        if (!o) return html`${this._subHead(t.pipeline)}<div class="dv-notice">${t.pipelineSignIn}</div>`
        return html`
            ${this._subHead(t.pipeline)}
            <div class="dv-group-title">${t.steps}</div>
            <div class="dv-card dv-list">
                ${o.steps.map((s, i) => html`
                    <div class="dv-item">
                        <span class="dv-index">${i + 1}</span>
                        <div class="dv-item-text">
                            <span class="dv-strong">${this._label(s, s.key || s.id)}</span>
                            <span class="dv-muted">${s.type === 'image' ? t.stepImage : fill(t.calls, { n: s.calls?.length || 0 })}</span>
                        </div>
                        <iconify-icon class="dv-row-chev" icon=${s.type === 'image' ? 'ri:image-line' : 'ri:file-text-line'}></iconify-icon>
                    </div>
                `)}
            </div>
            ${out ? html`
                <div class="dv-group-title">${t.output}</div>
                <div class="dv-card dv-list">
                    <div class="dv-item"><span class="dv-item-text"><span class="dv-muted">${t.outputTable}</span><span class="dv-strong">${out.table}</span></span></div>
                    ${out.status ? html`<div class="dv-item"><span class="dv-item-text"><span class="dv-muted">${t.outputStatus}</span><span>${out.status}</span></span></div>` : nothing}
                    ${out.fields?.length ? html`<div class="dv-item dv-chips">${out.fields.map((f) => html`<span class="dv-chip">${f}</span>`)}</div>` : nothing}
                </div>` : nothing}
            ${[...(o.needs ?? []), ...(o.uses ?? [])].some((k) => k.startsWith('product.')) ? html`<div class="dv-card"><iconify-icon icon="ri:shopping-bag-3-line"></iconify-icon>${t.requiresProduct}</div>` : nothing}
            <div class="dv-note">${t.stepsNote}</div>
        `
    }

    _knowledge() {
        const t = this._txt
        const rows = this._filteredKnows
        return html`
            ${this._subHead(t.knowBase)}
            <label class="dv-field">
                <iconify-icon icon="ri:search-line"></iconify-icon>
                <input type="search" placeholder=${t.search} .value=${this._query} @input=${(e) => (this._query = e.target.value)} />
            </label>
            ${this._can.know ? this._row({ icon: 'ri:add-circle-line', label: t.addKnow, onClick: () => this._openKnow(null) }) : nothing}
            ${this._row({ icon: 'ri:download-cloud-2-line', label: t.hubRow, sub: t.hubRowSub, onClick: () => this._openHub() })}
            ${this._knows === null
                ? html`<div class="dv-empty"><iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon></div>`
                : rows.length
                    ? html`<div class="dv-card dv-list">${rows.map((k) => html`
                        <button class="dv-item dv-item-btn" type="button" @click=${() => this._openKnow(k)}>
                            <span class="dv-item-text">
                                <span class="dv-strong dv-ellipsis">${k.title || k.id}</span>
                                <span class="dv-muted dv-ellipsis">${k.description}</span>
                            </span>
                            <span class="dv-chip ${k.status === 'active' ? '' : 'is-draft'}">${k.type}</span>
                            <iconify-icon class="dv-row-chev" icon="ri:arrow-right-s-line"></iconify-icon>
                        </button>`)}</div>`
                    : html`<div class="dv-empty">${t.emptyKnow}</div>`}
            ${this._noticeTpl()}
        `
    }

    // Ai đọc 1 dòng kiến thức (worker search.ts): phòng ban đọc dòng của chính nó + của cả ngành + dòng dùng chung.
    _scopes() {
        const [sector = '', fn = ''] = canonicalDivision(this._div?.id ?? this.division).split('.')
        return { fn: { sector, fn }, sector: { sector, fn: '' }, all: { sector: '', fn: '' } }
    }

    /** Owner '@<host>' của kho riêng 1 site nền tảng (site="…" không owner) — '' khi không phải. Đồng bộ, khác _owner. */
    get _siteOwner() { return this.owner ? '' : siteOwner(this.site) }

    // Kho riêng của site: tầng "Mọi ngành" ('' / '') — mọi ngành trên site dùng chung, đổi division vẫn thấy đủ dòng.
    _selfDefaults() {
        return this._siteOwner ? { type: 'faq', ...this._scopes().all } : {}
    }

    // Dòng đang thuộc phòng khác giữ nguyên tầng của nó tới khi người sửa chọn tầng khác.
    _scopeTpl(f, can) {
        const t = this._txt, scopes = this._scopes()
        const key = Object.keys(scopes).find((k) => scopes[k].sector === (f.sector ?? '') && scopes[k].fn === (f.fn ?? '')) ?? 'keep'
        const pick = (k) => { if (scopes[k]) this._form = { ...this._form, ...scopes[k] } }
        return html`
            <label class="dv-label">${t.scope}
                <span class="dv-field">
                    <iconify-icon icon="ri:focus-3-line"></iconify-icon>
                    <select .value=${key} ?disabled=${!can} @change=${(e) => pick(e.target.value)}>
                        <option value="fn" ?selected=${key === 'fn'}>${t.scopeFn}</option>
                        <option value="sector" ?selected=${key === 'sector'}>${t.scopeSector}</option>
                        <option value="all" ?selected=${key === 'all'}>${t.scopeAll}</option>
                        ${key === 'keep' ? html`<option value="keep" selected disabled>${t.scopeKeep}</option>` : nothing}
                    </select>
                </span>
            </label>
        `
    }

    _know() {
        const t = this._txt, f = this._form, can = this._can.know
        const suggestions = KNOW_TYPES
        return html`
            ${this._subHead(f.id ? t.knowEdit : t.knowNew, 'knowledge')}
            ${this._readOnlyTpl(can)}
            <div class="dv-form">
                ${this._siteOwner ? nothing : html`
                    <label class="dv-label">${t.type}
                        <span class="dv-field">
                            <iconify-icon icon="ri:price-tag-3-line"></iconify-icon>
                            <input list="dv-types" .value=${f.type} ?readonly=${!can} @input=${(e) => this._set('type', e.target.value)} />
                            <datalist id="dv-types">${suggestions.map((s) => html`<option value=${s}></option>`)}</datalist>
                        </span>
                    </label>
                    ${this._scopeTpl(f, can)}`}
                <label class="dv-label">${t.name}
                    <span class="dv-field">
                        <input .value=${f.title} ?readonly=${!can} @input=${(e) => this._set('title', e.target.value)} />
                    </span>
                </label>
                <label class="dv-label">${t.content}
                    <textarea class="dv-area" rows="8" .value=${f.description} ?readonly=${!can} @input=${(e) => this._set('description', e.target.value)}></textarea>
                </label>
                ${this._row({
                    icon: 'ri:eye-line', label: t.publish, sub: t.publishSub, disabled: !can,
                    onClick: () => this._set('status', f.status === 'active' ? 'draft' : 'active'),
                    trail: this._switch(f.status === 'active', t.publish),
                })}
            </div>
            ${can ? html`
                ${this._saveBtn(() => this._dfSaveKnow(), !f.title.trim())}
                ${f.id ? html`<button class="dv-link dv-danger" type="button" ?disabled=${this._busy} @click=${() => this._dfDeleteKnow()}>
                    <iconify-icon icon="ri:delete-bin-line"></iconify-icon>${t.delete}</button>` : nothing}` : nothing}
            ${this._noticeTpl()}
        `
    }

    _hubView() {
        const t = this._txt, me = this._hub, f = this._form
        if (!me) return html`${this._subHead(t.hubRow, 'knowledge')}<div class="dv-empty"><iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon></div>`
        if (me.error) return html`${this._subHead(t.hubRow, 'knowledge')}<div class="dv-notice">${me.error === 'auth' ? t.signIn : me.error}</div>`
        const h = me.hub
        const canImport = me.active || me.isAdmin
        return html`
            ${this._subHead(t.hubRow, 'knowledge')}

            <div class="dv-group-title">MCP</div>
            ${h ? html`
                <div class="dv-card dv-list">
                    <div class="dv-item"><span class="dv-item-text"><span class="dv-muted">${t.plan}</span><span class="dv-strong">${h.plan_id}${h.plan_interval ? ` · ${h.plan_interval}` : ''}</span></span>
                        <span class="dv-chip ${me.active ? 'is-ok' : 'is-draft'}">${me.active ? t.hubActive : t.hubExpired}</span></div>
                    <div class="dv-item"><span class="dv-item-text"><span class="dv-muted">${t.token}</span><span class="dv-mono">mcp_…${h.token_hint}</span>
                        <span class="dv-muted">${(h.token_issued_at || '').slice(0, 10)}</span></span></div>
                    <div class="dv-item"><span class="dv-item-text"><span class="dv-muted">${t.emailTo}</span><span class="dv-ellipsis">${h.email || '—'}</span>
                        <span class="dv-muted">${h.email_error ? fill(t.emailFail, { err: h.email_error }) : h.email_sent_at ? fill(t.emailSent, { at: h.email_sent_at.slice(0, 10) }) : ''}</span></span></div>
                </div>
                ${this._row({ icon: 'ri:key-2-line', label: t.rotate, disabled: this._busy || !canImport, onClick: () => this._dfIssue(true), trail: nothing })}`
            : html`
                <div class="dv-notice">${t.noHub}</div>
                ${this._row({ icon: 'ri:key-2-line', label: t.activate, disabled: this._busy, onClick: () => this._dfIssue(false), trail: nothing })}`}
            ${this._issued ? html`
                <div class="dv-card dv-mcp">
                    <iconify-icon class="dv-row-icon" icon="ri:shield-keyhole-line"></iconify-icon>
                    <div class="dv-item-text">
                        <span class="dv-strong">${t.tokenOnce}</span>
                        ${this._issued.emailed ? html`<span class="dv-muted">${fill(t.tokenMailed, { email: this._issued.email })}</span>` : nothing}
                        <code class="dv-code">${this._issued.token}</code>
                        <button class="dv-link" type="button" @click=${() => this._copy(this._issued.token)}><iconify-icon icon="ri:file-copy-line"></iconify-icon>${t.copy}</button>
                    </div>
                </div>` : nothing}
            <div class="dv-label">${t.mcpUrl}<code class="dv-code">${me.mcpUrl}</code></div>
            ${canImport ? this._row({
                icon: 'ri:search-eye-line', label: t.reindex, disabled: this._busy,
                sub: me.pending ? fill(t.reindexSub, { n: me.pending }) : t.reindexDone,
                onClick: () => this._dfReindex(), trail: nothing,
            }) : nothing}
            ${me.managed ? html`<div class="dv-note">${fill(t.embedHint, { owner: me.managed.id })}</div>` : nothing}
            ${this._sitesTpl(me)}

            ${canImport ? html`
                <div class="dv-group-title">${t.groupImport}</div>
                <div class="dv-form">
                    <label class="dv-label">${t.apiUrl}
                        <span class="dv-field"><iconify-icon icon="ri:link"></iconify-icon>
                            <input type="url" placeholder=${t.apiUrlPh} .value=${f.url} @input=${(e) => this._set('url', e.target.value)} /></span>
                    </label>
                    ${this._siteOwner ? nothing : html`
                        <label class="dv-label">${t.type}
                            <span class="dv-field"><iconify-icon icon="ri:price-tag-3-line"></iconify-icon>
                                <input list="dv-hub-types" .value=${f.type} @input=${(e) => this._set('type', e.target.value)} />
                                <datalist id="dv-hub-types">${(me.types ?? KNOW_TYPES).map((s) => html`<option value=${s}></option>`)}</datalist></span>
                        </label>
                        ${this._scopeTpl(f, true)}`}
                    <details class="dv-details">
                        <summary>${t.advanced}</summary>
                        ${[['itemsPath', t.itemsPath], ['title', t.titleField], ['description', t.descField], ['id', t.idField], ['tags', t.tagsField]].map(([key, label]) => html`
                            <label class="dv-label">${label}
                                <span class="dv-field"><input .value=${f[key]} @input=${(e) => this._set(key, e.target.value)} /></span>
                            </label>`)}
                    </details>
                </div>
                <div class="dv-actions">
                    <button class="dv-btn" type="button" ?disabled=${this._busy || !f.url.trim() || !f.type.trim()} @click=${() => this._dfImport(true)}>${t.preview}</button>
                    <button class="dv-btn dv-btn-primary" type="button" ?disabled=${this._busy || !f.url.trim() || !f.type.trim()} @click=${() => this._dfImport(false)}>
                        ${this._busy ? html`<iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon>` : nothing}${t.runImport}
                    </button>
                </div>
                ${this._resultTpl()}
                ${h?.sources?.length ? html`
                    <div class="dv-group-title">${t.groupSources}</div>
                    <div class="dv-card dv-list">${h.sources.map((src) => html`
                        <div class="dv-item">
                            <span class="dv-item-text">
                                <span class="dv-strong dv-ellipsis">${src.url}</span>
                                <span class="dv-muted">${src.type}${src.fn || src.sector ? ` · ${[src.sector, src.fn].filter(Boolean).join('.')}` : ''} · ${fill(t.items, { n: src.last_count ?? 0 })} · ${(src.last_import_at || '').slice(0, 10)}${src.owner !== h.id ? ` · ${src.owner || t.ownerShared}` : ''}</span>
                            </span>
                            <button class="dv-icon-btn" type="button" title=${t.rerun} aria-label=${t.rerun} ?disabled=${this._busy} @click=${() => this._dfImport(false, src)}><iconify-icon icon="ri:refresh-line"></iconify-icon></button>
                            <button class="dv-icon-btn" type="button" title=${t.removeSource} aria-label=${t.removeSource} @click=${() => this._dfRemoveSource(src.id)}><iconify-icon icon="ri:close-line"></iconify-icon></button>
                        </div>`)}
                    </div>` : nothing}` : nothing}
            ${this._noticeTpl()}
        `
    }

    _resultTpl() {
        const t = this._txt, r = this._result
        if (!r) return nothing
        const m = r.mapping
        return html`
            <div class="dv-card dv-list">
                <div class="dv-item"><span class="dv-item-text">
                    <span class="dv-strong">${r.dryRun ? fill(t.previewOf, { n: r.count }) : fill(t.imported, r)}</span>
                    ${r.skipped ? html`<span class="dv-muted">${fill(t.skipped, { n: r.skipped })}</span>` : nothing}
                    ${m ? html`<span class="dv-muted">${fill(t.mapping, { path: m.itemsPath || '/', title: m.fields?.title ?? '—', id: m.fields?.id ?? '—' })}</span>` : nothing}
                </span></div>
                ${(r.sample ?? []).map((it) => html`<div class="dv-item"><span class="dv-item-text"><span class="dv-ellipsis">${it.title}</span><span class="dv-muted dv-ellipsis">${it.description}</span></span></div>`)}
            </div>
        `
    }

    _info() {
        const t = this._txt, f = this._form, can = this._can.division
        return html`
            ${this._subHead(t.info)}
            ${this._readOnlyTpl(can)}
            <div class="dv-form">
                <label class="dv-label">${t.titleLabel}
                    <span class="dv-field"><input .value=${f.title} ?readonly=${!can} @input=${(e) => this._set('title', e.target.value)} /></span>
                </label>
                <label class="dv-label">${t.description}
                    <textarea class="dv-area" rows="4" .value=${f.description} ?readonly=${!can} @input=${(e) => this._set('description', e.target.value)}></textarea>
                </label>
            </div>
            ${can ? this._saveBtn(() => this._dfSaveDivision({ title: f.title.trim(), description: f.description.trim() }), !f.title.trim()) : nothing}
            ${this._noticeTpl()}
        `
    }

    render() {
        if (!this._div) return html`<div class="dv"><div class="dv-empty"><iconify-icon class="dv-spin" icon="ri:loader-4-line"></iconify-icon></div></div>`
        const views = { home: this._home, function: this._function, knowledge: this._knowledge, know: this._know, hub: this._hubView, info: this._info }
        // Edit views render from _form — without one (never opened through their _open*/_go call) fall back home.
        const view = FORM_VIEWS.has(this._view) && !this._form ? this._home : views[this._view] ?? this._home
        // keyed: a fresh .dv-view per view, so its enter animation replays on every switch (same as svc-profile)
        return html`<div class="dv">${keyed(this._view, html`<div class="dv-view">${view.call(this)}</div>`)}</div>`
    }
}

if (!customElements.get('svc-division')) customElements.define('svc-division', SvcDivision)
export default SvcDivision
