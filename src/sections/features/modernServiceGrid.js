import { getStyleOpts } from '@/services/helper';

export const hashtags = ['gifts', 'modern', 'service', 'image', 'overlay', 'grid', 'cards'];

export const data = [
	{ title: { vi: 'Chọn và tặng quà hộ', en: 'Choose & send gifts for you' },       pics: '/images/common/gift-service.webp',   meta: { label: { vi: 'Dịch vụ', en: 'Service' } } },
	{ title: { vi: 'In ấn cá nhân hóa', en: 'Personalized printing' },          pics: '/images/common/gift-custom.webp',   meta: { label: { vi: 'Hộp quà', en: 'Gift box' } } },
	{ title: { vi: 'Hỏa tốc trong 2h!', en: 'Express in 2 hours!' },          pics: '/images/common/gift-ship.webp', meta: { label: { vi: 'Vận chuyển', en: 'Delivery' } } },
	{ title: { vi: 'Tích lũy điểm nhận quà', en: 'Earn points for rewards' },     pics: '/images/common/gift-point.webp', meta: { label: { vi: 'Điểm thưởng', en: 'Reward points' } } },
];

// Layout: 1 vùng đồng nhất — 4 photo card lặp lại, không tier tĩnh riêng.
//   tiersCol: ['12']  →  tier duy nhất, cards:{col:6} → 2 card/hàng × 2 hàng
//
// Card layout (2 group, xếp chồng qua position:absolute):
//   Group 0 │ ảnh nền — absolute inset:0, fill toàn bộ card
//   Group 1 │ overlay — absolute bottom:0 (auto height, KHÔNG inset:0 — tránh
//            gradient phủ hết cả ảnh), ghim đáy: label nhỏ → heading đậm → gạch chân.
//            Text luôn trắng cứng (không var(--color-*)) vì overlay nằm trên ảnh
//            bất kỳ — theme light/dark không quyết định được độ tương phản ảnh,
//            giống quy ước _picBlog.js / _slideNews.js.

const baseConfig = {
	tiersCol: ['12'],
	tiersRow: ['auto'],

	tiers: [
		// Array = tier động, render 4 lần theo data[] — cards mode (grid đều, không masonry)
		[
			{
				cards: { col: 6, gap: '1.5rem' },
				groupCol:     ['12', '12'],
				groupRow:     ['auto', 'auto'],
				groupJustify: ['none', 'left'],
				groupStyle: [
					// Group 0: ảnh nền — absolute, fill toàn bộ card
					{ position: 'absolute', inset: '0', zIndex: '0', overflow: 'hidden' },
					// Group 1: overlay content — absolute, chỉ cao theo nội dung, ghim đáy
					{
						position: 'absolute', left: '0', right: '0', bottom: '0', zIndex: '1',
						flexDirection: 'column',
						gap: '0.35rem', padding: '2.5rem 1.5rem 1.5rem',
						background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.32) 60%, transparent 100%)',
					},
				],
				makes: [
					// Group 0: ảnh nền
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
							},
						},
					],
					// Group 1: label nhỏ + heading đậm + gạch chân
					// [
					// 	{
					// 		bit: 'meta.label',
					// 		opt: {
					// 			mode: 'p',
					// 			stys: {
					// 				fontSize: 'clamp(0.8rem, 1vw, 0.9rem)', // custom fontSize
					// 				color: '#ffffff',
					// 				opacity: '0.85',
					// 				margin: '0',
					// 				textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
					// 			},
					// 		},
					// 	},
					// 	{
					// 		bit: 'title',
					// 		opt: {
					// 			mode: 'h3',
					// 			stys: {
					// 				fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', // custom fontSize
					// 				fontWeight: '700', // custom fontWeight
					// 				color: '#ffffff',
					// 				margin: '0',
					// 				lineHeight: '1.25', // custom lineHeight
					// 				textShadow: '0 1px 6px rgba(0, 0, 0, 0.45)',
					// 			},
					// 		},
					// 	},
					// 	{
					// 		bitLocal: '',
					// 		opt: {
					// 			mode: 'span',
					// 			stys: {
					// 				display: 'block',
					// 				width: '2.25rem',
					// 				height: '2px',
					// 				background: '#ffffff',
					// 				opacity: '0.7',
					// 				marginTop: '0.35rem',
					// 			},
					// 		},
					// 	},
					// ],
				],
				stys: {
					position: 'relative', overflow: 'hidden',
					borderRadius: '1.75rem', aspectRatio: '16/9',
          boxShadow: `color-mix(in srgb, var(--color-error) 60%, transparent) 5px 5px,
                      color-mix(in srgb, var(--color-error) 40%, transparent) 10px 10px,
                      color-mix(in srgb, var(--color-error) 20%, transparent) 15px 15px`
				},
				anime: 'fade-in',
				animeQueue: '100ms',
			},
		],
	],

	bg: { ...getStyleOpts({ rounded: '0', gradient: false }) },

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
