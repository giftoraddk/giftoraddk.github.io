// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/sakura.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/sakura/',
	lang: 'en',
	name: 'Sakura',
	title: 'Sakura — Soft Pastel Landing',
	description: 'Sakura is a soft pastel landing theme with a split hero, trusted logos, feature highlights, testimonials and pricing plans — built with Apex web components.',
	indexable: false,
};

export const variant = {
	theme: 'light', // set default
	light: {
		ui: 'pastel',
		mainColors: '#f9a8d4|#c4b5fd|#67e8f9|#fbcfe8|#fde68a', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'pastel',
		mainColors: '#f9a8d4|#c4b5fd|#67e8f9|#fbcfe8|#fde68a', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// colorful:false giữ tông pastel đơn sắc, tránh loang màu gắt
	bg: {
		blur: true, quality: 'low',
		concept: 'bubbles', tint: '#f9a8d4', speed: 0.5, size: '6~36',
		gradient: true, total: 3, colorful: false, blobType: 'circleOverlay', blobMove: 'swap', deg: 0, distance: 110,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Sakura',
		href: '/landing/sakura/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'heroSpatialHoriNeat',
				data:   (await import('@/sections/cards/heroHoriNeat.js')).data,
				config: (await import('@/sections/cards/heroHoriNeat.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'trustedSlideLogosSpatial',
				data:   (await import('@/sections/sliders/trustedLogosSpatial.js')).data,
				config: (await import('@/sections/sliders/trustedLogosSpatial.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featureHoriIntroSpatial',
				data:   (await import('@/sections/cards/featureHoriIntroSpatial.js')).data,
				config: (await import('@/sections/cards/featureHoriIntroSpatial.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialMasonryNeat',
				data:   (await import('@/sections/masonries/testimonialNeat.js')).data,
				config: (await import('@/sections/masonries/testimonialNeat.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingCardPlansSpatial',
				data:   (await import('@/sections/cards/pricingPlansSpatial.js')).data,
				config: (await import('@/sections/cards/pricingPlansSpatial.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaSpatialNeat',
				data:   (await import('@/sections/cards/ctaNeatSpatial.js')).data,
				config: (await import('@/sections/cards/ctaNeatSpatial.js')).config,
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
			{ text: 'Intro',   href: '#heroSpatialHoriNeat'    },
			{ text: 'Trusted', href: '#trustedSlideLogosSpatial' },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features',      href: '#featureHoriIntroSpatial'          },
			{ text: 'Testimonials',  href: '#testimonialMasonryNeat'    },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',       href: '#pricingCardPlansSpatial' },
			{ text: 'Get Started', href: '#ctaSpatialNeat'          },
		],
	},
];

export const policies = [
	{ text: 'Terms',          href: '#' },
	{ text: 'Privacy Policy', href: '#' },
];

export const socials = [
	{ text: 'Twitter',   href: '#', icon: 'ri:twitter-x-fill'  },
	{ text: 'GitHub',    href: '#', icon: 'ri:github-fill'     },
	{ text: 'Instagram', href: '#', icon: 'ri:instagram-line'  },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill' },
];
