// FAQ accordion nhúng thẳng vào trang chi tiết sản phẩm (src/pages/product/[slug].astro) —
// chỉ config, KHÔNG có `tiers`/heading riêng như sections/faq/spatialExpansionApex.js (section
// đó tự vẽ badge+heading cho 1 trang FAQ độc lập). `config.expansion` ở top-level là điều kiện
// đủ để web-boxs render thẳng accordion (_renderExpansion, xem web-boxs.js) mà không cần đi qua
// web-board/tiers. Data truyền vào là `product.meta.faq` — mảng {q, a} do người bán tự nhập,
// KHÔNG bịa câu hỏi mặc định khi field này rỗng (caller chỉ render <web-boxs> khi có data thật).
export const hashtags = ['faq', 'product', 'expansion', 'seo', 'geo'];

const baseConfig = {
	expansion: { labelField: 'q', openFirst: false, multiple: false },
	groupCol: [12],
	groupRow: ['auto'],
	groupJustify: ['none'],
	groupStyle: [{ padding: '0.375rem 1.25rem 1rem' }],
	makes: [
		[
			{
				bit: 'a',
				opt: {
					mode: 'p',
					stys: {
						lineHeight: '1.75',
						color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
						margin: '0',
					},
				},
			},
		],
	],
	stys: {},
};

export const config = { ...baseConfig };
