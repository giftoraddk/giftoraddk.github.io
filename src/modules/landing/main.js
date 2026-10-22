// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/index.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/',
	lang: 'en',
	name: 'Nexora',
	title: 'Nexora — Software That Moves Faster',
	description: 'Nexora helps development teams plan, build and ship better software with confidence — features, showcase, workflow, pricing plans and FAQ in one landing page.',
	indexable: false,
};

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
				data: (await import('@/sections/cards/heroHoriBase.js')).data,
				config: (await import('@/sections/cards/heroHoriBase.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'trustedSlideLogos',
				data: (await import('@/sections/sliders/trustedLogos.js')).data,
				config: (await import('@/sections/sliders/trustedLogos.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'featuresModernShowcase',
				data: (await import('@/sections/cards/featureIntro.js')).data,
				config: (await import('@/sections/cards/featureIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'benefitsModernCardList',
				data: (await import('@/sections/cards/benefitList.js')).data,
				config: (await import('@/sections/cards/benefitList.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'statCardRow',
				data: (await import('@/sections/cards/statRow.js')).data,
				config: (await import('@/sections/cards/statRow.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'showcaseHoriCase',
				data: (await import('@/sections/sliders/showcaseHoriCase.js')).data,
				config: (await import('@/sections/sliders/showcaseHoriCase.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'featureHoriIntro',
				data: (await import('@/sections/cards/featureHoriIntro.js')).data,
				config: (await import('@/sections/cards/featureHoriIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'benefitPicBenefits',
				data: (await import('@/sections/cards/benefitPicBenefits.js')).data,
				config: (await import('@/sections/cards/benefitPicBenefits.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'processStepTimeline',
				data: (await import('@/sections/steps/processTimeline.js')).data,
				config: (await import('@/sections/steps/processTimeline.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'faqExpansionQuestion',
				data: (await import('@/sections/expansions/faqQuestion.js')).data,
				config: (await import('@/sections/expansions/faqQuestion.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'ctaModernNeat',
				data: (await import('@/sections/cards/ctaNeat.js')).data,
				config: (await import('@/sections/cards/ctaNeat.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'testimonialHori',
				data: (await import('@/sections/sliders/testimonialHori.js')).data,
				config: (await import('@/sections/sliders/testimonialHori.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'blogSlideIntro',
				data: (await import('@/sections/sliders/blogIntro.js')).data,
				config: (await import('@/sections/sliders/blogIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'showcaseSlidePortfolio',
				data: (await import('@/sections/sliders/showcasePortfolio.js')).data,
				config: (await import('@/sections/sliders/showcasePortfolio.js')).config,
				sort: 0,
				col: '12',
				container: true,
			},
			{
				id: 'pricingCardPlans',
				data: (await import('@/sections/cards/pricingPlans.js')).data,
				config: (await import('@/sections/cards/pricingPlans.js')).config,
				sort: 0,
				col: '12',
				container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'contactModernHoriMap',
				data: (await import('@/sections/cards/contactHoriMap.js')).data,
				config: (await import('@/sections/cards/contactHoriMap.js')).config,
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