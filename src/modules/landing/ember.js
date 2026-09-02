// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'spatial',
		mainColors: '#d4af37|#8b5e34|#f5dd9f|#c99a3a|#efbf04', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
		mainColors: '#d4af37|#8b5e34|#f5dd9f|#c99a3a|#efbf04', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// colorful:false + total thấp giữ nền vàng-đồng đơn sắc, cảm giác cao cấp tối giản
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars', tint: '#d4af37', density: 0.6, speed: 0.25, size: '1~3',
		gradient: true, total: 2, colorful: false, blobType: 'ellipse', blobMove: 'pulse', deg: 90, distance: 85,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Ember',
		href: '/landing/ember/',
		iconMobile: 'ri:home-line',
		sections: [
			{
				id: 'heroSpatialVideoNeatApex',
				data:   (await import('@/sections/hero/spatialVideoNeatApex.js')).data,
				config: (await import('@/sections/hero/spatialVideoNeatApex.js')).config,
				sort: 0, col: '12', container: false,
				stys: { marginTop: '-4rem' }, // only item first
			},
			{
				id: 'statsSpatialCardRowApex',
				data:   (await import('@/sections/stats/spatialCardRowApex.js')).data,
				config: (await import('@/sections/stats/spatialCardRowApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featuresSpatialCardWebApex',
				data:   (await import('@/sections/features/spatialCardWebApex.js')).data,
				config: (await import('@/sections/features/spatialCardWebApex.js')).config,
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
			{ text: 'Intro', href: '#heroSpatialVideoNeatApex' },
			{ text: 'Stats', href: '#statsSpatialCardRowApex'  },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features',     href: '#featuresSpatialCardWebApex'         },
			{ text: 'Testimonials', href: '#testimonialsSpatialMasonryNeatApex' },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',       href: '#pricingSpatialTabPlansApex' },
			{ text: 'Get Started', href: '#ctaSpatialNeatApex'         },
		],
	},
];

export const policies = [
	{ text: 'Terms',          href: '#' },
	{ text: 'Privacy Policy', href: '#' },
];

export const socials = [
	{ text: 'Twitter',   href: '#', icon: 'ri:twitter-x-fill'  },
	{ text: 'Instagram', href: '#', icon: 'ri:instagram-line'  },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill' },
];
