import { getStyleOpts } from '@/services/helper';

export const hashtags = ['cta', 'modern', 'image', 'title', 'subtitle', 'app', 'overlay', 'cta'];

export const data = [
	{
		title: 'Your checklist for better sleep',
		pics: 'https://i.ibb.co/5gDNb6xr/dark.jpg',
		meta: {
			subtitle: 'YOUR DAY YOUR WAY',
			appIcon: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80', // placeholder for icon
			appName: 'Breathing App',
			appDesc: "Get a good night's sleep.",
			btn: 'Get App',
		},
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'none'],
	groupStyle: [
		{ padding: '1.5rem 1.75rem 1rem' }, // Header
		{ position: 'relative' }, // Image Container
		{
			position: 'absolute',
			bottom: '1rem',
			left: '1rem',
			right: '1rem',
			borderRadius: '1.5rem',
			border: '1px solid rgba(255, 255, 255, 0.1)',
			background: '#ffffff1a',
			backdropFilter: 'blur(1.25rem)',
			WebkitBackdropFilter: 'blur(1.25rem)',
			padding: '0.75rem 0',
			minHeight: '3rem',
		},
	],
	makes: [
		// Group 0: Header (Subtitle & Title)
		[
			{
				bit: 'meta.subtitle',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
						marginBottom: '0.375rem',
						textTransform: 'uppercase',
					},
				},
			},
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
						color: 'var(--color-base-content)',
					},
				},
			},
		],
		// Group 1: Main Image
		[
			{
				bit: 'pics',
				opt: { mode: 'gallery', rounded: '0 0 1.75rem 1.75rem', stys: { width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' } },
			},
		],
		// Group 2: Footer Overlay (Icon, Name, Desc, Button)
		[
			{ bit: 'meta.appIcon', opt: { mode: 'gallery', stys: { width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', marginLeft: '1rem' } } },
			{
				bit: 'meta.appName',
				opt: {
					mode: 'p',
					stys: {
						color: '#ffffff',
						paddingLeft: '4.5rem',
						paddingRight: '6.25rem',
						textAlign: 'left',
						marginBottom: '0.125rem',
					},
				},
			},
			{
				bit: 'meta.appDesc',
				opt: {
					mode: 'p',
					stys: {
						color: 'rgba(255, 255, 255, 0.7)',
						paddingLeft: '4.5rem',
						paddingRight: '6.25rem',
						textAlign: 'left',
					},
				},
			},
			{
				bit: 'meta.btn',
				opt: {
					mode: 'button',
					type: 'fill',
					stys: {
						position: 'absolute',
						right: '1rem',
						top: '50%',
						transform: 'translateY(-50%)',
						background: 'var(--color-primary)',
						color: '#ffffff',
						borderRadius: '1.5rem',
						padding: '0.5rem 1.125rem',
						fontWeight: '600',
						fontSize: '0.875rem',
						border: 'none',
						zIndex: '2',
					},
				},
			},
		],
	],
	stys: {
		display: 'flex',
		flexDirection: 'column',
		position: 'relative',
		gap: '0',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 }),
	},
};

export const config = { ...baseConfig };
