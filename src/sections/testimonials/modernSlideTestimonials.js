import { getStyleOpts } from '@/services/helper';

export const hashtags = ['gifts', 'modern', 'testimonials', 'slider', 'avatar', 'rating'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: title/description là field top-level của Tier 0, còn danh sách
// testimonial (nhiều item) nằm NESTED trong `slider` (tên field khớp tên tier marker `slider` mà
// Tier 1 dùng, xem Tier 1's `dataKey: 'slider'` bên dưới).
export const data = [
	{
		title: { vi: 'Khách hàng nói gì về chúng tôi', en: 'What our customers say' },
		description: { vi: '"Trải nghiệm mua quà thật dễ dàng và tiện lợi tại Teamo"', en: '"Buying gifts at Teamo is such an easy and convenient experience"' },
		slider: [
			{
				title: 'Tô Nguyễn',
				content: { vi: 'Nhân viên tư vấn rất nhiệt tình, người yêu mình thích quà kiểu này cực.', en: 'The staff were super helpful, and my partner loved this kind of gift.' },
				pics: 'https://i.pravatar.cc/160?img=51',
				score: '5~20',
				meta: { role: { vi: 'NV Văn phòng', en: 'Office worker' } },
			},
			{
				title: 'Tiến Đạt',
				content: { vi: 'Nhân viên tư vấn rất nhiệt tình, người yêu mình thích quà kiểu này cực.', en: 'The staff were super helpful, and my partner loved this kind of gift.' },
				pics: 'https://i.pravatar.cc/160?img=12',
				score: '5~15',
				meta: { role: { vi: 'Sinh viên', en: 'Student' } },
			},
			{
				title: 'Trần Minh Hiếu',
				content: { vi: 'Quà đóng gói siêu cẩn thận, ship xa cũng không sợ móp nát gì bên trong luôn ý.', en: 'The gift was packed with great care — even shipped far away, nothing inside got damaged.' },
				pics: 'https://i.pravatar.cc/160?img=53',
				score: '5~32',
				meta: { role: { vi: 'NV Văn phòng', en: 'Office worker' } },
			},
			{
				title: 'Dũng Bùi',
				content: { vi: 'Mua ở shop lần thứ 4 rồi, quà đẹp mà rất tiện. Chắc chắn sẽ còn quay lại nhiều lần nữa.', en: 'This is my 4th time buying here — beautiful gifts and very convenient. I will definitely come back again.' },
				pics: 'https://i.pravatar.cc/160?img=14',
				score: '5~41',
				meta: { role: { vi: 'Sinh viên', en: 'Student' } },
			},
		],
	},
];

// Layout:
//   Tier 0 │ heading + quote (tĩnh, canh giữa)                       col-12
//   Tier 1 │ slider 4 testimonial card/view — avatar tròn đè lên mép trên  col-12

const baseConfig = {
	tiersCol: ['12', '12'],
	tiersRow:  ['auto', 'auto'],

	tiers: [
		// ── Tier 0: Heading + quote (tĩnh, canh giữa) ─────────────────────────────
		{
			groupCol:     [12],
			groupRow:     ['auto'],
			groupJustify: ['center'],
			groupStyle:   [{ flexDirection: 'column', alignItems: 'center', padding: '0 0 3rem' }],
			makes: [[
				{
					bit: 'title',
					opt: {
						mode: 'h2', motion: true, word: false, effect: 'swingIn',
						stys: {
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', // custom fontSize
							fontWeight: '800', // custom fontWeight
							letterSpacing: '0.02em', // custom letterSpacing
							color: 'var(--color-primary)',
							margin: '0',
							textAlign: 'center',
						},
					},
				},
				{
					bit: 'description',
					opt: {
						mode: 'p',
						stys: {
							fontSize: 'clamp(0.95rem, 1.3vw, 1.125rem)', // custom fontSize
							fontStyle: 'italic', // custom fontStyle
							color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
							margin: '0.75rem 0 0',
							textAlign: 'center',
							maxWidth: '40rem',
						},
					},
				},
			]],
		},

		// ── Tier 1: Testimonial slider — card cũng là slide, avatar đè mép trên ───
		[
			{
				// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
				dataKey: 'slider',
				slider: { nav: false, loop: true, autoplay: 4500, slides: 4, spacing: 24, dots: false },
				groupCol:     ['12', '12', '12', '12'],
				groupRow:     ['auto', 'auto', 'auto', 'auto'],
				groupJustify: ['center', 'center', 'center', 'center'],
				groupStyle: [
					// Group 0: avatar tròn — KHÔNG dùng margin âm để đè lên mép trên: .web-slider-track
					// có overflow:hidden trên viewport nên phần ảnh vượt ra ngoài box sẽ bị cắt mất
					// (đây là nguyên nhân lỗi "cắt mất item"). Avatar nằm gọn trong card, có padding-top riêng.
					{ paddingTop: '1.75rem' },
					// Group 1: tên + vai trò
					{ flexDirection: 'column', gap: '0.15rem', padding: '0.75rem 1.25rem 0', textAlign: 'center' },
					// Group 2: nội dung review
					{ padding: '0.75rem 1.5rem 0', textAlign: 'justify' },
					// Group 3: rating
					{ padding: '1rem 1.25rem 1.5rem' },
				],
				makes: [
					// Avatar tròn, viền trắng
					[
						{
							bit: 'pics',
							opt: {
								mode: 'gallery',
								stys: {
									width: '6rem', height: '6rem', borderRadius: '50%', objectFit: 'cover',
									border: '4px solid var(--color-base-100)',
									boxShadow: 'rgba(0, 0, 0, 0.12) 0px 6px 16px -4px',
								},
							},
						},
					],
					// Tên (đậm) + vai trò (nhỏ, mờ)
					[
						{
							bit: 'title',
							opt: {
								mode: 'h4',
								stys: {
									fontSize: 'clamp(1rem, 1.3vw, 1.125rem)', // custom fontSize
									fontWeight: '700', // custom fontWeight
									color: 'var(--color-base-content)',
									margin: '0',
								},
							},
						},
						{
							bit: 'meta.role',
							opt: {
								mode: 'p',
								stys: {
									fontSize: 'clamp(0.8rem, 1vw, 0.875rem)', // custom fontSize
									color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
									margin: '0',
								},
							},
						},
					],
					// Nội dung review
					[
						{
							bit: 'content',
							opt: {
								mode: 'p',
								stys: {
									fontSize: 'clamp(0.85rem, 1.05vw, 0.95rem)', // custom fontSize
									lineHeight: '1.6', // custom lineHeight
									color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
									margin: '0',
								},
							},
						},
					],
					// Rating
					[
						{
							bit: 'score',
							opt: { mode: 'rating', size: 'sm', disabled: true, color: 'error', mask: 'mask-star-2' },
						},
					],
				],
				stys: {
					background: 'color-mix(in oklab, var(--color-base-100) 70%, transparent)',
          backdropFilter: 'blur(25px)',
					borderRadius: '1.5rem',
					overflow: 'hidden',
					boxShadow: 'rgba(0, 0, 0, 0.08) 0px 14px 32px -12px',
				},
			},
		],
	],

	bg: { ...getStyleOpts({ rounded: '0', gradient: false }) },

	stys: { padding: '3rem 0' },
};

export const config = { ...baseConfig };
