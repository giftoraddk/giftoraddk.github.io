import { getStyleOpts } from '@/services/helper';

export const hashtags = ['hero', 'spatial', 'horizontal', 'split', 'cta'];

// subtitle/title/description/pics theo chuẩn hook/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây.
export const data = [
	{
		subtitle: 'DESIGNED FOR TEAMS WHO BUILD',
		title: 'Software that\nmoves faster',
		description: 'Nexora helps development teams plan, build, and ship better software with confidence.',
		pics: 'https://i.ibb.co/zHH3bRp1/square.png',
		meta: { ctaPrimary: 'Start free trial', ctaSecondary: 'Book a demo' },
	},
];

const baseConfig = {
	tiersCol: ['6', '6', '6'], // intro=6col | image=6col | actions=6col
	tiersRow: ['2','auto', 'auto'], // intro spans 2 rows; image and actions each auto

	tiers: [

		// ── Tier 0: Image — data-bound `pics`, tier động (render đúng 1 lần vì `data`
		// chỉ có 1 phần tử, xem hook/web-board.rst § Tiers mode) ──────────────────
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ overflow: 'hidden' }],
			makes: [
				[
					{
						bit: 'pics',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%',
								maxHeight: '360px',
								objectFit: 'contain',
								display: 'block',
							},
						},
					},
				],
			],
      anime: 'tilt-in-tr',
		}],

		// ── Tier 1: Intro (badge tĩnh, title/content theo data[0]) ────────────────
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [{ flexDirection: 'column', gap: '1.25rem', paddingLeft: '1.5rem' }],
			makes: [
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								letterSpacing: '0.12em', // custom letterSpacing
								fontWeight: '600', // custom fontWeight
								textTransform: 'uppercase',
								color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
								margin: '0',
							},
						},
					},
					{
						bit: 'title',
						opt: {
							mode: 'h1',
							motion: true,
							word: true,
							effect: 'focusIn',
							stys: {
								whiteSpace: 'pre-line', // custom whiteSpace
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
							},
						},
					},
				],
			],

		}],

		// ── Tier 2: Actions / CTA buttons ──────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ gap: '0.75rem', paddingLeft: '1.5rem' }],
			makes: [
				[
					{
						bit: 'meta.ctaPrimary',
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
						bit: 'meta.ctaSecondary',
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
		},
	],

  bg: {
    // ...getStyleOpts({ rounded: '0', tint: '#ffc75f', total: 2, blobType: 'circleOverlap', blobMove: 'pulse', deg: 315 }),
    ...getStyleOpts({ rounded: '0', hueCustom: 0 }),
  },

	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
