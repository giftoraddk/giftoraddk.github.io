import { patchNode } from '@/packages/apex/tool/recursive-render.js';

// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/stable.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/stable/',
	lang: 'en',
	name: 'Stable',
	title: 'Stable — Clean Product Landing',
	description: 'Stable is a clean product landing theme with a split hero, stats, scrolling trusted logos, feature highlights and pricing plans — built with Apex web components.',
	indexable: false,
};

export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'modern',
		mainColors: '#ffc75f|#ff9671|#ff6f91|#00c7d4|#f9f871', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'modern',
		mainColors: '#ffc75f|#ff9671|#ff6f91|#00c7d4|#f9f871', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// colorful:false giữ tông sunset ấm (amber→rose), tránh lệch qua tông lạnh
	bg: {
		quality: 'low',
		concept: 'bubbles', tint: '#ffc75f', speed: 0.5, size: '6~20',
		gradient: false, total: 3, colorful: false, deg: 80, distance: 100,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
const _slideLogos = await import('@/sections/sliders/trustedLogosSpatial.js');
// Chạy ngược chiều — patch bản clone, không đụng trustedLogosSpatial.js dùng chung
const _slideLogosRTL = patchNode(_slideLogos.config, (n) => n.render === 'slider', { props: { reverse: true } });

export const views = [
	{
		text: 'Landing',
		href: '/landing/stable/',
		iconMobile: 'ri:home-line',
		sections: [
      {
				id: 'heroSpatialHoriNeat',
				data: (await import('@/sections/cards/heroHoriNeat.js')).data,
				config: (await import('@/sections/cards/heroHoriNeat.js')).config,
				sort: 0,
				col: '12',
        container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'statCardRowSpatial',
				data: (await import('@/sections/cards/statRowSpatial.js')).data,
				config: (await import('@/sections/cards/statRowSpatial.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'trustedSpatialSlideLogosLTR',
				data: _slideLogos.data,
				config: _slideLogos.config,
				sort: 0,
				col: '12',
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'trustedSpatialSlideLogosRTL',
				data: _slideLogos.data,
				config: _slideLogosRTL,
				sort: 0,
				col: '12',
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
      {
				id: 'heroHoriFeature',
				data: (await import('@/sections/masonries/heroHoriFeature.js')).data,
				config: (await import('@/sections/masonries/heroHoriFeature.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
      {
				id: 'pricingCardPlansSpatial',
				data: (await import('@/sections/cards/pricingPlansSpatial.js')).data,
				config: (await import('@/sections/cards/pricingPlansSpatial.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
			{
				id: 'featureHoriIntroSpatial',
				data: (await import('@/sections/cards/featureHoriIntroSpatial.js')).data,
				config: (await import('@/sections/cards/featureHoriIntroSpatial.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'ctaSpatialNeat',
				data: (await import('@/sections/cards/ctaNeatSpatial.js')).data,
				config: (await import('@/sections/cards/ctaNeatSpatial.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
		],
	},
];

export default { page, variant, views };

// ── menus + footer ─────────────────────────────────────────────────────────────────
export const menuItems = [
	{
		text: 'Products',
		items: [
			{ text: 'Drag And Drop', href: '#' },
			{ text: 'Visual Studio X', href: '#' },
			{ text: 'Easy Content',   href: '#' },
		],
	},
	{
		text: 'Resources',
		items: [
			{ text: 'Industries and tools',  href: '#' },
			{ text: 'Use cases',             href: '#' },
			{ text: 'Blog',                  href: '#' },
			{ text: 'Online events',         href: '#' },
			{ text: 'Nostrud exercitation',  href: '#' },
		],
	},
	{
		text: 'Company',
		items: [
			{ text: 'Diversity & inclusion', href: '#' },
			{ text: 'About us',              href: '#' },
			{ text: 'Press',                 href: '#' },
			{ text: 'Customer stories',      href: '#' },
			{ text: 'Online communities',    href: '#' },
		],
	},
	{
		text: 'Support',
		items: [
			{ text: 'Documentation',    href: '#' },
			{ text: 'Tutorials & guides', href: '#' },
			{ text: 'Webinars',         href: '#' },
			{ text: 'Open-source',      href: '#' },
		],
	},
]

export const policies = [
	{ text: 'Terms',          href: '#' },
	{ text: 'Privacy Policy', href: '#' },
]

export const socials = [
	{ text: 'Twitter',   href: '#', icon: 'ri:twitter-x-fill'   },
	{ text: 'GitHub',    href: '#', icon: 'ri:github-fill'    },
	{ text: 'Facebook',  href: '#', icon: 'ri:facebook-fill'  },
	{ text: 'Instagram', href: '#', icon: 'ri:instagram-line' },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill'  },
]