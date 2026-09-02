// src/webs/bay/svc-bay-sections.js
//
// Tương đương svc-channel-sections.js — quản lý NHIỀU section (products + hero/contact/...),
// mỗi section tự chọn Loại giao diện (domain) rồi Mẫu hiển thị (template trong domain đó). Dùng
// LẠI thẳng src/sections/* + src/services/schemas/admin/* (infra chung, domain-agnostic, xem
// comment đầu src/sections/products/index.js) — KHÔNG import gì từ webs/channel/*.
//
// Light DOM (không Shadow DOM) — component này render <web-board>, CSS grid của nó chỉ inject
// vào document.head, không vượt qua ranh giới Shadow DOM trên đường đi (cùng lý do svc-bay.js).
import { LitElement, html, nothing } from 'lit'
import '@/webs/auth/svc-admin.js'
import '@/webs/apex/web-board.js'
import '@/webs/apex/web-dialog.js'
import '@/webs/apex/web-select.js'
import '@/webs/pay/svc-pay.js'
import '@/webs/pay/svc-pay-warden.js'
import '@/webs/pay/svc-pay-promo.js'
import '@/webs/pay/svc-pay-stats.js'
import '@/webs/auth/svc-assist.js'
import './styles/svc-bay-sections.css'
import productsSchema from '@/services/schemas/admin/products.js'
import recordsSchema from '@/services/schemas/admin/records.js'
import { templates as productsTemplates } from '@/sections/products/index.js'
import { templates as heroTemplates } from '@/sections/hero/index.js'
import { templates as contactTemplates } from '@/sections/contact/index.js'
import { templates as benefitsTemplates } from '@/sections/benefits/index.js'
import { templates as blogTemplates } from '@/sections/blog/index.js'
import { templates as ctaTemplates } from '@/sections/cta/index.js'
import { templates as faqTemplates } from '@/sections/faq/index.js'
import { templates as featuresTemplates } from '@/sections/features/index.js'
import { templates as pricingTemplates } from '@/sections/pricing/index.js'
import { templates as processTemplates } from '@/sections/process/index.js'
import { templates as showcaseTemplates } from '@/sections/showcase/index.js'
import { templates as statsTemplates } from '@/sections/stats/index.js'
import { templates as teamTemplates } from '@/sections/team/index.js'
import { templates as testimonialsTemplates } from '@/sections/testimonials/index.js'
import { templates as trustedTemplates } from '@/sections/trusted/index.js'
import { isOwner, loadSectionItems, loadDevices } from './tools/service.js'
import { createService } from '@/services/crud.js'
import { ulid, txtLingo, emit } from '@/services/helper.js'
import { setActiveSection } from './tools/baySectionAdapter.js'
import { createPromosStore } from './tools/bayPromoAdapter.js'

// Fallback ảnh cho product AI-generated — field `pics` type 'photor-upload' luôn bị svc-assist.js
// SKIP_TYPES bỏ qua (AI không tự sinh URL ảnh), dùng ở cả 2 luồng trợ lý AI products: bootstrap
// lần đầu (_dhAssistCreate) lẫn thêm nhanh khi section đã có sẵn (assistSeed của <svc-admin>).
const PICS_STD = 'https://i.ibb.co/1tB9JBBk/supplies.png'

// singleton: true → ẩn khỏi "Loại giao diện" trong dialog THÊM section nếu bay đã có 1 section
// loại đó rồi (chỉ áp dụng products — tái dùng đúng 1 catalog chung của bay). label {vi,en} —
// cùng quy ước với label của templates (t.label[lang] ?? t.label.vi), xem _typeLabel().
const SECTION_TYPES = [
    { key: 'products',     label: { vi: 'Sản phẩm',                en: 'Products' },              templates: productsTemplates,     singleton: true },
    { key: 'hero',         label: { vi: 'Giới thiệu (Hero)',       en: 'Hero' },                   templates: heroTemplates,          singleton: false },
    { key: 'contact',      label: { vi: 'Liên hệ',                 en: 'Contact' },                 templates: contactTemplates,       singleton: false },
    { key: 'benefits',     label: { vi: 'Lợi ích',                 en: 'Benefits' },                templates: benefitsTemplates,      singleton: false },
    { key: 'blog',         label: { vi: 'Blog',                    en: 'Blog' },                    templates: blogTemplates,          singleton: false },
    { key: 'cta',          label: { vi: 'Điểm chạm (CTA)',         en: 'Call to action' },          templates: ctaTemplates,           singleton: false },
    { key: 'faq',          label: { vi: 'Câu hỏi thường gặp (FAQ)', en: 'FAQ' },                    templates: faqTemplates,           singleton: false },
    { key: 'features',     label: { vi: 'Tính năng',               en: 'Features' },                templates: featuresTemplates,      singleton: false },
    { key: 'pricing',      label: { vi: 'Bảng giá',                en: 'Pricing' },                  templates: pricingTemplates,       singleton: false },
    { key: 'process',      label: { vi: 'Quy trình',               en: 'Process' },                  templates: processTemplates,       singleton: false },
    { key: 'showcase',     label: { vi: 'Trưng bày (Case study)',  en: 'Showcase' },                 templates: showcaseTemplates,      singleton: false },
    { key: 'stats',        label: { vi: 'Thống kê',                en: 'Stats' },                    templates: statsTemplates,         singleton: false },
    { key: 'team',         label: { vi: 'Đội ngũ',                 en: 'Team' },                     templates: teamTemplates,          singleton: false },
    { key: 'testimonials', label: { vi: 'Đánh giá khách hàng',     en: 'Testimonials' },             templates: testimonialsTemplates,  singleton: false },
    { key: 'trusted',      label: { vi: 'Đối tác tin cậy',         en: 'Trusted by' },               templates: trustedTemplates,       singleton: false },
]

const TXT_STD = {
    vi: {
        addSection: 'Thêm section', addDialogTitle: 'Thêm section', typeLabel: 'Loại giao diện',
        change: 'Đổi', templateLabel: 'Mẫu hiển thị', chooseTemplate: 'Chọn mẫu hiển thị',
        editSectionTitle: label => `Sửa section — ${label}`,
    },
    en: {
        addSection: 'Add section', addDialogTitle: 'Add section', typeLabel: 'Layout type',
        change: 'Change', templateLabel: 'Display template', chooseTemplate: 'Choose display template',
        editSectionTitle: label => `Edit section — ${label}`,
    },
}

const typeOf = key => SECTION_TYPES.find(t => t.key === key) ?? null

export class SvcBaySections extends LitElement {
    createRenderRoot() { return this } // light DOM — xem comment đầu file

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    _typeLabel(type) { return type?.label?.[this.lang] ?? type?.label?.vi ?? '' }

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        mainColors: { type: String }, // từ svc-bay.js — forward xuống <web-board> (_rfBoard) + <svc-pay-stats> (_rfStatsBtn)
        user: { type: Object },
        bay: { type: Object },
        sections: { type: Array }, // mảng row từ svc-bay.js — {id, bay_id, sectionType, configKey, index, created_at, updated_at}
        _products:  { state: true },
        _itemsBySection: { state: true }, // Map<section_id, rows[]> — nạp lại qua _dcLoadItems()
        _showAdd:   { state: true },
        _addStep:   { state: true }, // 'type' | 'template'
        _addType:   { state: true },
        _addTemplateKey: { state: true },
        _showEdit:  { state: true },
        _editingSection: { state: true },
        _editTemplateKey: { state: true },
        _ownerUser: { state: true }, // hồ sơ users của bay.owner_id — nguồn seller cho invoice, xem _comSellerSlot
        _promos:    { state: true }, // danh sách promo đang tồn tại (từ _promosStore) — hiện trong _rfPromoBtn's dialog tạo mã
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.mainColors = ''
        this.user = null; this.bay = null; this.sections = []
        this._products = []
        this._itemsBySection = new Map()
        this._unsub = null
        this._showAdd = false
        this._addStep = 'type'
        this._addType = ''
        this._addTemplateKey = ''
        this._showEdit = false
        this._editingSection = null
        this._editTemplateKey = ''
        this._creatingProductsSection = false
        this._ownerUser = null
        this._promos = []
        this._unsubPromos = null
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._unsub?.()
        this._unsubPromos?.()
    }

    async updated(changed) {
        if (changed.has('bay') && this.bay) await this._dcLoad()
        else if (changed.has('sections') && this.bay) await this._dcLoadItems()
    }

    /**
     * Flow tải dữ liệu bay khi prop bay đổi: bay -> stream products + sectionItems + owner user + promos
     */
    async _dcLoad() {
        // [1] CHECK: Huỷ subscribe cũ trước, dừng nếu chưa có bay (chưa chọn bay nào)
        this._unsub?.(); this._unsub = null
        this._unsubPromos?.(); this._unsubPromos = null
        if (!this.bay) return
        // [3] EXECUTE: Mở lại stream products qua Firestore (collection `products`, PUBLIC_DB) —
        // scoped theo bay đang active + sort theo index (thủ công ở client, xem tools/bayAdapter.js
        // — khỏi cần composite index Firestore) bởi bayProducts adapter + tải lại sectionItems +
        // owner user
        this._unsub = await createService('products', '', 'bayProducts').listen({ sortBy: 'index' }, rows => { this._products = rows })
        // Subscribe promo (_promosStore/bayPromoAdapter) — dùng cho _rfPromoBtn's dialog tạo mã
        // hiện danh sách mã đang tồn tại (xem svc-pay-promo.js's _rfExistingPromos).
        this._unsubPromos = this._promosStore.subscribe(promos => { this._promos = promos ?? [] })
        await this._dcLoadItems()
        await this._dcLoadOwnerUser()
    }

    /**
     * Flow tải hồ sơ owner cho invoice: bay.owner_id -> _ownerUser {display_name, email}
     */
    async _dcLoadOwnerUser() {
        this._ownerUser = null
        // [1] CHECK: Dừng nếu bay chưa có owner_id
        if (!this.bay?.owner_id) return
        // [3] EXECUTE: Đọc devices cục bộ (IndexedDB, đã có `bay` mở gọi loadDevices() ở svc-bay.js) —
        //     KHÔNG query Firestore project 'auth' cho hồ sơ NGƯỜI KHÁC (owner): trái nguyên tắc "P2P,
        //     Firestore chỉ làm directory" của domain này, và cũng không có quyền đọc hồ sơ người khác.
        //     display_name/email của owner đã tự P2P sync sẵn qua PRESENCE (user_name/user_email, xem
        //     makePresence() trong tools/service.js).
        const devices = await loadDevices(this.bay.id)
        // [2] PROCESS: Lọc device của đúng owner, lấy dòng device_id mới nhất theo last_seen_at
        const ownerDevices = devices.filter(d => d.user_id === this.bay.owner_id).sort((a, b) => b.last_seen_at - a.last_seen_at)
        const latest = ownerDevices[0]
        // [4] RETURN: Gán _ownerUser nếu tìm thấy — rỗng nếu owner chưa từng online trong bay này
        //     trên chính thiết bị này (chấp nhận được, cùng tradeoff áp dụng toàn domain)
        if (latest) this._ownerUser = { display_name: latest.user_name, email: latest.user_email }
    }

    /**
     * Flow tải lại sectionItems: bay.id -> _itemsBySection (Map<section_id, rows[]> đã sort theo index)
     */
    async _dcLoadItems() {
        // [1] CHECK: Dừng nếu chưa có bay
        if (!this.bay) return
        // [3] EXECUTE: Tải toàn bộ sectionItems của bay
        const rows = await loadSectionItems(this.bay.id)
        // [2] PROCESS: Gom nhóm theo section_id rồi sort từng nhóm theo index
        const map = new Map()
        for (const row of rows) {
            const arr = map.get(row.section_id) ?? []
            arr.push(row)
            map.set(row.section_id, arr)
        }
        for (const arr of map.values()) arr.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        // [4] RETURN: Cập nhật state _itemsBySection
        this._itemsBySection = map
    }

    get _isOwner() { return isOwner(this.bay, this.user) }

    // "name~phone~address~email~taxCode" cho prop `seller` của <svc-pay> (xem promoteToInvoice()/
    // _buildSellerSlot() ở webs/pay/tools/service.js) — name/email lấy từ _ownerUser
    // (_dcLoadOwnerUser, IndexedDB cục bộ) NGOẠI TRỪ khi chính owner đang xem bay của mình, dùng
    // thẳng this.user (profile của chính mình, luôn có sẵn ngay — khỏi chờ round-trip presence
    // P2P). phone/location đã có sẵn trên chính bay (xác minh lúc tạo, xem tools/service.js
    // createBay()). address chỉ lấy 4 slot đầu (street~ward~region~country), bỏ lat~lng — hiển
    // thị trong invoice không cần toạ độ. taxCode luôn rỗng (chưa có nguồn).
    get _comSellerSlot() {
        if (!this.bay) return ''
        const owner = this._isOwner ? this.user : this._ownerUser
        const addr = (this.bay.location || '').split('~').slice(0, 4).filter(Boolean).join(', ')
        return [owner?.display_name || '', this.bay.phone || '', addr, owner?.email || '', ''].join('~')
    }

    // Wallet cho <svc-pay-valider>/<svc-pay-booking> (webs/pay, xem PROPS đầu svc-pay-valider.js)
    // — MVP chỉ hỗ trợ MoMo, dùng thẳng bay.phone (đã xác minh lúc tạo bay) làm accountNo, bin lấy
    // mặc định BIN_STD.momo trong svc-pay-valider.js (không cần lưu ở đây). KHÔNG có key `bank` —
    // momo/bank tự khoá khi account.accountNo rỗng, nên thiếu accountName/bay chưa xác minh gì
    // thêm vẫn an toàn (chỉ tiền mặt còn mở). Thêm hỗ trợ bank sau này chỉ cần thêm field
    // bin/accountNo tương ứng vào bay + key `bank` ở đây.
    get _comWallet() {
        if (!this.bay) return {}
        return { momo: { phone: this.bay.phone || '', accountName: this.bay.momoAccountName || '' } }
    }

    // service name conductor riêng cho <svc-cart> (items/notes cục bộ, Storager) của bay này —
    // KHÔNG dùng cho promo (promo đi qua _promosStore/bayPromoAdapter — P2P mesh, xem dưới).
    get _comCartService() { return `bay_cart_${this.bay?.id}` }

    // Store promo truyền vào <svc-cart> (qua prop `promosStore` của <svc-pay isCart>, xem
    // _rfCartBtn) — bayPromoAdapter.js đóng theo bay đang active (setActiveBay() do svc-bay.js
    // gọi ở _dhOpenBay/_dhLeaveBay), P2P sync qua mesh (PROMO_EVENT/PROMO_DELETE, xem svc-bay.js
    // _dhPromoCreate/_dhPromoDelete/_dfReceivePromo) — KHÔNG đụng conductor/Storager mặc định
    // của svc-cart. svc-cart hoàn toàn không biết "bay"/mesh là gì, chỉ thấy đúng 4 hàm generic
    // { add, remove, use, subscribe }, xem docstring đầu svc-cart.js.
    get _promosStore() {
        if (!this.__promosStore) this.__promosStore = createPromosStore()
        return this.__promosStore
    }

    get _availableTypesForAdd() {
        return SECTION_TYPES.filter(t => !t.singleton || !this.sections.some(s => s.sectionType === t.key))
    }

    _resolveConfig(sectionType, configKey) {
        return typeOf(sectionType)?.templates.find(t => t.key === configKey)?.config ?? null
    }

    _dataFor(sec) {
        if (sec.sectionType === 'products') return this._products
        return this._itemsBySection.get(sec.id) ?? []
    }

    // ── THÊM section mới — dialog 2 bước ─────────────────────────────────────

    _dhOpenAdd() {
        this._addStep = 'type'
        this._addType = ''
        this._addTemplateKey = ''
        this._showAdd = true
    }

    _dhAddPickType(key) {
        this._addType = key
        this._addTemplateKey = typeOf(key)?.templates[0]?.key ?? ''
        this._addStep = 'template'
    }

    _dhAddBack() { this._addStep = 'type' }

    _dhCancelAdd() { this._showAdd = false }

    /**
     * Flow thêm section mới: _addType + _addTemplateKey -> section descriptor mới (+ seed demo data nếu có)
     */
    async _dhConfirmAdd() {
        // [1] CHECK: Dừng nếu chưa chọn đủ Loại giao diện + Mẫu hiển thị
        if (!this._addType || !this._addTemplateKey) return
        this._showAdd = false
        // [2] PROCESS: Dựng section descriptor mới (id, sectionType, configKey, index cuối danh sách)
        const newSection = { id: ulid(), sectionType: this._addType, configKey: this._addTemplateKey, index: this.sections.length }
        // [3] EXECUTE: Emit sections mới lên svc-bay.js để lưu/broadcast; nếu không phải products thì
        //     mở luôn dialog Sửa + seed demo data đầu tiên (owner thấy ngay nội dung mẫu trên board)
        this._emitSections([...this.sections, newSection])
        if (newSection.sectionType !== 'products') {
            this._editingSection = newSection
            this._editTemplateKey = newSection.configKey
            setActiveSection(newSection.id)
            await this._dcSeedDefaultItem(newSection)
            this._showEdit = true
        }
    }

    /**
     * Flow seed demo data cho section mới: sec (chưa có sectionItems nào) -> 1 sectionItem đầu tiên
     */
    async _dcSeedDefaultItem(sec) {
        // [1] CHECK: Tìm đúng Mẫu hiển thị đã chọn, dừng nếu mẫu đó không có sẵn demo data
        const tpl = typeOf(sec.sectionType)?.templates.find(t => t.key === sec.configKey)
        if (!tpl?.data?.length) return
        // [2] PROCESS: Clone dòng demo đầu tiên; riêng section contact thì điền thêm dữ liệu thật của bay
        const seed = structuredClone(tpl.data[0])
        if (sec.sectionType === 'contact') {
            //   [2.a] LOCATION: Áp bay.location vào meta.address nếu template render google-map (xem _applyBayLocation)
            this._applyBayLocation(seed, tpl.config)
            //   [2.b] OWNER_INFO: phone đã xác minh lúc tạo bay (createBay()), email của tài khoản đang
            //   đăng nhập — chỉ owner mới tới được nhánh này (_rfAddButton gate ?_isOwner) nên this.user
            //   CHÍNH LÀ owner, không phải khách xem.
            seed.meta.phone = this.bay?.phone || ''
            seed.meta.email = this.user?.email || ''
        }
        // [3] EXECUTE: Ghi sectionItem đầu tiên qua đúng adapter svc-admin dùng (baySection), tải lại items
        await createService('sectionItems', '', 'baySection').create(seed)
        await this._dcLoadItems()
    }

    // Chỉ áp dụng cho template render <web-google-map> — bay.location đã đúng format
    // street~ward~region~country~lat~lng, dùng THẲNG làm meta.address (field kiểu 'location').
    _applyBayLocation(seed, config) {
        if (!JSON.stringify(config).includes('"mode":"google-map"')) return
        const [, , , , lat, lng] = (this.bay?.location || '').split('~')
        if (!lat || !lng) return
        seed.meta.address = this.bay.location
    }

    // ── SỬA section có sẵn — chỉ đổi Mẫu hiển thị (KHÔNG đổi Loại giao diện) ─

    _dhOpenEdit(sectionId) {
        const sec = this.sections.find(s => s.id === sectionId)
        if (!sec) return
        this._editingSection = sec
        this._editTemplateKey = sec.configKey
        setActiveSection(sec.id)
        this._showEdit = true
    }

    _dhCancelEdit() {
        this._showEdit = false; this._editingSection = null
        this._dcLoadItems()
    }

    /**
     * Flow lưu sửa section: _editingSection + _editTemplateKey -> configKey mới (nếu đổi Mẫu hiển thị)
     */
    async _dhConfirmEdit() {
        // [3] EXECUTE: Lưu thay đổi trong form <svc-admin> (sectionItems/products), đóng dialog, tải lại items
        await this.querySelector('#bysec-edit-admin')?.saveCurrentEdit()
        this._showEdit = false
        const sec = this._editingSection
        this._editingSection = null
        await this._dcLoadItems()
        // [1] CHECK: Dừng nếu không còn section đang sửa hoặc Mẫu hiển thị không đổi — khỏi emit lại
        if (!sec || this._editTemplateKey === sec.configKey) return
        // [2] PROCESS: Cập nhật configKey mới cho đúng section trong danh sách
        const next = this.sections.map(s => s.id === sec.id ? { ...s, configKey: this._editTemplateKey } : s)
        // [3] EXECUTE: Emit sections mới lên svc-bay.js để lưu/broadcast
        this._emitSections(next)
    }

    _dhDeleteSection(sectionId) {
        const next = this.sections.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, index: i }))
        this._emitSections(next)
    }

    /**
     * Flow trợ lý AI tạo nhanh products: rows (đã NESTED đúng shape productsSchema, xem
     * svc-assist.js _buildNested()) -> ghi từng row vào bảng products (bootstrap section products nếu chưa có)
     */
    async _dhAssistCreate(rows) {
        // [1] CHECK: Bay chưa có section products và chưa có lần gọi khác đang tạo (chặn race nếu
        //     bấm trợ lý 2 lần liên tiếp) — nếu đúng thì bootstrap section products (giống nhánh
        //     products trong _dhConfirmAdd)
        if (!this.sections.some(s => s.sectionType === 'products') && !this._creatingProductsSection) {
            this._creatingProductsSection = true
            const newSection = { id: ulid(), sectionType: 'products', configKey: typeOf('products')?.templates?.[0]?.key ?? '', index: this.sections.length }
            // [3] EXECUTE: Emit section products mới lên svc-bay.js để lưu/broadcast
            this._emitSections([...this.sections, newSection])
        }
        // [2] PROCESS: Ghép field hệ thống mà AI không sinh (mode/promo/pics fallback) vào từng row —
        //     score KHÔNG ép ở đây nữa, để rows[i].score (SCORE_STD gán sẵn trong svc-assist.js
        //     _coerceFields(), field 'score' luôn bị SKIP_FIELDS loại khỏi _fillableCols nên AI
        //     không tự bịa số liệu) áp dụng đúng — không xoá sản phẩm cũ, owner có thể bấm trợ lý
        //     nhiều chủ đề khác nhau. index luôn PREPEND lên đầu danh sách (không phải cuối): stream
        //     products sort theo index tăng dần (xem _dcLoad ở trên), nên gán index âm giảm dần theo -Date.now() —
        //     chắc chắn nhỏ hơn mọi sản phẩm cũ (kể cả batch trợ lý seed trước đó, vì Date.now()
        //     sau luôn lớn hơn) mà không cần đọc lại this._products (tránh race nếu bấm trợ lý 2
        //     lần liên tiếp).
        const base = -Date.now()
        for (let i = 0; i < rows.length; i++) {
            const doc = {
                status: 'active', mode: 'product', promo: null, quantity: null, vat: 0,
                pics: PICS_STD,
                ...rows[i],
                meta: { ...rows[i].meta },
                index: base + i,
            }
            // [3] EXECUTE: Ghi từng product vào Firestore qua bayProducts adapter
            await createService('products', '', 'bayProducts').create(doc)
        }
    }

    /**
     * Flow emit sections: rows (đã resolve config/configList) -> event bay-sections-change (field thuần)
     */
    _emitSections(rows) {
        // [2] PROCESS: Chỉ gửi field thuần — Firestore/IndexedDB reject nested array như makes:[[...]]
        const plain = rows.map(({ id, sectionType, configKey, index, created_at }) => ({ id, sectionType, configKey, index, created_at }))
        // [3] EXECUTE: Dispatch event lên svc-bay.js để lưu/broadcast
        emit(this, 'bay-sections-change', { sections: plain })
    }

    // ── Render ────────────────────────────────────────────────────────────────

    _rfBoard() {
        const secs = [...this.sections].sort((a, b) => a.index - b.index).map(sec => ({
            id: sec.id,
            data: this._dataFor(sec),
            configKey: sec.configKey,
            config: this._resolveConfig(sec.sectionType, sec.configKey),
            configList: typeOf(sec.sectionType)?.templates ?? [],
            ...(sec.sectionType === 'products' ? { responsive: true } : {}),
        }))
        return html`
            <web-board theme=${this.theme} unlock=${import.meta.env.PUBLIC_EXP}
                .variant=${{ ui: this.ui, mainColors: this.mainColors }}
                .sections=${secs} .owner=${this._isOwner} handles="static" draggable
                @section-configure=${e => this._dhOpenEdit(e.detail.sectionId)}
                @section-remove=${e => this._dhDeleteSection(e.detail.sectionId)}
            ></web-board>
        `
    }

    _rfAddButton() {
        if (!this._isOwner) return nothing
        return html`
            <button class="bysec-add-frame" @click=${this._dhOpenAdd}>
                <iconify-icon icon="ri:add-line" width="20px"></iconify-icon>
                <span>${this._txt.addSection}</span>
            </button>
        `
    }

    _rfAddDialog() {
        if (!this._isOwner) return nothing
        const type = typeOf(this._addType)
        return html`
            <web-dialog ?open=${this._showAdd} title=${this._txt.addDialogTitle} lang=${this.lang} maxWidth="480px" persistent
                @confirm=${this._dhConfirmAdd}
                @cancel=${this._dhCancelAdd}>
                <div class="bysec-add-form">
                    ${this._addStep === 'type' ? html`
                        <web-select placeholder=${this._txt.typeLabel}
                            .options=${this._availableTypesForAdd.map(t => ({ label: this._typeLabel(t), value: t.key }))}
                            .value=${this._addType} ui=${this.ui} theme=${this.theme}
                            @change=${e => this._dhAddPickType(e.detail.value)}
                        ></web-select>
                    ` : html`
                        <p class="bysec-add-type-label">${this._txt.typeLabel}: <strong>${this._typeLabel(type)}</strong>
                            <a href="#" @click=${e => { e.preventDefault(); this._dhAddBack() }}>${this._txt.change}</a>
                        </p>
                        <web-select placeholder=${this._txt.templateLabel}
                            .options=${(type?.templates ?? []).map(t => ({ label: t.label[this.lang] ?? t.label.vi, value: t.key }))}
                            .value=${this._addTemplateKey} ui=${this.ui} theme=${this.theme}
                            @change=${e => { this._addTemplateKey = e.detail.value }}
                        ></web-select>
                    `}
                </div>
            </web-dialog>
        `
    }

    get _comAiConfig() {
        return [import.meta.env.PUBLIC_GROQ, import.meta.env.PUBLIC_OPER].filter(Boolean).join('|')
    }

    // Tự động phát hiện field nested-array (`dataKey` trong tier config, xem web-boxs.js
    // _renderTiers) của Mẫu hiển thị ĐANG chọn — bổ sung field type 'repeater' vào schema
    // truyền cho <svc-admin>/<web-table> để owner sửa được từng item trong list ngay trong form
    // (thêm/xoá/sửa), không cần đụng code template. itemSchema tự suy ra từ field/kiểu dữ liệu
    // của phần tử đầu tiên trong `tpl.data[0][dataKey]` (vd modernCardList.js's cards[0] =
    // { title } → itemSchema [{ field:'title', type:'text' }]).
    // Giới hạn hiện tại: chỉ hỗ trợ item dạng FLAT (field không nested qua object con như
    // `meta.role`) — đủ cho modernCardList.js; các template có item lồng object con (team/
    // testimonials) cần mở rộng itemSchema/web-table.js repeater sau, chưa làm ở đây.
    _comRepeaterFields(sec) {
        const tpl = typeOf(sec?.sectionType)?.templates.find(t => t.key === this._editTemplateKey)
        const tiers = tpl?.config?.tiers ?? []
        const seen = new Set()
        const fields = []
        for (const tier of tiers) {
            if (!Array.isArray(tier)) continue
            const dataKey = tier[0]?.dataKey
            if (!dataKey || seen.has(dataKey)) continue
            seen.add(dataKey)
            const sample = tpl.data?.[0]?.[dataKey]?.[0] ?? {}
            const itemSchema = Object.entries(sample)
                .filter(([, v]) => typeof v !== 'object')
                .map(([field, v]) => ({ field, label: this._humanizeField(field), type: typeof v === 'number' ? 'number' : 'text' }))
            if (!itemSchema.length) continue
            fields.push({ label: this._humanizeField(dataKey), field: dataKey, type: 'repeater', itemSchema })
        }
        return fields
    }

    _humanizeField(key) {
        return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())
    }

    _comEditSchema(sec) {
        return [...recordsSchema(this.lang), ...this._comRepeaterFields(sec)]
    }

    _rfEditDialog() {
        if (!this._isOwner || !this._editingSection) return nothing
        const sec = this._editingSection
        const type = typeOf(sec.sectionType)
        return html`
            <web-dialog ?open=${this._showEdit} title=${this._txt.editSectionTitle(this._typeLabel(type))} lang=${this.lang} maxWidth="1200px" persistent
                @confirm=${this._dhConfirmEdit} @cancel=${this._dhCancelEdit}>
                <div class="bysec-edit-form">
                    <web-select placeholder=${this._txt.chooseTemplate}
                        .options=${(type?.templates ?? []).map(t => ({ label: t.label[this.lang] ?? t.label.vi, value: t.key }))}
                        .value=${this._editTemplateKey} ui="modern" theme=${this.theme}
                        @change=${e => { this._editTemplateKey = e.detail.value }}
                    ></web-select>
                    ${sec.sectionType === 'products' ? html`
                        <svc-admin id="bysec-edit-admin"
                            dataTable="products" server="bayProducts"
                            .schema=${productsSchema(this.lang)}
                            .perms=${{ edit: true, delete: true, sort: true }}
                            assistMultiple .assistSeed=${{ pics: PICS_STD }}
                            orderable diffsTable=""
                            ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        ></svc-admin>
                    ` : html`
                        <svc-admin id="bysec-edit-admin"
                            dataTable="sectionItems" server="baySection"
                            .schema=${this._comEditSchema(sec)}
                            .perms=${{ edit: true, delete: true, sort: true }}
                            .locationSuggest=${this.bay?.location || ''}
                            assistHint=${this._typeLabel(type)}
                            single diffsTable=""
                            ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        ></svc-admin>
                    `}
                </div>
            </web-dialog>
        `
    }

    // Nút trợ lý AI dựng nhanh nhiều products cùng lúc (<svc-assist multiple>, không inline —
    // hiện nút tròn + dialog riêng trong toolbox) — owner-only (như _rfPromoBtn), CHỈ hiện khi
    // bay CHƯA có section products (đây là cách bootstrap section đó lần đầu) — đã có rồi thì
    // dùng thẳng <svc-admin> trong section để thêm/sửa, khỏi lặp nút.
    _rfAssistBtn() {
        if (!this._isOwner || this.sections.some(s => s.sectionType === 'products')) return nothing
        return html`
            <svc-assist multiple .inline=${false} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                ai=${this._comAiConfig} .schema=${productsSchema(this.lang)}
                @assist:records=${e => this._dhAssistCreate(e.detail.rows)}
            ></svc-assist>
        `
    }

    // Lối tắt tạo mã khuyến mãi trên toolbox — chỉ hiện khi bay có section products (mã khuyến
    // mãi chỉ áp dụng cho giỏ hàng sản phẩm, cùng điều kiện với _rfCartBtn()) và chỉ owner mới
    // tạo được. Ghi thẳng qua _promosStore (bayPromoAdapter — IndexedDB db_bay CÙNG lúc phát
    // PROMO_EVENT qua P2P mesh, xem svc-bay.js's @promo:create listener trên <svc-bay-sections>:
    // event này KHÔNG dừng lại ở đây — bubbles+composed nên vẫn nổi lên tới svc-bay.js để nó lo
    // broadcast cho các peer khác đang xem cùng bay).
    _rfPromoBtn() {
        if (!this._isOwner || !this.sections.some(s => s.sectionType === 'products')) return nothing
        return html`
            <svc-pay-promo type="circle" owner .promos=${this._promos} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                @promo:create=${e => this._promosStore.add(e.detail.promo)}>
            </svc-pay-promo>
        `
    }

    // Lối tắt xem thống kê bán hàng (khách hàng, đơn hàng, doanh thu, top sản phẩm) — cùng điều
    // kiện với _rfPromoBtn (owner + đã có section products): thống kê chỉ có ý nghĩa khi bay đang
    // bán hàng. <svc-pay-stats> (webs/pay, độc lập domain — xem docs/PAY.rst) đọc invoice thật qua
    // Firestore loadSellerInvoices(sellerId) — chỉ cần .sellerId=${bay.owner_id}, KHÔNG cần
    // truyền .bay như <svc-bay-stats> cũ (đã xoá, dữ liệu trước đây lệch: bay_id nằm ở top-level
    // trong khi invoice của pay chỉ có meta.bay_id, xem docs/PAY.rst cuối §5).
    _rfStatsBtn() {
        if (!this._isOwner || !this.sections.some(s => s.sectionType === 'products')) return nothing
        return html`
            <svc-pay-stats .sellerId=${this.bay.owner_id} ui=${this.ui} theme=${this.theme} lang=${this.lang} mainColors=${this.mainColors}>
            </svc-pay-stats>
        `
    }

    // Giỏ hàng/thanh toán (buyer): <svc-pay isCart> tự mount <svc-cart> nội bộ + tự quản lý dialog
    // order-flow của chính nó (tối ưu — svc-bay-sections.js chỉ cần 1 thẻ, không phải tự dựng
    // dialog/nghe cart:checkout/pay:back-to-cart như trước, xem comment đầu svc-pay.js). Chỉ hiện
    // khi bay có 1 section products (không có gì để bán thì không cần cart/pay). `promosStore`
    // (P2P mesh qua bayPromoAdapter — xem _promosStore) forward xuống <svc-cart> nội bộ để buyer
    // thấy mã owner tạo real-time, không cần đứng cùng thiết bị. Không còn prop `persist` —
    // webs/pay độc lập, tự quản lý invoice thật (Firestore), xem CLAUDE.md/pay.md.
    // QUAN TRỌNG: gate `this._isOwner ||` bắt buộc phải có — owner KHÔNG được thấy/dùng nút này,
    // không "mua hàng của chính mình" (từng bị xoá nhầm gate này lúc debug, svc-pay.js cũng tự
    // chặn <svc-cart> nếu lỡ mount với role="seller" — chốt chặn thứ 2, độc lập với gate ở đây).
    _rfCartBtn() {
        if (!this.sections.some(s => s.sectionType === 'products')) return nothing
        return html`
            <svc-pay isCart role="buyer"
                service=${`pay_${this.bay.id}`}
                cartService=${this._comCartService}
                sellerId=${this.bay.owner_id} buyerId=${this.user?.id ?? ''} bayId=${this.bay.id}
                .wallet=${this._comWallet} .promosStore=${this._promosStore} seller=${this._comSellerSlot}
                ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} lang=${this.lang}>
            </svc-pay>
        `
    }

    // "Đơn hàng của tôi" — CHUNG 1 <svc-pay-warden> cho cả 2 phía, chỉ khác role/id truyền vào:
    // owner xem MỌI đơn đã BÁN (role="seller", lọc theo sellerId); khách xem MỌI đơn mình đã ĐẶT,
    // xuyên mọi seller (role="buyer", lọc theo buyerId — xem loadBuyerInvoices trong
    // pay/tools/service.js). Click vào 1 dòng mở đúng <svc-pay invoiceId=...> để thao tác/xem chi
    // tiết — buyer giờ có trải nghiệm giống hệt seller, không cần dựng riêng UI cho từng phía.
    // Cùng điều kiện hiện với _rfCartBtn (chỉ bay bán hàng mới có gì để xem).
    _rfOrdersBtn() {
        if (!this.sections.some(s => s.sectionType === 'products')) return nothing
        return this._isOwner
            ? html`
                <svc-pay-warden role="seller" .sellerId=${this.bay.owner_id} .bayId=${this.bay.id} .wallet=${this._comWallet}
                    ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} lang=${this.lang}>
                </svc-pay-warden>`
            : html`
                <svc-pay-warden role="buyer" .buyerId=${this.user?.id ?? ''} .wallet=${this._comWallet}
                    ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} lang=${this.lang}>
                </svc-pay-warden>`
    }

    render() {
        if (!this.bay) return html``
        return html`
            <div class="bysec-wrap">
                ${this._rfBoard()}
                ${this._rfAddButton()}
                ${this._rfAddDialog()}
                ${this._rfEditDialog()}
                <div class="bysec-toolbox-wrap">
                  <div class="bysec-toolbox">
                    <svc-underlay theme=${this.theme} blur gradient rounded="2rem"></svc-underlay>
                    ${this._rfAssistBtn()}
                    ${this._rfPromoBtn()}
                    ${this._rfStatsBtn()}
                    ${this._rfOrdersBtn()}
                    ${this._rfCartBtn()}
                  </div>
                </div>
            </div>
        `
    }
}

if (!customElements.get('svc-bay-sections')) customElements.define('svc-bay-sections', SvcBaySections)
