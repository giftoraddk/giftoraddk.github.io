// src/webs/bay/tools/priority.js
// Danh sách bay "Ưu tiên" — sở thích cục bộ theo trình duyệt/thiết bị của user hiện tại,
// KHÔNG ghi vào Firestore (đánh dấu ưu tiên bay của người khác không phải data của bay đó).

const PREF_KEY = 'bay_priority_bays'

export function loadPriorityIds() {
    try {
        return new Set(JSON.parse(localStorage.getItem(PREF_KEY) || '[]'))
    } catch {
        return new Set()
    }
}

/** Bật/tắt 1 bay khỏi danh sách ưu tiên — trả về Set mới (reference khác, để Lit nhận diện thay đổi). */
export function setPriority(bayId, on) {
    const ids = loadPriorityIds()
    if (on) ids.add(bayId)
    else ids.delete(bayId)
    localStorage.setItem(PREF_KEY, JSON.stringify([...ids]))
    return ids
}
