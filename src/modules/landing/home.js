// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/home.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/home/',
	lang: 'en',
	name: 'Apex',
	title: 'Apex — Build Interfaces That Work Everywhere',
	description: 'Drop Apex into any stack — React, Vue, Angular, Svelte or plain HTML. Theme with CSS variables, compose with JSON config and ship beautiful UIs in hours.',
	indexable: false,
};

export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'pastel',
		mainColors: '#34ace0|#706fd3|#e2a9db|#00c7d4|#ffba1f', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'pastel',
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
				data:   (await import('@/sections/cards/heroNeatCenter.js')).data,
				config: (await import('@/sections/cards/heroNeatCenter.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},
			{
				id: 'statCardRowApex',
				data:   (await import('@/sections/cards/statRowApex.js')).data,
				config: (await import('@/sections/cards/statRowApex.js')).config,
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
				config: (await import('@/sections/sliders/trustedLogosSpatial.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'heroSplitGallery',
				data:   (await import('@/sections/cards/heroSplitGallery.js')).data,
				config: (await import('@/sections/cards/heroSplitGallery.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featureHoriIntroApex',
				data:   (await import('@/sections/cards/featureHoriIntroApex.js')).data,
				config: (await import('@/sections/cards/featureHoriIntroApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'featureCardWeb',
				data:   (await import('@/sections/masonries/featureWeb.js')).data,
				config: (await import('@/sections/masonries/featureWeb.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'benefitCardCompare',
				data:   (await import('@/sections/cards/benefitCompare.js')).data,
				config: (await import('@/sections/cards/benefitCompare.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingTabPlansApex',
				data:   (await import('@/sections/tabs/pricingPlansApex.js')).data,
				config: (await import('@/sections/tabs/pricingPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialMasonryNeatApex',
				data:   (await import('@/sections/masonries/testimonialNeatApex.js')).data,
				config: (await import('@/sections/masonries/testimonialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'faqExpansion',
				data:   (await import('@/sections/expansions/faq.js')).data,
				config: (await import('@/sections/expansions/faq.js')).config,
				sort: 0, col: '12', container: true,
        // stys: { backgroundColor: 'var(--color-base-200)' },
			},
			{
				id: 'ctaSpatialNeatApex',
				data:   (await import('@/sections/cards/ctaNeatApex.js')).data,
				config: (await import('@/sections/cards/ctaNeatApex.js')).config,
				sort: 0, col: '12', container: true,
        // stys: { backgroundColor: 'var(--color-base-200)' },
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
			{ text: 'Intro',    href: '#heroSpatialNeatCenterApex'  },
			{ text: 'Stats',    href: '#statCardRowApex'    },
			{ text: 'Trusted',  href: '#trustedSpatialSlideLogosLTR' },
			{ text: 'Gallery',  href: '#heroSplitGallery' },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Features',
		items: [
			{ text: 'Intro',    href: '#featureHoriIntroApex' },
			{ text: 'Web',      href: '#featureCardWeb'   },
			{ text: 'Benefits', href: '#benefitCardCompare'    },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',        href: '#pricingTabPlansApex'          },
			{ text: 'Testimonials', href: '#testimonialMasonryNeatApex'  },
			{ text: 'FAQ',          href: '#faqExpansion'             },
			{ text: 'Get Started',  href: '#ctaSpatialNeatApex'                  },
		],
	},
  {
		iconMobile: 'ri:file-search-line',
		text: 'Document',
    href: '/doc'
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