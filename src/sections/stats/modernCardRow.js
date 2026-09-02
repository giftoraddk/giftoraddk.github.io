export const hashtags = ['stats', 'modern', 'metrics', 'numbers', 'row'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`) — data luôn `data[0]`
// duy nhất: `subtitle` là field top-level, còn danh sách stat (nhiều item) nằm NESTED trong
// `stats` (đọc qua Tier 1's `dataKey: 'stats'` + `cards: { col: 3 }` bên dưới).
export const data = [
	{
		subtitle: 'TRUSTED BY HIGH PERFORMING TEAMS',
		stats: [
			{ value: '10K+', label: 'Active teams' },
			{ value: '2.3M+', label: 'Projects delivered' },
			{ value: '99.99%', label: 'Uptime SLA' },
			{ value: '40%', label: 'Faster time to market' },
		],
	},
];

// config
const baseConfig = {
	tiersCol: [12, 12],
	tiers: [
		{
			// intro
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{}],
			makes: [
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								letterSpacing: '0.12em', // custom letterSpacing
								fontWeight: '600', // custom fontWeight
								textTransform: 'uppercase',
								color: 'color-mix(in oklab, var(--color-base-content) 45%, transparent)',
								margin: '0',
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
				groupStyle: [{ padding: '0 0 0.375rem' }, {}],
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
	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
