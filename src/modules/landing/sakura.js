// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'light', // set default
	light: {
		ui: 'spatial',
		mainColors: '#f9a8d4|#c4b5fd|#67e8f9|#fbcfe8|#fde68a', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
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
				data:   (await import('@/sections/hero/spatialHoriNeat.js')).data,
				config: (await import('@/sections/hero/spatialHoriNeat.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'trustedSpatialSlideLogos',
				data:   (await import('@/sections/trusted/spatialSlideLogos.js')).data,
				config: (await import('@/sections/trusted/spatialSlideLogos.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featuresSpatialHoriIntro',
				data:   (await import('@/sections/features/spatialHoriIntro.js')).data,
				config: (await import('@/sections/features/spatialHoriIntro.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialsSpatialMasonryNeat',
				data:   (await import('@/sections/testimonials/spatialMasonryNeat.js')).data,
				config: (await import('@/sections/testimonials/spatialMasonryNeat.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingSpatialCardPlans',
				data:   (await import('@/sections/pricing/spatialCardPlans.js')).data,
				config: (await import('@/sections/pricing/spatialCardPlans.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaSpatialNeat',
				data:   (await import('@/sections/cta/spatialNeat.js')).data,
				config: (await import('@/sections/cta/spatialNeat.js')).config,
				sort: 0, col: '12', container: true,
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
			{ text: 'Intro',   href: '#heroSpatialHoriNeat'    },
			{ text: 'Trusted', href: '#trustedSpatialSlideLogos' },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features',      href: '#featuresSpatialHoriIntro'          },
			{ text: 'Testimonials',  href: '#testimonialsSpatialMasonryNeat'    },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',       href: '#pricingSpatialCardPlans' },
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
