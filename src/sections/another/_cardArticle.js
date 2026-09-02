import { getStyleOpts } from '@/services/helper';

export const hashtags = ['blog', 'modern', 'article', 'post', 'blog', 'news', 'car'];

export const data = [
	{
		pics: 'https://i.ibb.co/3mC4SFFh/cars.jpg',
		title: 'Supercharged !',
		content: 'The new supercar is here, 543 cv and 140 000$. This is best racing GT about 7 years on...',
		tags: ['#Car', '#Money'],
		meta: {
			category: 'Article',
			authorAvatar: 'https://i.ibb.co/yBXjwG8n/1.jpg',
			author: 'Jean Jacques',
			authorInfo: '20 mars 2029 - 6 min read',
			url: '#',
		},
	},
];

const baseConfig = {
	groupCol: [12, 12, 12],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none'],
	groupStyle: [
		{ padding: '0', overflow: 'hidden', borderRadius: '1.75rem 1.75rem 0 0' }, // Image
		{ padding: '0 1rem' }, // Content
		{ padding: '0 1rem 1rem' }, // Author (Float based)
	],
	makes: [
		// Section 1: Image
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						width: '100%',
						aspectRatio: '16/9',
						objectFit: 'cover',
					}
				}
			},
		],
		// Section 2: Content
		[
			{
				bit: 'meta.category',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-primary)',
						marginBottom: '0.5rem',
					}
				}
			},
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
						marginBottom: '1rem',
					}
				}
			},
			{
				bit: 'content',
				opt: {
					mode: 'p',
					cls: 'line-clamp-2',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
						marginBottom: '1rem',
					}
				}
			},
			{
				bit: 'tags',
				opt: {
					mode: 'tags',
					color: 'warning',
					type: 'soft',
					gap: '0.75rem',
				}
			},
		],
		// Author (Refactored to match heroUI pattern) float left style
		[
			{
				bit: 'meta.authorAvatar',
				opt: {
					mode: 'gallery',
					stys: {
						marginRight: '0.75rem',
						width: '2.75rem',
						height: '2.75rem',
						borderRadius: '50%',
						objectFit: 'cover',
					}
				}
			},
			{
				bit: 'meta.author',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-base-content)',
						marginBottom: '0.125rem',
						textAlign: 'left',
					}
				}
			},
			{
				bit: 'meta.authorInfo',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
						textAlign: 'left',
						margin: '0'
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
