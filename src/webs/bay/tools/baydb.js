// src/webs/bay/tools/baydb.js
// IndexedDB `db_bay` — self-contained, không dùng chung store nào với db_channel/db_chats.
// Version 1: devices (presence). Version 2 (chat + blob): + chats, blobs. Version 3 (commerce):
// + products, sections, sectionItems. Version 4 (promo): + promos. Mỗi sub-project sau bump
// DB_VERSION + thêm store riêng trong onupgradeneeded, không đụng store cũ (xem
// docs/superpowers/specs/2026-07-23-bay-foundation-design.md). `orders`/`invoices` (checkout
// cục bộ dựa trên svc-basket cũ) đã có mặt ở version 3 nhưng KHÔNG còn accessor nào ghi/đọc —
// order/invoice thật giờ thuộc webs/pay (Firestore, xem docs/PAY.rst); DB_VERSION giữ nguyên,
// chỉ ngưng tạo 2 store đó cho cài đặt mới. `products` cùng cảnh ngộ — giờ lưu Firestore thật
// (xem tools/bayAdapter.js), store IndexedDB vẫn khai báo cho tương thích DB_VERSION cũ nhưng
// không còn accessor nào ghi/đọc.

const DB_NAME    = 'db_bay'
const DB_VERSION = 4
const TTL_CHATS_MS   = 7 * 24 * 60 * 60 * 1000  // 7 ngày
const TTL_BLOBS_MS   = 7 * 24 * 60 * 60 * 1000  // 7 ngày
const TTL_DEVICES_MS = 30 * 24 * 60 * 60 * 1000 // 30 ngày

let _db = null
function openDB() {
    if (_db) return _db
    _db = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = e => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('devices')) {
                const devices = db.createObjectStore('devices', { keyPath: 'device_id' })
                devices.createIndex('by_bay', 'bay_id')
            }
            if (!db.objectStoreNames.contains('chats')) {
                const chats = db.createObjectStore('chats', { keyPath: 'id' })
                chats.createIndex('by_bay_created', ['bay_id', 'created_at'])
                chats.createIndex('by_created_at', 'created_at')
            }
            if (!db.objectStoreNames.contains('blobs')) {
                const blobs = db.createObjectStore('blobs', { keyPath: 'id' })
                blobs.createIndex('by_created_at', 'created_at')
            }
            if (!db.objectStoreNames.contains('products')) {
                const products = db.createObjectStore('products', { keyPath: 'id' })
                products.createIndex('by_bay', 'bay_id')
                products.createIndex('by_bay_index', ['bay_id', 'index'])
            }
            if (!db.objectStoreNames.contains('sections')) {
                const sections = db.createObjectStore('sections', { keyPath: 'id' })
                sections.createIndex('by_bay', 'bay_id')
                sections.createIndex('by_bay_index', ['bay_id', 'index'])
            }
            if (!db.objectStoreNames.contains('sectionItems')) {
                const sectionItems = db.createObjectStore('sectionItems', { keyPath: 'id' })
                sectionItems.createIndex('by_bay_section', ['bay_id', 'section_id'])
            }
            // promos — mã khuyến mãi owner tạo trong bay (svc-promo.js), sống cùng bay, không
            // TTL. keyPath compound [bay_id, code] — put() tự upsert đúng theo bay+code.
            if (!db.objectStoreNames.contains('promos')) {
                const promos = db.createObjectStore('promos', { keyPath: ['bay_id', 'code'] })
                promos.createIndex('by_bay', 'bay_id')
            }
        }
        req.onsuccess = e => resolve(e.target.result)
        req.onerror   = e => { _db = null; reject(e.target.error) }
    })
    return _db
}

function tx(storeName, mode) {
    return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName))
}

function req(idbReq) {
    return new Promise((res, rej) => {
        idbReq.onsuccess = () => res(idbReq.result)
        idbReq.onerror   = () => rej(idbReq.error)
    })
}

// ── devices (presence) ────────────────────────────────────────────────────────

export async function putDevice(row) {
    try {
        const store = await tx('devices', 'readwrite')
        await req(store.put(row))
    } catch (err) { console.error('[baydb] putDevice error:', err) }
    return row
}

export async function devicesByBay(bayId) {
    if (!bayId) return []
    try {
        const store = await tx('devices', 'readonly')
        return await req(store.index('by_bay').getAll(bayId))
    } catch { return [] }
}

// ── chats ────────────────────────────────────────────────────────────────────

export async function putMessage(row) {
    try {
        const store = await tx('chats', 'readwrite')
        await req(store.put(row))
    } catch (err) { console.error('[baydb] putMessage error:', err) }
    return row
}

export async function bayHistory(bayId, since = 0) {
    try {
        const store = await tx('chats', 'readonly')
        const range = IDBKeyRange.bound([bayId, since], [bayId, Infinity])
        const rows  = await req(store.index('by_bay_created').getAll(range))
        return rows.sort((a, b) => a.created_at - b.created_at)
    } catch { return [] }
}

// ── blobs ────────────────────────────────────────────────────────────────────

export async function putBlob(row) {
    try {
        const store = await tx('blobs', 'readwrite')
        await req(store.put(row))
    } catch (err) { console.error('[baydb] putBlob error:', err) }
    return row
}

export async function getBlob(id) {
    try {
        const store = await tx('blobs', 'readonly')
        return (await req(store.get(id))) ?? null
    } catch { return null }
}

// ── sections (danh sách section của bay — không TTL, state "sống") ───────────

export async function sectionsByBay(bayId) {
    if (!bayId) return []
    try {
        const store = await tx('sections', 'readonly')
        const rows  = await req(store.index('by_bay').getAll(bayId))
        return rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    } catch { return [] }
}

/** Flow đồng bộ danh sách section: (bayId, rows snapshot) -> rows
 *  Ghi đè toàn bộ danh sách section của 1 bay theo snapshot `rows` — upsert mọi dòng trong
 *  `rows`, đồng thời xóa các dòng cũ của bay này KHÔNG còn trong `rows`. Dùng cho cả 2 chiều:
 *  chủ bay lưu danh sách mới lẫn peer áp SECTIONS_UPDATE nhận được. */
export async function reconcileSections(bayId, rows) {
    try {
        // [2] PROCESS: Đọc section hiện có + tính tập id cần giữ lại từ snapshot
        const store    = await tx('sections', 'readwrite')
        const existing = await req(store.index('by_bay').getAll(bayId))
        const keepIds  = new Set(rows.map(r => r.id))
        // [3] EXECUTE: Upsert mọi dòng trong rows + xóa dòng cũ không còn trong snapshot
        await Promise.all([
            ...rows.map(r => req(store.put(r))),
            ...existing.filter(e => !keepIds.has(e.id)).map(e => req(store.delete(e.id))),
        ])
    } catch (err) { console.error('[baydb] reconcileSections error:', err) }
    // [4] RETURN: Trả lại rows đã ghi
    return rows
}

// ── sectionItems (dữ liệu hero/contact/... theo từng section — products KHÔNG dùng store
// này, lưu Firestore thật, xem tools/bayAdapter.js) ──────────────────────────

export async function sectionItemsBySection(bayId, sectionId) {
    if (!bayId || !sectionId) return []
    try {
        const store = await tx('sectionItems', 'readonly')
        const range = IDBKeyRange.bound([bayId, sectionId], [bayId, sectionId])
        const rows  = await req(store.index('by_bay_section').getAll(range))
        return rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    } catch { return [] }
}

export async function putSectionItem(row) {
    try {
        const store = await tx('sectionItems', 'readwrite')
        await req(store.put(row))
    } catch (err) { console.error('[baydb] putSectionItem error:', err) }
    return row
}

export async function putSectionItems(rows) {
    try {
        const store = await tx('sectionItems', 'readwrite')
        await Promise.all(rows.map(row => req(store.put(row))))
    } catch (err) { console.error('[baydb] putSectionItems error:', err) }
    return rows
}

export async function sectionItemsByBay(bayId) {
    if (!bayId) return []
    try {
        const store = await tx('sectionItems', 'readonly')
        const range = IDBKeyRange.bound([bayId, ''], [bayId, '￿'])
        return await req(store.index('by_bay_section').getAll(range))
    } catch { return [] }
}

// ── promos ────────────────────────────────────────────────────────────────────

export async function putPromo(row) {
    try {
        const store = await tx('promos', 'readwrite')
        await req(store.put(row)) // keyPath [bay_id, code] — upsert tự nhiên, idempotent theo mã
    } catch (err) { console.error('[baydb] putPromo error:', err) }
    return row
}

export async function deletePromo(bayId, code) {
    try {
        const store = await tx('promos', 'readwrite')
        await req(store.delete([bayId, code])) // no-op nếu mã không tồn tại
    } catch (err) { console.error('[baydb] deletePromo error:', err) }
}

export async function promosByBay(bayId) {
    if (!bayId) return []
    try {
        const store = await tx('promos', 'readonly')
        return await req(store.index('by_bay').getAll(bayId))
    } catch { return [] }
}

/** Flow tăng lượt dùng mã khuyến mãi: (bayId, code) -> void */
export async function bumpPromoUsage(bayId, code) {
    try {
        const store = await tx('promos', 'readwrite')
        const row   = await req(store.get([bayId, code]))
        // [1] CHECK: No-op nếu mã theo [bay_id, code] không tồn tại (đã bị owner xoá)
        if (!row) return
        // [2] PROCESS: Tăng used lên 1
        // [3] EXECUTE: Ghi lại record đã cập nhật
        await req(store.put({ ...row, used: (row.used ?? 0) + 1 }))
    } catch (err) { console.error('[baydb] bumpPromoUsage error:', err) }
}

// ── TTL sweep ────────────────────────────────────────────────────────────────

function _sweepByIndex(storeName, indexName, cutoff) {
    return tx(storeName, 'readwrite').then(store => new Promise((resolve, reject) => {
        const range = IDBKeyRange.upperBound(cutoff)
        const cursorReq = store.index(indexName).openCursor(range)
        cursorReq.onsuccess = e => {
            const cursor = e.target.result
            if (!cursor) return resolve()
            cursor.delete()
            cursor.continue()
        }
        cursorReq.onerror = () => reject(cursorReq.error)
    }))
}

async function sweepDevices() {
    const store  = await tx('devices', 'readwrite')
    const cutoff = Date.now() - TTL_DEVICES_MS
    await new Promise((resolve, reject) => {
        const cursorReq = store.openCursor()
        cursorReq.onsuccess = e => {
            const cursor = e.target.result
            if (!cursor) return resolve()
            if (cursor.value.last_seen_at < cutoff) cursor.delete()
            cursor.continue()
        }
        cursorReq.onerror = () => reject(cursorReq.error)
    })
}

// blobs — cùng TTL 7 ngày với chat attachment (TTL_BLOBS_MS), TRỪ row có `kind` (đánh dấu dữ
// liệu sống lâu dài của bay, không phải đính kèm chat tạm thời) — vd kind:'avatar' (ảnh đại
// diện bay, xem svc-bay-list.js._dfSaveAvatarBlob). Chỉ blob KHÔNG có field `kind` (chat
// attachment) mới bị quét xoá — cùng nguyên tắc channeldb.js.sweepBlobs().
async function sweepBlobs() {
    const store  = await tx('blobs', 'readwrite')
    const cutoff = Date.now() - TTL_BLOBS_MS
    await new Promise((resolve, reject) => {
        const cursorReq = store.index('by_created_at').openCursor(IDBKeyRange.upperBound(cutoff))
        cursorReq.onsuccess = e => {
            const cursor = e.target.result
            if (!cursor) return resolve()
            if (!cursor.value.kind) cursor.delete()
            cursor.continue()
        }
        cursorReq.onerror = () => reject(cursorReq.error)
    })
}

/** Gọi 1 lần khi svc-bay khởi tạo. products KHÔNG sweep (dữ liệu sống của bay). */
export async function sweepExpired() {
    try {
        await Promise.all([
            _sweepByIndex('chats', 'by_created_at', Date.now() - TTL_CHATS_MS),
            sweepBlobs(),
            sweepDevices(),
        ])
    } catch (err) { console.error('[baydb] sweepExpired error:', err) }
}
