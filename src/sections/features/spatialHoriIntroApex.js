import { getStyleOpts } from '@/services/helper';

export const hashtags = ['features', 'spatial', 'product', 'introRow', 'cards', 'icon', 'apex'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`) — data luôn `data[0]`
// duy nhất: subtitle/meta.heading là field top-level của intro, còn danh sách feature cards
// (nhiều item) nằm NESTED trong `cards` (tên field khớp tên tier marker `cards` mà web-board
// dùng, xem Tier 2's `dataKey: 'cards'` bên dưới).
export const data = [
	{
		subtitle: 'CORE COMPONENTS',
		meta: {
			heading: 'Designed for Websites\nof Any Scale',
		},
		cards: [
			{
				title: 'Blueprint Engine',
				content: 'Describe entire page sections as a JSON blueprint — layout, content, animations.',
				meta: {
					icon: 'ri:layout-grid-line',
					iconStyle: {
						width: '3rem', height: '3rem', display: 'flex',
						alignItems: 'center', justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-primary) 25%, transparent)',
					},
				},
			},
			{
				title: 'Adaptive Card Grid',
				content: 'One dataset, infinite views from a single config.',
				meta: {
					icon: 'ri:apps-2-line',
					iconStyle: {
						width: '3rem', height: '3rem', display: 'flex',
						alignItems: 'center', justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-accent) 25%, transparent)',
					},
				},
			},
			{
				title: 'Micro Services',
				content: 'Self-contained Lit custom elements with built-in state, events, and IndexedDB caching.',
				meta: {
					icon: 'ri:puzzle-line',
					iconStyle: {
						width: '3rem', height: '3rem', display: 'flex',
						alignItems: 'center', justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-secondary) 25%, transparent)',
					},
				},
			},
			{
				title: 'Theming Engine',
				content: 'Five-color palette via CSS variables. Switch dark/light or full custom themes at runtime.',
				meta: {
					icon: 'ri:palette-line',
					iconStyle: {
						width: '3rem', height: '3rem', display: 'flex',
						alignItems: 'center', justifyContent: 'center',
						borderRadius: '0.625rem',
						background: 'color-mix(in oklab, var(--color-base-content) 12%, transparent)',
					},
				},
			},
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ screenshot  col-7  gi-row-2  │  intro    col-5 │
//  Row 2 │ screenshot continues          │  cards    col-5 │
//         └─ nested gi-wrap: each card gi-col-12
//              └─ card inner grid: icon gi-col-2 | text gi-col-8 | btn gi-col-2

const baseConfig = {
	tiersCol: ['7', '5', '5'],
	tiersRow: [2, 'auto', 'auto'],

	tiers: [
		// ── Tier 0: Screenshot (static, col-7, row-span 2) ────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['overflow'],
			groupStyle: [{ height: '100%' }],
			stys: { height: '100%' },
			makes: [
				[
					{
						bitLocal: 'https://placehold.co/900x700/8B8680/ddd',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%', height: '100%',
								objectFit: 'cover', display: 'block', minHeight: '420px',
							},
						},
					},
				],
			],
			anime: 'flip-in-diag-tr',
		},

		// ── Tier 1: Badge pill + heading (static, col-5) ─────────────────────────
		{
			groupCol: [12, 12],
			groupRow: ['auto', 'auto'],
			groupJustify: ['none', 'none'],
			groupStyle: [
				// Group 0: badge pill
				{
					maxWidth: 'fit-content',
					margin: '0 auto',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)',
				},
				// Group 1: heading
				{ flexDirection: 'column', gap: '0.5rem' },
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
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '500', // custom fontWeight
								color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
							},
						},
					},
				],
				// Group 1: heading only
				[
					{
						bit: 'meta.heading',
						opt: {
							mode: 'h3',
							motion: true, word: false, effect: 'floatIn',
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

		// ── Tier 2: Feature cards (array, cards mode, col-5) ──────────────────
		[
			{
				dataKey: 'cards', // items đọc từ data[0].cards, KHÔNG phải top-level data (chỉ có 1 record)
				cards: { col: 12 },
				groupCol: ['2', '8', '2'],
				groupRow: ['auto', 'auto', 'auto'],
				groupJustify: ['center', 'left', 'center'],
				groupStyle: [
					{ alignItems: 'center' },
					{ flexDirection: 'column', gap: '0.15rem', padding: '0 0.5rem' },
					{ height: '100%', placeContent: 'center' },
				],
				makes: [
					[
						{
							bit: 'meta.icon',
							opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-base-content)', stys: 'meta.iconStyle' },
						},
					],
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
					[
						{
							bitLocal: '',
							ext: { org: '#' },
							opt: {
								mode: 'a',
								prefix: 'ri:add-line', iconSize: '1rem',
								stys: {
									width: '2rem', height: '2rem', flexShrink: '0',
									borderRadius: '50%',
									border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)',
									color: 'var(--color-base-content)',
									display: 'flex', justifyContent: 'center', alignItems: 'center',
								},
							},
						},
					],
				],
        anime: 'slide-in-blurred-bottom',
				stys: {
					padding: '0.75rem',
					background: 'var(--color-base-200)',
					borderRadius: '0.875rem',
				},
			},
		],
	],

	bg: {
		...getStyleOpts({ rounded: '0', gradient: false }),
		// ...getStyleOpts({ rounded: '0', tint: '#34ace0', total: 1, blobType: 'ellipse', blobMove: 'pulse', deg: 0 }),
	},

	stys: { padding: '3rem 0', columnGap: '1.5rem !important' },
};

export const config = { ...baseConfig };
