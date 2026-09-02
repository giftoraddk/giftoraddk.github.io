import { getStyleOpts } from '@/services/helper';

export const hashtags = ['showcase', 'modern', 'image', 'title', 'subtitle', 'post', 'card'];
export const data = [
	{
		title: 'Frontend Radio',
		pics: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
		meta: { subtitle: 'DAILY MIX', tracks: '12 Tracks' },
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none', 'none'],
	groupStyle: [{}, {}, {}, {}],
	makes: [
		// Cell 1: subtitle
		[
			{
				bit: 'meta.subtitle',
				opt: {
					mode: 'p',
					stys: {
						textTransform: 'uppercase',
						color: 'var(--color-base-content)',
					},
				},
			},
		],
		// Cell 2: tracks
		[
			{
				bit: 'meta.tracks',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
						marginTop: '0.25rem',
					},
				},
			},
		],
		// Cell 3: title
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						margin: '0.375rem 0 1.25rem',
						color: 'var(--color-base-content)',
					},
				},
			},
		],
		// Cell 4: pics
		[{ bit: 'pics', opt: { mode: 'gallery', rounded: '1rem', float: 'none', stys: { width: '100%', objectFit: 'cover', aspectRatio: '4/3' } } }],
	],
	stys: {
		display: 'flex',
		flexDirection: 'column',
		padding: '1.75rem',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
