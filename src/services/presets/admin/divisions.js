// src/services/presets/admin/divisions.js
//
// Field phẳng cho <svc-resources dataTable='divisions'> — chỉ "face" của phòng ban (tên, mô tả, avatar, ngôn ngữ, bật/tắt,
// thứ tự). Chuyên môn (override patch trong `meta`) KHÔNG sửa ở đây: Worker giấu + khoá cột meta/ai trên /v1/data
// (tablePolicy privateCols/lockedCols) — persona sửa trong <svc-division>, các bước là code ở Worker (fn/base, fn/sectors).

import { pickTxt } from '@/services/tools/lingo.js';

const TXT = {
    vi: {
        status: 'Trạng thái', title: 'Tên phòng ban', description: 'Mô tả chuyên môn',
        pics: 'Avatar', lang: 'Ngôn ngữ mặc định',
        active: 'Đang hoạt động', inactive: 'Tạm ẩn',
    },
    en: {
        status: 'Status', title: 'Division name', description: 'Specialty description',
        pics: 'Avatar', lang: 'Default language',
        active: 'Active', inactive: 'Inactive',
    },
};

export default (lang = 'vi') => {
    const t = pickTxt(TXT, lang);
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
            label: 'Order',
            field: 'rank', // tools/rank.js — chỉ hiển thị (không type → không vào form), đổi bằng kéo-thả
            width: '45px',
            align: 'center',
            render: (_v, row) => row.rank || '—',
        },
    ];
};
