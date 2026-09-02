import { getStyleOpts } from '@/services/helper';

export const hashtags = ['team', 'spatial', 'grid', 'members', 'people', 'cards'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: meta.introHeading/introHeadingHighlight/introText là field
// top-level (đọc bởi Tier 0), còn danh sách team member (nhiều item, độ dài co giãn) nằm NESTED
// trong `cards` (tên field khớp tên tier marker `cards`, xem Tier 1's `dataKey: 'cards'` bên dưới).
export const data = [
	{
		meta: {
			introHeading: 'Meet the team',
			introHeadingHighlight: 'behind Finantech.',
			introText: 'Lorem ipsum dolor sit amet consectetur adipiscing id elit volutpat\namet tortor nunc ridiculus felis venenatis ipsum dui.',
		},
		cards: [
			{ pics: 'https://i.pravatar.cc/400?img=11', title: 'John Carter', meta: { role: 'CEO & Founder' } },
			{ pics: 'https://i.pravatar.cc/400?img=45', title: 'Matt Cannon', meta: { role: 'VP of Marketing' } },
			{ pics: 'https://i.pravatar.cc/400?img=47', title: 'Sophie Moore', meta: { role: 'VP of Product' } },
			{ pics: 'https://i.pravatar.cc/400?img=12', title: 'Andy Smith', meta: { role: 'VP of Design' } },
			{ pics: 'https://i.pravatar.cc/400?img=8', title: 'Patrick Meyer', meta: { role: 'VP of Development' } },
			{ pics: 'https://i.pravatar.cc/400?img=35', title: 'Graham Hills', meta: { role: 'VP of Sales' } },
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ intro heading + subtitle   col-12  │
//   Tier 1 │ 6 cards wrapper            col-12  │ ← rounded outer corners, overflow:hidden
//            └─ nested gi-wrap gap:1px: card×col-4 → 3 per row × 2 rows
//
// Card inner layout (2 groups):
//   group 0 │ portrait photo (grayscale, aspectRatio 3/4)
//   group 1 │ overlay text at bottom (position:absolute)
//             ├─ name  (width:100% → forces full first flex row)
//             ├─ role  (flex:1 → left side of second row)
//             └─ social icons ×3 (right side)

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],
	tiersStys: [{}, { borderRadius: '1.25rem', overflow: 'hidden' }],

	tiers: [
		// ── Tier 0: Intro (static, full width) ───────────────────────────────
		{
			groupCol: ['12'],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [{ flexDirection: 'column', gap: '0.25rem', textAlign: 'center', padding: '3rem 0 2.5rem' }],
			makes: [
				[
					{
						bit: 'meta.introHeading',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'fallDown',
							stys: {
								margin: '0',
								color: 'var(--color-base-content)',
							},
						},
					},
					{
						bit: 'meta.introHeadingHighlight',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'riseUp',
							stys: {
								fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', // custom fontSize
								margin: '0',
								color: 'var(--color-primary)',
							},
						},
					},
					{
						bit: 'meta.introText',
						opt: {
							mode: 'p',
							stys: {
								lineHeight: '1.65', // custom lineHeight
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								maxWidth: '40rem',
								margin: '1.25rem auto 0',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Team member cards (3 × col-4, gap 1px) ────────────────────
		[
			{
				// items — đọc từ data[0].cards (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'cards',
				cards: { col: 4, gap: '1px' },
				groupCol: ['12', '12'],
				groupRow: ['auto', 'auto'],
				groupJustify: ['none', 'between'],
				groupStyle: [
					// Group 0: Portrait photo — fills card
					{},
					// Group 1: Name + role + social icons overlay (position:absolute → bottom)
					{
						position: 'absolute',
						bottom: '0',
						left: '0',
						right: '0',
						padding: '1.5rem 1.25rem 1.1rem',
						background: 'linear-gradient(to top, var(--color-base-100) 0%, transparent 100%)',
						flexWrap: 'wrap',
						gap: '0.2rem',
						alignItems: 'center',
					},
				],
				makes: [
					// Group 0: Grayscale portrait photo
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: {
									width: '100%',
									aspectRatio: '3/4',
									objectFit: 'cover',
									display: 'block',
									filter: 'grayscale(100%)',
								},
							},
						},
					],
					// Group 1: Name (full row) + role (flex:1 left) + social icons (right)
					[
						{
							bit: 'title',
							opt: {
								mode: 'p',
								stys: {
									fontWeight: '700', // custom fontWeight
									fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', // custom fontSize
									lineHeight: '1.3', // custom lineHeight
									color: 'var(--color-base-content)',
									width: '100%',
									margin: '0',
								},
							},
						},
						{
							bit: 'meta.role',
							opt: {
								mode: 'p',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'var(--color-primary)',
									flex: '1',
									margin: '0',
								},
							},
						},
						{
							bitLocal: 'ri:facebook-fill',
							opt: {
								mode: 'icon',
								width: '1rem',
								stys: {
									color: 'var(--color-base-content)',
									cursor: 'pointer',
									opacity: '0.75',
								},
							},
						},
						{
							bitLocal: 'ri:twitter-x-line',
							opt: {
								mode: 'icon',
								width: '1rem',
								stys: {
									color: 'var(--color-base-content)',
									cursor: 'pointer',
									opacity: '0.75',
								},
							},
						},
						{
							bitLocal: 'ri:linkedin-fill',
							opt: {
								mode: 'icon',
								width: '1rem',
								stys: {
									color: 'var(--color-base-content)',
									cursor: 'pointer',
									opacity: '0.75',
								},
							},
						},
					],
				],
				stys: { position: 'relative', overflow: 'hidden', padding: '0' },
				bg: { ...getStyleOpts({ rounded: '0', tint: '#2ebd85', total: 2 }) },
			},
		],
	],

	bg: {
    ...getStyleOpts({ rounded: '0', tint: '#a77ceb', total: 2, blobType: 'circleOverlap', blobMove: 'swap', deg: 225, distance: 100 }),
  },

	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
