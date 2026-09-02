// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'modern',
		mainColors: '#a77ceb|#296073|#3596b5|#00c7d4|#fbbf24', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'modern',
		mainColors: '#a77ceb|#296073|#3596b5|#00c7d4|#fbbf24', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	bg: {
    concept: 'bubbles',
    tint: '#a77ceb',
    total: 3,
    deg: 0,
    limit: 100,
    speed: 0.4,
    size: '4~10',
    blur: true,
    gradient: true,
    blobType: 'circleOverlap',
    distance: 100,
    blobMove: 'swap',
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Landing',
		href: '/landing/spatial/',
		iconMobile: 'ri:home-line',
		sections: [
      {
				id: 'heroSpatialSplitGallery',
				data: (await import('@/sections/hero/spatialHoriGallery.js')).data,
				config: (await import('@/sections/hero/spatialHoriGallery.js')).config,
				sort: 0,
				col: '12',
        container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' },
			},
      {
				id: 'blogSpatialSlideNeat',
				data: (await import('@/sections/blog/spatialSlideNeat.js')).data,
				config: (await import('@/sections/blog/spatialSlideNeat.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
      {
				id: 'testimonialsSpatialMasonryNeat',
				data: (await import('@/sections/testimonials/spatialMasonryNeat.js')).data,
				config: (await import('@/sections/testimonials/spatialMasonryNeat.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
      {
				id: 'teamSpatialCardGridNeat',
				data: (await import('@/sections/team/spatialCardGridNeat.js')).data,
				config: (await import('@/sections/team/spatialCardGridNeat.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
      {
				id: 'pricingSpatialTabPlans',
				data: (await import('@/sections/pricing/spatialTabPlans.js')).data,
				config: (await import('@/sections/pricing/spatialTabPlans.js')).config,
				sort: 0,
				col: '12',
        container: true,
			},
			{
				id: 'contactSpatialHoriMap',
				data: (await import('@/sections/contact/spatialHoriMap.js')).data,
				config: (await import('@/sections/contact/spatialHoriMap.js')).config,
				sort: 0,
				col: '12',
				// specific props for web-board customization section styles
				container: true,
			},
    ],
	},
];

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