import { getStyleOpts } from '@/services/helper';

export const hashtags = ['testimonials', 'mewis', 'testimonial', 'review', 'user', 'card', 'feedback'];

export const data = [
	{
		pics: 'https://i.ibb.co/jv3HWNVV/kimthiendung.jpg',
		title: 'Kim Thien Dung',
		score: '5.0~1',
		content:
			'”Website này soi đường cho những ai đang lạc lối trong cuộc sống. Mình từng tìm đến đây trong một giai đoạn rất bế tắc, và những công cụ như thần số học, bài viết về linh hồn giúp mình thay đổi nhận thức.',
		meta: {
			role: 'Khách Hàng',
			quoteIcon: 'ri:double-quotes-r',
		},
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12', '12'],
	groupRow: ['auto', '1rem', 'auto', 'auto'],
	groupJustify: ['none', 'center', 'left', 'left'],
	groupStyle: [{ padding: '1.5rem 1.5rem 0', position: 'relative' }, { padding: '0 1.5rem' }, { padding: '0 1.5rem' }, { padding: '0 1.5rem 1.5rem' }],
	makes: [
		// Group 0: Header (Avatar, Name/Role, Quote Icon) float left style
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
					stys: {
						width: '4.5rem',
						height: '4.5rem',
						borderRadius: '50%',
						border: '2px solid var(--color-primary)',
						marginRight: '1rem',
					},
				},
			},
			{
				bit: 'title',
				opt: {
					mode: 'p',
					stys: {
            fontWeight: '600', // custom fontSize
						marginBottom: '0.25rem',
					},
				},
			},
			{
				bit: 'meta.role',
				opt: {
					mode: 'p',
					stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
					},
				},
			},
			{
				bit: 'meta.quoteIcon',
				opt: {
					mode: 'icon',
					width: '5rem',
					color: 'rgba(255, 255, 255, 0.1)', // Large faded quote icon
					stys: {
						position: 'absolute',
						right: '1.5rem',
						top: '1.5rem',
					},
				},
			},
		],
		// Group 1: Decorative Divider
		[
			{
				bit: 'divider',
				opt: {
					mode: 'p',
					content: '',
					stys: {
						width: '200px',
						height: '1px',
						background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
						margin: '1.5rem 0',
						position: 'relative',
					},
				},
			},
		],
		// Group 2: Rating
		[{ bit: 'score', opt: { mode: 'rating', size: 'sm', disabled: true, color: 'warning', mask: 'mask-star-2' } }],
		// Group 3: Content
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 90%, transparent)',
						fontStyle: 'italic',
						marginTop: '1rem',
						textAlign: 'left',
					},
				},
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
