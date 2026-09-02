// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'modern',
		mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'modern',
		mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	bg: {
		quality: 'low',
    concept: 'dots',
    total: 5,
    tint: '#2ebd85',
    size: '40~80',
    push: true,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Landing',
		href: '/landing/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'heroModernHoriBase',
				data: (await import('@/sections/hero/modernHoriBase.js')).data,
				config: (await import('@/sections/hero/modernHoriBase.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'trustedModernSlideLogos',
				data: (await import('@/sections/trusted/modernSlideLogos.js')).data,
				config: (await import('@/sections/trusted/modernSlideLogos.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'featuresModernShowcase',
				data: (await import('@/sections/features/modernCardIntro.js')).data,
				config: (await import('@/sections/features/modernCardIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'benefitsModernCardList',
				data: (await import('@/sections/benefits/modernCardList.js')).data,
				config: (await import('@/sections/benefits/modernCardList.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'statsModernCardRow',
				data: (await import('@/sections/stats/modernCardRow.js')).data,
				config: (await import('@/sections/stats/modernCardRow.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'showcaseModernHoriCase',
				data: (await import('@/sections/showcase/modernHoriCase.js')).data,
				config: (await import('@/sections/showcase/modernHoriCase.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'featuresModernHoriIntro',
				data: (await import('@/sections/features/modernHoriIntro.js')).data,
				config: (await import('@/sections/features/modernHoriIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'benefitsModernPicBenefits',
				data: (await import('@/sections/benefits/modernPicBenefits.js')).data,
				config: (await import('@/sections/benefits/modernPicBenefits.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'processModernStepTimeline',
				data: (await import('@/sections/process/modernStepTimeline.js')).data,
				config: (await import('@/sections/process/modernStepTimeline.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'faqModernExpansionQuestion',
				data: (await import('@/sections/faq/modernExpansionQuestion.js')).data,
				config: (await import('@/sections/faq/modernExpansionQuestion.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'ctaModernNeat',
				data: (await import('@/sections/cta/modernNeat.js')).data,
				config: (await import('@/sections/cta/modernNeat.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'testimonialsModernHori',
				data: (await import('@/sections/testimonials/modernHori.js')).data,
				config: (await import('@/sections/testimonials/modernHori.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'blogModernSlideIntro',
				data: (await import('@/sections/blog/modernSlideIntro.js')).data,
				config: (await import('@/sections/blog/modernSlideIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'showcaseModernSlidePortfolio',
				data: (await import('@/sections/showcase/modernSlidePortfolio.js')).data,
				config: (await import('@/sections/showcase/modernSlidePortfolio.js')).config,
				sort: 0,
				col: '12',
				container: true,
			},
			{
				id: 'pricingModernCardPlans',
				data: (await import('@/sections/pricing/modernCardPlans.js')).data,
				config: (await import('@/sections/pricing/modernCardPlans.js')).config,
				sort: 0,
				col: '12',
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'contactModernHoriMap',
				data: (await import('@/sections/contact/modernHoriMap.js')).data,
				config: (await import('@/sections/contact/modernHoriMap.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
		],
	},
];

export default { variant, views };

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