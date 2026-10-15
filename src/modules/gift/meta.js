// src/modules/gift/meta.js — thuần (chỉ đọc services/tools/site.ts, không fetch): meta SEO trang chủ giftoraddk.com và
// /gift/shop, mốc breadcrumb gốc, cùng nhãn nút CTA — script client của trang chủ so `cell-action` với đúng các nhãn này
// mà không kéo theo cấu hình section (modules/gift/index.js dựng section từ đây). sitemap.xml / llms.txt đọc meta ở đây.
import { site } from '@/services/tools/site';
import { company } from '@/modules/company.js';

// Tên miền — URL tuyệt đối trong JSON-LD và `site` của <svc-aide> (kho kiến thức riêng '@giftoraddk.com'). Cùng nguồn
// site.domain (canonical / sitemap) — đổi tên miền thì đổi ở services/tools/site.ts.
export const SITE = site.domain;

// Nội dung gift viết tiếng Việt — mọi trang /gift/* và trang chủ đều index.
export const GIFT_LANG = 'vi';

// Meta trang chủ '/'. `title` không lặp tên thương hiệu — Head/Base.astro tự nối " • Giftora DDK" vào sau.
// giftoraddk.com chỉ bán quà tặng nên trang chính là gốc domain: URL nhận nhiều link + tìm kiếm thương hiệu nhất, và là
// trang AI crawler đọc đầu tiên (chỉ đọc HTML 1 lần, không theo redirect) — /gift chỉ còn chuyển về đây.
export const page = {
	path: '/',
	lang: GIFT_LANG,
	name: site.subtitle,
	title: 'Quà Tặng Doanh Nghiệp Ý Nghĩa, In Logo Theo Yêu Cầu',
	description: 'Giftora DDK cung cấp quà tặng doanh nghiệp in logo theo yêu cầu: quà nhân viên, khách hàng, sự kiện, tri ân và quà Tết. Thiết kế gift box, đóng gói và giao hàng số lượng lớn toàn quốc.',
	indexable: true,
};

// Cửa hàng (giỏ hàng + thanh toán) — pages/gift/shop.astro.
export const shopPage = {
	path: '/gift/shop',
	lang: GIFT_LANG,
	name: 'Cửa hàng Giftora DDK',
	title: 'Quà Tặng Đẹp và Ý Nghĩa Cho Mọi Dịp',
	description: 'Giftora DDK cung cấp quà tặng đẹp, ý nghĩa cho sinh nhật, kỷ niệm, lễ Tết, người yêu, gia đình, bạn bè và đồng nghiệp. Khám phá ngay những món quà tinh tế, phù hợp với từng dịp.',
	indexable: true,
};

// Mốc đầu breadcrumb của mọi trang /gift/*.
export const GIFT_HOME = { name: site.subtitle, path: '/' };

// Zalo của hotline (company.hotline) — kênh báo giá chính của khách doanh nghiệp.
export const ZALO = `https://zalo.me/${company.hotline}`;

// Nút CTA trong các section (web-cell phát `cell-action` với value = chữ trên nút, theo ngôn ngữ đang hiện) → hành động.
// `href` = chuyển trang (http → tab mới); `scroll` = cuộn tới section id; `demo` = mở trợ lý tư vấn góc màn hình.
export const CTA = {
	quote: { label: { vi: 'Nhận báo giá qua Zalo', en: 'Get a quote on Zalo' }, href: ZALO },
	shop: { label: { vi: 'Xem cửa hàng', en: 'Visit the shop' }, href: shopPage.path },
	advisor: { label: { vi: 'Hỏi trợ lý chọn quà', en: 'Ask the gift advisor' }, demo: true },
	process: { label: { vi: 'Xem quy trình', en: 'See the process' }, scroll: 'giftsProcessTimeline' },
};

/** CTA của 1 nhãn nút (vi hoặc en), hoặc null. */
export const ctaOf = (label) => Object.values(CTA).find((c) => c.label.vi === label || c.label.en === label) ?? null;
