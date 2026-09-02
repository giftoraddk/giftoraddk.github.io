export const hashtags = ['testimonials', 'modern', 'slider', 'quotes', 'hori'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/meta.sectionHeading là field top-level, còn danh sách
// testimonial (nhiều item) nằm NESTED trong `slider` (tên field khớp tên tier marker `slider`,
// xem Tier 2's `dataKey: 'slider'` bên dưới).
export const data = [
	{
		subtitle: 'TESTIMONIALS',
		meta: {
			sectionHeading: 'Loved by teams\naround the world',
		},
		slider: [
			{
				title: 'Sarah Kim',
				content: 'Nexora transformed the way we build software. Our team ships faster, with fewer bugs and less stress.',
				pics: 'https://i.pravatar.cc/80?img=47',
				meta: { role: 'Head of Engineering, Finova' },
			},
			{
				title: 'Marcus Lee',
				content: 'The onboarding was seamless and the integrations just work. I wish we had switched to Nexora sooner.',
				pics: 'https://i.pravatar.cc/80?img=12',
				meta: { role: 'CTO, Arclight Labs' },
			},
			{
				title: 'Priya Nair',
				content: 'Deployment pipelines that used to take hours now run in minutes. The visibility across our stack is incredible.',
				pics: 'https://i.pravatar.cc/80?img=30',
				meta: { role: 'VP Engineering, Solaris' },
			},
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ intro    col-5  │ abstract-bg  col-7  gi-row-2  │
//  Row 2 │ slider   col-5  │ abstract-bg continues          │
//
// Card inner grid:
//   row 1 │ " (col-12)                   │
//   row 2 │ quote text (col-12)          │
//   row 3 │ avatar (col-2) │ name (col-10) │

const baseConfig = {
	tiersCol: ['5', '7', '5'],
	tiersRow: ['auto', 2, 'auto'],

	tiers: [
		// ── Tier 0: Intro heading (static, col-5) ────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ flexDirection: 'column', gap: '0.5rem' }],
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
						bit: 'meta.sectionHeading',
						opt: {
							mode: 'h3',
              motion: true,
              word: false,
              effect: 'riseUp',
							stys: {
								fontWeight: '700', // custom fontWeight
								letterSpacing: '-0.02em', // custom letterSpacing
								color: 'var(--color-base-content)',
								margin: '0',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Abstract background image (static, col-7, row-span 2) ────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['overflow'],
			groupStyle: [{ borderRadius: '1rem', height: '100%' }],
			stys: { height: '100%' },
			makes: [
				[
					{
						bitLocal: 'https://placehold.co/900x600/8B8680/ddd',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%',
								height: '100%',
								objectFit: 'cover',
								display: 'block',
								minHeight: '420px',
							},
						},
					},
				],
			],
      anime: 'bounce-in-right',
		},

		// ── Tier 2: Testimonial slider (array, col-5) ─────────────────────────
		// nav:true → < > arrows; slides:1 → one card per view
		// groupCol ['12','12','2','10']:
		//   groups 0+1 full-width rows (quote mark, body text)
		//   groups 2+3 same row (2+10=12): avatar left, name+role column right
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: { nav: true, loop: true, slides: 1, spacing: 0, dots: false },
				groupCol: ['12', '12', '2', '10'],
				groupRow: ['auto', 'auto', 'auto', 'auto'],
				groupJustify: ['none', 'none', 'center', 'left'],
				groupStyle: [
					{ padding: '1.25rem 1.25rem 0.5rem' },
					{ padding: '0 1.25rem 1rem' },
					{ alignItems: 'center', padding: '0.25rem 0 1.25rem 1.25rem' },
					// 'left' already gives display:flex — add column + gap for name/role stack
					{ flexDirection: 'column', gap: '0.1rem', padding: '0.25rem 1.25rem 1.25rem 0.5rem', justifyContent: 'center' },
				],
				makes: [
					// opening double-quote character (styled large, primary color)
					[
						{
							bitLocal: '“',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', // custom fontSize
                  lineHeight: '0.8',
									color: 'var(--color-primary)',
									display: 'block',
								},
							},
						},
					],
					// quote body
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									lineHeight: '1.65', // custom lineHeight
									margin: '0',
									color: 'var(--color-base-content)',
								},
							},
						},
					],
					// avatar circle
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: {
									width: '2.25rem',
									height: '2.25rem',
									borderRadius: '50%',
									objectFit: 'cover',
									flexShrink: '0',
								},
							},
						},
					],
					// name (bold) + role (small, muted) — stacked via flexDirection:column above
					[
						{
							bit: 'title',
							opt: {
								mode: 'span',
								stys: {
									fontWeight: '700', // custom fontWeight
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									lineHeight: '1.3', // custom lineHeight
									display: 'block',
									color: 'var(--color-base-content)',
								},
							},
						},
						{
							bit: 'meta.role',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									lineHeight: '1.4', // custom lineHeight
									display: 'block',
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								},
							},
						},
					],
				],
				stys: {
					background: 'var(--color-base-200)',
					borderRadius: '0.875rem',
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
