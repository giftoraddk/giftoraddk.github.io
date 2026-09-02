import { getStyleOpts } from '@/services/helper';

export const hashtags = ['stats', 'spatial', 'metrics', 'numbers', 'row', 'apex'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`) — data luôn `data[0]`
// duy nhất: `meta.badge` là field top-level, còn danh sách stat (nhiều item) nằm NESTED trong
// `stats` (đọc qua Tier 1's `dataKey: 'stats'` + `cards: { col: 3 }` bên dưới).
export const data = [
	{
		meta: { badge: 'APEX STATISTICAL OVERVIEW' },
		stats: [
			{ value: '80+', label: 'UI Components' },
			{ value: '28K+', label: 'Weekly downloads' },
			{ value: '4.9★', label: 'Developer rating' },
			{ value: '100%', label: 'Framework-agnostic' },
		],
	},
];

const baseConfig = {
	tiersCol: [12, 12],
	tiers: [
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [
        // badge pill
				{
					maxWidth: 'fit-content',
          margin: '0 auto',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)',
				},
      ],
			makes: [
				[
          {
						bit: 'meta.badge',
            // badge pill
						opt: {
							mode: 'span',
              prefix: 'ri:bard-fill', iconSize: '1.1rem',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '500', // custom fontWeight
								color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
							},
						},
					},
				],
			],
		},
		[
			{
				// items — đọc từ data[0].stats (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'stats',
				cards: { col: 3 },
				groupCol: [12, 12],
				groupRow: ['auto', 'auto'],
				groupJustify: ['none', 'none'],
				groupStyle: [{}, {}],
        stys: {
          marginTop: '1rem',
          textAlign: 'center'
        },
				makes: [
					[
						{
							bit: 'value',
							opt: {
								mode: 'h2',
								motion: true,
								word: false,
								effect: 'slideUp',
								stys: {
									margin: '0',
								},
							},
						},
					],
					[
						{
							bit: 'label',
							opt: {
								mode: 'span',
								stys: {
									fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								},
							},
						},
					],
				],
			},
		],
	],

	bg: {
		...getStyleOpts({ rounded: '0', gradient: false }),
	},

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
