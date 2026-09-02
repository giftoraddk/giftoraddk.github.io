// src/webs/bay/tools/call.js
// Thêm audio/video track vào 1 RTCPeerConnection ĐÃ CÓ SẴN (đã link qua DataChannel) bằng
// renegotiation — không tạo peer connection mới, không đụng gì tới DataChannel đang chạy. SDP
// offer/answer cho renegotiation đi thẳng qua session (session.send/mesh.onEvent), KHÔNG qua
// Firestore `signal` slot — khe đó chỉ dùng để bootstrap link ban đầu, xem tools/mesh.js. Module
// này không biết gì về mesh/protocol/UI — chỉ lo phần WebRTC track, thuần thuật toán nên KHÔNG
// import gì từ webs/channel/tools/call.js (viết lại y hệt vì không có coupling domain nào).

/**
 * Flow bắt đầu cuộc gọi (phía caller chủ động gọi): pc, stream (local media) -> SDP offer
 */
export async function startCall(pc, stream) {
    // [3] EXECUTE: Add track vào pc đã link sẵn (renegotiation, không tạo pc mới) rồi tạo offer
    // qua chính pc đó — SDP đi qua session (mesh.onEvent), KHÔNG qua Firestore signal slot (khe
    // đó chỉ dùng bootstrap link ban đầu, xem tools/mesh.js)
    stream.getTracks().forEach(track => pc.addTrack(track, stream))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // [4] RETURN: SDP offer để tầng trên gửi qua session cho peer
    return pc.localDescription
}

/**
 * Flow trả lời cuộc gọi (phía nhận, sau khi bấm Nhận): pc, offerSdp, stream (local media) -> SDP answer
 */
export async function answerCall(pc, offerSdp, stream) {
    // [3] EXECUTE: Add track cục bộ rồi renegotiate — set remote description (offer) trước, chỉ
    // sau đó mới tạo answer, đúng thứ tự WebRTC yêu cầu
    stream.getTracks().forEach(track => pc.addTrack(track, stream))
    await pc.setRemoteDescription(offerSdp)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    // [4] RETURN: SDP answer để gửi lại cho caller qua session
    return pc.localDescription
}

/**
 * Flow hoàn tất renegotiation (phía caller, sau khi nhận answer): pc, answerSdp -> void (track 2 chiều sẵn sàng)
 */
export async function completeCall(pc, answerSdp) {
    // [3] EXECUTE: Set remote description — renegotiation hoàn tất, track 2 chiều đã sẵn sàng
    await pc.setRemoteDescription(answerSdp)
}

/** Dừng mic/camera cục bộ + rút track khỏi pc — gọi ở CẢ 2 bên khi hangup/decline/busy.
 *  KHÔNG đóng pc (DataChannel/chat vẫn phải sống tiếp sau khi cuộc gọi kết thúc). */
export function endCall(pc, stream) {
    stream?.getTracks().forEach(track => track.stop())
    pc.getSenders().forEach(sender => { if (sender.track) pc.removeTrack(sender) })
}
