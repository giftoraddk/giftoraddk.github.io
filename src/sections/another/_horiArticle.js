import { getStyleOpts } from '@/services/helper';

export const hashtags = ['blog', 'modern', 'horizontal', 'image', 'news', 'article'];

export const data = [
	{
		title: 'The Lion and the Mouse',
		pics: 'https://i.ibb.co/ycYHx5dG/animal.jpg',
		content: 'One day, a tiny Mouse accidentally woke up a sleeping Lion. The angry Lion caught the Mouse but, hearing the Mouse promise to help him one day, decided to let him go.',
		meta: { commentCount: '35', url: '#' },
	},
];

const baseConfig = {
	groupCol: [12, 4, 8],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none'],
	groupStyle: [
		{ }, // Title section (Full width)
		{ }, // Image section (Left)
		{ padding: '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }, // Description section (Right)
	],
	makes: [
		// Section 1: Title
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0',
						fontFamily: 'serif', // Matching the image's serif font
					}
				}
			},
		],
		// Section 2: Image
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
						borderRadius: '1.25rem',
					}
				}
			},
		],
		// Section 3: Description & Meta
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
						marginLeft: '0.5rem',
					}
				}
			},
			{
				bit: 'meta.commentCount',
				opt: {
					mode: 'span',
					prefix: '💬 ',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
						display: 'flex',
						alignItems: 'center',
						gap: '4px',
						marginLeft: '0.5rem',
					},
				}
			},
		],
	],
	stys: {
		padding: '1.25rem 1.75rem 1.75rem',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
