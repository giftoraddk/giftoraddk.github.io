// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'spatial',
		mainColors: '#7c3aed|#06b6d4|#2dd4bf|#38bdf8|#c4b5fd', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
		mainColors: '#7c3aed|#06b6d4|#2dd4bf|#38bdf8|#c4b5fd', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars', tint: '#7c3aed', speed: 0.4, size: '1~3', push: true, pushRadius: 150, pushStrength: 45,
		gradient: true, total: 4, colorful: true, blobType: 'ellipse', blobMove: 'swap', deg: 60, distance: 95,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Aurora',
		href: '/landing/aurora/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'heroSpatialNeatCenterApex',
				data:   (await import('@/sections/hero/spatialNeatCenterApex.js')).data,
				config: (await import('@/sections/hero/spatialNeatCenterApex.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'statsSpatialCardRowApex',
				data:   (await import('@/sections/stats/spatialCardRowApex.js')).data,
				config: (await import('@/sections/stats/spatialCardRowApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'trustedSpatialSlideLogos',
				data:   (await import('@/sections/trusted/spatialSlideLogos.js')).data,
				config: (await import('@/sections/trusted/spatialSlideLogos.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featuresSpatialHoriIntroApex',
				data:   (await import('@/sections/features/spatialHoriIntroApex.js')).data,
				config: (await import('@/sections/features/spatialHoriIntroApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featuresSpatialCardWebApex',
				data:   (await import('@/sections/features/spatialCardWebApex.js')).data,
				config: (await import('@/sections/features/spatialCardWebApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'teamSpatialCardGridNeat',
				data:   (await import('@/sections/team/spatialCardGridNeat.js')).data,
				config: (await import('@/sections/team/spatialCardGridNeat.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialsSpatialMasonryNeatApex',
				data:   (await import('@/sections/testimonials/spatialMasonryNeatApex.js')).data,
				config: (await import('@/sections/testimonials/spatialMasonryNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingSpatialTabPlansApex',
				data:   (await import('@/sections/pricing/spatialTabPlansApex.js')).data,
				config: (await import('@/sections/pricing/spatialTabPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'faqSpatialExpansionApex',
				data:   (await import('@/sections/faq/spatialExpansionApex.js')).data,
				config: (await import('@/sections/faq/spatialExpansionApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaSpatialNeatApex',
				data:   (await import('@/sections/cta/spatialNeatApex.js')).data,
				config: (await import('@/sections/cta/spatialNeatApex.js')).config,
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
			{ text: 'Intro',   href: '#heroSpatialNeatCenterApex' },
			{ text: 'Stats',   href: '#statsSpatialCardRowApex'   },
			{ text: 'Trusted', href: '#trustedSpatialSlideLogos'  },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features', href: '#featuresSpatialHoriIntroApex' },
			{ text: 'Web',      href: '#featuresSpatialCardWebApex'   },
			{ text: 'Team',     href: '#teamSpatialCardGridNeat'      },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',        href: '#pricingSpatialTabPlansApex'         },
			{ text: 'Testimonials', href: '#testimonialsSpatialMasonryNeatApex' },
			{ text: 'FAQ',          href: '#faqSpatialExpansionApex'            },
			{ text: 'Get Started',  href: '#ctaSpatialNeatApex'                 },
		],
	},
	{
		iconMobile: 'ri:file-search-line',
		text: 'Docs',
		href: '/docs',
	},
	{
		iconMobile: 'ri:apps-ai-line',
		text: 'Components UI',
		href: '/ui',
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
