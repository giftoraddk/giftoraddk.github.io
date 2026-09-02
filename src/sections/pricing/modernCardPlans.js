export const hashtags = ['pricing', 'modern', 'plans', 'features', 'cta'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: description/meta.headline/meta.featuresLabel là field top-level
// (shared, không thuộc riêng plan nào). Danh sách "All plans include" GIỜ LÀ MẢNG co giãn
// `features` (thay vì field cố định meta.feature1..8 cũ) — cùng quy ước dataKey như
// modernCardCompare.js (leftCards/rightCards): tên field khớp tên tier marker `cards` dùng để
// hiển thị nó, mỗi phần tử chỉ cần `{ title }`. 3 plan cards (Yearly/Monthly/Lifetime) nằm NESTED
// trong `cards` (tên field khớp tên tier marker `cards` mà web-board dùng, xem Tier 2's
// `dataKey: 'cards'` bên dưới).
export const data = [
	{
		description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit laborum — semper quis lectus nulla.',
		meta: {
			headline: 'Start building for free, then\nadd a plan to go live',
			featuresLabel: 'All plans include:',
		},
		features: [
			{ title: 'Unlimited domains' },
			{ title: 'Unlimited web pages' },
			{ title: 'Conversion analytics' },
			{ title: 'A/B testing' },
			{ title: 'Exclusive channels' },
			{ title: 'Free resources' },
			{ title: 'Landing page builder' },
			{ title: 'Smart forms and reports' },
		],
		cards: [
			{ title: 'Yearly',   content: '— Lorem ipsum dolor amet sit consect adipiscing.', meta: { price: '$27',  billing: '/billed yearly', badge: '-40%', ctaLabel: 'Go Premium' } },
			{ title: 'Monthly',  content: '— Lorem ipsum dolor amet sit consect adipiscing.', meta: { price: '$47',  billing: '/billed yearly', badge: '-30%', ctaLabel: 'Go Premium' } },
			{ title: 'Lifetime', content: '— Lorem ipsum dolor amet sit consect adipiscing.', meta: { price: '$127', billing: '/one-time',       badge: '-20%', ctaLabel: 'Go Premium' } },
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ intro           col-12                    │
//  Row 2 │ features col-3  │  plan cards col-9 (3×4) │

const baseConfig = {
	tiersCol: ['12', '3', '9'],
	tiersRow: ['auto', 'auto', 'auto'],

	tiers: [

		// ── Tier 0: Intro (col-12, centered) ──────────────────────────────────────
		{
			groupCol:     [12],
			groupRow:     ['auto'],
			groupJustify: ['center'],
			groupStyle:   [{ flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '0 0 2.5rem' }],
			makes: [
				[
					{
						bit: 'meta.headline',
						opt: {
							mode: 'h2',
							motion: true,
							word: true,
							effect: 'waveIn',
							stys: {
								fontSize: 'clamp(2rem, 4vw, 3rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								lineHeight: '1.1', // custom lineHeight
								margin: '0',
								maxWidth: '700px',
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
								maxWidth: '540px',
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Features list (col-3) — label tĩnh + danh sách `features` co giãn
		// gộp chung 1 mixed tier (giống modernCardCompare.js Tier 1/3 — xem web-boxs.js
		// _renderTiers()), thay cho 8 khối feature1..8 cố định lặp lại trước đây.
		[
			{
				groupCol:     [12],
				groupRow:     ['auto'],
				groupJustify: ['none'],
				groupStyle:   [{ padding: '0 0 0.5rem' }],
				makes: [[
					{
						bit: 'meta.featuresLabel',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '700', // custom fontWeight
								color: 'var(--color-base-content)',
								margin: '0',
							},
						},
					},
				]],
			},
			{
				// items — đọc từ data[0].features, KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'features',
				cards: { col: 12 }, // mỗi feature 1 hàng, xếp chồng đầy đủ chiều rộng col-3 của tier
				groupCol:     [12],
				groupRow:     ['auto'],
				groupJustify: ['left'],
				groupStyle:   [{ alignItems: 'center', gap: '0.25rem' }],
				makes: [[
					{ bitLocal: 'ri:check-line', opt: { mode: 'icon', color: 'var(--color-primary)', stys: { flexShrink: '0', marginRight: '4px' } } },
					{ bit: 'title', opt: {
						mode: 'span',
						stys: {
							fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
							color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
						},
					} },
				]],
			},
		],

		// ── Tier 2: Plan cards (array → 3 items, each col-4 → 3-col grid in col-9) ──
		[
			{
				dataKey: 'cards',
				cards: { col: 4 }, // 3 cards × col:4 = 12 → 3 equal columns within col-9
				groupCol:     [12, 12, 12, 12],
				groupRow:     ['auto', 'auto', 'auto', 'auto'],
				groupJustify: ['none', 'left', 'left', 'none'],
				groupStyle: [
					{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' },
					{ alignItems: 'baseline', gap: '0.25rem', margin: '0.5rem 0 0.875rem' },
					{ flex: '1', marginBottom: '1.5rem' },
					{},
				],
				makes: [
					[
						{
							bit: 'title',
							opt: {
								mode: 'h3',
								stys: {
									fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-base-content)',
									margin: '0',
								},
							},
						},
						{
							bit: 'meta.badge',
							opt: {
								mode: 'badge',
								stys: { fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', fontWeight: '700' },
							},
						},
					],
					[
						{
							bit: 'meta.price',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(2rem, 4vw, 3.5rem)', // custom fontSize
									fontWeight: '800', // custom fontWeight
									color: 'var(--color-base-content)',
									lineHeight: '1', // custom lineHeight
								},
							},
						},
						{
							bit: 'meta.billing',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
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
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
									margin: '0',
								},
							},
						},
					],
					[
						{
							bit: 'meta.ctaLabel',
							opt: {
								mode: 'button',
								type: 'fill',
								color: 'primary',
								height: '45px',
								rounded: '8px',
								stys: { fontWeight: '600', fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', width: '100%', padding: '0 1rem' },
							},
						},
					],
				],
				stys: {
					padding: '1.5rem',
					display: 'flex',
					flexDirection: 'column',
					background: 'var(--color-base-200)',
					borderRadius: '0.875rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
				},
			},
		],

	],

	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
