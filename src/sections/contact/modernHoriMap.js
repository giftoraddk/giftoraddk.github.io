export const hashtags = ['contact', 'modern', 'hori', 'map', 'icon', 'link'];

// subtitle/title/description theo chuẩn docs/SCHEMA.rst `records` cho Tier 0 (Intro);
// meta.address/meta.phone/meta.email cho Tier 2 (Contact info — CHỈ field trong meta, không
// dùng field top-level nào) — sửa qua svc-admin (dataTable="sectionItems", schema chung
// records.js) sẽ đổi trực tiếp cả 2 tier dưới đây (map vẫn tĩnh — flourish trang trí).
// meta.address field kiểu 'location' (records.js) → sửa qua <web-location-map>, lưu dạng
// street~ward~region~country~lat~lng — Tier 2 dùng ext.location:true để hiển thị lại thành
// chuỗi đọc được (xem web-cell.js § humanizeLocation) thay vì hiện nguyên dấu ~. Demo dưới là
// text thường (không có '~') vẫn hiển thị nguyên vẹn, không đổi.
export const data = [
	{
		subtitle: 'CONTACT',
		title: "Let's build something\ngreat together",
		description: "Have questions or want to learn more?\nWe'd love to hear from you.",
		meta: {
			address: '1 Đ. Nguyễn Tất Thành, Xóm Chiếu, Hồ Chí Minh, Việt Nam',
			phone: '+1 (669) 123-4567',
			email: 'hello@apex.com',
		},
	},
];

// Grid layout (12-col):
//  Row 1 │ intro          col-5  │ map  col-7  gi-row-2  │
//  Row 2 │ contact items  col-5  │ map continues          │
//
// Tier 2 (contact items): 3 static groups — each has icon + text/link on same row

const baseConfig = {
	tiersCol: ['5', '7', '5'],
	tiersRow: ['auto', 2, 'auto'],

	tiers: [
		// ── Tier 0: Intro — data-bound (subtitle/title/description), tier động
		// render đúng 1 lần vì `data` chỉ có 1 phần tử (xem docs/web-board.rst § Tiers mode) ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['left'],
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
							mode: 'h3',
              motion: true,
              word: false,
              effect: 'scatterIn',
							stys: {
								fontWeight: '700', // custom fontWeight
								letterSpacing: '-0.02em', // custom letterSpacing
								color: 'var(--color-base-content)',
								margin: '0',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					},
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								lineHeight: '1.65', // custom lineHeight
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								margin: '0',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					},
				],
			],
		}],

		// ── Tier 1: Map thật (web-google-map, col-7) — data-bound (bit: meta.address) nên
		// PHẢI bọc mảng 1 phần tử để đi qua nhánh tier động của web-boxs.js._renderTiers()
		// (tier dạng Object thuần render 1 lần với info={} rỗng — đúng cho tier tĩnh bitLocal,
		// SAI cho tier có bit thật, khiến meta.address luôn undefined và map không hiện). ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['none'],
			groupStyle: [{}],
			stys: { height: '100%' },
			makes: [
				[
          {
						bit: 'meta.address',
						opt: {
							mode: 'google-map',
							zoom: 15,
							rounded: '1rem',
							height: '100%',
							stys: { minHeight: '320px' },
						},
					},
				],
			],
      anime: 'swirl-in-fwd',
		}],

		// ── Tier 2: Contact info — CHỈ field trong meta (meta.address/meta.phone/
		// meta.email, không dùng field top-level nào — title/description đã thuộc Tier 0 Intro
		// ở trên), tier động render đúng 1 lần vì `data` chỉ có 1 phần tử. 3 groups: email │
		// phone │ address.
		[{
			groupCol: ['12', '12', '12'],
			groupRow: ['auto', 'auto', 'auto'],
			groupJustify: ['left', 'left', 'left'],
			groupStyle: [
				{ gap: '0.75rem', alignItems: 'flex-start', padding: '0', flexWrap: 'nowrap' },
				{ gap: '0.75rem', alignItems: 'flex-start', padding: '0', flexWrap: 'nowrap' },
				{ gap: '0.75rem', alignItems: 'flex-start', padding: '0', flexWrap: 'nowrap' },
			],
			makes: [
				// Address (pre-line for 2-line wrapping)
				[
					{
						bitLocal: 'ri:map-pin-2-line',
						opt: {
							mode: 'icon',
							width: '1rem',
							color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
							stys: { flexShrink: '0' },
						},
					},
					{ bit: 'meta.address', ext: { location: true }, opt: { mode: 'a', target: '_blank' } },
				],
				// Phone
				[
					{
						bitLocal: 'ri:phone-line',
						opt: {
							mode: 'icon',
							width: '1rem',
							color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
							stys: { flexShrink: '0' },
						},
					},
					{ bit: 'meta.phone', opt: { mode: 'a', target: '_blank' } },
				],
				// Email (primary link color)
				[
					{
						bitLocal: 'ri:mail-line',
						opt: {
							mode: 'icon',
							width: '1rem',
							color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
							stys: { flexShrink: '0' },
						},
					},
					{ bit: 'meta.email', opt: { mode: 'a', target: '_blank' } },
				],
			],
		}],
	],
	stys: {
		padding: '3rem 0',
	},
};

export const config = { ...baseConfig };
