// src/webs/division/tools/mind-sync.js
//
// Đồng bộ record thật (products/posts) -> `mind`, 1 SEARCH INDEX (không phải source of truth) theo
// kiến trúc Hybrid Search — xem hook/hybrid-search-product-assistant.md §21 (bản đầy đủ ở các mục
// khác, đây là bản triển khai thực tế trong codebase này). Mỗi entry chỉ giữ `refTable`/`refId`
// (thay `product_id` trong doc gốc) trỏ về record thật + 1 field `text` duy nhất (search
// representation — mục 4 của doc: ưu tiên title/category/summary/tags, KHÔNG đưa price/quantity/
// promotion vào đây vì đổi liên tục — luôn fetch REALTIME thẳng từ refTable lúc trả lời khách, xem
// tools/sale-engine.js's _hydrateRealtime).
//
// Từ hook/firebase-multidomain-ai-rag-spec.md: `mind` sống trong project Firestore RIÊNG
// (server:'llm', env PUBLIC_DB_LLM — xem hook/CRUD.rst "Nhiều kết nối Firestore") tách khỏi mọi
// bảng còn lại, cộng thêm field lọc theo spec (domain/unitType/version/effectiveFrom/effectiveTo/
// authorityLevel — §8/§10/§11) NHƯNG bỏ hẳn phần cần backend (không có project Cloud Function nào
// ở đây): không /domains, /sources, /documents riêng — `domain` chỉ là 1 hằng string (DOMAIN_SALE)
// stamp thẳng vào entry, y hệt cách TABLE_LABELS/TABLE_CATEGORY vốn đã là hằng JS ở file này, để 1
// domain thứ 2 sau này (finance/policy) tái dùng retrieval module (services/mind.js) mà không cần
// thêm hạ tầng gì.
//
// Retrieval hiện là KEYWORD + metadata/temporal/authority (services/mind.js) — KHÔNG vector search:
// đã thử vector search MVP qua embedding NVIDIA NIM nhưng integrate.api.nvidia.com không trả CORS
// header cho request từ browser, mà site này là static (không có backend riêng để proxy), nên bỏ
// nhánh embedding thay vì giữ code chết không chạy được (field `embedding` giữ chỗ, luôn rỗng). Xem
// hook/hybrid-search-product-assistant.md §21.
import { createService } from '@/services/crud.js'

// Nhãn hiển thị theo domain — chỉ dùng để build `text` dễ đọc hơn cho AI, không lưu riêng.
const TABLE_LABELS = { products: 'Sản phẩm', posts: 'Bài viết' }
const TABLE_CATEGORY = { products: 'product', posts: 'post' }

// Domain hằng — Sale là domain DUY NHẤT hiện có (xem lời giải thích ở đầu file). Export để
// admin/mind.astro (nhập CSV, không đi qua hàm nào ở file này) stamp cùng giá trị.
export const DOMAIN_SALE = 'sale'

// Authority baseline theo unitType (rút gọn từ spec §6, 3 mức đủ dùng cho domain Sale): record
// auto-sync (product/post) tự động "recognized", entry curate tay qua CSV (company/policy) là
// nguồn CHÍNH THỨC cao nhất, 'other' thấp nhất (không rõ nguồn gốc).
export const AUTHORITY_BY_UNIT_TYPE = { product: 90, post: 90, company: 100, policy: 100, other: 60 }

// Server name cho `createService` — 1 chỗ duy nhất để đổi nếu sau này cần (xem hook/CRUD.rst).
export const MIND_SERVER = 'llm'

function _plainText(html) {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Ghép record thật (có refTable — products/posts) thành 1 đoạn `text` search-optimized — theo mục
// 4 của hook/hybrid-search-product-assistant.md, KHÔNG đưa giá/tồn kho/khuyến mãi (đọc realtime
// lúc trả lời, xem sale-engine.js).
export function buildSearchText(record, refTable) {
    const label = TABLE_LABELS[refTable] || refTable || ''
    const lines = [
        `TITLE: ${record.title || ''}`,
        label ? `CATEGORY: ${label}` : '',
        record.tags ? `TAGS: ${record.tags}` : '',
        record.description ? `SUMMARY: ${record.description}` : '',
        record.content ? `DETAILS: ${_plainText(record.content).slice(0, 600)}` : '',
    ].filter(Boolean)
    return lines.join('\n')
}

// Ghép entry KHÔNG có refTable (nhập CSV ngoài — mô tả sản phẩm/nội dung 1 nguồn khác, không có
// bảng nào trong app để fetch lại) — không có gì để đọc realtime nên giá/tồn kho/khuyến mãi (nếu
// người nhập có cung cấp) được gộp THẲNG vào text luôn, vì đây là dữ liệu tĩnh.
export function buildExternalSearchText({ title, description, content, tags, pricing, promo, quantity }) {
    const lines = [
        `TITLE: ${title || ''}`,
        tags ? `TAGS: ${tags}` : '',
        description ? `SUMMARY: ${description}` : '',
        content ? `DETAILS: ${_plainText(content).slice(0, 600)}` : '',
        pricing ? `PRICE: ${pricing}` : '',
        promo ? `PROMO: ${promo}` : '',
        quantity ? `STOCK: ${quantity}` : '',
    ].filter(Boolean)
    return lines.join('\n')
}

// Best-effort — lỗi ở đây (vd mất mạng) không được làm hỏng việc tạo/sửa record đã thành công ở
// nơi gọi, nên tự nuốt lỗi + log, không throw. Ghi ĐÈ theo id cố định `${refTable}-${record.id}`
// (idempotent — sync bao nhiêu lần cũng chỉ 1 entry duy nhất). `version` tự tăng dần mỗi lần record
// gốc được sync lại (spec §12 versioning, rút gọn — không cần chuỗi supersedes/effectiveFrom cho
// entry auto-sync vì luôn "hiện hành", chỉ cần biết đã sync lại bao nhiêu lần).
export async function syncMindFromRecord(record, refTable) {
    if (!record?.id) return
    try {
        const svc = createService('mind', '', MIND_SERVER)
        const id = `${refTable}-${record.id}`
        const existing = await svc.findById(id).catch(() => null)
        const now = await svc.now()
        const text = buildSearchText(record, refTable)
        const unitType = TABLE_CATEGORY[refTable] || ''
        await svc.set(id, {
            domain: DOMAIN_SALE, unitType,
            refTable, refId: record.id,
            text,
            version: String((Number(existing?.version) || 0) + 1),
            status: record.status === 'active' ? 'active' : 'inactive',
            effectiveFrom: existing?.effectiveFrom ?? null, effectiveTo: existing?.effectiveTo ?? null,
            authorityLevel: AUTHORITY_BY_UNIT_TYPE[unitType] ?? AUTHORITY_BY_UNIT_TYPE.other,
            embedding: [],
            created_at: existing?.created_at || now, updated_at: now, deleted_at: null,
        })
    } catch (err) {
        console.error('[mind-sync] failed to sync record:', err.message)
    }
}

// Tiện dụng cho các nơi gọi chỉ biết "record này vừa tạo/sửa thuộc bảng nào" (svc-talk.js's
// _dfApprove qua division.meta.output.table, svc-admin.js's _dfSave qua this._table) — tự no-op
// nếu `table` không phải 'products'/'posts' (2 bảng auto-sync hiện hỗ trợ — xem hook/SALE.rst).
export function syncMindFromOutputTable(record, table) {
    if (table !== 'products' && table !== 'posts') return
    return syncMindFromRecord(record, table)
}
