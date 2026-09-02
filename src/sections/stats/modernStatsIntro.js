import { getStyleOpts } from '@/services/helper';

export const hashtags = ['gifts', 'modern', 'stats', 'intro', 'cards'];

export const data = [
	{ title: { vi: 'Hộp quà theo yêu cầu', en: 'Custom gift boxes' }, meta: { icon: 'ri:gift-2-line' } },
  { title: { vi: 'Quà tặng doanh nghiệp', en: 'Corporate gifts' }, meta: { icon: 'ri:building-4-line' } },
	{ title: { vi: 'Tư vấn thiết kế', en: 'Design consulting' }, meta: { icon: 'ri:palette-line' } },
	{ title: { vi: 'Liên hệ báo giá', en: 'Request a quote' }, meta: { icon: 'ri:price-tag-3-line' } },
];

// Layout:
//   Tier 0 │ heading (100+ / Món quà) col-6  │ stat 1 col-3 │ stat 2 col-3 │  ← static
//   Tier 1 │ 4 category cards (icon + title) col-12          │  ← data-driven, masonry 4 col

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: heading trái + 2 stat block phải (tĩnh) ────────────────────
		{
			groupCol: ['6', '3', '3'],
			groupRow: ['auto', 'auto', 'auto'],
			groupJustify: ['left', 'center', 'center'],
			groupStyle: [
				// Group 0: heading block
				{ flexDirection: 'column', gap: '0.25rem' },
				// // Group 1: stat "300+"
				// { flexDirection: 'column', alignItems: 'start', gap: '0.4rem', maxWidth: '140px', marginLeft: 'auto' },
				// // Group 2: stat "6+"
				// { flexDirection: 'column', alignItems: 'start', gap: '0.4rem', maxWidth: '140px', marginLeft: 'auto' },
			],
			makes: [
				// Group 0: "100+" + gradient underline + "Món quà"
				[
					{
						bitLocal: '100+',
						opt: {
							mode: 'h3',
							motion: true, word: false, effect: 'slideUp', delay: 30,
							stys: {
								fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								color: 'var(--color-error)',
								margin: '0',
								lineHeight: '1.1', // custom lineHeight
							},
						},
					},
					{
						bitLocal: '',
						opt: {
							mode: 'span',
							stys: {
								display: 'block',
								width: '40px', height: '2px', borderRadius: '2px',
								background: 'linear-gradient(90deg, var(--color-error), transparent)',
							},
						},
					},
					{
						bitLocal: { vi: 'Món quà', en: 'Gifts' },
						opt: {
							mode: 'h2',
							motion: true, word: false, effect: 'slideDown',
							stys: {
								fontSize: 'clamp(2rem, 4vw, 3rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								color: 'var(--color-error)',
								margin: '0',
								lineHeight: '1.1', // custom lineHeight
								textTransform: 'uppercase',
							},
						},
					},
				],
			],
			stys: { padding: '0 0 2rem' },
		},

		// ── Tier 1: 4 category cards (động, masonry 4 cột) ─────────────────────
		[
			{
				masonry: { col: 4, gap: '1.25rem' },
				groupCol: ['12', '12'],
				groupRow: ['auto', 'auto'],
				groupJustify: ['center', 'center'],
				groupStyle: [
					{ flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.75rem 1rem 0.5rem' },
					{ padding: '0 0.5rem 1.75rem' },
				],
				makes: [
					[
						{
							bit: 'meta.icon',
							opt: {
								mode: 'icon',
								width: '2.5rem',
								color: 'var(--color-error)',
								stys: {
									width: '3.5rem', height: '3.5rem',
									display: 'flex', alignItems: 'center', justifyContent: 'center',
								},
							},
						},
					],
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontSize: 'clamp(0.95rem, 1.3vw, 1.125rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-error)',
									margin: '0',
									textAlign: 'center',
								},
							},
						},
					],
				],
				stys: {
          borderRadius: '1.75rem',
          background: 'color-mix(in oklab, var(--color-base-100) 15%, transparent)',
          backdropFilter: 'blur(25px)',
          boxShadow: `color-mix(in srgb, var(--color-error) 60%, transparent) 5px 5px,
                      color-mix(in srgb, var(--color-error) 40%, transparent) 10px 10px,
                      color-mix(in srgb, var(--color-error) 20%, transparent) 15px 15px`
        },
				anime: 'fade-in',
				animeQueue: '80ms',
			},
		],
	],

	bg: { ...getStyleOpts({ rounded: '0', gradient: false }) },

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
