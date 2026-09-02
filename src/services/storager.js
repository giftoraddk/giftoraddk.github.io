import localforage from 'localforage'

const DB_NAME    = 'db_webs'
const STORE_NAME = 'items'
const TTL_STD = 24 * 60 * 60 * 1000 // DAY_1

// localforage tự chọn driver tốt nhất còn dùng được (IndexedDB > WebSQL > localStorage) và tự
// rớt xuống driver kế tiếp nếu driver ưu tiên không có/lỗi — đúng tình huống hay gặp trên Safari
// (private mode cũ không có IndexedDB, hoặc IndexedDB lỗi vặt riêng của WebKit). idb/Dexie trước
// đây đều chỉ bọc IndexedDB, không tự chuyển driver khi nó không dùng được.
const _store = localforage.createInstance({ name: DB_NAME, storeName: STORE_NAME })

// IndexedDB (driver mặc định) có thể "blocked" vô thời hạn (never resolve, never reject) nếu 1
// tab/connection cũ còn giữ kết nối lúc cần đổi version — không phải lỗi, không tự timeout. Bất
// kỳ page nào chờ Storager.get() (svc-bay-login.js dò session lúc mount chẳng hạn) sẽ kẹt màn
// hình loading vĩnh viễn nếu không có timeout ở đây. Sau OP_TIMEOUT_MS, coi như "chưa có" (resolve
// undefined) — thao tác thật vẫn có thể xong muộn hơn ở background, vô hại vì đều idempotent.
const OP_TIMEOUT_MS = 4500
function withTimeout(promise) {
    return Promise.race([promise, new Promise(resolve => setTimeout(resolve, OP_TIMEOUT_MS))])
}

let _recoveredInlineKeyError = false // chỉ tự phục hồi 1 lần/phiên — xem catch trong set()

// value có thể mang field Firestore Timestamp/GeoPoint (object có method, vd created_at/
// updated_at stamp qua now() ở svc-admin.js) — IndexedDB structured-clone ném DataCloneError với
// những object này. JSON round-trip tự gọi toJSON() của Timestamp/GeoPoint, quy hết về plain data
// trước khi lưu (xem src/webs/auth/tools/service.js auth.set() — nơi phát hiện lỗi này).
function _put(key, value, ttl) {
    const expires = ttl > 0 ? Date.now() + ttl : null
    const safeValue = JSON.parse(JSON.stringify(value))
    return withTimeout(_store.setItem(key, { value: safeValue, expires }))
}

const Storager = {
    /** Get a value. Returns initialValue if not found or expired. */
    async get(key, initialValue = null) {
        try {
            const item = await withTimeout(_store.getItem(key))
            if (!item) return initialValue
            if (item.expires !== null && Date.now() > item.expires) {
                await this.remove(key)
                return initialValue
            }
            return item.value
        } catch {
            return initialValue
        }
    },

    /** Set a value with optional TTL in ms (default 1 day). Pass ttl=0 for no expiry. */
    async set(key, value, ttl = TTL_STD) {
        try {
            await _put(key, value, ttl)
        } catch (err) {
            // Object store IndexedDB có thể còn sót schema CŨ (inline key) từ 1 phiên bản code
            // trước đó trên cùng origin — IndexedDB không tự nâng cấp schema trừ khi version tăng,
            // nên mọi setItem() sau đó throw đúng DataError "object store uses in-line keys..."
            // MÃI MÃI cho tới khi database bị xoá. Không sửa được schema tại chỗ — chỉ có thể xoá
            // hẳn rồi để localforage tự tạo lại đúng schema, thử lại ĐÚNG 1 LẦN/phiên (guard
            // `_recoveredInlineKeyError`) để tránh vòng lặp vô hạn nếu nguyên nhân không phải do
            // schema cũ (khi đó vẫn rơi xuống console.error như trước).
            if (err?.name === 'DataError' && !_recoveredInlineKeyError) {
                _recoveredInlineKeyError = true
                try {
                    await withTimeout(_store.dropInstance())
                    await _put(key, value, ttl)
                    return
                } catch (retryErr) {
                    console.error('[Storage] set retry after dropInstance failed:', retryErr)
                }
            }
            console.error('[Storage] set error:', err)
        }
    },

    async remove(key) {
        try {
            await withTimeout(_store.removeItem(key))
        } catch (err) {
            console.error('[Storage] remove error:', err)
        }
    },

    async removeAll() {
        try {
            await withTimeout(_store.clear())
        } catch (err) {
            console.error('[Storage] removeAll error:', err)
        }
    },
}

export default Storager
