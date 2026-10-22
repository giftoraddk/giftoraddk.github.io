// Nội dung trang chủ giftoraddk.com ('/', src/pages/index.astro): sections của <web-board>, kiểu tints (tintsSections).
// Khung chung (variant, bar, menu, footer) ở modules/gift/shop.js `tintsChrome`; meta SEO + nhãn CTA ở modules/gift/meta.js.
// SEO/GEO: outline + JSON-LD dựng từ CHÍNH các section dưới đây (board-seo.js) — section quy trình (`steps`) ra HowTo,
// section câu hỏi (`expansion`) ra FAQPage, best-seller (có meta.url) ra ItemList. Muốn AI Search trả lời được câu gì thì
// viết câu đó thành nội dung hiển thị ở đây (không viết nội dung riêng cho bot).

import { fetchCollection } from '@/services/core/fetcher.server.js';
import { productSlug, postSlug } from '@/services/tools/util';
import { compareRank } from '@/services/tools/rank.js';
import { CTA } from './meta.js';
import { tintsSections } from './shop.js';

// ── Best-selling gifts (data thật từ database) ─────────────────────────────────
// "Bán chạy nhất" = cùng thứ tự admin thấy ở products: hàng ưu tiên theo `rank` (kéo-thả, tools/rank.js) rồi tới
// hàng tự động theo `updated_at` (mới cập nhật lên trước), build-time fetch giống product/index.astro (bake data thật
// vào HTML, không qua conductor vì trang này prerender tĩnh).
async function _fetchBestSellers(limit = 4) {
	const products = await fetchCollection('products');

	return products
		.slice()
		.sort(compareRank)
		.slice(0, limit)
		.map((p) => ({ ...p, meta: { ...(p.meta ?? {}), url: `/product/${productSlug(p)}/` } }));
}

// ── Bài viết mới nhất (data thật, bảng posts) ─────────────────────────────────
// Mới đăng trước, tối đa `limit` bài; meta.url = trang /post/<slug>/ (board-seo.js dựng ItemList từ link này),
// meta.date = ngày đăng dd/mm/yyyy (giờ VN), meta.category = tag đầu tiên. Không có bài nào → bỏ hẳn section
// (không đưa bài viết mẫu lên trang thật — link chết, nội dung giả với crawler).
const _dateVN = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
async function _fetchLatestPosts(limit = 6) {
	const posts = await fetchCollection('posts');
	return posts
		.slice()
		.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
		.slice(0, limit)
		.map((p) => {
			const created = new Date(p.created_at);
			return {
				...p,
				meta: {
					...(typeof p.meta === 'object' && p.meta ? p.meta : {}),
					url: `/post/${postSlug(p)}/`,
					date: Number.isNaN(created.getTime()) ? '' : _dateVN.format(created),
					category: String(p.tags || '').split('|').map((t) => t.trim()).find(Boolean) || '',
				},
			};
		});
}

const tint = { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' };


// ── Views ─────────────────────────────────────────────────────────────────────
// Dựng mỗi lần render (không phải top-level await): trang gift chạy on-demand khi PUBLIC_RENDER=isr — instance function
// giữ module lâu, top-level await sẽ đóng băng best-seller / bài mới ở lần nạp đầu tiên.
export async function getViews() {
	const [bestSellers, latestPosts] = await Promise.all([_fetchBestSellers(4), _fetchLatestPosts(6)]);

	return [
		{
			text: 'Intro',
			href: '/',
			iconMobile: 'ri:home-line',
			sections: tintsSections([
				{
					id: 'showcaseSlideNeat',
					data: [
						{
							title: { vi: 'Giftora DDK', en: 'Giftora DDK' },
							slider: [{ pics: '/images/common/gift-main.webp' }, { pics: '/images/common/gift-banner.webp' }, { pics: '/images/common/gift-light.webp' }, { pics: '/images/common/gift-dark.webp' }],
						},
					],
					config: (await import('@/sections/sliders/showcaseNeat.js')).config,
					sort: 0, // nếu không có sort thì hiển thị theo thứ tự trong mảng sections, có sort thì hiển thị theo sort (số nhỏ lên trên)
					col: '12', // col của section trong 1 row (12 là full, 6 là nửa, 4 là 1/3,...), nếu component có sẵn col thì không cần config nữa
					container: true,
					stys: { marginTop: '-4rem', paddingTop: '6rem' }, // only item first
				},
				{
					id: 'giftsModernStatsIntro',
					data: (await import('@/sections/masonries/statStatsIntro.js')).data,
					config: (await import('@/sections/masonries/statStatsIntro.js')).config,
					sort: 1,
					col: '12',
					container: true,
				},
				{
					id: 'giftsModernServiceGrid',
					data: (await import('@/sections/cards/featureServiceGrid.js')).data,
					config: (await import('@/sections/cards/featureServiceGrid.js')).config,
					sort: 2,
					col: '12',
					container: true,
				},
				{
					id: 'giftsModernSlideBestSeller',
					zoom: true, // bấm ảnh → popup ảnh lớn (web-lightbox; nhiều ảnh → slider flipX)
					// data thật (bestSellers) — fallback về data mẫu của section nếu chưa có đơn hàng nào.
					data: bestSellers.length ? bestSellers : (await import('@/sections/another/products/bestSeller.js')).data,
					config: (await import('@/sections/another/products/bestSeller.js')).config,
					sort: 3,
					col: '12',
					container: true,
	        stys: tint,
				},

				// Bài viết mới nhất — cùng khuôn slider với best-seller; chỉ có khi đã đăng bài (xem _fetchLatestPosts).
				...(latestPosts.length ? [{
					id: 'giftsLatestPosts',
					zoom: true, // bấm ảnh → popup ảnh lớn (web-lightbox; nhiều ảnh → slider flipX)
					data: latestPosts,
					config: (await import('@/sections/another/posts/latestPosts.js')).config,
					sort: 4,
					col: '12',
					container: true,
	        stys: tint,
				}] : []),

				// ── Quy trình đặt quà doanh nghiệp → HowTo ─────────────────────────────────
				{
					id: 'giftsProcessTimeline',
					data: [{
						subtitle: { vi: 'QUY TRÌNH ĐẶT QUÀ', en: 'HOW TO ORDER' },
						title: { vi: 'Đặt quà tặng doanh nghiệp trong 5 bước', en: 'Order corporate gifts in 5 steps' },
						steps: [
							{ id: 'brief', title: { vi: 'Gửi yêu cầu', en: 'Send your brief' }, icon: 'ri:questionnaire-line', content: { vi: 'Cho chúng tôi biết dịp tặng, người nhận, số lượng và ngân sách qua hotline/Zalo 093 456 1501 hoặc email sales@giftoraddk.com.', en: 'Tell us the occasion, recipients, quantity and budget via hotline/Zalo 093 456 1501 or sales@giftoraddk.com.' } },
							{ id: 'quote', title: { vi: 'Tư vấn & báo giá', en: 'Advice & quote' }, icon: 'ri:price-tag-3-line', content: { vi: 'Gợi ý set quà phù hợp ngân sách và nhận diện thương hiệu, báo giá trong 24 giờ.', en: 'We suggest gift sets that fit your budget and brand identity, and quote within 24 hours.' } },
							{ id: 'mockup', title: { vi: 'Duyệt mẫu in logo', en: 'Approve the mockup' }, icon: 'ri:palette-line', content: { vi: 'Nhận mockup logo trên sản phẩm thật, chỉnh đến khi ưng ý; đơn tuỳ chỉnh đặt cọc trước khi sản xuất.', en: 'Get a mockup of your logo on the real product, revised until you are happy; custom orders take a deposit before production.' } },
							{ id: 'produce', title: { vi: 'Sản xuất & đóng gói', en: 'Produce & pack' }, icon: 'ri:gift-2-line', content: { vi: 'In UV / ép nhiệt / khắc laser tuỳ chất liệu, kiểm tra 100% rồi đóng gói, thêm thiệp và ruy băng theo yêu cầu.', en: 'UV printing, heat-press or laser engraving depending on material, 100% inspected, then packed with cards and ribbons on request.' } },
							{ id: 'deliver', title: { vi: 'Giao hàng toàn quốc', en: 'Nationwide delivery' }, icon: 'ri:truck-line', content: { vi: 'Nội thành TP. HCM 1–2 ngày, tỉnh thành khác 3–5 ngày làm việc; giao một hoặc nhiều địa điểm, được kiểm hàng trước khi nhận.', en: 'Ho Chi Minh City in 1–2 working days, other provinces in 3–5; one or many addresses, and you inspect before accepting.' } },
						],
					}],
					config: (await import('@/sections/steps/processTimeline.js')).config,
					sort: 5,
					col: '12',
					container: true,
				},

				{
					id: 'giftsModernGalleryStrip',
					data: (await import('@/sections/sliders/showcaseGalleryStrip.js')).data,
					config: (await import('@/sections/sliders/showcaseGalleryStrip.js')).config,
					sort: 6,
					col: '12',
					container: true,
				},

				{
					id: 'giftsModernSlideTestimonials',
					data: (await import('@/sections/sliders/testimonial.js')).data,
					config: (await import('@/sections/sliders/testimonial.js')).config,
					sort: 7,
					col: '12',
					container: true,
	        stys: tint,
				},

				// ── Câu hỏi thường gặp → FAQPage (cùng nội dung public/data/gift.json của trợ lý) ─────────
				{
					id: 'giftsFaqExpansion',
					data: [{
						subtitle: { vi: 'CÂU HỎI THƯỜNG GẶP', en: 'FREQUENTLY ASKED' },
						title: { vi: 'Hỏi nhanh về quà tặng doanh nghiệp', en: 'Quick answers about corporate gifts' },
						description: { vi: 'Những điều doanh nghiệp hay hỏi trước khi đặt quà tại Giftora DDK.', en: 'What companies usually ask before ordering gifts from Giftora DDK.' },
						expansion: [
							{ title: { vi: 'Giftora DDK có in logo doanh nghiệp lên quà không?', en: 'Can Giftora DDK print our company logo on the gifts?' }, content: { vi: 'Có. Chúng tôi in UV, ép nhiệt hoặc khắc laser logo lên sổ tay, bình nước, túi, hộp quà… tuỳ chất liệu, gửi mockup để duyệt trước khi sản xuất.', en: 'Yes. We UV-print, heat-press or laser-engrave your logo on notebooks, bottles, bags, gift boxes and more depending on material, and send a mockup for approval before production.' } },
							{ title: { vi: 'Đặt bao nhiêu thì được giao hàng và miễn phí vận chuyển?', en: 'What is the minimum order for delivery and free shipping?' }, content: { vi: 'Giftora DDK giao hàng toàn quốc cho đơn từ 1 triệu đồng và miễn phí vận chuyển cho đơn từ 5 triệu đồng (giao tiêu chuẩn). Giao nhanh 2 giờ tại TP. HCM hoặc giao gấp trong ngày tính phí riêng.', en: 'Giftora DDK delivers nationwide for orders from 1 million VND, with free standard shipping from 5 million VND. 2-hour delivery in Ho Chi Minh City or same-day rush delivery is charged separately.' } },
							{ title: { vi: 'Bao lâu thì nhận được hàng?', en: 'How long does delivery take?' }, content: { vi: 'Nội thành TP. HCM 1–2 ngày làm việc, ngoại thành và tỉnh thành khác 3–5 ngày làm việc. Đơn in logo cộng thêm thời gian sản xuất — thời gian cụ thể được báo khi báo giá.', en: 'Ho Chi Minh City in 1–2 working days, suburbs and other provinces in 3–5. Logo-printed orders add production time — the exact schedule comes with the quote.' } },
							{ title: { vi: 'Có những mức giá quà tặng nào?', en: 'What price ranges are available?' }, content: { vi: 'Bốn mức: dưới 200.000đ, 200.000–500.000đ, 500.000đ–1 triệu và cao cấp trên 1 triệu. Mỗi mức có trang riêng trong menu "Theo ngân sách".', en: 'Four ranges: under 200,000 VND, 200,000–500,000 VND, 500,000 VND–1 million and premium above 1 million. Each has its own page under "By Budget".' } },
							{ title: { vi: 'Thanh toán và xuất hoá đơn VAT thế nào?', en: 'How do payment and VAT invoices work?' }, content: { vi: 'Chuyển khoản ngân hàng hoặc COD (có thể yêu cầu đặt cọc với đơn lớn, đơn tuỳ chỉnh). Hoá đơn VAT xuất theo thông tin công ty (tên, địa chỉ, mã số thuế) cung cấp khi đặt hàng.', en: 'Bank transfer or cash on delivery (a deposit may be required for large or custom orders). VAT invoices are issued from the company details (name, address, tax code) given when ordering.' } },
							{ title: { vi: 'Hàng lỗi hoặc giao sai có được đổi trả không?', en: 'Can I return faulty or wrong items?' }, content: { vi: 'Được đổi trả trong 5 ngày kể từ khi nhận nếu lỗi nhà sản xuất, hư hỏng do vận chuyển, sai mẫu/màu/kích thước hoặc thiếu phụ kiện — kèm ảnh hoặc video. Hàng bể vỡ báo trong 24 giờ. Quà đã in logo, khắc tên không đổi trả vì lý do chủ quan.', en: 'Yes, within 5 days of receipt for manufacturing faults, shipping damage, wrong model/colour/size or missing parts — with photos or video. Report breakage within 24 hours. Logo-printed or engraved gifts cannot be returned for change of mind.' } },
						],
					}],
					config: (await import('@/sections/expansions/faq.js')).config,
					sort: 9,
					col: '12',
					container: true,
					stys: tint,
				},
	      
				{
					id: 'giftsModernSlideBrands',
					data: (await import('@/sections/sliders/trustedBrands.js')).data,
					config: (await import('@/sections/sliders/trustedBrands.js')).config,
					sort: 8,
					col: '12',
					container: true,
				},

				// ── CTA — nút → hành động ở meta.js CTA (pages/index.astro bắt `cell-action`) ──────────
				{
					id: 'giftsCtaApex',
					data: [{
						subtitle: { vi: 'SẴN SÀNG TẶNG QUÀ', en: 'READY TO GIFT' },
						title: { vi: 'Món quà đúng ngân sách,\nđúng dấu ấn thương hiệu.', en: 'The right gift, the right budget,\nyour brand on it.' },
						description: { vi: 'Gửi yêu cầu qua Zalo để nhận báo giá trong 24 giờ, hoặc hỏi ngay trợ lý chọn quà.', en: 'Send your brief on Zalo for a quote within 24 hours, or ask the gift advisor right now.' },
						pics: '/images/common/gift-main.webp',
						meta: { ctaPrimaryLabel: CTA.quote.label, ctaSecondaryLabel: CTA.advisor.label },
					}],
					config: (await import('@/sections/cards/ctaNeatApex.js')).config,
					sort: 10,
					col: '12',
					container: true,
				},
			]),
		},
	];
}
