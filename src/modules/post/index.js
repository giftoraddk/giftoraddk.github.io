// Menu khu bài viết (/post/*) — mọi trang truyền `menu` bên dưới vào Core.astro: desktop → NavTop (giữa thanh),
// mobile → NavMobile (thanh đáy cố định). Cùng định dạng với menuItems của
// modules/gift/shop.js (text song ngữ, href, iconMobile — xem components/Nav/Action/Menu.astro).
// '#pf-q' = ô tìm kiếm của components/Catalog/Feed.astro (đang ở /post/ thì mở ô tìm, không điều hướng).
export const menuItems = [
	{ text: { en: 'Home', vi: 'Trang chủ' }, href: '/', iconMobile: 'ri:home-5-line' },
	{ text: { en: 'Posts', vi: 'Bài viết' }, href: '/post/', iconMobile: 'ri:article-line' },
	{ text: { en: 'Topics', vi: 'Chủ đề' }, href: '/post/tag/', iconMobile: 'ri:price-tag-3-line' },
	{ text: { en: 'Search', vi: 'Tìm kiếm' }, href: '/post/#pf-q', iconMobile: 'ri:search-line' },
];

// position 'default' = slot giữa của Nav/Top.astro; variant 'minimal' = thanh không viền hoà vào glow tints,
// mục đang mở: chữ đậm + chấm tròn gradient tints bên dưới (menu.css .menu-minimal) thay cho gạch chân.
export const menu = { type: 'top', position: 'default', variant: 'minimal', menuItems };

// Cặp màu layout (Core.astro `tints`, cùng định dạng svc-node) cho mọi trang /post/* — có tints thì
// Core tắt svc-underlay; components/Catalog/catalog.css lấy cặp này làm màu mặc định (--layout-tint-a/b).
export const tints = ['success', 'info'];
