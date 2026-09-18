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
		},
	},
];

const baseConfig = {
	groupCol: [12, 12, 12],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'left', 'none'],
	groupStyle: [
		{ position: 'relative', marginBottom: '1.75rem' },
		{ marginBottom: '0.75rem' },
		{
			marginBottom: '0', gap: '0.35rem',
			borderTop: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)',
			paddingTop: '0.85rem',
		},
	],
	makes: [
		// Image — plain, generous whitespace, stats overlaid top-right / bottom-right
		[
			{
				bit: 'pics',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'gallery',
					rounded: '.75rem',
					stys: { width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' },
				},
			},
			{
				bit: 'meta.views',
				opt: {
					mode: 'p',
					prefix: 'ri:eye-line',
					iconSize: '1rem',
					stys: {
						position: 'absolute', top: '0.75rem', right: '0.75rem',
						display: 'flex', alignItems: 'center', gap: '0.3rem',
						padding: '0.25rem 0.6rem', borderRadius: '999px',
						background: 'color-mix(in oklab, var(--color-base-100) 70%, transparent)',
						color: 'var(--color-base-description)',
						fontSize: '0.8rem',
					},
				},
			},
			{
				bit: 'meta.likes',
				opt: {
					mode: 'p',
					prefix: 'ri:heart-3-line',
					iconSize: '1rem',
					stys: {
						position: 'absolute', top: '0.75rem', left: '0.75rem',
						display: 'flex', alignItems: 'center', gap: '0.3rem',
						padding: '0.25rem 0.6rem', borderRadius: '999px',
						background: 'color-mix(in oklab, var(--color-base-100) 70%, transparent)',
						color: 'var(--color-base-description)',
						fontSize: '0.8rem',
					},
				},
			},
		],
		// Tags
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Title — clickable, links to detail (meta.url = '/post/{slug}-{id}/', xem postSlug()
		// trong services/helper.js — id thô KHÔNG khớp route thật /post/[slug].astro)
		[
			{
				bit: 'title',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)',
						fontWeight: '400',
						letterSpacing: '0.01em',
						color: 'var(--color-base-description)',
						lineHeight: '1.2',
						margin: '0',
					},
				},
			},
		],
	],
	stys: {
		padding: '1rem', height: '100%',
		border: '1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent)',
    borderRadius: '.5rem',
	},
	bg: {
		...getStyleOpts({ rounded: '0', hueCustom: 1 })
	},
	anime: 'fade-in',
};

export const config = { ...baseConfig };
