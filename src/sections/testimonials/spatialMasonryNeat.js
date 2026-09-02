import { getStyleOpts } from '@/services/helper';

export const hashtags = ['testimonials', 'spatial', 'masonry', 'quotes', 'clients', 'cards'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: meta.sectionHeading/sectionHeadingAccent/sectionDescription là
// field top-level, còn danh sách testimonial (nhiều item) nằm NESTED trong `masonry` (tên field
// khớp tên tier marker `masonry`, xem Tier 1's `dataKey: 'masonry'` bên dưới).
export const data = [
	{
		meta: {
			sectionHeading: 'What our clients say',
			sectionHeadingAccent: 'about us.',
			sectionDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit nulla at ultrices urna adipiscing penatibus duis elementum ante.',
		},
		masonry: [
			{
				title: '"Best investment our engineering team made this year"',
				content: 'Onboarding a new backend engineer used to take a full week. Now they\'re making meaningful commits by day two. The local dev environment spins up in one command, docs are always in sync with the code, and the architecture diagrams generate themselves. It just works.',
				pics: 'https://i.pravatar.cc/80?img=15',
				meta: { name: 'Andy Smith', handle: '@andysmith' },
			},
			{
				title: '"Code reviews that actually teach"',
				content: 'Inline suggestions explain the why, not just the what. Junior devs on my team are leveling up faster than ever.',
				pics: 'https://i.pravatar.cc/80?img=25',
				meta: { name: 'Kate Morrison', handle: '@katemorrison' },
			},
			{
				title: '"Shipping features has never been this fast"',
				content: 'We cut our release cycle from two weeks to two days. The CI/CD pipeline practically configures itself, and rollbacks take seconds. Our engineers stopped dreading deploy Fridays — now every day feels safe to ship.',
				pics: 'https://i.pravatar.cc/80?img=8',
				meta: { name: 'John Carter', handle: '@johncarter' },
			},
			{
				title: '"Finally, a dev tool that respects my time"',
				content: 'The autocomplete is scarily accurate and the editor feels instant even on large monorepos.',
				pics: 'https://i.pravatar.cc/80?img=47',
				meta: { name: 'Sophie Moore', handle: '@sophiemoore' },
			},
			{
				title: '"Our on-call rotation went from chaos to calm"',
				content: 'Alerts used to wake us up at 3 AM for things that weren\'t even real incidents. Since we switched, the noise dropped by 80%. The anomaly detection actually understands our traffic patterns instead of firing on every spike. Sleep has been restored.',
				pics: 'https://i.pravatar.cc/80?img=12',
				meta: { name: 'Mike Warren', handle: '@mikewarren' },
			},
			{
				title: '"Debugging used to ruin my mornings"',
				content: 'Stack traces now link directly to the exact line and the relevant recent deploy. I find the root cause before my coffee gets cold.',
				pics: 'https://i.pravatar.cc/80?img=35',
				meta: { name: 'Lily Woods', handle: '@lilywoods' },
			},
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ intro heading + subtitle  col-12  │
//   Tier 1 │ 6 cards wrapper           col-12  │
//            └─ nested gi-wrap: card×col-4 → 3 per row × 2 rows
//
// Card inner grid (4-group):
//   row 0 │ quote title    col-12              │
//   row 1 │ body text      col-12              │
//   row 2 │ avatar  col-2  │ name+handle col-10 │

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro (static, full width) ───────────────────────────────
		{
			groupCol: ['12'],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [{ flexDirection: 'column', gap: '0.25rem', textAlign: 'center', padding: '3rem 0 2.5rem' }],
			makes: [
				[
					{
						bit: 'meta.sectionHeading',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'fallDown',
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
							motion: true,
							word: false,
							effect: 'riseUp',
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
								maxWidth: '40rem',
								margin: '1.25rem auto 0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Testimonial cards (masonry, 3 CSS columns) ──────────────
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
					// Quote title
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontWeight: '700', // custom fontWeight
									margin: '0',
									color: 'var(--color-base-content)',
								},
							},
						},
					],
					// Body text
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									lineHeight: '1.65', // custom lineHeight
									margin: '0',
									color: 'color-mix(in oklab, var(--color-base-content) 72%, transparent)',
								},
							},
						},
					],
					// Avatar
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: {
									width: '2.5rem',
									height: '2.5rem',
									borderRadius: '50%',
									objectFit: 'cover',
									flexShrink: '0',
									display: 'block',
								},
							},
						},
					],
					// Name + handle stacked
					[
						{
							bit: 'meta.name',
							opt: {
								mode: 'span',
								stys: {
									fontWeight: '700', // custom fontWeight
									lineHeight: '1.3', // custom lineHeight
									display: 'block',
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
									lineHeight: '1.3', // custom lineHeight
									display: 'block',
									color: 'var(--color-primary)',
								},
							},
						},
					],
				],
				bg: {
					...getStyleOpts({ rounded: '1.25rem', tint: '#a77ceb', total: 1, blobType: 'ellipse', deg: 135 }),
				},
				anime: 'fade-in',
				animeQueue: '100ms',
			},
		],
	],
  
  bg: {
    ...getStyleOpts({ rounded: '0', tint: '#a77ceb', total: 2, blobType: 'circleOverlap', blobMove: 'swap', deg: 45, distance: 100 }),
  },
  
	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
