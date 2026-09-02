export const hashtags = ['features', 'modern', 'feature', 'cta', 'financial', 'gradient'];

export const data = [
	{
		title: 'Take Control of Your Financial Future Today',
		content: 'Secure payments, always protected',
		meta: {
			btnText: 'Get Started Free',
			icon: 'ri:check-double-fill',
		},
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['center', 'center', 'center'],
	groupStyle: [
		{ marginBottom: '1.5rem', textAlign: 'center' },
		{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' },
		{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
	],
	makes: [
		[
			{
				bit: 'title',
				opt: {
					mode: 'h1',
					motion: true,
					word: true,
					effect: 'scatterIn',
					stys: {
						color: '#111827',
						maxWidth: '600px',
						margin: '0 auto',
					},
				},
			},
		],
		[
			{
				bit: 'meta.btnText',
				opt: {
					mode: 'button',
					type: 'fill',
					fontSize: '1.05rem',
					height: '48px',
					stys: {
						padding: '0.75rem 1.5rem',
					},
				},
			},
		],
		[
			{
				bit: 'meta.icon',
				opt: {
					mode: 'icon',
          width: '1.5rem',
					color: '#000000',
				},
			},
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: '#000',
					},
				},
			},
		],
	],
	stys: {
		background: 'radial-gradient(circle at 50% 40%, rgba(254, 243, 199, 1) 0%, rgba(217, 249, 157, 1) 40%, rgba(167, 243, 208, 0.6) 100%)',
		padding: '5rem 2rem',
		borderRadius: '2.5rem',
	},
};

export const config = { ...baseConfig };
