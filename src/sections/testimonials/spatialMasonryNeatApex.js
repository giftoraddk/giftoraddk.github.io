import { getStyleOpts } from '@/services/helper';

export const hashtags = ['testimonials', 'spatial', 'masonry', 'quotes', 'clients', 'cards', 'apex'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/meta.sectionHeading/sectionHeadingAccent/
// sectionDescription là field top-level, còn danh sách testimonial (nhiều item) nằm NESTED
// trong `masonry` (tên field khớp tên tier marker `masonry`, xem Tier 1's `dataKey: 'masonry'`
// bên dưới).
export const data = [
	{
		subtitle: 'CUSTOMER STORIES',
		meta: {
			sectionHeading: 'What our clients say',
			sectionHeadingAccent: 'about Apex.',
			sectionDescription: 'Real developers. Real products. Zero boilerplate.',
		},
		masonry: [
			{
				title: '"Dropped it into our React app in 10 minutes"',
				content: 'No wrappers, no adapters — just import the script tag and all 80+ components work. Our design system migration that was supposed to take a quarter finished in three weeks.',
				pics: 'https://i.pravatar.cc/80?img=15',
				meta: { name: 'Andy Tran', handle: '@andytran_dev' },
			},
			{
				title: '"True framework agnosticism — finally"',
				content: 'We run React, Vue, and a legacy jQuery app. Apex is the only component library that works across all three without a single line of glue code.',
				pics: 'https://i.pravatar.cc/80?img=25',
				meta: { name: 'Sara Kim', handle: '@sarakim_ui' },
			},
			{
				title: '"The theming system is a work of art"',
				content: 'Five CSS variables and you have a completely branded design system. Dark mode, high-contrast, even per-tenant white-labeling — all handled without forking the library. Our customers love the polish.',
				pics: 'https://i.pravatar.cc/80?img=8',
				meta: { name: 'James Okafor', handle: '@jamesokafor' },
			},
			{
				title: '"SSR just worked out of the box"',
				content: 'Next.js + Apex. Zero hydration mismatches, zero flash of unstyled content. Ship it.',
				pics: 'https://i.pravatar.cc/80?img=47',
				meta: { name: 'Mia Chen', handle: '@mia_frontend' },
			},
			{
				title: '"web-board replaced 2000 lines of template code"',
				content: 'We rebuilt our marketing pages as JSON configs. Designers now ship layout changes without touching a single JSX file. The declarative approach feels like the right abstraction the ecosystem was always missing.',
				pics: 'https://i.pravatar.cc/80?img=12',
				meta: { name: 'Lucas Pereira', handle: '@lucaspereira' },
			},
			{
				title: '"IndexedDB caching saved our mobile users"',
				content: 'Offline-first data without writing a single service worker. The conductor layer just handled it.',
				pics: 'https://i.pravatar.cc/80?img=35',
				meta: { name: 'Emma Walsh', handle: '@emmawalsh' },
			},
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ intro heading + subtitle  col-12  │
//   Tier 1 │ 6 cards wrapper           col-12  │
//            └─ masonry: 3 CSS columns × 2 rows

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Badge pill + intro (static, full width) ─────────────────────
		{
			groupCol: ['12', '12'],
			groupRow: ['auto', 'auto'],
			groupJustify: ['center', 'center'],
			groupStyle: [
				// Group 0: badge pill
				{
					maxWidth: 'fit-content',
					margin: '3rem auto 0',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)',
				},
				// Group 1: headings + subtitle
				{ flexDirection: 'column', gap: '0.25rem', textAlign: 'center', padding: '1rem 0 2.5rem' },
			],
			makes: [
				// Group 0: badge
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'span',
							prefix: 'ri:bard-fill', iconSize: '1.1rem',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', fontWeight: '500',
								color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
							},
						},
					},
				],
				// Group 1: headings + subtitle
				[
					{
						bit: 'meta.sectionHeading',
						opt: {
							mode: 'h2',
							motion: true, word: false, effect: 'fallDown',
							stys: {
								margin: '0',
								color: 'var(--color-base-content)',
							},
						},
					},
					{
						bit: 'meta.sectionHeadingAccent',
						opt: {
							mode: 'h2',
							motion: true, word: false, effect: 'riseUp',
							stys: {
								fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', // custom fontSize
								margin: '0',
								color: 'var(--color-primary)',
							},
						},
					},
					{
						bit: 'meta.sectionDescription',
						opt: {
							mode: 'p',
							stys: {
								lineHeight: '1.65', // custom lineHeight
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								maxWidth: '40rem', margin: '1.25rem auto 0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Testimonial cards (masonry, 3 CSS columns) ───────────────────
		[
			{
				// items — đọc từ data[0].masonry (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'masonry',
				masonry: { col: 3, gap: '1.5rem' },
				groupCol: ['12', '12', '2', '10'],
				groupRow: ['auto', 'auto', 'auto', 'auto'],
				groupJustify: ['none', 'none', 'center', 'left'],
				groupStyle: [
					{ padding: '1.5rem 1.5rem 0.75rem' },
					{ padding: '0 1.5rem 1.25rem' },
					{ alignItems: 'center', padding: '0 0 1.5rem 1.5rem' },
					{ flexDirection: 'column', gap: '0.15rem', padding: '0 1.5rem 1.5rem 0.75rem', justifyContent: 'center' },
				],
				makes: [
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontWeight: '700', margin: '0', // custom fontWeight
									color: 'var(--color-base-content)',
								},
							},
						},
					],
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									lineHeight: '1.65', margin: '0', // custom lineHeight
									color: 'color-mix(in oklab, var(--color-base-content) 72%, transparent)',
								},
							},
						},
					],
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: {
									width: '2.5rem', height: '2.5rem', borderRadius: '50%',
									objectFit: 'cover', flexShrink: '0', display: 'block',
								},
							},
						},
					],
					[
						{
							bit: 'meta.name',
							opt: {
								mode: 'span',
								stys: {
									fontWeight: '700', // custom fontWeight
									lineHeight: '1.3', display: 'block', // custom lineHeight
									color: 'var(--color-base-content)',
								},
							},
						},
						{
							bit: 'meta.handle',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									lineHeight: '1.3', display: 'block', // custom lineHeight
									color: 'var(--color-primary)',
								},
							},
						},
					],
				],
				bg: {
					...getStyleOpts({ rounded: '1.25rem', tint: 'var(--color-primary)', total: 1, blobType: 'ellipse', deg: 135 }),
				},
				anime: 'fade-in',
				animeQueue: '100ms',
			},
		],
	],

	bg: {
    ...getStyleOpts({ rounded: '0', tint: 'var(--color-primary)', total: 2, blobType: 'circleOverlap', deg: 180, distance: 100 }),
	},

	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
