export type SiteLang = 'vi' | 'en';

export interface SiteConfig {
	domain: string;
	author: string;
	subtitle: string;
	title: string;
	description: string;
	lang: string;
	defaultLang: SiteLang;
	pages: string[];
}

export const site: SiteConfig = {
	domain: 'https://giftoraddk.com', // URL gốc thật — canonical, sitemap, robots, llms.txt, JSON-LD (modules/gift/meta.js đọc lại từ đây)
	author: 'Giftora DDK', // meta author + article:author
	// Tên thương hiệu thuần — hậu tố "{title} • {subtitle}" trong <title> (titleSeparator/siteTitle ở Head/Base.astro),
	// tên Organization JSON-LD, <title> RSS feed, heading llms.txt và câu mô tả trang post/product. KHÔNG nhồi từ khoá ở
	// đây — đó là việc của `title`.
	subtitle: 'Giftora DDK',
	// SEO/GEO title mặc định — Head/Base.astro dùng khi 1 trang không tự truyền `title`. Trang chủ '/' dùng `page` riêng
	// của modules/gift/meta.js. Cụm từ khoá chính người mua gõ, không lặp `subtitle` (Head/Base.astro tự nối brand vào sau).
	title: 'Quà Tặng Doanh Nghiệp In Logo Theo Yêu Cầu',
	// Fallback cho mọi trang không tự truyền `description` (Head/Base.astro) + mô tả RSS / llms.txt — không để rỗng.
	// Câu tự đủ nghĩa (AI Search trích nguyên câu): ai, bán gì, cho ai, làm được gì, giao ở đâu.
	description: 'Giftora DDK — quà tặng doanh nghiệp in logo theo yêu cầu: quà nhân viên, khách hàng, sự kiện, tri ân đối tác và quà Tết; thiết kế gift box, đóng gói và giao hàng số lượng lớn toàn quốc từ TP. HCM.',
	lang: 'vi-VN', // Ngôn ngữ NỘI DUNG thật (RSS <language>, inLanguage của bài viết / sản phẩm)
	// Ngôn ngữ mặc định của UI chrome song ngữ (nav/breadcrumb/label — I18nText.astro, pickLang()) và <html lang> lúc SSR
	// trước khi cookie của nút VI/EN can thiệp (Core.astro/CoreShop.astro/BtnLang.astro). Khách của giftoraddk.com là
	// doanh nghiệp Việt Nam → 'vi' (title / description dựng bằng pickLang() cũng ra tiếng Việt).
	defaultLang: 'vi',
	// Mục cấp 1 của src/pages được BUILD (tên file / thư mục) — giftoraddk.com chỉ bán quà tặng. Mục khác vẫn chạy ở
	// `pnpm dev` nhưng bị xoá khỏi dist/ của `pnpm build` (pageScopeIntegration, astro.config.mjs); sitemap / llms.txt /
	// <head> chỉ nhắc tới trang có build (builtUrl). [] = build mọi trang.
	//   index.astro = trang chủ Giftora (modules/gift/meta.js `page`)
	//   gift    = /gift/<danh mục>, /gift/<ngân sách>, /gift/service/*, /gift/policy/*, /gift/shop, /gift/login
	//   product / post = trang sản phẩm, bài viết (+ tag)
	//   admin   = khu quản trị
	pages: ['index.astro', 'gift', 'product', 'post', 'admin', 'sitemap.xml.ts', 'llms.txt.ts', 'rss.xml.ts'],
};

/** URL `path` ('/system/docs/', '/rss.xml', '/') có được build không — theo mục cấp 1 của nó trong `site.pages`. */
export function builtUrl(path: string): boolean {
	if (!site.pages.length) return true;
	const seg = path.split(/[/?#]/).filter(Boolean)[0] || 'index';
	return site.pages.some((entry) => entry === seg || entry.startsWith(`${seg}.`));
}
