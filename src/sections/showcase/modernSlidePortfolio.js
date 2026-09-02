export const hashtags = ['showcase', 'modern', 'portfolio', 'slider', 'image', 'overlay'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/description/meta.heading là field top-level của intro
// (Tier 0), còn danh sách portfolio (nhiều item) nằm NESTED trong `slider` (tên field khớp tên
// tier marker `slider` mà Tier 1 dùng, xem Tier 1's `dataKey: 'slider'` bên dưới). Mỗi phần tử
// `slider[i]` là 1 portfolio item tự do `{title, pics, meta.category, meta.badge}`.
export const data = [
	{
		subtitle: 'OUR WORK',
		description: 'We help creative teams turn rough ideas into refined digital products that connect with people.',
		meta: { heading: 'From rough design files,\nto powerful products' },
		slider: [
			{
				title: "It's Lora Smith",
				pics: 'https://placehold.co/600x360/6B3A4B/ddd',
				meta: { category: 'Photography', badge: 'Creative Direction' },
			},
			{
				title: 'Mark Miller.',
				pics: 'https://placehold.co/600x360/8B8680/ddd',
				meta: { category: 'Digital Art', badge: 'Creative Services' },
			},
			{
				title: 'Acne Studio.',
				pics: 'https://placehold.co/600x360/3A4B5C/ddd',
				meta: { category: 'Fashion', badge: 'Brand Identity' },
			},
			{
				title: 'Studio Drift',
				pics: 'https://placehold.co/600x360/4A3B6C/ddd',
				meta: { category: 'Installation', badge: 'Art Direction' },
			},
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ intro  col-12  │  ← centered label + h2 + subtitle
//  Row 2 │ slider col-12  │  ← 3 visible image-overlay cards, nav arrows

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro (static, full-width, centered) ──────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [{
				flexDirection: 'column',
				alignItems: 'center',
				gap: '0.75rem',
				textAlign: 'center',
				padding: '0 0 1.5rem',
			}],
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
							effect: 'riseUp',
							stys: {
								fontSize: 'clamp(1.75rem, 3vw, 2.75rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								lineHeight: '1.1', // custom lineHeight
								letterSpacing: '-0.03em', // custom letterSpacing
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
								maxWidth: '540px',
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Portfolio slider (array, 3 visible, image overlay) ────────────
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: { nav: true, loop: true, slides: 3, spacing: 16, dots: false },
				stys: {
					position: 'relative',
					overflow: 'hidden',
					borderRadius: '0.75rem',
					height: '320px',
				},
				groupCol: ['12', '12'],
				groupRow: ['auto', 'auto'],
				groupJustify: ['none', 'none'],
				groupStyle: [
					{
						position: 'absolute',
						inset: '0',
						zIndex: '0',
					},
					{
						position: 'absolute',
						bottom: '0',
						left: '0',
						right: '0',
						zIndex: '1',
						flexDirection: 'column',
						gap: '0.375rem',
						padding: '4rem 1.25rem 1.25rem',
						background: 'linear-gradient(to top, var(--color-base-300) 0%, transparent 100%)',
					},
				],
				makes: [
					// full-bleed image
					[
						{
							bit: 'pics',
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
					// overlay: category · title · badge
					[
						{
							bit: 'meta.category',
							opt: {
								mode: 'p',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									fontWeight: '600', // custom fontWeight
									letterSpacing: '0.1em', // custom letterSpacing
									textTransform: 'uppercase',
									color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
									margin: '0',
								},
							},
						},
						{
							bit: 'title',
							opt: {
								mode: 'h3',
								stys: {
									fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-base-content)',
									margin: '0',
									whiteSpace: 'pre-line', // custom whiteSpace
								},
							},
						},
						{
							bit: 'meta.badge',
							opt: {
								mode: 'badge',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)',
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
