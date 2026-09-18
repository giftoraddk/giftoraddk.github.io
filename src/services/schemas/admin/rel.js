// src/services/schemas/admin/rel.js
//
// Field phẳng cho <svc-admin dataTable='rel' server='DB_LLMD1'> — quan hệ giữa 2 `know` entry
// (hook/knowledge_database_cloudflare_d1_vectorize.md §5/§18, xem worker/packages/llm-worker/src/search.ts's
// _expandViaRelations, chạy server-side khi svc-aide.js gọi POST /v1/search). `from_id`/`to_id` là
// text tự do — admin tự gõ id của `know` (xem bảng know
// ngay phía trên cùng trang /admin/knowledge để tra id) — chưa có dynamic-select tra cứu theo
// title (web-table chỉ hỗ trợ `opts` tĩnh, không có kiểu lookup động), để cải thiện sau nếu cần.
// `type` cũng text tự do (part_of/has_symptom/caused_by/related_to/...), cùng tinh thần know.type.
const TXT = {
    vi: { fromId: 'Từ (know.id)', toId: 'Đến (know.id)', type: 'Loại quan hệ', meta: 'Meta (JSON)' },
    en: { fromId: 'From (know.id)', toId: 'To (know.id)', type: 'Relation type', meta: 'Meta (JSON)' },
};

function _renderJson(v) {
    if (!v) return '—';
    try { return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v); } catch { return String(v); }
}

export default (lang = 'vi') => {
    const t = TXT[lang] ?? TXT.vi;
    return [
        {
            label: t.fromId,
            field: 'from_id',
            type: 'text',
            width: '160px',
            required: true,
            searchable: true,
        },
        {
            label: t.toId,
            field: 'to_id',
            type: 'text',
            width: '160px',
            required: true,
            searchable: true,
        },
        {
            label: t.type,
            field: 'type',
            type: 'text',
            width: '140px',
            required: true,
            searchable: true,
            filterable: true,
        },
        {
            label: t.meta,
            field: 'meta',
            type: 'textarea',
            width: '200px',
            render: _renderJson,
        },
    ];
};
