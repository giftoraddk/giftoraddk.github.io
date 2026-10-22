// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/midnight.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/midnight/',
	lang: 'en',
	name: 'Midnight',
	title: 'Midnight — Dark Neon Tech Landing',
	description: 'Midnight is a dark neon landing theme for tech products: hero, trusted logos, stats, features, showcase, process timeline, pricing, testimonials and FAQ.',
	indexable: false,
};

export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'modern',
		mainColors: '#ff2e63|#08d9d6|#a239ea|#00c7d4|#f8de22', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'modern',
		mainColors: '#ff2e63|#08d9d6|#a239ea|#00c7d4|#f8de22', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	bg: {
		quality: 'medium',
		concept: 'stars', tint: '#ff2e63', density: 1.2, speed: 1, size: '2~5', push: true, pushRadius: 140, pushStrength: 60,
		gradient: true, total: 4, colorful: true, blobType: 'circleOverlap', blobMove: 'pulse', deg: 200, distance: 90,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Midnight',
		href: '/landing/midnight/',
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
				id: 'statCardRow',
				data:   (await import('@/sections/cards/statRow.js')).data,
				config: (await import('@/sections/cards/statRow.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'featureCardIntro',
				data:   (await import('@/sections/cards/featureIntro.js')).data,
				config: (await import('@/sections/cards/featureIntro.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'showcaseHoriCase',
				data:   (await import('@/sections/sliders/showcaseHoriCase.js')).data,
				config: (await import('@/sections/sliders/showcaseHoriCase.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'featureHoriIntro',
				data:   (await import('@/sections/cards/featureHoriIntro.js')).data,
				config: (await import('@/sections/cards/featureHoriIntro.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'processStepTimeline',
				data:   (await import('@/sections/steps/processTimeline.js')).data,
				config: (await import('@/sections/steps/processTimeline.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'testimonialHori',
				data:   (await import('@/sections/sliders/testimonialHori.js')).data,
				config: (await import('@/sections/sliders/testimonialHori.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingCardPlans',
				data:   (await import('@/sections/cards/pricingPlans.js')).data,
				config: (await import('@/sections/cards/pricingPlans.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'faqExpansionQuestion',
				data:   (await import('@/sections/expansions/faqQuestion.js')).data,
				config: (await import('@/sections/expansions/faqQuestion.js')).config,
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
			{ text: 'Stats',   href: '#statCardRow'    },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features', href: '#featureCardIntro'  },
			{ text: 'Showcase', href: '#showcaseHoriCase'   },
			{ text: 'Process',  href: '#processStepTimeline' },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',        href: '#pricingCardPlans'      },
			{ text: 'Testimonials', href: '#testimonialHori'      },
			{ text: 'FAQ',          href: '#faqExpansionQuestion'  },
			{ text: 'Get Started',  href: '#ctaModernNeat'               },
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
	{ text: 'Instagram', href: '#', icon: 'ri:instagram-line'  },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill' },
];
