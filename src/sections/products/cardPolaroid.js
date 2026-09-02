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
	groupJustify: ['center', 'center', 'center', 'between'],
	groupStyle: [
		{ position: 'relative', margin: '0 0 1.25rem', display: 'flex', justifyContent: 'center', transform: 'rotate(-3deg)' },
		{ marginBottom: '0.75rem', gap: '0.5rem' },
		{ marginBottom: '1rem', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Polaroid photo: thick frame border, washi-tape accent, tilted via group transform
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						width: '70%', padding: '1rem', aspectRatio: '1/1', objectFit: 'cover',
						border: '0.9rem solid color-mix(in oklab, white 85%, transparent)', borderRadius: '0.15rem',
						boxShadow: '0 6px 8px color-mix(in oklab, var(--color-base-content) 30%, transparent)',
					},
				},
			},
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: {
						position: 'absolute', top: '-0.6rem', left: '40%',
						transform: 'translateX(-50%) rotate(-1deg)',
						width: '3.5rem', height: '1.1rem', zIndex: '2',
						background: 'color-mix(in oklab, var(--color-primary) 55%, transparent)',
						boxShadow: '0 2px 4px color-mix(in oklab, var(--color-base-content) 15%, transparent)',
					},
				},
			},
			{
				bit: 'description',
				opt: {
					mode: 'popover', icon: 'ri:information-line', ui: 'modern',
					placement: 'bottom-end', iconSize: '1.1rem',
					stys: { position: 'absolute', top: '0', right: '0.5rem', zIndex: '2' },
				},
			},
		],
		// Tags — centered, caption-style
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Handwritten-style caption title + rating
		[
			{
				bit: 'title',
				ext: { org: '/product/{id}' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)', // custom fontSize
						fontWeight: '500', // custom fontWeight
						fontStyle: 'italic', // custom fontStyle
						textAlign: 'center', // custom textAlign
						color: 'var(--color-base-description)',
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'md', disabled: true, color: 'secondary', mask: 'mask-star-2' },
			},
		],
		// Price & soft CTA
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
				opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '1rem', ui: 'modern', type: 'soft', color: 'secondary', height: '40px', rounded: '12px', action: 'add-to-cart' },
			},
		],
	],
	stys: { padding: '1.75rem 1.75rem 1.5rem', height: '100%' },
	bg: {
		...getStyleOpts({ rounded: '1.5rem', tint: '#ffbb24', total: 1, gradient: true, blobType: 'circleOverlap', deg: 290 })
	},
	anime: 'rotate-in-ccw',
};

export const config = { ...baseConfig };
