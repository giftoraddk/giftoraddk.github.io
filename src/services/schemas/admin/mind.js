// src/services/schemas/admin/mind.js
//
// Field phẳng cho <svc-admin dataTable='mind' server='llm'> — search index đa domain mà <svc-sale>
// đọc làm ngữ cảnh trả lời khách (xem hook/SALE.rst, hook/firebase-multidomain-ai-rag-spec.md,
// tools/mind-sync.js, services/mind.js). Cấu trúc "index" gốc (refTable/refId thay product_id +
// `text`) cộng thêm field lọc rút gọn từ spec (`domain`/`unitType`/`version`/`effectiveFrom`/
// `effectiveTo`/`authorityLevel` — §8/§10/§11) — KHÔNG có field "raw" nào khác, vẫn KHÔNG có
// embedding thật (field giữ chỗ, luôn rỗng — xem tools/mind-sync.js). `unitType` (đổi tên từ
// `category` cũ) phân loại entry KHÔNG neo `refTable` nào (nhập CSV ngoài).
//
// Entry có `refTable` (products/posts) được ĐỒNG BỘ TỰ ĐỘNG mỗi khi record nguồn được tạo/duyệt/
// sửa — sửa `text`/`authorityLevel` của entry đó ở đây sẽ bị lần sync KẾ TIẾP ghi đè lại (`version`
// tự tăng mỗi lần sync lại, xem tools/mind-sync.js's syncMindFromRecord). Entry không có `refTable`
// (nhập CSV ngoài qua /admin/mind) — admin tự thêm/sửa hoàn toàn tự do, không có gì tự động đụng
// vào, kể cả `effectiveFrom`/`effectiveTo` (cửa sổ hiệu lực — rỗng = luôn áp dụng).
//
// `default` trên 1 số cột (domain/version/authorityLevel) — stamp bởi svc-admin.js's _buildNewDoc
// KHI record tạo qua nút "+ Thêm"/"Nhập CSV" CHUNG (không phải 2 nút chuyên biệt "Nạp lại"/"Nhập
// CSV ngoài" ở mind.astro, vốn đã tự stamp field này trong tools/mind-sync.js) — thiếu `domain` sẽ
// khiến entry đó lẫn vào MỌI domain thay vì chỉ 'sale' khi có domain thứ 2 sau này.
import { DOMAIN_SALE, AUTHORITY_BY_UNIT_TYPE } from '@/webs/division/tools/mind-sync.js';

const TXT = {
    vi: {
        status: 'Trạng thái', unitType: 'Phân loại', refTable: 'Nguồn', domain: 'Domain',
        text: 'Nội dung (AI đọc)',
        version: 'Phiên bản', authorityLevel: 'Độ tin cậy',
        effectiveFrom: 'Hiệu lực từ', effectiveTo: 'Hiệu lực đến',
        active: 'Đang dùng', inactive: 'Tạm ẩn', deprecated: 'Đã lỗi thời',
        catProduct: 'Sản phẩm', catPost: 'Bài viết', catCompany: 'Công ty', catPolicy: 'Chính sách', catOther: 'Khác',
    },
    en: {
        status: 'Status', unitType: 'Type', refTable: 'Source', domain: 'Domain',
        text: 'Content (AI-facing)',
        version: 'Version', authorityLevel: 'Authority',
        effectiveFrom: 'Effective from', effectiveTo: 'Effective to',
        active: 'Active', inactive: 'Inactive', deprecated: 'Deprecated',
        catProduct: 'Product', catPost: 'Post', catCompany: 'Company', catPolicy: 'Policy', catOther: 'Other',
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
                { value: 'active',     label: t.active     },
                { value: 'inactive',   label: t.inactive   },
                { value: 'deprecated', label: t.deprecated },
            ],
            filterable: true,
        },
        {
            // domain — hằng 'sale' (DOMAIN_SALE) cho MỌI entry hiện có; giữ cột hiển thị (thay vì ẩn
            // hẳn như refTable) để dễ nhận biết khi domain thứ 2 xuất hiện sau này — nhưng KHÔNG cho
            // sửa tay (write:false), chỉ tools/mind-sync.js hoặc `default` bên dưới mới set.
            label: t.domain,
            field: 'domain',
            type: 'text',
            width: '90px',
            align: 'center',
            write: false,
            default: DOMAIN_SALE,
            render: (v) => v || '—',
        },
        {
            label: t.unitType,
            field: 'unitType',
            type: 'select',
            width: '140px',
            opts: [
                { value: 'product', label: t.catProduct },
                { value: 'post',    label: t.catPost    },
                { value: 'company', label: t.catCompany },
                { value: 'policy',  label: t.catPolicy  },
                { value: 'other',   label: t.catOther   },
            ],
            filterable: true,
        },
        {
            // refTable — chỉ set bởi tools/mind-sync.js (entry auto-sync), rỗng cho entry nhập CSV
            // ngoài — hiển thị để admin phân biệt "nguồn sống" (sync lại được) với "nhập tay" (không).
            label: t.refTable,
            field: 'refTable',
            type: 'text',
            width: '110px',
            align: 'center',
            write: false,
            render: (v) => v || '—',
        },
        {
            label: t.text,
            field: 'text',
            type: 'textarea',
            width: '280px',
            required: true,
            searchable: true,
            // Preview 1 dòng (bỏ tiền tố "TITLE: ") trong list — form edit vẫn full text nhiều dòng.
            render: (v) => (String(v || '').split('\n')[0] || '').replace(/^TITLE:\s*/, '') || '—',
        },
        {
            label: t.authorityLevel,
            field: 'authorityLevel',
            type: 'number',
            width: '110px',
            align: 'center',
            default: AUTHORITY_BY_UNIT_TYPE.other,
            render: (v) => v ?? '—',
        },
        {
            label: t.version,
            field: 'version',
            type: 'text',
            width: '90px',
            align: 'center',
            write: false,
            default: '1',
            render: (v) => v || '—',
        },
        {
            // Cửa sổ hiệu lực (spec's temporal retrieval) — rỗng = luôn áp dụng. Entry auto-sync
            // (products/posts) luôn để rỗng ở 2 field này (xem tools/mind-sync.js) — chỉ có ý
            // nghĩa cho entry curate tay (company/policy/other, vd khuyến mãi/chính sách có hạn).
            label: t.effectiveFrom,
            field: 'effectiveFrom',
            type: 'datetime',
            width: '150px',
            render: (v) => v || '—',
        },
        {
            label: t.effectiveTo,
            field: 'effectiveTo',
            type: 'datetime',
            width: '150px',
            render: (v) => v || '—',
        },
    ];
};
