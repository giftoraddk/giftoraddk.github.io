export const hashtags = ['hero', 'spatial', 'horizontal', 'split', 'cta'];

// subtitle/title/description/pics theo chuẩn docs/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây.
export const data = [
	{
		subtitle: 'DESIGNED FOR TEAMS WHO BUILD',
		title: 'Software that\nmoves faster',
		description: 'Nexora helps development teams plan, build, and ship better software with confidence.',
		pics: 'https://placehold.co/600x400/8B8680/ddd',
		meta: { ctaPrimary: 'Start free trial', ctaSecondary: 'Book a demo' },
	},
];

const baseConfig = {
	tiersCol: ['7', '5', '7'], // intro=7col | image=5col | actions=7col
	tiersRow: ['auto', '2', 'auto'], // intro spans 2 rows; image and actions each auto

	tiers: [
		// ── Tier 0: Intro (badge tĩnh, title/content theo data[0]) — Array = tier động,
		// render đúng 1 lần vì `data` chỉ có 1 phần tử (xem docs/web-board.rst § Tiers mode) ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['center'],
			groupStyle: [{ flexDirection: 'column', gap: '1.25rem', paddingRight: '1.5rem' }],
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
							mode: 'h1',
							motion: true,
							word: true,
							effect: 'focusIn',
							stys: {
								whiteSpace: 'pre-line', // custom whiteSpace
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
		}],

		// ── Tier 1: Image (col-5, row 1) — data-bound `pics`, tier động cùng lý do trên ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ overflow: 'hidden' }],
			makes: [
				[
					{
						bit: 'pics',
						opt: {
							mode: 'gallery',
							stys: {
								width: '100%',
								maxHeight: '320px',
								objectFit: 'contain',
								display: 'block',
							},
						},
					},
				],
			],
      anime: 'tilt-in-tr',
		}],

		// ── Tier 2: Actions / CTA buttons (col-7, row 2) ──────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ gap: '0.75rem' }],
			makes: [
				[
					{
						bit: 'meta.ctaPrimary',
						opt: {
							mode: 'button',
							type: 'fill',
							color: 'primary',
							height: '45px',
							rounded: '8px',
							stys: { fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', padding: '0 1.5rem' },
						},
					},
					{
						bit: 'meta.ctaSecondary',
						opt: {
							mode: 'button',
							type: 'outline',
							height: '45px',
							rounded: '8px',
							stys: {
								fontWeight: '600',
								fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
								padding: '0 1.5rem',
								color: 'var(--color-base-content)',
								borderColor: 'color-mix(in oklab, var(--color-base-content) 22%, transparent)',
							},
						},
					},
				],
			],
		},
	],

	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
