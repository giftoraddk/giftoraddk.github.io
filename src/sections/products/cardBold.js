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
		{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '160px' },
		{ marginBottom: '0' },
		{ marginBottom: '0.75rem', gap: '0.5rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Image over a rotated solid color panel + "HOT" ribbon stamp
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: {
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%) rotate(-8deg)',
						width: '68%',
						aspectRatio: '1/1',
						background: 'var(--color-primary)',
						borderRadius: '1.25rem',
						zIndex: '0',
					},
				},
			},
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						width: '62%', margin: '0 auto', objectFit: 'contain', position: 'relative', zIndex: '1', aspectRatio: '1/1',
						filter: 'drop-shadow(0 10px 14px color-mix(in oklab, var(--color-base-content) 25%, transparent))',
					},
				},
			},
			{
				bitLocal: 'HOT',
				opt: {
					mode: 'badge', type: 'fill', color: 'error',
					stys: {
						position: 'absolute', top: '0.5rem', left: '-0.5rem',
						transform: 'rotate(-12deg)', fontWeight: '800', // custom fontWeight
						letterSpacing: '0.05em', zIndex: '2', padding: '0.25rem 1rem',
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
		// Tags
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Title & Rating — title link thẳng sang trang chi tiết /product/{id}
		[
			{
				bit: 'title',
				ext: { org: '/product/{id}' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.375rem, 2.2vw, 1.75rem)', // custom fontSize
						fontWeight: '800', // custom fontWeight
						color: 'var(--color-base-description)',
						lineHeight: '1.1', // custom lineHeight
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'md', disabled: true, color: 'error', mask: 'mask-star-2' },
			},
		],
		// Price & Button
		[
			{
				bit: 'pricing',
				ext: { currency: 'đ' },
				opt: { mode: 'span', stys: {
					fontSize: 'clamp(1.375rem, 2.2vw, 1.75rem)', // custom fontSize
					fontWeight: '900', // custom fontWeight
					color: 'var(--color-primary)',
				} },
			},
			{
				bitLocal: '',
				opt: { mode: 'button', prefix: 'ri:shopping-cart-line', iconSize: '1rem', ui: 'modern', type: 'fill', color: 'primary', height: '45px', rounded: '8px', action: 'add-to-cart' },
			},
		],
	],
	stys: {
		padding: '1.75rem', height: '100%',
		border: '2px solid color-mix(in oklab, #de8daf 35%, transparent)',
	},
	bg: {
		...getStyleOpts({ rounded: '0', tint: '#de8daf', total: 1, gradient: true, blobType: 'circleOverlap', deg: 45 })
	},
	anime: 'slide-in-blurred-top',
};

export const config = { ...baseConfig };
