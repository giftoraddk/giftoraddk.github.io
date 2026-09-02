// ── Shop identity ─────────────────────────────────────────────────────────────────
// Gian hàng đơn (không có khái niệm "bay"/multi-tenant như webs/bay) — sellerId cố định 1 chuỗi
// tĩnh thay vì user_id thật. Export ở đây để Shop.astro dùng — "Đơn hàng"/"Thống kê" không còn là
// page riêng, <svc-pay-warden>/<svc-pay-stats> mount thẳng trong Shop.astro (slot "actions" của
// NavBase) — seller luôn là tài khoản admin đăng nhập, buyer là bất kỳ ai KHÔNG phải admin (kể cả
// khách vãng lai chưa đăng nhập), xem script cuối Shop.astro.
export const SHOP_SELLER_ID = 'shop-cafe-abc';
export const SHOP_WALLET = {
    momo: {
        phone:       '0778880799',
        accountName: 'PHAM NGOC ANH DUNG',
        bin:         '971025',
    },
    bank: {
        accountNo:   '01563372001',
        accountName: 'PHAM NGOC ANH DUNG',
        bankName:    'TPBank',
        bin:         '970423',
    },
};
export const SHOP_VIETQR = {
    clientId: '6d04884c-5a4c-4c07-ab9f-a4285b853e2b',
    apiKey:   'a10eeaa5-472b-4c01-bf26-6dcb9adf460e',
};

// ── UI Common ─────────────────────────────────────────────────────────────────────
export const variant = {
    ui:         'spatial',
    theme:      'dark',
    mainColors: '#ffbb24|#de8daf|#8c87b0|#5691c9|#e19d69',
    textColor:  '',
    // input params của getStyleOpts — build lúc runtime, không hardcode object bg đã dựng
    // Không set hueCustom ở đây: getStyleOpts coi hueCustom (0|1) là kill-switch, hễ có giá trị
    // sẽ ép spatial/gradient về false (chế độ flat-card) — nền toàn trang cần blob động.
    bg: {
        rounded: '0', tint: '#ffbb24', blur: true, gradient: true,
        total: 2, blobType: 'circleOverlap', blobMove: 'swap', colorful: false, deg: 0, distance: 86,
    },
}

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
  {
    // support nav of router
    text: 'Sản phẩm', href: '/shop/', iconMobile: 'ri:store-line',
    // sections in router
    sections: [
      {
          id:      'showcaseModernSlideNeat',
          data:    (await import('@/sections/showcase/modernSlideNeat.js')).data,
          config:  (await import('@/sections/showcase/modernSlideNeat.js')).config,
          sort: 0, // nếu không có sort thì hiển thị theo thứ tự trong mảng sections, có sort thì hiển thị theo sort (số nhỏ lên trên)
          col:     '12', // col của section trong 1 row (12 là full, 6 là nửa, 4 là 1/3,...), nếu component có sẵn col thì không cần config nữa
      },
      {
          id:         'productsShopCard',
          zoom:       true, // hiện nút zoom góc trái dưới trên ảnh sản phẩm (web-gallery)
          showSearch: true,
          emptyText:  'Không tìm thấy sản phẩm phù hợp',
          tags:       { filterField: 'tags', filterColor: 'primary', data: [] },
          config:     (await import('@/sections/products/cardBase.js')).config,
          configList: [
              { key: 'card',  config: (await import('@/sections/products/cardBase.js')).config,  label: 'Card' },
              { key: 'cardMaverick', config: (await import('@/sections/products/cardMaverick.js')).config, label: 'Card 2' },
          ],
          sort: 1,
          col:        '12',
          responsive:  true,
          // dataSrc:    '/api/products/',
          dataTable: 'products',
          loadLimit: 9, // 0 = all data , > 0 lazyload data item 
      },
    ]
  },
  // "Đơn hàng"/"Thống kê" ĐÃ BỎ khỏi views — không còn là page/nav-link nào cả.
  // <svc-pay-warden>/<svc-pay-stats> mount thẳng vào slot "actions" của NavBase trong Shop.astro
  // (tự thân là nút tròn + dialog, không cần điều hướng trang), role="seller"|"buyer" gán qua
  // script cuối Shop.astro dựa trên auth.isAdmin().
]

export default {
  variant,
  views
}
