import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'cafe', 'cafe', 'menu', 'coffee', 'drink', 'card'];

export const data = [
  {
    id: 1, status: 'active', mode: 'product',
    title: 'Espresso',
    description: 'Cà phê pha ép kiểu Ý, đậm đặc và thơm nồng.',
    pics: 'https://i.ibb.co/7xR5YY03/espresso.png',
    tags: 'hot|coffee|strong',
    score: '4.5~1',
    pricing: '35000~7200~ly',
  },
];

const _corner = (pos) => ({
	bitLocal: '',
	opt: {
		mode: 'span',
		stys: {
			position: 'absolute', width: '1.25rem', height: '1.25rem', zIndex: '2',
			...(pos.includes('top') ? { top: '0', borderTop: '2px solid var(--color-primary)' } : { bottom: '0', borderBottom: '2px solid var(--color-primary)' }),
			...(pos.includes('left') ? { left: '0', borderLeft: '2px solid var(--color-primary)' } : { right: '0', borderRight: '2px solid var(--color-primary)' }),
		},
	},
});

const baseConfig = {
	groupCol: [12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'left', 'left', 'between'],
	groupStyle: [
		{ position: 'relative', margin: '0 0 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '160px' },
		{ marginBottom: '0.75rem', gap: '0.5rem' },
		{ marginBottom: '0.75rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Image with tech-scan corner brackets
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: { width: '60%', margin: '0 auto', objectFit: 'contain', position: 'relative', zIndex: '1' },
				},
			},
			_corner('top-left'),
			_corner('top-right'),
			_corner('bottom-left'),
			_corner('bottom-right'),
			{
				bit: 'description',
				opt: {
					mode: 'popover', icon: 'ri:information-line', ui: 'modern',
					placement: 'bottom-end', iconSize: '1.1rem',
					stys: { position: 'absolute', top: '0', right: '1.5rem', zIndex: '2' },
				},
			},
		],
		// Tags
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Title (uppercase, tracked) & Rating
		[
			{
				bit: 'title',
				ext: { org: '/product/{id}' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.1rem, 1.8vw, 1.375rem)', // custom fontSize
						fontWeight: '700', // custom fontWeight
						textTransform: 'uppercase', // custom textTransform
						letterSpacing: '0.04em', // custom letterSpacing
						color: 'var(--color-base-description)',
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'xs', disabled: true, color: 'info', mask: 'mask-star-2' },
			},
		],
		// Price (underlined stat) & ghost button
		[
			{
				bit: 'pricing',
				ext: { currency: 'đ' },
				opt: { mode: 'span', stys: {
					fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', // custom fontSize
					fontWeight: '900', // custom fontWeight
					color: 'var(--color-base-description)',
					borderBottom: '2px solid color-mix(in oklab, var(--color-primary) 45%, transparent)',
					paddingBottom: '0.15rem',
				} },
			},
			{
				bitLocal: '',
				opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '1rem', ui: 'modern', type: 'ghost', color: 'primary', height: '40px', rounded: '6px', action: 'add-to-cart' },
			},
		],
	],
	stys: {
		padding: '1.75rem', height: '100%',
		border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
	},
	bg: {
		...getStyleOpts({ rounded: '0', tint: '#ffbb24', total: 1, gradient: true, blur: true, blobType: 'circleOverlap', deg: 180 })
	},
	anime: 'fade-in-bck',
};

export const config = { ...baseConfig };
