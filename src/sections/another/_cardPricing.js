import { getStyleOpts } from '@/services/helper';

export const hashtags = ['pricing', 'modern', 'pricing', 'card', 'finance', 'premium'];

export const data = [
	{
		title: 'Zero Hidden Fees',
		content: 'Radical transparency in pricing.\nNo maintenance fees.',
		meta: {
			icon: 'ri:money-dollar-circle-fill',
			btnText: 'View Pricing',
		},
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['center', 'center', 'center', 'center'],
	groupStyle: [
		{
			position: 'absolute',
			top: '-2rem',
			left: '50%',
			transform: 'translateX(-50%)',
			zIndex: 10,
		},
		{ margin: '1rem 0' },
		{ marginBottom: '2rem' },
		{ display: 'flex', justifyContent: 'center' },
	],
	makes: [
		[
			{
				bit: 'meta.icon',
				opt: {
					mode: 'icon',
					width: '2.75rem',
					color: '#2ebd85',
					stys: {
						background: '#ffffff',
						padding: '0.75rem',
						margin: '0.25rem',
						borderRadius: '50%',
						boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
					},
				},
			},
		],
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
						textAlign: 'center',
						margin: '0',
					},
				},
			},
		],
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
						textAlign: 'center',
					},
				},
			},
		],
		[
			{
				bit: 'meta.btnText',
				opt: {
					mode: 'button',
					type: 'soft',
					color: 'primary',
					height: '48px',
					fontSize: '1rem',
					rounded: '72px',
					stys: {
						padding: '0 3rem',
						fontWeight: '600',
					},
				},
			},
		],
	],
	stys: {
		padding: '2.5rem 1.75rem 1.75rem',
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
