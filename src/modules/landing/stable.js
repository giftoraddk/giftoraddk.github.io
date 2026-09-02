// ── UI Common ─────────────────────────────────────────────────────────────────
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
const _slideLogos = await import('@/sections/trusted/spatialSlideLogos.js');
const _slideLogosRTL = {
	..._slideLogos.config,
	tiers: [[{ ..._slideLogos.config.tiers[0][0], slider: { ..._slideLogos.config.tiers[0][0].slider, reverse: true } }]],
};

export const views = [
	{
		text: 'Landing',
		href: '/landing/stable/',
		iconMobile: 'ri:home-line',
		sections: [
      {
				id: 'heroSpatialHoriNeat',
				data: (await import('@/sections/hero/spatialHoriNeat.js')).data,
				config: (await import('@/sections/hero/spatialHoriNeat.js')).config,
				sort: 0,
				col: '12',
        container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'statsSpatialCardRow',
				data: (await import('@/sections/stats/spatialCardRow.js')).data,
				config: (await import('@/sections/stats/spatialCardRow.js')).config,
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
				id: 'heroSpatialHoriFeature',
				data: (await import('@/sections/hero/spatialHoriFeature.js')).data,
				config: (await import('@/sections/hero/spatialHoriFeature.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
      {
				id: 'pricingSpatialCardPlans',
				data: (await import('@/sections/pricing/spatialCardPlans.js')).data,
				config: (await import('@/sections/pricing/spatialCardPlans.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
			{
				id: 'featuresSpatialHoriIntro',
				data: (await import('@/sections/features/spatialHoriIntro.js')).data,
				config: (await import('@/sections/features/spatialHoriIntro.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
			{
				id: 'ctaSpatialNeat',
				data: (await import('@/sections/cta/spatialNeat.js')).data,
				config: (await import('@/sections/cta/spatialNeat.js')).config,
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