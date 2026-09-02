import { getStyleOpts } from '@/services/helper';

export const hashtags = ['hero', 'modern', 'card', 'ui', 'hero', 'link'];

export const data = [
	{
		pics: 'https://i.ibb.co/jv3HWNVV/kimthiendung.jpg', // Placeholder icon
		title: 'HeroUI',
		content: 'Make beautiful websites regardless of your design experience.',
		meta: {
			urlText: 'heroui.com',
			linkText: 'Visit source code on GitHub.',
			linkUrl: 'https://github.com/heroui-inc/heroui',
			externalIcon: 'ri:external-link-line',
		},
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none'],
	groupStyle: [
		{
			padding: '1.5rem 1.75rem',
			borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
		},
		{
			padding: '0 1.75rem 0.5rem',
			borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
		},
		{
			padding: '0 1.75rem 0.5rem',
			display: 'flex',
			alignItems: 'center'
		},
	],
	makes: [
		// Group 1: Header (Icon, Title, URL) float left style
		[
			// Icon (Float)
			{ bit: 'pics', opt: { mode: 'gallery', stys: { marginRight: '1rem', width: '3rem', height: '3rem', borderRadius: '0.5rem' } } },
			// Title & URL
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
            fontWeight: '600', // custom fontSize
						color: 'var(--color-base-content)',
						textAlign: 'left',
						marginBottom: '0.125rem',
					}
				}
			},
			{
				bit: 'meta.urlText',
				opt: {
					mode: 'p',
					stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
						textAlign: 'left',
					}
				}
			},
		],
		// Group 1: Body
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-base-content)',
					}
				}
			},
		],
		// Group 2: Footer
		[
			{ bit: 'meta.linkText', opt: { mode: 'a', stys: { color: 'var(--color-primary)', fontSize: '1rem', fontWeight: '500', textDecoration: 'none' } } },
			{ bit: 'meta.externalIcon', opt: { mode: 'icon', width: '1rem', color: 'var(--color-primary)', stys: { marginLeft: '0.375rem' } } },
		],
	],
	stys: {
		display: 'flex',
		flexDirection: 'column'
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
