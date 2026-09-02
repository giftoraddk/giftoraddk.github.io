// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'spatial',
		mainColors: '#34ace0|#706fd3|#e2a9db|#00c7d4|#ffba1f', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
		mainColors: '#34ace0|#706fd3|#e2a9db|#00c7d4|#ffba1f', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars', tint: '#34ace0', speed: 0.5, size: '1~4', push: true, pushRadius: 170, pushStrength: 55,
		gradient: true, total: 3, colorful: true, blobType: 'circleOverlap', blobMove: 'swap', deg: 0, distance: 90,
	},
};

// ── Views ─────────────────────────────────────────────────────────────────────
export const views = [
	{
		text: 'Intro',
		href: '/',
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
				id: 'trustedSpatialSlideLogosLTR',
				data: [
					{ name: 'React',   logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Vue',     logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Angular', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Svelte',  logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Astro',   logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Next.js', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Nuxt',    logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'SolidJS', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Lit',     logo: 'https://placehold.co/10/8B8680/8B8680' },
				],
				config: (await import('@/sections/trusted/spatialSlideLogos.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'heroSpatialSplitGalleryApex',
				data:   (await import('@/sections/hero/spatialSplitGalleryApex.js')).data,
				config: (await import('@/sections/hero/spatialSplitGalleryApex.js')).config,
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
				id: 'benefitsModernCardCompare',
				data:   (await import('@/sections/benefits/modernCardCompare.js')).data,
				config: (await import('@/sections/benefits/modernCardCompare.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingSpatialTabPlansApex',
				data:   (await import('@/sections/pricing/spatialTabPlansApex.js')).data,
				config: (await import('@/sections/pricing/spatialTabPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialsSpatialMasonryNeatApex',
				data:   (await import('@/sections/testimonials/spatialMasonryNeatApex.js')).data,
				config: (await import('@/sections/testimonials/spatialMasonryNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'faqSpatialExpansionApex',
				data:   (await import('@/sections/faq/spatialExpansionApex.js')).data,
				config: (await import('@/sections/faq/spatialExpansionApex.js')).config,
				sort: 0, col: '12', container: true,
        // stys: { backgroundColor: 'var(--color-base-200)' },
			},
			{
				id: 'ctaSpatialNeatApex',
				data:   (await import('@/sections/cta/spatialNeatApex.js')).data,
				config: (await import('@/sections/cta/spatialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
        // stys: { backgroundColor: 'var(--color-base-200)' },
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
			{ text: 'Intro',    href: '#heroSpatialNeatCenterApex'  },
			{ text: 'Stats',    href: '#statsSpatialCardRowApex'    },
			{ text: 'Trusted',  href: '#trustedSpatialSlideLogosLTR' },
			{ text: 'Gallery',  href: '#heroSpatialSplitGalleryApex' },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Features',
		items: [
			{ text: 'Intro',    href: '#featuresSpatialHoriIntroApex' },
			{ text: 'Web',      href: '#featuresSpatialCardWebApex'   },
			{ text: 'Benefits', href: '#benefitsModernCardCompare'    },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',        href: '#pricingSpatialTabPlansApex'          },
			{ text: 'Testimonials', href: '#testimonialsSpatialMasonryNeatApex'  },
			{ text: 'FAQ',          href: '#faqSpatialExpansionApex'             },
			{ text: 'Get Started',  href: '#ctaSpatialNeatApex'                  },
		],
	},
  {
		iconMobile: 'ri:file-search-line',
		text: 'Docs',
    href: '/docs'
  },
  {
		iconMobile: 'ri:apps-ai-line',
		text: 'Components UI',
    href: '/ui'
  }
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
	{ text: 'LinkedIn',  href: 'https://www.linkedin.com/in/dung-p-965a62187/', icon: 'ri:linkedin-box-fill'  },
]