import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'modern', 'travel', 'tour', 'vacation', 'exploration', 'card'];

export const data = [
	{
		id: 1, status: 'active', mode: 'product',
		title: 'Photo by Trent Haaland',
		pics: 'https://i.ibb.co/99VJJBVc/island.jpg|https://i.ibb.co/h1wn0qDX/gadern.jpg',
		pricing: '75~0~day',
		score: '4~0',
		meta: {
			location: 'San Diego, California',
			duration: '21 DAYS TOUR',
			url: '#',
		},
	},
];

const baseConfig = {
	groupCol: [12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'between', 'none', 'between'],
	groupStyle: [
		{ padding: '0' }, // Image
		{ padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.25rem 0' }, // Location & Price
		{ padding: '0 1rem', marginBottom: '1.5rem' }, // Title
		{ padding: '0 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, // Duration & Rating
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
						aspectRatio: '4/5',
						objectPosition: 'bottom',
						objectFit: 'cover',
						display: 'block',
						borderRadius: '0',
					}
				}
			},
		],
		// Section 2: Location & Price
		[
			{
				bit: 'meta.location',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-warning)',
						margin: '0',
					}
				}
			},
			{
				bit: 'pricing',
				ext: { currency: '$' },
				opt: {
					mode: 'p',
					suffix: '/Day',
					stys: {
						display: 'flex',
						alignItems: 'baseline',
						gap: '2px',
					}
				}
			},
		],
		// Section 3: Title
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0',
					}
				}
			},
		],
		// Section 4: Duration & Rating
		[
			{
				bit: 'meta.duration',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
						textTransform: 'uppercase',
					}
				}
			},
			{
				bit: 'score',
				opt: {
					mode: 'rating',
					size: 'xs',
					disabled: true,
					color: 'warning',
					mask: 'mask-star-2',
					stys: { color: 'var(--color-warning)' }
				}
			},
		],
	],
	stys: {
		borderRadius: '1.75rem',
		overflow: 'hidden'
	},
	bg: {	
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
