import { getStyleOpts } from '@/services/helper';

export const hashtags = ['cta', 'spatial', 'centered', 'buttons', 'image', 'neat', 'apex'];

// subtitle/title/description/pics theo chuẩn docs/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây.
export const data = [
	{
		subtitle: 'GET STARTED TODAY',
		title: 'Start building with\nApex today.',
		description: 'Join thousands of developers who build\nbeautiful UIs with native web standards.',
		pics: 'https://placehold.co/1400x400/8B8680/ddd',
		meta: {
			ctaPrimaryLabel: 'Get Started Free',
			ctaSecondaryLabel: 'View Docs',
		},
	},
];

// Grid layout (12-col):
//  Row 1 │ heading + desc + buttons  col-12  │  ← centered
//  Row 2 │ decorative image          col-12  │  ← full-width bottom

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Badge pill + heading (data-bound) + CTA buttons (tĩnh) — Array =
		// tier động, render đúng 1 lần vì `data` chỉ có 1 phần tử ─────────────────────
		[{
			groupCol: ['12', '12', '12'],
			groupRow: ['auto', 'auto', 'auto'],
			groupJustify: ['center', 'center', 'center'],
			groupStyle: [
				// Group 0: badge pill
				{
          maxWidth: 'fit-content',
					margin: '3rem auto 0',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)',
				},
				// Group 1: heading + description
				{ flexDirection: 'column', gap: '0.875rem', padding: '1.5rem 1.5rem 0', alignItems: 'center' },
				// Group 2: CTA buttons
				{ gap: '0.75rem', padding: '0.5rem 0 3rem' },
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
				// Group 1: heading + description
				[
					{
						bit: 'title',
						opt: {
							mode: 'h2', motion: true, word: false, effect: 'swingIn',
							stys: {
								fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', // custom fontSize
								lineHeight: '1.1', // custom lineHeight
								textAlign: 'center',
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
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0', textAlign: 'center',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					},
				],
				[
					{
						bit: 'meta.ctaPrimaryLabel',
						opt: {
							mode: 'button', type: 'fill', ui: 'modern', color: 'primary',
							height: '45px', rounded: '8px',
							stys: { fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', padding: '0 1.5rem' },
						},
					},
					{
						bit: 'meta.ctaSecondaryLabel',
						opt: {
							mode: 'button', type: 'outline',
							height: '45px', rounded: '8px',
							stys: {
								fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
								padding: '0 1.5rem',
								color: 'var(--color-base-content)',
								borderColor: 'color-mix(in oklab, var(--color-base-content) 22%, transparent)',
							},
						},
					},
				],
			],
		}],

		// ── Tier 1: Decorative bottom image (data-bound `pics`, tier động cùng lý do trên) ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['overflow'],
			groupStyle: [{ borderRadius: '1rem 1rem 0 0', maxHeight: '220px' }],
			makes: [
				[
					{
						bit: 'pics',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%', height: '100%',
								objectFit: 'cover', objectPosition: 'top', display: 'block',
							},
						},
					},
				],
			],
			anime: 'slide-in-blurred-bottom',
		}],
	],

	// bg: {
	// 	...getStyleOpts({ gradient: false }),
	// },
};

export const config = { ...baseConfig };
