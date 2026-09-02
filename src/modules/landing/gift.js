import { occasions } from '@/services/constants/tags.js';
import { policies as policyDocs } from '@/modules/policies';

// 5 dịp đầu tiên đã build static tại src/pages/gift/[occasions].astro — dùng chung nguồn để menu
// và route static luôn khớp nhau.
const OCCASION_KEYS = Object.keys(occasions.vi).slice(0, 5);

// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'light', // set default
	light: {
		ui: 'spatial',
		mainColors: '#0b2d5b|#d4af37|#c1e5a9|#a1a6d3|#e2a9db', // primary|secondary|accent|info|warning|success|error
		bgColors: '#ffffff|#f2f2f2|#f7f2eb', // --color-base-100|--color-base-200|--color-base-300
		textColor: '#0b2d5b', // --color-base-content
		bgImage: '/images/common/gift-light-blur.webp', // bgImage ex: /images/common/bg-light.jpg
	},
	dark: {
		ui: 'spatial',
		mainColors: '#d4af37|#0b2d5b|#c1e5a9|#a1a6d3|#e2a9db', // primary|secondary|accent|info|warning|success|error
		bgColors: '#000000|#0d0d0d|#222222', // --color-base-100|--color-base-200|--color-base-300
		textColor: '#d4af37', // --color-base-content
		bgImage: '/images/common/gift-dark-blur.webp', // bgImage ex: /images/common/bg-light.jpg
	},
	bg:   { blur: true, quality: 'medium', concept: 'bubbles', tint: '#ff8fa3', deg: 180, speed: 0.9, size: '2~5', push: true, pushRadius: 180, pushStrength: 60 },
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Intro',
		href: '/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'showcaseModernSlideNeat',
				data: [
					{
						title: { vi: 'Giftora DDK', en: 'Giftora DDK' },
						slider: [{ pics: '/images/common/gift-banner.webp' }, { pics: '/images/common/gift-light.webp' }, { pics: '/images/common/gift-dark.webp' }],
					},
				],
				config: (await import('@/sections/showcase/modernSlideNeat.js')).config,
				sort: 0, // nếu không có sort thì hiển thị theo thứ tự trong mảng sections, có sort thì hiển thị theo sort (số nhỏ lên trên)
				col: '12', // col của section trong 1 row (12 là full, 6 là nửa, 4 là 1/3,...), nếu component có sẵn col thì không cần config nữa
				container: true,
				stys: { marginTop: '-4rem', paddingTop: '6rem' }, // only item first
			},
			{
				id: 'giftsModernStatsIntro',
				data: (await import('@/sections/stats/modernStatsIntro.js')).data,
				config: (await import('@/sections/stats/modernStatsIntro.js')).config,
				sort: 1,
				col: '12',
				container: true,
			},
			{
				id: 'giftsModernServiceGrid',
				data: (await import('@/sections/features/modernServiceGrid.js')).data,
				config: (await import('@/sections/features/modernServiceGrid.js')).config,
				sort: 2,
				col: '12',
				container: true,
			},
			{
				id: 'giftsModernSlideBestSeller',
				zoom: true, // hiện nút zoom góc trái dưới trên ảnh sản phẩm (web-gallery)
				data: (await import('@/sections/products/modernSlideBestSeller.js')).data,
				config: (await import('@/sections/products/modernSlideBestSeller.js')).config,
				sort: 3,
				col: '12',
				container: true,
			},
			{
				id: 'giftsModernGalleryStrip',
				data: (await import('@/sections/showcase/modernGalleryStrip.js')).data,
				config: (await import('@/sections/showcase/modernGalleryStrip.js')).config,
				sort: 4,
				col: '12',
				container: true,
			},
			{
				id: 'giftsModernSlideTestimonials',
				data: (await import('@/sections/testimonials/modernSlideTestimonials.js')).data,
				config: (await import('@/sections/testimonials/modernSlideTestimonials.js')).config,
				sort: 5,
				col: '12',
				container: true,
			},
			{
				id: 'giftsModernSlideBrands',
				data: (await import('@/sections/trusted/modernSlideBrands.js')).data,
				config: (await import('@/sections/trusted/modernSlideBrands.js')).config,
				sort: 6,
				col: '12',
				container: true,
			},
		],
	},
];

// ── bar + menus + footer ─────────────────────────────────────────────────────────────────
export const contact = {
  name: { vi: 'Công ty TNHH Giftora DDK', en: 'Giftora DDK Co., Ltd.' },
  taxNumber: '0319681025',
  email: 'sales@giftoraddk.com',
	address: '670 Đoàn Văn Bơ, Phường Xóm Chiếu, TP. HCM',
	hotline: '0934561501',
  info: {
    vi: 'Chuyên cung cấp giải pháp quà tặng chuyên nghiệp, giúp doanh nghiệp chọn đúng quà, đúng ngân sách và đúng dấu ấn thương hiệu. \nTừ món quà nhỏ đến những kết nối lớn.',
    en: 'Specializing in professional gift solutions, helping businesses choose the right gift, the right budget and the right brand impression. \nFrom small gifts to big connections.',
  },
}
export const bar = {
  ...contact,
	hotlineLabel: { vi: 'Hotline / Zalo', en: 'Hotline / Zalo' },
	socialsLabel: { vi: 'Mạng xã hội', en: 'Follow us' },
	socials: [
		{ icon: 'ri:facebook-fill', href: 'https://www.facebook.com/giftoraddk', text: 'Facebook' },
		{ icon: 'ri:tiktok-fill', href: '#', text: 'TikTok' },
	],
};

export const menuSpecials = [
  {
		iconMobile: 'ri:home-line',
		text: { vi: 'Hỗ trợ khách hàng', en: 'Customer support' },
		full: true, // chiếm trọn hàng ngang trong grid cột của footer
		items: [
			{ text: { vi: 'Thời gian làm việc: 8:00 - 17:30 từ thứ 2 đến thứ 6. Thứ 7 từ 8:00 - 12:00 (Nghỉ chủ nhật và các ngày lễ)', en: 'Working hours: 8:00 AM - 5:30 PM, Monday to Friday. Saturday from 8:00 AM - 12:00 PM (Closed on Sundays and public holidays)' } },
		],
	},
]

export const menuItems = [
  {
    iconMobile: 'ri:home-line',
    text: { vi: 'Tổng quan', en: 'Overview' },
    items: [
      { text: { vi: 'Giới thiệu', en: 'Introduction' }, href: '#showcaseModernSlideNeat' },
      { text: { vi: 'Bộ sưu tập', en: 'Collection' }, href: '#giftsModernStatsIntro' },
    ],
  },
  {
    iconMobile: 'ri:gift-2-line',
    text: { vi: 'Dịch vụ', en: 'Services' },
    items: [
      { text: { vi: 'Dịch vụ', en: 'Services' }, href: '#giftsModernServiceGrid' },
      { text: { vi: 'Bán chạy nhất', en: 'Best sellers' }, href: '#giftsModernSlideBestSeller' },
      { text: { vi: 'Hình ảnh nổi bật', en: 'Featured gallery' }, href: '#giftsModernGalleryStrip' },
    ],
  },
  {
    iconMobile: 'ri:chat-quote-line',
    text: { vi: 'Khách hàng', en: 'Customers' },
    items: [
      { text: { vi: 'Khách hàng nói gì', en: 'What customers say' }, href: '#giftsModernSlideTestimonials' },
      { text: { vi: 'Thương hiệu đối tác', en: 'Partner brands' }, href: '#giftsModernSlideBrands' },
    ],
  },
  {
    iconMobile: 'ri:shopping-bag-4-line',
    text: { vi: 'Sản phẩm', en: 'Products' },
    items: OCCASION_KEYS.map((key) => ({
      text: { vi: occasions.vi[key], en: occasions.en[key] },
      href: `/gift/${key}`,
    })),
  },
];

// footer dùng menuItems trước, menuSpecials xếp dưới cùng (chiếm trọn hàng) — menu top nav vẫn giữ nguyên menuItems
export const footerMenuItems = [...menuItems, ...menuSpecials];

// 4 chính sách công ty (thanh toán, vận chuyển, đổi trả/hoàn tiền, bảo mật) — nội dung song ngữ
// đầy đủ tại src/modules/policies.js, render tại src/pages/gift/policy/[slug].astro
export const policies = policyDocs.map((doc) => ({ text: doc.title, href: `/gift/policy/${doc.slug}` }));

export const socials = [
	{ text: 'Facebook', href: 'https://www.facebook.com/giftoraddk', icon: 'ri:facebook-fill' },
	{ text: 'TikTok', href: '#', icon: 'ri:tiktok-fill' },
	// { text: 'Twitter', href: '#', icon: 'ri:twitter-x-fill' },
	// { text: 'GitHub', href: '#', icon: 'ri:github-fill' },
	// { text: 'Instagram', href: '#', icon: 'ri:instagram-line' },
	// { text: 'LinkedIn', href: 'https://www.linkedin.com/in/dung-p-965a62187/', icon: 'ri:linkedin-box-fill' },
];