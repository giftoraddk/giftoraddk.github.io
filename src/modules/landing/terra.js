// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/terra.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/terra/',
	lang: 'en',
	name: 'Terra',
	title: 'Terra — Natural Earthy Landing',
	description: 'Terra is a natural, earthy landing theme: hero, trusted logos, benefits, stats, process timeline, testimonials and a contact map — built with Apex web components.',
	indexable: false,
};

export const variant = {
	theme: 'light', // set default
	light: {
		ui: 'modern',
		mainColors: '#4d7c0f|#92400e|#65a30d|#ca8a04|#166534', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'modern',
		mainColors: '#4d7c0f|#92400e|#65a30d|#ca8a04|#166534', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// gradient:false + colorful:false giữ tông đất/lá tự nhiên, chỉ dùng hạt "leaf" trôi nhẹ
	bg: {
		quality: 'low',
		concept: 'leaf', tint: '#4d7c0f', speed: 0.6, size: '30~90',
		gradient: false, total: 3, colorful: false, deg: 160, distance: 100,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Terra',
		href: '/landing/terra/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'heroModernHoriBase',
				data:   (await import('@/sections/cards/heroHoriBase.js')).data,
				config: (await import('@/sections/cards/heroHoriBase.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'trustedSlideLogos',
				data:   (await import('@/sections/sliders/trustedLogos.js')).data,
				config: (await import('@/sections/sliders/trustedLogos.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'benefitPicBenefits',
				data:   (await import('@/sections/cards/benefitPicBenefits.js')).data,
				config: (await import('@/sections/cards/benefitPicBenefits.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'statCardRow',
				data:   (await import('@/sections/cards/statRow.js')).data,
				config: (await import('@/sections/cards/statRow.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'processStepTimeline',
				data:   (await import('@/sections/steps/processTimeline.js')).data,
				config: (await import('@/sections/steps/processTimeline.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialHori',
				data:   (await import('@/sections/sliders/testimonialHori.js')).data,
				config: (await import('@/sections/sliders/testimonialHori.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'contactModernHoriMap',
				data:   (await import('@/sections/cards/contactHoriMap.js')).data,
				config: (await import('@/sections/cards/contactHoriMap.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaModernNeat',
				data:   (await import('@/sections/cards/ctaNeat.js')).data,
				config: (await import('@/sections/cards/ctaNeat.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
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
			{ text: 'Intro',   href: '#heroModernHoriBase'    },
			{ text: 'Trusted', href: '#trustedSlideLogos' },
			{ text: 'Benefits', href: '#benefitPicBenefits' },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Stats',   href: '#statCardRow'       },
			{ text: 'Process', href: '#processStepTimeline' },
		],
	},
	{
		iconMobile: 'ri:map-pin-line',
		text: 'Company',
		items: [
			{ text: 'Testimonials', href: '#testimonialHori' },
			{ text: 'Contact',      href: '#contactModernHoriMap'   },
			{ text: 'Get Started',  href: '#ctaModernNeat'          },
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
	{ text: 'Facebook',  href: '#', icon: 'ri:facebook-fill'   },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill' },
];
