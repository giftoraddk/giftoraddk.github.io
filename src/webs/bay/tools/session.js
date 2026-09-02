// src/webs/bay/tools/session.js
// Trục kiến trúc chính giúp bay "mở rộng được không cần sửa orchestrator": bọc tools/mesh.js
// (transport thuần, chỉ có 1 callback onEvent(msg,fromId) chung) thành 1 pub/sub registry theo
// msg.type. Mọi feature module tương lai (chat/commerce/promo/call — sub-project 2-5) chỉ cần
// `session.on('X_EVENT', handler)` để nhận đúng loại message của mình — không sửa mesh.js,
// không sửa svc-bay.js.
//
// Tạo MỚI mỗi lần mở 1 bay (KHÔNG phải singleton toàn cục) — an toàn nếu sau này cần mở nhiều
// session cùng lúc, không có state global nào bị lẫn giữa 2 session khác nhau.
import { createBayMesh } from './mesh.js'

/**
 * @param {string} myId
 * @param {{ onBinary?: (buf:ArrayBuffer, fromId:string) => void,
 *           onLink?: (peerId:string) => void,
 *           onUnlink?: (peerId:string) => void,
 *           onTrack?: (peerId:string, stream:MediaStream) => void }} [opts]
 */
export function createBaySession(myId, opts = {}) {
    const handlers = new Map() // msgType -> Set<handler>

    const mesh = createBayMesh({
        myId,
        onEvent: (msg, fromId) => handlers.get(msg.type)?.forEach(fn => fn(msg, fromId)),
        onBinary: opts.onBinary,
        onLink:   opts.onLink,
        onUnlink: opts.onUnlink,
        onTrack:  opts.onTrack,
    })

    return {
        // Raw mesh — dùng cho quản lý kết nối (không theo msg.type): openBroadcastLink,
        // createInvite/acceptInvite/completeInvite/cancelInvite, hasLink, getConnection,
        // linkedPeers, closeAll, disconnect.
        mesh,

        /** Đăng ký handler cho 1 loại message — gọi nhiều lần với cùng `type` để nhiều feature
         *  module cùng lắng nghe (vd log + xử lý nghiệp vụ). */
        on(type, handler) {
            if (!handlers.has(type)) handlers.set(type, new Set())
            handlers.get(type).add(handler)
        },

        off(type, handler) {
            handlers.get(type)?.delete(handler)
        },

        /** Gửi 1 message có `type` tới đúng 1 peer. */
        send(peerId, type, payload) {
            mesh.send(peerId, { type, ...payload })
        },

        /** Gửi 1 message có `type` cho mọi peer đang link (kể cả BroadcastChannel cùng thiết bị). */
        broadcast(type, payload) {
            mesh.broadcast({ type, ...payload })
        },

        /** Relay hộ 1 message đã nhận (nguyên bản, giữ msg.type) cho các peer khác — dùng khi
         *  feature module tự dedupe xong và cần lan tiếp trong mesh (multi-hop). */
        relay(msg, exceptId) {
            mesh.relay(msg, exceptId)
        },
    }
}
