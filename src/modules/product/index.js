// Menu khu sản phẩm (/product/*) — mọi trang truyền `menu` bên dưới vào Core.astro: desktop → NavTop (giữa thanh),
// mobile → NavMobile (thanh đáy cố định). Cùng khuôn với modules/post/index.js (text song ngữ, href, iconMobile —
// xem components/Nav/Action/Menu.astro). '#pf-q' = ô tìm kiếm của components/Catalog/Feed.astro (đang ở
// /product/ thì mở ô tìm, không điều hướng). Mua hàng vẫn qua /gift/shop (giỏ hàng client-side).
import { slugify } from '@/services/tools/util';
import { site } from '@/services/tools/site';

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

// ── SEO/GEO các trang /product/* ────────────────────────────────────────────────
// 1 nguồn cho bản SSG lẫn ISR (_render-modes/*.isr.astro) — trang gọi pickLang() lấy đúng ngôn ngữ (site.defaultLang).
// `title` không lặp tên thương hiệu (Head/Base.astro tự nối " • Giftora DDK"); `description` là câu tự đủ nghĩa (AI
// Search trích nguyên câu): bán gì, cho ai, in logo / báo giá / giao hàng.

const brand = site.subtitle;

/** "Sinh Nhật" → "Quà tặng Sinh Nhật"; tag đã là "Quà …" thì giữ nguyên. */
export const giftLabel = (tag) => {
	const slug = slugify(tag);
	return slug === 'qua' || slug.startsWith('qua-') ? tag : `Quà tặng ${tag}`;
};

export const productSeo = {
	list: {
		heading: { en: 'Corporate gifts & products', vi: 'Quà tặng doanh nghiệp' },
		title: { en: 'Corporate Gifts & Custom Logo Products', vi: 'Quà Tặng Doanh Nghiệp & Sản Phẩm In Logo' },
		description: {
			en: `Every corporate gift from ${brand} — gifts for employees, clients, events and Tet, custom logo printing, volume quotes and nationwide delivery. Browse by category, compare prices or search.`,
			vi: `Toàn bộ quà tặng doanh nghiệp của ${brand} — quà nhân viên, khách hàng, sự kiện và quà Tết, in logo theo yêu cầu, báo giá theo số lượng, giao hàng toàn quốc. Xem theo danh mục, so sánh giá hoặc tìm kiếm.`,
		},
	},
	categories: {
		heading: { en: 'Gift categories', vi: 'Danh mục quà tặng' },
		title: { en: 'Corporate Gift Categories', vi: 'Danh Mục Quà Tặng Doanh Nghiệp' },
		description: {
			en: `Every gift category at ${brand}, with the number of products in each — pick by occasion, recipient or product type.`,
			vi: `Tất cả danh mục quà tặng tại ${brand}, kèm số sản phẩm trong từng danh mục — chọn theo dịp, đối tượng nhận hoặc loại sản phẩm.`,
		},
	},
	/** Trang 1 danh mục (tag) — `n` = số sản phẩm. */
	tag: (tag, n) => ({
		heading: { en: tag, vi: giftLabel(tag) },
		title: { en: `${tag} — ${n} custom logo gifts`, vi: `${giftLabel(tag)} — ${n} mẫu in logo theo yêu cầu` },
		description: {
			en: `${n} gifts in "${tag}" at ${brand} — custom logo printing, volume quotes, gift box packing and nationwide delivery.`,
			vi: `${n} mẫu quà thuộc danh mục "${tag}" tại ${brand} — in logo theo yêu cầu, báo giá theo số lượng, đóng gói gift box và giao hàng toàn quốc.`,
		},
	}),
};
