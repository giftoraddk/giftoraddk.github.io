export const hashtags = ['process', 'modern', 'timeline', 'steps'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: subtitle/title là field top-level, còn danh sách
// step (nhiều item, độ dài co giãn) nằm NESTED trong `steps` (tên field khớp tên tier marker
// `steps` mà web-board dùng, xem Tier 1's `dataKey: 'steps'` bên dưới).
export const data = [
	{
		subtitle: 'PROCESS',
		title: 'A better way to work from start to ship',
		steps: [
			{ id: 'plan', title: 'Plan', icon: 'ri:file-list-3-line', content: 'Map your work and set clear priorities.' },
			{ id: 'build', title: 'Build', icon: 'ri:code-s-slash-line', content: 'Collaborate and build with your team.' },
			{ id: 'test', title: 'Test', icon: 'ri:test-tube-line', content: 'Ensure quality with automated testing.' },
			{ id: 'deploy', title: 'Deploy', icon: 'ri:rocket-line', content: 'Ship with confidence every time.' },
		],
	},
];

// Layout:
//  tiersCol: [12,  [12]]
//  Tier 0 (object, col-12) → intro tĩnh: badge + heading
//  Tier 1 (array,  col-12) → web-steps: timeline header + slot content per step

const baseConfig = {
	tiersCol: [12, [12]],

	tiers: [
		// ── Tier 0: Intro heading (static) ────────────────────────────────────
		{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{ flexDirection: 'column', gap: '0.5rem' }],
			makes: [
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '600', // custom fontWeight
								letterSpacing: '0.12em', // custom letterSpacing
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
              effect: 'driftIn',
							stys: {
								margin: '0',
							},
						},
					},
				],
			],
		},

		// ── Tier 1: Steps (array, col-12) ─────────────────────────────────────
		// tier[0].steps → kích hoạt steps mode trong _renderTiers → render <web-steps>
		// idField, labelField, iconField → _comNavItems xây steps[]; active → step mặc định
		// groupKey / makes → slot content cho từng step panel
		[
			{
				// items — đọc từ data[0].steps (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'steps',
				steps: {
					idField: 'id',
					labelField: 'title',
					iconField: 'icon', // trực tiếp item.icon (không hỗ trợ dot-path)
					active: 'plan',
				},

				// slot content: chỉ description — title đã hiển thị qua step-label của <web-steps>
				// (labelField: 'title' phía trên), lặp lại 'title' ở đây từng gây dư title khi
				// web-steps chuyển vertical (label + slot đứng sát nhau, xem web-steps.js _forceVertical).
				groupCol: [12],
				groupRow: ['auto'],
				groupJustify: ['none'],
				groupStyle: [{ flexDirection: 'column', gap: '0.25rem', padding: '0.5rem 0' }],
				makes: [
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									lineHeight: '1.65', // custom lineHeight
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
