export const hashtags = ['cta', 'modern', 'image', 'title', 'button', 'overlay', 'footer'];

export const data = [
	{
		pics: 'https://i.ibb.co/99Cwt2Zv/flights.jpg',
		title: 'Available soon.',
		meta: { btn: 'Notify me' },
	},
];

const baseConfig = {
	groupCol: ['12'],
	groupRow: ['auto'],
	groupJustify: ['none', 'between'],
	groupStyle: [
		{ position: 'relative' }, // Makes the single cell the offset parent for the absolute children
		{ // title + btn
			position: 'absolute',
			bottom: '1.5rem',
			left: '1.5rem',
			right: '1.5rem',
			borderRadius: '1rem',
			border: '1px solid rgba(255, 255, 255, 0.1)',
			background: '#ffffff1a',
			backdropFilter: 'blur(1.25rem)',
			WebkitBackdropFilter: 'blur(1.25rem)', // For Safari
			padding: '1rem 1.25rem',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			fontWeight: 600
		},
	],
	makes: [
		// Single Cell overlaying content over image
		[{ bit: 'pics', opt: { mode: 'gallery', rounded: '1.5rem', stys: { width: '100%', objectFit: 'cover', aspectRatio: '1/1' } } }],
		[
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
						color: '#fff',
					},
				},
			},
			{ bit: 'meta.btn', opt: { mode: 'button', type: 'fill', color: 'info', rounded: '72px' } },
		],
	],
	stys: {
		position: 'relative',
		borderRadius: '1.75rem',
		overflow: 'hidden', // Contains the inner rounded children nicely
		background: 'transparent',
		gap: '0',
	},
};

export const config = { ...baseConfig };