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
		{ overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' },
		{ marginBottom: '0' },
		{ marginBottom: '0.75rem', gap: '0.5rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Image section with background polygon moon
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: {
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						position: 'absolute',
						width: '75%',
						aspectRatio: '1/1',
						background: 'var(--color-primary)',
						clipPath: 'ellipse(50% 40% at 50% 100%)',
						zIndex: '0',
					}
				}
			},
			{
        bit: 'pics',
        opt: {
          mode: 'gallery',
          stys: { width: '60%', margin: '0 auto', objectFit: 'contain', position: 'relative', zIndex: '1' },
        },
      },
      {
        bit: 'description',
        opt: {
          mode: 'popover', icon: 'ri:information-line', ui: 'spatial',
          placement: 'bottom-end', iconSize: '1.25rem',
          stys: { position: 'absolute', top: '0', right: '0', zIndex: '2' },
        },
      },
		],
    // Tags
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
            fontWeight: '400', // custom fontWeight
            color: 'var(--color-base-description)',
            lineHeight: '1.1', // custom lineHeight
            margin: '0',
          },
        },
      },
      {
        bit: 'score',
        opt: { mode: 'rating', size: 'xs', disabled: true, color: 'primary', mask: 'mask-star-2' },
      },
    ],
		// Price & Button
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
        opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '1rem', ui: 'modern', type: 'fill', color: 'primary', height: '40px', rounded: '12px', action: 'add-to-cart' },
      },
    ],
	],
	stys: { padding: '1.75rem', height: '100%' },
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: 'var(--color-primary)', total: 1 })
	},
	anime: 'bounce-in-left',
	ui: 'spatial'
};

export const config = { ...baseConfig };
