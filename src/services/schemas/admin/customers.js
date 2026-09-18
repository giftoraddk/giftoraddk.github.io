// src/services/schemas/admin/customers.js
//
// Field phẳng cho <svc-admin dataTable='customers' server='DB_LLM'> — lead khách vãng lai để lại số
// điện thoại khi chat với <svc-sale> (xem hook/SALE.rst, tools/sale-engine.js's extractPhone,
// svc-sale.js's _dfSaveCustomer). Sống CÙNG project Firestore với `mind` (server 'DB_LLM',
// PUBLIC_DB_LLM — xem hook/CRUD.rst), tách khỏi mọi bảng còn lại của app.
//
// Ghi tự động DUY NHẤT bởi svc-sale.js — admin ở đây CHỈ để xem/tra cứu lại + cập nhật `status`
// theo dõi đã liên hệ hay chưa. Doc id = chính `phone` (idempotent — khách nhắn lại số cũ chỉ cập
// nhật `name`/`topic`/`updated_at`, không tạo trùng bản ghi).
const TXT = {
    vi: {
        status: 'Trạng thái', phone: 'Số điện thoại', name: 'Họ tên', topic: 'Vấn đề quan tâm',
        visitorId: 'Visitor',
        new: 'Chưa liên hệ', contacted: 'Đã liên hệ', closed: 'Đã xong',
    },
    en: {
        status: 'Status', phone: 'Phone', name: 'Name', topic: 'Interested in',
        visitorId: 'Visitor',
        new: 'New', contacted: 'Contacted', closed: 'Closed',
    },
};

export default (lang = 'vi') => {
    const t = TXT[lang] ?? TXT.vi;
    return [
        {
            label: t.status,
            field: 'status',
            type: 'select',
            width: '130px',
            align: 'center',
            opts: [
                { value: 'new',       label: t.new       },
                { value: 'contacted', label: t.contacted },
                { value: 'closed',    label: t.closed    },
            ],
            filterable: true,
        },
        {
            // phone — chính là doc id (xem svc-sale.js's _dfSaveCustomer), không cho sửa tay để
            // tránh lệch khỏi id thật của record.
            label: t.phone,
            field: 'phone',
            type: 'text',
            width: '140px',
            write: false,
            searchable: true,
            sortable: true,
        },
        {
            label: t.name,
            field: 'name',
            type: 'text',
            width: '160px',
            searchable: true,
            render: (v) => v || '—',
        },
        {
            label: t.topic,
            field: 'topic',
            type: 'textarea',
            width: '260px',
            render: (v) => v || '—',
        },
        {
            // visitorId — định danh khách vãng lai; lịch sử chat thật KHÔNG còn ở Firestore (chỉ
            // cache IndexedDB, TTL 1 ngày, phía trình duyệt của khách — xem svc-sale.js), nên
            // không thể đối chiếu lại từ admin sau khi hết hạn/đổi máy.
            label: t.visitorId,
            field: 'visitorId',
            type: 'text',
            width: '110px',
            write: false,
            render: (v) => v || '—',
        },
    ];
};
