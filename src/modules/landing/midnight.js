// ── UI Common ─────────────────────────────────────────────────────────────────
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
				id: 'statsModernCardRow',
				data:   (await import('@/sections/stats/modernCardRow.js')).data,
				config: (await import('@/sections/stats/modernCardRow.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'featuresModernCardIntro',
				data:   (await import('@/sections/features/modernCardIntro.js')).data,
				config: (await import('@/sections/features/modernCardIntro.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'showcaseModernHoriCase',
				data:   (await import('@/sections/showcase/modernHoriCase.js')).data,
				config: (await import('@/sections/showcase/modernHoriCase.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'featuresModernHoriIntro',
				data:   (await import('@/sections/features/modernHoriIntro.js')).data,
				config: (await import('@/sections/features/modernHoriIntro.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'processModernStepTimeline',
				data:   (await import('@/sections/process/modernStepTimeline.js')).data,
				config: (await import('@/sections/process/modernStepTimeline.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'testimonialsModernHori',
				data:   (await import('@/sections/testimonials/modernHori.js')).data,
				config: (await import('@/sections/testimonials/modernHori.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingModernCardPlans',
				data:   (await import('@/sections/pricing/modernCardPlans.js')).data,
				config: (await import('@/sections/pricing/modernCardPlans.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
			{
				id: 'faqModernExpansionQuestion',
				data:   (await import('@/sections/faq/modernExpansionQuestion.js')).data,
				config: (await import('@/sections/faq/modernExpansionQuestion.js')).config,
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
			{ text: 'Stats',   href: '#statsModernCardRow'    },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features', href: '#featuresModernCardIntro'  },
			{ text: 'Showcase', href: '#showcaseModernHoriCase'   },
			{ text: 'Process',  href: '#processModernStepTimeline' },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',        href: '#pricingModernCardPlans'      },
			{ text: 'Testimonials', href: '#testimonialsModernHori'      },
			{ text: 'FAQ',          href: '#faqModernExpansionQuestion'  },
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
