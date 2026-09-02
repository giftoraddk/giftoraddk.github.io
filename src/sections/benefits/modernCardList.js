export const hashtags = ['benefits', 'modern', 'checklist', 'list', 'features'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/title/description là field top-level theo chuẩn
// docs/SCHEMA.rst `records`, còn danh sách checklist (nhiều item, độ dài co giãn) nằm NESTED
// trong `cards` (tên field khớp tên tier marker `cards`/`masonry`/`slider`/`steps`/`tabs`/
// `expansion` mà web-board dùng, xem Tier 1's `dataKey: 'cards'` bên dưới — quy ước: field nào
// là mảng object thì đặt tên theo đúng render mode dùng để hiển thị nó, giúp nhìn `data` là biết
// ngay đâu là dữ liệu 1 và đâu là dữ liệu nhiều). Mỗi phần tử `cards[i]` chỉ cần `title` — không
// phải 1 record thật nên không theo schema records.js, tự do đặt field theo nhu cầu template.
export const data = [
	{
		subtitle: 'BENEFITS',
		title: 'Built for speed.\nDesigned for scale.',
		description: 'From early-stage startups to global teams, Nexora adapts to the way you work.',
		cards: [
			{ title: 'Reduce cycle time' },
			{ title: 'Improve code quality' },
			{ title: 'Increase deployment frequency' },
			{ title: 'Empower high-performing teams' },
		],
	},
];

const baseConfig = {
	tiersCol: [12, 12],
	tiers: [
		{
			// intro
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [
				{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
				},
			],
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
					{
						bit: 'title',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'blurIn',
							stys: {
								margin: '0',
							},
						},
					},
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
							},
						},
					},
				],
			],
		},
		[
			{
				// items — đọc từ data[0].cards (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'cards',
				groupCol: [12],
				groupRow: ['auto'],
				groupJustify: ['none'],
				groupStyle: [
					{
						display: 'flex',
            flexWrap: 'nowrap',
						alignItems: 'start',
						gap: '0.5rem',
					},
				],
				makes: [
					[
						{
							bitLocal: 'ri:checkbox-circle-fill',
							opt: {
								mode: 'icon',
								width: '1.25rem',
								color: 'var(--color-primary)',
								stys: { flexShrink: '0' },
							},
						},
						{
							bit: 'title',
							opt: {
								mode: 'span',
								stys: {
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
									margin: '0',
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
