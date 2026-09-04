import { getStyleOpts } from '@/services/helper';

export const hashtags = ['faq', 'spatial', 'accordion', 'expansion', 'questions', 'apex'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/description/title là field top-level, còn
// danh sách câu hỏi FAQ (nhiều item, độ dài co giãn) nằm NESTED trong `expansion` (tên field
// khớp tên tier marker `expansion` mà web-board dùng, xem Tier 1's `dataKey: 'expansion'` bên
// dưới). Mỗi phần tử `expansion[i]` là `{title, content}` — không phải 1 record thật nên tự do
// đặt field theo nhu cầu template.
export const data = [
	{
		subtitle: 'FREQUENTLY ASKED',
		description: 'Everything you need to know about Apex — and then some.',
		title: 'FAQs Answered',
		expansion: [
			{
				title: 'What is Apex?',
				content: 'Apex is a production-ready UI library built on native Web Components and Lit 3. It provides 80+ composable, themeable elements — from layout engines like web-board to micro-service components — that work in any JavaScript environment without wrappers or adapters.',
			},
			{
				title: 'Is Apex really framework-agnostic?',
				content: 'Yes. Apex components are standard custom elements that the browser natively understands. They work inside React, Vue, Angular, Svelte, Astro, plain HTML, or any other framework — no glue code, no wrappers, no adapter packages required.',
			},
			{
				title: 'Do I need to learn Lit or Web Components to use Apex?',
				content: 'No. You can consume Apex components just like any HTML element. Advanced users who want to extend or build their own components on top of Apex will benefit from knowing Lit, but it is not required for everyday use.',
			},
			{
				title: 'Can I use Apex with SSR frameworks like Next.js or Nuxt?',
				content: 'Yes. Apex components are designed for SSR compatibility — they do not access the DOM during module evaluation, which eliminates hydration mismatches and flash-of-unstyled-content (FOUC) issues that plague most component libraries.',
			},
			{
				title: 'How does the theming system work?',
				content: 'Apex reads five CSS custom properties (primary, secondary, accent, and two base colors) injected via the mainColors prop. Switch themes at runtime by updating those variables — no JavaScript rebuild needed. Dark and light modes toggle via a data-theme attribute on <html>.',
			},
			{
				title: 'What is web-board and do I have to use it?',
				content: 'web-board is Apex\'s optional declarative layout engine. You describe your page as a JSON config and web-board renders the full section layout — headings, cards, sliders, accordions — without writing template code. It is entirely optional; you can use any Apex component standalone in your own markup.',
			},
		],
	},
];

// Layout (12-col):
//   Tier 0 │ centered heading (static, full width)  col-12 │
//   Tier 1 │ expansion accordion (data, full width)  col-12 │

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Badge pill + heading ──────────────────────────────────────────
		{
			groupCol:     ['12', '12'],
			groupRow:     ['auto', 'auto'],
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
					padding: '1rem 1rem 2.5rem',
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
						bit: 'title',
						opt: {
							mode: 'h2',
							motion: true, word: false, effect: 'riseUp',
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
								margin: '0',
								color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
								maxWidth: '36rem',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Accordion (data-driven) ───────────────────────────────────
		[
			{
				dataKey: 'expansion',
				expansion: { labelField: 'title', openFirst: false, multiple: false },
				groupCol:     [12],
				groupRow:     ['auto'],
				groupJustify: ['none'],
				groupStyle: [{ padding: '0.375rem 1.25rem 1rem' }],
				makes: [
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									lineHeight: '1.75', // custom lineHeight
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
									margin: '0',
								},
							},
						},
					],
				],
				stys: {},
			},
		],
	],

	// bg: {
  //   ...getStyleOpts({ rounded: '0', tint: '#34ace0', total: 2, blobType: 'circleOverlap', blobMove: 'pulse', deg: 270 }),
	// },

	stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
