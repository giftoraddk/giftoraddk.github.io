// src/webs/bay/tools/tour.js
// Nội dung (đa ngôn ngữ) + logic dựng steps cho product tour (web-driver.js) mô tả các khu
// vực chính của svc-bay.js — tách khỏi component để thêm bước mới/dịch thêm ngôn ngữ không
// phải sửa svc-bay.js, cùng nguyên lý tools/service.js là nơi giữ logic, component chỉ gọi.
import { txtLingo } from '@/services/helper.js'

const TXT_STD = {
    vi: {
        title: 'Hướng dẫn sử dụng',
        list: 'Danh sách kênh — tạo kênh mới, hoặc chọn 1 kênh có sẵn để xem. Kênh của bạn luôn lên đầu, kế đến là kênh đang có chủ thực sự online.',
        search: 'Tìm kênh theo tên hoặc mô tả — gõ vào đây để lọc nhanh danh sách.',
        create: 'Tạo kênh mới của riêng bạn — mỗi tài khoản chỉ tạo được số lượng giới hạn, biểu tượng tự mờ đi khi đã đạt mức tối đa.',
        notify: 'Bật/tắt thông báo tin nhắn mới ngay cả khi không mở tab này.',
        tabs: '3 chế độ xem: Tất cả, Gần tôi (theo vị trí), và Ưu tiên (kênh bạn tự đánh dấu).',
        tagFilter: 'Lọc thêm theo hashtag — kết hợp được với bất kỳ tab nào ở trên.',
        theme: 'Đổi giao diện sáng/tối cho toàn bộ trang.',
        sections: 'Khu trưng bày — sản phẩm, giới thiệu, bảng giá, FAQ... kéo-thả tự do, kèm giỏ hàng và trợ lý AI viết nội dung hộ bạn.',
        chat: 'Chat nhóm hoặc nhắn riêng 1-1 với chủ kênh, gửi kèm ảnh/video, gọi audio/video trực tiếp — mọi thứ đều P2P, không qua server.',
    },
    en: {
        title: 'Take a tour',
        list: 'Channel list — create a new channel, or pick an existing one to view. Your own channel always sorts first, then channels whose owner is genuinely online.',
        search: 'Search channels by name or description — type here to filter the list instantly.',
        create: "Create your own new channel — each account has a limit, the icon dims once you've reached it.",
        notify: "Turn new-message notifications on/off, even when this tab isn't open.",
        tabs: '3 view modes: All, Nearby (by location), and Priority (channels you\'ve marked yourself).',
        tagFilter: 'Filter further by hashtag — combines with any tab above.',
        theme: 'Switch the whole site between light/dark theme.',
        sections: 'The storefront — products, intro, pricing, FAQ... freely drag-and-drop, plus a shopping cart and an AI assistant that writes content for you.',
        chat: 'Group chat or 1-1 private messages with the channel owner, send images/video, make audio/video calls — all peer-to-peer, no server involved.',
    },
}

// `svc-bay-list` render THẬT SỰ qua shadow DOM riêng (khác svc-bay.js — light DOM), nên mọi
// selector bên trong nó phải đi qua .shadowRoot mới tới được — không thể query thẳng từ
// document như .bay-list/.bay-feature-slot/.bay-chat (những class đó nằm trên chính host
// element, ở light DOM của svc-bay.js).
const _bayList = () => document.querySelector('svc-bay-list')
const _inBayList = cls => () => _bayList()?.shadowRoot?.querySelector(cls) ?? null

// resolve: string (querySelector thường) hoặc function (tự resolve — bắt buộc cho target nằm
// trong shadow DOM của svc-bay-list, xem comment đầu file). key: field tương ứng trong TXT_STD.
const STEPS_DEF = [
    { resolve: '.bay-list',                            key: 'list',      side: 'right',  align: 'start' },
    { resolve: _inBayList('.byl-search-input'),         key: 'search',    side: 'bottom', align: 'start' },
    { resolve: _inBayList('.byl-create-btn'),           key: 'create',    side: 'bottom', align: 'start' },
    { resolve: _inBayList('.byl-notify-btn'),           key: 'notify',    side: 'bottom', align: 'start' },
    { resolve: _inBayList('.byl-tabs-group'),           key: 'tabs',      side: 'bottom', align: 'start' },
    { resolve: _inBayList('.byl-tag-filter'),           key: 'tagFilter', side: 'bottom', align: 'end' },
    { resolve: '.bay-theme-toggle',                     key: 'theme',     side: 'bottom', align: 'end' },
    { resolve: '.bay-feature-slot',                     key: 'sections',  side: 'bottom', align: 'start' },
    { resolve: '.bay-chat',                             key: 'chat',      side: 'left',   align: 'start' },
]

function _dcResolve(resolve) {
    return typeof resolve === 'function' ? resolve() : document.querySelector(resolve)
}

export function bayTourTitle(lang) {
    return txtLingo(null, TXT_STD, lang).title
}

/**
 * Flow dựng steps cho tour svc-bay: lang -> steps[] (web-driver.js), chỉ gồm mục có mặt lúc gọi
 */
export function buildBayTourSteps(lang) {
    // [1] CHECK: lấy đúng bộ text theo lang, fallback vi
    const t = txtLingo(null, TXT_STD, lang)

    // [2] PROCESS: lọc những mục có element thật trong DOM lúc gọi (kể cả trong shadow DOM)
    const available = STEPS_DEF.filter(s => _dcResolve(s.resolve))

    // [4] RETURN: build đúng shape step của web-driver.js — `element` giữ nguyên string/function,
    // web-driver.js tự gọi lại mỗi lần cần đo vị trí (luôn lấy đúng element hiện tại)
    return available.map(s => ({
        element: s.resolve,
        popover: { title: t.title, description: t[s.key], side: s.side, align: s.align },
    }))
}
