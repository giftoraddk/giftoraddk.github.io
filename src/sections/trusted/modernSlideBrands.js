import { getStyleOpts } from '@/services/helper';

export const hashtags = ['gifts', 'modern', 'trusted', 'logos', 'brands', 'slider'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: title là field top-level của Tier 0, còn danh sách logo
// (nhiều item, độ dài co giãn) nằm NESTED trong `slider` (tên field khớp tên tier marker `slider`
// mà Tier 1 dùng, xem Tier 1's `dataKey: 'slider'` bên dưới).
export const data = [
	{
		title: { vi: 'Thương hiệu đối tác', en: 'Partner brands' },
		slider: [
			{ name: 'The Cocoon',  logo: 'https://placehold.co/240x100/ffffff/706fd3?text=the+cocoon' },
			{ name: 'LocknLock',   logo: 'https://placehold.co/240x100/ffffff/e2a9db?text=LocknLock' },
			{ name: 'Hapuganic',   logo: 'https://placehold.co/240x100/ffffff/6aa84f?text=Hapuganic' },
			{ name: 'Dalatfarm',   logo: 'https://placehold.co/240x100/ffffff/b45f06?text=DALATFARM' },
			{ name: "L'angfarm",   logo: 'https://placehold.co/240x100/ffffff/b45f06?text=Langfarm' },
			{ name: 'Tracybee',    logo: 'https://placehold.co/240x100/ffffff/2b2b2b?text=TRACYBEE' },
			{ name: 'NamViet',    logo: 'https://placehold.co/240x100/ffffff/34ace0?text=NamViet' },
		],
	},
];

// Layout:
//   Tier 0 │ heading trái + gạch ngang giãn (tĩnh)         col-12
//   Tier 1 │ slider marquee — logo tự trượt liên tục        col-12

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow:  ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Heading + gạch ngang giãn (tĩnh) ──────────────────────────────
		{
			groupCol:     ['12'],
			groupRow:     ['auto'],
			groupJustify: ['left'],
			groupStyle:   [{ flexWrap: 'nowrap', alignItems: 'center', gap: '1.5rem', padding: '0 0 2.5rem' }],
			makes: [[
				{
					bit: 'title',
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
            grow: 1,
						stys: {
							display: 'block', flex: '1', minWidth: '2rem', height: '1px',
							background: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)',
						},
					},
				},
			]],
		},

		// ── Tier 1: Slider marquee — logo tự trượt liên tục (băng chạy, không dừng) ─
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: {
					marquee: true, // → băng chạy liên tục, tự trượt, không cần autoplay/nav/dots
					autoplay: 7000, // tốc độ 1 vòng lặp khi marquee=true
					reverse: false,
					loop: true,
					mode: 'free',
					slides: 6,
					spacing: 48,
					nav: false,
					dots: false,
				},
				groupCol:     ['12'],
				groupRow:     ['auto'],
				groupJustify: ['center'],
				groupStyle:   [{}],
				makes: [[
					{
						bit: 'logo',
						opt: {
							mode: 'gallery',
              rounded: '0.5rem',
							stys: { objectFit: 'contain', display: 'block' },
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
