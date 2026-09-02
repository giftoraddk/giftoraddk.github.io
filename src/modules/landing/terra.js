// ── UI Common ─────────────────────────────────────────────────────────────────
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
				data:   (await import('@/sections/hero/modernHoriBase.js')).data,
				config: (await import('@/sections/hero/modernHoriBase.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'trustedModernSlideLogos',
				data:   (await import('@/sections/trusted/modernSlideLogos.js')).data,
				config: (await import('@/sections/trusted/modernSlideLogos.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'benefitsModernPicBenefits',
				data:   (await import('@/sections/benefits/modernPicBenefits.js')).data,
				config: (await import('@/sections/benefits/modernPicBenefits.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'statsModernCardRow',
				data:   (await import('@/sections/stats/modernCardRow.js')).data,
				config: (await import('@/sections/stats/modernCardRow.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'processModernStepTimeline',
				data:   (await import('@/sections/process/modernStepTimeline.js')).data,
				config: (await import('@/sections/process/modernStepTimeline.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialsModernHori',
				data:   (await import('@/sections/testimonials/modernHori.js')).data,
				config: (await import('@/sections/testimonials/modernHori.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'contactModernHoriMap',
				data:   (await import('@/sections/contact/modernHoriMap.js')).data,
				config: (await import('@/sections/contact/modernHoriMap.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaModernNeat',
				data:   (await import('@/sections/cta/modernNeat.js')).data,
				config: (await import('@/sections/cta/modernNeat.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
		],
	},
];

export default { variant, views };

// ── menus + footer ─────────────────────────────────────────────────────────────────
export const menuItems = [
	{
		iconMobile: 'ri:home-line',
		text: 'Overview',
		items: [
			{ text: 'Intro',   href: '#heroModernHoriBase'    },
			{ text: 'Trusted', href: '#trustedModernSlideLogos' },
			{ text: 'Benefits', href: '#benefitsModernPicBenefits' },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Stats',   href: '#statsModernCardRow'       },
			{ text: 'Process', href: '#processModernStepTimeline' },
		],
	},
	{
		iconMobile: 'ri:map-pin-line',
		text: 'Company',
		items: [
			{ text: 'Testimonials', href: '#testimonialsModernHori' },
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
