// src/services/schemas/admin/divisions.js
//
// Field phẳng cho <svc-admin dataTable='divisions'> — chuyên môn thật (meta.steps/meta.output,
// xem hook/superpowers/specs/2026-09-05-division-talk-design.md) KHÔNG có field editor riêng ở
// đây (cấu hình do dev soạn, quá lồng sâu cho web-table's row editor); sửa qua Xuất/Nhập CSV
// (svc-admin.js's _dfExportCsv/_dfImportCsv tự gộp `meta` thành 1 cột JSON khi không có field con
// nào khai `key: 'meta.x'` khớp — xem hook/CRUD.rst).
const TXT = {
    vi: {
        status: 'Trạng thái', title: 'Tên phòng ban', description: 'Mô tả chuyên môn',
        pics: 'Avatar', lang: 'Ngôn ngữ mặc định', ai: 'Model AI riêng (bỏ trống = dùng mặc định)',
        hotline: 'Hotline (chỉ dùng cho Sale — xem hook/SALE.rst)',
        active: 'Đang hoạt động', inactive: 'Tạm ẩn',
    },
    en: {
        status: 'Status', title: 'Division name', description: 'Specialty description',
        pics: 'Avatar', lang: 'Default language', ai: 'AI model override (blank = use default)',
        hotline: 'Hotline (Sale division only — see hook/SALE.rst)',
        active: 'Active', inactive: 'Inactive',
    },
};

export default (lang = 'vi') => {
    const t = TXT[lang] ?? TXT.vi;
    return [
        {
            label: t.status,
            field: 'status',
            type: 'select',
            width: '140px',
            align: 'center',
            opts: [
                { value: 'active',   label: t.active   },
                { value: 'inactive', label: t.inactive },
            ],
            filterable: true,
        },
        {
            label: t.title,
            field: 'title',
            type: 'text',
            width: '180px',
            required: true,
            searchable: true,
            sortable: true,
        },
        {
            label: t.description,
            field: 'description',
            type: 'textarea',
            width: '120px',
        },
        {
            label: t.pics,
            field: 'pics',
            type: 'photor',
        },
        {
            label: t.lang,
            field: 'lang',
            type: 'select',
            width: '140px',
            opts: [
                { value: 'vi', label: 'Tiếng Việt' },
                { value: 'en', label: 'English' },
            ],
        },
        {
            label: t.ai,
            field: 'ai',
            type: 'text',
            width: '160px',
        },
        {
            label: t.hotline,
            field: 'hotline',
            type: 'text',
            width: '140px',
        },
        {
            label: 'Order',
            field: 'index',
            type: 'number',
            width: '45px',
            align: 'center',
            render: (_v, row) => row.index ?? '—',
        },
    ];
};
