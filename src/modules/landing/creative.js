// ── UI Common ─────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'spatial',
		mainColors: '#e51921|#0c50a1|#f5dd9f|#00c7d4|#ffba1f', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
		mainColors: '#e51921|#0c50a1|#f5dd9f|#00c7d4|#ffba1f', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	bg: {
		blur: true, quality: 'medium',
		concept: 'bubbles', tint: '#e51921', speed: 0.6, size: '4~14', push: true, pushRadius: 160, pushStrength: 50,
		gradient: true, total: 3, colorful: true, blobType: 'circleOverlap', blobMove: 'swap', deg: 45, distance: 80,
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
				id: 'heroSpatialVideoNeatApex',
				data: (await import('@/sections/hero/spatialVideoNeatApex.js')).data,
				config: (await import('@/sections/hero/spatialVideoNeatApex.js')).config,
				sort: 0,
				col: '12',
        container: false,
				stys: { marginTop: '-4rem' }, // only item first
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
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill'  },
]