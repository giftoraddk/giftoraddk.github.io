export const hashtags = ['features', 'modern', 'product', 'introRow', 'cards', 'icon'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`) — data luôn `data[0]`
// duy nhất: subtitle/meta.heading là field top-level của intro, còn danh sách product cards
// (nhiều item, per-item icon background uses CSS vars — different color per product) nằm
// NESTED trong `cards` (tên field khớp tên tier marker `cards` mà web-board dùng, xem
// Tier 2's `dataKey: 'cards'` bên dưới).
export const data = [
	{
		subtitle: 'PRODUCTS',
		meta: {
			heading: 'Powerful products\nfor modern teams',
		},
		pics: 'https://placehold.co/900x700/8B8680/ddd',
		cards: [
			{
				title: 'Nexora Core',
				content: 'Project management and tracking',
				meta: {
					icon: 'ri:compass-3-line',
					// stys: 'meta.iconStyle' reads this per-item → each card gets its own color
					iconStyle: {
						width: '3rem',
						height: '3rem',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-base-content) 12%, transparent)',
					},
				},
			},
			{
				title: 'Nexora CI',
				content: 'Continuous integration made simple',
				meta: {
					icon: 'ri:apps-2-line',
					iconStyle: {
						width: '3rem',
						height: '3rem',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-accent) 25%, transparent)',
					},
				},
			},
			{
				title: 'Nexora Deploy',
				content: 'Automated deployments you can trust',
				meta: {
					icon: 'ri:rocket-line',
					iconStyle: {
						width: '3rem',
						height: '3rem',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-primary) 25%, transparent)',
					},
				},
			},
			{
				title: 'Nexora Insights',
				content: 'Analytics and reporting that drive impact',
				meta: {
					icon: 'ri:bar-chart-2-line',
					iconStyle: {
						width: '3rem',
						height: '3rem',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-secondary) 25%, transparent)',
					},
				},
			},
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ intro    col-5  │ screenshot  col-7  gi-row-2  │
//  Row 2 │ cards    col-5  │ screenshot continues          │
//         └─ nested gi-wrap: each card gi-col-12
//              └─ card inner grid: icon gi-col-2 | text gi-col-8 | btn gi-col-2

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
						bit: 'meta.heading',
						opt: {
							mode: 'h3',
              motion: true,
              word: false,
              effect: 'floatIn',
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

		// ── Tier 1: Dashboard screenshot (static, col-7, row-span 2) ─────────
		// overflow:hidden + borderRadius both on inner div via groupJustify:'overflow'
		// stys height:'100%' stretches the outer web-box wrapper to fill the grid cell
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['overflow'],
			groupStyle: [
				{
					height: '100%',
				},
			],
			stys: { height: '100%' },
			makes: [
				[
					{
						bit: 'pics', // ảnh screenshot/minh hoạ — đọc động từ data[0].pics
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
      anime: 'flip-in-diag-tr',
		},

		// ── Tier 2: Product cards (array, cards mode, col-5) ─────────────────
		// cards.col:12 → all 4 items in one gi-col-5 wrapper, stacked vertically
		// Each card uses a 3-column inner grid: icon(2) | title+desc(8) | +(2)
		[
			{
				dataKey: 'cards', // items đọc từ data[0].cards, KHÔNG phải top-level data (chỉ có 1 record)
				cards: { col: 12 },
				groupCol: ['2', '8', '2'],
				groupRow: ['auto', 'auto', 'auto'],
				groupJustify: ['center', 'left', 'center'],
				groupStyle: [{ alignItems: 'center' }, { flexDirection: 'column', gap: '0.15rem', padding: '0 0.5rem' }, { height: '100%', placeContent: 'center' }],
				makes: [
					// ── Icon: stys dot-path → reads meta.iconStyle per item (different bg per card)
					[
						{
							bit: 'meta.icon',
							opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-base-content)', stys: 'meta.iconStyle' },
						},
					],
					// ── Title + description
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									lineHeight: '1.3', // custom lineHeight
									margin: '0',
								},
							},
						},
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									lineHeight: '1.45', // custom lineHeight
									margin: '0',
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								},
							},
						},
					],
					// ── Circular "+" button
					[
						{
							bitLocal: '',
							ext: { org: '#' },
							opt: {
								mode: 'a',
								prefix: 'ri:add-line',
								iconSize: '1rem',
								stys: {
									width: '2rem',
									height: '2rem',
									flexShrink: '0',
									borderRadius: '50%',
									border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)',
									color: 'var(--color-base-content)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
								},
							},
						},
					],
				],
				stys: {
					padding: '0.75rem',
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
