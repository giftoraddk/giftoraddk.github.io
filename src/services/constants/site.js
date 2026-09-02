export const site = {
	domain: 'https://giftoraddk.com', // Write here your website url
	author: 'kimthiendung@gmail.com', // Site author
	// Tên thương hiệu thuần — dùng làm hậu tố "{title} • {subtitle}" trong <title> (xem
	// titleSeparator/siteTitle ở Head/Base.astro), tên Organization JSON-LD, <title> RSS feed và
	// heading llms.txt. KHÔNG dùng chỗ nào cần nội dung SEO/GEO (từ khóa, mô tả) — đó là việc của
	// `title` bên dưới.
	subtitle: 'Giftora DDK',
	// SEO/GEO title mặc định — Head/Base.astro fallback về giá trị này khi 1 trang không tự truyền
	// `title` riêng (thay vì chuỗi 'Custom' vô nghĩa trước đây), và src/pages/index.astro (trang
	// gốc '/') dùng thẳng giá trị này làm title thật của domain root. Viết như 1 câu định vị giá
	// trị giàu từ khóa, KHÔNG lặp lại `subtitle` (Head/Base.astro tự nối brand vào sau).
	title: 'Quà Tặng Ý Nghĩa, Đẹp và Tinh Tế',
	// Description to display in the meta tags — dùng làm fallback cho mọi trang không tự truyền
	// `description` riêng (xem Head/Base.astro) nên không để rỗng.
	description: 'Giftora DDK — quà tặng cho mọi dịp: sinh nhật, lễ Tết, quà doanh nghiệp, cưới hỏi và nhiều dịp khác.',
	lang: 'vi-VN', // Ngôn ngữ NỘI DUNG thật của site (RSS <language>, xem pages/rss.xml.ts) — content
	// (bài viết/sản phẩm) vẫn nhập tiếng Việt nên field này giữ nguyên, KHÔNG đổi theo defaultLang.
	// Ngôn ngữ CHUẨN cho phần UI chrome song ngữ (nav/breadcrumb/label — xem I18nText.astro,
	// pickLang() ở services/helper.js). Đổi giá trị NÀY để đổi default hiển thị (html lang lúc SSR
	// trước khi cookie toggle can thiệp — xem Core.astro/CoreShop.astro/BtnLang.astro) ở đúng 1
	// chỗ, không phải sửa rải rác 'vi' ở từng file layout.
	defaultLang: 'en',
	// Trang đích redirect từ '/' (src/pages/index.astro) — đổi giá trị này để trỏ site sang
	// trang khác (vd '/shop', '/gift') mà không cần sửa index.astro. '' = không redirect, '/'
	// hiển thị bình thường như 1 trang landing.
	homeRedirect: '/gift',
};
