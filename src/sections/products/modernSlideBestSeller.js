import { getStyleOpts } from '@/services/helper';

export const hashtags = ['gifts', 'modern', 'slider', 'products', 'bestseller', 'cards'];

export const data = [
	{ id: 1, title: 'RELAX & GLOW',   pics: '/images/common/gift-1.webp',  score: '5~124', pricing: '799000' },
	{ id: 2, title: 'SCENT & SOUND',  pics: '/images/common/gift-2.webp',  score: '5~89',  pricing: '975000' },
	{ id: 3, title: 'DAILY GROW',     pics: '/images/common/gift-3.webp',  score: '5~156', pricing: '735000' },
	{ id: 4, title: 'HARMONY & MUSIC',pics: '/images/common/gift-4.webp',  score: '5~106', pricing: '835000' },
];

// Layout:
//   Tier 0 │ heading + gạch ngang giãn + nút "Xem thêm"  col-12  │  ← tĩnh, 1 hàng ngang
//   Tier 1 │ slider 3 product card                        col-12  │  ← động, data[]

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro — heading trái, gạch ngang giãn, CTA phải (tĩnh) ────────
		{
			groupCol:     ['12'],
			groupRow:     ['auto'],
			groupJustify: ['left'],
			groupStyle:   [{ alignItems: 'center', gap: '1.5rem', padding: '0 0 2.5rem' }],
			makes: [[
				{
					bitLocal: { vi: 'Quà tặng bán chạy', en: 'Best-selling gifts' },
					opt: {
						mode: 'h2', motion: true, word: false, effect: 'driftIn',
						stys: {
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', // custom fontSize
							fontWeight: '800', // custom fontWeight
							color: 'var(--color-primary)',
							margin: '0',
							whiteSpace: 'nowrap',
						},
					},
				},
				{
					bitLocal: '',
					opt: {
						mode: 'span',
						stys: {
							display: 'block', flex: '1', minWidth: '2rem', height: '1px',
							background: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)',
						},
					},
				},
				{
					bitLocal: { vi: 'Xem thêm', en: 'See more' },
					ext: { org: '/gift/shop' },
          opt: {
            mode: 'a',
            suffix: 'ri:arrow-right-s-line',
            iconSize: '1rem',
            stys: {
              height: '2.5rem',
              flexShrink: '0',
              borderRadius: '1.75rem',
              color: 'var(--color-primary)',
							background: 'color-mix(in oklab, var(--color-base-100) 70%, transparent)',
              backdropFilter: 'blur(25px)',
              padding: '0 1rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            },
          },
				},
			]],
		},

		// ── Tier 1: Product slider (động, 3 card/view) ────────────────────────────
		[
			{
				slider: { nav: false, loop: true, slides: 3, spacing: 24, dots: false },
				groupCol:     ['12', '12', '12', '12'],
				groupRow:     ['auto', 'auto', 'auto', 'auto'],
				groupJustify: ['none', 'left', 'left', 'left'],
				groupStyle: [
					{ overflow: 'hidden', borderRadius: '1rem', marginBottom: '1rem' },
					{ marginBottom: '0.4rem' },
					{ marginBottom: '0.6rem' },
					{},
				],
				makes: [
					// Ảnh sản phẩm
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
                rounded: '1.75rem',
								stys: { width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' },
							},
						},
					],
					// Tên sản phẩm (uppercase nhỏ)
					[
						{
							bit: 'title',
							ext: { org: '/product/{id}' },
							opt: {
								mode: 'a',
								stys: {
									display: 'block',
									fontSize: 'clamp(0.75rem, 0.95vw, 0.85rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									letterSpacing: '0.06em', // custom letterSpacing
									textTransform: 'uppercase',
									color: 'var(--color-base-content)',
									margin: '0',
								},
							},
						},
					],
					// Rating
					[
						{
							bit: 'score',
							opt: { mode: 'rating', size: 'sm', disabled: true, color: 'error', mask: 'mask-star-2' },
						},
					],
					// Giá
					[
						{
							bit: 'pricing',
							ext: { currency: ' Đ', lang: 'en-US' },
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(1.1rem, 1.6vw, 1.375rem)', // custom fontSize
									fontWeight: '800', // custom fontWeight
									color: 'var(--color-primary)',
								},
							},
						},
					],
				],
			},
		],
	],

	bg: { ...getStyleOpts({ rounded: '0', gradient: false }) },

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
