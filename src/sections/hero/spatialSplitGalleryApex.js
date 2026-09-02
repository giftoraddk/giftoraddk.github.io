import { getStyleOpts } from '@/services/helper';

export const hashtags = ['hero', 'spatial', 'split', 'gallery', 'checklist', 'cta'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/title/description/meta.titleHighlight/meta.ctaPrimary/
// meta.ctaSecondary là field top-level, còn checklist items (nhiều item, độ dài co giãn) nằm
// NESTED trong `cards` (tên field khớp tên tier marker `cards` mà Tier 2 dùng, xem Tier 2's
// `dataKey: 'cards'` bên dưới). Mỗi phần tử `cards[i]` chỉ cần `label`.
export const data = [
	{
		subtitle: 'THE DECLARATIVE UI ENGINE',
		title: 'From JSON config\nto production UI',
		description: 'Skip the template code. Apex\'s layout engine turns a JSON config into fully rendered sections — cards, sliders, accordions, and more — with 80+ components, runtime theming, and zero external dependencies.',
		meta: { titleHighlight: 'in minutes.', ctaPrimary: 'Get Started Free', ctaSecondary: 'View on GitHub' },
		cards: [
			{ label: 'Framework-agnostic — works everywhere' },
			{ label: 'Zero runtime dependencies' },
			{ label: 'Full TypeScript & SSR support' },
			{ label: 'CSS variable theming out of the box' },
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ 2×2 image grid  col-7 (spans 3 rows) │
//   Tier 1 │ badge + title + desc      col-5       │
//   Tier 2 │ checklist items (data)    col-7       │
//   Tier 3 │ CTA buttons               col-7       │

const imgStyle = {
	width: '100%', aspectRatio: '1', objectFit: 'cover',
	borderRadius: '1.25rem', display: 'block',
};

const baseConfig = {
	tiersCol: ['7', '5', '7', '7'],
	tiersRow: ['auto', '3', 'auto', 'auto'],

	tiers: [

		// ── Tier 0: Badge + headline + description (static) ───────────────────────
		{
			groupCol: [12, 12],
			groupRow: ['auto', 'auto'],
			groupJustify: ['left', 'center'],
			groupStyle: [
        // badge pill
				{
					maxWidth: 'fit-content',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)',
				},
        { flexDirection: 'column', gap: '0', paddingRight: '1.5rem' }
      ],
			makes: [
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
				[
					{
						bit: 'title',
						opt: {
							mode: 'h1', motion: true, word: true, effect: 'scatterIn',
							stys: {
								whiteSpace: 'pre-line', // custom whiteSpace
								margin: '0',
							},
						},
					},
					{
						bit: 'meta.titleHighlight',
						opt: {
							mode: 'h2', motion: true, word: false, effect: 'scatterIn',
							stys: {
								margin: '0',
								color: 'var(--color-primary)',
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
								margin: '1.25rem 0 0', maxWidth: '38rem',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: 2×2 image grid (left column, spans all 3 right rows) ─────────
		{
			groupCol: ['6', '6', '6', '6'],
			groupRow: ['auto', 'auto', 'auto', 'auto'],
			groupJustify: ['none', 'none', 'none', 'none'],
			groupStyle: [
				{ padding: '0.5rem' }, { padding: '0.5rem' },
				{ padding: '0.5rem' }, { padding: '0.5rem' },
			],
			makes: [
				[{ bitLocal: 'https://i.ibb.co/zHH3bRp1/square.png',   opt: { mode: 'gallery', stys: imgStyle } }],
				[{ bitLocal: 'https://i.ibb.co/MxLzRfPK/square-2.png', opt: { mode: 'gallery', stys: imgStyle } }],
				[{ bitLocal: 'https://i.ibb.co/MxLzRfPK/square-2.png', opt: { mode: 'gallery', stys: imgStyle } }],
				[{ bitLocal: 'https://i.ibb.co/zHH3bRp1/square.png',   opt: { mode: 'gallery', stys: imgStyle } }],
			],
			stys: { padding: '0.5rem', alignContent: 'center' },
			anime: 'tilt-in-tr',
		},

		// ── Tier 2: Checklist items (data-driven, cards mode) ─────────────────────
		[
			{
				// items — đọc từ data[0].cards (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'cards',
				cards: { col: 12, gap: '0.5rem' },
				groupCol: ['12'],
				groupRow: ['auto'],
				groupJustify: ['left'],
				groupStyle: [{ padding: '0 0 0.5rem' }],
				makes: [
					[
						{
							bitLocal: 'ri:checkbox-circle-fill',
							opt: {
								mode: 'icon', width: '1.25rem',
								color: 'var(--color-primary)',
								stys: { paddingRight: '0.75rem' },
							},
						},
						{
							bit: 'label',
							opt: {
								mode: 'span',
								stys: {
									fontWeight: '500', // custom fontWeight
									color: 'var(--color-base-content)',
								},
							},
						},
					],
				],
        anime: 'slide-in-blurred-bottom',
				animeQueue: '80ms',
			},
		],

		// ── Tier 3: CTA buttons (static) ──────────────────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ gap: '0.75rem', paddingRight: '1.5rem' }],
			makes: [
				[
					{
						bit: 'meta.ctaPrimary',
						opt: {
							mode: 'button', type: 'fill', ui: 'modern', color: 'primary',
							height: '48px', rounded: '24px',
							stys: { fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', padding: '0 2rem' },
						},
					},
					{
						bit: 'meta.ctaSecondary',
						opt: {
							mode: 'button', type: 'outline',
							height: '48px', rounded: '24px',
							stys: {
								fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
								padding: '0 2rem',
								color: 'var(--color-base-content)',
								borderColor: 'color-mix(in oklab, var(--color-base-content) 22%, transparent)',
							},
						},
					},
				],
			],
		},
	],

	bg: {
		// ...getStyleOpts({ rounded: '0', tint: '#34ace0', total: 2, blobType: 'circleOverlap', blobMove: 'pulse', deg: 315 }),
    ...getStyleOpts({ rounded: '0', hueCustom: 0 }),
	},

	stys: { padding: '3rem 0', alignItems: 'center' },
};

export const config = { ...baseConfig };
