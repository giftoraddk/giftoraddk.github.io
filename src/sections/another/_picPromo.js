export const hashtags = ['benefits', 'modern', 'promo', 'card', 'sale', 'image', 'button'];

export const data = [
	{
		title: '25% off',
		content: 'It is a long established fact that a reader will be distracted by the content of a page',
		pics: 'https://i.ibb.co/qM8d2wDy/multicolor.jpg',
		meta: { subtitle: 'premium', ctaLabel: 'Upgrade now' },
	},
];

const baseConfig = {
	groupCol: ['12', '12'],
	groupRow: ['auto', 'auto'],
	groupJustify: ['none', 'none'],
	groupStyle: [
		{
			position: 'absolute',
			top: '0',
			left: '0',
			right: '0',
			bottom: '0',
			zIndex: 0,
		},
		{
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			padding: '2.5rem 1.5rem 1.5rem 1.5rem',
			minHeight: '420px',
			zIndex: 1,
		},
	],
	makes: [
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						position: 'absolute',
						bottom: '0',
						left: '0',
						width: '100%',
						height: '75%',
						objectFit: 'cover',
						WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
						maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
					},
				},
			},
		],
		[
			{
				bit: 'title',
				opt: {
					mode: 'h1',
					stys: {
						color: '#ffffff',
						margin: '0',
					},
				},
			},
			{
				bit: 'meta.subtitle',
				opt: {
					mode: 'h2',
					stys: {
						color: '#ffffff',
						margin: '0',
						marginBottom: '1.5rem',
					},
				},
			},
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: '#ffffff',
						opacity: '0.9',
						maxWidth: '85%',
						margin: '0',
					},
				},
			},
			{
				bit: 'meta.ctaLabel',
				opt: {
					mode: 'button',
					type: 'fill',
					fontSize: '1.15rem',
					height: '48px',
					rounded: '12px',
					stys: { position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem' },
				},
			},
			{
				bitLocal: 'ri:close-line',
				opt: {
					mode: 'icon',
					width: '24px',
					color: '#ffffff',
					stys: { position: 'absolute', top: '1.5rem', right: '1.5rem', cursor: 'pointer', opacity: '0.6', zIndex: 1 },
				},
			},
		],
	],
	stys: {
		position: 'relative',
		borderRadius: '1.75rem',
		overflow: 'hidden',
		background: '#0a132c',
	},
};

export const config = { ...baseConfig };
