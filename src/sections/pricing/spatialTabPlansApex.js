import { getStyleOpts } from '@/services/helper';

export const hashtags = ['pricing', 'spatial', 'plans', 'toggle', 'monthly', 'annual', 'tabs', 'apex'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/description/meta.heading là field top-level, còn 6
// plan entries (3 monthly + 3 annual) nằm NESTED trong `tabs` (tên field khớp tên tier marker
// `tabs` mà web-board dùng, xem Tier 1's `cardConfig.dataKey: 'tabs'` bên dưới). `tabs { pack: 3,
// idField: 'tab', labelField: 'tabLabel' }` groups chúng vào 2 tab panels.
export const data = [
	{
		subtitle: 'Subscription Options',
		description: 'Transparent pricing. No hidden fees.',
		meta: {
			heading: 'Plans and Pricing',
		},
		tabs: [
			// ── Monthly ─────────────────────────────────────────────────────────────
			{
				title: 'Free',
				content: 'Try every component — no credit card required',
				tab: 'monthly',
				tabLabel: 'Monthly',
				meta: {
					currency: '$',
					price: '0',
					billing: '*1 month free trial, no commitment',
					f1: 'All 80+ UI components',
					f2: 'Community themes & presets',
					f3: '1 project',
					f4: 'Community support',
					btn: 'Start Free Trial',
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
				content: 'For developers building serious products',
				tab: 'monthly',
				tabLabel: 'Monthly',
				meta: {
					currency: '$',
					price: '9',
					billing: '*billed monthly ($108/year)',
					f1: 'Everything in Free',
					f2: 'Unlimited projects',
					f3: 'Premium themes & custom CSS vars',
					f4: 'Priority email support',
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
				content: 'For teams shipping together at scale',
				tab: 'monthly',
				tabLabel: 'Monthly',
				meta: {
					currency: '$',
					price: '45',
					billing: '*up to 10 members, billed monthly',
					f1: 'Everything in Pro',
					f2: 'Up to 10 team members',
					f3: 'Shared design tokens & theme sync',
					f4: 'Dedicated Slack support',
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

			// ── Annual (−20%) ────────────────────────────────────────────────────────
			{
				title: 'Free',
				content: 'Try every component — no credit card required',
				tab: 'annual',
				tabLabel: 'Annual  −20%',
				meta: {
					currency: '$',
					price: '0',
					billing: '*3 months free trial, billed yearly',
					f1: 'All 80+ UI components',
					f2: 'Community themes & presets',
					f3: '1 project',
					f4: 'Community support',
					btn: 'Start Free Trial',
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
				content: 'For developers building serious products',
				tab: 'annual',
				tabLabel: 'Annual  −20%',
				meta: {
					currency: '$',
					price: '86',
					billing: '*billed yearly ($86  $108) — save 20%',
					f1: 'Everything in Free',
					f2: 'Unlimited projects',
					f3: 'Premium themes & custom CSS vars',
					f4: 'Priority email support',
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
				content: 'For teams shipping together at scale',
				tab: 'annual',
				tabLabel: 'Annual  −20%',
				meta: {
					currency: '$',
					price: '396',
					billing: '*up to 10 members, billed yearly — save 20%',
					f1: 'Everything in Pro',
					f2: 'Up to 10 team members',
					f3: 'Shared design tokens & theme sync',
					f4: 'Dedicated Slack support',
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
//   Tier 0 │ Intro — heading + subtitle (static)             col-12 │
//   Tier 1 │ web-tabs toggle (Monthly / Annual −20%)         col-12 │
//           Each tab panel: 3 plan cards × col-4 via pack: 3

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
		pack: 3, idField: 'tab', labelField: 'tabLabel',
		active: 'annual', size: 'md',
	},
	groupCol:    ['12', '12', '12', '12', '12', '12', '12'],
	groupRow:    ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
	groupJustify: ['between', 'none', 'left', 'none', 'none', 'left', 'none'],
	groupStyle: [
		{ alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' },
		{ marginBottom: '1.5rem' },
		{ alignItems: 'baseline', gap: '0.125rem' },
		{ marginBottom: '1.5rem' },
		{ marginBottom: '1.5rem' },
		{ flexDirection: 'column', gap: '0.75rem', flex: '1', marginBottom: '1.75rem' },
		{},
	],
	makes: [
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
						fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', // custom fontSize
						fontWeight: '700', // custom fontWeight
						color: 'var(--color-base-content)',
						lineHeight: '1', // custom lineHeight
					},
				},
			},
		],
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
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: { display: 'block', height: '1px', background: 'color-mix(in oklab, var(--color-base-content) 12%, transparent)', width: '100%' },
				},
			},
		],
		[featureBit('meta.f1'), featureBit('meta.f2'), featureBit('meta.f3'), featureBit('meta.f4')],
		[
			{
				bit: 'meta.btn',
				opt: { mode: 'span', stys: 'meta.btnStys' },
			},
		],
	],
	bg: {
		...getStyleOpts({ rounded: '1.5rem', tint: 'var(--color-primary)', total: 1, blobType: 'ellipse', deg: 0 }),
	},
	stys: { padding: '2rem 1.5rem', position: 'relative' },
};

const baseConfig = {
	ui: 'spatial',
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Badge pill + intro (static) ──────────────────────────────────
		{
			groupCol: ['12', '12'],
			groupRow: ['auto', 'auto'],
			groupJustify: ['center', 'center'],
			groupStyle: [
				// Group 0: badge pill
				{
					maxWidth: 'fit-content',
					margin: '3.5rem auto 0',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)',
				},
				// Group 1: heading + subtitle
				{
					flexDirection: 'column', alignItems: 'center',
					textAlign: 'center', gap: '0.75rem',
					padding: '1rem 0 2rem',
				},
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
				// Group 1: heading + subtitle
				[
					{
						bit: 'meta.heading',
						opt: {
							mode: 'h2',
							motion: true, effect: 'riseUp',
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
								margin: '0', maxWidth: '32rem',
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
    // ...getStyleOpts({ rounded: '0', tint: '#34ace0', total: 1, blobType: 'circleOverlap', blobMove: 'pulse', deg: 270, distance: 66 }),
    ...getStyleOpts({ rounded: '0', hueCustom: 0 }),
  },

	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
