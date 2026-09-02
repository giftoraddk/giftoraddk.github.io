/** Colors
  --color-base-100 = '#141414'
  --color-base-200 = 'increase dark(white)/light(black) 12% of base-100'
  --color-base-300 = 'increase dark(white)/light(black) 18% of base-100'
  --color-base-content = '#f3f4f6'
  --color-primary = '#2ebd85'
  --color-secondary = '#f5465c'
  --color-accent = '#a855f7'
  --color-info = '#00c7d4'
  --color-warning = '#ffba1f'
*/
/** default
 * 1rem = 16px
 */
import { getStyleOpts } from '@/services/helper';

export const hashtags = ['testimonials', 'modern', 'profile', 'user', 'card', 'social'];

export const data = [
	{
		pics: 'https://i.ibb.co/jv3HWNVV/kimthiendung.jpg',
		title: 'Kim Thien Dung',
		content: 'Frontend developer and UI/UX enthusiast.\nJoin me on this coding adventure!',
		tags: '#FrontendWithZoey 💻',
		meta: {
			handle: '@kimthiendung',
			followBtn: 'Follow',
			followingCount: '4',
			followingText: 'Following',
			followersCount: '97.1K',
			followersText: 'Followers',
		},
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'left'],
	groupStyle: [
		{ padding: '0.75rem 1rem', height: '2.5rem' },
		{ padding: '0.25rem 1rem 0.75rem 1rem' },
		{ padding: '0 1rem 1rem 1rem', display: 'flex', alignItems: 'center' },
	],
	makes: [
		// Group 0: Header (Avatar, Name/Role, Follow Button) float left style
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
						marginRight: '4.875rem',
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
						marginRight: '4.875rem',
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
					stys: { position: 'absolute', right: '1rem', top: '0.75rem', borderRadius: '2rem', padding: '0 1rem' },
				},
			},
		],
		// Group 1: Body
		[
			{ bit: 'content', opt: { mode: 'p', stys: { marginBottom: '0.75rem' } } },
			{
				bit: 'tags',
				opt: {
					mode: 'p',
					stys: {
						color: 'var(--color-primary)',
					},
				},
			},
		],
		// Group 2: Footer
		[
			{
				bit: 'meta.followingCount',
				opt: {
					mode: 'p',
					stys: {
						marginRight: '0.25rem',
					},
				},
			},
			{
				bit: 'meta.followingText',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
						marginRight: '1.25rem',
					},
				},
			},
			{
				bit: 'meta.followersCount',
				opt: {
					mode: 'p',
					stys: {
						marginRight: '0.25rem',
					},
				},
			},
			{
				bit: 'meta.followersText',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
					},
				},
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 }),
	},
};

export const config = { ...baseConfig };
