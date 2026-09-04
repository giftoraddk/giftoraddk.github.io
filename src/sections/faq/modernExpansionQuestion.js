export const hashtags = ['faq', 'modern', 'accordion', 'expansion', 'questions'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/title là field top-level, còn danh sách
// câu hỏi FAQ (nhiều item, độ dài co giãn) nằm NESTED trong `expansion` (tên field khớp tên
// tier marker `expansion` mà web-board dùng, xem Tier 1's `dataKey: 'expansion'` bên dưới).
// Mỗi phần tử `expansion[i]` là `{title, content}` — không phải 1 record thật nên tự do đặt
// field theo nhu cầu template.
export const data = [
	{
		subtitle: 'FAQ',
		title: 'Frequently\nasked questions',
		expansion: [
			{
				title: 'What is Nexons?',
				content: 'Nexons is a project management platform that helps teams plan, collaborate, and ship better products together — from idea to launch.',
			},
			{ title: 'Is there a free plan?', content: 'Yes! We offer a free plan with core features for up to 3 team members. No credit card required to get started.' },
			{
				title: 'Can I change plans later?',
				content: 'Absolutely. You can upgrade or downgrade your plan at any time from your account settings. Changes take effect at the next billing cycle.',
			},
			{
				title: 'How does billing work?',
				content: 'We bill monthly or annually. Annual plans come with a 20% discount compared to monthly billing. All major credit cards accepted.',
			},
			{
				title: 'Is my data secure?',
				content: 'We take security seriously. All data is encrypted in transit and at rest using industry-standard protocols. We perform regular security audits.',
			},
		],
	},
];

// Layout:  col-5 intro (left)  │  col-7 expansion accordion (right)
const baseConfig = {
	tiersCol: ['5', '7'],

	tiers: [
		// ── Tier 0: Intro heading (static, col-5) ────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ flexDirection: 'column', gap: '1rem' }],
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
						bit: 'title',
						opt: {
							mode: 'h3',
              motion: true,
              word: false,
              effect: 'spinIn',
							stys: {
								fontWeight: '700', // custom fontWeight
								letterSpacing: '-0.02em', // custom letterSpacing
								color: 'var(--color-base-content)',
								margin: '0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: FAQ accordion (array, col-7) ─────────────────────────────
		// expansion.labelField maps 'title' → tab header label
		// itemCfg (groupKey/makes) defines the expanded panel content
		[
			{
				dataKey: 'expansion',
				expansion: { labelField: 'title', openFirst: false, multiple: false },
				groupCol: [12],
				groupRow: ['auto'],
				groupJustify: ['none'],
				groupStyle: [{ padding: '0.5rem 0' }],
				makes: [
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									lineHeight: '1.7', // custom lineHeight
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
									margin: '0',
                  padding: '0 1rem'
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
