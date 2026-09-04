export const hashtags = ['contact', 'modern', 'hori', 'map', 'google-map', 'simple'];

// subtitle/title/description theo chuẩn hook/SCHEMA.rst `records` cho Tier 0 (Intro).
// meta.address cho Tier 1 (Map) — 1 field DUY NHẤT vừa hiển thị địa chỉ vừa cho toạ độ map:
// field kiểu 'location' trong records.js (schema chung) → sửa qua svc-admin hiện
// <web-location-map>, lưu dạng street~ward~region~country~lat~lng (cùng format
// rooms.location) — web-cell.js (mode: 'google-map') tự tách địa chỉ người-đọc-được +
// lat/lng từ field này (xem humanizeLocation/locationLatLng). Không có '~' (text thường,
// vd demo dưới) vẫn hoạt động — web-google-map tự fallback geocode qua Google.
// Đơn giản hơn modernHoriMap.js — KHÔNG có tier contact info (email/phone/address icon-link),
// chỉ intro + map thật (không còn tĩnh).
export const data = [
	{
		title: "Let's build something\ngreat together",
		description: "Have questions or want to learn more?\nWe'd love to hear from you.",
		meta: {
			address: '1 Đ. Nguyễn Tất Thành, Xóm Chiếu, Hồ Chí Minh, Việt Nam',
		},
	},
];

// Grid layout (12-col):
//  Row 1 │ intro col-12 │ map col-12 │

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Intro — data-bound (subtitle/title/description), tier động
		// render đúng 1 lần vì `data` chỉ có 1 phần tử (xem hook/web-board.rst § Tiers mode) ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['left'],
			groupStyle: [{ flexDirection: 'column', gap: '0.5rem' }],
			makes: [
				[
					{
						bit: 'title',
						opt: {
							mode: 'h1',
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
						bit: 'description',
						opt: {
							mode: 'h2',
							motion: true,
							word: false,
							effect: 'scatterIn',
							stys: {
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', // custom fontSize
								color: 'var(--color-base-content)',
								margin: '0',
								whiteSpace: 'pre-line', // custom whiteSpace
							},
						},
					}
				],
			],
		}],

		// ── Tier 1: Map thật (web-google-map, col-7) — data-bound (bit: meta.address) nên
		// PHẢI bọc mảng 1 phần tử để đi qua nhánh tier động của web-boxs.js._renderTiers()
		// (tier dạng Object thuần render 1 lần với info={} rỗng — đúng cho tier tĩnh bitLocal
		// như bản placeholder cũ, SAI cho tier có bit thật) ──
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
	],
	stys: {
		padding: '0',
	},
};

export const config = { ...baseConfig };
