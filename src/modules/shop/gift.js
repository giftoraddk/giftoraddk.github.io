import { corporateGiftCategories } from '@/services/constants/tags.js';
import { policies as policyDocs } from '@/modules/policies';
import { budgetTiers } from '@/modules/gift-budget.js';
import { services as giftServices } from '@/modules/gift-services.js';

// Nguồn chung cho menu & getStaticPaths của từng route tĩnh — luôn khớp nhau:
// [occasions].astro ↔ corporateGiftCategories, [budget].astro ↔ budgetTiers,
// service/[slug].astro ↔ giftServices.
const CATEGORY_KEYS = Object.keys(corporateGiftCategories.vi);

// ── Shop identity ─────────────────────────────────────────────────────────────────
export const shop = {
	// name~phone~address~email~taxCode — sellerId lấy segment đầu, phần còn lại
	// (5 segment sau) đúng format svc-pay's `seller` attr đang parse (xem tools/service.js)
	seller: 'Cafe ABC~0934561501~Quan 1 TP.HCM~invoice@cafe.vn~0123456789',
	wallet: {
		momo: {
			phone: '0934561501',
			accountName: 'LE THI KIM DAN',
			bin: '971025',
		},
		bank: {
			accountNo: '00951018802',
			accountName: 'LE THI KIM DAN',
			bankName: 'TPBank',
			bin: '970423',
		},
	},
	vietqr: {
		clientId: '6d04884c-5a4c-4c07-ab9f-a4285b853e2b',
		apiKey: 'a10eeaa5-472b-4c01-bf26-6dcb9adf460e',
	},
  cashDisabled: true
};

// ── UI Common ─────────────────────────────────────────────────────────────────────
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
		// support nav of router
		text: 'Sản phẩm',
		href: '/gift/',
		iconMobile: 'ri:store-line',
		// sections in router
		sections: [
			{
				id: 'showcaseModernSlideNeat',
				data: [
					{
						title: { vi: 'Giftora DDK', en: 'Giftora DDK' },
						slider: [{ pics: '/images/common/gift-main.webp' }, { pics: '/images/common/gift-banner.webp' }, { pics: '/images/common/gift-light.webp' }, { pics: '/images/common/gift-dark.webp' }],
					},
				],
				config: (await import('@/sections/showcase/modernSlideNeat.js')).config,
				sort: 0, // nếu không có sort thì hiển thị theo thứ tự trong mảng sections, có sort thì hiển thị theo sort (số nhỏ lên trên)
				col: '12', // col của section trong 1 row (12 là full, 6 là nửa, 4 là 1/3,...), nếu component có sẵn col thì không cần config nữa
				container: true,
				stys: { marginTop: '1rem' },
			},
			{
				id: 'productsShopCard',
				zoom: true, // hiện nút zoom góc trái dưới trên ảnh sản phẩm (web-gallery)
				showSearch: true,
				emptyText: 'Không tìm thấy sản phẩm phù hợp',
				tags: { filterField: 'tags', filterColor: 'primary', data: [] },
				config: (await import('@/sections/products/cardBold.js')).config,
				configList: [
					{ key: 'card', config: (await import('@/sections/products/cardBold.js')).config, label: 'Card' },
					{ key: 'cardMaverick', config: (await import('@/sections/products/cardMaverick.js')).config, label: 'Card 2' },
				],
				sort: 1,
				col: '12',
				container: true,
				responsive: true,
				// dataSrc:    '/api/products/',
				dataTable: 'products',
				loadLimit: 20, // 0 = all data , > 0 lazyload data item
				cache: 0.5, // phút — IndexedDB TTL cho conductor.all()/more(), 0 = luôn fetch mới mỗi lần load
				filters: { status: 'active' }, // chỉ lấy item có status = 'active' (Firestore where equality, xem conductor.js/firestore.js)
				stys: { marginBottom: '1rem' },
			},
		],
	},
	{
		text: 'Đơn hàng',
		href: '#svc-orders',
		iconMobile: 'ri:file-list-3-line',
		sections: [
			{
				id: 'module/orders',
				sort: 0,
				col: '12',
				component: 'svc-orders', // custom element — loaded via <script> in orders.astro
				// dataSrc:   '/api/products/',
				dataTable: 'orders',
			},
		],
	},
	{
		text: 'Thống kê',
		href: '#svc-stats',
		iconMobile: 'ri:bar-chart-2-line',
		sections: [
			{
				id: 'module/stats',
				sort: 0,
				col: '12',
				component: 'svc-stats', // custom element — loaded via <script> in stats.astro
				// thứ tự pipe: sản phẩm | đơn hàng | kho hàng | nhân viên
				// dataSrc:   '/api/products/',
				dataTable: 'products|orders|inventory|staff',
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
		{ text: 'Facebook' , href: 'https://www.facebook.com/giftoraddk', icon: 'ri:facebook-fill' },
		{ text: 'TikTok', href: '#', icon: 'ri:tiktok-fill' },
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
	{ iconMobile: 'ri:home-line', text: { vi: 'Trang chủ', en: 'Home' }, href: '/gift/' },
	{
		iconMobile: 'ri:building-4-line',
		text: { vi: 'Quà tặng doanh nghiệp', en: 'Corporate Gifts' },
		items: CATEGORY_KEYS.map((key) => ({
			text: { vi: corporateGiftCategories.vi[key], en: corporateGiftCategories.en[key] },
			href: `/gift/${key}`,
		})),
	},
	{
		iconMobile: 'ri:price-tag-3-line',
		text: { vi: 'Theo ngân sách', en: 'By Budget' },
		items: budgetTiers.map((tier) => ({
			text: tier.label,
			href: `/gift/${tier.key}`,
		})),
	},
	{
		iconMobile: 'ri:gift-2-line',
		text: { vi: 'Dịch vụ', en: 'Services' },
		items: giftServices.map((svc) => ({
			text: svc.title,
			href: `/gift/service/${svc.slug}`,
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
