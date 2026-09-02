import { getStyleOpts } from '@/services/helper';

export const hashtags = ['showcase', 'modern', 'booking', 'card', 'appointment', 'medical', 'schedule'];

export const data = [
	{
		created_at: '19 Oct, 01:00 PM',
		content: 'Discussion of blood test results and discussion\nof well-being. Prescribing medications.',
		pics: 'https://i.ibb.co/jv3HWNVV/kimthiendung.jpg',
		title: 'Dr. Bowman',
		meta: { handle: 'GP', followBtn: 'View details' },
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['between', 'none', 'none'],
	groupStyle: [{ display: 'flex', alignItems: 'center', gap: '1rem' }, { margin: '0.5rem 0' }, { position: 'relative' }],
	makes: [
		[
			{
				bitLocal: 'ri:calendar-schedule-line',
				opt: {
					mode: 'icon',
					width: '24px',
					stys: {
						color: 'var(--color-base-content)',
						border: '1px solid color-mix(in oklab, var(--color-base-content) 60%, transparent)',
						borderRadius: '50%',
						padding: '0.6rem',
					},
				},
			},
			{
				bit: 'created_at',
				opt: {
					mode: 'span',
					stys: { margin: '0', flex: '1' },
				},
			},
			{
				bitLocal: 'ri:more-2-fill',
				opt: {
					mode: 'dropdown',
					placement: 'bottom-end',
					type: 'ghost',
					rounded: '72px',
					fontSize: '1.5rem',
					items: [
						{ label: 'Profile', icon: 'lucide:user' },
						{ label: 'Settings', icon: 'lucide:settings' },
					],
				},
			},
		],
		[
			{
				bit: 'content',
				opt: {
					mode: 'p',
					stys: {  margin: '0', paddingRight: '1rem' },
				},
			},
		],
		// Footer (Avatar, Name/Role, Follow Button) float left style
		[
			// Avatar (Float left)
			{ bit: 'pics', opt: { mode: 'gallery', stys: { marginRight: '0.75rem', width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' } } },
			// Name & Handle
			{
				bit: 'title',
				opt: {
					mode: 'p',
					cls: 'truncate',
					stys: {
            fontWeight: '600', // custom fontSize
						textAlign: 'left',
						marginRight: '5rem',
					},
				},
			},
			{
				bit: 'meta.handle',
				opt: {
					mode: 'p',
					cls: 'truncate',
					stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
						textAlign: 'left',
						marginRight: '5rem',
					},
				},
			},
			// Follow Button (Float right)
			{
				bit: 'meta.followBtn',
				opt: {
					mode: 'button',
					type: 'outline',
					color: 'primary',
					stys: { position: 'absolute', right: '0', top: '0', borderRadius: '2rem', padding: '0 1rem' },
				},
			},
		],
	],
	stys: {
		padding: '1.25rem 1.75rem',
	},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
