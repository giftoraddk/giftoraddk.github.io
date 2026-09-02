import { getStyleOpts } from '@/services/helper';

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

const baseConfig = {
	groupCol: [12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'left', 'none', 'between'],
	groupStyle: [
		{ position: 'relative', margin: '0 0 1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '140px' },
		{ marginBottom: '0' },
		{ marginBottom: '0.6rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Image with soft circle bg
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: {
						position: 'absolute',
            top: '-15%',
            left: '-10%',
						width: '81%',
						aspectRatio: '1/1',
						background: 'var(--color-primary)',
						borderRadius: '50%',
						opacity: '0.12',
						zIndex: '0',
					},
				},
			},
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: { width: '62%', margin: '0 auto', objectFit: 'contain', position: 'relative', zIndex: '1' },
				},
			},
			{
				bit: 'description',
				opt: {
					mode: 'popover',
					icon: 'ri:information-line',
					ui: 'spatial',
					placement: 'bottom-end',
					iconSize: '1.25rem',
					stys: { position: 'absolute', top: '0', right: '0', zIndex: '2' },
				},
			},
		],
		// Tags
		[{ bit: 'tags', opt: { mode: 'tags' } }],
		// Brand + Title + Rating (stacked)
		[
			{
				bit: 'brand',
				opt: {
					mode: 'span',
					stys: {
						fontSize: 'clamp(0.7rem, 1vw, 0.75rem)', // custom fontSize
						fontWeight: '600', // custom fontWeight
						opacity: '0.45',
						textTransform: 'uppercase',
						letterSpacing: '0.06em',
					},
				},
			},
			{
				bit: 'title',
				ext: { org: '/product/{id}' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', // custom fontSize
						color: 'var(--color-base-description)',
						lineHeight: '1.2', // custom lineHeight
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'xs', disabled: true, color: 'warning', mask: 'mask-star-2' },
			},
		],
		// Price + Buy button
		[
			{
				bit: 'pricing',
				ext: { currency: 'đ' },
				opt: {
					mode: 'span',
					stys: {
						fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', // custom fontSize
						fontWeight: '900', // custom fontWeight
						color: 'var(--color-base-description)',
					},
				},
			},
			{
				bitLocal: '',
				opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '1rem', ui: 'modern', type: 'fill', color: 'primary', height: '40px', rounded: '12px', action: 'add-to-cart' },
			},
		],
	],
	stys: { padding: '1.5rem', height: '100%' },
	bg: { ...getStyleOpts({ rounded: '1.75rem', tint: '#ffbb24', total: 2 }) },
	anime: 'fade-in-fwd',
};

export const config = { ...baseConfig };
