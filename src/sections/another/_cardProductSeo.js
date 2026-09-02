import { getStyleOpts } from '@/services/helper';

// Card config cho trang GEO/SEO của products (src/pages/product/index.astro,
// src/pages/product/[slug].astro) — cùng khung với _cardPost.js (post pages) nhưng dùng field
// products THẬT (pics/title/tags/score/pricing, xem docs/SCHEMA.rst) thay vì field bịa
// (meta.badge/meta.oldPrice như _cardProductNeat.js) — trang này phải render đúng dữ liệu Firestore
// thật, không phải mockup.
export const hashtags = ['products', 'modern', 'seo', 'geo', 'card', 'ecommerce'];

export const data = [
	{
		id: 1, status: 'active', mode: 'product',
		title: 'Hộp quà tặng sinh nhật',
		pics: 'https://i.ibb.co/21HNHKW8/shoes.jpg',
		tags: 'gift|birthday',
		score: '4.8~32',
		pricing: '299000~180000~hộp',
		meta: { url: '#', ctaLabel: 'Xem chi tiết' },
	},
];

const baseConfig = {
	groupCol: [12, 12, 12, 12],
	groupRow: ['auto', 'auto', 'auto', 'auto'],
	groupJustify: ['none', 'none', 'between', 'none'],
	groupStyle: [
		{ position: 'relative', marginBottom: '1rem' }, // Ảnh
		{ padding: '0 1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }, // Tags
		{ padding: '0 1rem 0.5rem', display: 'flex', alignItems: 'center' }, // Title + giá
		{}, // CTA
	],
	makes: [
		// Ảnh — click thẳng vào detail page (meta.url = /product/{slug}, xem productSlug())
		[
			{
				bit: 'pics',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'gallery',
					rounded: '1.25rem 1.25rem 0 0',
					stys: { width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' },
				},
			},
			{
				bit: 'score',
				opt: {
					mode: 'rating', size: 'xs', disabled: true, color: 'warning', mask: 'mask-star-2',
					stys: {
						position: 'absolute', bottom: '0.75rem', left: '0.75rem',
						background: 'color-mix(in oklab, var(--color-base-100) 80%, transparent)',
						padding: '0.15rem 0.5rem 0.25rem', borderRadius: '999px',
					},
				},
			},
		],
		// Tags
		[
			{ bit: 'tags', opt: { mode: 'tags', type: 'soft', color: 'primary' } },
		],
		// Title + giá
		[
			{ bit: 'title', opt: { mode: 'p', stys: { color: 'var(--color-base-content)', margin: '0', fontWeight: '600' } } },
			{ bit: 'pricing', ext: { currency: 'đ' }, opt: { mode: 'span', stys: { color: 'var(--color-primary)', fontWeight: '700' } } },
		],
		// CTA — link thẳng detail page
		[
			{
				bit: 'meta.ctaLabel',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'a',
					stys: {
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						width: '100%', height: '48px', borderRadius: '0 0 1.25rem 1.25rem',
						background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
						color: 'var(--color-base-content)',
					},
				},
			},
		],
	],
	stys: {},
  bg: {
		...getStyleOpts({ rounded: '1.5rem', tint: '#e19d69', total: 2, gradient: true, blobType: 'ellipse', deg: 0 })
	},
};

export const config = { ...baseConfig };
