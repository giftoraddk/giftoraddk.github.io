import { getStyleOpts } from '@/services/helper';

export const hashtags = ['blog', 'modern', 'horizontal', 'post', 'modern', 'video', 'shorts'];

export const data = [
	{
		pics: 'https://i.ibb.co/m5pKJwGj/sea.jpg',
		title: 'Lorem Ipsum passages, and more recently',
		content: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested',
		tags: ['#travel', '#hotel', '#luxury'],
		meta: {
			badge: 'shorts',
			channelInfo: 'Funny Channel - Short Film',
			stats: '12k views • 5 days ago',
			url: '#',
		},
	},
];

const baseConfig = {
	groupCol: [4, 8],
	groupRow: ['auto', 'auto'],
	groupJustify: ['none', 'none'],
	groupStyle: [
		{ position: 'relative', overflow: 'hidden', borderRadius: '0.75rem' }, // Image section
		{ padding: '0 0 0 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }, // Content section
	],
	makes: [
		// Section 1: Image & Badge
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						width: '100%',
						aspectRatio: '4/3',
						objectFit: 'cover',
						display: 'block',
					},
				},
			},
			{
				bit: 'meta.badge',
				opt: {
					mode: 'badge',
					type: 'fill',
					color: 'error',
					stys: {
						position: 'absolute',
						top: '0.5rem',
						right: '0.5rem',
					},
				},
			},
		],
		// Section 2: Content
		[
			{
				bit: 'title',
				opt: {
					mode: 'h3',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0 0 0.25rem 0',
						display: '-webkit-box',
						WebkitLineClamp: '2',
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					},
				},
			},
			{
				bit: 'meta.channelInfo',
				opt: {
					mode: 'p',
					suffix: ' ✔',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
						margin: '0',
					},
				},
			},
			{
				bit: 'meta.stats',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
						margin: '0',
					},
				},
			},
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
						marginTop: '0.75rem',
						display: '-webkit-box',
						WebkitLineClamp: '2',
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					},
				},
			},
			{ bit: 'tags', opt: { mode: 'tags', type: 'soft', color: 'warning', gap: '0.5rem' } },
		],
	],
	stys: {
		padding: '1.5rem 1.75rem',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
