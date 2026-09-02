// src/webs/bay/tools/notify.js
// Browser Notification API only — KHÔNG UnifiedPush/FCM/APNs. Chỉ bắn được khi tab đang mở
// (foreground hoặc background) — không thể đánh thức tab đã đóng/thiết bị offline.

const PREF_KEY = 'bay_notify_enabled'

export function notifySupported() {
    return typeof Notification !== 'undefined'
}

export function notifyEnabled() {
    return notifySupported() && Notification.permission === 'granted' && localStorage.getItem(PREF_KEY) === '1'
}

/** Flow xin quyền notify: user gesture (click) -> granted boolean (đã lưu localStorage) */
export async function requestNotifyPermission() {
    // [1] CHECK: Trình duyệt không hỗ trợ Notification API thì thoát sớm
    if (!notifySupported()) return false
    // [3] EXECUTE: Xin quyền qua Notification API rồi lưu lựa chọn — PHẢI gọi từ 1 user gesture
    //     (click), trình duyệt chặn gọi tự động không có gesture
    //   [3.a] REQUEST: Gọi Notification.requestPermission()
    const perm = await Notification.requestPermission()
    const granted = perm === 'granted'
    //   [3.b] PERSIST: Lưu kết quả vào localStorage để notifyEnabled() đọc lại sau này
    localStorage.setItem(PREF_KEY, granted ? '1' : '0')
    // [4] RETURN: Trả về đã được cấp quyền hay chưa
    return granted
}

export function disableNotify() {
    localStorage.setItem(PREF_KEY, '0')
}

/** Flow bắn notification: title/options -> Notification instance | null */
export function notify(title, options = {}) {
    // [1] CHECK: Chỉ bắn khi đã bật notify VÀ tab không phải đang là tab đang xem (background) —
    //     tab đang focus thì UI tự đủ để biết có tin mới, không cần thêm notification gây phân tâm
    if (!notifyEnabled() || document.visibilityState === 'visible') return null
    // [3] EXECUTE: Tạo notification thật qua Notification API
    const n = new Notification(title, options)
    //   [3.a] ON_CLICK: Focus lại tab và tự đóng notification khi user click vào
    n.onclick = () => { window.focus(); n.close() }
    // [4] RETURN: Trả về instance vừa tạo (null nếu bị chặn ở bước [1])
    return n
}
