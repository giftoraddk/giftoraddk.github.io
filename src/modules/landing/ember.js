// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/ember.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/ember/',
	lang: 'en',
	name: 'Ember',
	title: 'Ember — Luxury Gold Landing',
	description: 'Ember is a luxury gold landing theme with a video hero, stats, feature grid, testimonials and pricing plans — built with Apex web components.',
	indexable: false,
};

export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'pastel',
		mainColors: '#d4af37|#8b5e34|#f5dd9f|#c99a3a|#efbf04', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'pastel',
		mainColors: '#d4af37|#8b5e34|#f5dd9f|#c99a3a|#efbf04', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// colorful:false + total thấp giữ nền vàng-đồng đơn sắc, cảm giác cao cấp tối giản
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars', tint: '#d4af37', density: 0.6, speed: 0.25, size: '1~3',
		gradient: true, total: 2, colorful: false, blobType: 'ellipse', blobMove: 'pulse', deg: 90, distance: 85,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Ember',
		href: '/landing/ember/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'heroSpatialVideoNeatApex',
				data:   (await import('@/sections/cards/heroVideoNeat.js')).data,
				config: (await import('@/sections/cards/heroVideoNeat.js')).config,
				sort: 0, col: '12', container: false,
				stys: { marginTop: '-4rem' }, // only item first
			},
			{
				id: 'statCardRowApex',
				data:   (await import('@/sections/cards/statRowApex.js')).data,
				config: (await import('@/sections/cards/statRowApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featureCardWeb',
				data:   (await import('@/sections/masonries/featureWeb.js')).data,
				config: (await import('@/sections/masonries/featureWeb.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialMasonryNeatApex',
				data:   (await import('@/sections/masonries/testimonialNeatApex.js')).data,
				config: (await import('@/sections/masonries/testimonialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingTabPlansApex',
				data:   (await import('@/sections/tabs/pricingPlansApex.js')).data,
				config: (await import('@/sections/tabs/pricingPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaSpatialNeatApex',
				data:   (await import('@/sections/cards/ctaNeatApex.js')).data,
				config: (await import('@/sections/cards/ctaNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},
		],
	},
];

export default { page, variant, views };

// ── menus + footer ─────────────────────────────────────────────────────────────────
export const menuItems = [
	{
		iconMobile: 'ri:home-line',
		text: 'Overview',
		items: [
			{ text: 'Intro', href: '#heroSpatialVideoNeatApex' },
			{ text: 'Stats', href: '#statCardRowApex'  },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features',     href: '#featureCardWeb'         },
			{ text: 'Testimonials', href: '#testimonialMasonryNeatApex' },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',       href: '#pricingTabPlansApex' },
			{ text: 'Get Started', href: '#ctaSpatialNeatApex'         },
		],
	},
];

export const policies = [
	{ text: 'Terms',          href: '#' },
	{ text: 'Privacy Policy', href: '#' },
];

export const socials = [
	{ text: 'Twitter',   href: '#', icon: 'ri:twitter-x-fill'  },
	{ text: 'Instagram', href: '#', icon: 'ri:instagram-line'  },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill' },
];
