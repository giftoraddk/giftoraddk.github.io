// SEO dùng chung cho src/pages/gift/** — nội dung tiếng Việt, mọi trang đều index (khác landing demo).
// Outline/JSON-LD dựng bằng boardPageSeo() (packages/apex/tool/board-seo.js); file này chỉ giữ phần
// riêng của gift: ngôn ngữ, mốc breadcrumb gốc, và dữ liệu sản phẩm lúc build cho section `dataTable`.
import { fetchCollection } from '@/services/core/fetcher.server.js';
import { productSlug } from '@/services/tools/util';
import { site } from '@/services/tools/site';

export const GIFT_LANG = 'vi';

// Mốc đầu breadcrumb của mọi trang /gift/*
export const GIFT_HOME = { name: site.subtitle, path: '/gift/' };

/**
 * Sản phẩm active lúc build (fetchCollection có build-cache, sitemap/llms dùng chung 1 lần fetch) kèm
 * meta.url = trang chi tiết — cùng URL mà product/[slug].astro build ra, để outline/ItemList link đúng.
 */
export async function productRows() {
	const products = await fetchCollection('products');
	const metaOf = (p) => (p.meta && typeof p.meta === 'object' ? p.meta : {});
	return products.map((p) => ({ ...p, meta: { ...metaOf(p), url: `/product/${productSlug(p)}/` } }));
}
