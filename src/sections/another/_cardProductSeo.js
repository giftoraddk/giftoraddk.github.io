import { getStyleOpts } from '@/services/helper';

// Card config cho trang GEO/SEO của products (src/pages/product/index.astro,
// src/pages/product/[slug].astro) — style mượn từ products/cardBase.js (backdrop polygon sau ảnh,
// popover mô tả, title+rating cùng hàng, giá+nút cùng hàng, ui:'spatial' + anime 'bounce-in-left')
// nhưng field vẫn bám THẬT dữ liệu Firestore products (pics/title/tags/score/pricing/description,
// xem hook/SCHEMA.rst), không phải field bịa như _cardProductNeat.js. Điều hướng dùng
// meta.url/meta.ctaLabel (route GEO/SEO riêng của domain này) thay vì `/product/{id}` cứng của
// cardBase (context menu quán) — vẫn giữ nguyên khác biệt này, chỉ đổi PHẦN NHÌN cho đồng bộ.
export const hashtags = ['products', 'modern', 'seo', 'geo', 'card', 'ecommerce'];

export const data = [
	{
		id: 1, status: 'active', mode: 'product',
		title: 'Hộp quà tặng sinh nhật',
		description: 'Set quà tặng trang trí sẵn, giao nhanh trong ngày.',
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
	groupJustify: ['none', 'left', 'left', 'between'],
	groupStyle: [
		{ overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' },
		{ marginBottom: '0' },
		{ marginBottom: '0.75rem', gap: '0.5rem' },
		{ marginBottom: '0' },
	],
	makes: [
		// Ảnh — backdrop polygon + ảnh contain giữa khung (giống cardBase), popover mô tả góc phải
		[
			{
				bitLocal: '',
				opt: {
					mode: 'span',
					stys: {
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						position: 'absolute',
						width: '75%',
						aspectRatio: '1/1',
						background: 'var(--color-primary)',
						clipPath: 'ellipse(50% 40% at 50% 100%)',
						zIndex: '0',
					},
				},
			},
			{
				bit: 'pics',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'gallery',
					stys: { width: '60%', margin: '0 auto', objectFit: 'contain', position: 'relative', zIndex: '1' },
				},
			},
			{
				bit: 'description',
				opt: {
					mode: 'popover', icon: 'ri:information-line', ui: 'spatial',
					placement: 'bottom-end', iconSize: '1.25rem',
					stys: { position: 'absolute', top: '0', right: '0', zIndex: '2' },
				},
			},
		],
		// Title + rating — click title đi thẳng meta.url (KHÔNG phải /product/{id} như cardBase)
		[
			{
				bit: 'title',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'a',
					stys: {
						display: 'block',
						fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
						fontWeight: '400',
						color: 'var(--color-base-description)',
						lineHeight: '1.1',
						margin: '0',
					},
				},
			},
			{
				bit: 'score',
				opt: { mode: 'rating', size: 'xs', disabled: true, color: 'primary', mask: 'mask-star-2' },
			},
		],
		// Tags
		[
			{ bit: 'tags', opt: { mode: 'tags' } },
		],
		// Giá + CTA — nút điều hướng meta.url/meta.ctaLabel (trang chỉ dẫn tới detail, KHÔNG phải
		// add-to-cart như cardBase, trang GEO/SEO không có giỏ hàng).
		[
			{
				bit: 'pricing',
				ext: { currency: 'đ' },
				opt: {
					mode: 'span',
					stys: {
						fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
						fontWeight: '900',
						color: 'var(--color-base-description)',
					},
				},
			},
			{
				bit: 'meta.ctaLabel',
				ext: { org: 'meta.url' },
				opt: {
					mode: 'a',
					suffix: 'ri:arrow-right-s-line',
					iconSize: '1rem',
					stys: {
						height: '40px',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						padding: '0 1rem', borderRadius: '12px',
						background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
						color: 'var(--color-primary)',
						fontWeight: '600',
					},
				},
			},
		],
	],
	stys: { padding: '1.75rem', height: '100%' },
	bg: {
		...getStyleOpts({ rounded: '1.75rem', tint: 'var(--color-primary)', total: 1 })
	},
	anime: 'bounce-in-left',
	ui: 'spatial',
};

export const config = { ...baseConfig };
