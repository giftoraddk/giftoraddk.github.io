import { getStyleOpts } from '@/services/helper';

export const hashtags = ['blog', 'mewis', 'post', 'blog', 'article', 'mystic', 'astro'];

export const data = [
	{
		pics: 'https://i.ibb.co/KpnkmF38/bird.jpg',
		created_at: 'Apr 21, 2023',
		title: 'Bí Mật Về Bạn Trong Thần Số Học',
		meta: { icon: 'mdi:rhombus-medium', comments: '23 Comments' },
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12'],
	groupRow: ['auto', '1.5rem', 'auto'],
	groupJustify: ['none', 'left', 'left'],
	groupStyle: [
		{ padding: '0' },
		{ 
			padding: '1.5rem 1.5rem 0.5rem', 
			display: 'flex', 
			alignItems: 'center' 
		},
		{ padding: '0 1.5rem 2rem' },
	],
	makes: [
		// Group 0: Top Image
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
          float: 'none',
          rounded: '1.75rem',
					stys: {
						width: '100%',
						aspectRatio: '4/3',
						objectFit: 'cover',
						display: 'block'
					}
				}
			},
		],
		// Group 1: Metadata (Date, Icon, Comments)
		[
			{
				bit: 'created_at',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
					}
				}
			},
			{
				bit: 'meta.icon',
				opt: {
					mode: 'icon',
					width: '0.75rem',
					color: 'var(--color-primary)',
					stys: { margin: '0 0.75rem' }
				}
			},
			{
				bit: 'meta.comments',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
					}
				}
			},
		],
		// Group 2: Title
		[
			{ 
				bit: 'title', 
				opt: { 
					mode: 'p', 
					stys: {
						color: 'var(--color-primary)',
					}
				} 
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
