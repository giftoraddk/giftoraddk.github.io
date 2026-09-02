import { getStyleOpts } from '@/services/helper';

export const hashtags = ['features', 'modern', 'feature', 'service', 'icon', 'simple'];

export const data = [
	{
		title: 'Fast Refresh',
		content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec congue, nisl eget molestie varius, enim ex faucibus purus.',
		meta: { icon: 'ri:flashlight-fill' },
	},
];

const baseConfig = {
	groupCol: [12, 12, 12],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['center', 'center', 'center'],
	groupStyle: [
		{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }, // Icon
		{ marginBottom: '0.75rem', textAlign: 'center' }, // Title
		{ marginBottom: '0', textAlign: 'center' }, // Desc
	],
	makes: [
		// Section 1: Icon in a circle
		[
			{
				bit: 'meta.icon',
				opt: {
					mode: 'icon',
					width: '2.75rem',
					color: 'var(--color-primary)',
					stys: {
						width: '4rem',
						height: '4rem',
						background: 'color-mix(in oklab, var(--color-primary) 20%, transparent)',
						borderRadius: '50%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}
				}
			},
		],
		// Section 2: Title
		[
			{
				bit: 'title',
				opt: { mode: 'h3', stys: {} }
			},
		],
		// Section 3: Description
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
						maxWidth: '30rem',
					}
				}
			},
		],
	],
	stys: {
		padding: '1.75rem',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
