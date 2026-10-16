// 4 mức ngân sách — NGUỒN DUY NHẤT cho menu "Theo ngân sách", route tĩnh src/pages/gift/[group].astro, sitemap.xml,
// llms.txt và SiteNavigationElement của trang chủ (modules/gift/nav.js).
// Bucket rule: min <= price < max (tier cuối max = Infinity, không giới hạn trên).
// price lấy từ field `pricing` dạng "price~cost~unit" (xem src/sections/another/products/bold.js).
// `seo` — title/description riêng từng mức: mỗi trang trả lời đúng 1 intent tìm kiếm, không trùng nội dung nhau.
export const budgetTiers = [
	{
		key: 'under-200k',
		label: { vi: 'Dưới 200k', en: 'Under 200k' },
		min: 0,
		max: 200000,
		seo: {
			title: 'Quà Tặng Doanh Nghiệp Dưới 200k – Đẹp & Tiết Kiệm',
			description: 'Tổng hợp quà tặng doanh nghiệp giá dưới 200.000đ, đẹp mắt và tiết kiệm chi phí. Giftora DDK gợi ý quà tặng phù hợp số lượng lớn, in logo theo yêu cầu.',
		},
	},
	{
		key: '200-500k',
		label: { vi: '200 – 500k', en: '200k – 500k' },
		min: 200000,
		max: 500000,
		seo: {
			title: 'Quà Tặng Doanh Nghiệp 200k – 500k – Tinh Tế, Vừa Túi Tiền',
			description: 'Quà tặng doanh nghiệp tầm giá 200.000đ – 500.000đ, tinh tế và chất lượng. Giftora DDK có đa dạng mẫu mã phù hợp tặng nhân viên, khách hàng và đối tác.',
		},
	},
	{
		key: '500k-1m',
		label: { vi: '500k – 1 triệu', en: '500k – 1 million' },
		min: 500000,
		max: 1000000,
		seo: {
			title: 'Quà Tặng Doanh Nghiệp 500k – 1 Triệu – Sang Trọng',
			description: 'Quà tặng doanh nghiệp tầm giá 500.000đ – 1.000.000đ, sang trọng và ý nghĩa. Giftora DDK cung cấp set quà cao cấp, đóng gói tinh tế, giao hàng toàn quốc.',
		},
	},
	{
		key: 'premium',
		label: { vi: 'Cao cấp', en: 'Premium' },
		min: 1000000,
		max: Infinity,
		seo: {
			title: 'Quà Tặng Doanh Nghiệp Cao Cấp – Đẳng Cấp & Ấn Tượng',
			description: 'Quà tặng doanh nghiệp cao cấp trên 1.000.000đ, đẳng cấp và ấn tượng dành cho đối tác, khách hàng VIP. Giftora DDK tư vấn set quà cao cấp theo yêu cầu riêng.',
		},
	},
];

/** URL trang mức ngân sách — khớp route src/pages/gift/[group].astro. */
export const budgetPath = (key) => `/gift/${key}`;
