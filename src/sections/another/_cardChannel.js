import { getStyleOpts } from '@/services/helper';

export const hashtags = ['channel', 'live', 'stream', 'online', 'community', 'card'];

export const data = [
	{
		pics: 'https://i.ibb.co/KpnkmF38/bird.jpg',
		tags: 'Design|Community',
		created_at: 'Apr 21, 2023',
		title: 'Kênh Thần Số Học Cùng Chuyên Gia',
		description: 'Cập nhật video và bài viết mới nhất mỗi tuần, cùng cộng đồng thảo luận trực tiếp.',
	},
];

const baseConfig = {
	groupCol: ['12', '12', '12', '12', '12'],
	groupRow: ['auto', 'auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'left', 'left', 'left', 'left'],
	groupStyle: [
		{ position: 'relative', padding: '0' },
		{ padding: '1.25rem 1.5rem 0' },
		{ padding: '0.75rem 1.5rem 0' },
		{ padding: '0.5rem 1.5rem 0' },
		{ padding: '0.5rem 1.5rem 2rem' },
	],
	makes: [
		// Group 0: Top Image + online dot (static, ping effect)
		[
			{
				bit: 'pics',
				opt: {
					mode: 'gallery',
          float: 'none',
          rounded: '1.75rem',
					stys: {
						width: '100%',
						aspectRatio: '4/3',
						objectFit: 'cover',
						display: 'block'
					}
				}
			},
			{
				bitLocal: 'svg-spinners:pulse-2',
				opt: {
          mode: 'icon',
					width: '2rem',
					color: 'var(--color-primary)',
					stys: {
						position: 'absolute',
						top: '1rem',
						right: '1rem',
						zIndex: 2,
					}
				}
			},
		],
		// Group 1: Tags
		[
			{ bit: 'tags', opt: { mode: 'tags', type: 'soft', color: 'primary' } },
		],
		// Group 2: Metadata (Date)
		[
			{
				bit: 'created_at',
				opt: {
					mode: 'p',
					stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
						color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
					}
				}
			},
		],
		// Group 3: Title
		[
			{
				bit: 'title',
				opt: {
					mode: 'h2',
					stys: {
            fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // custom fontSize
						color: 'var(--color-primary)',
					}
				}
			},
		],
		// Group 4: Description
		[
			{
				bit: 'description',
				opt: {
					mode: 'p',
					stys: {
						color: 'color-mix(in oklab, var(--color-base-content) 75%, transparent)',
					}
				}
			},
		],
	],
	stys: {},
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2 })
	},
};

export const config = { ...baseConfig };
