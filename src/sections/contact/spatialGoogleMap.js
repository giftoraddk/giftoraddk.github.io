import { getStyleOpts } from '@/services/helper';

export const hashtags = ['contact', 'spatial', 'hori', 'map', 'google-map', 'simple'];

// subtitle/title/description theo chuẩn docs/SCHEMA.rst `records` cho Tier 1 (Intro).
// meta.address cho Tier 0 (Map) — 1 field DUY NHẤT vừa hiển thị địa chỉ vừa cho toạ độ map:
// field kiểu 'location' trong records.js (schema chung) → sửa qua svc-admin hiện
// <web-location-map>, lưu dạng street~ward~region~country~lat~lng (cùng format
// rooms.location) — web-cell.js (mode: 'google-map') tự tách địa chỉ người-đọc-được +
// lat/lng từ field này (xem humanizeLocation/locationLatLng). Không có '~' (text thường,
// vd demo dưới) vẫn hoạt động — web-google-map tự fallback geocode qua Google.
// Đơn giản hơn spatialHoriMap.js — KHÔNG có tier contact info (email/phone/address icon-link),
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
//  Row 1 │ map col-12 │ intro col-12 │

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow: ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Map thật (web-google-map) — data-bound (bit: meta.address) nên PHẢI bọc
		// mảng 1 phần tử để đi qua nhánh tier động của web-boxs.js._renderTiers() (tier dạng
		// Object thuần render 1 lần với info={} rỗng — đúng cho tier tĩnh bitLocal như bản
		// placeholder cũ, SAI cho tier có bit thật) ──
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

		// ── Tier 1: Intro — data-bound (subtitle/title/description), tier động
		// render đúng 1 lần vì `data` chỉ có 1 phần tử (xem docs/web-board.rst § Tiers mode) ──
		[{
			groupCol: [12],
			groupRow: ['auto'],
			groupJustify: ['left'],
			groupStyle: [{ flexDirection: 'column', gap: '0.5rem', padding: '0 1.5rem 1.5rem' }],
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
	],

	bg: {
		...getStyleOpts({ rounded: '1rem', tint: '#a77ceb', total: 1, blobType: 'circleOverlap', deg: 180 }),
	},

	stys: {
		padding: '0',
		columnGap: '1.5rem !important'
	},
};

export const config = { ...baseConfig };
