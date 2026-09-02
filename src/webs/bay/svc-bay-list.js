// src/webs/bay/svc-bay-list.js
// Danh sách + tạo/sửa "bay" — tương đương svc-channel-rooms.js: avatar upload (blob cục bộ),
// vị trí qua map picker, hashtag (multi-tag editor + filter dropdown), tab Tất cả/Gần tôi/Ưu
// tiên, rail-collapse responsive trên màn nhỏ, tự seed 1 section Contact khi tạo bay mới. Dùng
// `web-texts` cho mọi field text (đồng nhất với channel — `web-texts single` = 1 ô, không
// `single` = trình biên tập nhiều tag nối `|`).
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-avatar.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-texts.js'
import '@/webs/apex/web-dialog.js'
import '@/webs/apex/web-photor-upload.js'
import '@/webs/apex/web-location-map.js'
import '@/webs/apex/web-select.js'
import '@/webs/apex/web-checkbox.js'
import styles from './styles/svc-bay-list.css?inline'
import { ulid, txtLingo, emit, toastEmit } from '@/services/helper.js'
import { createService } from '@/services/crud.js'
import { templates as contactTemplates } from '@/sections/contact/index.js'
import { listenBays, createBay, updateBay, isOwner, isOwnerOnline, MAX_BAYS_PER_USER, makeSectionRow, saveSections } from './tools/service.js'
import { notifySupported, notifyEnabled, requestNotifyPermission, disableNotify } from './tools/notify.js'
import { loadPriorityIds, setPriority } from './tools/priority.js'
import { setActiveBay as setSectionActiveBay, setActiveSection } from './tools/baySectionAdapter.js'
import { putBlob, getBlob } from './tools/baydb.js'

const firstPic = pics => (pics || '').split('|')[0].trim()
const bayTagList = b => (b.tags || '').split('|').map(t => t.trim())
const RAIL_BREAKPOINT = '(max-width: 80rem)'
const NEAR_RADIUS_KM = 20
const PAGE_SIZE = 1000 // trang đầu 1000 bay, cuộn tới cuối load thêm 1000 — xem _dhLoadMore()

// Khoảng cách Haversine (km) giữa 2 toạ độ — chỉ 1 nơi dùng trong repo (tab "Gần tôi"), không
// có helper chung nào để tái dùng nên viết thẳng ở đây (cùng lý do svc-channel-rooms.js).
function distanceKm(lat1, lng1, lat2, lng2) {
    const toRad = d => d * Math.PI / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TXT_STD = {
    vi: {
        searchPh: 'Tìm kênh…', createTitle: 'Tạo kênh mới', createTooltip: 'Tạo kênh mới',
        maxReached: n => `Mỗi người chỉ được tạo tối đa ${n} kênh`,
        editTitle: 'Sửa thông tin kênh', fTitle: 'Tên kênh', fDesc: 'Mô tả',
        fPhone: 'Số điện thoại (xác minh danh tính)', fPhoneEdit: 'Số điện thoại liên hệ',
        fMomoName: 'Họ và tên tài khoản MoMo nhận tiền (tuỳ chọn)',
        momoNotice: 'Số điện thoại và họ tên trên dùng để tạo mã QR nhận thanh toán MoMo — vui lòng nhập chính xác để nhận được tiền.',
        fLocation: 'Vị trí kênh — giúp khách hàng gần bạn tìm thấy dễ hơn',
        fPics: 'Ảnh đại diện kênh', fTags: 'Hashtag', empty: 'Chưa có kênh nào — bấm + để tạo',
        editBtn: 'Sửa thông tin kênh', filterTags: 'Lọc theo hashtag',
        errFields: 'Vui lòng nhập đủ Tên kênh, Mô tả, Số điện thoại và Vị trí',
        errFieldsEdit: 'Vui lòng nhập đủ Tên kênh, Số điện thoại và Vị trí',
        notifyOn: 'Bật thông báo tin nhắn mới', notifyOff: 'Tắt thông báo',
        tabAll: 'Tất cả', tabNear: 'Gần tôi', tabPriority: 'Ưu tiên', priorityTitle: 'Đánh dấu ưu tiên',
        emptyNear: 'Đang xác định vị trí…', emptyPriority: 'Chưa đánh dấu kênh ưu tiên nào',
        geoUnsupported: 'Trình duyệt không hỗ trợ định vị vị trí',
        geoDenied: 'Cần cấp quyền vị trí để dùng "Gần tôi"',
    },
    en: {
        searchPh: 'Search channels…', createTitle: 'Create new channel', createTooltip: 'Create new channel',
        maxReached: n => `Each person can create at most ${n} channel${n === 1 ? '' : 's'}`,
        editTitle: 'Edit channel info', fTitle: 'Channel name', fDesc: 'Description',
        fPhone: 'Phone number (identity verification)', fPhoneEdit: 'Contact phone number',
        fMomoName: 'MoMo receiving account full name (optional)',
        momoNotice: 'The phone number and name above are used to generate the MoMo payment QR — please enter them accurately to receive payment.',
        fLocation: 'Channel location — helps nearby customers find you',
        fPics: 'Channel avatar', fTags: 'Hashtag', empty: 'No channels yet — tap + to create one',
        editBtn: 'Edit channel info', filterTags: 'Filter by hashtag',
        errFields: 'Please fill in Channel name, Description, Phone number and Location',
        errFieldsEdit: 'Please fill in Channel name, Phone number and Location',
        notifyOn: 'Enable new message notifications', notifyOff: 'Disable notifications',
        tabAll: 'All', tabNear: 'Nearby', tabPriority: 'Priority', priorityTitle: 'Mark as priority',
        emptyNear: 'Locating…', emptyPriority: 'No priority channels marked yet',
        geoUnsupported: 'Your browser does not support geolocation',
        geoDenied: 'Location permission is required to use "Nearby"',
    },
}

export class SvcBayList extends LitElement {
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        user:      { type: Object },
        activeBay: { type: Object },
        syncBayId:    { type: String },  // id của bay đang mở + còn đang settle sync ban đầu — xem svc-bay.js _syncProgress
        syncProgress: { type: Number },  // 0-100, chỉ có ý nghĩa khi bay.id === syncBayId
        _bays:   { state: true },
        _search: { state: true },
        _activeTab:    { state: true }, // 'all' | 'near' | 'priority' — mặc định 'all'
        _nearCoords:   { state: true }, // { lat, lng } | null — cache sau lần xin quyền vị trí đầu tiên trong phiên
        _selectedTags: { state: true }, // string[] — tag đang chọn để lọc thêm (AND) cho tab đang active, xem _filtered
        _priorityIds:  { state: true }, // Set<bayId> — bay user tự đánh dấu ưu tiên, lưu localStorage (tools/priority.js), không phải data của bay
        _dialogOpen:  { state: true },
        _newBayId:    { state: true },
        _editingBay:  { state: true }, // null = mode Tạo, có giá trị = mode Sửa
        _formTitle:    { state: true },
        _formDesc:     { state: true },
        _formTags:     { state: true },
        _formPics:     { state: true },
        _formLocation: { state: true },
        _formPhone:    { state: true }, // chỉ mode Tạo
        _formMomoName: { state: true }, // họ tên tài khoản MoMo nhận tiền — tuỳ chọn, xem svc-bay-sections.js _comWallet
        _formError:    { state: true },
        _isSmall:    { state: true },
        _expanded:   { state: true },
        _notifyOn:     { state: true },
        _blobUrls:     { state: true }, // { [blobId]: objectURL } — resolve pics dạng "blob:<id>" cho avatar, xem _comResolvedPic()
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.user = null
        this.activeBay = null
        this.syncBayId = ''
        this.syncProgress = 0
        this._bays = []
        this._search = ''
        this._activeTab = 'all'
        this._nearCoords = null
        this._selectedTags = []
        this._priorityIds = new Set()
        this._dialogOpen = false
        this._newBayId = ''
        this._editingBay = null
        this._formTitle = ''; this._formDesc = ''; this._formTags = ''; this._formPics = ''; this._formLocation = ''
        this._formPhone = ''
        this._formMomoName = ''
        this._formError = ''
        this._isSmall = false
        this._expanded = false
        this._notifyOn = false
        this._blobUrls = {}
        this._maxCount = PAGE_SIZE // giới hạn hiện tại của listenBays() — tăng dần khi cuộn tới cuối, xem _dhLoadMore()
        this._loadingMore = false
        this._onMqChange = e => { this._isSmall = e.matches; if (!e.matches) this._expanded = false }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    connectedCallback() {
        super.connectedCallback()
        this._dcListen()
        this._mq = matchMedia(RAIL_BREAKPOINT)
        this._isSmall = this._mq.matches
        this._mq.addEventListener('change', this._onMqChange)
        this._notifyOn = notifyEnabled()
        this._priorityIds = loadPriorityIds()
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._unsub?.()
        this._mq?.removeEventListener('change', this._onMqChange)
        Object.values(this._blobUrls).forEach(url => URL.revokeObjectURL(url))
    }

    updated(changed) {
        if (changed.has('_isSmall') || changed.has('_expanded')) this.classList.toggle('rail', this._collapsed)
        this._dfResolveAvatarBlobs() // lifecycle hook, KHÔNG phải trong render() — tránh mutate state giữa lúc đang render
    }

    async _dhToggleNotify() {
        if (this._notifyOn) {
            disableNotify()
            this._notifyOn = false
            return
        }
        this._notifyOn = await requestNotifyPermission()
    }

    // Realtime — mọi client thấy ngay khi có ai tạo/sửa bay, không cần F5.
    async _dcListen() {
        this._unsub = await listenBays(rows => { this._bays = rows }, undefined, this._maxCount)
    }

    /** Flow tải thêm bay khi cuộn tới cuối danh sách (xem @scroll trong render()): scroll event -> _bays trang kế tiếp */
    async _dhLoadMore() {
        // [1] CHECK: Bỏ qua nếu đang tải dở hoặc đã tải hết — _bays.length < _maxCount nghĩa là
        // Firestore trả về ít hơn giới hạn đang xin, không còn row nào nữa để load thêm
        if (this._loadingMore || this._bays.length < this._maxCount) return
        // [2] PROCESS: Tăng giới hạn trang thêm 1 PAGE_SIZE
        this._loadingMore = true
        this._maxCount += PAGE_SIZE
        // [3] EXECUTE: Huỷ listener cũ rồi subscribe lại với giới hạn mới
        this._unsub?.()
        this._unsub = await listenBays(rows => { this._bays = rows }, undefined, this._maxCount)
        this._loadingMore = false
    }

    _dhListScroll(e) {
        const el = e.target
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) this._dhLoadMore()
    }

    // Bay của chính user (owner_id trùng) lên đầu, kế đến bay có owner đang online (xem
    // isOwnerOnline() — field peer_id_at, ghi khi owner tự mở bay mình và trở thành hub PeerJS
    // của bay đó, xem svc-bay.js _dhStartMeshRole), phần còn lại giữ nguyên thứ tự created_at
    // desc từ listenBays() nhờ Array.sort ổn định khi mọi so sánh đều trả 0.
    get _sortedBays() {
        const uid = this.user?.id
        return [...this._bays].sort((a, b) =>
            (b.owner_id === uid) - (a.owner_id === uid) || isOwnerOnline(b) - isOwnerOnline(a)
        )
    }

    // Tag duy nhất từ mọi bay hiện có (split '|', dedup, sort alpha) — nguồn .options cho
    // <web-select multiple> trong hàng lọc Hashtag.
    get _allTags() {
        const set = new Set()
        for (const b of this._bays) {
            for (const t of (b.tags || '').split('|')) {
                const trimmed = t.trim()
                if (trimmed) set.add(trimmed)
            }
        }
        return [...set].sort()
    }

    // Bay có toạ độ hợp lệ (2 segment cuối location) + trong bán kính NEAR_RADIUS_KM quanh
    // _nearCoords, sắp gần→xa. Rỗng khi chưa có _nearCoords (đang chờ quyền vị trí, hoặc lỗi/
    // chưa xin) — tránh nhấp nháy "hiện tất cả rồi lọc lại".
    get _comNearBays() {
        if (!this._nearCoords) return []
        const { lat: myLat, lng: myLng } = this._nearCoords
        return this._bays
            .map(b => {
                const parts = (b.location || '').split('~')
                if (parts.length < 6) return null
                const lat = parseFloat(parts[4]); const lng = parseFloat(parts[5])
                if (Number.isNaN(lat) || Number.isNaN(lng)) return null
                return { bay: b, dist: distanceKm(myLat, myLng, lat, lng) }
            })
            .filter(x => x && x.dist <= NEAR_RADIUS_KM)
            .sort((a, b) => a.dist - b.dist)
            .map(x => x.bay)
    }

    // Hashtag KHÔNG phải 1 tab riêng — chỉ hỗ trợ lọc thêm (AND) cho tab đang active (vd
    // "Gần tôi" + chọn tag "coffee" → còn bay gần vừa có tag đó). _selectedTags rỗng thì không
    // lọc gì thêm — xem nút icon slot="trigger" trong render().
    get _filtered() {
        const q = this._search.trim().toLowerCase()
        let bays = this._activeTab === 'near' ? this._comNearBays
            : this._activeTab === 'priority' ? this._sortedBays.filter(b => this._priorityIds.has(b.id))
            : this._sortedBays
        if (this._selectedTags.length) bays = bays.filter(b => bayTagList(b).some(t => this._selectedTags.includes(t)))
        if (q) bays = bays.filter(b => `${b.title} ${b.description} ${b.tags}`.toLowerCase().includes(q))
        return bays
    }

    get _collapsed() { return this._isSmall && !this._expanded }

    // Chặn tạo thêm bay ở tầng UI (ẩn/disable nút) — createBay() vẫn tự kiểm lại.
    get _myBayCount() { return this._bays.filter(b => b.owner_id === this.user?.id).length }
    get _canCreateBay() { return this._myBayCount < MAX_BAYS_PER_USER }

    // Click đúng item đang active — không bắn 'bay-opened' lại (svc-bay.js sẽ đóng mesh cũ rồi mở
    // lại từ đầu vô ích, tốn 1 vòng rebuild WebRTC + resync không cần thiết) — chỉ còn tác dụng
    // đóng rail mobile nếu đang mở rộng (user tap đúng kênh hiện tại để quay lại xem nó).
    _dhOpen(bay) {
        if (this._isSmall) this._expanded = false
        if (bay.id === this.activeBay?.id) return
        emit(this, 'bay-opened', { bay })
    }

    _dhTabAll() { this._activeTab = 'all' }

    /** Flow chuyển tab "Gần tôi": tab click -> _nearCoords (hoặc tự lùi về tab "Tất cả") */
    _dhTabNear() {
        this._activeTab = 'near'
        // [1] CHECK: Dùng lại _nearCoords đã cache nếu có — không xin quyền vị trí lại trong
        // cùng phiên
        if (this._nearCoords) return
        //   [1.a] IF_UNSUPPORTED: Trình duyệt không hỗ trợ geolocation → toast lỗi + lùi về "Tất cả"
        if (!navigator.geolocation) {
            toastEmit(this._txt.geoUnsupported, 'error')
            this._activeTab = 'all'
            return
        }
        // [3] EXECUTE: Xin quyền vị trí trình duyệt
        navigator.geolocation.getCurrentPosition(
            //   [3.a] IF_GRANTED: Lưu toạ độ vào cache
            pos => { this._nearCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
            //   [3.b] IF_DENIED: Từ chối quyền → toast lỗi + lùi về "Tất cả"
            () => {
                toastEmit(this._txt.geoDenied, 'error')
                this._activeTab = 'all'
            },
            { timeout: 8000 },
        )
    }

    _dhTabPriority() { this._activeTab = 'priority' }

    // Hashtag chỉ hỗ trợ lọc thêm cho tab đang active (xem _filtered) — không đổi _activeTab.
    _dhTagsChange(tags) { this._selectedTags = tags }

    // Checkbox "Ưu tiên" trên từng bay không phải của mình (xem _rfItem) — lưu cục bộ
    // localStorage (tools/priority.js), KHÔNG ghi Firestore vì đây là sở thích riêng của user
    // xem, không phải data của bay đó.
    _dhTogglePriority(bayId, on) {
        this._priorityIds = setPriority(bayId, on)
    }

    _resetForm() {
        this._formTitle = ''; this._formDesc = ''; this._formTags = ''; this._formPics = ''; this._formLocation = ''
        this._formPhone = ''
        this._formMomoName = ''
        this._formError = ''
    }

    _dhOpenCreate() {
        this._editingBay = null
        this._newBayId = ulid()
        this._resetForm()
        this._dialogOpen = true
    }

    _dhEditOpen(bay) {
        this._editingBay   = bay
        this._formTitle    = bay.title || ''
        this._formDesc     = bay.description || ''
        this._formTags     = bay.tags || ''
        this._formPics     = bay.pics || ''
        this._formLocation = bay.location || ''
        this._formPhone    = bay.phone || ''
        this._formMomoName = bay.momoAccountName || ''
        this._formError    = ''
        this._dialogOpen   = true
    }

    _dhCloseDialog() {
        this._dialogOpen = false
        this._editingBay = null
        this._formError = ''
    }

    // web-dialog tự đóng dialog (open=false) NGAY khi bấm Xác nhận, TRƯỚC khi handler @confirm
    // (bất đồng bộ) kịp chạy — validate lỗi thì phải chủ động mở lại: set false rồi await
    // updateComplete mới bật lại true để Lit nhận ra thay đổi thật và gọi lại showModal().
    async _reopenDialogWithError(message) {
        this._formError = message
        this._dialogOpen = false
        await this.updateComplete
        this._dialogOpen = true
    }

    async _dhConfirmDialog() {
        if (this._editingBay) await this._dhSaveEdit()
        else await this._dhCreate()
    }

    /** Flow tạo bay mới: form state -> mở bay vừa tạo */
    async _dhCreate() {
        // [1] CHECK: Validate dữ liệu form bắt buộc
        const title = this._formTitle.trim()
        const description = this._formDesc.trim()
        const phone = this._formPhone.trim()
        //   [1.a] IF_INVALID: Thiếu field bắt buộc → mở lại dialog kèm lỗi
        if (!title || !description || !phone || !this._formLocation.trim()) {
            await this._reopenDialogWithError(this._txt.errFields)
            return
        }
        // [3] EXECUTE: Tạo bay qua service (server tự kiểm lại MAX_BAYS_PER_USER)
        let bay
        try {
            bay = await createBay({
                id: this._newBayId,
                title, description, tags: this._formTags.trim(),
                pics: this._formPics, location: this._formLocation, phone,
                momoAccountName: this._formMomoName.trim(),
            })
        } catch (err) {
            //   [3.a] HANDLE_ERR: Lỗi từ service (vd vượt quá MAX_BAYS_PER_USER) → mở lại dialog kèm lỗi
            await this._reopenDialogWithError(err.message)
            return
        }
        //   [3.b] SEED: Tự seed 1 section Contact mẫu cho bay vừa tạo — PHẢI xong TRƯỚC bước
        //   RETURN mở bay bên dưới để svc-bay.js load sections cho bay vừa mở đã thấy sẵn
        await this._dfSeedContactSection(bay, title, description)
        // [4] RETURN: Đóng dialog, reset form, mở bay vừa tạo
        this._dialogOpen = false
        this._newBayId = ''
        this._resetForm()
        this._dhOpen(bay)
    }

    /** Flow seed section Contact cho bay mới: bay + title/description -> section item đã lưu */
    async _dfSeedContactSection(bay, title, description) {
        // [1] CHECK: Template modernHoriMap phải tồn tại + có sẵn data mẫu, không thì bỏ qua seed
        const tpl = contactTemplates.find(t => t.key === 'modernHoriMap')
        if (!tpl?.data?.length) return
        // [2] PROCESS: Tạo section row mẫu (thuần, không I/O)
        const section = makeSectionRow(bay.id, { sectionType: 'contact', configKey: tpl.key, index: 0 })
        // [3] EXECUTE: Lưu section + stamp active state + tạo section item
        //   [3.a] SAVE_SECTION: Ghi section row lên service
        await saveSections(bay.id, [section])
        //   [3.b] SET_ACTIVE: PHẢI gọi setActiveBay/setActiveSection của baySectionAdapter.js
        //   TRƯỚC bước CREATE_ITEM bên dưới — adapter đọc 2 state module-level này để stamp
        //   bay_id/section_id vào row
        setSectionActiveBay(bay.id)
        setActiveSection(section.id)
        //   [3.c] BUILD_SEED: Nhân bản data mẫu, thay bằng đúng title/description/vị trí/phone/
        //   email vừa nhập thay vì text demo mặc định của template. phone lấy từ bay.phone (đã
        //   xác minh lúc tạo, xem createBay()) — công khai được vì đây CHÍNH LÀ số liên hệ owner
        //   muốn khách hàng gọi tới; email lấy từ tài khoản đang đăng nhập (this.user.email)
        const seed = structuredClone(tpl.data[0])
        seed.title = title
        seed.description = description
        seed.meta.address = bay.location
        seed.meta.phone = bay.phone || ''
        seed.meta.email = this.user?.email || ''
        //   [3.d] CREATE_ITEM: Tạo section item — seed TRƯỚC _dhOpen(bay) ở _dhCreate() để lúc
        //   svc-bay.js load sections cho bay vừa mở đã thấy sẵn
        await createService('sectionItems', '', 'baySection').create(seed)
    }

    /** Flow sửa thông tin bay: form state -> 'bay-updated' event */
    async _dhSaveEdit() {
        // [1] CHECK: Validate dữ liệu form bắt buộc
        const title = this._formTitle.trim()
        const phone = this._formPhone.trim()
        //   [1.a] IF_INVALID: Thiếu field bắt buộc → mở lại dialog kèm lỗi
        if (!title || !phone || !this._formLocation.trim()) {
            await this._reopenDialogWithError(this._txt.errFieldsEdit)
            return
        }
        // [2] PROCESS: Gộp field mới vào bay đang sửa
        const updated = {
            ...this._editingBay,
            title, description: this._formDesc.trim(), tags: this._formTags.trim(),
            pics: this._formPics, location: this._formLocation, phone,
            momoAccountName: this._formMomoName.trim(),
        }
        // [3] EXECUTE: Ghi lên service
        try {
            await updateBay(this._editingBay, this.user, {
                title: updated.title, description: updated.description, tags: updated.tags,
                pics: updated.pics, location: updated.location, phone: updated.phone,
                momoAccountName: updated.momoAccountName,
            })
        } catch (err) {
            //   [3.a] HANDLE_ERR: Lỗi từ service → mở lại dialog kèm lỗi
            await this._reopenDialogWithError(err.message)
            return
        }
        // [4] RETURN: Đóng dialog, reset form, bắn 'bay-updated' kèm data mới — KHÔNG gọi
        // _dhOpen() lại bay đang mở (nếu có), vì đó sẽ kích hoạt cả luồng _dhOpenBay ở svc-bay.js
        // (đóng/mở lại mesh WebRTC) chỉ vì sửa tiêu đề/ảnh — quá nặng cho 1 thay đổi metadata
        // thuần. svc-bay.js tự merge vào this._activeBay NẾU đang mở đúng bay này.
        this._dialogOpen = false
        this._editingBay = null
        this._resetForm()
        emit(this, 'bay-updated', { bay: updated })
    }

    // saveLocal callback cho <web-photor-upload> — nhận Blob đã crop, lưu qua putBlob()
    // (baydb.js), trả về "blob:<id>" để gán vào `value`. Đánh dấu kind:'avatar' để
    // baydb.js.sweepExpired() không xoá sau 7 ngày như chat attachment.
    async _dfSaveAvatarBlob(blob, bayId) {
        const id = ulid()
        await putBlob({ id, bay_id: bayId, mime: blob.type, name: '', size: blob.size, blob, created_at: Date.now(), kind: 'avatar' })
        return `blob:${id}`
    }

    // Quét _bays mỗi lần update, tra getBlob() cho pics dạng "blob:<id>" CHƯA resolve xong —
    // getBlob() chỉ đọc cache IndexedDB (không cần mesh), gọi lại vô hại nếu vẫn miss.
    _dfResolveAvatarBlobs() {
        for (const bay of this._bays) {
            const raw = firstPic(bay.pics)
            if (!raw.startsWith('blob:')) continue
            const id = raw.slice(5)
            if (this._blobUrls[id]) continue
            getBlob(id).then(row => {
                if (row) this._blobUrls = { ...this._blobUrls, [id]: URL.createObjectURL(row.blob) }
            })
        }
    }

    // URL http(s) bình thường trả nguyên; "blob:<id>" chưa resolve xong trả '' —
    // <web-avatar src=""> tự fallback về initials.
    _comResolvedPic(pics) {
        const raw = firstPic(pics)
        if (!raw.startsWith('blob:')) return raw
        return this._blobUrls[raw.slice(5)] || ''
    }

    _rfItem(bay) {
        const active  = this.activeBay?.id === bay.id
        // syncProgress > 0 (không phải < 100) — item PHẢI còn mount lúc chạm 100% để CSS
        // .at-full kịp fade opacity mượt trước khi svc-bay.js thật sự xoá _syncProgress (~1s sau).
        const syncing = this.syncBayId === bay.id && this.syncProgress > 0
        const atFull  = syncing && this.syncProgress >= 100
        return html`
            <div class="byl-item ${active ? 'active' : ''} ${syncing ? 'syncing' : ''} ${atFull ? 'at-full' : ''}"
                style=${syncing ? `--sync-pct:${this.syncProgress}` : ''}
                @click=${() => this._dhOpen(bay)}>
                <web-avatar src=${this._comResolvedPic(bay.pics)} name=${bay.title} size="45px" ui=${this.ui} theme=${this.theme}
                    status=${isOwnerOnline(bay) ? 'online' : ''}></web-avatar>
                <div class="byl-item-body">
                    <p class="byl-item-title">${bay.title}</p>
                    <p class="byl-item-desc">${bay.description}</p>
                </div>
                ${isOwner(bay, this.user) ? html`
                    <web-button type="fill" color="primary" square rounded="50%" height="22px"
                        ui=${this.ui} theme=${this.theme} title=${this._txt.editBtn}
                        @click=${e => e.stopPropagation()} @clicked=${() => this._dhEditOpen(bay)}>
                        <iconify-icon icon="ri:pencil-line" width="16px"></iconify-icon>
                    </web-button>
                ` : html`
                    <div class="byl-item-priority" title=${this._txt.priorityTitle} @click=${e => e.stopPropagation()}>
                        <web-checkbox rounded="50%" .checked=${this._priorityIds.has(bay.id)} ui=${this.ui} theme=${this.theme}
                            @change=${e => this._dhTogglePriority(bay.id, e.detail.checked)}
                        ></web-checkbox>
                    </div>
                `}
            </div>
        `
    }

    _rfRailItem(bay) {
        const active  = this.activeBay?.id === bay.id
        const syncing = this.syncBayId === bay.id && this.syncProgress > 0
        const atFull  = syncing && this.syncProgress >= 100
        return html`
            <div class="byl-rail-item ${active ? 'active' : ''} ${syncing ? 'syncing' : ''} ${atFull ? 'at-full' : ''}"
                style=${syncing ? `--sync-pct:${this.syncProgress}` : ''}
                @click=${() => this._dhOpen(bay)}>
                <web-avatar src=${this._comResolvedPic(bay.pics)} name=${bay.title} size="40px" ui=${this.ui} theme=${this.theme}
                    status=${isOwnerOnline(bay) ? 'online' : ''}></web-avatar>
            </div>
        `
    }

    _rbDialog() {
        const isEdit = !!this._editingBay
        return html`
            <web-dialog ?open=${this._dialogOpen} title=${isEdit ? this._txt.editTitle : this._txt.createTitle}
                lang=${this.lang} maxWidth="420px" persistent
                @confirm=${() => this._dhConfirmDialog()} @cancel=${() => this._dhCloseDialog()}>
                <div class="byl-form">
                    <web-texts single placeholder=${this._txt.fTitle} .value=${this._formTitle} height="38px"
                        @change=${e => { this._formTitle = e.detail.value }}></web-texts>
                    <web-texts single placeholder=${this._txt.fDesc} .value=${this._formDesc} height="38px"
                        @change=${e => { this._formDesc = e.detail.value }}></web-texts>
                    <web-texts single placeholder=${isEdit ? this._txt.fPhoneEdit : this._txt.fPhone} .value=${this._formPhone} height="38px"
                        @change=${e => { this._formPhone = e.detail.value }}></web-texts>
                    <web-texts single placeholder=${this._txt.fMomoName} .value=${this._formMomoName} height="38px"
                        @change=${e => { this._formMomoName = e.detail.value }}></web-texts>
                    <div class="byl-form-notice">${this._txt.momoNotice}</div>
                    <web-photor-upload placeholder=${this._txt.fPics} .value=${this._formPics}
                        .saveLocal=${blob => this._dfSaveAvatarBlob(blob, isEdit ? this._editingBay?.id : this._newBayId)}
                        @change=${e => { this._formPics = e.detail.value }}></web-photor-upload>
                    <web-location-map geo ui=${this.ui} theme=${this.theme}
                        placeholder=${this._txt.fLocation} .value=${this._formLocation}
                        @change=${e => { this._formLocation = e.detail.value }}></web-location-map>
                    <web-texts placeholder=${this._txt.fTags} .value=${this._formTags} height="38px"
                        @change=${e => { this._formTags = e.detail.value }}></web-texts>
                    ${this._formError ? html`<div class="byl-form-error">${this._formError}</div>` : nothing}
                </div>
            </web-dialog>
        `
    }

    render() {
        if (this._collapsed) {
            return html`
                <div class="byl-rail-menu" @click=${() => { this._expanded = true }}>
                    <iconify-icon icon="ri:menu-line"></iconify-icon>
                </div>
                <div class="byl-rail-list" @scroll=${e => this._dhListScroll(e)}>
                    ${this._sortedBays.map(bay => this._rfRailItem(bay))}
                </div>
                ${this._rbDialog()}
            `
        }

        return html`
            <div class="byl-search-row">
                <web-texts single class="byl-search-input" ui="spatial" placeholder=${this._txt.searchPh} .value=${this._search} height="36px"
                    @input=${e => { this._search = e.detail.value }}></web-texts>
                <web-button class="byl-create-btn" type="soft" color="primary" height="36px" square rounded="50%"
                    ?disabled=${!this._canCreateBay} @clicked=${() => this._dhOpenCreate()}
                    title=${this._canCreateBay ? this._txt.createTooltip : this._txt.maxReached(MAX_BAYS_PER_USER)}>
                    <iconify-icon icon="ri:apps-2-add-line" width="24px"></iconify-icon>
                </web-button>
                ${notifySupported() ? html`
                    <web-button class="byl-notify-btn" type="soft" color=${this._notifyOn ? 'primary' : 'base-content'} height="36px" square rounded="50%"
                        @clicked=${this._dhToggleNotify} title=${this._notifyOn ? this._txt.notifyOff : this._txt.notifyOn}>
                        <iconify-icon icon=${this._notifyOn ? 'ri:notification-4-line' : 'ri:notification-off-line'} width="20px"></iconify-icon>
                    </web-button>
                ` : nothing}
                <slot name="action" />
            </div>

            <div class="byl-tabs">
                <div class="byl-tabs-group">
                    <web-button type=${this._activeTab === 'all' ? 'fill' : 'outline'} color="primary" rounded="99px" height="34px"
                        ui=${this.ui} theme=${this.theme} @clicked=${() => this._dhTabAll()}>${this._txt.tabAll}</web-button>
                    <web-button type=${this._activeTab === 'near' ? 'fill' : 'outline'} color="primary" rounded="99px" height="34px"
                        ui=${this.ui} theme=${this.theme} @clicked=${() => this._dhTabNear()}>${this._txt.tabNear}</web-button>
                    <web-button type=${this._activeTab === 'priority' ? 'fill' : 'outline'} color="primary" rounded="99px" height="34px"
                        ui=${this.ui} theme=${this.theme} @clicked=${() => this._dhTabPriority()}>${this._txt.tabPriority}</web-button>
                </div>
                <web-select class="byl-tag-filter" multiple ui=${this.ui} theme=${this.theme}
                    .options=${this._allTags.map(t => ({ label: t, value: t }))}
                    .value=${this._selectedTags} placement="bottom-end"
                    @change=${e => this._dhTagsChange(e.detail.value)}
                >
                    <web-button slot="trigger" type=${this._selectedTags.length ? 'fill' : 'outline'} color="primary"
                        square rounded="50%" height="34px" ui=${this.ui} theme=${this.theme} title=${this._txt.filterTags}>
                        <iconify-icon icon="ri:filter-3-line" width="18px"></iconify-icon>
                    </web-button>
                </web-select>
            </div>

            <div class="byl-list" @scroll=${e => this._dhListScroll(e)}>
                ${this._filtered.length
                    ? this._filtered.map(bay => this._rfItem(bay))
                    : html`<div class="byl-empty">${
                        this._activeTab === 'near' && !this._nearCoords ? this._txt.emptyNear
                        : this._activeTab === 'priority' ? this._txt.emptyPriority
                        : this._txt.empty
                    }</div>`}
            </div>

            ${this._rbDialog()}
        `
    }
}

if (!customElements.get('svc-bay-list')) customElements.define('svc-bay-list', SvcBayList)
