import { getStyleOpts } from '@/services/helper';

export const hashtags = ['cta', 'modern', 'centered', 'buttons', 'image', 'neat'];

// title/description/pics theo chuẩn docs/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây.
export const data = [
	{
		title: 'Ready to build\nbetter software ?',
		description: 'Join thousands of teams who trust Nexora\nto deliver exceptional software.',
		pics: 'https://placehold.co/1400x400/8B8680/ddd',
		meta: {
			ctaPrimaryLabel: 'Start free trial',
			ctaSecondaryLabel: 'Book a demo',
		},
	},
];

// Grid layout (12-col):
//  Row 1 │ heading + desc  col-12  │  ← centered
//  Row 2 │ buttons row     col-12  │  ← centered pair
//  Row 3 │ decorative img  col-12  │  ← full-width bottom

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Centered heading + description (data-bound) + CTA buttons (tĩnh) —
		// Array = tier động, render đúng 1 lần vì `data` chỉ có 1 phần tử ──────────────
		[{
			groupCol: ['12', '12'],
			groupRow: ['auto', 'auto'],
			groupJustify: ['center', 'center'],
			groupStyle: [
				{ flexDirection: 'column', gap: '0.875rem', padding: '3rem 1.5rem', alignItems: 'center' },
				{ gap: '0.75rem', padding: '0.5rem 0 3rem' },
			],
			makes: [
				[
					{
						bit: 'title',
						opt: {
							mode: 'h2',
              motion: true,
              word: false,
              effect: 'swingIn',
							stys: {
								fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', // custom fontSize
                lineHeight: '1.1', // custom lineHeight
                textAlign: 'center'
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
								margin: '0',
								textAlign: 'center',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					},
				],
				[
					{
						bit: 'meta.ctaPrimaryLabel',
						opt: {
							mode: 'button',
							type: 'fill',
							color: 'primary',
							height: '45px',
							rounded: '8px',
							stys: { fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', padding: '0 1.5rem' },
						},
					},
					{
						bit: 'meta.ctaSecondaryLabel',
						opt: {
							mode: 'button',
							type: 'outline',
							height: '45px',
							rounded: '8px',
							stys: {
								fontWeight: '600',
								fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
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
								width: '100%',
								height: '100%',
								objectFit: 'cover',
								objectPosition: 'top',
								display: 'block',
							},
						},
					},
				],
			],
      anime: 'slide-in-blurred-bottom',
		}],
	],

  bg: {
    // ...getStyleOpts({ rounded: '0', tint: '#ffc75f', total: 2, blobType: 'circleOverlap', blobMove: 'pulse', deg: 90 }),
    ...getStyleOpts({ rounded: '0', hueCustom: 0 }),
  },

};

export const config = { ...baseConfig };
