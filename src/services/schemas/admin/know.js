// src/services/schemas/admin/know.js
//
// Field phẳng cho <svc-admin dataTable='know' server='DB_LLMD1'> — kho tri thức đa lĩnh vực
// (hook/knowledge_database_cloudflare_d1_vectorize.md) mà <svc-aide> đọc làm ngữ cảnh trả lời khách,
// qua semantic search server-side — xem worker/packages/llm-worker/src/search.ts (POST /v1/search), không đọc bảng
// này trực tiếp từ client nữa. `type` để TEXT TỰ DO (không ép enum) — đúng tinh thần file md's §24
// "Multi-domain — không thay đổi schema"; `opts` dưới đây chỉ là shortcut UI cho filter nhanh 6 loại
// phổ biến, KHÔNG giới hạn giá trị admin có thể gõ qua ô tìm kiếm/form sửa.
// `description` (không phải `content`) là cột nội dung chính — xem know-sync.js's buildKnowContent.
//
// `meta` KHÔNG hiện thành 1 field JSON thô — tách từng field con qua `key: 'meta.xxx'`, ĐÚNG pattern
// products.js đã dùng cho meta.sku/meta.unit/meta.stock (xem services/schemas/admin/products.js).
// Các key dưới đây khớp CHÍNH XÁC những gì know-sync.js's buildKnowMeta() thực sự ghi — tags (mọi
// type), pricing/promo/quantity (type='product'), risk/decision (type='finance'); field không áp
// dụng cho type của 1 row cụ thể thì đơn giản để trống, cùng cách products.js's sku/unit/stock vẫn
// hiện cho mọi sản phẩm dù không phải món nào cũng cần điền.
const TXT = {
    vi: {
        status: 'Trạng thái', type: 'Loại', title: 'Tiêu đề', content: 'Nội dung',
        version: 'Phiên bản',
        active: 'Đang dùng', draft: 'Nháp',
        tLaw: 'Luật', tProduct: 'Sản phẩm', tMedical: 'Y khoa', tTechnical: 'Kỹ thuật', tFinance: 'Tài chính', tFaq: 'FAQ',
        tags: 'Tags', price: 'Giá bán', promo: 'Khuyến mãi', quantity: 'Tồn kho', risk: 'Rủi ro', decision: 'Quyết định',
        segmentHints: 'Giá bán~Giá vốn~Đơn vị', promoHints: 'Giá trị giảm~Loại giảm (fixed hoặc percent)',
    },
    en: {
        status: 'Status', type: 'Type', title: 'Title', content: 'Content',
        version: 'Version',
        active: 'Active', draft: 'Draft',
        tLaw: 'Law', tProduct: 'Product', tMedical: 'Medical', tTechnical: 'Technical', tFinance: 'Finance', tFaq: 'FAQ',
        tags: 'Tags', price: 'Sale price', promo: 'Promotion', quantity: 'Stock', risk: 'Risk', decision: 'Decision',
        segmentHints: 'Price~Cost~Unit', promoHints: 'Discount value~Discount type (fixed or percent)',
    },
};

export default (lang = 'vi') => {
    const t = TXT[lang] ?? TXT.vi;
    return [
        {
            label: t.status,
            field: 'status',
            type: 'select',
            width: '110px',
            align: 'center',
            default: 'active',
            opts: [
                { value: 'active',   label: t.active   },
                { value: 'draft',    label: t.draft    },
            ],
            filterable: true,
        },
        {
            // Select với opts gợi ý — text tự do vẫn được vì <web-select> đi kèm không ràng buộc
            // giá trị ngoài danh sách khi gõ trực tiếp qua ô tìm kiếm (searchable bên dưới).
            label: t.type,
            field: 'type',
            type: 'select',
            width: '130px',
            opts: [
                { value: 'law',       label: t.tLaw },
                { value: 'product',   label: t.tProduct },
                { value: 'medical',   label: t.tMedical },
                { value: 'technical', label: t.tTechnical },
                { value: 'finance',   label: t.tFinance },
                { value: 'faq',       label: t.tFaq },
            ],
            filterable: true,
            searchable: true,
        },
        {
            label: t.title,
            field: 'title',
            type: 'text',
            width: '220px',
            required: true,
            searchable: true,
            sortable: true,
        },
        {
            label: t.content,
            field: 'description',
            type: 'textarea',
            width: '320px',
            required: true,
            searchable: true,
        },
        {
            label: t.tags,
            field: 'tags',
            key: 'meta.tags',
            type: 'text',
            width: '160px',
            multi: true,
            render: (v) => v || '—',
        },
        {
            label: t.price,
            field: 'pricing',
            key: 'meta.pricing',
            type: 'text',
            width: '140px',
            align: 'right',
            segments: 3,
            segmentHints: t.segmentHints,
            currency: true, // 2 phần đầu (giá bán/giá vốn) là tiền đồng VN — xem products.js's cùng field
            render: (v) => {
                const p = String(v || '').split('~')[0];
                return p ? Number(p).toLocaleString('vi-VN') + ' đ' : '—';
            },
        },
        {
            label: t.promo,
            field: 'promo',
            key: 'meta.promo',
            type: 'text',
            width: '140px',
            align: 'right',
            segments: 2,
            segmentHints: t.promoHints,
            render: (v) => {
                const [discount, type] = String(v || '').split('~');
                if (!discount || Number(discount) <= 0) return '—';
                return type === 'percent' ? `${discount}%` : Number(discount).toLocaleString('vi-VN') + ' đ';
            },
        },
        {
            label: t.quantity,
            field: 'quantity',
            key: 'meta.quantity',
            type: 'number',
            width: '90px',
            align: 'right',
        },
        {
            label: t.risk,
            field: 'risk',
            key: 'meta.risk',
            type: 'text',
            width: '140px',
        },
        {
            label: t.decision,
            field: 'decision',
            key: 'meta.decision',
            type: 'text',
            width: '140px',
        },
        {
            label: t.version,
            field: 'version',
            type: 'number',
            width: '90px',
            align: 'center',
            default: 1,
        },
    ];
};
