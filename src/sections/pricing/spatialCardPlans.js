import { getStyleOpts } from '@/services/helper';

export const hashtags = ['pricing', 'spatial', 'plans', 'cards', 'tiers', 'features'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: description/meta.heading là field top-level, còn 3 plan cards
// (Basic/Pro/Expert) nằm NESTED trong `cards` (tên field khớp tên tier marker `cards` mà web-board
// dùng, xem Tier 1's `dataKey: 'cards'` bên dưới).
export const data = [
	{
		description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit tincidunt sed pharetra aliquam ultrices imperdiet in dui pellentesque dignissim.',
		meta: {
			heading: 'Pricing plans.',
		},
		cards: [
			{
				pics: 'ri:box-3-line',
				title: 'Basic plan',
				content: 'Lorem ipsum dolor sit amet elit sed non doconsectetur adipiscing id.',
				meta: {
					currency: '$',
					price: '19.99',
					unit: 'USD',
					period: '/month',
					badge: '',
					f1: 'Trading up to $100K per month',
					f2: 'Send and recieve over 85 tokens',
					f3: 'Real time crypto trading',
					f4: 'iOS and Android App',
					btn: 'Learn more',
					iconStys: {
						background: 'var(--color-base-300)',
						borderRadius: '50%',
						padding: '0.875rem',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxSizing: 'content-box',
					},
					badgeStys: { display: 'none' },
					btnStys: {
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '48px',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 25%, transparent)',
						borderRadius: '2rem',
						cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
						fontWeight: '500',
						color: 'var(--color-base-content)',
						width: '100%',
						boxSizing: 'border-box',
					},
				},
			},
			{
				pics: 'ri:box-3-line',
				title: 'Pro plan',
				content: 'Lorem ipsum dolor sit amet elit sed non doconsectetur adipiscing id.',
				meta: {
					currency: '$',
					price: '29.99',
					unit: 'USD',
					period: '/month',
					badge: '',
					f1: 'Everything included in Basic',
					f2: 'Trading up to $1MM per month',
					f3: 'Windows & macOS App',
					f4: 'Premium Support',
					btn: 'Learn more',
					iconStys: {
						background: 'color-mix(in oklab, var(--color-primary) 15%, var(--color-base-200))',
						borderRadius: '50%',
						padding: '0.875rem',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxSizing: 'content-box',
					},
					badgeStys: { display: 'none' },
					btnStys: {
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '48px',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 25%, transparent)',
						borderRadius: '2rem',
						cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
						fontWeight: '500',
						color: 'var(--color-base-content)',
						width: '100%',
						boxSizing: 'border-box',
					},
				},
			},
			{
				pics: 'ri:box-3-line',
				title: 'Expert plan',
				content: 'Lorem ipsum dolor sit amet elit sed non doconsectetur adipiscing id.',
				meta: {
					currency: '$',
					price: '39.99',
					unit: 'USD',
					period: '/month',
					badge: 'Popular',
					f1: 'Everything included in Pro',
					f2: 'Trading up to $10MM per month',
					f3: 'Windows & macOS App',
					f4: 'Dedicated Support',
					btn: 'Learn more',
					iconStys: {
						background: 'var(--color-primary)',
						borderRadius: '50%',
						padding: '0.875rem',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxSizing: 'content-box',
						color: 'var(--color-base-100)',
					},
					badgeStys: {},
					btnStys: {
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '48px',
						background: 'var(--color-primary)',
						borderRadius: '2rem',
						cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
						fontWeight: '700',
						color: 'var(--color-base-100)',
						width: '100%',
						boxSizing: 'border-box',
					},
				},
			},
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ intro: "Pricing plans." col-12 │
//   Tier 1 │ 3 plan cards            col-12 │
//            └─ cards×col-4 → 3 per row
//
// Card inner layout (8 groups, flex-column):
//   group 0 │ badge (position:absolute top-right — hidden via badgeStys for non-Popular)
//   group 1 │ circular icon (centered, iconStys from data)
//   group 2 │ plan name
//   group 3 │ price + period inline
//   group 4 │ description
//   group 5 │ divider line (1px span)
//   group 6 │ features ×4 with checkmark prefix (flex:1 to push button down)
//   group 7 │ button (span styled via btnStys from data)

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro (static, full width) ────────────────────────────────
		{
			groupCol: ['12'],
			groupRow: ['auto'],
			groupJustify: ['between'],
			groupStyle: [{ gap: '0.5rem', padding: '3rem 0', flexWrap: 'wrap' }],
			makes: [
				[
					{
						bit: 'meta.heading',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'riseUp',
							stys: {
								margin: '0',
								color: 'var(--color-base-content)',
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
								maxWidth: '40rem',
								margin: '0.75rem auto 0',
								width: '100%',
								textAlign: 'right',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Pricing plan cards (3 × col-4) ───────────────────────────
		[
			{
				dataKey: 'cards',
				cards: { col: 4 },
				groupCol: ['12', '12', '12', '12', '12', '12', '12', '12'],
				groupRow: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
				groupJustify: ['none', 'center', 'none', 'left', 'none', 'none', 'left', 'none'],
				groupStyle: [
					// Group 0: Popular badge (position:absolute → top-right)
					{
						position: 'absolute',
						top: '1.25rem',
						right: '1.25rem',
					},
					// Group 1: Circular icon
					{ marginBottom: '1.25rem' },
					// Group 2: Plan name
					{ marginBottom: '0.25rem' },
					// Group 3: Price + period
					{ alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.75rem' },
					// Group 4: Description
					{ marginBottom: '1.25rem' },
					// Group 5: Divider
					{ marginBottom: '1.25rem' },
					// Group 6: Feature list (flex:1 pushes button to bottom)
					{
						flexDirection: 'column',
						gap: '0.75rem',
						flex: '1',
						marginBottom: '1.75rem',
					},
					// Group 7: Button
					{},
				],
				makes: [
					// Group 0: "Popular" badge (hidden via badgeStys for non-Popular plans)
					[
						{
							bit: 'meta.badge',
							opt: {
								mode: 'badge',
								color: 'primary',
								type: 'fill',
								stys: 'meta.badgeStys',
								stys_fallback: {},
							},
						},
					],
					// Group 1: Circular icon (color/bg per plan via iconStys)
					[
						{
							bit: 'pics',
							opt: {
								mode: 'icon',
								width: '2rem',
								stys: 'meta.iconStys',
							},
						},
					],
					// Group 2: Plan name
					[
						{
							bit: 'title',
							opt: {
								mode: 'h3',
								stys: {
									fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-base-content)',
									margin: '0',
								},
							},
						},
					],
					// Group 3: Price (large) + unit (medium) + period (small muted)
					[
						{
							bit: 'meta.currency',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-base-content)',
									alignSelf: 'flex-start',
									marginTop: '0.5rem',
									lineHeight: '1', // custom lineHeight
								},
							},
						},
						{
							bit: 'meta.price',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-base-content)',
									lineHeight: '1', // custom lineHeight
								},
							},
						},
						{
							bit: 'meta.unit',
							opt: {
								mode: 'span',
								stys: {
									fontWeight: '600', // custom fontWeight
									color: 'var(--color-base-content)',
									alignSelf: 'flex-end',
									marginBottom: '0.2rem',
								},
							},
						},
						{
							bit: 'meta.period',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
									alignSelf: 'flex-end',
									marginBottom: '0.2rem',
								},
							},
						},
					],
					// Group 4: Description
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
					// Group 5: Divider line
					[
						{
							bitLocal: '',
							opt: {
								mode: 'span',
								stys: {
									display: 'block',
									height: '1px',
									background: 'color-mix(in oklab, var(--color-base-content) 12%, transparent)',
									width: '100%',
								},
							},
						},
					],
					// Group 6: Features (4 items with checkmark icon prefix)
					[
						{
							bit: 'meta.f1',
							opt: {
								mode: 'span',
								prefix: 'ri:checkbox-circle-fill',
								iconSize: '1.125rem',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'var(--color-primary)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									lineHeight: '1.4', // custom lineHeight
								},
							},
						},
						{
							bit: 'meta.f2',
							opt: {
								mode: 'span',
								prefix: 'ri:checkbox-circle-fill',
								iconSize: '1.125rem',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'var(--color-base-content)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									lineHeight: '1.4', // custom lineHeight
								},
							},
						},
						{
							bit: 'meta.f3',
							opt: {
								mode: 'span',
								prefix: 'ri:checkbox-circle-fill',
								iconSize: '1.125rem',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'var(--color-base-content)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									lineHeight: '1.4', // custom lineHeight
								},
							},
						},
						{
							bit: 'meta.f4',
							opt: {
								mode: 'span',
								prefix: 'ri:checkbox-circle-fill',
								iconSize: '1.125rem',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'var(--color-base-content)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									lineHeight: '1.4', // custom lineHeight
								},
							},
						},
					],
					// Group 7: CTA button (styled per plan via btnStys)
					[
						{
							bit: 'meta.btn',
							opt: {
								mode: 'span',
								stys: 'meta.btnStys',
							},
						},
					],
				],

				bg: {
					...getStyleOpts({ rounded: '1.25rem', tint: '#ffc75f', total: 2, blobType: 'circleOverlap' }),
				},
				
				stys: {
					padding: '1.75rem',
				},
			},
		],
	],

	bg: {
		...getStyleOpts({ rounded: '0', gradient: false }),
	},

	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
