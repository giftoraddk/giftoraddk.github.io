import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'modern', 'image', 'title', 'subtitle', 'product', 'card'];

export const data = [
	{
		id: 1,
		status: 'active',
		mode: 'product',
		title: 'Orange',
		pics: 'https://i.ibb.co/v6ty0p2g/orange.jpg',
		pricing: '5.50~0~piece',
	},
];

const baseConfig = {
	groupCol: ['12', '12'],
	groupRow: ['auto', '2.5rem'],
	groupJustify: ['none', 'between'],
	groupStyle: [{}, { padding: '0.5rem 0.75rem 1rem' }],
	makes: [
		// Cell 1: Image
		[{ bit: 'pics', opt: { mode: 'gallery', float: 'none', stys: { borderRadius: '1.5rem', width: '100%', objectFit: 'cover', aspectRatio: '1/1' } } }],
		// Cell 2: Title and Price row
		[
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-base-content)',
					}
				}
			},
			{
				bit: 'pricing',
				ext: { currency: '$' },
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
					}
				},
			},
		],
	],
	stys: {
		padding: '0.75rem',
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
