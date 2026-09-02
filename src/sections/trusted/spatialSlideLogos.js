// import { getStyleOpts } from '@/services/helper';

export const hashtags = ['trusted', 'spatial', 'logos', 'brands', 'slider'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất; danh sách logo (nhiều item, độ dài co giãn) nằm NESTED
// trong `slider` (tên field khớp tên tier marker `slider` mà web-board dùng, xem tier's
// `dataKey: 'slider'` bên dưới).
export const data = [
	{
		slider: [
			{ name: 'Linear', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Loom', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Shopify', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Vercel', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Notion', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Mapbox', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Airbnb', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Canon', logo: 'https://placehold.co/10/8B8680/8B8680' },
			{ name: 'Quora', logo: 'https://placehold.co/10/8B8680/8B8680' },
		],
	},
];

const baseConfig = {
	tiersCol: [12],
	tiers: [
		// ── Tier 0: Logo slider ────────────────────────────────────────────────
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: {
					reverse: false,
					autoplay: 8000,
          marquee: true,
					loop: true,
					mode: 'free',
					slides: 6,
					spacing: 0,
					nav: false,
					dots: false,
				},
				groupCol: [12],
				groupRow: ['auto'],
				groupJustify: ['left'],
				groupStyle: [
					{
						alignItems: 'center',
						gap: '0.5rem',
						paddingRight: '1rem',
					},
				],
				makes: [
					[
						{
							bit: 'logo',
							opt: {
								mode: 'gallery',
								stys: {
									height: '36px',
									width: 'auto',
									objectFit: 'contain',
									display: 'block',
									flexShrink: '0',
								},
							},
						},
						{
							bit: 'name',
							opt: {
								mode: 'span',
								stys: {
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
									margin: '0',
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
