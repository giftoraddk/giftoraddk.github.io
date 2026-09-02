import { getStyleOpts } from '@/services/helper';

export const hashtags = ['showcase', 'modern', 'image', 'simple', 'quiz', 'spelling'];

export const data = [
	{
		pics: 'https://i.ibb.co/yBg00X16/light.jpg',
		title: 'Simple image card',
		content: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.",
		meta: { url: '#' },
	},
];

const baseConfig = {
	groupCol: [12, 12, 12],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none'],
	groupStyle: [
		{ padding: '0' }, // Image section
		{ padding: '0.75rem 1.75rem' }, // Title section
		{ padding: '0 1.75rem 1.75rem' }, // Description section
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
						display: 'block',
					}
				}
			},
		],
		// Section 2: Title
		[
			{
				bit: 'title',
				opt: {
					mode: 'h3',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0',
					}
				}
			},
		],
		// Section 3: Description
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
						margin: '0',
					}
				}
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '4px', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
