export const hashtags = ['showcase', 'modern', 'slider', 'image', 'hori', 'case-studies'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/description/meta.heading/meta.ctaLabel là field
// top-level của intro (Tier 0), còn danh sách case study (nhiều item) nằm NESTED trong `slider`
// (tên field khớp tên tier marker `slider` mà Tier 1 dùng, xem Tier 1's `dataKey: 'slider'`
// bên dưới). Mỗi phần tử `slider[i]` là 1 case study tự do `{pics, title, content, meta.category}`.
export const data = [
	{
		subtitle: 'SHOWCASE',
		description: 'See how teams around the world use Nexora to build, ship, and scale amazing software.',
		meta: { heading: 'Real teams.\nReal results.', ctaLabel: 'View all case studies →' },
		slider: [
			{
				pics: 'https://placehold.co/600x300/8B8680/ddd',
				title: 'How Finova cut release time by 60% with Nexora',
				content: 'Finova reduced deployment cycles and eliminated manual handoffs.',
				meta: { category: 'FINOVA' },
			},
			{
				pics: 'https://placehold.co/600x300/8B8680/ddd',
				title: 'ScaleOps improved deployment speed by 3x',
				content: 'Automated pipelines transformed their engineering workflow.',
				meta: { category: 'SCALEOPS' },
			},
			{
				pics: 'https://placehold.co/600x300/8B8680/ddd',
				title: 'MoveFast increased productivity by 45%',
				content: 'A unified platform gave MoveFast full-stack visibility.',
				meta: { category: 'SAAS' },
			},
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ intro  col-5  │ slider  col-7  │
//
// Card inner grid:
//   row 1 │ image (col-12)            │
//   row 2 │ category label (col-12)   │
//   row 3 │ title + desc (col-12)     │

const baseConfig = {
	tiersCol: ['5', '7'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro (static, col-5) ────────────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['left'],
			groupStyle: [{ flexDirection: 'column', gap: '1rem' }],
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
							mode: 'h2',
              motion: true,
              word: false,
              effect: 'fallDown',
							stys: {
								color: 'var(--color-base-content)',
								margin: '0',
							},
						},
					},
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								lineHeight: '1.65', // custom lineHeight
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
							},
						},
					},
					{
						bit: 'meta.ctaLabel',
						opt: {
							mode: 'a',
							stys: {
								fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
								fontWeight: '600',
								color: 'var(--color-primary)',
								textDecoration: 'none',
								display: 'inline-block',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Case study slider (array, col-7) ─────────────────────────
		// slides:2 → two cards visible; partial 3rd card hints at more content
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: { nav: false, loop: true, slides: 2, spacing: 16, dots: false },
				groupCol: ['12', '12', '12'],
				groupRow: ['auto', 'auto', 'auto'],
				groupJustify: ['none', 'none', 'left'],
				groupStyle: [{}, { padding: '0.75rem 1rem 0.25rem' }, { flexDirection: 'column', gap: '0.25rem', padding: '0.25rem 1rem 1rem', minHeight: '5rem' }],
				makes: [
					// case study photo — full-width, fixed height
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
					// company / category label
					[
						{
							bit: 'meta.category',
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
					],
					// title + description
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									lineHeight: '1.35', // custom lineHeight
									margin: '0',
									color: 'var(--color-base-content)',
								},
							},
						},
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									lineHeight: '1.5', // custom lineHeight
									margin: '0',
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
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
