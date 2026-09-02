import { getStyleOpts } from '@/services/helper';

export const hashtags = ['hero', 'spatial', 'centered', 'badge', 'avatar', 'cta'];

// subtitle/title/description/meta.* theo chuẩn docs/SCHEMA.rst `records` — sửa qua svc-admin
// (dataTable="sectionItems", schema chung records.js) sẽ đổi trực tiếp nội dung dưới đây
// (avatar ảnh vẫn tĩnh — flourish trang trí của template, không phải content).
export const data = [
	{
		subtitle: 'TRANSFORMING DIGITAL EXPERIENCES WITH APEX',
		title: 'Build interfaces that\nwork everywhere',
		description: 'Drop Apex into any stack — React, Vue, Angular, Svelte, or plain HTML. Theme with CSS variables, compose with JSON config, and ship beautiful UIs in hours — not weeks.',
		meta: {
			titleHighlight: 'natively.',
			ctaPrimary: 'Get Started Free',
			ctaSecondary: 'Explore Components',
			socialProof: 'Trusted by 10,000+ developers',
		},
	},
];

// Layout (12-col, single tier):
//   Group 0 │ announcement badge pill        centered │
//   Group 1 │ h1 headline (2 lines)          centered │
//   Group 2 │ subtitle paragraph             centered │
//   Group 3 │ CTA button pair               centered │
//   Group 4 │ avatar stack + social proof   centered │

const baseConfig = {
	tiersCol: ['12'],
	tiersRow: ['auto'],

	tiers: [
		// Array = tier động, render đúng 1 lần vì `data` chỉ có 1 phần tử (xem
		// docs/web-board.rst § Tiers mode) — badge/headline/subtitle/CTA đều data-bound
		// (title đã dùng nên phần "natively." + CTA/social-proof nằm ở meta.*), avatar ảnh
		// vẫn bitLocal (flourish trang trí, không phải content).
		[{
			groupCol:     ['12', '12', '12', '12', '12'],
			groupRow:     ['auto', 'auto', 'auto', 'auto', 'auto'],
			groupJustify: ['center', 'center', 'center', 'center', 'center'],
			groupStyle: [
				// Group 0: badge pill
				{
          maxWidth: 'fit-content',
					margin: '0 auto',
					padding: '0 0.5rem',
					borderRadius: '2rem',
					border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
					background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
					backdropFilter: 'blur(8px)'
				},
				// Group 1: headline
				{
					flexDirection: 'column', alignItems: 'center', gap: '0',
					textAlign: 'center', maxWidth: '54rem', margin: '0 auto',
					padding: '1.5rem 1rem 0',
				},
				// Group 2: subtitle
				{
					alignItems: 'center', textAlign: 'center',
					maxWidth: '40rem', margin: '0 auto', padding: '1.25rem 1rem 0',
				},
				// Group 3: CTA buttons
				{ gap: '0.875rem', padding: '2.25rem 0 0' },
				// Group 4: avatar stack + social proof
				{ alignItems: 'center', padding: '2.5rem 0 0' },
			],
			makes: [
				// Group 0: badge — "New" chip + text
				[
					{
						bit: 'subtitle',
						opt: {
							mode: 'span',
              prefix: 'ri:bard-fill', iconSize: '1.1rem',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '500', // custom fontWeight
								color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
							},
						},
					},
				],

				// Group 1: headline
				[
					{
						bit: 'title',
						opt: {
							mode: 'h1', motion: true, word: true, effect: 'focusIn',
							stys: {
								fontSize: 'clamp(3rem, 6vw, 5.5rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								lineHeight: '1.06', // custom lineHeight
								letterSpacing: '-0.03em', // custom letterSpacing
								textAlign: 'center',
								whiteSpace: 'pre-line', // custom whiteSpace
								margin: '0',
							},
						},
					},
					{
						bit: 'meta.titleHighlight',
						opt: {
							mode: 'h1', motion: true, word: false, effect: 'fallDown',
							stys: {
								fontSize: 'clamp(3rem, 6vw, 5.5rem)', // custom fontSize
								fontWeight: '800', // custom fontWeight
								lineHeight: '1.06', // custom lineHeight
								letterSpacing: '-0.03em', // custom letterSpacing
								textAlign: 'center',
								margin: '0', color: 'var(--color-primary)',
							},
						},
					},
				],

				// Group 2: subtitle
				[
					{
						bit: 'description',
						opt: {
							mode: 'p',
							stys: {
								fontSize: 'clamp(1rem, 1.4vw, 1.125rem)', // custom fontSize
								lineHeight: '1.7', // custom lineHeight
								textAlign: 'center', margin: '0',
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
							},
						},
					},
				],

				// Group 3: CTA buttons
				[
					{
						bit: 'meta.ctaPrimary',
						opt: {
							mode: 'button', type: 'fill', ui: 'modern', color: 'primary',
							height: '52px', rounded: '9999px',
							stys: { fontWeight: '700', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', padding: '0 2rem' },
						},
					},
					{
						bit: 'meta.ctaSecondary',
						opt: {
							mode: 'button', type: 'outline',
							height: '52px', rounded: '9999px',
							stys: {
								fontWeight: '600', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', padding: '0 2rem',
								color: 'var(--color-base-content)',
								borderColor: 'color-mix(in oklab, var(--color-base-content) 25%, transparent)',
							},
						},
					},
				],

				// Group 4: avatar stack + social proof
				[
					{
						bitLocal: 'https://i.pravatar.cc/40?img=5',
						opt: {
							mode: 'gallery',
							stys: {
								width: '2.25rem', height: '2.25rem', borderRadius: '50%',
								objectFit: 'cover', display: 'block',
								border: '2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)',
								flexShrink: '0',
							},
						},
					},
					{
						bitLocal: 'https://i.pravatar.cc/40?img=12',
						opt: {
							mode: 'gallery',
							stys: {
								width: '2.25rem', height: '2.25rem', borderRadius: '50%',
								objectFit: 'cover', display: 'block',
								border: '2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)',
								marginLeft: '-0.75rem', flexShrink: '0',
							},
						},
					},
					{
						bitLocal: 'https://i.pravatar.cc/40?img=25',
						opt: {
							mode: 'gallery',
							stys: {
								width: '2.25rem', height: '2.25rem', borderRadius: '50%',
								objectFit: 'cover', display: 'block',
								border: '2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)',
								marginLeft: '-0.75rem', flexShrink: '0',
							},
						},
					},
					{
						bitLocal: 'https://i.pravatar.cc/40?img=35',
						opt: {
							mode: 'gallery',
							stys: {
								width: '2.25rem', height: '2.25rem', borderRadius: '50%',
								objectFit: 'cover', display: 'block',
								border: '2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)',
								marginLeft: '-0.75rem', flexShrink: '0',
							},
						},
					},
					{
						bitLocal: 'https://i.pravatar.cc/40?img=47',
						opt: {
							mode: 'gallery',
							stys: {
								width: '2.25rem', height: '2.25rem', borderRadius: '50%',
								objectFit: 'cover', display: 'block',
								border: '2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)',
								marginLeft: '-0.75rem', flexShrink: '0',
							},
						},
					},
					{
						bit: 'meta.socialProof',
						opt: {
							mode: 'span',
							stys: {
								fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
								fontWeight: '500', // custom fontWeight
								color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
								marginLeft: '0.875rem',
							},
						},
					},
				],
			]
		}],
	],

	bg: {
    // ...getStyleOpts({ rounded: '0', tint: '#34ace0', total: 4, blobType: 'circleOverlap', blobMove: 'swap', deg: 0 }),
		...getStyleOpts({ rounded: '0', hueCustom: 0 }),
	},

	stys: { padding: '4rem 1rem' },
};

export const config = { ...baseConfig };
