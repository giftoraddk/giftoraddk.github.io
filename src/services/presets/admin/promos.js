// src/services/presets/admin/promos.js
//
// Field phẳng cho <svc-records dataTable='promos'> (auth D1) — mã khuyến mãi. Worker là nơi quyết định: lúc tạo hoá đơn
// nó tra mã theo `code`, kiểm trạng thái / hạn / lượt / đơn tối thiểu rồi tự trừ tiền + cộng `used`
// (auth/worker/src/invoices.ts applyPromo). Giỏ hàng (<svc-cart>) chỉ hiện các mã công khai đang chạy làm gợi ý;
// mã riêng tư chỉ dùng được khi người mua gõ đúng mã.

import { pickTxt } from '@/services/tools/lingo.js';

const TXT = {
    vi: {
        status: 'Trạng thái', code: 'Mã', label: 'Nhãn hiển thị', type: 'Loại giảm', discount: 'Mức giảm',
        quantity: 'Lượt tối đa (0 = không giới hạn)', used: 'Đã dùng', minOrder: 'Đơn tối thiểu', maxDiscount: 'Giảm tối đa (cho %)',
        scope: 'Hiển thị', expires: 'Hết hạn (YYYY-MM-DD)',
        active: 'Đang chạy', inactive: 'Tạm dừng', percent: 'Theo %', fixed: 'Số tiền', public: 'Công khai (gợi ý ở giỏ)', private: 'Riêng tư (gửi riêng)',
    },
    en: {
        status: 'Status', code: 'Code', label: 'Display label', type: 'Discount type', discount: 'Discount',
        quantity: 'Usage limit (0 = unlimited)', used: 'Used', minOrder: 'Minimum order', maxDiscount: 'Max discount (for %)',
        scope: 'Visibility', expires: 'Expires (YYYY-MM-DD)',
        active: 'Active', inactive: 'Paused', percent: 'Percent', fixed: 'Fixed amount', public: 'Public (suggested in cart)', private: 'Private (sent directly)',
    },
};

const money = (v) => (Number(v) > 0 ? Number(v).toLocaleString('vi-VN') : '—');

export default (lang = 'vi') => {
    const t = pickTxt(TXT, lang);
    return [
        {
            label: t.status,
            field: 'status',
            type: 'select',
            width: '120px',
            align: 'center',
            opts: [
                { value: 'active',   label: t.active },
                { value: 'inactive', label: t.inactive },
            ],
            serverExecutor: true,
            filterable: true,
        },
        {
            label: t.code,
            field: 'code',
            type: 'text',
            width: '130px',
            required: true,
            serverExecutor: true,
            searchable: true,
            sortable: true,
        },
        {
            label: t.label,
            field: 'label',
            type: 'text',
            width: '160px',
            required: true,
        },
        {
            label: t.type,
            field: 'type',
            type: 'select',
            width: '110px',
            align: 'center',
            opts: [
                { value: 'percent', label: t.percent },
                { value: 'fixed',   label: t.fixed },
            ],
        },
        {
            label: t.discount,
            field: 'discount',
            type: 'number',
            width: '100px',
            align: 'right',
            required: true,
            render: (v, row) => (row.type === 'percent' ? `${Number(v) || 0}%` : money(v)),
        },
        {
            label: t.quantity,
            field: 'quantity',
            type: 'number',
            width: '90px',
            align: 'center',
            render: (v) => (Number(v) > 0 ? String(v) : '∞'),
        },
        {
            label: t.used,
            field: 'used',
            type: 'number',
            width: '80px',
            align: 'center',
            write: false, // Worker tự cộng lúc tạo hoá đơn
            render: (v) => String(Number(v) || 0),
        },
        {
            label: t.minOrder,
            field: 'minOrder',
            type: 'number',
            width: '110px',
            align: 'right',
            render: money,
        },
        {
            label: t.maxDiscount,
            field: 'maxDiscount',
            type: 'number',
            render: money,
        },
        {
            label: t.scope,
            field: 'scope',
            type: 'select',
            opts: [
                { value: 'public',  label: t.public },
                { value: 'private', label: t.private },
            ],
        },
        {
            label: t.expires,
            field: 'expires_at',
            type: 'text',
        },
    ];
};
