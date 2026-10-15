// Menu khu sản phẩm (/product/*) — mọi trang truyền `menu` bên dưới vào Core.astro: desktop → NavTop (giữa thanh),
// mobile → NavMobile (thanh đáy cố định). Cùng khuôn với modules/post/index.js (text song ngữ, href, iconMobile —
// xem components/Nav/Action/Menu.astro). '#pf-q' = ô tìm kiếm của components/Catalog/Feed.astro (đang ở
// /product/ thì mở ô tìm, không điều hướng). Mua hàng vẫn qua /gift/shop (giỏ hàng client-side).
export const menuItems = [
	{ text: { en: 'Home', vi: 'Trang chủ' }, href: '/', iconMobile: 'ri:home-5-line' },
	{ text: { en: 'Products', vi: 'Sản phẩm' }, href: '/product/', iconMobile: 'ri:gift-2-line' },
	{ text: { en: 'Categories', vi: 'Danh mục' }, href: '/product/tag/', iconMobile: 'ri:price-tag-3-line' },
	{ text: { en: 'Search', vi: 'Tìm kiếm' }, href: '/product/#pf-q', iconMobile: 'ri:search-line' },
	{ text: { en: 'Shop', vi: 'Cửa hàng' }, href: '/gift/shop', iconMobile: 'ri:shopping-bag-3-line' },
];

// position 'default' = slot giữa của Nav/Top.astro; variant 'minimal' = thanh không viền hoà vào glow tints,
// mục đang mở: chữ đậm + chấm tròn gradient tints bên dưới (menu.css .menu-minimal).
export const menu = { type: 'top', position: 'default', variant: 'minimal', menuItems };

// Cặp màu layout (Core.astro `tints`) cho mọi trang /product/* — xanh lá như tint '#2ebd85' cũ của khu sản phẩm.
export const tints = ['primary', 'secondary'];
