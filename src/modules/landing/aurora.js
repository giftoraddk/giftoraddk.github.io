// ── UI Common ─────────────────────────────────────────────────────────────────
// Meta SEO của trang (src/pages/landing/aurora.astro) — xem boardPageSeo() ở packages/apex/tool/board-seo.js.
// indexable: false — trang DEMO giao diện (nội dung mẫu, trùng section với các theme khác): noindex + không vào
// sitemap/llms.txt. Khi có nội dung thật thì đổi thành true (src/modules/landing/pages.js tự đưa vào sitemap).
export const page = {
	path: '/landing/aurora/',
	lang: 'en',
	name: 'Aurora',
	title: 'Aurora — Ethereal SaaS Landing',
	description: 'Aurora is an ethereal SaaS landing theme built with Apex web components: hero, stats, feature grid, team, pricing plans, testimonials and FAQ.',
	indexable: false,
};

export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'pastel',
		mainColors: '#7c3aed|#06b6d4|#2dd4bf|#38bdf8|#c4b5fd', // primary|secondary|accent|info|warning
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'pastel',
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
				id: 'trustedSlideLogosSpatial',
				data:   (await import('@/sections/sliders/trustedLogosSpatial.js')).data,
				config: (await import('@/sections/sliders/trustedLogosSpatial.js')).config,
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
				id: 'teamCardGridNeat',
				data:   (await import('@/sections/cards/teamGridNeat.js')).data,
				config: (await import('@/sections/cards/teamGridNeat.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'testimonialMasonryNeatApex',
				data:   (await import('@/sections/masonries/testimonialNeatApex.js')).data,
				config: (await import('@/sections/masonries/testimonialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'pricingTabPlansApex',
				data:   (await import('@/sections/tabs/pricingPlansApex.js')).data,
				config: (await import('@/sections/tabs/pricingPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'faqExpansion',
				data:   (await import('@/sections/expansions/faq.js')).data,
				config: (await import('@/sections/expansions/faq.js')).config,
				sort: 0, col: '12', container: true,
			},
			{
				id: 'ctaSpatialNeatApex',
				data:   (await import('@/sections/cards/ctaNeatApex.js')).data,
				config: (await import('@/sections/cards/ctaNeatApex.js')).config,
				sort: 0, col: '12', container: true,
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
			{ text: 'Intro',   href: '#heroSpatialNeatCenterApex' },
			{ text: 'Stats',   href: '#statCardRowApex'   },
			{ text: 'Trusted', href: '#trustedSlideLogosSpatial'  },
		],
	},
	{
		iconMobile: 'ri:pencil-ruler-2-line',
		text: 'Product',
		items: [
			{ text: 'Features', href: '#featureHoriIntroApex' },
			{ text: 'Web',      href: '#featureCardWeb'   },
			{ text: 'Team',     href: '#teamCardGridNeat'      },
		],
	},
	{
		iconMobile: 'ri:money-dollar-circle-line',
		text: 'Pricing',
		items: [
			{ text: 'Plans',        href: '#pricingTabPlansApex'         },
			{ text: 'Testimonials', href: '#testimonialMasonryNeatApex' },
			{ text: 'FAQ',          href: '#faqExpansion'            },
			{ text: 'Get Started',  href: '#ctaSpatialNeatApex'                 },
		],
	},
	{
		iconMobile: 'ri:file-search-line',
		text: 'Document',
		href: '/doc',
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
