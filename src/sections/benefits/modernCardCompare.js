import { getStyleOpts } from '@/services/helper';

export const hashtags = ['benefits', 'modern', 'compare', 'features', 'vs'];

// subtitle/title/description theo chuẩn hook/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây.
// Heading (Tier 0) + 2 nhãn panel + badge VS (meta.leftPanelTitle/leftPanelLabel/vsBadge/
// rightPanelTitle/rightPanelLabel) vẫn data-bound vào data[0] — cố định, không phải danh sách.
// Danh sách feature mỗi bên GIỜ LÀ MẢNG co giãn `leftCards`/`rightCards` (thay vì field cố định
// leftFeature1..N/rightFeature1..N cũ) — cùng quy ước dataKey như modernCardList.js: tên field
// khớp tên tier marker `cards` dùng để hiển thị nó, mỗi phần tử chỉ cần `{ title }`.
export const data = [
	{
		subtitle: 'THE HONEST COMPARISON',
		title: 'Why Apex?',
		description: 'Most UI frameworks tie you to one stack and slow you down.\nApex drops into any stack and ships beautiful interfaces in hours, not weeks.',
		meta: {
			leftPanelTitle: 'Apex',
			vsBadge: 'VS',
			rightPanelTitle: 'Other Frameworks',
		},
		leftCards: [
			{ title: 'Drop into any stack — React, Vue, Angular, Svelte' },
			{ title: 'Theme with CSS variables — zero config' },
			{ title: 'JSON-driven layout composition' },
			{ title: 'Built-in animation & motion system' },
			{ title: 'Responsive & adaptive out of the box' },
			{ title: 'Ships production UIs in hours, not weeks' },
		],
		rightCards: [
			{ title: 'Locked to a single framework or stack' },
			{ title: 'Complex setup required for every project' },
			{ title: 'Hard-coded layouts, hard to maintain' },
			{ title: 'Need third-party animation libraries' },
			{ title: 'Manual responsive breakpoints everywhere' },
			{ title: 'Weeks of development before shipping anything' },
		],
	},
];

// Grid layout (12-col):
//  Row 1 │ heading                          col-12                                     │
//  Row 2 │ left card (header+list) col-5 │ VS badge col-2 (centered) │ right card col-5 │
//
// Header + danh sách feature của mỗi bên giờ gộp chung 1 tier (mixed tier — xem web-boxs.js
// _renderTiers()), nên chỉ còn 1 hàng thật sự — VS badge không cần row-span nữa, chỉ cần
// canh giữa (tiersStys) để bằng chiều cao ô bên cạnh.

const baseConfig = {
	tiersCol: ['12', '5', '2', '5'],
	tiersRow: ['auto', 'auto', 'auto', 'auto'],
	tiersStys: [
		{},
		{},
		{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		},
		{},
	],

	tiers: [

		// ── Tier 0: Heading (col-12, centered) — data-bound, Array = tier động,
		// render đúng 1 lần vì `data` chỉ có 1 phần tử ──────────────────────────────
		[{
			groupCol:     [12, 12],
			groupRow:     ['auto', 'auto'],
			groupJustify: ['center', 'center'],
			groupStyle: [
				{},
				{ flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '1rem 0 3rem' },
			],
			makes: [
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'span',
							prefix: 'ri:scales-3-line',
							iconSize: '0.875rem',
							stys: {
								fontSize: 'clamp(0.7rem, 1vw, 0.75rem)', // custom fontSize
								fontWeight: '600', // custom fontWeight
								letterSpacing: '0.1em', // custom letterSpacing
								color: 'var(--color-primary)',
								padding: '0.3rem 0.875rem',
								borderRadius: '2rem',
								border: '1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent)',
								background: 'color-mix(in oklab, var(--color-primary) 8%, transparent)',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '0.375rem',
							},
						},
					},
				],
				[
					{
						bit: 'title',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'scatterIn',
							stys: {
								fontStyle: 'italic',
								margin: '0',
							},
						},
					},
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								lineHeight: '1.65', // custom lineHeight
								maxWidth: '32rem',
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
								whiteSpace: 'pre-line', // custom whiteSpace
								textAlign: 'center',
							},
						},
					},
				],
			],
		}],

		// ── Tier 1: Left card — header + danh sách feature gộp chung 1 mixed tier ───
		// (col-5) — sub-config đầu là header tĩnh (render 1 lần), sub-config sau là danh
		// sách co giãn `leftCards` — web-boxs.js _renderTiers() ghép cả 2 vào chung 1 ô,
		// dùng chung `wrapBg` đặt ở sub-config đầu để đọc như 1 card liền mạch duy nhất.
		[
			{
				groupCol:     [12, 12],
				groupRow:     ['auto', 'auto'],
				groupJustify: ['center', 'none'],
				groupStyle: [
					{ justifyContent: 'center', alignItems: 'center', gap: '0.625rem', padding: '1.25rem 1.5rem 0.5rem' },
					{ padding: '0 1.5rem 0.75rem' },
				],
				makes: [
					[
						{ bitLocal: 'ri:bard-fill', opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-primary)' } },
						{ bit: 'meta.leftPanelTitle', opt: { mode: 'span', stys: {
							fontWeight: '700', // custom fontWeight
							letterSpacing: '-0.01em', // custom letterSpacing
							color: 'var(--color-base-content)' } } },
					],
				],
				anime: 'slide-in-blurred-left',
				// wrapBg dùng chung cho CẢ tier (header + list) — web-boxs.js hoist ra ngoài,
				// render đúng 1 lần bao trọn toàn bộ card thay vì lặp lại theo từng sub-config.
				wrapBg: {
					...getStyleOpts({ rounded: '1.25rem', tint: 'var(--color-primary)', total: 1, blobType: 'ellipse', deg: 315 }),
				},
			},
			{
				// items — đọc từ data[0].leftCards, KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'leftCards',
				cards: { col: 12, padding: '1.5rem 0' }, // mỗi feature 1 hàng, xếp chồng đầy đủ chiều rộng col-5 của tier
				groupCol:     [12],
				groupRow:     ['auto'],
				groupJustify: ['left'],
				groupStyle:   [{ flexWrap: 'nowrap', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1.5rem' }],
				makes: [[
					{ bitLocal: 'ri:checkbox-circle-line', opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-primary)', stys: { flexShrink: '0' } } },
					{ bit: 'title', opt: { mode: 'span', stys: { color: 'var(--color-base-content)' } } },
				]],
				anime: 'slide-in-blurred-left',
			},
		],

		// ── Tier 2: VS badge (col-2, cùng hàng với 2 card trái/phải, canh giữa) ─────
		{
			groupCol:     [12],
			groupRow:     ['auto'],
			groupJustify: ['center'],
			groupStyle:   [{ alignItems: 'center', justifyContent: 'center' }],
			makes: [[
				{
					bit: 'meta.vsBadge',
					opt: {
						mode: 'span',
						stys: {
							width: '3rem',
							height: '3rem',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'var(--color-primary)',
							borderRadius: '50%',
							fontWeight: '800', // custom fontWeight
							color: 'var(--color-base-100)',
							letterSpacing: '0.05em', // custom letterSpacing
							flexShrink: '0',
						},
					},
				},
			]],
		},

		// ── Tier 3: Right card — header + danh sách feature gộp chung 1 mixed tier ──
		// (col-5) — cùng cách Tier 1 làm ở phía trái, chỉ đổi icon (close-circle) + màu
		// (color-secondary) và wrapBg tint riêng cho panel "so sánh" bên phải.
		[
			{
				groupCol:     [12, 12],
				groupRow:     ['auto', 'auto'],
				groupJustify: ['center', 'none'],
				groupStyle: [
					{ justifyContent: 'center', alignItems: 'center', gap: '0.625rem', padding: '1.25rem 1.5rem 0.5rem' },
					{ padding: '0 1.5rem 0.75rem' },
				],
				makes: [
					[
						{ bit: 'meta.rightPanelTitle', opt: { mode: 'h3', stys: {
							fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', // custom fontSize
							fontWeight: '800', // custom fontWeight
							color: 'var(--color-base-content)', margin: '0' } } },
					],
				],
				anime: 'slide-in-blurred-right',
				wrapBg: {
					...getStyleOpts({ rounded: '1.25rem', tint: 'var(--color-secondary)', total: 1, blobType: 'ellipse', deg: 45 }),
				},
			},
			{
				dataKey: 'rightCards',
				cards: { col: 12, padding: '1.5rem 0' },
				groupCol:     [12],
				groupRow:     ['auto'],
				groupJustify: ['left'],
				groupStyle:   [{ flexWrap: 'nowrap', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1.5rem' }],
				makes: [[
					{ bitLocal: 'ri:close-circle-line', opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-secondary)', stys: { flexShrink: '0' } } },
					{ bit: 'title', opt: { mode: 'span', stys: { color: 'var(--color-base-content)' } } },
				]],
				anime: 'slide-in-blurred-right',
			},
		],

	],

  bg: {
    ...getStyleOpts({ rounded: '0', tint: 'var(--color-primary)', total: 2, blobType: 'circleOverlap', deg: 0, distance: 100 }),
  },

	stys: {
		padding: '4rem 0',
	},
};

export const config = { ...baseConfig };
