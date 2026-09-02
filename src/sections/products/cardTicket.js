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

const baseConfig = {
	groupCol: [12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'left', 'left', 'between'],
	groupStyle: [
		{ position: 'relative', margin: '0 0 1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' },
		{
			marginBottom: '0.85rem', gap: '0.5rem', paddingBottom: '0.85rem',
			borderBottom: '2px dashed color-mix(in oklab, var(--color-base-content) 20%, transparent)',
		},
		{ marginBottom: '0.75rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Image + "coupon" stamp badge — ticket vibe
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: { width: '58%', margin: '0 auto', objectFit: 'contain' },
				},
			},
			{
				bitLocal: 'ƯU ĐÃI',
				opt: {
					mode: 'badge', type: 'dash', color: 'success',
					stys: {
						position: 'absolute', top: '0.4rem', left: '0.4rem',
						fontWeight: '700', // custom fontWeight
						fontSize: '0.65rem', letterSpacing: '0.05em', zIndex: '2', padding: '0.2rem 0.75rem',
					},
				},
			},
			{
				bit: 'description',
				opt: {
					mode: 'popover', icon: 'ri:information-line', ui: 'modern',
					placement: 'bottom-end', iconSize: '1.25rem',
					stys: { position: 'absolute', top: '0', right: '0', zIndex: '2' },
				},
			},
		],
		// Tags — dashed tear-line divider below (perforation)
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Title & Rating
		[
			{
				bit: 'title',
				ext: { org: '/product/{id}' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // custom fontSize
						fontWeight: '500', // custom fontWeight
						color: 'var(--color-base-description)',
						lineHeight: '1.1', // custom lineHeight
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'xs', disabled: true, color: 'success', mask: 'mask-star-2' },
			},
		],
		// Price & dashed CTA (torn-stub button)
		[
			{
				bit: 'pricing',
				ext: { currency: 'đ' },
				opt: { mode: 'span', stys: {
					fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', // custom fontSize
					fontWeight: '900', // custom fontWeight
					color: 'var(--color-base-description)',
				} },
			},
			{
				bitLocal: '',
				opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '1rem', ui: 'modern', type: 'dash', color: 'success', height: '40px', rounded: '12px', action: 'add-to-cart' },
			},
		],
	],
	stys: { padding: '1.75rem', height: '100%' },
	bg: {
		...getStyleOpts({ rounded: '1.5rem', tint: '#e19d69', total: 2, gradient: true, blobType: 'ellipse', deg: 0 })
	},
	anime: 'slide-in-blurred-top',
};

export const config = { ...baseConfig };
