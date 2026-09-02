export const hashtags = ['benefits', 'modern', 'checklist', 'image', 'hori', 'services'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/title/description là field top-level (đọc bởi Tier 0),
// còn danh sách checklist (nhiều item, độ dài co giãn) nằm NESTED trong `cards` (tên field khớp
// tên tier marker `cards`, xem Tier 2's `dataKey: 'cards'` bên dưới).
export const data = [
	{
		subtitle: 'SERVICES',
		title: 'Expert services to\naccelerate your journey',
		description: 'From strategy to implementation, our experts help you get the most out of Nexora.',
		cards: [{ text: 'Onboarding & migration' }, { text: 'Custom integrations' }, { text: 'Training & enablement' }, { text: 'Ongoing support' }],
	},
];

// Grid layout (12-col):
//  Row 1 │ intro     col-5  │ photo  col-7  gi-row-2  │
//  Row 2 │ checklist col-5  │ photo continues          │
//         └─ nested gi-wrap: each item gi-col-12

const baseConfig = {
	tiersCol: ['5', '7', '5'],
	tiersRow: ['auto', 2, 'auto'],

	tiers: [
		// ── Tier 0: Intro heading (static, col-5) ────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['left'],
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
						bit: 'title',
						opt: {
							mode: 'h3',
              motion: true,
              word: false,
              effect: 'fallDown',
							stys: {
								fontWeight: '700', // custom fontWeight
								letterSpacing: '-0.02em', // custom letterSpacing
								color: 'var(--color-base-content)',
								margin: '0',
								whiteSpace: 'pre-line', // custom whiteSpace
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
				],
			],
		},

		// ── Tier 1: Photo (static, col-7, row-span 2) ────────────────────────
		// overflow+borderRadius on inner div (groupJustify:'overflow') → clips image with rounded corners
		// stys height:'100%' → outer web-box wrapper stretches to fill the grid cell
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['right'],
			groupStyle: [{}],
			stys: {},
			makes: [
				[
					{
						bitLocal: 'https://placehold.co/600x300/8B8680/ddd',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%',
								height: '100%',
								objectFit: 'cover',
								display: 'block',
							},
						},
					},
				],
			],
      anime: 'flip-in-diag-br',
		},

		// ── Tier 2: Checklist items (array, cards mode, col-5) ───────────────
		// cards.col:12 → wraps ALL items in one gi-col-5 cell, each item full-width inside
		[
			{
				// items — đọc từ data[0].cards (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'cards',
				cards: { col: 12 },
				groupCol: [12],
				groupRow: ['auto'],
				groupJustify: ['left'],
				groupStyle: [{ gap: '0.625rem', alignItems: 'center' }],
				makes: [
					[
						{
							bitLocal: 'ri:checkbox-circle-fill',
							opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-primary)', stys: { flexShrink: '0' } },
						},
						{
							bit: 'text',
							opt: {
								mode: 'span',
								stys: {
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								},
							},
						},
					],
				],
				stys: {},
			},
		],
	],
	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
