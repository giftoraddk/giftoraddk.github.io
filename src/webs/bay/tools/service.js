// src/webs/bay/tools/service.js — domain hub cho bay: bays directory (Firestore), device
// identity, signaling 1-shot offer/answer, presence + chat + blob transfer + commerce
// (sections/sectionItems — IndexedDB db_bay; products lưu Firestore thật, xem tools/bayAdapter.js;
// order/invoice thật thuộc webs/pay, xem docs/PAY.rst). IndexedDB riêng `db_bay`. Chỉ import tầng
// infra chung dùng cho mọi domain (services/*, webs/auth) — xem
// docs/superpowers/specs/2026-07-23-bay-foundation-design.md § Context.

import { createService } from '@/services/crud.js'
import { getFirebaseApp } from '@/services/firestore.js'
import { ulid } from '@/services/helper.js'
import { auth } from '@/webs/auth/tools/service.js'
import { deviceId } from './identity.js'
import {
    putDevice, devicesByBay, putMessage, bayHistory, putBlob, getBlob,
    sectionsByBay, reconcileSections, sectionItemsByBay,
} from './baydb.js'
import { createTokenBucket } from './ratelimit.js'
import { encodeChunk, decodeChunk } from './mesh.js'

export { deviceId }
export { auth }
export { sweepExpired } from './baydb.js'

export const HEARTBEAT_MS      = 5 * 60 * 1000
export const INVITE_TIMEOUT_MS = 20_000
// Chu kỳ gửi lại SYNC_REQUEST cho MỌI peer đang link (không chỉ peer vừa link) — ngắn hơn
// HEARTBEAT_MS để tự phục hồi nhanh nếu 1 relay hop lỡ nhịp giữa 2 peer không link trực tiếp.
export const RECONCILE_MS      = 3 * 60 * 1000

// Số bay tối đa 1 user được tạo — tăng số này lên khi sau này cho phép nhiều bay/user hơn,
// không cần sửa gì khác ở createBay().
export const MAX_BAYS_PER_USER = 1

const _createBayBucket = createTokenBucket({ capacity: 5, refillPerSec: 1 / 120 }) // burst 5, sau đó tối đa 1 bay/2 phút/user

// ── Bays — directory Firestore, chỉ vài field hiển thị + owner_id + signal ──────

// maxCount — trang đầu 1000 row (xem svc-bay-list.js PAGE_SIZE), cuộn tới cuối thì gọi lại với
// maxCount lớn hơn (huỷ listener cũ, subscribe lại) — đơn giản hơn cursor riêng, và listener mới
// vẫn realtime cho toàn bộ danh sách đã tải.
export function listenBays(onNext, onError, maxCount) {
    return createService('bays').listen({ sortBy: 'created_at', order: 'desc', maxCount }, onNext, onError)
}

export async function countOwnedBays(userId) {
    const rows = await createService('bays').findAll({ filters: { owner_id: userId } })
    return rows.length
}

// Bay CHÍNH CHỦ user đang đăng nhập sở hữu (null nếu chưa tạo bay nào) — dùng để mồi sẵn
// phone/địa chỉ của họ vào "Thông tin khách hàng" (svc-pay-customer.js, webs/pay) lúc họ đi MUA ở
// 1 bay khác: 1 người đã đăng ký bay của chính mình (đã xác minh phone lúc tạo) rất có khả năng
// dùng đúng số đó khi là khách mua ở nơi khác — xem svc-bay.js.connectedCallback().
export async function findOwnBay(userId) {
    const rows = await createService('bays').findAll({ filters: { owner_id: userId } })
    return rows[0] ?? null
}

/** Flow tạo bay: CreateBayRequest -> Bay
 *  `id` do caller sinh sẵn (ulid()) và ghi qua svc.set(id, data) thay vì svc.create(data) —
 *  cùng lý do createRoom() ở webs/channel/tools/service.js (đặt sẵn id để dùng làm room_id/bay_id
 *  cho các thao tác đi kèm ngay khi tạo, vd blob avatar ở sub-project sau). */
export async function createBay({ id, title, description = '', tags = '', pics = '', location, phone, momoAccountName = '' }) {
    // [1] CHECK: Validate đăng nhập, dữ liệu bắt buộc và giới hạn tạo bay
    const user = await auth.get()
    if (!user) throw new Error('Chưa đăng nhập')
    const phoneTrimmed    = (phone || '').trim()
    const locationTrimmed = (location || '').trim()
    //   [1.a] IF_INVALID: Thiếu số điện thoại/vị trí bắt buộc
    if (!phoneTrimmed) throw new Error('Cần số điện thoại để xác minh danh tính người tạo bay')
    if (!locationTrimmed) throw new Error('Cần vị trí bay để người khác gần bạn tìm thấy dễ hơn')
    //   [1.b] IF_LIMIT: Rate limit + giới hạn số bay tối đa/user
    if (!_createBayBucket.allow(user.id)) throw new Error('Tạo bay quá nhanh, vui lòng thử lại sau')
    if ((await countOwnedBays(user.id)) >= MAX_BAYS_PER_USER) {
        throw new Error(`Mỗi người chỉ được tạo tối đa ${MAX_BAYS_PER_USER} bay`)
    }
    // [2] PROCESS: Build dữ liệu bay (device info + timestamp)
    const info = _deviceInfo()
    const svc = createService('bays')
    const now = await svc.now()
    const data = {
        owner_id: user.id, title, description, tags, pics, location: locationTrimmed,
        phone: phoneTrimmed, momoAccountName: (momoAccountName || '').trim(),
        device: { id: await deviceId(), name: info.device_name, type: info.device_type, os: info.os, browser: info.browser },
        created_at: now,
    }
    // [3] EXECUTE: Ghi doc bay mới vào Firestore (id do caller sinh sẵn)
    await svc.set(id, data)
    // [4] RETURN: Trả về bay vừa tạo
    return { id, ...data }
}

/** Flow sửa bay: UpdateBayRequest -> Bay
 *  Chỉ chủ bay mới được sửa — tự-vệ phía client (không phải security boundary thật), cùng
 *  nguyên tắc updateRoom() ở channel. */
export async function updateBay(bay, user, { title, description = '', tags = '', pics = '', location, phone, momoAccountName = '' }) {
    // [1] CHECK: Chỉ chủ bay mới được sửa + dữ liệu bắt buộc
    if (!isOwner(bay, user)) throw new Error('Chỉ chủ kênh mới được sửa')
    const locationTrimmed = (location || '').trim()
    const phoneTrimmed = (phone || '').trim()
    if (!locationTrimmed) throw new Error('Cần vị trí kênh để người khác gần bạn tìm thấy dễ hơn')
    if (!phoneTrimmed) throw new Error('Cần số điện thoại liên hệ')
    // [3] EXECUTE + [4] RETURN: Cập nhật doc bay trên Firestore, trả kết quả
    return createService('bays').update(bay.id, {
        title, description, tags, pics, location: locationTrimmed, phone: phoneTrimmed,
        momoAccountName: (momoAccountName || '').trim(),
    })
}

export function isOwner(bay, user) {
    return !!(bay && user && bay.owner_id === user.id)
}

// ── Signaling — KHÔNG còn `signals[]` mailbox. Firestore chỉ giữ đúng 1 field cho biết "peer-id
// nào đang là hub của bay này" (`peer_id`/`peer_id_at`) — offer/answer/ICE đi hết qua PeerServer
// broker của PeerJS (xem tools/mesh.js startHub/joinHub), zero write cho từng cặp peer.

let _db = null
async function _getDb() {
    if (_db) return _db
    const { getFirestore } = await import('firebase/firestore')
    _db = getFirestore(getFirebaseApp('firestore'))
    return _db
}

export function listenBay(bayId, onNext, onError) {
    return createService('bays').listen(
        {},
        rows => onNext(rows.find(r => r.id === bayId) || null),
        onError,
    )
}

// ── Ping — báo tin nhắn riêng cho peer KHÔNG đang link mesh của đúng bay đó (mesh chỉ sống
// cho 1 bay tại 1 thời điểm, xem svc-bay.js._dhOpenBay/_dhLeaveBay). Key theo CẢ (to, from) —
// không phải chỉ `pings.{toDeviceId}` — vì 1 field đơn sẽ bị đè mất nếu 2 sender khác nhau ping
// cùng 1 recipient gần nhau (đúng race mà docs/CHANNEL.rst § 4.4 đã từng vá 1 lần cho `signals`,
// không lặp lại ở đây). Không có clearPing — recipient tự dedupe qua _seenPingIds (svc-bay.js),
// để key cũ nằm im trên doc vô hại, đổi lại bớt hẳn 1 write/ping.
export function writePing(bayId, toDeviceId, fromDeviceId, fromUser) {
    const ping = {
        id: ulid(), to_device_id: toDeviceId, from_device_id: fromDeviceId,
        from_user_id: fromUser.id, from_user_name: fromUser.display_name || fromUser.email,
        created_at: Date.now(),
    }
    return createService('bays').update(bayId, { [`pings.${toDeviceId}.${fromDeviceId}`]: ping })
}

// 1 listener duy nhất cho NHIỀU bay (Firestore `in` tối đa 30 id) — hiệu quả hơn N listener
// riêng lẻ theo từng doc. Dùng thẳng firebase/firestore (không qua crud.js) — where(documentId(),
// 'in', ...) không nằm trong QueryOpts hiện có.
export function listenBayPings(bayIds, onNext) {
    if (!bayIds.length) return () => {}
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
        const { collection, query, where, documentId, onSnapshot } = await import('firebase/firestore')
        const q = query(collection(await _getDb(), 'bays'), where(documentId(), 'in', bayIds.slice(0, 30)))
        const stop = onSnapshot(q, snap => onNext(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        if (cancelled) stop(); else unsub = stop
    })()
    return () => { cancelled = true; unsub() }
}

// ── Device info (suy từ navigator.userAgent) ─────────────────────────────────

function _deviceInfo() {
    const ua = navigator.userAgent || ''
    return {
        device_name: /Tablet|iPad/i.test(ua) ? 'Tablet' : /Mobi|Android/i.test(ua) ? 'Mobile' : 'Desktop',
        device_type: /Tablet|iPad/i.test(ua) ? 'tablet' : /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop',
        os: /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Android/i.test(ua) ? 'Android'
            : /iOS|iPhone|iPad/i.test(ua) ? 'iOS' : /Linux/i.test(ua) ? 'Linux' : '',
        browser: /Edg\//i.test(ua) ? 'Edge' : /Chrome\//i.test(ua) ? 'Chrome' : /Firefox\//i.test(ua) ? 'Firefox'
            : /Safari\//i.test(ua) ? 'Safari' : '',
    }
}

// ── Presence + device info (1 bảng `devices`, IndexedDB db_bay) ──────────────

// user_email denorm giống user_name — nguồn duy nhất để các peer khác biết email của nhau mà
// KHÔNG cần query Firestore project 'auth' (không có quyền đọc hồ sơ người khác, và trái nguyên
// tắc "P2P, Firestore chỉ làm directory" của domain này) — xem _comSellerSlot ở svc-bay-sections.js.
export function makePresence(bayId, myDeviceId, user, status) {
    return {
        device_id: myDeviceId, user_id: user.id, user_name: user.display_name || user.email,
        user_email: user.email || '', user_avatar: user.avatar || '',
        bay_id: bayId, status, last_seen_at: Date.now(),
        ..._deviceInfo(),
    }
}

export function applyPresence(row) {
    return putDevice(row)
}

export function loadDevices(bayId) {
    return devicesByBay(bayId)
}

export function onlinePeers(deviceRows) {
    return deviceRows.filter(r => r.status === 'online' && Date.now() - r.last_seen_at < HEARTBEAT_MS)
}

// ── Hub peer-id (field `peer_id`/`peer_id_at` trên doc bays) ─────────────────

// Ghi ĐÚNG 1 lần lúc `mesh.startHub()` thành công (event-driven, KHÔNG heartbeat định kỳ như
// `touchOwnerOnline` cũ) — đây là toàn bộ những gì Firestore còn cần biết để 1 peer khác join
// được vào mesh của bay này (xem tools/mesh.js joinHub, svc-bay.js._dhStartMeshRole). Field này
// nằm ngay trên doc bay nên svc-bay-list.js (danh sách, chưa mở mesh nào) đọc được qua
// listenBays() để ưu tiên sắp xếp — xem isOwnerOnline(). Đánh đổi đã biết: hub sống lâu hơn
// HEARTBEAT_MS (5 phút) sẽ hiện "offline" trong sort dù vẫn join được tức thời (chỉ cosmetic).
export function writeHubPeerId(bayId, peerId) {
    return createService('bays').update(bayId, { peer_id: peerId, peer_id_at: Date.now() })
}

export function clearHubPeerId(bayId) {
    return createService('bays').update(bayId, { peer_id: null, peer_id_at: 0 })
}

export function isOwnerOnline(bay) {
    return !!bay.peer_id_at && Date.now() - bay.peer_id_at < HEARTBEAT_MS
}

// ── Chat (IndexedDB db_bay, sub-project 2) ────────────────────────────────────

export function history(bayId, since = 0) {
    return bayHistory(bayId, since)
}

/** Flow gửi tin nhắn: (bayId, myDeviceId, user, content, toDeviceId) -> ChatRow
 *  toDeviceId: null = tin nhắn nhóm (broadcast, mọi người thấy) — set = tin nhắn riêng. */
export async function sendMessage(bayId, myDeviceId, user, content, toDeviceId = null) {
    // [2] PROCESS: Build dòng tin nhắn
    const row = {
        id: ulid(), created_at: Date.now(), bay_id: bayId,
        device_id: myDeviceId, user_id: user.id, user_name: user.display_name || user.email,
        user_avatar: user.avatar || '', content, to_device_id: toDeviceId,
    }
    // [3] EXECUTE + [4] RETURN: Ghi vào IndexedDB (chats), trả về dòng đã lưu
    return putMessage(row)
}

export function receiveMessage(row) {
    return putMessage(row)
}

// ── Blob transfer ─────────────────────────────────────────────────────────────

export const CHUNK_SIZE     = 64 * 1024
export const MAX_BLOB_BYTES = 200 * 1024 * 1024 // ~200MB — chặn BLOB_META khai kích thước vô lý

// A.4: chunk nhỏ hơn trên mạng yếu — giảm thời gian mỗi lần waitDrain() (mesh.js) phải chờ giữa
// 2 chunk, để priority queue (A.3) có nhiều cơ hội chen message nhỏ thời gian thực vào hơn. Nhận
// effectiveType làm tham số (thay vì tự đọc navigator bên trong) để test được thuần bằng Node,
// không cần navigator.connection thật.
export function pickChunkSize(effectiveType) {
    if (effectiveType === '2g' || effectiveType === 'slow-2g') return 16 * 1024
    if (effectiveType === '3g') return 32 * 1024
    return CHUNK_SIZE
}

const _blobMetaBucket = createTokenBucket({ capacity: 5, refillPerSec: 1 }) // burst 5, sau đó tối đa 1 luồng blob mới/s/peer
const _incomingBlobs  = new Map() // blob_id -> { meta, chunks: Map<index, ArrayBuffer> }

/**
 * Flow gửi blob qua mesh: (mesh, targetId, bayId, blobId, blob) -> void
 * @param {ReturnType<import('./session.js').createBaySession>['mesh']} mesh
 */
export async function sendBlob(mesh, targetId, bayId, blobId, blob) {
    // [2] PROCESS: Đọc buffer + chọn chunk size theo chất lượng mạng (A.4) + tính số chunk +
    // chọn kênh gửi (unicast hay broadcast)
    const buf   = await blob.arrayBuffer()
    const chunkSize = pickChunkSize(typeof navigator !== 'undefined' ? navigator.connection?.effectiveType : undefined)
    const total = Math.max(1, Math.ceil(buf.byteLength / chunkSize))
    const dispatch = targetId ? msg => mesh.send(targetId, msg) : msg => mesh.broadcast(msg)
    // [3] EXECUTE: Gửi BLOB_META rồi từng chunk qua mesh
    //   [3.a] AWAIT_DRAIN: await từng dispatch() — mesh.send/broadcast() giờ chờ waitDrain()
    //   (mesh.js) trước khi thật sự gửi, nên chunk sau chỉ bắn ra khi SCTP send buffer đã rút
    //   xuống đủ thấp. Quan trọng trên mobile (uplink yếu): không await thì cả trăm chunk bị bơm
    //   liên tiếp vào buffer ngay lập tức, chặn mất các message nhỏ thời gian thực (chat/presence)
    //   gửi CÙNG lúc phải xếp hàng phía sau — cảm giác "đồng bộ chậm" dù kết nối đã thiết lập
    //   xong từ trước. `chunk_size` khai kèm trong BLOB_META để bên nhận validate đúng
    //   (handleBlobMeta bên dưới) — không được giả định CHUNK_SIZE cố định nữa vì giờ có thể nhỏ hơn.
    await dispatch({ type: 'BLOB_META', blob_id: blobId, bay_id: bayId, mime: blob.type, name: blob.name || '', size: buf.byteLength, total_chunks: total, chunk_size: chunkSize })
    for (let i = 0; i < total; i++) {
        await dispatch(encodeChunk(blobId, i, buf.slice(i * chunkSize, (i + 1) * chunkSize)))
    }
}

/** Flow nhận BLOB_META (mở luồng nhận blob mới): (msg, fromId) -> void */
export function handleBlobMeta(msg, fromId) {
    // [1] CHECK: Loại các trường hợp không nên mở luồng nhận mới
    //   [1.a] IF_DUPLICATE: Đã có 1 luồng nhận đang chạy cho blob này — bỏ qua bản sao từ peer khác
    if (_incomingBlobs.has(msg.blob_id)) return
    //   [1.b] IF_RATE_LIMIT: Peer mở quá nhiều luồng blob mới liên tục — drop
    if (!_blobMetaBucket.allow(fromId)) return
    //   [1.c] IF_OVERSIZE: Khai kích thước vô lý — không cấp phát buffer chờ. Dùng chunk_size
    //   THẬT khai trong BLOB_META (A.4 — sender có thể dùng chunk nhỏ hơn CHUNK_SIZE trên mạng
    //   yếu), fallback về CHUNK_SIZE cho peer bản cũ chưa gửi field này.
    if ((msg.total_chunks || 0) * (msg.chunk_size || CHUNK_SIZE) > MAX_BLOB_BYTES) return
    // [3] EXECUTE: Mở entry chờ nhận chunk cho blob này
    _incomingBlobs.set(msg.blob_id, { meta: msg, chunks: new Map() })
}

/** Flow nhận 1 chunk blob: (buf, onComplete) -> void (chỉ thật sự ghi khi đã đủ chunk) */
export async function handleBlobChunk(buf, onComplete) {
    // [2] PROCESS: Giải mã chunk + gom vào entry đang chờ
    const { blobId, index, payload } = decodeChunk(buf)
    const entry = _incomingBlobs.get(blobId)
    //   [2.a] IF_MISSING: Không có entry đang chờ (chưa nhận BLOB_META, hoặc đã bị drop) — bỏ qua
    if (!entry) return
    entry.chunks.set(index, payload)
    //   [2.b] IF_INCOMPLETE: Chưa đủ chunk — chờ tiếp
    if (entry.chunks.size < entry.meta.total_chunks) return
    const ordered = Array.from({ length: entry.meta.total_chunks }, (_, i) => entry.chunks.get(i))
    const blob = new Blob(ordered, { type: entry.meta.mime })
    _incomingBlobs.delete(blobId)
    // [3] EXECUTE: Ghi blob hoàn chỉnh vào IndexedDB + báo callback hoàn tất
    await putBlob({ id: blobId, bay_id: entry.meta.bay_id, mime: entry.meta.mime, name: entry.meta.name, size: entry.meta.size, blob, created_at: Date.now() })
    onComplete?.(blobId, blob)
}

export { getBlob }

// ── Sections (danh sách section của bay — P2P full-snapshot) ─────────────────

export function loadSections(bayId) {
    return sectionsByBay(bayId)
}

/** Tạo 1 dòng section mới — `createdAt` truyền vào khi giữ lại section cũ (sửa mẫu hiển thị,
 *  không phải tạo mới) để không mất mốc tạo ban đầu; bỏ trống thì tự sinh Date.now(). */
export function makeSectionRow(bayId, { id, sectionType, configKey, index, createdAt }) {
    const now = Date.now()
    return {
        id: id ?? ulid(), bay_id: bayId, sectionType, configKey,
        index: index ?? 0, created_at: createdAt ?? now, updated_at: now,
    }
}

export function saveSections(bayId, rows) {
    return reconcileSections(bayId, rows)
}

export function loadSectionItems(bayId) {
    return sectionItemsByBay(bayId)
}
