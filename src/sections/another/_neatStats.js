import { getStyleOpts } from '@/services/helper';

export const hashtags = ['stats', 'modern', 'simple', 'card', 'visit', 'mordor'];

export const data = [
	{
		title: 'Visit Mordor',
		content: 'Super creative and colorful illustrations by Matheus Lopes. Check out more of his amazing artworks in his portfolio.',
		meta: { btn: 'View more', url: '#' },
	},
];

const baseConfig = {
	groupCol: [12, 12],
	groupRow: ['auto', 'auto'],
	groupJustify: ['none', 'center'],
	groupStyle: [
		{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
		{ padding: '1rem 1.75rem', background: 'color-mix(in oklab, var(--color-base-content) 5%, transparent)' },
	],
	makes: [
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 90%, transparent)',
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
						margin: '0',
						wordSpacing: '0.05rem',
					},
				},
			},
		],
		[
			{
				bit: 'meta.btn',
				opt: {
					mode: 'a',
					stys: {
						fontSize: '1rem',
						fontWeight: '400',
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
						textDecoration: 'none',
					},
				},
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '0', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
