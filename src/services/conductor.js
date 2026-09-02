/**
 * conductor — state orchestrator duy nhất cho toàn bộ micro services
 *
 * Một nanostores atom chứa tất cả sections. Mỗi service/component
 * chiếm 1 section theo id — không có store riêng lẻ.
 *
 * API:
 *   state     — atom<{ apiUrl, sections: Section[] }>  nguồn sự thật trung tâm
 *   setup     — (initialState, opts?)  → Promise<void>  khởi tạo + merge IndexedDB
 *   all       — (sectionId, opts?)      → Promise<void>  load lần đầu (full hoặc trang 1) → ghi section.data
 *   more      — (sectionId, opts?)      → Promise<void>  load trang kế tiếp (chỉ khi opts.limit)
 *   make      — (sectionId, fields)    → void            upsert section
 *   patch     — (partial)              → void            cập nhật root-level fields
 *   get       — (sectionId)            → Section|null
 *   subscribe — (sectionId, listener)  → unsubFn         lắng nghe 1 section
 *   sift      — (sectionId, params, operator?) → any[]   lọc client-side, không re-fetch
 *
 * Toàn bộ IndexedDB cache + dedup request đi qua crud.js (cacheGet/cacheSet/dedupe) —
 * conductor không import storager.js trực tiếp, giữ đúng layering conductor → crud → IndexedDB.
 */

import { atom } from 'nanostores'
import { createService, loadData, loadKey, cacheGet, cacheSet, dedupe } from '@/services/crud.js'

export const state = atom(/** @type {{ sections?: any[] }} */ ({}))

// Index nội bộ id → section, giữ đồng bộ với state.sections mỗi lần _upsert/setup/patch.
// Cho get()/subscribe() lookup O(1) thay vì .find() qua toàn bộ array mỗi lần gọi.
// state.sections vẫn là array bình thường — public contract { state } không đổi.
let _index = new Map()
const _reindex = (sections) => { _index = new Map(sections.map(s => [s.id, s])) }

// _upsert: tạo mới section nếu chưa có, merge fields nếu đã có.
// Luôn tạo object mới cho section đó → subscribe() phát hiện thay đổi qua reference equality.
function _upsert(sectionId, fields) {
    const cur        = state.get()
    const existing   = _index.get(sectionId)
    const nextSection = existing ? { ...existing, ...fields } : { id: sectionId, ...fields }
    _index.set(sectionId, nextSection)
    state.set({ ...cur, sections: Array.from(_index.values()) })
}

// setup: khởi tạo state từ initialState + merge với bản lưu trong IndexedDB.
// Quan trọng: giữ lại các section đang có trong memory (basket, payment…) mà
// không có trong initialState.sections — tránh bị xóa khi shopSetup chạy lại
// mỗi page navigation với Astro ViewTransitions.
export async function setup(initialState = {}, opts = {}) {
    const { storageKey = 'conductor_config' } = opts

    const saved = await cacheGet(storageKey)

    let sections = initialState.sections ?? []
    if (saved?.sections?.length) {
        // Merge saved overrides vào sections từ initialState
        sections = sections.map(sec => {
            const sv = saved.sections.find(ss => ss.id === sec.id)
            return sv ? { ...sec, ...sv } : sec
        })
    }

    // Preserve các section đang có trong memory (không có trong setup này)
    const existing = state.get().sections ?? []
    const setupIds = new Set(sections.map(s => s.id))
    sections = [...sections, ...existing.filter(s => !setupIds.has(s.id))]

    state.set({ ...initialState, ...saved, sections })
    _reindex(sections)
}

// Chuẩn hóa opts dùng chung giữa all()/more() — url là alias cũ của dataSrc.
function _normalizeOpts(opts) {
    const { url, dataSrc, dataTable = '', cache = 5, limit = 0, filters, server = '' } = opts
    return { src: dataSrc ?? url, dataTable, cache, limit, filters, server }
}

/**
 * Load a section for the first time. Two modes:
 *  - opts.limit không set → tải toàn bộ dataset 1 lần qua crud.loadData (cache IndexedDB bình thường).
 *  - opts.limit có set    → tải trang 1 (hoặc phục hồi từ snapshot đã cache) qua createService(...).findAll().
 *                           Gọi more() để tải các trang tiếp theo — all() chỉ đảm bảo "đã có dữ liệu",
 *                           không tự động advance qua trang khác nếu section đã có data.
 * @param {string} sectionId
 * @param {{ url?:string, dataSrc?:string, dataTable?:string, cache?:number, limit?:number, filters?:object, server?:string }} opts
 *   url/dataSrc — REST endpoint; dataTable — Firestore collection; cache — phút (0 = tắt, mặc định 5)
 *   limit — số item/trang; > 0 bật chế độ phân trang
 *   server — chỉ áp dụng khi đọc Firestore (không có dataSrc): 'firestore' (mặc định) | 'auth' | 'invoices'
 */
export async function all(sectionId, opts = {}) {
    const { src, dataTable, cache, limit, filters, server } = _normalizeOpts(opts)
    if (!src && !dataTable) return

    // State là cache RAM chính — bỏ qua nếu section đã có data (đúng cho cả 2 mode)
    if (get(sectionId)?.data?.length) return

    if (!limit) {
        const data = await loadData({ dataSrc: src ?? '', dataTable, cache, server })
        if (data.length) _upsert(sectionId, { data })
        return
    }

    await _fetchPage(sectionId, { src, dataTable, cache, limit, filters, server })
}

/**
 * Tải trang kế tiếp cho 1 section đang ở chế độ phân trang (đã khởi tạo qua all() với opts.limit).
 * No-op nếu section chưa tồn tại, đang tải dở, hoặc đã hết trang (_hasMore === false).
 * @param {string} sectionId
 * @param {{ url?:string, dataSrc?:string, dataTable?:string, cache?:number, limit:number, filters?:object, server?:string }} opts
 */
export async function more(sectionId, opts = {}) {
    const { src, dataTable, cache, limit, filters, server } = _normalizeOpts(opts)
    if (!limit || (!src && !dataTable)) return

    const cur = get(sectionId)
    if (!cur || cur._loadingMore || cur._hasMore === false) return

    await _fetchPage(sectionId, { src, dataTable, cache, limit, filters, server })
}

// Cache key riêng cho snapshot phân trang — tách khỏi cache "full dataset" của loadData()
// để 1 fetch từng phần không bao giờ bị hiểu nhầm là toàn bộ collection.
const _pageKey = (src, dataTable, server) => loadKey(src, dataTable, server) + ':paged'

// REST — SqlService, phân trang theo page/limit thật.
async function _fetchRestPage(src, dataTable, page, limit, filters) {
    const res = await createService(dataTable, src).findAll({ page, limit, filters })
    return { rows: res.data, hasMore: page < res.totalPages, cursor: null }
}

// Firestore — cursor-based (startAfter theo documentId()). Cursor chỉ lưu document ID
// (string, serialize được) — luôn dùng orderBy mặc định theo documentId() (không forward
// sortBy) nên startAfter(id) hợp lệ, và snapshot phân trang cache được vào IndexedDB.
async function _fetchFirestorePage(dataTable, cursor, limit, filters, server) {
    const res = await createService(dataTable, '', server).findAll({ limit, cursor, filters })
    return { rows: res.data, hasMore: res.hasMore, cursor: res.cursor?.id ?? null }
}

// _fetchPage: dedupe theo sectionId — 2 caller cùng section đang phân trang chỉ tạo 1 fetch,
// tránh race lúc mount đồng thời (trước khi _loadingMore được set) gọi trùng trang.
function _fetchPage(sectionId, params) {
    return dedupe(`page:${sectionId}`, () => _fetchPageImpl(sectionId, params))
}

async function _fetchPageImpl(sectionId, { src, dataTable, cache, limit, filters, server }) {
    const cur = get(sectionId)

    // Mount lần đầu (RAM chưa có gì) — thử phục hồi snapshot đã tải trước đó từ IndexedDB
    if (!cur && cache) {
        const snapshot = await cacheGet(_pageKey(src, dataTable, server))
        if (snapshot?.data?.length) { _upsert(sectionId, snapshot); return }
    }

    _upsert(sectionId, { _loadingMore: true })
    try {
        const page = (cur?._page ?? 0) + 1
        const { rows, hasMore, cursor } = src
            ? await _fetchRestPage(src, dataTable, page, limit, filters)
            : await _fetchFirestorePage(dataTable, cur?._cursor ?? null, limit, filters, server)

        const snapshot = {
            data:    [...(cur?.data ?? []), ...rows],
            _page:   page, _cursor: cursor, _hasMore: hasMore, _loadingMore: false,
        }
        _upsert(sectionId, snapshot)

        if (cache) await cacheSet(_pageKey(src, dataTable, server), snapshot, cache)
    } catch (err) {
        // Quan trọng: phải set _hasMore:false khi lỗi — nếu để undefined, getter phía
        // component (`!== false`) vẫn coi là "còn trang", auto-continue sẽ retry vô hạn
        // ngay lập tức (không backoff) → crash tab.
        console.error('[conductor] paginated fetch failed:', err)
        _upsert(sectionId, { _loadingMore: false, _hasMore: false })
    }
}

// make: upsert section — tạo mới nếu chưa tồn tại, merge fields nếu đã có.
export function make(sectionId, fields) { _upsert(sectionId, fields) }

// patch: cập nhật root-level fields (apiUrl, ui, theme…) — không đụng sections.
// Reindex phòng hờ nếu partial lỡ mang theo `sections` (ngoài contract) — tránh _index
// lệch khỏi state.sections trong trường hợp đó.
export function patch(partial) {
    const next = { ...state.get(), ...partial }
    state.set(next)
    if (partial.sections) _reindex(next.sections)
}

// get: đọc 1 section, trả về null nếu không tồn tại. O(1) qua _index.
export function get(sectionId) {
    return _index.get(sectionId) ?? null
}

// subscribe: lắng nghe thay đổi của 1 section cụ thể.
// Dùng reference equality (next !== prev) — chỉ fire khi section thực sự thay đổi,
// không fire cho mọi state.set() như state.subscribe() thông thường.
// Trả về hàm unsub — gọi trong disconnectedCallback() để tránh memory leak.
export function subscribe(sectionId, listener) {
    let prev = get(sectionId)
    return state.subscribe(() => {
        const next = get(sectionId)
        if (next !== prev) { prev = next; listener(next) }
    })
}

// Cache text đã lowercase cho filter 'q' (full-text) — WeakMap tự GC theo item, tránh
// JSON.stringify lại cùng 1 item mỗi lần sift() chạy (mỗi keystroke tìm kiếm).
const _qCache = new WeakMap()
function _qText(item) {
    let text = _qCache.get(item)
    if (text === undefined) {
        text = JSON.stringify(item).toLowerCase()
        _qCache.set(item, text)
    }
    return text
}

/**
 * Lọc section.data — không thay đổi state.
 * @param {string}              sectionId
 * @param {Record<string, any>} params
 * @param {'absolute'|'like'}   operator
 * @returns {any[]}
 */
export function sift(sectionId, params, operator = 'absolute') {
    const data = get(sectionId)?.data
    if (!Array.isArray(data)) return []

    const entries = Object.entries(params).filter(([, v]) =>
        v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
    )
    if (!entries.length) return data

    return data.filter(item => {
        if (typeof item !== 'object' || item === null) return false
        return entries.every(([k, v]) => {
            if (k === 'q') return _qText(item).includes(String(v).toLowerCase())
            const val = item[k]
            if (Array.isArray(v)) {
                const tags = Array.isArray(val) ? val : (val != null ? [String(val)] : [])
                return v.some(tag => tags.includes(tag))
            }
            return operator === 'like'
                ? String(val ?? '').toLowerCase().includes(String(v).toLowerCase())
                : val === v
        })
    })
}
