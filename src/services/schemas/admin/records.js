import { humanizeLocation } from '@/services/helper.js'

// Schema chung cho MỌI section không phải products (hero/contact/... — xem
// docs/CHANNEL.rst § Section — multi-section) — field theo chuẩn docs/SCHEMA.rst `records`
// (title/subtitle/description/content/pics) thay vì 1 schema riêng/domain (label/address/... cũ).
// Field không có sẵn trong records (subtitle, phone/email/address) lưu qua `meta` (đúng
// convention "Dữ liệu phát sinh theo mode" của records) bằng field/key indirection sẵn có của
// svc-admin (xem products.js `sku`/`unit`/`stock` — cùng pattern `key: 'meta.x'`) — RIÊNG
// `subtitle` là field top-level thật (không qua meta), dùng cho eyebrow label ngắn cạnh title.
//
// `address` dùng type 'location' (web-table.js § _rfField) → form sửa hiện <web-location-map>
// thay vì text input thường, lưu dạng street~ward~region~country~lat~lng (cùng format
// rooms.location, xem docs/CHANNEL.rst § rooms Schema) — 1 field vừa cho địa chỉ hiển thị vừa
// cho toạ độ map thật (contact/modernHoriGoogleMap.js). Áp dụng cho MỌI domain dùng schema
// này (không chỉ contact) vì đây là schema chung — domain không dùng field address không bị
// ảnh hưởng gì (field chỉ hiện khi mở form sửa, không ai gọi tới nếu template không có bit
// 'meta.address'). `render` humanize lại chuỗi tilde thành text đọc được ở cột lưới, khớp
// cách hiển thị ext.location:true dùng trong config (xem web-cell.js/helper.js).
const TXT = {
    vi: {
        title: 'Tiêu đề', subtitle: 'Phụ đề', description: 'Mô tả', content: 'Nội dung', pics: 'Ảnh',
        address: 'Địa chỉ', phone: 'Điện thoại', email: 'Email', order: 'Thứ tự',
    },
    en: {
        title: 'Title', subtitle: 'Subtitle', description: 'Description', content: 'Content', pics: 'Images',
        address: 'Address', phone: 'Phone', email: 'Email', order: 'Order',
    },
}

export default (lang = 'vi') => {
    const t = TXT[lang] ?? TXT.vi
    return [
        { label: t.title, field: 'title', type: 'text', width: '200px', required: true, searchable: true },
        { label: t.subtitle, field: 'subtitle', type: 'text', width: '160px' },
        { label: t.description, field: 'description', type: 'textarea', width: '220px' },
        { label: t.content, field: 'content', type: 'textarea', width: '220px' },
        { label: t.pics, field: 'pics', type: 'photor-upload' },
        { label: t.address, field: 'address', key: 'meta.address', type: 'location', width: '220px', render: (v) => humanizeLocation(v) || '—' },
        { label: t.phone, field: 'phone', key: 'meta.phone', type: 'text', width: '140px' },
        { label: t.email, field: 'email', key: 'meta.email', type: 'text', width: '160px' },
        { label: t.order, field: 'index', type: 'number', width: '70px', align: 'center', render: (_v, row) => row.index ?? '—' },
    ]
}
