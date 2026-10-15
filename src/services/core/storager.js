import localforage from 'localforage'

const DB_NAME = 'conductor'
const STORE = 'cache'

// localforage tự chọn driver tốt nhất còn dùng được (IndexedDB > WebSQL > localStorage) và tự rớt
// xuống driver kế tiếp nếu driver ưu tiên không có/lỗi — đúng tình huống hay gặp trên Safari
// (private mode cũ không có IndexedDB, hoặc IndexedDB lỗi vặt riêng của WebKit). Raw IndexedDB
// (bản trước đây) không tự chuyển driver khi nó không dùng được, nên request treo hoặc reject thẳng.
const _store = localforage.createInstance({ name: DB_NAME, storeName: STORE })

// IndexedDB (driver mặc định) có thể "blocked" vô thời hạn nếu 1 tab/connection cũ còn giữ kết
// nối lúc cần đổi version — không timeout tự nhiên. Sau OP_TIMEOUT_MS coi như "chưa có" để caller
// (conductor.all()) không kẹt vĩnh viễn; thao tác thật vẫn có thể xong muộn hơn ở background.
const OP_TIMEOUT_MS = 4500
function withTimeout(promise) {
    return Promise.race([promise, new Promise(resolve => setTimeout(resolve, OP_TIMEOUT_MS))])
}

export async function cacheGet(key) {
    try {
        const value = await withTimeout(_store.getItem(key))
        return value ?? null
    } catch {
        return null
    }
}

export async function cacheSet(key, value) {
    // value có thể mang field không structured-clone được (vd Firestore Timestamp/GeoPoint dạng
    // object có method) — JSON round-trip quy hết về plain data trước khi lưu, tránh DataCloneError.
    const safeValue = JSON.parse(JSON.stringify(value))
    await withTimeout(_store.setItem(key, safeValue))
}

export async function cacheRemove(key) {
    try { await withTimeout(_store.removeItem(key)) } catch {}
}

const _inflight = new Map()

/** Collapses concurrent calls for the same key into one in-flight promise. */
export function dedupe(key, fn) {
    if (_inflight.has(key)) return _inflight.get(key)
    const promise = fn().finally(() => _inflight.delete(key))
    _inflight.set(key, promise)
    return promise
}
