// src/webs/bay/tools/mesh.js
// Cơ chế "2 peer nói chuyện được với nhau" (DataChannel) qua PeerJS — signaling (offer/answer/
// ICE) đi hết qua PeerServer broker của PeerJS, KHÔNG còn ghi Firestore nào ở tầng này (xem
// startHub/joinHub dưới). Không biết gì về presence/chat/products/bay cụ thể — chỉ lo phần
// link, message JSON thô qua callback onEvent(msg, fromId) chung (xem tools/session.js để
// phân loại theo msg.type). Tự viết riêng cho bay, KHÔNG import từ webs/channel/tools/webrtc.js
// hay webs/chat.
//
// Topology: star, hub = chủ bay — mọi peer khác `joinHub(hubPeerId)` thẳng vào đúng 1 id đã biết
// (đọc từ Firestore `bays/{id}.peer_id`, xem tools/service.js writeHubPeerId/readHubPeerId).
// Không còn full-mesh (mỗi cặp tự bắt tay riêng) — xem hook/CHANNEL.rst cho lý do đánh đổi.

import Peer from 'peerjs'
import { createTokenBucket } from './ratelimit.js'

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }, // backup — 1 STUN chậm/không phản hồi trên vài mạng mobile không chặn cả gathering
]

// TURN optional — nếu chưa cấu hình, mesh vẫn hoạt động qua STUN như trước, chỉ có thể fail
// khi CẢ 2 bên cùng sau NAT đối xứng. Set 3 biến này trong .env khi có TURN server:
//   PUBLIC_BAY_TURN_URL, PUBLIC_BAY_TURN_USERNAME, PUBLIC_BAY_TURN_CREDENTIAL
const TURN_URL        = import.meta.env.PUBLIC_BAY_TURN_URL
const TURN_USERNAME   = import.meta.env.PUBLIC_BAY_TURN_USERNAME
const TURN_CREDENTIAL = import.meta.env.PUBLIC_BAY_TURN_CREDENTIAL
if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    ICE_SERVERS.push({ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL })
}

// Defense-in-depth cho relay() — dedupe theo nội dung (mỗi feature module tự chặn loop bằng
// version/seen-set riêng) đã chặn loop trong thực tế, nhưng cap số hop cứng vẫn nên có khi
// mesh mở rộng ra nhiều peer hơn — rẻ, không ảnh hưởng hành vi bình thường.
const MAX_RELAY_HOPS = 8

// Timeout cho startHub()/joinHub() — PeerJS có vài trường hợp không emit 'error' rõ ràng (ICE
// treo lặng lẽ, hoặc lỗi broker hiếm không rơi vào case nào ở trên) — cap cứng để không treo vô
// thời hạn, tầng trên (svc-bay.js) tự retry qua các trigger khác khi promise reject.
const CONNECT_TIMEOUT_MS = 20_000

// Backpressure cho DataChannel — quan trọng nhất trên mobile (uplink thường yếu hơn desktop
// nhiều lần): sendBlob() bơm hàng trăm chunk 64KB liên tiếp không có gating sẽ chất đầy SCTP
// send buffer ngay lập tức; các message nhỏ thời gian thực (chat/presence/product sync) gửi
// CÙNG lúc bị kẹt PHÍA SAU cả hàng đợi blob đó trong buffer, tới tay peer trễ hàng chục giây dù
// bản thân message đó nhẹ — đúng cảm giác "đồng bộ chậm" dù link đã thiết lập xong. Chờ buffer
// rút xuống dưới HIGH_WATERMARK trước khi gửi tiếp — với message nhỏ buffer luôn thấp nên
// waitDrain() trả về ngay (no-op), chỉ thực sự chờ khi đang truyền blob lớn.
const BUFFERED_AMOUNT_HIGH_WATERMARK = 1024 * 1024 // 1MB
const BUFFERED_AMOUNT_LOW_THRESHOLD  = 256 * 1024  // 256KB — ngưỡng bắn lại 'bufferedamountlow'

function waitDrain(channel) {
    if (channel.bufferedAmount <= BUFFERED_AMOUNT_HIGH_WATERMARK) return Promise.resolve()
    return new Promise(resolve => {
        channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD
        channel.addEventListener('bufferedamountlow', function onLow() {
            channel.removeEventListener('bufferedamountlow', onLow)
            resolve()
        })
    })
}

// Priority send queue cho 1 link (A.3) — JSON control message (chat/presence/product/sync/
// call-signaling — bất cứ gì không phải ArrayBuffer) luôn được ưu tiên gửi trước các chunk blob
// (binary) đang chờ, để 1 lượt truyền avatar/đính kèm lớn trên mạng yếu không làm các message
// nhỏ thời gian thực bị kẹt phía sau CÙNG hàng đợi backpressure (xem comment BUFFERED_AMOUNT_*
// trên đầu file — trước đây mọi message đều gọi thẳng waitDrain() rồi channel.send() không phân
// biệt loại, nên 1 message nhỏ gửi giữa lúc blob đang truyền vẫn phải xếp hàng ngang hàng với
// chunk blob). Tách hàm riêng (nhận `channel` + `serialize` làm tham số) để test được bằng 1
// channel giả, không cần RTCDataChannel thật.
export function createSendQueue(channel, serialize) {
    const high = []
    const low  = []
    let draining = false

    async function drain() {
        if (draining) return
        draining = true
        try {
            while (high.length || low.length) {
                if (channel.readyState !== 'open') break
                await waitDrain(channel)
                if (channel.readyState !== 'open') break // readyState có thể đổi trong lúc chờ drain
                const next = high.shift() ?? low.shift()
                if (!next) break
                channel.send(serialize(next.msg))
                next.resolve()
            }
        } finally {
            draining = false
        }
    }

    return function enqueue(msg) {
        if (channel.readyState !== 'open') return Promise.resolve()
        return new Promise(resolve => {
            (msg instanceof ArrayBuffer ? low : high).push({ msg, resolve })
            drain()
        })
    }
}

/**
 * @param {{ myId: string, onEvent: (msg:any, fromId:string) => void,
 *           onBinary?: (buf: ArrayBuffer, fromId: string) => void,
 *           onLink?: (peerId:string) => void,
 *           onUnlink?: (peerId:string) => void,
 *           onTrack?: (peerId:string, stream: MediaStream) => void }} opts
 */
export function createBayMesh({ myId, onEvent, onBinary, onLink, onUnlink, onTrack }) {
    const links = new Map() // linkId (peerId hoặc `bc:<bayId>`) -> { send(msg), close() }
    const pcs   = new Map() // peerId -> RTCPeerConnection đã link — dùng cho renegotiate call track (sub-project 5)
    let peer = null // instance PeerJS hiện tại — hub (đăng ký myId) hoặc spoke (đăng ký myId, connect ra hub)
    let role = null // 'hub' | 'spoke' | null

    // Rate-limit chung theo volume thô (không phân loại msg.type — mesh.js không biết ngữ
    // nghĩa domain). Vượt ngưỡng -> drop lặng lẽ, không disconnect. Chỉ áp cho message JSON
    // (onEvent) — chunk nhị phân (onBinary) chưa có rate-limit riêng, ngoài phạm vi phase 1.
    const peerBucket = createTokenBucket({ capacity: 40, refillPerSec: 20 })
    function guardedOnEvent(msg, fromId) {
        if (!peerBucket.allow(fromId)) return
        onEvent(msg, fromId)
    }

    function setLink(id, send, close) { links.get(id)?.close?.(); links.set(id, { send, close }) }
    // onUnlink chỉ báo cho peer THẬT (loại `bc:` — BroadcastChannel cùng thiết bị không tính là
    // 1 kết nối) — 1 chỗ duy nhất, dùng chung cho cả 3 nơi gọi dropLink (đóng do channel tự đóng,
    // disconnect() chủ động, closeAll() khi rời bay) nên tầng trên luôn biết NGAY khi mất link,
    // không phải đợi presence broadcast tự hết hạn.
    function dropLink(id) {
        links.delete(id); pcs.delete(id)
        if (!id.startsWith('bc:')) onUnlink?.(id)
    }
    function hasLink(peerId) { return links.has(peerId) }
    function linkedPeers() { return [...links.keys()].filter(id => !id.startsWith('bc:')) }

    // msg = plain object (JSON) hoặc ArrayBuffer (binary chunk, xem encodeChunk/decodeChunk)
    function _serialize(msg) { return msg instanceof ArrayBuffer ? msg : JSON.stringify(msg) }

    /**
     * Flow wire 1 DataChannel đã có (cả invite lẫn accept đều đi qua đây khi peer mới link
     * được): peerId, pc, channel -> void (link sẵn sàng dùng qua `links` Map)
     */
    function wireChannel(peerId, pc, channel) {
        // [3] EXECUTE: Đăng ký handler nhận message, lưu state peer, mở link để gửi — toàn bộ
        // side-effect DataChannel + mesh state mutation
        //   [3.a] WIRE_MESSAGE: Message string -> JSON qua guardedOnEvent (rate-limit + dispatch
        //   theo msg.type ở tầng session.js); binary -> onBinary thẳng (chunk blob, xem
        //   encodeChunk/decodeChunk cuối file). Payload lỗi (JSON.parse throw) bỏ qua lặng lẽ,
        //   không làm rớt link
        channel.binaryType = 'arraybuffer'
        channel.onmessage = e => {
            if (typeof e.data === 'string') {
                try { guardedOnEvent(JSON.parse(e.data), peerId) } catch { /* payload lỗi — bỏ qua */ }
            } else {
                onBinary?.(e.data, peerId)
            }
        }
        channel.onclose = () => dropLink(peerId)
        pcs.set(peerId, pc) // lưu pc cho renegotiate call track (sub-project 5)
        pc.ontrack = e => onTrack?.(peerId, e.streams[0])
        //   [3.b] WIRE_SEND: Gắn send() qua priority queue (createSendQueue — A.3: control message
        //   JSON luôn ưu tiên hơn chunk blob binary đang chờ, xem comment đầu file) và close()
        //   đóng cả channel lẫn pc
        setLink(peerId,
            createSendQueue(channel, _serialize),
            () => { channel.close(); pc.close() },
        )
        //   [3.c] NOTIFY: Báo tầng trên (svc-bay.js) đã có link mới
        onLink?.(peerId)
    }

    // BroadcastChannel — link tức thời giữa các tab/cửa sổ cùng thiết bị, không qua network
    function openBroadcastLink(bayId) {
        const linkId = `bc:${bayId}`
        const bc = new BroadcastChannel(`bay:${bayId}`)
        bc.onmessage = e => {
            const { from, msg } = e.data || {}
            if (!from || from === myId) return
            if (msg instanceof ArrayBuffer) onBinary?.(msg, from)
            else guardedOnEvent(msg, from)
        }
        setLink(linkId, msg => bc.postMessage({ from: myId, msg }), () => bc.close())
        return () => { dropLink(linkId); bc.close() }
    }

    // Attach 1 DataConnection PeerJS đã/sắp `open` vào wireChannel() sẵn có — `.peerConnection`/
    // `.dataChannel` là API public của PeerJS (BaseConnection), nên toàn bộ nửa dưới của file này
    // (backpressure/priority queue/relay/broadcast) dùng lại được 100%, không cần biết PeerJS.
    function _attach(conn) {
        const go = () => wireChannel(conn.peer, conn.peerConnection, conn.dataChannel)
        if (conn.open) go(); else conn.on('open', go)
    }

    // Đăng ký `myId` với PeerServer — idempotent, dùng chung cho cả startHub() lẫn joinHub() (1
    // Peer instance/id duy nhất cho cả phiên, bất kể sau đó đóng vai hub hay spoke). QUAN TRỌNG:
    // startHub()/joinHub() TỪNG tự `new Peer(myId, ...)` riêng — khi _dhStartMeshRole() thử
    // joinHub(hub cũ) trước (đăng ký myId thành công, chỉ phần connect-out tới hub cũ timeout),
    // rồi rơi xuống startHub() thử `new Peer(myId, ...)` LẦN NỮA, id đó đã bị chính peer vừa tạo
    // ở bước joinHub() "chiếm" rồi -> lỗi `unavailable-id` (đúng bug vừa gặp: "ID ... is taken").
    // Tách registration ra 1 hàm riêng, gọi 1 lần duy nhất/phiên, giải quyết tận gốc.
    function _ensurePeer() {
        if (peer) return Promise.resolve()
        return new Promise((resolve, reject) => {
            const p = new Peer(myId, { config: { iceServers: ICE_SERVERS } })
            let done = false
            const timer = setTimeout(() => finish(reject, { type: 'timeout' }), CONNECT_TIMEOUT_MS)
            function finish(fn, arg) {
                if (done) return
                done = true
                clearTimeout(timer)
                p.off('open', onOpen)
                p.off('error', onError)
                fn(arg)
            }
            const onOpen  = () => { peer = p; finish(resolve) }
            const onError = err => { p.destroy(); finish(reject, err) } // đăng ký thất bại — không giữ lại, lần sau tự thử tạo mới
            p.on('open', onOpen)
            p.on('error', onError)
        })
    }

    /**
     * Flow trở thành hub: đảm bảo đã đăng ký `myId` (xem _ensurePeer) rồi bắt đầu nhận connect()
     * từ spoke -> Promise<void>. Reject với err.type nếu đăng ký thất bại ('unavailable-id') hoặc
     * lỗi mạng/broker khác, hoặc timeout.
     */
    async function startHub() {
        await _ensurePeer()
        role = 'hub'
        peer.on('connection', _attach)
    }

    /**
     * Flow join vào hub đã biết: đảm bảo đã đăng ký `myId` rồi connect ra hubPeerId ->
     * Promise<void> (DataConnection đã `open` và wired). Reject với err.type === 'peer-unavailable'
     * nếu hub id không tồn tại/đã chết, hoặc timeout.
     */
    async function joinHub(hubPeerId) {
        await _ensurePeer()
        role = 'spoke'
        // Snapshot cục bộ NGAY sau khi chắc chắn khác null — closeAll() (rời bay/đổi bay trong lúc
        // CONNECT_TIMEOUT_MS=20s này còn đang chờ) null hoá biến `peer` ngoài closure, nhưng
        // Promise + timer bên dưới vẫn còn sống tới lúc reject/resolve. Tham chiếu thẳng `peer`
        // (mutable, ngoài closure) trong finish() từng gây `Cannot read properties of null
        // (reading 'off')` khi timeout bắn ra SAU khi closeAll() đã chạy — dùng `myPeer` để finish()
        // luôn thao tác đúng instance đã đăng ký listener, bất kể `peer` đã đổi/null ở ngoài.
        const myPeer = peer
        return new Promise((resolve, reject) => {
            const conn = myPeer.connect(hubPeerId, { serialization: 'raw', reliable: true })
            let done = false
            const timer = setTimeout(() => finish(reject, { type: 'timeout' }), CONNECT_TIMEOUT_MS)
            function finish(fn, arg) {
                if (done) return
                done = true
                clearTimeout(timer)
                myPeer.off('error', onPeerError)
                conn.off('open', onOpen)
                conn.off('error', onConnError)
                if (fn === reject) conn.close() // dọn DataConnection dở dang (timeout/lỗi) — khỏi treo lửng lơ trong _connections của peer
                fn(arg)
            }
            const onOpen = () => { wireChannel(hubPeerId, conn.peerConnection, conn.dataChannel); finish(resolve) }
            const onConnError = err => finish(reject, err)
            // 'peer-unavailable' (hub id không tồn tại/đã hết hạn trên PeerServer) và vài lỗi
            // tầng broker khác (network, socket-error...) CHỈ emit trên object `peer`, KHÔNG
            // emit trên DataConnection này — PeerJS's `_abort`/`emitError` cho các lỗi đó gọi
            // trên `this` = Peer (xem node_modules/peerjs source: chỉ NegotiationFailed/
            // ConnectionClosed — lỗi ICE — mới emit trên `this.connection`, tức DataConnection).
            // Chỉ nghe conn.on('error') thì promise treo VĨNH VIỄN khi hub id đã chết — đúng bug
            // gây "chat không kết nối" ban đầu.
            const onPeerError = err => finish(reject, err)
            myPeer.on('error', onPeerError)
            conn.on('open', onOpen)
            conn.on('error', onConnError)
        })
    }

    // Trả về Promise (chờ waitDrain() của TỪNG link) — cần cho sendBlob() await giữa các chunk
    // để có backpressure thật (xem waitDrain() đầu file). Nơi gọi không cần await vẫn dùng được
    // như cũ (fire-and-forget), Promise bị bỏ qua vô hại — chat/presence hiện tại không đổi gì.
    function broadcast(msg) { return Promise.all([...links.values()].map(link => link.send(msg))) }
    function send(peerId, msg) { return links.get(peerId)?.send(msg) ?? Promise.resolve() }
    function relay(msg, exceptId) {
        const hop = (msg._hop || 0) + 1
        if (hop > MAX_RELAY_HOPS) return Promise.resolve()
        const forwarded = { ...msg, _hop: hop }
        return Promise.all([...links].filter(([id]) => id !== exceptId).map(([, link]) => link.send(forwarded)))
    }
    // Relay chunk nhị phân (blob/attachment) — chỉ hub gọi hàm này (spoke chỉ có đúng 1 link,
    // forward lại cho chính sender là vô nghĩa), nên không cần hop-count như relay(): dưới star,
    // hub là điểm duy nhất từng relay, spoke không bao giờ relay tiếp -> không thể tạo loop.
    function relayBinary(buf, exceptId) {
        return Promise.all([...links].filter(([id]) => id !== exceptId).map(([, link]) => link.send(buf)))
    }
    function disconnect(id) { links.get(id)?.close?.(); dropLink(id) }
    function closeAll() {
        for (const id of [...links.keys()]) disconnect(id)
        peer?.destroy(); peer = null; role = null
    }
    function getConnection(peerId) { return pcs.get(peerId) || null }

    return {
        openBroadcastLink,
        startHub, joinHub,
        hasLink, linkedPeers,
        getConnection,
        broadcast, send, relay, relayBinary,
        disconnect, closeAll,
        get role() { return role },
    }
}

// ── Binary chunk framing (chuẩn bị cho blob pipeline — sub-project 2) ────────
// [0..26)  blob_id ASCII (ULID, 26 ký tự)
// [26..30) index (uint32 big-endian)
// [30..)   payload bytes

const HEADER_LEN = 30

export function encodeChunk(blobId, index, payloadBuf) {
    const out  = new Uint8Array(HEADER_LEN + payloadBuf.byteLength)
    const view = new DataView(out.buffer)
    for (let i = 0; i < 26; i++) view.setUint8(i, blobId.charCodeAt(i))
    view.setUint32(26, index)
    out.set(new Uint8Array(payloadBuf), HEADER_LEN)
    return out.buffer
}

export function decodeChunk(buf) {
    const view = new DataView(buf)
    let blobId = ''
    for (let i = 0; i < 26; i++) blobId += String.fromCharCode(view.getUint8(i))
    const index   = view.getUint32(26)
    const payload = buf.slice(HEADER_LEN)
    return { blobId, index, payload }
}
