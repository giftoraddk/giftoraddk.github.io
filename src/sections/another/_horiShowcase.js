import { getStyleOpts } from '@/services/helper';

export const hashtags = ['showcase', 'modern', 'horizontal', 'image', 'title', 'rating', 'post', 'button'];
export const data = [
	{
		pics: 'https://placehold.co/400x300',
		title: 'Lorem Ipsum passages, and more recently',
		tags: ['#hashtag', '#trending', '#tag', '#news'],
		score: 3,
		meta: { url: 'https://www.google.com', reviews: '420 reviews' },
	},
];

const baseConfig = {
	groupCol: [4, 8], // 2 cells
	groupRow: [2, 'auto'], // cell 1: image, cell 2: metadata
	groupJustify: ['center', 'left'],
	groupStyle: [{}, { padding: '0 0 0 0.5rem' }],
	makes: [
		[{ bit: 'pics', opt: { mode: 'gallery', cls: 'custom-class', stys: { borderRadius: '4px' } } }], // Image
		[
			{ bit: 'tags', opt: { mode: 'tags', type: 'soft', color: 'warning', gap: '0.5rem' } }, // Tags
			{ bit: 'title', opt: { mode: 'h4' } }, // Title
			{ bit: 'score', opt: { mode: 'rating', size: 'sm', disabled: true, color: 'warning', mask: 'mask-star-2', stys: { color: 'warning' } } }, // Rating
			{
				bit: 'meta.reviews',
				opt: {
					mode: 'span',
					stys: {
						marginLeft: '0.5rem',
					},
				},
			}, // Reviews
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
