// src/webs/bay/svc-bay.js
//
// Orchestrator — login gate → danh sách bay → mở bay: tạo mesh session, đăng ký presence +
// chat + blob transfer + commerce (sections/sectionItems — products lưu Firestore thật, xem
// tools/bayAdapter.js, KHÔNG qua mesh) + promo + gọi audio/video,
// gửi/nhận qua session, render <svc-chat> (component chat DÙNG CHUNG mọi domain — src/webs/chat/,
// KHÔNG thuộc channel — xem comment đầu file đó) + <svc-bay-sections> (board sản phẩm/section)
// + <svc-bay-call> (UI cuộc gọi) trong feature slot/overlay. Đây là sub-project cuối trong
// roadmap 5 phần — xem hook/superpowers/specs/2026-07-23-bay-foundation-design.md.
//
// Light DOM (createRenderRoot trả `this`) — cần cho <web-board> bên trong <svc-bay-sections>
// (CSS grid của nó chỉ inject document.head, không vượt qua được ranh giới Shadow DOM).
import { LitElement, html } from 'lit'
import Storage from '@/services/storager'
import { ClientCookies, COOKIE_CONFIG } from '@/services/storeCookie.js'
import { ulid, txtLingo, toastEmit } from '@/services/helper.js'
import { createService } from '@/services/crud.js'
import {
    deviceId, sweepExpired,
    listenBay, writeHubPeerId, clearHubPeerId,
    makePresence, applyPresence, loadDevices, onlinePeers,
    history, sendMessage, receiveMessage,
    sendBlob, handleBlobMeta, handleBlobChunk, getBlob,
    loadSections, makeSectionRow, saveSections, loadSectionItems,
    isOwner, findOwnBay,
    writePing, listenBayPings,
    INVITE_TIMEOUT_MS, HEARTBEAT_MS, RECONCILE_MS,
} from './tools/service.js'
import { putBlob } from './tools/baydb.js'
import { notify } from './tools/notify.js'
import { seedCustomerExtra } from '@/webs/pay/tools/service.js'
import { createBaySession } from './tools/session.js'
import { createTokenBucket } from './tools/ratelimit.js'
import { startCall, answerCall, completeCall, endCall } from './tools/call.js'
import { buildBayTourSteps, bayTourTitle } from './tools/tour.js'
import { createSeenFilter, buildChatBitmap, filterMissingRows, b64Bitmap, unb64Bitmap, hashRows } from './tools/bitmap.js'
import { markStageDone, progressPercent, SYNC_STAGES } from './tools/syncProgress.js'
import { setActiveBay as setBayActiveBay } from './tools/bayAdapter.js'
import {
    applyIncomingSectionItems, setSectionBroadcastHandler,
    setActiveBay as setSectionActiveBay,
} from './tools/baySectionAdapter.js'
import {
    loadPromos, applyIncomingPromo, applyIncomingPromoRemove,
    setActiveBay as setPromoActiveBay,
} from './tools/bayPromoAdapter.js'
import './styles/svc-bay.css'
import './svc-bay-login.js'
import './svc-bay-list.js'
import './svc-bay-sections.js'
import './svc-bay-call.js'
import '@/webs/chat/svc-chat.js'
import '@/webs/underlay/svc-underlay.js'
import '@/webs/apex/web-theme.js'
import '@/webs/apex/web-impact.js'
import '@/webs/apex/web-toast.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-driver.js'
import 'iconify-icon'

const TOUR_SEEN_KEY = 'bay_tour_seen' // đã xem hết product tour chưa — ttl=0 (vĩnh viễn), xem _dhTourCompleted()
const KNOWN_BAYS_KEY = 'bay_known_ids' // bay id đã từng mở trên thiết bị này — nguồn theo dõi ping nền, xem _dcTrackKnownBay()
const MAX_KNOWN_BAYS = 20 // an toàn dưới giới hạn 30 của Firestore `where in` (listenBayPings)
const RECONNECT_RETRY_MS = 5_000 // spoke tự gọi lại _dfEnsureHubLink() sau ngần này nếu lượt join hub trước vừa thất bại/timeout — xem _dfScheduleReconnect/_comChannelStatus

// Toàn bộ bay (presence/chat/commerce sync/call) chạy trên 1 mesh WebRTC (xem tools/mesh.js) —
// không có API nào thay thế được RTCPeerConnection. Trình duyệt tắt hẳn API này (không phải chặn
// quyền camera/mic, mà bản thân constructor không tồn tại) trong các chế độ bảo mật nâng cao như
// Lockdown Mode của Apple — check 1 lần lúc module nạp, dùng lại trong render() để chặn sớm bằng
// 1 thông báo rõ ràng, thay vì để mesh.js ném ReferenceError rải rác lúc mở bay.
const SUPPORTS_RTC = typeof RTCPeerConnection !== 'undefined'

const TXT_STD = {
    vi: {
        placeholder: 'Chọn 1 kênh để xem', caller: 'Người gọi',
        loadingChannel: 'Đang tải kênh…',
        reconnecting: 'Mất kết nối, đang thử lại…',
        errNoDevice: 'Không tìm thấy camera/mic trên thiết bị này.',
        errDenied: 'Bạn đã từ chối quyền truy cập camera/mic.',
        errBusy: 'Camera/mic đang được ứng dụng khác sử dụng.',
        errConstraints: 'Camera/mic không đáp ứng được yêu cầu.',
        errUnknown: (name) => `Không thể bật camera/mic (${name}).`,
        dmPingMsg: (name, title) => `${name} vừa nhắn riêng cho bạn trong kênh "${title}"`,
        dmPingAction: 'Xem ngay',
        unsupportedTitle: 'Trình duyệt đang chặn 1 tính năng bắt buộc',
        unsupportedBody: 'Kênh này cần WebRTC để trò chuyện/gọi realtime, nhưng trình duyệt của bạn đang bật chế độ bảo mật nâng cao (vd Lockdown Mode trên iPhone/Mac) tắt hẳn tính năng này. Hãy tắt chế độ đó cho trang này, hoặc mở bằng trình duyệt/thiết bị khác.',
    },
    en: {
        placeholder: 'Select a channel to view', caller: 'Caller',
        loadingChannel: 'Loading channel…',
        reconnecting: 'Connection lost, retrying…',
        errNoDevice: 'No camera/mic found on this device.',
        errDenied: 'You denied camera/mic access.',
        errBusy: 'Camera/mic is being used by another app.',
        errConstraints: "Camera/mic can't meet the requested constraints.",
        errUnknown: (name) => `Couldn't enable camera/mic (${name}).`,
        dmPingMsg: (name, title) => `${name} sent you a private message in "${title}"`,
        dmPingAction: 'View',
        unsupportedTitle: 'Your browser is blocking a required feature',
        unsupportedBody: "This channel needs WebRTC for realtime chat/calls, but your browser has an enhanced security mode on (e.g. Lockdown Mode on iPhone/Mac) that disables it. Please turn that off for this site, or open it on a different browser/device.",
    },
}

export class SvcBay extends LitElement {
    createRenderRoot() { return this } // light DOM — xem comment đầu file

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        mainColors: { type: String }, // truyền xuống svc-bay-sections.js → <web-board>/<svc-pay-stats>
        _user:      { state: true },
        _deviceId:  { state: true },
        _activeBay: { state: true },
        _openingBay:      { state: true }, // bay đang trong quá trình mở (click hoặc deep link) nhưng CHƯA commit — xem _comChannelStatus
        _deepLinkPending: { state: true }, // đã thấy ?bay=<id> trên URL nhưng chưa fetch xong / chưa tới lượt tự mở — cùng _comChannelStatus
        _meshRetrying:    { state: true }, // 1 lượt join hub vừa timeout/thất bại, đang tự retry (_dfEnsureHubLink/_dfScheduleReconnect) — cùng _comChannelStatus
        _devices:   { state: true },
        _log:       { state: true },
        _blobUrls:  { state: true },
        _sections:  { state: true },
        _giftRainKey: { state: true },
        _pendingOpenDm: { state: true },
        _syncProgress: { state: true },
        _tourSeen:  { state: true }, // đã xem hết product tour chưa — ẩn luôn nút "?" sau khi xem xong, xem _dhTourCompleted()
        _callState:        { state: true },
        _callPeerId:       { state: true },
        _callPeerName:     { state: true },
        _callLocalStream:  { state: true },
        _callRemoteStream: { state: true },
        _callDeclinedBy:   { state: true },
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    constructor() {
        super()
        this.ui = 'spatial'; this.lang = 'vi'; this.txt = null
        // Fallback đồng bộ ngay — tránh flash sai theme trước khi connectedCallback() gọi _dcLoadTheme()
        this.theme = document.documentElement.getAttribute('data-theme') || 'light'
        this.mainColors = '#ffbb24|#de8daf|#8c87b0|#5691c9|#e19d69' // cùng bảng màu mặc định site (services/modules/shop-page.js), caller ngoài có thể override qua prop/attribute
        this._user = null; this._deviceId = ''; this._activeBay = null
        this._openingBay = null // xem _dhOpenBay/_comChannelStatus
        this._deepLinkPending = false // xem _dcResolveDeepLink/_comChannelStatus
        this._meshRetrying = false // xem _dfEnsureHubLink/_comChannelStatus
        this._reconnectTimer = null // hẹn giờ retry join hub — xem _dfScheduleReconnect
        this._devices = []
        this._log = []
        this._blobUrls = {}
        this._sections = []
        this._giftRainKey = 0 // bump mỗi lần cần bắn 1 đợt <web-impact> mới (owner tạo mã / nhận mã từ peer) — không reset theo bay, chỉ là bộ đếm UI thuần
        this._tourSeen = false // nạp thật ở connectedCallback (async) — mặc định false để nút "?" hiện ngay lúc chưa kịp đọc storage

        // Call state — 1:1 only, cùng phạm vi svc-channel.js
        this._callState    = 'idle' // 'idle' | 'ringing-out' | 'ringing-in' | 'active'
        this._callPeerId   = ''
        this._callPeerName = ''
        this._callLocalStream  = null
        this._callRemoteStream = null
        this._callIncomingOffer = null // stash SDP offer khi ringing-in, dùng lúc bấm Nhận
        this._callDeclinedBy = [] // peer id đã từ chối cuộc gọi của mình — khóa 1 chiều, chỉ mở khi họ chủ động gọi lại

        this._session = null
        this._openSeq = 0 // tăng dần mỗi lần mở bay — phát hiện lượt mở bị "đè" bởi lượt mới hơn
        this._syncStages   = {} // bayId -> Set<string> mốc đồng bộ đã xong (tools/syncProgress.js)
        this._syncProgress = {} // bayId -> number 0-100, PROP xuống svc-bay-list.js để vẽ progress bar
        this._syncGraceTimer = null // fallback nếu bay không có peer nào — xem _dhOpenBay
        this._syncProgressHideTimers = {} // bayId -> timeout id, ẩn bar ~1s sau khi chạm 100%
        this._syncSettled = new Set() // bayId đã từng chạm 100% ít nhất 1 lần trong lượt mở hiện tại — KHÔNG bị dọn theo _syncProgress (transient, chỉ để vẽ progress ring), xem _comChannelStatus/_dfMarkSyncStage
        this._unsubBay       = null // unsub listenBay() — đọc lại info bay + `peer_id` (KHÔNG còn `signals[]`)
        this._unsubPings     = null
        this._seenPingIds    = new Set() // ping id đã toast — tránh toast lại nếu snapshot bắn lại (không còn clearPing, dedupe hoàn toàn cục bộ)
        this._deepLinkBay     = null // bay fetch được từ ?bay=<id> lúc mount — tự mở khi cả login lẫn fetch đều xong, xem _dhTryOpenDeepLink()
        this._deepLinkBayId   = '' // id thô đọc thẳng từ URL, có TRƯỚC khi findById() xong — xem _comSyncListBayId
        this._deepLinkDm      = null // peer device id kèm theo (?dm=) — làm openDm ban đầu cho deep link đó
        this._deepLinkChecked = false // đã đọc xong URL (?bay=) chưa, dù có bay hay không — xem _dhTryOpenDeepLink()
        this._pendingOpenDm   = null // { device_id, user_name } — truyền xuống <svc-chat openDm> để tự mở đúng tab DM
        this._heartbeatTimer = null
        this._peerId = '' // id ephemeral (ulid, sinh lại mỗi lần mở bay) dùng cho PeerJS — KHÁC _deviceId (persist, dùng cho presence/chat/ping addressing), xem tools/mesh.js
        this._isHub  = false // true nếu chính thiết bị này đang là hub (owner) của bay đang mở — xem _dhStartMeshRole
        this._peerToDevice = new Map() // (hub only) transport peerId -> device_id, học từ PRESENCE nhận trực tiếp — xem _dfReceiveDevice/_comOnlineDevices
        this._deviceToPeer = new Map() // (hub only) chiều ngược lại — cần cho _dfResolveTransportId() (call 1:1 dùng device_id, mesh.send/getConnection cần transport id)
        this._chatSeenFilter = createSeenFilter() // Bloom dedupe cho _dfMergeRow (relay hot-path) — cùng cơ chế channel
        this._syncSince      = 0
        this._sectionsUpdatedAt   = 0 // mốc updated_at của lần SECTIONS_UPDATE gần nhất đã áp
        this._sectionItemVersions = new Map() // id -> updated_at đã relay/apply gần nhất cho sectionItems (hero/contact)
        this._seenPromoCodes = new Set() // code đã áp/relay cho bay hiện tại — mã promo là create-only nên dedupe bằng code đủ, không cần version Map như products
        this._hubConnectBucket  = createTokenBucket({ capacity: 6, refillPerSec: 0.1 }) // ~1 lần/10s/bay — tự vệ chống spam gọi joinHub()
        this._syncRequestBucket = createTokenBucket({ capacity: 1, refillPerSec: 1 / 3 }) // tối đa 1 lần xử lý/3s/peer

        // Cache snapshot commerce (products/sections/sectionItems/promos + hash, KHÔNG gồm
        // devices — xem _dfCommerceSnapshot) dùng để trả lời SYNC_REQUEST — invalidate ở mọi nơi
        // ghi (owner đổi sections/product/sectionItem/promo, hoặc nhận bản mới hơn từ peer). Không
        // cache thì storm nhiều peer join gần nhau sẽ đọc lại IndexedDB + hash lại đúng 4 tập
        // KHÔNG ĐỔI liên tiếp nhiều lần — xem _dfInvalidateCommerceCache().
        this._commerceCache = null
        // Hàng đợi xử lý SYNC_REQUEST (_dfDrainSyncQueue) — nhường 1 tick giữa 2 lượt dựng
        // SYNC_RESPONSE (hash + JSON.stringify, có thể nặng khi payload lớn) để tránh 1 loạt peer
        // link gần nhau dồn hết việc CPU-bound đó liên tiếp trên main thread, làm tab đứng hình.
        this._syncResponseQueue    = []
        this._syncResponseDraining = false

        this._handleUnload = this._handleUnload.bind(this)
    }

    async connectedCallback() {
        super.connectedCallback()
        window.addEventListener('beforeunload', this._handleUnload)
        this._dcLoadTheme()
        // [1] CHECK: trình duyệt tắt hẳn WebRTC (vd Lockdown Mode, xem SUPPORTS_RTC) — mesh/
        // presence/chat/call không chạy được, dừng sớm ở đây thay vì cố khởi tạo device/mesh rồi
        // rải ReferenceError khắp nơi; render() tự hiện thông báo tương ứng.
        if (!SUPPORTS_RTC) return
        // _user không tự dò ở đây nữa — svc-bay-login.js tự check auth.get() sau layer loading
        // của chính nó, và bắn bay-logged-in (kể cả khi đã đăng nhập sẵn) qua _dhLoggedIn.
        this._deviceId = await deviceId()
        await sweepExpired()
        this._tourSeen = !!(await Storage.get(TOUR_SEEN_KEY))
        this._dcResolveDeepLink() // fire-and-forget — mở thật sự chờ _dhTryOpenDeepLink() gate cả 2 điều kiện
    }

    // Đọc ?bay=<id>&dm=<peerDeviceId> lúc mount — cho phép quay lại đúng bay (và đúng tab DM)
    // qua link (xem _dhOpenBay/_dhLeaveBay đồng bộ ngược URL này). Fetch Firestore này CHẠY
    // SONG SONG với login (_dhLoggedIn) — không biết cái nào xong trước, nên không tự mở bay
    // ở đây; chỉ đánh dấu "đã đọc xong URL" rồi nhờ _dhTryOpenDeepLink() gate cả 2 phía.
    async _dcResolveDeepLink() {
        const params = new URLSearchParams(location.search)
        const bayId = params.get('bay')
        if (bayId) {
            // Set NGAY (trước await) — render() phải hiện overlay "đang tải kênh" thay vì
            // placeholder "chọn 1 kênh" trong lúc findById() còn đang chạy, xem _comChannelStatus.
            this._deepLinkPending = true
            this._deepLinkBayId = bayId // id thô từ URL, có TRƯỚC khi findById() xong — xem _comSyncListBayId/_comSyncListBay
            this._deepLinkDm = params.get('dm') || ''
            try {
                this._deepLinkBay = await createService('bays').findById(bayId)
            } catch (err) {
                console.error('[svc-bay] không đọc được bay từ deep link:', err)
            }
            if (!this._deepLinkBay) this._deepLinkPending = false // không tìm thấy -> rơi lại placeholder bình thường (_dhTryOpenDeepLink sẽ không có gì để mở)
        }
        this._deepLinkChecked = true
        this._dhTryOpenDeepLink()
    }

    // Chỉ thật sự mở deep link khi CẢ 2 đã xong: đã login (this._user) VÀ đã đọc xong URL
    // (_deepLinkChecked) — gọi từ CẢ _dcResolveDeepLink() lẫn _dhLoggedIn(), bên nào xong sau
    // cùng sẽ là bên thật sự kích hoạt. Trước đây chỉ check ở _dhLoggedIn() nên nếu login
    // (thường đã cache sẵn, xong gần như ngay) thắng race trước khi Firestore findById() kịp
    // trả về, _deepLinkBay vẫn null lúc đó và deep link bị bỏ qua luôn, không ai gọi lại.
    _dhTryOpenDeepLink() {
        if (!this._user || !this._deepLinkChecked || !this._deepLinkBay) return
        const bay = this._deepLinkBay
        const dm  = this._deepLinkDm
        this._deepLinkBay = null; this._deepLinkDm = null
        this._deepLinkPending = false // _openingBay (đặt trong _dhOpenBay ngay dưới đây) tiếp quản overlay loading từ đây
        if (dm) this._pendingOpenDm = { device_id: dm, user_name: '' }
        this._dhOpenBay(bay)

        // FIXME: update peer_id khi browser owner bị F5 (refresh) + ?bay=id -> tự "click lại"
        if (isOwner(bay, this._user)) {
            setTimeout(() => {
                if (!(this._activeBay?.id === bay.id || this._openingBay?.id === bay.id)) return
                if (onlinePeers(this._devices).length > 2) return // khi hiển thị 1 người online (onlinePeers <= 2) (chính mình, không ai khác)
                this._dhOpenBay(bay)
            }, 300)
        }
    }

    // Người đang đăng nhập nếu đã tự tạo 1 bay của chính mình thì rất có khả năng dùng đúng
    // phone/địa chỉ đã xác minh lúc tạo bay đó khi đi MUA ở 1 bay khác — mồi sẵn vào "Thông tin
    // khách hàng" (section `pay_customer` của svc-pay-customer.js, webs/pay — bay ĐƯỢC PHÉP dùng
    // pay, xem hook/PAY.rst §1 điểm 4) đỡ họ gõ lại tay. Fire-and-forget, không chặn render — chỉ
    // có ý nghĩa "tiện" chứ không phải path chính.
    async _dcSeedOwnCustomer() {
        if (!this._user) return
        const ownBay = await findOwnBay(this._user.id)
        seedCustomerExtra({
            fullName: this._user.display_name || '', email: this._user.email || '',
            phone: ownBay?.phone || '', location: ownBay?.location || '',
        })
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener('beforeunload', this._handleUnload)
        this._themeObserver?.disconnect()
        Object.values(this._blobUrls).forEach(url => URL.revokeObjectURL(url))
        this._unsubPings?.(); this._unsubPings = null
        this._dhLeaveBay()
    }

    // Cùng nguồn + thứ tự fallback với BtnTheme.astro (cookie theme → data-theme hiện tại
    // → 'light'), sau đó theo dõi data-theme sống (BtnTheme chỉ set attribute trên <html>,
    // không có event/pubsub riêng) — giống pattern web-board.js/svc-channel.js.
    _dcLoadTheme() {
        this.theme = ClientCookies.get(COOKIE_CONFIG.THEME) ?? document.documentElement.getAttribute('data-theme') ?? 'light'

        this._themeObserver = new MutationObserver(() => {
            this.theme = document.documentElement.getAttribute('data-theme') || 'light'
        })
        this._themeObserver.observe(document.documentElement, {
            attributes: true, attributeFilter: ['data-theme'],
        })
    }

    _handleUnload() {
        if (this._callState !== 'idle') this._session?.send(this._callPeerId, 'CALL_HANGUP', {})
        if (this._activeBay && this._session) this._dfSendPresence('offline')
        // Best-effort — fetch lúc unload không đảm bảo chạy xong (tab có thể đóng giữa chừng),
        // nhưng đỡ 1 lượt startHub()-fail-rồi-mới-startHub()-lại ở lần owner mở bay kế tiếp nếu
        // kịp gửi (xem _dhStartMeshRole — không kịp cũng tự lành nhờ joinHub() reject đúng khi
        // hub id đã chết, không còn treo vô thời hạn như trước).
        if (this._isHub && this._activeBay) clearHubPeerId(this._activeBay.id).catch(() => {})
    }

    _dhLoggedIn(e) {
        this._user = e.detail.user
        this._dcSeedOwnCustomer()
        this._dcWatchPings() // pings địa chỉ theo device_id, không cần chờ gì thêm ngoài deviceId đã có
        this._dhTryOpenDeepLink()
    }

    // Product tour (web-driver.js, cùng ý tưởng driver.js) mô tả các khu vực chính của svc-bay —
    // nội dung + logic dựng steps nằm ở tools/tour.js (tránh phình TXT/logic của chính component
    // này), buildBayTourSteps() đã tự lọc bỏ selector chưa có mặt (vd .bay-feature-slot/.bay-chat
    // chỉ render khi đã mở 1 bay).
    _dhStartTour() {
        const steps = buildBayTourSteps(this.lang)
        if (!steps.length) return
        window.webDriver(steps, {
            showProgress: true,
            onDestroyed: driver => { if (driver.isCompleted()) this._dhTourCompleted() },
        }).drive()
    }

    // Xem hết tour (Next tới bước cuối, KHÔNG phải đóng giữa chừng qua X/Escape/click ra ngoài —
    // xem driver.isCompleted()) — ẩn hẳn nút "?" từ nay, lưu vĩnh viễn (ttl=0) nên không hiện
    // lại ở lần mở app sau.
    async _dhTourCompleted() {
        this._tourSeen = true
        await Storage.set(TOUR_SEEN_KEY, true, 0)
    }

    _dhBayUpdated(bay) {
        if (this._activeBay?.id === bay.id) this._activeBay = { ...this._activeBay, ...bay }
    }

    // ── Ping xuyên bay — báo tin nhắn riêng khi peer KHÔNG đang mở đúng bay đó (mesh chỉ sống
    // cho 1 bay/lúc — xem _dhOpenBay/_dhLeaveBay) ─────────────────────────────────

    /** Flow track "known bay": bayId vừa mở -> danh sách bay id lưu localStorage (mới nhất lên đầu, cap MAX_KNOWN_BAYS) */
    async _dcTrackKnownBay(bayId) {
        const ids = (await Storage.get(KNOWN_BAYS_KEY)) || []
        const next = [bayId, ...ids.filter(id => id !== bayId)].slice(0, MAX_KNOWN_BAYS)
        await Storage.set(KNOWN_BAYS_KEY, next, 0)
        return next
    }

    /** Flow theo dõi ping nền: knownIds (mặc định đọc lại từ storage) -> resub listenBayPings */
    async _dcWatchPings(knownIds) {
        this._unsubPings?.()
        const ids = knownIds ?? ((await Storage.get(KNOWN_BAYS_KEY)) || [])
        this._unsubPings = listenBayPings(ids, rows => rows.forEach(bay => this._dfHandlePingRow(bay)))
    }

    /** Flow nhận snapshot 1 bay từ listenBayPings: bay (kèm field `pings.{myDeviceId}.{fromDeviceId}`
     *  map, xem writePing ở tools/service.js) -> toast ping mới cho mình */
    _dfHandlePingRow(bay) {
        if (bay.id === this._activeBay?.id) return // đúng bay đang mở — mesh + svc-chat đã lo (_dcSyncIncomingDMs), khỏi toast trùng
        for (const ping of Object.values(bay.pings?.[this._deviceId] ?? {})) {
            if (this._seenPingIds.has(ping.id)) continue
            this._seenPingIds.add(ping.id) // không còn clearPing — dedupe hoàn toàn cục bộ, key cũ nằm im trên doc vô hại
            toastEmit(
                this._txt.dmPingMsg(ping.from_user_name, bay.title),
                'info',
                { actionLabel: this._txt.dmPingAction, onAction: () => this._dhGotoPing(bay, ping) },
            )
        }
    }

    /** Flow bấm nút toast ping: (bay, ping) -> mở bay đó + mở thẳng tab DM với người vừa nhắn */
    async _dhGotoPing(bay, ping) {
        this._pendingOpenDm = { device_id: ping.from_device_id, user_name: ping.from_user_name }
        await this._dhOpenBay(bay)
    }

    /**
     * Flow mở 1 bay: bay -> mesh session live + presence + sync (thay thế lượt mở trước nếu có).
     * Wrapper mỏng quanh _dhOpenBayInner() — chỉ lo _openingBay (overlay "đang tải kênh", xem
     * _comChannelStatus) + bắt lỗi bất kỳ đâu trong đó để KHÔNG kẹt overlay loading vĩnh viễn
     * nếu 1 bước async (mesh/Firestore) ném lỗi giữa chừng — inner giữ nguyên logic seq cũ.
     */
    async _dhOpenBay(bay) {
        this._openingBay = bay
        try {
            await this._dhOpenBayInner(bay)
        } catch (err) {
            console.error('[svc-bay] mở bay thất bại:', err)
            if (this._openingBay === bay) this._openingBay = null
        }
    }

    async _dhOpenBayInner(bay) {
        // [1] CHECK: tăng seq — mọi bước sau đều so lại seq này để phát hiện 1 lượt mở KHÁC đã
        // đè lên (user bấm mở bay khác trong lúc lượt này còn đang xử lý bất đồng bộ)
        const seq = ++this._openSeq
        await this._dhLeaveBay()
        if (seq !== this._openSeq) return // 1 lượt mở khác đã bắt đầu trong lúc đang dọn dẹp

        // [2] PROCESS: nạp dữ liệu cục bộ đã cache (devices/log/sections/promos — products đọc
        // riêng qua Firestore stream, xem svc-bay-sections.js._dcLoad)
        const devices = await loadDevices(bay.id)
        const log     = await history(bay.id)
        const since   = log.length ? Math.max(...log.map(r => r.created_at)) : 0
        const chatSeenFilter = createSeenFilter()
        log.forEach(r => chatSeenFilter.add(r.id))
        const sections = await loadSections(bay.id)

        // Mồi trước bằng dữ liệu cục bộ đã có — tránh 1 PROMO_EVENT/SYNC_RESPONSE cũ tới sau
        // (relay trễ, hoặc echo lại từ chính mình) áp trùng ngay sau khi mở bay.
        const savedPromos = await loadPromos(bay.id)
        const seenPromoCodes = new Set(savedPromos.map(p => p.code))

        // [3] EXECUTE: dựng mesh session + đăng ký handler theo msg.type + broadcast link (cùng
        // thiết bị) + Firestore bay listener (info bay + `peer_id`, KHÔNG còn `signals[]`) — mỗi
        // bước đều so seq trước khi tiếp, huỷ sạch nếu bị đè
        //
        // `_peerId` (KHÁC `_deviceId`) — id ephemeral riêng cho phiên mesh này, sinh mới mỗi lần
        // mở bay, dùng làm identity PeerJS (hub đăng ký đúng id này, spoke dùng làm id riêng của
        // mình khi connect ra hub) — xem tools/mesh.js. `_deviceId` giữ nguyên vai trò cũ
        // (presence/chat/ping addressing), KHÔNG dùng làm PeerJS id (PeerJS's id là 1 registry
        // thật — 2 tab cùng thiết bị cùng đăng ký 1 id sẽ lỗi `unavailable-id`).
        this._peerId = ulid()
        const session = createBaySession(this._peerId, {
            onBinary: (buf, fromId) => this._dhIncomingBinary(buf, fromId),
            onLink:   peerId => {
                // Bất kỳ link nào thiết lập được cũng coi như "đã kết nối lại" — dọn cờ retry +
                // timer hẹn giờ (idempotent nếu vốn đang không retry gì), tắt overlay 'reconnecting'.
                this._meshRetrying = false
                clearTimeout(this._reconnectTimer); this._reconnectTimer = null
                this._dfOnPeerLinked(peerId); this._dfMarkSyncStage(bay.id, 'linked')
            },
            onUnlink: peerId => this._dfOnPeerUnlinked(peerId),
            onTrack:  (peerId, stream) => this._dfOnRemoteTrack(peerId, stream),
        })
        session.on('PRESENCE', (msg, fromId) => { this._dfReceiveDevice(msg.row, fromId); this._dfMarkSyncStage(bay.id, 'presence') })
        session.on('EVENT',    (msg, fromId) => this._dfReceiveRow(msg.row, fromId))
        // BLOB_META tự relay tiếp (star: spoke chỉ có 1 link là hub -> no-op đúng; hub relay cho
        // mọi spoke khác) — cùng lý do relayBinary() ở _dhIncomingBinary bên dưới, xem tools/mesh.js.
        session.on('BLOB_META', (msg, fromId) => { handleBlobMeta(msg, fromId); if (fromId) this._session?.relay(msg, fromId) })
        session.on('BLOB_REQUEST', (msg, fromId) => this._dfHandleBlobRequest(msg, fromId))
        session.on('SECTIONS_UPDATE', (msg, fromId) => this._dfReceiveSections(msg, fromId))
        session.on('SECTION_ITEM_EVENT', (msg, fromId) => this._dfReceiveSectionItem(msg.row, fromId))
        session.on('PROMO_EVENT',  (msg, fromId) => this._dfReceivePromo(msg, fromId))
        session.on('PROMO_DELETE', (msg, fromId) => this._dfReceivePromoDelete(msg, fromId))
        session.on('CALL_OFFER',   (msg, fromId) => this._dhIncomingCallOffer(msg, fromId))
        session.on('CALL_ANSWER',  (msg, fromId) => this._dhIncomingCallAnswer(msg, fromId))
        session.on('CALL_DECLINE', (_msg, fromId) => this._dhCallRejected(fromId, true))
        session.on('CALL_BUSY',    (_msg, fromId) => this._dhCallRejected(fromId, false))
        session.on('CALL_HANGUP',  (_msg, fromId) => this._dhCallHangupReceived(fromId))
        session.on('SYNC_REQUEST',  (msg, fromId) => this._dfEnqueueSyncRequest(msg, fromId))
        session.on('SYNC_RESPONSE', msg => {
            this._dfMarkSyncStage(bay.id, 'syncRoundTrip')
            msg.rows.forEach(row => this._dfReceiveRow(row))
            msg.devices?.forEach(row => this._dfReceiveDevice(row))
            this._dfMarkSyncStage(bay.id, 'chatSettled')
            // Owner luôn là nguồn dữ liệu mới nhất cho sections của chính bay mình — bỏ qua
            // sections trong SYNC_RESPONSE nếu là owner, cùng lý do _dfReceiveSections() ở dưới.
            if (msg.sections && !isOwner(this._activeBay, this._user)) {
                saveSections(msg.bay_id, msg.sections)
                this._sections = msg.sections
                this._sectionsUpdatedAt = msg.sections.reduce((max, s) => Math.max(max, s.updated_at ?? 0), 0)
            }
            if (msg.sectionItems?.length) applyIncomingSectionItems(msg.sectionItems)
            msg.sectionItems?.forEach(p => this._sectionItemVersions.set(p.id, Math.max(this._sectionItemVersions.get(p.id) ?? -1, p.updated_at ?? 0)))
            msg.promos?.forEach(p => {
                if (this._seenPromoCodes.has(p.code)) return
                this._seenPromoCodes.add(p.code)
                applyIncomingPromo(msg.bay_id, p)
            })
            // Chỉ đúng 3 tập này thật sự đổi (A.1 gửi undefined cho bộ không đổi) mới cần bỏ cache
            // snapshot — phòng trường hợp chính thiết bị này sau đó phải trả lời SYNC_REQUEST của
            // 1 peer khác (vd owner join tạm vào hub của tab khác cùng chủ, xem _dhStartMeshRole).
            if (msg.sections || msg.sectionItems?.length || msg.promos?.length) this._dfInvalidateCommerceCache()
            // A.1 gửi undefined cho bộ nào không đổi (xem _dfHandleSyncRequest) — "settled" nghĩa
            // là round-trip này đã xử lý xong phần commerce, dù có dữ liệu mới hay không.
            this._dfMarkSyncStage(bay.id, 'commerceSettled')
        })
        const unsubBroadcast = session.mesh.openBroadcastLink(bay.id)

        if (seq !== this._openSeq) { unsubBroadcast(); session.mesh.closeAll(); return } // bị đè trong lúc đọc dữ liệu cục bộ

        const unsubBay = await listenBay(bay.id, row => this._dhBaySnapshot(row))

        if (seq !== this._openSeq) { unsubBroadcast(); unsubBay(); session.mesh.closeAll(); return }

        //   [3.a] COMMIT: từ đây this._activeBay/this._session chính thức thuộc về lượt mở này
        setBayActiveBay(bay.id)
        setSectionActiveBay(bay.id)
        setPromoActiveBay(bay.id)
        setSectionBroadcastHandler(row => {
            this._sectionItemVersions.set(row.id, row.updated_at ?? 0)
            this._dfInvalidateCommerceCache()
            this._session?.broadcast('SECTION_ITEM_EVENT', { row })
        })
        this._activeBay      = bay
        this._openingBay     = null // commit xong — main content thay thế overlay loading từ đây
        this._devices         = devices
        this._log             = log
        this._syncSince       = since
        this._chatSeenFilter  = chatSeenFilter
        this._sections         = sections
        this._sectionsUpdatedAt = sections.reduce((max, s) => Math.max(max, s.updated_at ?? 0), 0)
        this._sectionItemVersions = new Map() // reset mỗi lần mở bay — sectionItems của từng section chỉ load khi mở svc-admin cho đúng section đó
        this._seenPromoCodes  = seenPromoCodes
        this._peerToDevice    = new Map()
        this._deviceToPeer    = new Map()
        this._session         = session
        this._unsubBroadcast  = unsubBroadcast
        this._unsubBay        = unsubBay

        log.filter(r => r.blob_id).forEach(r => this._dfEnsureBlob(r.blob_id)) // trả lại blobUrls cho đính kèm cũ — cache local trước, không có mới xin lại qua mesh
        if (bay.pics?.startsWith('blob:')) this._dfEnsureBlob(bay.pics.slice(5)) // avatar bay lưu blob local (svc-bay-list.js) — cùng cơ chế pull cache-trước/broadcast-sau

        // Đồng bộ URL để quay lại đúng bay qua link (deep-link) + track "known bay" cho ping nền +
        // đánh dấu ping của chính mình trong bay vừa mở là "đã thấy" (đã sống ở đây rồi, khỏi
        // toast lại qua đường ping xuyên bay) — best-effort, KHÔNG chặn flow mesh bên dưới.
        // Không còn clearPing (xem tools/service.js) — chỉ cần dedupe cục bộ qua _seenPingIds.
        // `window.history` (không phải `history` — tên đó đã là hàm chat history() import từ
        // tools/service.js ở trên).
        window.history.replaceState(null, '', `${location.pathname}?bay=${bay.id}`)
        this._dcTrackKnownBay(bay.id).then(known => this._dcWatchPings(known))
        Object.values(bay.pings?.[this._deviceId] ?? {}).forEach(p => this._seenPingIds.add(p.id))

        if (seq !== this._openSeq) return // bị 1 lượt mở khác giành lại ngay sau khi vừa commit

        //   [3.b] PRESENCE: báo online cho mesh + xác lập vai trò hub/spoke
        await this._dfSendPresence('online')

        if (seq !== this._openSeq) return

        this._dhStartMeshRole() // owner -> startHub() + ghi peer_id; peer khác -> joinHub(bay.peer_id) — fire-and-forget, tự retry qua các trigger khác

        if (seq !== this._openSeq) return

        //   [3.c] START_TIMERS: heartbeat presence + reconcile định kỳ (chat bitmap + hub link)
        this._heartbeatTimer = setInterval(() => this._dfSendPresence('online'), Math.floor(HEARTBEAT_MS / 5))

        // Reconcile định kỳ — bitmap chat (không chỉ lúc mới link, xem _dfOnPeerLinked) VÀ hub
        // link (backstop cho _dfEnsureHubLink, phòng khi mọi trigger phản ứng khác đều lỡ nhịp).
        this._reconcileTimer = setInterval(() => { this._dfReconcileChat(); this._dfReconcileMesh() }, RECONCILE_MS)

        // Fallback progress bar (spec §B): nếu sau INVITE_TIMEOUT_MS vẫn chưa có peer nào (bay cô
        // đơn — chủ hoặc mọi người khác đều offline), không mốc nào phía sau 'linked' còn cơ hội
        // hoàn tất qua peer thật — nhảy thẳng lên 100% để progress bar tự ẩn thay vì treo mãi.
        this._syncGraceTimer = setTimeout(() => {
            if (this._activeBay?.id !== bay.id) return // đã rời/đổi bay khác trong lúc chờ — bỏ
            // Đánh dấu RẢI RÁC (setTimeout riêng từng mốc) thay vì forEach đồng bộ 1 lần — Lit chỉ
            // re-render 1 lần cho dù _syncProgress đổi bao nhiêu lần trong cùng 1 tick, nên forEach
            // đồng bộ trước đây khiến progress bar nhảy thẳng 0% -> 100% (không thấy tăng dần) khi
            // bay không có peer nào (toàn bộ 5 mốc hoàn tất "giả" cùng lúc ở đây).
            // Khoảng cách giữa 2 mốc PHẢI dài hơn thời lượng transition CSS (--sync-pct 1.4s ease,
            // xem styles/svc-bay-list.css) — nếu ngắn hơn, mốc sau tới TRƯỚC khi ring kịp đuổi tới
            // mốc trước, ring cứ mãi "đuổi theo mục tiêu di chuyển" và chỉ nhích được ~1 phần nhỏ
            // mỗi lần, nhìn như bị đứng yên giữa chừng (đúng bug vừa gặp ở mốc 220ms cũ).
            SYNC_STAGES.forEach((stage, i) => {
                setTimeout(() => {
                    if (this._activeBay?.id !== bay.id) return
                    this._dfMarkSyncStage(bay.id, stage)
                }, i * 1500)
            })
        }, INVITE_TIMEOUT_MS)
    }

    /**
     * Flow cập nhật % đồng bộ (spec §B): bayId, tên mốc -> _syncProgress[bayId] tăng dần, tự ẩn
     * ~1s sau khi chạm 100%. Idempotent — gọi lại cùng mốc nhiều lần (vd nhiều SYNC_RESPONSE từ
     * nhiều peer khác nhau) không cộng dồn quá 100%.
     */
    _dfMarkSyncStage(bayId, stage) {
        if (!bayId) return
        if (bayId !== this._activeBay?.id) return // bay đã rời/đổi trong lúc chờ event trễ — bỏ, khỏi hồi sinh progress bay cũ
        const before = this._syncStages[bayId] ?? new Set()
        const after  = markStageDone(before, stage)
        if (after === before) return // đã đánh dấu mốc này rồi — khỏi trigger re-render thừa
        this._syncStages = { ...this._syncStages, [bayId]: after }
        const pct = progressPercent(after)
        this._syncProgress = { ...this._syncProgress, [bayId]: pct }
        if (pct >= 100) {
            // _syncSettled KHÔNG bị timer dưới đây dọn theo — _comChannelStatus đọc cờ này để biết
            // "đã từng đồng bộ xong" một cách VĨNH VIỄN (tới khi rời bay), khác _syncProgress chỉ
            // sống ~1s sau khi chạm 100% (dùng cho progress ring ở svc-bay-list, đúng ý muốn TRANSIENT
            // ở đó). Trước đây _comChannelStatus lỡ đọc thẳng _syncProgress nên đúng 1s sau khi tưởng
            // đã xong, overlay "Đang tải kênh…" tự BẬT LẠI vì entry đó vừa bị xoá (bay không có
            // section nào để tự bypass qua nhánh sections.length).
            this._syncSettled.add(bayId)
            clearTimeout(this._syncProgressHideTimers[bayId])
            this._syncProgressHideTimers = {
                ...this._syncProgressHideTimers,
                [bayId]: setTimeout(() => {
                    const { [bayId]: _drop, ...rest } = this._syncProgress
                    this._syncProgress = rest
                }, 1000),
            }
        }
    }

    /**
     * Flow rời bay hiện tại: (none) -> mesh đóng + presence offline + state reset sạch
     */
    async _dhLeaveBay() {
        // [1] CHECK: dọn timer + invite đang chờ + adapter active-bay trước tiên (idempotent —
        // vô hại nếu gọi khi chưa mở bay nào)
        //   [1.a] SYNC_PROGRESS: dọn progress của bay đang rời TRƯỚC khi this._activeBay bị null
        //   ở dưới (finally) — tránh bay khác lỡ hiển thị progress bar của bay cũ
        if (this._activeBay) {
            const leavingId = this._activeBay.id
            clearTimeout(this._syncGraceTimer); this._syncGraceTimer = null
            clearTimeout(this._syncProgressHideTimers[leavingId])
            const { [leavingId]: _dropHideTimer, ...restHideTimers } = this._syncProgressHideTimers
            this._syncProgressHideTimers = restHideTimers
            const { [leavingId]: _dropProgress, ...restProgress } = this._syncProgress
            this._syncProgress = restProgress
            const { [leavingId]: _dropStages, ...restStages } = this._syncStages
            this._syncStages = restStages
            this._syncSettled.delete(leavingId)
        }
        clearInterval(this._heartbeatTimer); this._heartbeatTimer = null
        clearInterval(this._reconcileTimer); this._reconcileTimer = null
        clearTimeout(this._reconnectTimer); this._reconnectTimer = null
        this._meshRetrying = false // rời bay — khỏi để overlay 'reconnecting' của bay cũ lỡ hồi sinh khi mở bay mới
        setBayActiveBay(null)
        setSectionActiveBay(null)
        setPromoActiveBay(null)

        // [3] EXECUTE: báo peer đang gọi (nếu có) là cuộc gọi kết thúc — khác _handleUnload (đóng
        // tab), ở đây phòng đổi bay nhưng tab vẫn sống, phải báo chủ động không thì họ kẹt lại
        // màn ringing/active vô thời hạn
        if (this._callState !== 'idle') {
            this._session?.send(this._callPeerId, 'CALL_HANGUP', {})
            this._dhResetCall()
        }

        //   [3.a] SEND_PRESENCE: báo offline cho peer còn lại trước khi đóng mesh + dọn `peer_id`
        //   trên Firestore nếu chính mình đang là hub (best-effort — spoke tự dò lại hub mới qua
        //   _dhBaySnapshot/_dfReconcileMesh nếu lượt dọn này lỡ mất, xem tools/service.js)
        //   [3.b] HANDLE_ERR: gửi lỗi (network/Firestore) — vẫn phải dọn sạch state ở finally,
        //   không để lỗi presence chặn mất việc reset
        try {
            if (this._activeBay && this._session) await this._dfSendPresence('offline')
            if (this._isHub && this._activeBay) await clearHubPeerId(this._activeBay.id)
        } catch (err) {
            console.error('[svc-bay] gửi presence offline / dọn peer_id thất bại:', err)
        } finally {
            //   [3.c] CLEANUP: huỷ mọi listener/mesh + reset toàn bộ state về trạng thái "chưa mở bay"
            this._unsubBroadcast?.(); this._unsubBroadcast = null
            this._unsubBay?.();       this._unsubBay = null
            this._session?.mesh.closeAll(); this._session = null
            window.history.replaceState(null, '', location.pathname)

            this._activeBay = null; this._devices = []
            this._isHub = false; this._peerToDevice = new Map(); this._deviceToPeer = new Map()
            this._log = []; this._chatSeenFilter = createSeenFilter(); this._syncSince = 0
            this._sections = []; this._sectionsUpdatedAt = 0
            this._sectionItemVersions = new Map()
            this._seenPromoCodes = new Set()
            this._commerceCache = null
            this._syncResponseQueue = [] // bỏ hết request đang chờ của bay vừa rời — khỏi trả lời trễ sang bay mới
            Object.values(this._blobUrls).forEach(url => URL.revokeObjectURL(url))
            this._blobUrls = {}
        }
    }

    /**
     * Flow gửi presence: status ('online'|'offline') -> broadcast PRESENCE cho mesh
     */
    async _dfSendPresence(status) {
        // [2] PROCESS: dựng presence row cho chính mình
        const forBay     = this._activeBay
        const forSession = this._session
        const row = makePresence(forBay.id, this._deviceId, this._user, status)

        // [3] EXECUTE: ghi IndexedDB trước, chỉ merge+broadcast nếu bay/session còn nguyên (không đổi trong lúc ghi)
        await applyPresence(row)
        if (this._activeBay !== forBay || this._session !== forSession) return
        this._dfMergeDevice(row)
        forSession.broadcast('PRESENCE', { row })
    }

    /**
     * Flow nhận presence từ peer: row (P2P) -> _devices cập nhật + relay tiếp
     */
    async _dfReceiveDevice(row, fromId) {
        // [1] CHECK: ghi IndexedDB trước bất kể bay nào (cache dùng chung mọi bay), rồi mới lọc
        // đúng bay đang mở + dedupe/giữ bản mới nhất qua _dfMergeDevice
        await applyPresence(row)
        if (!this._activeBay || row.bay_id !== this._activeBay.id) return
        if (!this._dfMergeDevice(row)) return

        // (hub only) học transportId (fromId, dưới star luôn là peerId THẬT của spoke gửi trực
        // tiếp — không có multi-hop vì mọi spoke chỉ link ra đúng 1 hub) -> device_id — miễn phí,
        // dùng cho _comOnlineDevices/_comConnectingCount giữ granularity cũ trên hub.
        if (fromId && this._isHub) { this._peerToDevice.set(fromId, row.device_id); this._deviceToPeer.set(row.device_id, fromId) }

        // [3] EXECUTE: relay tiếp cho peer khác (chỉ hub relay có ý nghĩa — spoke chỉ có 1 link
        // nên relay() là no-op đúng, xem tools/mesh.js) + thử join/backstop hub, khỏi đợi tick định kỳ
        if (fromId) this._session?.relay({ type: 'PRESENCE', row }, fromId)
        if (!this._isHub) this._dfEnsureHubLink()
    }

    _dfMergeDevice(row) {
        const existing = this._devices.find(r => r.device_id === row.device_id)
        if (existing && existing.last_seen_at > row.last_seen_at) return false
        this._devices = [...this._devices.filter(r => r.device_id !== row.device_id), row]
        return true
    }

    /**
     * Trạng thái tổng hợp overlay "đang tải/đồng bộ kênh" (render() đọc ĐÚNG 1 lần, gộp thay 2
     * getter rời trước đây _comChannelLoading + _comChannelSyncing — cả 2 cùng trả lời 1 câu hỏi
     * UX duy nhất: "user tương tác được (xem sections/chat) chưa, và nếu chưa thì vì sao". Trả về:
     *   null            -> đã sẵn sàng, ẩn overlay
     *   'loading'       -> chưa có _activeBay (đang chờ deep link/đang mở), HOẶC đã commit nhưng
     *                      lần connect ĐẦU TIÊN còn đang chạy, chưa có gì để xem và chưa fail lần nào
     *   'reconnecting'  -> ít nhất 1 lượt join hub vừa timeout/thất bại, mesh đang tự retry (xem
     *                      _dfEnsureHubLink/_dfScheduleReconnect) — khác 'loading' ở chỗ đây là
     *                      ĐANG SỬA LỖI kết nối, không phải chờ lần đầu
     * render() tự chọn khung DOM phù hợp theo `!!this._activeBay` (thay hẳn placeholder trước khi
     * có bay, hay phủ overlay lên nội dung đã mount) — status ở đây không quan tâm khung nào.
     */
    get _comChannelStatus() {
        if (this._deepLinkPending || this._openingBay) return 'loading'
        if (!this._activeBay) return null
        // Đã có gì để xem (sections cục bộ, HOẶC đã từng chạm 100% ít nhất 1 lần — kể cả do
        // _syncGraceTimer fallback khi bay cô đơn) -> ẩn overlay LUÔN, dù _meshRetrying vẫn true.
        // Mesh cứ tiếp tục tự nối lại hub ở background (_dfEnsureHubLink/_dfScheduleReconnect),
        // không cần chặn UI nữa — TRƯỚC ĐÂY check _meshRetrying ở nhánh ưu tiên cao nhất khiến
        // overlay "Mất kết nối, đang thử lại…" kẹt vĩnh viễn mỗi khi không join được hub (vd owner
        // offline lâu), dù nội dung đã tải/đồng bộ xong từ lâu.
        //
        // Đọc `_syncSettled` (Set, KHÔNG bị dọn) — KHÔNG phải `_syncProgress[bayId] >= 100`:
        // _syncProgress chỉ TRANSIENT (tự bị xoá key ~1s sau khi chạm 100%, xem hide-timer ở
        // _dfMarkSyncStage — đúng ý muốn cho progress ring bên svc-bay-list). Bay không có section
        // nào (case bay mới tạo/cô đơn) hoàn toàn dựa vào cờ 100% này để tắt overlay — đọc thẳng
        // _syncProgress khiến overlay tự BẬT LẠI đúng 1s sau khi tưởng đã xong, vì entry vừa bị xoá.
        if (this._sections.length || this._syncSettled.has(this._activeBay.id)) return null
        return this._meshRetrying ? 'reconnecting' : 'loading'
    }

    /**
     * Id bay nên hiện highlight + progress ring trong <svc-bay-list> (props syncBayId/
     * syncProgress/activeBay ở render()) — thống nhất theo ĐÚNG 1 nguồn thay vì chỉ đọc
     * _activeBay?.id như trước (khoảng thời gian từ lúc click/deep-link tới lúc commit,
     * _activeBay đã bị _dhLeaveBay() null hoá, item trong list mất hẳn highlight dù user
     * vừa chọn đúng kênh đó và mesh đang âm thầm kết nối). Ưu tiên: đã commit > đang mở
     * (_openingBay, gồm cả click lẫn deep link sau khi findById xong) > vừa đọc được id
     * thô từ URL (đang chờ findById).
     */
    get _comSyncListBayId() {
        return this._activeBay?.id || this._openingBay?.id || (this._deepLinkPending ? this._deepLinkBayId : '') || ''
    }

    // Object tối thiểu {id} cho prop `activeBay` của <svc-bay-list> khi bay đích CHƯA commit —
    // list chỉ so `activeBay?.id === bay.id` (xem _rfItem) nên không cần đủ field thật.
    get _comSyncListBay() {
        return this._activeBay || this._openingBay
            || (this._deepLinkPending && this._deepLinkBayId ? { id: this._deepLinkBayId } : null)
    }

    /**
     * % hiện trên progress ring của item — dùng số thật từ _syncProgress (mốc mesh, xem
     * tools/syncProgress.js) ngay khi có; TRƯỚC đó (đang đọc dữ liệu cục bộ/chờ findById,
     * mesh chưa kịp phát mốc 'linked' đầu tiên) trả về 1 mốc nhỏ cố định để ring hiện ngay
     * từ lúc click/deep-link thay vì đứng yên ở "chưa có gì" (dễ nhầm với kênh khác chưa mở).
     */
    get _comSyncListProgress() {
        const id = this._comSyncListBayId
        if (!id) return 0
        const real = this._syncProgress[id]
        if (real !== undefined) return real
        // Không còn record trong _syncProgress mà id đã LÀ _activeBay (đã commit) nghĩa là đã tự
        // dọn sau khi chạm 100% (hide timer, xem _dfMarkSyncStage) — KHÔNG phải chưa bắt đầu, phải
        // trả 0 (ẩn ring) chứ không phải placeholder, tránh ring hồi sinh lại ở mốc nhỏ sau khi đã
        // tải xong. Placeholder 3 chỉ áp dụng lúc CHƯA commit (đang mở/deep-link).
        return id === this._activeBay?.id ? 0 : 3
    }

    // chc-online phải phản ánh đúng "đang chat được với nhau". Hub giữ granularity cũ (đã học
    // device_id thật của từng spoke qua _peerToDevice, xem _dfReceiveDevice); spoke dưới star chỉ
    // có ĐÚNG 1 link (hub) nên thu về tín hiệu nhị phân "hub reachable hay không" — phản ánh đúng
    // những gì star topology cho biết, không phải bug (xem docs kế hoạch: buyer-buyer trực tiếp
    // không còn granularity riêng, chỉ còn biết "đang online qua hub" hay không).
    get _comOnlineDevices() {
        const linked = this._session?.mesh.linkedPeers() ?? []
        if (this._isHub) {
            const linkedDeviceIds = new Set(linked.map(id => this._peerToDevice.get(id)).filter(Boolean))
            return onlinePeers(this._devices).filter(d => d.device_id === this._deviceId || linkedDeviceIds.has(d.device_id))
        }
        const hubUp = linked.length > 0
        return onlinePeers(this._devices).filter(d => d.device_id === this._deviceId || hubUp)
    }

    // Peer khác đang online (theo presence) nhưng CHƯA reachable qua mesh (hub đang bắt tay
    // WebRTC/ICE với họ, hoặc chính mình — nếu là spoke — vẫn đang nối vào hub) — truyền xuống
    // <svc-chat connectingCount> để hiện chữ "Đang kết nối…".
    get _comConnectingCount() {
        const linked = this._session?.mesh.linkedPeers() ?? []
        if (this._isHub) {
            const linkedDeviceIds = new Set(linked.map(id => this._peerToDevice.get(id)).filter(Boolean))
            return onlinePeers(this._devices).filter(d => d.device_id !== this._deviceId && !linkedDeviceIds.has(d.device_id)).length
        }
        if (linked.length > 0) return 0 // đã reachable qua hub -> hub tự biết rõ ai đang link, không cần đoán thêm ở đây
        return onlinePeers(this._devices).filter(d => d.device_id !== this._deviceId).length
    }

    // Hash 3 tập dữ liệu còn sync qua mesh (A.1) — gửi kèm SYNC_REQUEST để bên trả lời biết bộ
    // nào đã trùng, khỏi phải gửi lại nguyên. products KHÔNG còn nằm trong bộ này nữa — lưu
    // Firestore thật (xem tools/bayAdapter.js), tự có onSnapshot real-time riêng, không qua mesh.
    // _sectionItemVersions cố ý reset rỗng mỗi lần mở bay (sectionItems chỉ load lazy khi mở
    // svc-admin cho đúng section đó, xem comment cạnh `this._sectionItemVersions = new Map()`
    // trong _dhOpenBay), nên hash sectionItems ở lần SYNC_REQUEST ĐẦU TIÊN sau khi mở bay sẽ luôn
    // là "rỗng" và không khớp — chấp nhận được (chỉ tốn 1 lần resend thừa, tự khớp lại ngay sau
    // khi SYNC_RESPONSE đầu tiên populate lại Map này), không phải bug, không cố sửa bằng cách
    // load sớm (sẽ mâu thuẫn với lazy-load design hiện có).
    // Promo hash chỉ theo `code` (không theo `used`) vì `used` là bộ đếm CỤC BỘ mỗi thiết bị
    // (applyIncomingPromoUse chưa có message P2P nào broadcast nó — xem bayPromoAdapter.js),
    // đưa `used` vào hash sẽ khiến 2 phía không bao giờ khớp.
    _comCommerceHashes() {
        return {
            sections:     hashRows(this._sections),
            sectionItems: hashRows([...this._sectionItemVersions].map(([id, updated_at]) => ({ id, updated_at }))),
            promos:       hashRows([...this._seenPromoCodes], code => code, () => 0),
            // Devices KHÔNG nằm trong _dfCommerceSnapshot (đổi liên tục qua heartbeat, cache sẽ vô
            // dụng) — hash trực tiếp từ this._devices (đã có sẵn trong RAM, rẻ) để cùng cơ chế
            // hash-gate A.1 áp được luôn cho devices, xem _dfHandleSyncRequest.
            devices:      hashRows(this._devices, d => d.device_id, d => d.last_seen_at),
        }
    }

    // Bỏ cache khi bất kỳ tập commerce nào (sections/sectionItems/promos) vừa ghi mới — gọi ở MỌI
    // nơi ghi (owner tự đổi, hoặc nhận bản mới hơn từ peer). _dfCommerceSnapshot() sẽ tự đọc lại +
    // hash lại ĐÚNG 1 lần cho lượt SYNC_REQUEST kế tiếp, dùng chung cho phần còn lại của storm
    // (không đổi gì thêm) — xem báo cáo load-test connection-storm.
    _dfInvalidateCommerceCache() { this._commerceCache = null }

    /**
     * Flow snapshot commerce cho SYNC_RESPONSE: (none) -> { sections, sectionItems, promos,
     * hashes } — cache tới lần _dfInvalidateCommerceCache() kế tiếp, xem field khai báo ở
     * constructor.
     */
    async _dfCommerceSnapshot() {
        if (this._commerceCache) return this._commerceCache
        const forBay = this._activeBay
        const [sections, sectionItems, promos] = await Promise.all([
            loadSections(forBay.id), loadSectionItems(forBay.id), loadPromos(forBay.id),
        ])
        const snapshot = {
            sections, sectionItems, promos,
            hashes: {
                sections:     hashRows(sections),
                sectionItems: hashRows(sectionItems),
                promos:       hashRows(promos, r => r.code, () => 0),
            },
        }
        if (this._activeBay === forBay) this._commerceCache = snapshot // bay đổi trong lúc await -> đừng cache nhầm sang bay khác
        return snapshot
    }

    // ── Commerce (sections/sectionItems — products qua Firestore, xem tools/bayAdapter.js) ───

    /**
     * Flow owner đổi layout sections: sections[] (svc-bay-sections.js) -> ghi DB + broadcast
     */
    async _dhSectionsChange(sections) {
        // [1] CHECK: phải đang mở 1 bay
        if (!this._activeBay) return
        const forBay     = this._activeBay
        const forSession = this._session

        // [2] PROCESS: build rows — stamp updated_at CHUNG cho cả danh sách (đơn giản hoá dedupe
        // ở _dfReceiveSections) trong 1 field riêng của constructor, KHÔNG suy ra từ
        // this._sections mỗi lần đọc (xoá hết section sẽ làm mảng rỗng "quên" mốc updated_at cũ)
        const updated_at = Date.now()
        const rows = sections.map(s => ({
            ...makeSectionRow(forBay.id, {
                id: s.id, sectionType: s.sectionType, configKey: s.configKey, index: s.index, createdAt: s.created_at,
            }),
            updated_at,
        }))

        // [3] EXECUTE: ghi DB, chỉ commit state + broadcast nếu bay/session còn nguyên
        await saveSections(forBay.id, rows)
        if (this._activeBay !== forBay || this._session !== forSession) return // bay đổi trong lúc đang ghi — bỏ
        this._sections = rows
        this._sectionsUpdatedAt = updated_at
        this._dfInvalidateCommerceCache()
        forSession?.broadcast('SECTIONS_UPDATE', { bay_id: forBay.id, sections: rows, updated_at })
    }

    /**
     * Flow nhận SECTIONS_UPDATE từ peer: msg -> áp bản mới hơn (non-owner) + relay tiếp
     */
    async _dfReceiveSections(msg, fromId) {
        // [1] CHECK: đúng bay đang mở + KHÔNG phải owner (owner luôn là nguồn dữ liệu mới nhất
        // cho sections của chính bay mình — không nhận ngược lại từ peer khác dù đúng bay, tránh
        // owner vừa đổi style, 1 peer khác còn cache style cũ gửi SECTIONS_UPDATE đè lại) + là
        // bản mới hơn bản đã áp
        if (!this._activeBay || msg.bay_id !== this._activeBay.id) return
        if (isOwner(this._activeBay, this._user)) return
        if (this._sectionsUpdatedAt >= msg.updated_at) return // đã có bản mới hơn hoặc bằng — bỏ qua
        const forBay     = this._activeBay
        const forSession = this._session

        // [3] EXECUTE: ghi DB, chỉ commit state + relay tiếp nếu bay/session còn nguyên
        await saveSections(msg.bay_id, msg.sections)
        if (this._activeBay !== forBay || this._session !== forSession) return // bay đổi trong lúc đang ghi — bỏ
        this._sections = msg.sections
        this._sectionsUpdatedAt = msg.updated_at
        this._dfInvalidateCommerceCache()
        if (fromId) this._session?.relay({ type: 'SECTIONS_UPDATE', bay_id: msg.bay_id, sections: msg.sections, updated_at: msg.updated_at }, fromId)
    }

    /**
     * Flow nhận sectionItem đã version hoá: row -> apply + relay
     */
    async _dfReceiveSectionItem(row, fromId) {
        // [1] CHECK: đúng bay đang mở + row mới hơn bản đã thấy (dedupe theo version, không phải id)
        if (!this._activeBay || row.bay_id !== this._activeBay.id) return
        const seenVersion = this._sectionItemVersions.get(row.id) ?? -1
        if (seenVersion >= (row.updated_at ?? 0)) return // đã có bản này hoặc mới hơn — không relay lại
        this._sectionItemVersions.set(row.id, row.updated_at ?? 0)
        await applyIncomingSectionItems([row])
        this._dfInvalidateCommerceCache()
        if (fromId) this._session?.relay({ type: 'SECTION_ITEM_EVENT', row }, fromId)
    }

    // ── Promo ─────────────────────────────────────────────────────────────────

    // Dùng chung bởi _dhPromoCreate/_dhPromoDelete — cả 2 chỉ khác message type + payload.
    // Owner-side đã tự ghi local rồi qua promosStore (svc-cart → bayPromoAdapter.js, xem
    // svc-bay-sections.js._promosStore), ở đây chỉ lo phát cho các peer khác trong bay hiện tại.
    _broadcastPromo(type, payload) {
        if (!this._activeBay || !this._session) return
        this._session.broadcast(type, { bay_id: this._activeBay.id, ...payload })
    }

    // Owner tạo mã mới qua <svc-pay-promo> (bên trong svc-bay-sections.js → svc-cart) — event
    // bubbles+composed thẳng lên đây, KHÔNG cần svc-bay-sections.js tự forward.
    _dhPromoCreate(promo) {
        if (!this._activeBay) return
        this._seenPromoCodes.add(promo.code) // khỏi tự áp lại nếu vòng relay quay về chính mình
        this._dfInvalidateCommerceCache()
        this._broadcastPromo('PROMO_EVENT', { promo })
        this._giftRainKey++ // owner thấy hiệu ứng ngay, không đợi vòng broadcast
    }

    // Owner tạo voucher riêng qua <svc-promo> bên trong <svc-chat> (tab DM) — persist cục bộ
    // TRƯỚC (bayPromoAdapter chưa có store riêng cho svc-chat), rồi tái dùng _dhPromoCreate() có
    // sẵn để dedupe + broadcast P2P + gift rain, giống hệt đường đi
    // svc-bay-sections.js._promosStore.add() cho mã tạo trong sections.
    async _dhChatPromoCreate(promo) {
        const forBay = this._activeBay
        if (!forBay) return
        await applyIncomingPromo(forBay.id, promo)
        if (this._activeBay !== forBay) return // đổi bay trong lúc đang ghi — bỏ, không phát vào bay khác
        this._dhPromoCreate(promo)
    }

    // Owner xoá mã qua <svc-promo> — cùng đường bubble như _dhPromoCreate.
    _dhPromoDelete(code) {
        this._seenPromoCodes.delete(code) // giữ khớp với DB thật — khỏi làm hash promo (A.1) lệch vĩnh viễn sau khi xoá
        this._dfInvalidateCommerceCache()
        this._broadcastPromo('PROMO_DELETE', { code })
    }

    async _dfReceivePromo(msg, fromId) {
        if (!this._activeBay || msg.bay_id !== this._activeBay.id) return
        if (this._seenPromoCodes.has(msg.promo.code)) return // đã có — khỏi áp/relay lại
        this._seenPromoCodes.add(msg.promo.code)
        await applyIncomingPromo(msg.bay_id, msg.promo)
        this._dfInvalidateCommerceCache()
        if (fromId) this._session?.relay({ type: 'PROMO_EVENT', bay_id: msg.bay_id, promo: msg.promo }, fromId)
        this._giftRainKey++ // peer khác vừa nhận mã owner tạo — cũng thấy hiệu ứng
    }

    // Xoá là idempotent (xoá mã không tồn tại = no-op) nên không cần dedupe set riêng như
    // create — cứ áp + relay, applyIncomingPromoRemove() tự no-op nếu đã xoá rồi.
    async _dfReceivePromoDelete(msg, fromId) {
        if (!this._activeBay || msg.bay_id !== this._activeBay.id) return
        await applyIncomingPromoRemove(msg.bay_id, msg.code)
        this._seenPromoCodes.delete(msg.code) // giữ khớp với DB thật — khỏi làm hash promo (A.1) lệch vĩnh viễn sau khi xoá
        this._dfInvalidateCommerceCache()
        if (fromId) this._session?.relay({ type: 'PROMO_DELETE', bay_id: msg.bay_id, code: msg.code }, fromId)
    }

    // ── Call (audio/video 1:1, renegotiation trên RTCPeerConnection đã link) ──

    // <svc-chat> chọn người gọi bằng device_id (danh sách online của nó luôn keyed theo
    // device_id, xem _comOnlineDevices) — nhưng mesh.hasLink/send/getConnection cần TRANSPORT
    // peerId (khác device_id dưới star, xem _peerId ở _dhOpenBay). Resolve ở đây, 1 chỗ duy
    // nhất: hub tra ngược qua _deviceToPeer (học từ mọi spoke đang link); spoke chỉ có ĐÚNG 1
    // link thật (hub) nên chỉ gọi được nếu deviceId đúng là chủ bay — gọi 1 buyer khác (không
    // link trực tiếp dưới star) trả về null, _dhStartCall no-op sạch thay vì gọi nhầm/gọi hub.
    _dfResolveTransportId(deviceId) {
        if (this._isHub) return this._deviceToPeer.get(deviceId) ?? null
        const isOwnerDevice = this._devices.find(d => d.device_id === deviceId)?.user_id === this._activeBay?.owner_id
        return isOwnerDevice ? (this._activeBay?.peer_id ?? null) : null
    }

    /**
     * Flow bắt đầu gọi: deviceId (từ <svc-chat>) -> CALL_OFFER gửi tới peer qua transport id thật
     */
    async _dhStartCall(deviceId, peerName) {
        // [1] CHECK: resolve được transport id + đang rảnh (idle) + đã link mesh với đúng peer này
        const peerId = this._dfResolveTransportId(deviceId)
        if (!peerId || this._callState !== 'idle' || !this._session?.mesh.hasLink(peerId)) return
        const pc = this._session.mesh.getConnection(peerId)
        if (!pc) return
        const forSession = this._session

        // [3] EXECUTE: xin quyền mic/camera TRƯỚC khi đổi _callState — nếu lỗi, không bao giờ
        // hiện màn hình cuộc gọi cả (set 'ringing-out' rồi mới xin quyền sẽ làm màn hình lóe lên
        // rồi tắt ngay khi getUserMedia fail — khó hiểu với người dùng, xem _dhShowCallError)
        //   [3.a] HANDLE_ERR: không xin được quyền — báo lỗi, dừng, không đổi state
        let stream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        } catch (err) {
            console.error('[svc-bay] không lấy được mic/camera:', err)
            this._dhShowCallError(err)
            return
        }
        //   [3.b] IF_STALE: bay/session đã đổi hoặc đã có cuộc gọi khác bắt đầu trong lúc xin quyền — dừng ngay
        if (this._session !== forSession || this._callState !== 'idle') { stream.getTracks().forEach(t => t.stop()); return }
        //   [3.c] SEND: commit state 'ringing-out' + tạo offer SDP + gửi CALL_OFFER
        this._callPeerId = peerId
        this._callPeerName = peerName
        this._callState = 'ringing-out'
        this._callLocalStream = stream
        const offer = await startCall(pc, this._callLocalStream)
        this._session?.send(peerId, 'CALL_OFFER', { sdp: offer, fromName: this._user.display_name || this._user.email })
    }

    _dhIncomingCallOffer(msg, fromId) {
        if (this._callDeclinedBy.includes(fromId)) {
            this._callDeclinedBy = this._callDeclinedBy.filter(id => id !== fromId)
        }
        if (this._callState !== 'idle') {
            this._session?.send(fromId, 'CALL_BUSY', {})
            return
        }
        this._callPeerId = fromId
        this._callPeerName = msg.fromName || this._txt.caller
        this._callIncomingOffer = msg.sdp
        this._callState = 'ringing-in'
    }

    /**
     * Flow nhận cuộc gọi: (bấm Nhận) -> CALL_ANSWER gửi tới peer, state 'active'
     */
    async _dhAcceptCall() {
        // [1] CHECK: đang thật sự ở trạng thái chờ nhận (ringing-in) + còn kết nối mesh với peer đó
        if (this._callState !== 'ringing-in') return
        const forSession = this._session
        const forPeerId = this._callPeerId
        const offerSdp = this._callIncomingOffer
        const pc = forSession?.mesh.getConnection(forPeerId)
        if (!pc) { this._dhResetCall(); return }

        // [3] EXECUTE: xin quyền mic/camera trước khi tạo answer
        //   [3.a] HANDLE_ERR: không xin được quyền — báo lỗi, chủ động từ chối cuộc gọi thay vì
        //   để peer bên kia treo chờ vô thời hạn
        let stream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        } catch (err) {
            console.error('[svc-bay] không lấy được mic/camera:', err)
            this._dhShowCallError(err)
            this._session?.send(this._callPeerId, 'CALL_DECLINE', {})
            this._dhResetCall()
            return
        }
        //   [3.b] IF_STALE: bay/session/cuộc gọi đã đổi trong lúc xin quyền — dừng ngay
        if (this._session !== forSession || this._callState !== 'ringing-in' || this._callPeerId !== forPeerId) { stream.getTracks().forEach(t => t.stop()); return }
        //   [3.c] SEND: tạo answer SDP + gửi CALL_ANSWER + chuyển state 'active'
        this._callLocalStream = stream
        const answer = await answerCall(pc, offerSdp, this._callLocalStream)
        forSession?.send(forPeerId, 'CALL_ANSWER', { sdp: answer })
        this._callState = 'active' // remote stream sẽ tới qua _dfOnRemoteTrack ngay sau đó, UI hiện placeholder cho tới lúc đó
    }

    _dhDeclineCall() {
        if (this._callState !== 'ringing-in') return
        this._session?.send(this._callPeerId, 'CALL_DECLINE', {})
        this._dhResetCall()
    }

    async _dhIncomingCallAnswer(msg, fromId) {
        if (this._callState !== 'ringing-out' || fromId !== this._callPeerId) return
        const pc = this._session?.mesh.getConnection(fromId)
        if (!pc) { this._dhResetCall(); return }
        await completeCall(pc, msg.sdp)
        this._callState = 'active' // remote stream tới qua _dfOnRemoteTrack
    }

    _dhCallRejected(fromId, wasDeclined) {
        if (fromId !== this._callPeerId) return
        if (wasDeclined && !this._callDeclinedBy.includes(fromId)) {
            this._callDeclinedBy = [...this._callDeclinedBy, fromId]
        }
        this._dhResetCall()
    }

    _dhCallHangupReceived(fromId) {
        if (fromId !== this._callPeerId) return
        const pc = this._session?.mesh.getConnection(fromId)
        if (pc) endCall(pc, this._callLocalStream)
        this._dhResetCall()
    }

    _dhHangupCall() {
        if (this._callState === 'idle') return
        const pc = this._session?.mesh.getConnection(this._callPeerId)
        if (pc) endCall(pc, this._callLocalStream)
        this._session?.send(this._callPeerId, 'CALL_HANGUP', {})
        this._dhResetCall()
    }

    _dhResetCall() {
        this._callLocalStream?.getTracks().forEach(t => t.stop())
        this._callState = 'idle'
        this._callPeerId = ''
        this._callPeerName = ''
        this._callLocalStream = null
        this._callRemoteStream = null
        this._callIncomingOffer = null
    }

    _dfOnRemoteTrack(peerId, stream) {
        if (peerId !== this._callPeerId) return // track từ peer khác bay/call hiện tại — bỏ (không xảy ra trong flow 1:1 nhưng chặn cho chắc)
        this._callRemoteStream = stream
        this._callState = 'active'
    }

    // Thông báo lỗi getUserMedia cho người dùng thấy — dùng web-toast có sẵn trong app (window
    // event toàn cục, tự ẩn sau vài giây) thay vì tự quản lý state/timer riêng.
    _dhShowCallError(err) {
        const t = this._txt
        const messages = {
            NotFoundError: t.errNoDevice, NotAllowedError: t.errDenied, PermissionDeniedError: t.errDenied,
            NotReadableError: t.errBusy, OverconstrainedError: t.errConstraints,
        }
        const message = messages[err?.name] || t.errUnknown(err?.name || err?.message || '?')
        toastEmit(message, 'error')
    }

    // ── Chat ──────────────────────────────────────────────────────────────────

    /**
     * Flow gửi tin nhắn text: content -> IndexedDB + broadcast EVENT
     */
    async _dhSend(content, toDeviceId = null) {
        // [1] CHECK: có nội dung + đang mở 1 bay
        if (!content || !this._activeBay) return
        const forBay     = this._activeBay
        const forSession = this._session

        // [3] EXECUTE: ghi IndexedDB trước, chỉ merge state + broadcast nếu bay/session còn nguyên
        const row = await sendMessage(forBay.id, this._deviceId, this._user, content, toDeviceId)
        if (this._activeBay !== forBay || this._session !== forSession) return // đổi bay trong lúc đang ghi tin nhắn — bỏ
        this._dfMergeRow(row)
        forSession?.broadcast('EVENT', { row })
        if (toDeviceId) this._dfPingIfOffline(toDeviceId)
    }

    /** Flow ping xuyên bay khi cần: toDeviceId -> writePing() NẾU peer đó KHÔNG online theo
     *  presence (đã tự relay qua hub nếu cần dưới star, xem _dfReceiveDevice) — dùng presence
     *  (device_id) thay vì mesh.linkedPeers() (transport peerId, khác device_id dưới star, xem
     *  _peerId ở _dhOpenBay): 1 spoke không bao giờ có link TRỰC TIẾP tới spoke khác, nhưng tin
     *  vẫn tới được qua hub relay — presence online là tín hiệu "sẽ nhận qua P2P" đúng cho cả
     *  hub lẫn spoke, còn check theo direct-link sẽ luôn coi mọi spoke khác là offline -> ping
     *  thừa mỗi lần DM, phản tác dụng với chính mục tiêu giảm write Firestore. */
    _dfPingIfOffline(toDeviceId) {
        if (!this._activeBay || !this._session) return
        if (onlinePeers(this._devices).some(d => d.device_id === toDeviceId)) return
        writePing(this._activeBay.id, toDeviceId, this._deviceId, this._user).catch(err => console.error('[svc-bay] writePing lỗi:', err))
    }

    /**
     * Flow gửi đính kèm: file -> IndexedDB + broadcast EVENT + gửi blob qua mesh
     */
    async _dhAttach(file, duration, toDeviceId = null) {
        // [1] CHECK: đang mở 1 bay + có session mesh
        if (!this._activeBay || !this._session) return
        const forBay     = this._activeBay
        const forSession = this._session
        const blobId = ulid()

        // [2] PROCESS: dựng message row trỏ tới blob_id (chưa kèm nội dung blob thật) — `duration`
        // (giây) chỉ có ý nghĩa cho voice message (svc-voice.js tự đo lúc ghi âm, xem comment
        // prop `duration` trong svc-audio.js — audio.duration/decodeAudioData không đáng tin cho
        // blob MediaRecorder), ảnh/video không truyền nên luôn 0, vô hại vì chỉ svc-audio đọc field này.
        // `toDeviceId` theo đúng quy ước sendMessage() ở tools/service.js: null = tin nhóm, set =
        // tin riêng — nơi gọi (svc-chat.js) tự tính theo tab đang mở, xem _dhSend()/toDeviceId.
        const row = {
            id: ulid(), created_at: Date.now(), bay_id: forBay.id,
            device_id: this._deviceId, user_id: this._user.id, user_name: this._user.display_name || this._user.email,
            user_avatar: this._user.avatar || '', content: '', to_device_id: toDeviceId, blob_id: blobId, mime: file.type, duration: duration || 0,
        }

        // [3] EXECUTE: ghi blob cục bộ trước, chỉ merge state + broadcast + gửi blob qua mesh nếu
        // bay/session còn nguyên
        await this._dfPutBlobLocal(blobId, forBay.id, file)
        if (this._activeBay !== forBay || this._session !== forSession) return // bay đã đổi trong lúc ghi blob cục bộ — bỏ
        this._dfMergeRow(row)
        forSession.broadcast('EVENT', { row })
        await sendBlob(forSession.mesh, null, forBay.id, blobId, file)
        if (toDeviceId) this._dfPingIfOffline(toDeviceId)
    }

    async _dfPutBlobLocal(blobId, bayId, blob) {
        await putBlob({ id: blobId, bay_id: bayId, mime: blob.type, name: blob.name || '', size: blob.size, blob, created_at: Date.now() })
    }

    _resolveBlobUrl(blobId, blob) {
        this._blobUrls = { ...this._blobUrls, [blobId]: URL.createObjectURL(blob) }
    }

    async _dfEnsureBlob(blobId) {
        const existing = await getBlob(blobId)
        if (existing) { this._resolveBlobUrl(blobId, existing.blob); return }
        this._session?.broadcast('BLOB_REQUEST', { blob_id: blobId })
    }

    async _dfHandleBlobRequest(msg, fromId) {
        const local = await getBlob(msg.blob_id)
        if (local && this._session) await sendBlob(this._session.mesh, fromId, local.bay_id, msg.blob_id, local.blob)
    }

    _dhIncomingBinary(buf, fromId) {
        handleBlobChunk(buf, (blobId, blob) => this._resolveBlobUrl(blobId, blob))
        // Relay tiếp cho spoke khác (chỉ hub relay có ý nghĩa — spoke chỉ có 1 link nên relay lại
        // chính người gửi là vô nghĩa, xem tools/mesh.js relayBinary). Cho phép mọi peer trong
        // bay (không chỉ hub-owner) thấy được đính kèm broadcast từ 1 spoke khác.
        if (fromId) this._session?.mesh.relayBinary(buf, fromId)
    }

    /**
     * Flow nhận tin nhắn từ peer: row (P2P) -> log cập nhật + relay tiếp + notify
     */
    async _dfReceiveRow(row, fromId) {
        // [1] CHECK: ghi IndexedDB trước bất kể bay nào (cache dùng chung), rồi mới lọc đúng bay
        // đang mở + dedupe qua _dfMergeRow (Bloom filter, xem _chatSeenFilter)
        await receiveMessage(row)
        if (!this._activeBay || row.bay_id !== this._activeBay.id) return
        if (!this._dfMergeRow(row)) return

        // [3] EXECUTE: relay tiếp cho peer khác (multi-hop)
        if (fromId) this._session?.relay({ type: 'EVENT', row }, fromId)

        //   [3.a] IF_SELF: tin do chính mình gửi (echo qua relay) — khỏi tự notify mình
        if (row.device_id === this._deviceId) return
        //   [3.b] IF_OTHER_DM: tin riêng gửi cho người khác, không phải mình — khỏi notify
        if (row.to_device_id && row.to_device_id !== this._deviceId) return
        //   [3.c] NOTIFY: bắn notification, gộp theo bay/thread (tag) để không spam
        notify(row.user_name || 'Tin nhắn mới', {
            body: row.content || (row.blob_id ? '[Đính kèm]' : ''),
            tag: row.to_device_id
                ? `bay-dm-${this._activeBay.id}-${row.device_id}`
                : `bay-msg-${this._activeBay.id}`,
        })
    }

    _dfMergeRow(row) {
        if (this._chatSeenFilter.mightHaveSeen(row.id) && this._log.some(r => r.id === row.id)) return false
        this._chatSeenFilter.add(row.id)
        this._log = [...this._log, row].sort((a, b) => a.created_at - b.created_at)
        if (row.blob_id && !this._blobUrls[row.blob_id]) this._dfEnsureBlob(row.blob_id)
        return true
    }

    /**
     * Flow peer mới link mesh thật: peerId -> SYNC_REQUEST kèm bitmap + xin lại blob còn thiếu
     */
    async _dfOnPeerLinked(peerId) {
        // [1] CHECK: đang có bay mở
        if (!this._activeBay) return
        const forBay     = this._activeBay
        const forSession = this._session
        this._dfSendPresence('online')

        // [2] PROCESS: bitmap log hiện tại — điểm khác biệt so với chỉ dùng `since`: bắt được cả
        // tin nhắn CŨ HƠN since nhưng bị lỡ do relay lỗi/offline trong lúc đó, không chỉ tin mới
        const bitmap = buildChatBitmap(await history(forBay.id, 0))
        if (this._activeBay !== forBay || this._session !== forSession) return // bay/session đổi trong lúc đang đọc history để build bitmap

        // [3] EXECUTE: gửi SYNC_REQUEST cho đúng peer vừa link + thử lại blob còn thiếu blobUrl
        //   [3.a] SYNC_REQUEST: bên nhận tự chạy filterMissingRows() có sẵn để vá lỗ hổng, và so
        //   commerceHashes (A.1) để biết bộ nào khỏi cần gửi lại
        forSession?.send(peerId, 'SYNC_REQUEST', {
            bay_id: forBay.id, since: this._syncSince, bitmap: b64Bitmap(bitmap),
            commerceHashes: this._comCommerceHashes(),
        })
        //   [3.b] RETRY_BLOB: đính kèm chat còn thiếu blobUrl — xin lại giờ đã có nơi để xin
        this._log.filter(r => r.blob_id && !this._blobUrls[r.blob_id]).forEach(r => this._dfEnsureBlob(r.blob_id))
        //   [3.c] RETRY_AVATAR: avatar bay (blob local) cũng vậy — mesh trước đó thường CHƯA có
        //   ai để xin (lúc mở bay chưa kịp bắt tay WebRTC), giờ mới có nơi để xin
        if (forBay.pics?.startsWith('blob:') && !this._blobUrls[forBay.pics.slice(5)]) this._dfEnsureBlob(forBay.pics.slice(5))
    }

    // peerId (transport) -> device_id thật, chiều ngược của _dfResolveTransportId — cần cho
    // _dfOnPeerUnlinked (mesh chỉ báo transport id rớt, không phải device_id). Hub tra ngược qua
    // _peerToDevice; spoke chỉ có 1 link thật (hub) nên rớt link đó nghĩa là chủ bay vừa offline.
    _dfDeviceIdForPeer(peerId) {
        if (this._isHub) return this._peerToDevice.get(peerId) ?? null
        if (peerId !== this._activeBay?.peer_id) return null
        return this._devices.find(d => d.user_id === this._activeBay?.owner_id)?.device_id ?? null
    }

    /**
     * Flow xử lý rớt link mesh: peerId (transport, mất kết nối thật) -> _devices cập nhật offline ngay
     */
    _dfOnPeerUnlinked(peerId) {
        // [1] CHECK: đang có bay mở + resolve được device_id thật + đã từng biết presence của
        // peer này + chưa đánh dấu offline
        if (!this._activeBay) return
        const deviceId = this._dfDeviceIdForPeer(peerId)
        if (!deviceId) return
        const known = this._devices.find(d => d.device_id === deviceId)
        if (!known || known.status === 'offline') return

        // [2] PROCESS: dựng lại đúng shape presence row, chỉ đổi status + mốc thời gian mới hơn
        const row = { ...known, status: 'offline', last_seen_at: Date.now() }

        // [3] EXECUTE: ghi IndexedDB (cùng đường applyPresence các nơi khác dùng) + merge state +
        // dọn map học được (hub only) — tránh giữ mapping cho 1 spoke đã rớt hẳn
        applyPresence(row)
        this._dfMergeDevice(row)
        if (this._isHub) { this._peerToDevice.delete(peerId); this._deviceToPeer.delete(deviceId) }
    }

    /**
     * Flow reconcile chat định kỳ: mọi peer đang link -> gửi lại SYNC_REQUEST kèm bitmap hiện tại
     */
    async _dfReconcileChat() {
        // [1] CHECK: đang có bay mở + có ít nhất 1 peer đang link
        const forBay = this._activeBay, forSession = this._session
        if (!forBay || !forSession) return
        const peers = forSession.mesh.linkedPeers()
        if (!peers.length) return

        // [2] PROCESS: bitmap log hiện tại (cùng cách _dfOnPeerLinked() đã dùng)
        const bitmap = b64Bitmap(buildChatBitmap(await history(forBay.id, 0)))
        if (this._activeBay !== forBay || this._session !== forSession) return // bay đổi trong lúc đọc history

        // [3] EXECUTE: gửi lại SYNC_REQUEST cho từng peer — bên nhận tự chạy filterMissingRows() có
        // sẵn, kèm commerceHashes (A.1) để tránh resend dữ liệu thương mại không đổi mỗi 3 phút
        const commerceHashes = this._comCommerceHashes()
        peers.forEach(peerId => forSession.send(peerId, 'SYNC_REQUEST', { bay_id: forBay.id, since: this._syncSince, bitmap, commerceHashes }))
    }

    /**
     * Flow nhận SYNC_REQUEST: xếp vào hàng đợi + rate-limit ngay tại đây (KHÔNG ở
     * _dfHandleSyncRequest) — 1 token/peer bị tiêu ĐÚNG 1 lần/request, tránh request bị bucket
     * chặn vẫn chiếm chỗ hàng đợi của peer khác trong 1 đợt storm nhiều peer link gần nhau.
     */
    _dfEnqueueSyncRequest(msg, fromId) {
        if (!this._activeBay || msg.bay_id !== this._activeBay.id) return
        if (!this._syncRequestBucket.allow(fromId)) return // vượt ngưỡng — bỏ, không gửi SYNC_RESPONSE
        this._syncResponseQueue.push({ msg, fromId })
        this._dfDrainSyncQueue()
    }

    /**
     * Flow xử lý hàng đợi SYNC_REQUEST: 1 lượt tại 1 thời điểm, nhường lại main thread giữa 2
     * lượt — dựng SYNC_RESPONSE (hash + JSON.stringify) có thể nặng khi payload lớn (products/
     * sections/chat log), storm nhiều peer link gần nhau (vd giờ vàng sale) dồn hết vào 1 vòng lặp
     * đồng bộ sẽ làm tab đứng hình + trễ luôn cả nhịp keepalive ICE/DTLS của mesh. setTimeout(0)
     * đủ để nhường 1 tick cho render/network — không cần phức tạp hơn (vd giới hạn ms/tick).
     */
    async _dfDrainSyncQueue() {
        if (this._syncResponseDraining) return
        this._syncResponseDraining = true
        try {
            while (this._syncResponseQueue.length) {
                const { msg, fromId } = this._syncResponseQueue.shift()
                await this._dfHandleSyncRequest(msg, fromId)
                await new Promise(resolve => setTimeout(resolve, 0))
            }
        } finally {
            this._syncResponseDraining = false
        }
    }

    /**
     * Flow phản hồi yêu cầu đồng bộ: msg (since + bitmap) -> SYNC_RESPONSE (rows + commerce data)
     */
    async _dfHandleSyncRequest(msg, fromId) {
        // [1] CHECK: đúng bay đang mở (có thể đã đổi bay trong lúc chờ tới lượt hàng đợi)
        if (!this._activeBay || msg.bay_id !== this._activeBay.id) return
        const forBay     = this._activeBay
        const forSession = this._session

        // [2] PROCESS: gom rows cần trả — tailRows theo `since`, cộng thêm extraRows từ
        // range-diff bitmap (bắt cả tin CŨ hơn since bị lỡ do relay lỗi/offline, không chỉ tin mới)
        const tailRows = await history(forBay.id, msg.since || 0)
        let extraRows = []
        if (msg.bitmap) {
            //   [2.a] HANDLE_ERR: bitmap lỗi từ peer — bỏ qua range-diff, vẫn trả theo since như bình thường
            try {
                const allRows = await history(forBay.id, 0)
                const mine    = buildChatBitmap(allRows)
                // filterMissingRows() tra thẳng bit theo block của từng row — O(rows), KHÔNG dựng
                // + quét lại danh sách range như missingRanges().filter() cũ (O(rows × số range),
                // có thể lên hàng nghìn range khi peer gần như chưa có gì — xem tools/bitmap.js).
                extraRows     = filterMissingRows(allRows, mine, unb64Bitmap(msg.bitmap))
            } catch (err) {
                console.error('[svc-bay] bitmap không hợp lệ từ peer, bỏ qua range-diff:', err)
            }
        }
        const rows          = [...tailRows, ...extraRows.filter(r => !tailRows.some(t => t.id === r.id))]

        // [3] EXECUTE: snapshot commerce (cache — xem _dfCommerceSnapshot, chỉ đọc lại IndexedDB +
        // hash lại khi có gì vừa đổi), chỉ gửi nếu bay/session còn nguyên
        const { sections, sectionItems, promos, hashes: myHashes } = await this._dfCommerceSnapshot()
        if (this._activeBay !== forBay || this._session !== forSession) return // bay đổi trong lúc đang gom dữ liệu — bỏ

        // [3.a] HASH_GATE (A.1, nay gồm cả devices) — so hash requester đã gửi (msg.commerceHashes)
        // với hash hiện có, bộ nào khớp thì bỏ hẳn khỏi payload (undefined bị JSON.stringify() tự
        // lược khi qua mesh, phía nhận đã sẵn `msg.devices?.forEach` nên KHÔNG cần đổi gì bên nhận,
        // xem session.on('SYNC_RESPONSE')). Không có msg.commerceHashes (peer bản cũ, hoặc lần sync
        // đầu) → gửi đủ như trước giờ.
        const theirHashes  = msg.commerceHashes || {}
        const devicesHash  = hashRows(this._devices, d => d.device_id, d => d.last_seen_at) // rẻ (RAM), tính riêng — KHÔNG nằm trong cache commerce vì đổi liên tục qua heartbeat
        forSession?.send(fromId, 'SYNC_RESPONSE', {
            bay_id: forBay.id, rows,
            devices:      theirHashes.devices      === devicesHash          ? undefined : this._devices,
            sections:     theirHashes.sections     === myHashes.sections     ? undefined : sections,
            sectionItems: theirHashes.sectionItems === myHashes.sectionItems ? undefined : sectionItems,
            promos:       theirHashes.promos       === myHashes.promos       ? undefined : promos,
        })
    }

    // ── Hub election (PeerJS star topology — hub = chủ bay, offer/answer/ICE đi hết qua
    // PeerServer broker, Firestore chỉ giữ `bays/{id}.peer_id`, xem tools/mesh.js + tools/service.js
    // writeHubPeerId/clearHubPeerId) ───────────────────────────────────────────────

    /**
     * Flow xác lập vai trò mesh: owner -> startHub() + ghi peer_id (trừ khi tab/device khác của
     * chính owner đã là hub — join vào đó thay vì tranh nhau); người khác -> joinHub(bay.peer_id).
     */
    async _dhStartMeshRole() {
        const forBay     = this._activeBay
        const forSession = this._session
        if (!forBay || !forSession) return

        if (!isOwner(forBay, this._user)) { await this._dfEnsureHubLink(); return }
        if (this._isHub) return // đã là hub của đúng lượt mở này rồi — no-op

        // [1] CHECK: bay đã có peer_id (tab/device khác của owner có thể đang là hub) — thử join
        // vào đó trước, chỉ tự startHub() khi thấy 'peer-unavailable' (hub cũ đã chết/không tồn
        // tại) — PeerServer chính là nguồn sự thật duy nhất cần, không cần tự dò qua BroadcastChannel.
        if (forBay.peer_id) {
            if (this._activeBay !== forBay || this._session !== forSession) return // bay/session đổi trong lúc join
            try { await forSession.mesh.joinHub(forBay.peer_id); return }
            catch (err) { if (err?.type !== 'peer-unavailable') console.error('[svc-bay] join hub cũ thất bại:', err) }
        }

        // [3] EXECUTE: chưa có hub sống nào — tự trở thành hub, ghi peer_id (ĐÚNG 1 lần, event-
        // driven — không còn heartbeat định kỳ như touchOwnerOnline cũ)
        try {
            await forSession.mesh.startHub()
            if (this._activeBay !== forBay || this._session !== forSession) return // bay/session đổi trong lúc startHub — bỏ (mesh cũ đã bị closeAll() ở _dhLeaveBay)
            this._isHub = true
            this._meshRetrying = false; clearTimeout(this._reconnectTimer); this._reconnectTimer = null // hub tự lo mesh của chính mình — khỏi còn cờ retry sót từ nhánh join hub cũ vừa thất bại ở trên
            await writeHubPeerId(forBay.id, this._peerId)
        } catch (err) {
            console.error('[svc-bay] startHub thất bại:', err) // trigger kế tiếp (_dfReconcileMesh/bay snapshot) tự retry
        }
    }

    /**
     * Flow join vào hub đã biết: đọc bay.peer_id hiện tại -> joinHub() nếu chưa link. No-op nếu
     * chưa biết peer_id (owner chưa online) hoặc đã link rồi. Gọi lại nhiều lần vô hại. Thất bại
     * (kể cả bị _hubConnectBucket chặn) tự hẹn giờ gọi lại qua _dfScheduleReconnect — KHÔNG còn
     * phải chờ tới trigger phản ứng tiếp theo (presence/reconcile 3'/bay snapshot) mới thử lại,
     * và bật _meshRetrying cho overlay "đang kết nối lại" (_comChannelStatus).
     */
    async _dfEnsureHubLink() {
        const forBay     = this._activeBay
        const forSession = this._session
        if (!forBay || !forSession || !forBay.peer_id) return
        if (forSession.mesh.hasLink(forBay.peer_id)) { this._meshRetrying = false; return }
        if (!this._hubConnectBucket.allow(forBay.id)) { this._dfScheduleReconnect(forBay, forSession); return } // tự vệ chống gọi connect() liên tục — vẫn hẹn giờ thử lại sau
        // 'peer-unavailable' (hub chưa lên/đang restart với peer_id mới, xem writeHubPeerId) là
        // trạng thái thoáng qua BÌNH THƯỜNG — không log như lỗi thật, nhưng VẪN cần
        // _dfScheduleReconnect như mọi thất bại khác (đây chính là lúc user cần thấy "đang kết nối
        // lại" thay vì màn hình đứng im không rõ đang chờ gì).
        try {
            await forSession.mesh.joinHub(forBay.peer_id)
            this._meshRetrying = false
        } catch (err) {
            if (err?.type !== 'peer-unavailable') console.error('[svc-bay] join hub thất bại:', err)
            this._dfScheduleReconnect(forBay, forSession)
        }
    }

    /**
     * Flow hẹn giờ retry join hub: forBay/forSession (snapshot lúc gọi) -> bật _meshRetrying +
     * setTimeout gọi lại _dfEnsureHubLink() sau RECONNECT_RETRY_MS. Idempotent — gọi lại nhiều lần
     * chỉ dời timer, không cộng dồn; tự bỏ nếu bay/session đã đổi (bị dọn sạch ở _dhLeaveBay).
     */
    _dfScheduleReconnect(forBay, forSession) {
        if (this._activeBay !== forBay || this._session !== forSession) return
        this._meshRetrying = true
        clearTimeout(this._reconnectTimer)
        this._reconnectTimer = setTimeout(() => {
            if (this._activeBay !== forBay || this._session !== forSession) return
            this._dfEnsureHubLink()
        }, RECONNECT_RETRY_MS)
    }

    // Dùng cho _reconcileTimer (backstop định kỳ) — hub không cần tự "join lại chính mình", chỉ
    // spoke cần retry định kỳ phòng khi mọi trigger phản ứng khác (presence/bay snapshot) đều lỡ nhịp.
    _dfReconcileMesh() {
        if (!this._isHub) this._dfEnsureHubLink()
    }

    /**
     * Flow nhận snapshot doc bay: row (Firestore realtime) -> merge info bay + join lại nếu
     * `peer_id` vừa đổi (hub cũ rớt, hub mới vừa ghi lại)
     */
    // listenBay() bắn lại TOÀN BỘ doc bays/{id} mỗi khi có thay đổi (không chỉ `peer_id`) — đây
    // là listener Firestore realtime, chạy trên MỌI peer đang mở bay đó (không chỉ thiết bị
    // owner vừa sửa như bay-updated ở dưới, event DOM cục bộ không qua được thiết bị khác).
    _dhBaySnapshot(row) {
        if (!row || this._activeBay?.id !== row.id) return
        // [2] PROCESS: merge title/description/pics/location/tags/peer_id mới nhất vào this._activeBay
        const oldPics   = this._activeBay.pics
        const oldPeerId = this._activeBay.peer_id
        this._activeBay = { ...this._activeBay, ...row }
        // [3] EXECUTE: avatar đổi sang blob mới thì tự xin lại qua mesh — vá lỗ hổng "sửa ảnh
        // xong peer khác không thấy tới khi họ tự mở lại bay"
        if (row.pics !== oldPics && row.pics?.startsWith('blob:')) this._dfEnsureBlob(row.pics.slice(5))
        // [3] EXECUTE: hub vừa đổi (rớt + hub mới ghi lại, hoặc lần đầu owner online) -> join lại
        if (row.peer_id !== oldPeerId && !this._isHub) this._dfEnsureHubLink()
    }

    // Nội dung dùng chung cho cả 2 khung overlay ở render() (.bay-loading thay hẳn placeholder
    // trước khi có _activeBay, .bay-sync-overlay phủ lên nội dung đã mount) — chỉ khác text theo
    // status, xem _comChannelStatus.
    _rfChannelOverlayBody(status) {
        return html`
            <iconify-icon icon="ri:loader-4-line" class="bay-loading-icon"></iconify-icon>
            <p class="bay-loading-text">${status === 'reconnecting' ? this._txt.reconnecting : this._txt.loadingChannel}</p>
        `
    }

    render() {
        return html`
            <svc-underlay theme=${this.theme} fixed blur gradient tint="#5691c9" total="2" blobType="circleOverlap" deg="0"></svc-underlay>
            <web-impact trigger=${this._giftRainKey}></web-impact>
            ${!SUPPORTS_RTC ? html`
                <div class="bay-unsupported">
                    <iconify-icon icon="ri:error-warning-line" class="bay-unsupported-icon"></iconify-icon>
                    <p class="bay-unsupported-title">${this._txt.unsupportedTitle}</p>
                    <p class="bay-unsupported-body">${this._txt.unsupportedBody}</p>
                </div>
            ` : !this._user ? html`
                <svc-bay-login lang=${this.lang} @bay-logged-in=${this._dhLoggedIn}></svc-bay-login>
            ` : html`
                <div class="bay-wrap">
                    <svc-bay-list class="bay-list"
                        ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        .user=${this._user} .activeBay=${this._comSyncListBay}
                        syncBayId=${this._comSyncListBayId}
                        .syncProgress=${this._comSyncListProgress}
                        @bay-opened=${e => this._dhOpenBay(e.detail.bay)}
                        @bay-updated=${e => this._dhBayUpdated(e.detail.bay)}
                    >
                      <div slot="action" style="display:flex; gap:.4rem;">
                        <div class="bay-theme-toggle"><web-theme ui=${this.ui} height="36px"></web-theme></div>
                        ${!this._tourSeen ? html`
                            <web-button type="soft" color="primary" height="36px" square rounded="50%"
                                ui=${this.ui} theme=${this.theme} title=${bayTourTitle(this.lang)} @clicked=${() => this._dhStartTour()}>
                                <iconify-icon icon="ri:question-fill" width="28px"></iconify-icon>
                            </web-button>
                        ` : ''}
                      </div>
                    </svc-bay-list>

                    ${this._activeBay ? html`
                        <div class="bay-active-wrap">
                            <div class="bay-main">
                                <div class="bay-feature-slot">
                                    <svc-bay-sections
                                        ui=${this.ui} theme=${this.theme} lang=${this.lang} mainColors=${this.mainColors}
                                        .user=${this._user} .bay=${this._activeBay} .sections=${this._sections}
                                        @bay-sections-change=${e => this._dhSectionsChange(e.detail.sections)}
                                        @promo:create=${e => this._dhPromoCreate(e.detail.promo)}
                                        @promo:delete=${e => this._dhPromoDelete(e.detail.code)}
                                    ></svc-bay-sections>
                                </div>
                            </div>
                            <svc-chat class="bay-chat"
                                ui=${this.ui} theme=${this.theme} lang=${this.lang}
                                .user=${this._user} .deviceId=${this._deviceId} .room=${this._activeBay}
                                .log=${this._log} .online=${this._comOnlineDevices} .connectingCount=${this._comConnectingCount} .blobUrls=${this._blobUrls}
                                .declinedPeerIds=${this._callDeclinedBy} .openDm=${this._pendingOpenDm}
                                ?owner=${isOwner(this._activeBay, this._user)}
                                @channel-chat-send=${e => this._dhSend(e.detail.content, e.detail.toDeviceId)}
                                @channel-chat-attach=${e => this._dhAttach(e.detail.file, e.detail.duration, e.detail.toDeviceId)}
                                @channel-call-start=${e => this._dhStartCall(e.detail.peerId, e.detail.peerName)}
                                @promo:create=${e => this._dhChatPromoCreate(e.detail.promo)}
                                @dm-opened-consumed=${() => {
                                    this._pendingOpenDm = null
                                    window.history.replaceState(null, '', `${location.pathname}?bay=${this._activeBay.id}`)
                                }}
                            ></svc-chat>
                            ${this._comChannelStatus ? html`
                                <div class="bay-sync-overlay">${this._rfChannelOverlayBody(this._comChannelStatus)}</div>
                            ` : ''}
                        </div>
                    ` : this._comChannelStatus ? html`
                        <div class="bay-loading">${this._rfChannelOverlayBody(this._comChannelStatus)}</div>
                    ` : html`
                        <div class="bay-placeholder">${this._txt.placeholder}</div>
                    `}
                    ${this._callState !== 'idle' ? html`
                        <svc-bay-call
                            ui=${this.ui} theme=${this.theme} lang=${this.lang}
                            .callState=${this._callState} .peerName=${this._callPeerName}
                            .localStream=${this._callLocalStream} .remoteStream=${this._callRemoteStream}
                            @call-accept=${this._dhAcceptCall}
                            @call-decline=${this._dhDeclineCall}
                            @call-hangup=${this._dhHangupCall}
                        ></svc-bay-call>
                    ` : ''}
                </div>
                <web-toast ui=${this.ui}></web-toast>
                <web-driver id="wdr-singleton" ui=${this.ui} theme=${this.theme} lang=${this.lang}></web-driver>
            `}
        `
    }
}

if (!customElements.get('svc-bay')) customElements.define('svc-bay', SvcBay)
