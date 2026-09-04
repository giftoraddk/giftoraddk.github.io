// src/webs/chat/svc-chat.js
//
// Responsive: dưới CHAT_BREAKPOINT (64rem), panel docked (:host, sticky/100vh trên màn
// lớn) biến thành 1 <web-fab> cố định góc trên-phải màn hình — bấm mở 1 panel neo góc
// trên-phải (native <dialog> qua showModal(), giống lý do web-dialog.js dùng top-layer:
// tránh bị kẹt containing block bởi ancestor có transform/filter/backdrop-filter, vd glass
// panes của ui="spatial"). Panel giới hạn width + backdrop trong suốt để KHÔNG che danh
// sách kênh (rail) đang neo bên trái. To lại quá breakpoint → tự đóng panel, về lại docked.
//
// Component độc lập — không phụ thuộc domain nào (không import tools/service.js của bất kỳ
// domain nào khác). `online` (danh sách peer đang online, đã lọc sẵn) là prop do nơi gọi
// tự tính (vd svc-bay.js dùng onlinePeers() của nó) rồi truyền vào, thay vì component tự
// import hàm lọc theo domain. Ngoại lệ duy nhất: widget tạo voucher riêng trong tab DM
// (owner, xem _dhVoucherCreated) dùng <svc-pay-promo> (webs/pay) — component THUẦN
// presentational (không kéo theo tools/service.js của pay), chấp nhận được vì nơi duy nhất
// hiện import svc-chat.js là webs/bay (đã phụ thuộc pay sẵn, xem hook/PAY.rst).
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-avatar.js'
import '@/webs/apex/web-fab.js'
import '@/webs/apex/web-tooltip.js'
import '@/webs/media/svc-media.js'
import '@/webs/media/svc-audio.js'
import '@/webs/pay/svc-pay-promo.js'
import './svc-emoji.js'
import './svc-voice.js'
import { fmtBadgeCount, txtLingo, emit, toastEmit } from '@/services/helper.js'
import styles from './styles/svc-chat.css?inline'

const CHAT_BREAKPOINT = '(max-width: 64rem)'

const TXT_STD = {
    vi: {
        emptyRoom: 'Chọn 1 kênh bên trái để bắt đầu chat',
        group: 'Nhóm', close: 'Đóng', dmMenu: 'Nhắn tin riêng',
        online: n => `${n} đang online`,
        connecting: n => `Đang kết nối với ${n} người…`,
        attach: 'Đính kèm ảnh/video',
        voiceRecord: 'Ghi âm',
        callTo: name => `Gọi ${name}`,
        callDeclined: name => `Gọi ${name} — Đã từ chối`,
        more: 'Thêm', placeholder: 'Nhập tin nhắn…',
        dmStarted: name => `${name} đã gửi cho bạn một tin nhắn riêng`,
    },
    en: {
        emptyRoom: 'Select a channel on the left to start chatting',
        group: 'Group', close: 'Close', dmMenu: 'Direct message',
        online: n => `${n} online`,
        connecting: n => `Connecting to ${n}…`,
        attach: 'Attach photo/video',
        voiceRecord: 'Record',
        callTo: name => `Call ${name}`,
        callDeclined: name => `Call ${name} — Declined`,
        more: 'More', placeholder: 'Type a message…',
        dmStarted: name => `${name} just sent you a private message`,
    },
}

export class SvcChat extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        user:     { type: Object },
        deviceId: { type: String },
        room:     { type: Object },
        log:      { type: Array },
        online:   { type: Array }, // peer đang online, đã lọc sẵn bởi nơi gọi — xem comment đầu file
        connectingCount: { type: Number }, // peer online (presence) nhưng mesh chưa link được —
        // nơi gọi tự tính (vd svc-bay.js._comConnectingCount), hiện chữ "Đang kết nối…" trong
        // chc-online — mặc định 0 (không hiện gì) nếu nơi gọi không truyền, tương thích ngược.
        blobUrls: { type: Object }, // { [blob_id]: objectURL }
        owner:    { type: Boolean }, // true → cho phép gửi voucher riêng trong tab DM, xem chc-action-row
        declinedPeerIds: { type: Array }, // peer id đã từ chối cuộc gọi — xem svc-channel.js._callDeclinedBy
        openDm: { type: Object }, // { device_id, user_name } — nơi gọi muốn tự mở thẳng 1 tab DM khi `room` vừa đổi
        // (vd svc-bay.js redirect từ toast ping xuyên bay) — xem updated()/'dm-opened-consumed'.
        _draft:   { state: true },
        _isSmall: { state: true },
        _open:    { state: true },
        _showActions:   { state: true }, // nhóm 3 nút emoji/đính kèm/gọi — ẩn sau nút "Thêm"
        _voiceBusy:     { state: true }, // svc-voice đang ghi âm/có bản ghi chưa gửi — chặn ẩn chc-action-row lúc này
        _activeThread:  { state: true }, // 'group' | peerDeviceId — tab đang xem trong chc-tabs
        _openDMs:       { state: true }, // [{device_id, user_name}] — tab nhắn riêng đang mở
        _dmLastSeen:    { state: true }, // { [peerId]: created_at mốc đã xem } — tính badge unread
        _avatarMenuFor: { state: true }, // id tin nhắn đang mở menu "Nhắn tin riêng", hoặc null
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.user = null; this.deviceId = ''; this.room = null
        this.log = []; this.online = []; this.connectingCount = 0; this.blobUrls = {}
        this.owner = false
        this.declinedPeerIds = []
        this.openDm = null
        this._draft = ''
        this._isSmall = false
        this._open = false
        this._showActions = false
        this._voiceBusy = false
        this._activeThread = 'group'
        this._openDMs = []
        this._dmLastSeen = {}
        this._avatarMenuFor = null
        // Plain instance flag, NOT a reactive property — true once _dcSyncIncomingDMs() has run
        // at least once for the current room, so it can tell "restoring cached DM threads on
        // room open" (silent) apart from "a new private thread just arrived" (toast once).
        this._logRestored = false
        // Plain instance field, NOT reactive — ids of `log` messages already processed by
        // _dcSyncIncomingDMs(), so a message is only ever treated as "new" once regardless of
        // later tab-close/reopen churn (see _dcSyncIncomingDMs comment for the bug this avoids).
        this._syncedDmIds = new Set()
        this._onMqChange = e => { this._isSmall = e.matches; if (!e.matches) this._open = false }
    }

    connectedCallback() {
        super.connectedCallback()
        this._mq = matchMedia(CHAT_BREAKPOINT)
        this._isSmall = this._mq.matches
        this._mq.addEventListener('change', this._onMqChange)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._mq?.removeEventListener('change', this._onMqChange)
    }

    updated(changed) {
        // So sánh theo `id`, KHÔNG phải reference — svc-bay.js._dhBaySnapshot() gán lại
        // this._activeBay = {...} (object MỚI) mỗi lần doc bay đổi bất kỳ field nào (signal
        // handshake, owner heartbeat, ping...), dù vẫn cùng 1 bay. Nếu chỉ check
        // changed.has('room') (reference !==), mọi lần đó sẽ bị hiểu nhầm là "đổi room" và
        // reset sạch tab DM đang mở (kể cả tab vừa tự mở qua openDm — xem _dhGotoPing).
        const prevRoom = changed.get('room')
        if (changed.has('room') && prevRoom?.id !== this.room?.id) { // đổi room THẬT — tab riêng của room cũ không còn nghĩa gì, đóng hết
            this._activeThread = 'group'
            this._openDMs = []
            this._dmLastSeen = {}
            this._avatarMenuFor = null
            this._logRestored = false
            this._syncedDmIds = new Set()
            // Nơi gọi muốn mở thẳng 1 tab DM cho room vừa mở (vd redirect từ toast ping xuyên bay,
            // xem svc-bay.js._dhGotoPing) — tái dùng _dhOpenDM() có sẵn, không cần đợi `log` sync
            // xong (tin thật sẽ tự trôi vào qua mesh 1 khi link lại, xem _dfMergeRow). Báo lại nơi
            // gọi đã tiêu thụ xong để họ tự dọn state, tránh mở lại DM này ở lần đổi room sau.
            if (this.openDm) {
                this._dhOpenDM({ device_id: this.openDm.device_id, user_name: this.openDm.user_name, avatar: '', userId: '' })
                this._emit('dm-opened-consumed', {})
            }
        }
        if (changed.has('log')) this._dcSyncIncomingDMs()
        if (changed.has('log') || changed.has('_activeThread')) {
            this._scrollToBottom()
            // đang xem đúng tab riêng đó khi tin mới tới — coi như đã đọc ngay, tránh badge
            // "sống lại" nếu sau đó rời tab rồi quay lại (xem _comUnread)
            if (this._activeThread !== 'group') {
                this._dmLastSeen = { ...this._dmLastSeen, [this._activeThread]: Date.now() }
            }
        }
        if (changed.has('_isSmall')) this.classList.toggle('icon-mode', this._isSmall)
        if (changed.has('_open')) {
            const d = this.shadowRoot?.querySelector('dialog.chc-panel')
            if (d) { if (this._open && !d.open) d.showModal(); else if (!this._open && d.open) d.close() }
        }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    _emit(name, detail) { emit(this, name, detail) }

    _scrollToBottom() {
        const el = this.shadowRoot?.querySelector('.chc-messages')
        if (el) el.scrollTop = el.scrollHeight
    }

    _dhSend() {
        const content = this._draft.trim()
        if (!content) return
        this._draft = ''
        const toDeviceId = this._activeThread === 'group' ? null : this._activeThread
        this._emit('channel-chat-send', { content, toDeviceId })
    }

    _dhCallPeer(device) {
        // Không ẩn action row nếu svc-voice đang ghi âm/có bản ghi chưa gửi — ẩn sẽ unmount
        // <svc-voice>, mất trắng bản ghi không cảnh báo (xem chc-action-row/_voiceBusy).
        if (!this._voiceBusy) this._showActions = false
        this._emit('channel-call-start', { peerId: device.device_id, peerName: device.user_name })
    }

    // Owner tạo voucher riêng (svc-promo special mode) trong 1 tab DM — tự soạn tin nhắn chứa
    // mã và gửi thẳng vào đúng thread đang mở qua đường dây private-message có sẵn (`toDeviceId`),
    // không cần message type P2P mới. Event `promo:create` gốc KHÔNG bị stopPropagation ở đây —
    // nó tiếp tục bubble composed lên svc-channel.js để persist cục bộ + broadcast (xem đó).
    _dhVoucherCreated(promo) {
        const content = `🎁 Mã ưu đãi riêng cho bạn: ${promo.code} — ${promo.label}`
        this._emit('channel-chat-send', { content, toDeviceId: this._activeThread })
    }

    _dhOpenDM(peer) {
        if (!this._openDMs.some(d => d.device_id === peer.device_id)) this._openDMs = [...this._openDMs, peer]
        this._avatarMenuFor = null
        this._dhSwitchThread(peer.device_id)
    }

    // Tin riêng gửi TỚI mình từ 1 peer chưa từng mở tab (vd chủ kênh chủ động nhắn riêng
    // trước) — tự thêm tab vào _openDMs, KHÔNG tự chuyển _activeThread (badge unread ở
    // _comUnread()/chc-tab-badge đã đủ báo). Lần đồng bộ ĐẦU TIÊN sau khi mở room chỉ khôi
    // phục tab từ log cache (IndexedDB), không toast — tránh spam toast cho thread cũ; mọi
    // lần sau, peer mới phát hiện được coi là tin thật sự vừa tới nên toast đúng 1 lần.
    // Giả định: nơi gọi truyền `log` đầy đủ (lịch sử đã khôi phục xong) ngay lần gán đầu
    // tiên cho 1 room, không nạp dần theo trang — đúng với svc-bay.js hiện tại (mount lại
    // <svc-chat> kèm _log đã restore xong). Nếu sau này có nơi gọi khác nạp log theo từng
    // đợt, cần tự đảm bảo đợt đầu tiên đã đầy đủ trước khi gán, nếu không _logRestored sẽ
    // chốt sai ở đợt nạp dở dang và bỏ sót toast cho các peer xuất hiện ở đợt sau.
    // _syncedDmIds theo dõi ID tin đã xử lý (KHÔNG dựa vào việc peer còn trong _openDMs hay
    // không) — nếu chỉ so với _openDMs, đóng 1 tab DM xong thì tin CŨ của đúng peer đó (vẫn
    // còn nằm trong log, TTL 7 ngày) sẽ bị hiểu nhầm là "mới" ngay khi có bất kỳ log-change
    // nào khác xảy ra sau đó (kể cả không liên quan gì tới peer đã đóng), tự mở lại tab kèm
    // toast giả. Đánh dấu theo ID tin nhắn đảm bảo mỗi tin chỉ được coi là "mới" đúng 1 lần.
    _dcSyncIncomingDMs() {
        const bySender = new Map()
        for (const m of this.log || []) {
            if (m.to_device_id !== this.deviceId || m.device_id === this.deviceId) continue
            if (this._syncedDmIds.has(m.id)) continue
            this._syncedDmIds.add(m.id)
            bySender.set(m.device_id, m)
        }
        if (!bySender.size) { this._logRestored = true; return }

        const shouldToast = this._logRestored
        const newPeers = [...bySender.values()].filter(m => !this._openDMs.some(d => d.device_id === m.device_id))
        if (newPeers.length) {
            this._openDMs = [...this._openDMs, ...newPeers.map(m => ({
                device_id: m.device_id, user_name: m.user_name, avatar: m.user_avatar, userId: m.user_id,
            }))]
            if (shouldToast) {
                newPeers.forEach(m => toastEmit(this._txt.dmStarted(this._comDisplayName(m.user_id, m.user_name)), 'info'))
            }
        }
        this._logRestored = true
    }

    // `online` (prop, đã lọc sẵn bởi nơi gọi — xem comment đầu file) là nguồn DUY NHẤT biết ai
    // đang online lúc này — dùng cho status-dot của <web-avatar> ở cả tin nhắn lẫn tab DM.
    _comIsOnline(deviceId) { return (this.online || []).some(d => d.device_id === deviceId) }

    // Tin/tab của CHỦ kênh (owner) hiện avatar kênh (bay.pics) thay vì avatar cá nhân — giống
    // pattern chat hỗ trợ (shop trả lời = logo shop, khách = ảnh riêng của họ).
    _comIsChannel(userId) { return !!this.room && userId === this.room.owner_id }

    // bay.pics là URL thật hoặc "blob:<id>" (avatar cục bộ, xem svc-bay-list.js._comResolvedPic) —
    // cùng 1 map `blobUrls` với đính kèm chat (svc-bay.js._dfEnsureBlob ghi chung 1 chỗ cho cả 2),
    // nên đọc lại được thẳng ở đây, không cần domain truyền thêm prop riêng.
    _comRoomAvatar() {
        const raw = (this.room?.pics || '').split('|')[0].trim()
        if (!raw || !raw.startsWith('blob:')) return raw
        return this.blobUrls?.[raw.slice(5)] || ''
    }

    // Tên hiển thị đi cùng _comIsChannel() ở trên — owner hiện tên kênh (room.title) thay vì
    // tên cá nhân, đồng bộ với avatar kênh.
    _comDisplayName(userId, fallbackName) {
        return this._comIsChannel(userId) ? (this.room?.title || fallbackName) : fallbackName
    }

    _dhCloseDM(peerId) {
        this._openDMs = this._openDMs.filter(d => d.device_id !== peerId)
        if (this._activeThread === peerId) this._activeThread = 'group'
    }

    _dhSwitchThread(id) { this._activeThread = id }

    _dhToggleAvatarMenu(m) { this._avatarMenuFor = this._avatarMenuFor === m.id ? null : m.id }

    _dhPickFile(e) {
        const file = e.target.files[0]
        e.target.value = ''
        if (!file) return
        const toDeviceId = this._activeThread === 'group' ? null : this._activeThread
        this._emit('channel-chat-attach', { file, toDeviceId })
    }

    // v1: nối vào cuối draft — chèn đúng vị trí con trỏ cần đọc selectionStart của input bên
    // trong <web-text> (custom element), để sau nếu cần.
    _dhInsertEmoji(char) {
        this._draft += char
    }

    // log gộp chung cả tin nhóm lẫn tin riêng (to_device_id nullable, xem svc-channel.js
    // tools/service.js sendMessage) — tách theo tab ở đây, tầng hiển thị, không phải mesh.
    _comGroupLog() { return (this.log || []).filter(m => !m.to_device_id) }

    _comThreadLog(peerId) {
        return (this.log || []).filter(m =>
            (m.device_id === this.deviceId && m.to_device_id === peerId) ||
            (m.device_id === peerId && m.to_device_id === this.deviceId))
    }

    // Chỉ đếm tin PEER gửi tới (không đếm tin mình gửi) mới hơn mốc đã xem gần nhất của
    // đúng peer đó — xem updated()._dmLastSeen.
    _comUnread(peerId) {
        const seen = this._dmLastSeen[peerId] || 0
        return this._comThreadLog(peerId).filter(m => m.device_id === peerId && m.created_at > seen).length
    }

    // Gọi giờ chỉ có trong 1 tab nhắn riêng (luôn đúng 2 người theo định nghĩa) — tab Nhóm
    // KHÔNG còn tính năng gọi nữa, dù phòng chỉ có 2 người online. Trả null nếu peer đó vừa
    // offline (ẩn nút gọi tự nhiên).
    _comCallTarget(others) {
        if (this._activeThread === 'group') return null
        return others.find(d => d.device_id === this._activeThread) || null
    }

    // blobUrls[blob_id] là objectURL do nơi gọi tự tạo/revoke (vd svc-channel.js._resolveBlobUrl) —
    // truyền qua `src`, KHÔNG qua `blob`, để svc-media không tự revoke nhầm URL đó.
    // svc-media chỉ hiểu image/video (xem hook/superpowers/specs/2026-07-30-voice-message-
    // design.md) — voice message rẽ sang <svc-audio> thay vì mở rộng svc-media.
    _rfAttachment(m) {
        const url = this.blobUrls?.[m.blob_id]
        if (m.mime?.startsWith('audio')) return html`<svc-audio src=${url || ''} duration=${m.duration || 0} ui=${this.ui} theme=${this.theme} lang=${this.lang}></svc-audio>`
        return html`<svc-media .items=${[{ src: url || '', mime: m.mime }]} size="220px" rounded="0.5rem"></svc-media>`
    }

    // Tab "Nhóm" chỉ hiện khi ĐÃ có ít nhất 1 tab riêng đang mở — chưa có tab riêng nào thì
    // chỉ có đúng 1 luồng để xem (nhóm), không cần cho chọn. Icon từng tab riêng dùng thẳng
    // <web-avatar> (ảnh thật hoặc chữ cái đầu — cùng logic avatar của message), không phải
    // icon chung chung nữa.
    _rbTabs() {
        if (!this._openDMs.length) return ''
        return html`
            <div class="chc-tabs">
                <web-button class="chc-tab-btn" type=${this._activeThread === 'group' ? 'fill' : 'ghost'}
                    color="primary" rounded="50%" height="45px" square ui=${this.ui} theme=${this.theme}
                    title=${this._txt.group} @clicked=${() => this._dhSwitchThread('group')}>
                    <iconify-icon icon="ri:group-line" width="20"></iconify-icon>
                </web-button>
                ${this._openDMs.map(peer => {
                    const displayName = this._comDisplayName(peer.userId, peer.user_name)
                    return html`
                    <div class="chc-tab-wrap ${this._activeThread === peer.device_id ? 'active' : ''}"
                        title=${displayName} @click=${() => this._dhSwitchThread(peer.device_id)}>
                        <web-avatar src=${this._comIsChannel(peer.userId) ? this._comRoomAvatar() : (peer.avatar || '')}
                            name=${displayName} size="45px" ui=${this.ui} theme=${this.theme}
                            status=${this._comIsOnline(peer.device_id) ? 'online' : ''}></web-avatar>
                        ${this._comUnread(peer.device_id) > 0 ? html`<span class="chc-tab-badge">${fmtBadgeCount(this._comUnread(peer.device_id))}</span>` : ''}
                        <span class="chc-tab-close" title=${this._txt.close}
                            @click=${e => { e.stopPropagation(); this._dhCloseDM(peer.device_id) }}>
                            <iconify-icon icon="ri:close-line" width="12"></iconify-icon>
                        </span>
                    </div>
                `})}
            </div>
        `
    }

    // Avatar của tin người KHÁC (không phải mình) luôn mở được menu "Nhắn tin riêng" trong
    // khung Nhóm — không giới hạn theo số người online, kể cả phòng chỉ có 2 người.
    _rfMessage(m) {
        const canDM = m.device_id !== this.deviceId
        const displayName = this._comDisplayName(m.user_id, m.user_name)
        return html`
            <div class="chc-message ${m.device_id === this.deviceId ? 'mine' : ''}">
                <div class="chc-avatar-wrap ${canDM ? 'clickable' : ''}"
                    @click=${canDM ? () => this._dhToggleAvatarMenu(m) : null}>
                    <web-avatar src=${this._comIsChannel(m.user_id) ? this._comRoomAvatar() : (m.user_avatar || '')}
                        name=${displayName} size="28px" ui=${this.ui} theme=${this.theme}
                        status=${this._comIsOnline(m.device_id) ? 'online' : ''}></web-avatar>
                    ${this._avatarMenuFor === m.id ? html`
                        <div class="chc-avatar-menu" @click=${e => e.stopPropagation()}>
                            <div class="chc-avatar-menu-item"
                                @click=${() => this._dhOpenDM({ device_id: m.device_id, user_name: m.user_name, avatar: m.user_avatar, userId: m.user_id })}>
                                ${this._txt.dmMenu}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="chc-bubble">
                    <span class="chc-author">${displayName}</span>
                    ${m.blob_id ? this._rfAttachment(m) : ''}
                    ${m.content ? html`<p class="chc-content">${m.content}</p>` : ''}
                </div>
            </div>
        `
    }

    _rfBody() {
        // `online` giữ nguyên ý nghĩa cũ (tổng số đang online, TÍNH CẢ mình) cho dòng chữ
        // hiển thị — `others` là danh sách loại trừ bản thân, dùng cho nút gọi (không thể tự
        // gọi mình). Gộp chung 1 biến từng vô tình đổi luôn ý nghĩa số hiển thị — tách riêng
        // để không lặp lại lỗi đó (xem hook/superpowers/specs/2026-07-15-channel-chat-composer-call-lock-design.md).
        const online = this.online || []
        const others = online.filter(d => d.device_id !== this.deviceId)
        const callTarget = this._comCallTarget(others)
        const messages = this._activeThread === 'group' ? this._comGroupLog() : this._comThreadLog(this._activeThread)
        return html`
            <div class="chc-wrap">
                ${this._isSmall ? html`
                    <div class="chc-mobile-head">
                        <span class="chc-mobile-title">${this.room.title}</span>
                        <web-button type="soft" color="error" height="30px" square ui=${this.ui} theme=${this.theme}
                            @clicked=${() => { this._open = false }}>
                            <iconify-icon icon="ri:close-line" width="16"></iconify-icon>
                        </web-button>
                    </div>
                ` : ''}
                <div class="chc-online">
                    <span class="chc-connecting">
                      ${this.connectingCount > 0 ? html`
                        <iconify-icon icon="ri:loader-4-line" class="chc-connecting-spin"></iconify-icon>
                        ${this._txt.connecting(this.connectingCount)}
                      ` : ''}
                    </span>
                    <span class="chc-counter">
                      <iconify-icon icon="ri:group-line"></iconify-icon>
                      ${this._txt.online(online.length)}
                    </span>
                </div>
                ${this._rbTabs()}
                <div class="chc-messages">
                    ${messages.map(m => this._rfMessage(m))}
                </div>
                ${this._showActions ? html`
                    <div class="chc-action-row">
                        <svc-emoji ui=${this.ui} theme=${this.theme} lang=${this.lang} height="45px"
                            @emoji-pick=${e => this._dhInsertEmoji(e.detail.char)}></svc-emoji>
                        <web-tooltip ui=${this.ui} placement="top">
                            <svc-voice theme=${this.theme} lang=${this.lang} height="45px"
                                @voice-send=${e => this._emit('channel-chat-attach', { file: e.detail.file, duration: e.detail.duration, toDeviceId: this._activeThread === 'group' ? null : this._activeThread })}
                                @voice-busy-change=${e => { this._voiceBusy = e.detail.busy }}></svc-voice>
                            <span slot="content">${this._txt.voiceRecord}</span>
                        </web-tooltip>
                        <web-tooltip ui=${this.ui} placement="top">
                            <web-button type="soft" color="accent" rounded="50%" height="45px" square
                                @clicked=${() => this.shadowRoot.querySelector('.chc-file-input').click()}>
                                <iconify-icon icon="ri:camera-2-line" width="20px"></iconify-icon>
                            </web-button>
                            <span slot="content">${this._txt.attach}</span>
                        </web-tooltip>
                        ${callTarget ? html`
                            <web-tooltip ui=${this.ui} placement="top">
                                <web-button type="soft" color="info" rounded="50%" height="45px" square
                                    ?disabled=${this.declinedPeerIds.includes(callTarget.device_id)}
                                    @clicked=${() => this._dhCallPeer(callTarget)}>
                                    <iconify-icon icon="ri:phone-line" width="20px"></iconify-icon>
                                </web-button>
                                <span slot="content">
                                    ${this.declinedPeerIds.includes(callTarget.device_id)
                                        ? this._txt.callDeclined(callTarget.user_name)
                                        : this._txt.callTo(callTarget.user_name)}
                                </span>
                            </web-tooltip>
                        ` : ''}
                        ${this._activeThread !== 'group' && this.owner ? html`
                            <svc-pay-promo type="circle" special owner ui=${this.ui} theme=${this.theme} lang=${this.lang}
                                @promo:create=${e => this._dhVoucherCreated(e.detail.promo)}></svc-pay-promo>
                        ` : ''}
                    </div>
                ` : ''}
                <input class="chc-file-input" type="file" accept="image/*,video/*" hidden
                    @change=${e => this._dhPickFile(e)}>
                <div class="chc-composer">
                    <web-button type="soft" height="36px" square rounded="50%" title=${this._txt.more}
                        @clicked=${() => { if (!(this._showActions && this._voiceBusy)) this._showActions = !this._showActions }}>
                        <iconify-icon icon="ri:more-2-fill" width="18"></iconify-icon>
                    </web-button>
                    <web-text placeholder=${this._txt.placeholder} .value=${this._draft} height="36px"
                        @input=${e => { this._draft = e.detail.value }}
                        @keydown=${e => { if (e.key === 'Enter' && !e.isComposing) this._dhSend() }}
                    ></web-text>
                    <web-button type="soft" color="primary" height="36px" square rounded="50%" @clicked=${this._dhSend}>
                        <iconify-icon icon="ri:send-plane-2-fill" width="18"></iconify-icon>
                    </web-button>
                </div>
            </div>
        `
    }

    render() {
        if (!this.room) return html`<div class="chc-empty">${this._txt.emptyRoom}</div>`

        if (!this._isSmall) return this._rfBody()

        return html`
            <web-fab icon="ri:question-answer-line" size="lg" x="99%" y="99%" movable ui=${this.ui} theme=${this.theme}
                @clicked=${() => { this._open = true }}></web-fab>
            <dialog class="chc-panel" @cancel=${e => { e.preventDefault(); this._open = false }}>
                ${this._open ? this._rfBody() : ''}
            </dialog>
        `
    }
}

if (!customElements.get('svc-chat')) customElements.define('svc-chat', SvcChat)
