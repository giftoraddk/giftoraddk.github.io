export const hashtags = ['hero', 'spatial', 'video', 'fullbleed', 'overlay', 'apex'];

// subtitle/title/description theo chuẩn hook/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây
// (cue/video vẫn tĩnh — flourish trang trí của template, không phải content).
export const data = [
	{
		subtitle: 'S9TV HUB',
		title: 'Sáng tạo.\nCộng đồng.\nKết nối quốc tế.',
		description: 'Một creative hub kết nối đào tạo, sản xuất và hợp tác quốc tế trong lĩnh vực điện ảnh.',
		meta: { exploreCta: 'KHÁM PHÁ' },
	},
];

// Single full-bleed tier (12-col):
//   Group 0 │ background YouTube embed  (absolute, fills tier, behind everything)
//   Group 1 │ dark gradient overlay + centered label/heading/subtitle + bottom "explore" cue

// Bare URL — svc-player derives the provider/id itself and builds its own
// autoplay/mute/loop/controls params from the opt flags below. A few of the
// old raw-iframe chrome-hiding params (modestbranding, iv_load_policy,
// cc_load_policy) aren't reproducible through svc-player's embed URL builder;
// they're also long-deprecated/no-op on YouTube's current player, so nothing
// user-visible is lost.
const VIDEO_URL = 'https://www.youtube.com/watch?v=itQQCkA87Hs';

const baseConfig = {
	tiersCol: ['12'],
	tiersRow: ['auto'],

	tiers: [
		// Array = tier động, render đúng 1 lần vì `data` chỉ có 1 phần tử (xem
		// hook/web-board.rst § Tiers mode) — subtitle/heading/description data-bound.
		[{
			groupCol: ['12', '12'],
			groupRow: ['auto', 'auto'],
			groupJustify: ['none', 'center'],
			groupStyle: [
				// Group 0: video background — absolute, fills the tier
				{
					position: 'absolute',
					inset: '0',
					zIndex: '0',
					overflow: 'hidden',
				},
				// Group 1: overlay — also absolute/inset:0 (NOT in-flow) so it exactly
				// matches group 0's fixed height instead of adding its own height on
				// top of it, which was pushing the video down and leaving a blank
				// gap above it.
				{
					position: 'absolute',
					inset: '0',
					zIndex: '1',
					height: '100%',
					flexDirection: 'column',
					alignItems: 'center',
					gap: '1.25rem',
					textAlign: 'center',
					padding: '0 1.5rem',
					background:
						'linear-gradient(180deg, color-mix(in oklab, var(--color-base-300) 35%, transparent) 0%, color-mix(in oklab, var(--color-base-300) 75%, transparent) 100%)',
				},
			],
			makes: [
				// Group 0: background video
				[
					{
						bitLocal: VIDEO_URL,
						opt: {
							mode: 'player',
							fill: true,
							autoPlay: true,
							mute: true,
							loops: true,
							control: false,
						},
					},
				],
				// Group 1: label + heading + subtitle + bottom "explore" cue
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(0.7rem, 1vw, 0.75rem)', // custom fontSize
								textTransform: 'uppercase',
								letterSpacing: '0.25em', // custom letterSpacing
								fontWeight: '600', // custom fontWeight
								margin: '0',
								color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
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
								fontSize: 'clamp(3rem, 6vw, 5.5rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								lineHeight: '1.2', // custom lineHeight
								whiteSpace: 'pre-line', // custom whiteSpace
								margin: '0',
								color: 'var(--color-base-content)',
							},
						},
					},
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', // custom fontSize
								maxWidth: '32rem',
								margin: '0.5rem 0 0',
								color: 'color-mix(in oklab, var(--color-base-content) 75%, transparent)',
							},
						},
					},
					{
						bit: 'meta.exploreCta',
						opt: {
							mode: 'span',
							stys: {
								position: 'absolute',
								bottom: '10%',
								left: '50%',
								transform: 'translateX(-50%)',
								fontSize: 'clamp(0.65rem, 0.8vw, 0.75rem)', // custom fontSize
								letterSpacing: '0.2em', // custom letterSpacing
								fontWeight: '600', // custom fontWeight
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
							},
						},
					},
					{
						bitLocal: '',
						opt: {
							mode: 'span',
							stys: {
								position: 'absolute',
								bottom: '2rem',
								left: '50%',
								transform: 'translateX(-50%)',
								display: 'block',
								width: '1px',
								height: '1.5rem',
								background: 'color-mix(in oklab, var(--color-base-content) 40%, transparent)',
							},
						},
					},
				],
			],
			// Explicit height (not just minHeight/auto) — group 0 & group 1 both use
			// position:absolute + inset:0, which stretch to fill this exact height.
			// Without a definite height here they'd have nothing to stretch against.
			stys: { position: 'relative', overflow: 'hidden', height: '100vh' },
		}],
	],

	stys: { padding: '0' },
};

export const config = { ...baseConfig };
