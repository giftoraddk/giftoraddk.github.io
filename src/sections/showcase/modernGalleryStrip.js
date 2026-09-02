import { getStyleOpts } from '@/services/helper';

export const hashtags = ['gifts', 'modern', 'gallery', 'image', 'filmstrip', 'intro'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: title/description là field top-level của Tier 0, còn danh sách
// ảnh (nhiều item, độ dài co giãn) nằm NESTED trong `slider` (tên field khớp tên tier marker
// `slider` mà Tier 1 dùng, xem Tier 1's `dataKey: 'slider'` bên dưới).
export const data = [
	{
		title: { vi: 'Hình ảnh nổi bật', en: 'Featured gallery' },
		description: '"The meaning, purpose and stories behind the each item are lovely"',
		slider: [
			{ pics: '/images/common/gift-a.webp' },
			{ pics: '/images/common/gift-b.webp' },
			{ pics: '/images/common/gift-c.webp' },
			{ pics: '/images/common/gift-d.webp' },
			{ pics: '/images/common/gift-e.webp' },
		],
	},
];

// Layout:
//   Tier 0 │ heading + quote (tĩnh, canh giữa)                col-12
//   Tier 1 │ slider marquee — ảnh tự trượt liên tục, loop     col-12

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow:  ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Heading + quote (tĩnh, canh giữa) ─────────────────────────────
		{
			groupCol:     [12],
			groupRow:     ['auto'],
			groupJustify: ['center'],
			groupStyle:   [{ flexDirection: 'column', alignItems: 'center', padding: '0 0 2.5rem' }],
			makes: [[
				{
					bit: 'title',
					opt: {
						mode: 'h2', motion: true, word: false, effect: 'swingIn',
						stys: {
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', // custom fontSize
							fontWeight: '800', // custom fontWeight
							letterSpacing: '0.02em', // custom letterSpacing
							color: 'var(--color-primary)',
							margin: '0',
							textAlign: 'center',
						},
					},
				},
				{
					bit: 'description',
					opt: {
						mode: 'p',
						stys: {
							fontSize: 'clamp(0.95rem, 1.3vw, 1.125rem)', // custom fontSize
							fontStyle: 'italic', // custom fontStyle
							color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
							margin: '0.75rem 0 0',
							textAlign: 'center',
							maxWidth: '40rem',
						},
					},
				},
			]],
		},

		// ── Tier 1: Slider marquee — ảnh tự trượt liên tục (băng chạy, không dừng) ─
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: {
					marquee: true, // → băng chạy liên tục, tự trượt, không cần autoplay/nav/dots
					autoplay: 10000, // tốc độ 1 vòng lặp khi marquee=true
					reverse: false,
					loop: true,
					mode: 'free',
					slides: 3.5, // hé 1 phần ảnh kế tiếp
					spacing: 20,
					nav: false,
					dots: false,
				},
				groupCol:     ['12'],
				groupRow:     ['auto'],
				groupJustify: ['overflow'],
				groupStyle:   [{ }],
				makes: [[
					{
						bit: 'pics',
						opt: {
							mode: 'gallery',
              rounded: '1.25rem',
							stys: { height: '26rem', objectFit: 'cover', display: 'block' },
						},
					},
				]],
			},
		],
	],

	bg: { ...getStyleOpts({ rounded: '0', gradient: false }) },

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
