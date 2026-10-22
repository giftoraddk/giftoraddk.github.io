// Menu khu bài viết (/post/*) — mọi trang truyền `menu` bên dưới vào Core.astro: desktop → NavTop (giữa thanh),
// mobile → NavMobile (thanh đáy cố định). Cùng định dạng với menuItems của
// modules/gift/shop.js (text song ngữ, href, iconMobile — xem components/Nav/Action/Menu.astro).
// '#pf-q' = ô tìm kiếm của components/Catalog/Feed.astro (đang ở /post/ thì mở ô tìm, không điều hướng).
import { site } from '@/services/tools/site';

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

// ── SEO/GEO các trang /post/* ───────────────────────────────────────────────────
// Bài viết của giftoraddk.com là cẩm nang chọn quà doanh nghiệp — 1 nguồn cho bản SSG lẫn ISR (_render-modes/*.isr.astro),
// trang gọi pickLang(). `title` không lặp tên thương hiệu (Head/Base.astro tự nối " • Giftora DDK").

const brand = site.subtitle;

export const postSeo = {
	list: {
		heading: { en: 'Corporate gift guides', vi: 'Cẩm nang quà tặng' },
		title: { en: 'Corporate Gift Guides & Ideas', vi: 'Cẩm Nang Quà Tặng Doanh Nghiệp' },
		description: {
			en: `Ideas and tips for choosing gifts for employees, clients and partners by occasion and budget — Tet gift trends, logo printing and gift box packing, from ${brand}.`,
			vi: `Ý tưởng và kinh nghiệm chọn quà tặng nhân viên, khách hàng, đối tác theo dịp và ngân sách — xu hướng quà Tết, in logo và đóng gói gift box, chia sẻ từ ${brand}.`,
		},
	},
	topics: {
		heading: { en: 'Guide topics', vi: 'Chủ đề cẩm nang' },
		title: { en: 'Corporate Gift Guide Topics', vi: 'Chủ Đề Cẩm Nang Quà Tặng' },
		description: {
			en: `Every corporate gift topic covered by ${brand}, with the number of posts in each.`,
			vi: `Tất cả chủ đề cẩm nang quà tặng doanh nghiệp tại ${brand}, kèm số bài viết trong từng chủ đề.`,
		},
	},
	/** Trang 1 chủ đề (tag) — `n` = số bài viết. */
	tag: (tag, n) => ({
		heading: { en: tag, vi: tag },
		title: { en: `${tag} — gift guides`, vi: `${tag} — cẩm nang quà tặng` },
		description: {
			en: `${n} posts about "${tag}": ideas and tips for choosing and giving corporate gifts, from ${brand}.`,
			vi: `${n} bài viết về "${tag}": ý tưởng, kinh nghiệm chọn và tặng quà doanh nghiệp từ ${brand}.`,
		},
	}),
};
