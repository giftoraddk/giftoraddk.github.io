import { getStyleOpts } from '@/services/helper';

export const hashtags = ['trusted', 'modern', 'card', 'simple', 'revenue', 'stat', 'dashboard'];

export const data = [
	{
		title: 'April Revenue',
		content: '21% more than last month',
		meta: { value: '$32,400', url: '#' },
	},
];

const baseConfig = {
	groupCol: [12],
	groupRow: ['auto'],
	groupJustify: ['none'],
	groupStyle: [
		{ display: 'flex', flexDirection: 'column', gap: '0.25rem' },
	],
	makes: [
		[
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
					}
				}
			},
			{
				bit: 'meta.value',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0.125rem 0',
					}
				}
			},
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
					}
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
