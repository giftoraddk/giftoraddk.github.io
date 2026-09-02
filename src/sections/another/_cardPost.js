import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'modern', 'post', 'photo', 'social', 'landscape', 'card'];

export const data = [
	{
		id: 1, status: 'active', mode: 'product',
		title: 'This photo was taken by Robert Lukeman',
		pics: 'https://i.ibb.co/S7R6zp64/mountain.jpg',
    tags: 'mountain|travel',
		meta: {
			views: '27615',
			likes: '217',
			url: '#',
			ctaLabel: 'Xem chi tiết',
		},
	},
];

const baseConfig = {
	groupCol: [12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none', 'none'],
	groupStyle: [
		{ position: 'relative', marginBottom: '1rem' }, // Image section
		{ padding: '0 1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }, // Tags section
		{ padding: '0 1rem 1.25rem' }, // Title section
    { }
	],
	makes: [
		// Section 1: Image with Overlays
		[
			{
				bit: 'pics',
        ext: { org: 'meta.url' },
				opt: {
					mode: 'gallery',
          rounded: '1.25rem 1.25rem 0 0',
					stys: {
						width: '100%',
						aspectRatio: '3/2',
						objectFit: 'cover',
						display: 'block',
					}
				}
			},
			{
				bit: 'meta.views',
				opt: {
					mode: 'p',
					prefix: 'ri:eye-line', // icon iconify
					iconSize: '1.25rem',
					stys: {
						position: 'absolute',
						bottom: '1rem',
						left: '1rem',
						color: 'var(--color-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: '0.375rem',
					}
				}
			},
			{
				bit: 'meta.likes',
				opt: {
					mode: 'p',
					suffix: 'ri:heart-3-line', // icon iconify
					iconSize: '1.25rem',
					stys: {
						position: 'absolute',
						bottom: '1rem',
						right: '1rem',
						color: 'var(--color-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: '0.375rem',
					}
				}
			},
		],
		// Section 2: Tags
    [
      { bit: 'tags', opt: { mode: 'tags', type: 'soft', color: 'primary' } },
    ],
		// Section 3: Title
		[
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-base-content)',
						margin: '0',
					}
				}
			},
		],
		// Section 4: Link to detail — bit resolves meta.url ('/post/{slug}', xem postSlug()) from data
		[
			{
				bit: 'meta.ctaLabel',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'a',
					stys: {
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						width: '100%', height: '48px', borderRadius: '0 0 1.25rem 1.25rem',
						background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
						color: 'var(--color-base-content)',
					},
				},
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.25rem', tint: '#34ace0', total: 2, deg: 225 })
	},
};

// Removed manual overrides

export const config = { ...baseConfig };
