import { atom } from 'nanostores'
import { cacheGet, cacheSet } from './storager.js'
import { loadData, loadKey, createService, dedupe, cacheGet as _pageCacheGet, cacheSet as _pageCacheSet } from './crud.js'
import { publish, registerChannel } from './bus.js'

export const state = atom({ sections: [] })

const _index = new Map()

// Luôn index TRƯỚC state.set — listener nanostores chạy đồng bộ trong set(), get() phải thấy bản mới.
function _reindex(sections) {
    _index.clear()
    for (const section of sections ?? []) _index.set(section.id, section)
}

function _stateChannel(sectionId) {
    const name = `state:${sectionId}`
    registerChannel(name)
    return name
}

function _upsert(sectionId, fields) {
    const current = state.get()
    const sections = current.sections ?? []
    const idx = sections.findIndex((s) => s.id === sectionId)
    const nextSection = idx >= 0 ? { ...sections[idx], ...fields, id: sectionId } : { id: sectionId, ...fields }
    const nextSections = idx >= 0
        ? sections.map((s, i) => (i === idx ? nextSection : s))
        : [...sections, nextSection]
    _index.set(sectionId, nextSection)
    state.set({ ...current, sections: nextSections })
    publish(_stateChannel(sectionId), nextSection)
}

export async function setup(initialState = {}, opts = {}) {
    const cacheKey = opts.cacheKey ?? 'conductor_config'
    const cached = await cacheGet(cacheKey).catch(() => null)
    const current = state.get()
    const incomingIds = new Set((initialState.sections ?? []).map((s) => s.id))
    const preserved = (current.sections ?? []).filter((s) => !incomingIds.has(s.id))
    const merged = (initialState.sections ?? []).map((s) => {
        const override = cached?.sections?.find((c) => c.id === s.id)
        return override ? { ...s, ...override } : s
    })
    const sections = [...merged, ...preserved]
    _reindex(sections)
    state.set({ ...current, ...initialState, sections })
    if (opts.persist !== false) await cacheSet(cacheKey, { sections: merged }).catch(() => {})
}

export function make(sectionId, fields = {}) {
    _upsert(sectionId, fields)
}

export function patch(sectionId, partial = {}) {
    const existing = get(sectionId) ?? { id: sectionId }
    _upsert(sectionId, { ...existing, ...partial })
}

export function get(sectionId) {
    return _index.get(sectionId) ?? null
}

export function subscribe(sectionId, listener) {
    let prev = get(sectionId)
    return state.subscribe(() => {
        const next = get(sectionId)
        if (next !== prev) {
            prev = next
            listener(next)
        }
    })
}

export function sift(sectionId, params = {}, operator = 'absolute') {
    const data = get(sectionId)?.data ?? []
    const { q, tags } = params
    return data.filter((item) => {
        if (tags?.length && !tags.every((t) => item.tags?.includes(t))) return false
        if (q) {
            const text = JSON.stringify(item).toLowerCase()
            const needle = q.toLowerCase()
            return operator === 'like' ? text.includes(needle) : text === needle
        }
        return true
    })
}

// Cache key riêng cho snapshot phân trang — tách khỏi cache "full dataset" của loadData()
// để 1 fetch từng phần không bao giờ bị hiểu nhầm là toàn bộ table.
const _pageKey = (src, dataTable, server) => loadKey(src, dataTable, server) + ':paged'

function _fetchPage(sectionId, params) {
    return dedupe(`page:${sectionId}`, () => _fetchPageImpl(sectionId, params))
}

// TableService.findAll() trả row[] thuần, SqlService.findAll() trả PaginatedResult — chuẩn hoá cả 2
// về { rows, hasMore } ở đây (adapter Worker hỗ trợ page+limit nên cả 2 đều page-based).
async function _fetchPageImpl(sectionId, { src, dataTable, cache, limit, filters, server }) {
    const cur = get(sectionId)

    // Mount lần đầu (RAM chưa có gì) — thử phục hồi snapshot đã tải trước đó từ IndexedDB
    if (!cur && cache) {
        const snapshot = await _pageCacheGet(_pageKey(src, dataTable, server))
        if (snapshot?.data?.length) { _upsert(sectionId, snapshot); return }
    }

    _upsert(sectionId, { _loadingMore: true })
    try {
        const page = (cur?._page ?? 0) + 1
        const res  = await createService(dataTable, src, server).findAll({ page, limit, filters })
        const rows = Array.isArray(res) ? res : res.data
        const hasMore = Array.isArray(res) ? rows.length >= limit : page < res.totalPages

        const snapshot = {
            data: [...(cur?.data ?? []), ...rows],
            _page: page, _hasMore: hasMore, _loadingMore: false,
        }
        _upsert(sectionId, snapshot)
        if (cache) await _pageCacheSet(_pageKey(src, dataTable, server), snapshot, cache)
    } catch (err) {
        // Quan trọng: phải set _hasMore:false khi lỗi — để undefined thì getter phía component
        // (`!== false`) vẫn coi là "còn trang", auto-continue sẽ retry vô hạn ngay lập tức.
        console.error('[conductor] paginated fetch failed:', err)
        _upsert(sectionId, { _loadingMore: false, _hasMore: false })
    }
}

/**
 * Load a section for the first time.
 *   opts.limit không set → tải toàn bộ dataset 1 lần qua crud.loadData (cache IndexedDB).
 *   opts.limit có set    → tải trang 1 (hoặc phục hồi snapshot đã cache) qua createService().findAll().
 *                          Gọi more() để tải các trang tiếp theo.
 * @param {string} sectionId
 * @param {{ dataSrc?:string, dataTable?:string, cache?:number, limit?:number, filters?:object, server?:string, force?:boolean }} opts
 */
export async function all(sectionId, opts = {}) {
    const { dataSrc = '', dataTable = '', cache = 5, limit = 0, filters, server = '' } = opts
    if (!dataSrc && !dataTable) return get(sectionId)?.data ?? []
    if (!opts.force && get(sectionId)?.data?.length) return get(sectionId).data

    if (!limit) {
        const data = await loadData({ dataSrc, dataTable, cache, server })
        if (data.length) _upsert(sectionId, { data, _page: 1, _hasMore: false })
        return data
    }

    await _fetchPage(sectionId, { src: dataSrc, dataTable, cache, limit, filters, server })
    return get(sectionId)?.data ?? []
}

/**
 * Tải trang kế tiếp cho 1 section đang ở chế độ phân trang (đã khởi tạo qua all() với opts.limit).
 * No-op nếu section chưa tồn tại, đang tải dở, hoặc đã hết trang (_hasMore === false).
 * @param {string} sectionId
 * @param {{ dataSrc?:string, dataTable?:string, cache?:number, limit:number, filters?:object, server?:string }} opts
 */
export async function more(sectionId, opts = {}) {
    const { dataSrc = '', dataTable = '', cache = 5, limit = 0, filters, server = '' } = opts
    if (!limit || (!dataSrc && !dataTable)) return get(sectionId)?.data ?? []

    const cur = get(sectionId)
    if (!cur || cur._loadingMore || cur._hasMore === false) return cur?.data ?? []

    await _fetchPage(sectionId, { src: dataSrc, dataTable, cache, limit, filters, server })
    return get(sectionId)?.data ?? []
}
