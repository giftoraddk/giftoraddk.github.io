export const hashtags = ['blog', 'modern', 'slider', 'image', 'hori', 'posts'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/meta.heading/meta.ctaLabel là field top-level, còn
// danh sách bài blog (nhiều item, độ dài co giãn) nằm NESTED trong `slider` (tên field khớp tên
// tier marker `slider` mà web-board dùng, xem Tier 1's `dataKey: 'slider'` bên dưới). Mỗi phần
// tử `slider[i]` là `{pics, title, meta:{date, category}}` — không phải 1 record thật nên tự do
// đặt field theo nhu cầu template.
export const data = [
	{
		subtitle: 'BLOG',
		meta: { heading: 'Insights & updates', ctaLabel: 'View all posts →' },
		slider: [
			{
				pics: 'https://placehold.co/600x300/8B8680/ddd',
				title: 'Best practices for continuous delivery in 2024',
				meta: { date: 'May 20, 2024', category: 'DevOps' },
			},
			{
				pics: 'https://placehold.co/600x300/8B8680/ddd',
				title: 'Scaling your engineering team effectively',
				meta: { date: 'May 15, 2024', category: 'Leadership' },
			},
			{
				pics: 'https://placehold.co/600x300/8B8680/ddd',
				title: 'How to improve deployment success rates',
				meta: { date: 'May 10, 2024', category: 'Engineering' },
			},
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ BLOG + heading  col-9  │ link  col-3  │  ← intro row, full-width
//  Row 2 │ slider          col-12               │  ← 3 cards per view
//
// Card inner grid:
//   row 1 │ image (col-12)              │
//   row 2 │ title (col-12)              │
//   row 3 │ date (col-?) | cat (col-?)  │

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro row (static, full-width) ────────────────────────────
		// Group 0 col-9: label + heading stacked; Group 1 col-3: link right-aligned
		{
			groupCol: ['9', '3'],
			groupRow: ['auto', 'auto'],
			groupJustify: ['left', 'right'],
			groupStyle: [
				{ flexDirection: 'column', gap: '0.5rem' },
				{ alignItems: 'center', padding: '2rem 0 1.5rem' },
			],
			makes: [
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '600', // custom fontWeight
								letterSpacing: '0.12em', // custom letterSpacing
								textTransform: 'uppercase',
								color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
								margin: '0',
							},
						},
					},
					{
						bit: 'meta.heading',
						opt: {
							mode: 'h3',
              motion: true,
              word: false,
              effect: 'typeIn',
							stys: {
								fontWeight: '700', // custom fontWeight
								letterSpacing: '-0.02em', // custom letterSpacing
								color: 'var(--color-base-content)',
								margin: '0',
							},
						},
					},
				],
				[
					{
						bit: 'meta.ctaLabel',
						opt: {
							mode: 'a',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)',
								fontWeight: '600',
								color: 'var(--color-primary)',
								textDecoration: 'none',
								whiteSpace: 'nowrap',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Blog post slider (array, full-width, 3 visible) ───────────
		[
			{
				dataKey: 'slider',
				slider: { nav: false, loop: true, slides: 3, spacing: 20, dots: false },
				groupCol: ['12', '12', '12'],
				groupRow: ['auto', 'auto', 'auto'],
				groupJustify: ['none', 'left', 'left'],
				groupStyle: [{}, { padding: '0.875rem 1rem 0.375rem' }, { gap: '0.75rem', alignItems: 'center', padding: '0 1rem 1rem' }],
				makes: [
					// post thumbnail
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: {
									width: '100%',
									height: '180px',
									objectFit: 'cover',
									display: 'block',
								},
							},
						},
					],
					// post title
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									lineHeight: '1.4', // custom lineHeight
                  minHeight: '3rem',
									margin: '0',
									color: 'var(--color-base-content)',
								},
							},
						},
					],
					// date + category tag on same row
					[
						{
							bit: 'meta.date',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
								},
							},
						},
						{
							bit: 'meta.category',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
								},
							},
						},
					],
				],
				stys: {
					background: 'var(--color-base-200)',
					borderRadius: '0.75rem',
					overflow: 'hidden',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)',
				},
			},
		],
	],
	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
