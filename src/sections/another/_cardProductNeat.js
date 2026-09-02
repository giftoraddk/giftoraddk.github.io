import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'modern', 'product', 'simple', 'ecommerce', 'nike', 'card'];

export const data = [
	{
		id: 1, status: 'active', mode: 'product',
		title: 'Nike Shoes',
		pics: 'https://i.ibb.co/21HNHKW8/shoes.jpg',
		score: '5~420',
		pricing: '120~0~pair',
		meta: {
			badge: 'SALE',
			reviews: '420 reviews',
			oldPrice: '$150',
			btn: 'Buy now',
			url: '#',
		},
	},
];

const baseConfig = {
	groupCol: [12, 12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'between', 'none', 'none', 'none'],
	groupStyle: [
		{ padding: '0' }, // Image
		{ padding: '1rem 1.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, // Name & Badge
		{ padding: '0 1.75rem', display: 'flex', alignItems: 'center' }, // Rating & Reviews
		{ padding: '0 1.75rem 1rem', display: 'flex', alignItems: 'baseline' }, // Price
		{ }, // Button
	],
	makes: [
		// Image
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
          float: 'none',
					stys: {
						width: '100%',
						aspectRatio: '1/1',
						objectFit: 'cover',
						display: 'block',
						background: '#e0f2fe', // Matching the lime-ish green background in the image
					}
				}
			},
		],
		// Name & Badge
		[
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0',
					}
				}
			},
			{
				bit: 'meta.badge',
				opt: {
					mode: 'badge',
					type: 'fill',
					color: 'warning', // Let's use a themed color or stys
					stys: {
						textTransform: 'uppercase',
						pointerEvents: 'none',
					}
				}
			},
		],
		// Rating & Reviews
		[
			{
				bit: 'score',
				opt: {
					mode: 'rating',
					size: 'md',
					disabled: true,
					color: 'warning',
					mask: 'mask-star-2',
					stys: { color: 'warning' } // Orange stars
				}
			},
			{
				bit: 'meta.reviews',
				opt: {
					mode: 'span',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
						marginLeft: '0.5rem',
					}
				}
			},
		],
		// Price
		[
			{
				bit: 'pricing',
				ext: { currency: '$' },
				opt: {
					mode: 'span',
					stys: {
						color: 'var(--color-base-content)',
					}
				}
			},
			{
				bit: 'meta.oldPrice',
				opt: {
					mode: 'span',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
						textDecoration: 'line-through',
						marginLeft: '0.5rem',
					}
				}
			},
		],
		[
			{ bit: 'meta.btn', opt: { mode: 'button', type: 'soft', color: 'primary', rounded: '0', fontSize: '1.05rem', height: '48px', stys: { width: '100%' } } }
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '4px', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
