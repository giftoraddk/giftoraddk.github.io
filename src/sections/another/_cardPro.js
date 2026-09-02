import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'modern', 'product', 'pro', 'furniture', 'diamond', 'ecommerce'];

export const data = [
	{
		id: 1, status: 'active', mode: 'product',
		title: 'Multipurpose Wooden Tool',
		pics: 'https://i.ibb.co/0pPCjQxm/chair.png',
		score: '4~0',
		content: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio, incidunt!',
		pricing: '32.99~0~piece',
		meta: {
			subtitle: 'Popular Collection',
			btn: 'Add to cart',
			url: '#',
		},
	},
];

const baseConfig = {
	groupCol: [12, 12, 12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
	groupJustify: ['center', 'none', 'none', 'none', 'none', 'between'],
	groupStyle: [
		{ position: 'relative', margin: '1.5rem 0' }, // Image section
		{ marginBottom: '0.5rem' }, // Subtitle
		{ marginBottom: '0.75rem' }, // Title
		{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }, // Rating
		{ marginBottom: '1.5rem' }, // Description
		{ alignItems: 'center' }, // Price & Btn
	],
	makes: [
		// Image section with Diamond background
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: {
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						position: 'absolute',
						width: '75%',
						aspectRatio: '1/1',
						background: 'var(--color-warning)',
						clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
						zIndex: '0',
					}
				}
			},
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						width: '65%',
						margin: '0 auto',
						objectFit: 'contain',
						position: 'relative',
						zIndex: '1',
					}
				}
			},
		],
		// Subtitle
		[
			{
				bit: 'meta.subtitle',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-info)',
						margin: '0',
					}
				}
			},
		],
		// Title
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0'
					}
				}
			},
		],
		// Rating
		[
			{
				bit: 'score',
				opt: {
					mode: 'rating',
					size: 'sm',
					disabled: true,
					color: 'warning',
					mask: 'mask-star-2'
				}
			},
		],
		// Description
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
						margin: '0',
					}
				}
			},
		],
		// Price & Button
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
				bit: 'meta.btn',
				opt: {
					mode: 'button',
					type: 'fill',
					color: 'warning',
					height: '40px',
					rounded: '12px',
				}
			},
		],
	],
	stys: {
		padding: '1.75rem',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
