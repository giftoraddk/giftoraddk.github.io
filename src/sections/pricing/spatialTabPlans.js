import { getStyleOpts } from '@/services/helper';

export const hashtags = ['pricing', 'spatial', 'plans', 'toggle', 'monthly', 'annual', 'tabs'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: description/meta.heading là field top-level, còn 6 plan entries
// (3 monthly + 3 annual) nằm NESTED trong `tabs` (tên field khớp tên tier marker `tabs` mà
// web-board dùng, xem Tier 1's `cardConfig.dataKey: 'tabs'` bên dưới). `tabs { pack: 3, idField:
// 'tab', labelField: 'tabLabel' }` groups chúng vào 2 tab panels.
export const data = [
	{
		description: 'Transparent pricing. No hidden fees.',
		meta: {
			heading: 'Plans and Pricing',
		},
		tabs: [
			// ── Monthly ─────────────────────────────────────────────────────────────
			{
				title: 'Free',
				content: 'Great for occasional prospecting',
				tab: 'monthly',
				tabLabel: 'Monthly',
				meta: {
					currency: '$',
					price: '0',
					billing: '*per month, no commitment',
					f1: 'Up to 5 drafts',
					f2: 'Publishing 15 posts monthly',
					f3: 'Connect 1 account',
					f4: 'API integration',
					btn: 'Get Started',
					badge: '',
					badgeStys: { display: 'none' },
					btnStys: {
						display: 'flex', justifyContent: 'center', alignItems: 'center',
						height: '48px', borderRadius: '2rem', cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)',
						color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box',
					},
				},
			},
			{
				title: 'Pro',
				content: 'Great for influencers and content creators',
				tab: 'monthly',
				tabLabel: 'Monthly',
				meta: {
					currency: '$',
					price: '45',
					billing: '*billed monthly ($540/year)',
					f1: 'Unlimited drafts',
					f2: 'Unlimited posts, threads',
					f3: 'Unlimited social media profiles',
					f4: 'Detailed metrics',
					btn: 'Get Started',
					badge: 'Most popular',
					badgeStys: {},
					btnStys: {
						display: 'flex', justifyContent: 'center', alignItems: 'center',
						height: '48px', borderRadius: '2rem', cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700',
						background: 'var(--color-primary)', color: 'var(--color-base-100)',
						width: '100%', boxSizing: 'border-box',
					},
				},
			},
			{
				title: 'Team',
				content: 'For business purposes and agencies',
				tab: 'monthly',
				tabLabel: 'Monthly',
				meta: {
					currency: '$',
					price: '85',
					billing: '*billed monthly ($1020/year)',
					f1: 'Everything in Pro plus:',
					f2: 'Up to 10 team members',
					f3: 'Zapier integration',
					f4: 'Training custom AI',
					btn: 'Get Started',
					badge: '',
					badgeStys: { display: 'none' },
					btnStys: {
						display: 'flex', justifyContent: 'center', alignItems: 'center',
						height: '48px', borderRadius: '2rem', cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)',
						color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box',
					},
				},
			},

			// ── Annual (−25%) ────────────────────────────────────────────────────────
			{
				title: 'Free',
				content: 'Great for occasional prospecting',
				tab: 'annual',
				tabLabel: 'Annual  −25%',
				meta: {
					currency: '$',
					price: '0',
					billing: '*billed yearly ($0)',
					f1: 'Up to 5 drafts',
					f2: 'Publishing 15 posts monthly',
					f3: 'Connect 1 account',
					f4: 'API integration',
					btn: 'Get Started',
					badge: '',
					badgeStys: { display: 'none' },
					btnStys: {
						display: 'flex', justifyContent: 'center', alignItems: 'center',
						height: '48px', borderRadius: '2rem', cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)',
						color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box',
					},
				},
			},
			{
				title: 'Pro',
				content: 'Great for influencers and content creators',
				tab: 'annual',
				tabLabel: 'Annual  −25%',
				meta: {
					currency: '$',
					price: '36',
					billing: '*billed yearly ($432  $540)',
					f1: 'Unlimited drafts',
					f2: 'Unlimited posts, threads',
					f3: 'Unlimited social media profiles',
					f4: 'Detailed metrics',
					btn: 'Get Started',
					badge: 'Most popular',
					badgeStys: {},
					btnStys: {
						display: 'flex', justifyContent: 'center', alignItems: 'center',
						height: '48px', borderRadius: '2rem', cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700',
						background: 'var(--color-primary)', color: 'var(--color-base-100)',
						width: '100%', boxSizing: 'border-box',
					},
				},
			},
			{
				title: 'Team',
				content: 'For business purposes and agencies',
				tab: 'annual',
				tabLabel: 'Annual  −25%',
				meta: {
					currency: '$',
					price: '64',
					billing: '*billed yearly ($768  $960)',
					f1: 'Everything in Pro plus:',
					f2: 'Up to 10 team members',
					f3: 'Zapier integration',
					f4: 'Training custom AI',
					btn: 'Get Started',
					badge: '',
					badgeStys: { display: 'none' },
					btnStys: {
						display: 'flex', justifyContent: 'center', alignItems: 'center',
						height: '48px', borderRadius: '2rem', cursor: 'pointer',
						fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)',
						color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box',
					},
				},
			},
		],
	},
];

// Layout (12-col tiers):
//   Tier 0 │ Intro — heading + subtitle (static)                  col-12 │
//   Tier 1 │ web-tabs toggle (Monthly / Annual −25%)              col-12 │
//           Each tab panel: 3 plan cards × col-4 via pack: 3
//
// Card inner layout (7 groups, flex-column):
//   group 0 │ plan title (h3) + badge inline
//   group 1 │ short description
//   group 2 │ price: $ (small, top-align) + number (large)
//   group 3 │ billing note
//   group 4 │ divider
//   group 5 │ 4 feature rows with ri:check-line prefix  (flex:1)
//   group 6 │ CTA button

const featureBit = (field) => ({
	bit: field,
	opt: {
		mode: 'span',
		prefix: 'ri:check-line',
		iconSize: '1rem',
		stys: {
			fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)',
			color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
			display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: '1.5',
		},
	},
});

const cardConfig = {
	dataKey: 'tabs',
	tabs: {
		pack:        3,
		idField:     'tab',
		labelField:  'tabLabel',
		active:      'annual',
		size:        'md',
	},
	groupCol:    ['12', '12', '12', '12', '12', '12', '12'],
	groupRow:    ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
	groupJustify: ['between', 'none', 'left', 'none', 'none', 'left', 'none'],
	groupStyle: [
		// Group 0: plan title + badge
		{ alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' },
		// Group 1: description
		{ marginBottom: '1.5rem' },
		// Group 2: price ($  number)
		{ alignItems: 'baseline', gap: '0.125rem' },
		// Group 3: billing note
		{ marginBottom: '1.5rem' },
		// Group 4: divider
		{ marginBottom: '1.5rem' },
		// Group 5: features  (flex:1 pushes CTA to bottom)
		{ flexDirection: 'column', gap: '0.75rem', flex: '1', marginBottom: '1.75rem' },
		// Group 6: CTA
		{},
	],
	makes: [
		// Group 0: plan title + "Most popular" badge
		[
			{
				bit: 'title',
				opt: {
					mode: 'h3',
					stys: {
						fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', // custom fontSize
						fontWeight: '700', // custom fontWeight
						color: 'var(--color-base-content)', margin: '0',
					},
				},
			},
			{
				bit: 'meta.badge',
				opt: { mode: 'badge', color: 'primary', type: 'fill', stys: 'meta.badgeStys' },
			},
		],
		// Group 1: description
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)', margin: '0',
						lineHeight: '1.55', // custom lineHeight
					},
				},
			},
		],
		// Group 2: price display
		[
			{
				bit: 'meta.currency',
				opt: {
					mode: 'span',
					stys: {
						fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // custom fontSize
						fontWeight: '700', // custom fontWeight
						color: 'var(--color-base-content)', alignSelf: 'flex-start', marginTop: '0.35rem',
						lineHeight: '1', // custom lineHeight
					},
				},
			},
			{
				bit: 'meta.price',
				opt: {
					mode: 'span',
					stys: {
						fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', // custom fontSize
						fontWeight: '700', // custom fontWeight
						color: 'var(--color-base-content)',
						lineHeight: '1', // custom lineHeight
					},
				},
			},
		],
		// Group 3: billing note
		[
			{
				bit: 'meta.billing',
				opt: {
					mode: 'p',
					stys: {
						fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)', // custom fontSize
						color: 'color-mix(in oklab, var(--color-base-content) 40%, transparent)', margin: '0',
					},
				},
			},
		],
		// Group 4: divider
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: { display: 'block', height: '1px', background: 'color-mix(in oklab, var(--color-base-content) 12%, transparent)', width: '100%' },
				},
			},
		],
		// Group 5: features
		[featureBit('meta.f1'), featureBit('meta.f2'), featureBit('meta.f3'), featureBit('meta.f4')],
		// Group 6: CTA button
		[
			{
				bit: 'meta.btn',
				opt: { mode: 'span', stys: 'meta.btnStys' },
			},
		],
	],

	bg: {
		...getStyleOpts({ rounded: '1.5rem', tint: '#a77ceb', total: 1, blobType: 'ellipse', deg: 0 }),
	},

	stys: { padding: '2rem 1.5rem', position: 'relative' },
};

const baseConfig = {
	ui: 'spatial',
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro (static) ─────────────────────────────────────────────
		{
			groupCol: ['12'],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [
				{
					flexDirection: 'column',
					alignItems: 'center',
					textAlign: 'center',
					gap: '0.75rem',
					padding: '3.5rem 0 2rem',
				},
			],
			makes: [
				[
					{
						bit: 'meta.heading',
						opt: {
							mode: 'h2',
							motion: true,
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
								color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
								margin: '0',
								maxWidth: '32rem',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Tabs toggle (Monthly / Annual) → pack:3 per panel ─────────
		[cardConfig],
	],

	bg: {
		...getStyleOpts({ rounded: '0', gradient: false }),
	},

	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
