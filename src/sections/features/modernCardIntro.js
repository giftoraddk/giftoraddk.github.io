export const hashtags = ['features', 'modern', 'showcase'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`) — data luôn `data[0]`
// duy nhất: subtitle/meta.heading là field top-level của intro, còn danh sách feature cards
// (nhiều item) nằm NESTED trong `cards` (tên field khớp tên tier marker `cards` mà web-board
// dùng, xem Tier 2's `dataKey: 'cards'` bên dưới).
export const data = [
	{
		subtitle: 'FEATURES',
		meta: { heading: 'Everything you need\nto build better' },
		cards: [
			{ title: 'Plan smarter', content: 'Break down work, set priorities, and stay on track with clarity.', meta: { icon: 'ri:task-line', ctaLabel: 'Learn more' } },
			{ title: 'Build together', content: 'Collaborate in real time and keep everyone in the loop.', meta: { icon: 'ri:team-line', ctaLabel: 'Learn more' } },
			{ title: 'Ship with confidence', content: 'Automate testing and deployments across all environments.', meta: { icon: 'ri:rocket-line', ctaLabel: 'Learn more' } },
			{ title: 'Improve continuously', content: 'Track performance, gather insights, and keep getting better.', meta: { icon: 'ri:line-chart-line', ctaLabel: 'Learn more' } },
		],
	},
];

// Grid layout (12-col, row dense):
//  Row 1 │ intro   col-7 (1–7)  │ image col-5 row-3 (8–12) │
//  Row 2 │ card0   col-3 (1–3)  │ card1 col-3 (4–6)  │ gap │ image │
//  Row 3 │ card2   col-3 (1–3)  │ card3 col-3 (4–6)  │ gap │ image │

const baseConfig = {
	tiersCol: ['7', '5', '7'], // intro=7col | image=5col | each card=3col
	tiersRow: ['auto', '2', 'auto'], // image spans 2 rows; intro & cards auto

	tiers: [
		// ── Tier 0: Intro heading (static) ────────────────────────────────────
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
								letterSpacing: '0.12em', // custom letterSpacing
								fontWeight: '600', // custom fontWeight
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
							effect: 'riseUp',
							stys: {
								margin: '0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Dashboard image (static, col-5, row-span 3) ───────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [
				{
					overflow: 'hidden',
				},
			],
			makes: [
				[
					{
						bitLocal: 'https://placehold.co/600x700/8B8680/ddd',
						opt: {
							mode: 'gallery',
							stys: {
								objectFit: 'cover',
								display: 'block',
							},
						},
					},
				],
			],
      anime: 'tilt-in-br',
		},

		// ── Tier 2: Feature cards (array → 4 items, each col-6 → 2×2 grid in col-7) ───
		[
			{
				dataKey: 'cards', // items đọc từ data[0].cards, KHÔNG phải top-level data (chỉ có 1 record)
				cards: { col: 6 }, // render cards group in 2 columns (6+6=12) → 2×2 grid within col-7
				groupCol: [12],
				groupRow: ['auto'],
				groupJustify: ['none'],
				groupStyle: [
					{
						flexDirection: 'column',
						gap: '0.5rem',
						padding: '1.25rem',
						background: 'var(--color-base-200)',
						borderRadius: '0.75rem',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)',
					},
				],
				makes: [
					[
						{
							bit: 'meta.icon',
							opt: {
								mode: 'icon',
								width: '1.25rem',
								color: 'var(--color-primary)',
								stys: {
									padding: '0.5rem',
									background: 'color-mix(in oklab, var(--color-primary) 12%, transparent)',
									borderRadius: '0.5rem',
								},
							},
						},
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									lineHeight: '1.3', // custom lineHeight
									margin: '0.5rem 0 0',
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
									color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
									margin: '0',
									minHeight: '45px',
								},
							},
						},
						{
							bit: 'meta.ctaLabel',
							opt: {
								mode: 'span',
								suffix: 'ri:arrow-right-line',
								iconSize: '0.875rem',
								stys: {
									color: 'var(--color-primary)',
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									fontWeight: '500', // custom fontWeight
									cursor: 'pointer',
									display: 'inline-flex',
									alignItems: 'center',
									gap: '0.25rem',
									marginTop: '0.25rem',
								},
							},
						},
					],
				],
			},
		],
	],

	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
