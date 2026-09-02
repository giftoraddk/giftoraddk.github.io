import { getStyleOpts } from '@/services/helper';

export const hashtags = ['news', 'blog', 'article', 'overlay', 'modern', 'card'];

export const data = [
	{
		id: 1, status: 'active', mode: 'news',
		title: 'How to improve your UI design skills',
    description: 'The design industry is constantly evolving, but good design is timeless.',
		pics: 'https://i.ibb.co/KpnkmF38/bird.jpg',
		tags: ['Design', 'Product', '12 min read'],
		meta: { url: '#' },
  },
	{
		id: 2, status: 'active', mode: 'news',
		title: 'Quickly develop an "eye" for great design',
    description: 'Learn how to quickly develop an "eye" for UI design and improve your design skills.',
		pics: 'https://i.ibb.co/S7R6zp64/mountain.jpg',
		tags: ['Design', 'Product', '12 min read'],
		meta: { url: '#' },
  },
];

const baseConfig = {
	groupCol: [12],
	groupRow: ['auto'],
	groupJustify: ['none'],
	groupStyle: [
		{ position: 'relative', overflow: 'hidden', borderRadius: '1.25rem' },
	],
	makes: [
		[
			// Image — full-cover background
			{
				bit: 'pics',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'gallery',
          float: 'none',
					stys: {
						width: '100%',
						aspectRatio: '16/9',
						objectFit: 'cover',
						display: 'block',
						borderRadius: '1.25rem',
					}
				}
			},
			// Title — overlaid, bottom of image
			{
				bit: 'title',
				opt: {
					mode: 'h3',
          stys: {
						position: 'absolute',
						bottom: '6.7rem',
						left: '1.5rem',
						right: '1.5rem',
						color: 'white', // only for image bg
						textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // custom fontSize
          },
				}
			},
			// Content — below title, overlaid
			{
				bit: 'description',
				opt: {
					mode: 'p',
          html: true,
					cls: 'line-clamp-2',
					stys: {
						position: 'absolute',
						bottom: '3.5rem',
						left: '1.5rem',
						right: '1.5rem',
						color: 'color-mix(in oklab, white 85%, transparent)', // only for image bg
						textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            lineHeight: '1'
					}
				}
			},
			// Tags — pill badges at bottom
			{
				bit: 'tags',
				opt: {
					mode: 'tags',
					type: 'fill',
					gap: '0.5rem',
					stys: {
						position: 'absolute',
						bottom: '1.25rem',
						left: '1.5rem',
					}
				}
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.25rem', gradient: false })
	},
  slider: { autoplay: 5000, loop: true, slides: 1, spacing: 0, nav: false, dots: false, effect: 'fade', blur: true }
};

export const config = { ...baseConfig };
