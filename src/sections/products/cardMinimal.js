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
	groupJustify: ['none', 'left', 'none', 'between'],
	groupStyle: [
		{ position: 'relative', margin: '0 0 1.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' },
		{ marginBottom: '0.75rem' },
		{
			marginBottom: '1rem', gap: '0.35rem',
			borderTop: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)',
			paddingTop: '0.85rem',
		},
		{ marginBottom: '0' },
	],
	makes: [
		// Image — plain, generous whitespace, no color panel
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: { width: '68%', margin: '0 auto', objectFit: 'contain' },
				},
			},
			{
				bit: 'description',
				opt: {
					mode: 'popover', icon: 'ri:information-line', ui: 'modern',
					placement: 'bottom-end', iconSize: '1.1rem',
					stys: { position: 'absolute', top: '0', right: '0' },
				},
			},
		],
		// Tags
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Title & Rating (divider above)
		[
			{
				bit: 'title',
				ext: { org: '/product/{id}' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)', // custom fontSize
						fontWeight: '400', // custom fontWeight
						letterSpacing: '0.01em', // custom letterSpacing
						color: 'var(--color-base-description)',
						lineHeight: '1.2', // custom lineHeight
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'md', disabled: true, color: 'neutral', mask: 'mask-star-2' },
			},
		],
		// Price & outline CTA
		[
			{
				bit: 'pricing',
				ext: { currency: 'đ' },
				opt: { mode: 'span', stys: {
					fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // custom fontSize
					fontWeight: '300', // custom fontWeight
					color: 'var(--color-base-description)',
				} },
			},
			{
				bitLocal: '',
				opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '0.9rem', ui: 'modern', type: 'outline', color: 'primary', height: '40px', rounded: '999px', action: 'add-to-cart' },
			},
		],
	],
	stys: {
		padding: '2rem', height: '100%',
		border: '1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent)',
	},
	bg: {
		...getStyleOpts({ rounded: '0', hueCustom: 1 })
	},
	anime: 'fade-in',
};

export const config = { ...baseConfig };
