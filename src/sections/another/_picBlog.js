import { getStyleOpts } from '@/services/helper';

export const hashtags = ['blog', 'modern', 'image', 'title', 'subtitle', 'post', 'overlay'];

export const data = [
	{
		pics: 'https://i.ibb.co/cc8yFvF3/dark-2.jpg',
		title: 'Stream the Acme event',
		meta: { subtitle: 'WHAT TO WATCH' },
	},
];

const baseConfig = {
	groupCol: ['12'],
	groupRow: ['auto'],
	groupJustify: ['none', 'none'],
	groupStyle: [
		{ position: 'relative' },
		{
			position: 'absolute',
			top: '1.5rem',
			left: '1.5rem',
			right: '1.5rem',
			display: 'flex',
			flexDirection: 'column',
			gap: '0.5rem',
		},
	],
	makes: [
		// Single Cell for background image
		[{ bit: 'pics', opt: { mode: 'gallery', rounded: '1.5rem', stys: { width: '100%', aspectRatio: '3/4', objectFit: 'cover' } } }],
		// Overlay content group
		[
			{
				bit: 'meta.subtitle',
				opt: {
					mode: 'p',
					stys: {
						textTransform: 'uppercase',
						color: '#ffffff',
						opacity: '0.7',
					},
				},
			},
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: '#ffffff',
						textShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.3)',
					},
				},
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', hueCustom: 0 }),
	},
};

export const config = { ...baseConfig };
