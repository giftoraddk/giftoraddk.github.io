import { getStyleOpts } from '@/services/helper';

export const hashtags = ['hero', 'spatial', 'horizontal', 'split', 'features', 'cta'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/description/meta.heading là field top-level, còn
// 4 feature cards (nhiều item, độ dài co giãn) nằm NESTED trong `masonry` (tên field khớp tên
// tier marker `masonry` mà Tier 2 dùng, xem Tier 2's `dataKey: 'masonry'` bên dưới). Mỗi phần
// tử `masonry[i]` chỉ cần `title` + `meta.icon` + `meta.linkLabel`.
export const data = [
	{
		subtitle: 'Workflow Integration',
		description: "So how does it work? Let's check our Getting Started tutorial pre-made templates.",
		meta: { heading: 'Why you\nShould choose Sasup' },
		masonry: [
			{ title: 'Daily Auto Update',   meta: { icon: 'ri:refresh-line', linkLabel: 'Learn More →' } },
			{ title: 'Why Choose Sasup',    meta: { icon: 'ri:focus-3-line', linkLabel: 'Learn More →' } },
			{ title: 'Accelerated Process', meta: { icon: 'ri:flashlight-fill', linkLabel: 'Learn More →' } },
			{ title: 'Google Analytics',    meta: { icon: 'ri:bar-chart-2-fill', linkLabel: 'Learn More →' } },
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ badge + h2 + desc    col-6  │ Tier 1 │ hero image  col-6  │
//   Tier 2 │ 4 feature cards      col-12 (masonry 4 cols, đọc từ data[0].masonry) │

const baseConfig = {
	tiersCol: ['6', '6', '12'],
	tiersRow: ['auto', 'auto', 'auto'],

	tiers: [

		// ── Tier 0: Right — badge / heading / description (static) ────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [{ flexDirection: 'column', gap: '1.25rem', paddingRight: '1.5rem', paddingBottom: '2rem' }],
			makes: [
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'badge',
							type: 'fill',
							color: 'primary',
							stys: { alignSelf: 'flex-start', fontWeight: '600', fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)' },
						},
					},
					{
						bit: 'meta.heading',
						opt: {
							mode: 'h2',
							motion: true,
							word: true,
							effect: 'pinIn',
							stys: {
								margin: '0',
							},
						},
					},
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
								maxWidth: '38rem',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Left — hero image (static) ────────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ overflow: 'hidden' }],
			makes: [
				[
					{
						bitLocal: 'https://i.ibb.co/Gf97mpFP/landscape-2.png',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%',
								maxHeight: '400px',
								objectFit: 'contain',
								display: 'block',
							},
						},
					},
				],
			],
			anime: 'tilt-in-tl',
		},


		// ── Tier 2: Bottom — 4 feature cards (data-driven, full width) ────────
		// Card inner layout (3 groups):
		//   row 0 │ icon circle     col-12  │
		//   row 1 │ title           col-12  │
		//   row 2 │ learn more link  col-12  │
		[
			{
				// items — đọc từ data[0].masonry (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'masonry',
				masonry: { col: 4, gap: '1rem' },
				groupCol: ['12', '12'],
				groupRow: ['auto', 'auto'],
				groupJustify: ['left', 'right'],
				groupStyle: [
					{ padding: '0', alignItems: 'center' },
					{ padding: '0' },
				],
				makes: [
					// Icon in circle
					[
						{
							bit: 'meta.icon',
							opt: {
								mode: 'icon',
								width: '1.25rem',
								color: 'var(--color-primary)',
								stys: {
									width: '2.5rem',
									height: '2.5rem',
									borderRadius: '50%',
									background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: '0',
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
									marginLeft: '0.5rem',
									color: 'var(--color-base-content)',
								},
							},
						},
					],
					// Learn More →
					[
						{
							bit: 'meta.linkLabel',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									fontWeight: '600', // custom fontWeight
									color: 'var(--color-base-content)',
									cursor: 'pointer',
								},
							},
						},
					],
				],
				bg: {
					...getStyleOpts({ rounded: '1.25rem', tint: '#ffc75f', total: 1, blobType: 'circleOverlap' }),
				},
				stys: {
					padding: '1rem',
					borderRadius: '1.25rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
				},
				anime: 'fade-in',
				animeQueue: '80ms',
			},
		],
	],

	bg: {
		...getStyleOpts({ rounded: '0', tint: '#ffc75f', total: 1, blobType: 'circleOverlap', deg: 180 }),
	},

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
