// Cấu hình "loại record" của bộ giao diện catalog (src/components/Catalog/*). Feed / Tags / Card / Detail
// dùng chung 100% markup + CSS + JS; MỌI khác biệt giữa bài viết và sản phẩm nằm ở đây: đường dẫn, slug,
// nhãn song ngữ, cách sắp xếp, điểm "nổi bật". Phần hiển thị riêng (giá/tồn kho trên card, khối mua hàng,
// JSON-LD Product vs BlogPosting) rẽ nhánh theo `kind.id` ngay trong component.
//
// Thêm 1 loại mới (vd 'service'): thêm entry vào KINDS + nhánh hiển thị riêng nếu cần, tạo
// modules/<loại>/index.js (menu, tints) và các trang src/pages/<loại>/ như post/product.
import { postSlug, productSlug } from '@/services/tools/util';
import type { ItemView } from './lib';

export type Txt = { en: string; vi: string };
export type KindId = 'post' | 'product';

export interface SortDef {
	key: string;
	text: Txt;
	dir: 'asc' | 'desc';
	value: (v: ItemView) => number; // ghi vào data-sort-{key} trên <li> — JS sắp xếp lại không cần biết loại
}

export interface Kind {
	id: KindId;
	table: 'posts' | 'products';
	base: string;                   // '/post/' — URL list; tag: `${base}tag/{slug}/`; chi tiết: `${base}{slug}/`
	slug: (record: any) => string;
	sorts: SortDef[];               // sorts[0] = thứ tự render sẵn (SSR) + mặc định
	featuredScore: (v: ItemView) => number;
	t: Record<
		| 'crumb' | 'all' | 'one' | 'many' | 'countShort' | 'topics' | 'allTopics' | 'topicsTitle' | 'featured'
		| 'nextFeatured' | 'side' | 'search' | 'searchPh' | 'empty' | 'viewAll' | 'related' | 'lead' | 'notFound'
		| 'filterTopics' | 'noTopics' | 'noMatchTopics',
		Txt
	>;
}

const byNewestValue = (v: ItemView) => Date.parse(v.published) || 0;

export const KINDS: Record<KindId, Kind> = {
	post: {
		id: 'post',
		table: 'posts',
		base: '/post/',
		slug: postSlug,
		sorts: [
			{ key: 'newest', text: { en: 'Latest', vi: 'Mới nhất' }, dir: 'desc', value: byNewestValue },
			{ key: 'views', text: { en: 'Most read', vi: 'Xem nhiều' }, dir: 'desc', value: v => v.views },
			{ key: 'likes', text: { en: 'Most liked', vi: 'Yêu thích' }, dir: 'desc', value: v => v.likes },
		],
		featuredScore: v => v.views + v.likes * 3,
		t: {
			crumb: { en: 'Posts', vi: 'Bài viết' },
			all: { en: 'All posts', vi: 'Tất cả bài viết' },
			one: { en: 'post', vi: 'bài viết' },
			many: { en: 'posts', vi: 'bài viết' },
			countShort: { en: 'posts', vi: 'bài' },
			topics: { en: 'Topics', vi: 'Chủ đề' },
			allTopics: { en: 'All topics', vi: 'Tất cả chủ đề' },
			topicsTitle: { en: 'Post topics', vi: 'Chủ đề bài viết' },
			featured: { en: 'Popular', vi: 'Nổi bật' },
			nextFeatured: { en: 'Next popular post', vi: 'Bài nổi bật tiếp theo' },
			side: { en: 'Topics and popular posts', vi: 'Chủ đề và bài nổi bật' },
			search: { en: 'Search posts', vi: 'Tìm bài viết' },
			searchPh: { en: 'Search titles, topics…', vi: 'Tìm tiêu đề, chủ đề…' },
			empty: { en: 'No posts yet.', vi: 'Chưa có bài viết nào.' },
			viewAll: { en: 'View all posts', vi: 'Xem tất cả bài viết' },
			related: { en: 'Related posts', vi: 'Bài viết liên quan' },
			lead: { en: 'Summary', vi: 'Tóm tắt' },
			notFound: { en: 'Post not found.', vi: 'Không tìm thấy bài viết.' },
			filterTopics: { en: 'Filter topics', vi: 'Lọc chủ đề' },
			noTopics: { en: 'No topics yet.', vi: 'Chưa có chủ đề nào.' },
			noMatchTopics: { en: 'No matching topics.', vi: 'Không có chủ đề phù hợp.' },
		},
	},
	product: {
		id: 'product',
		table: 'products',
		base: '/product/',
		slug: productSlug,
		sorts: [
			{ key: 'newest', text: { en: 'Latest', vi: 'Mới nhất' }, dir: 'desc', value: byNewestValue },
			// Chưa có giá → luôn xuống cuối khi xếp giá tăng dần
			{ key: 'price-asc', text: { en: 'Price ↑', vi: 'Giá ↑' }, dir: 'asc', value: v => v.price || Number.MAX_SAFE_INTEGER },
			{ key: 'price-desc', text: { en: 'Price ↓', vi: 'Giá ↓' }, dir: 'desc', value: v => v.price },
			{ key: 'rating', text: { en: 'Top rated', vi: 'Đánh giá' }, dir: 'desc', value: v => v.scoreAvg * 1000 + v.scoreCount },
		],
		featuredScore: v => v.scoreAvg * v.scoreCount * 100 + v.views + v.likes * 3,
		t: {
			crumb: { en: 'Products', vi: 'Sản phẩm' },
			all: { en: 'All products', vi: 'Tất cả sản phẩm' },
			one: { en: 'product', vi: 'sản phẩm' },
			many: { en: 'products', vi: 'sản phẩm' },
			countShort: { en: 'products', vi: 'sản phẩm' },
			topics: { en: 'Categories', vi: 'Danh mục' },
			allTopics: { en: 'All categories', vi: 'Tất cả danh mục' },
			topicsTitle: { en: 'Product categories', vi: 'Danh mục sản phẩm' },
			featured: { en: 'Featured', vi: 'Nổi bật' },
			nextFeatured: { en: 'Next featured product', vi: 'Sản phẩm nổi bật tiếp theo' },
			side: { en: 'Categories and featured products', vi: 'Danh mục và sản phẩm nổi bật' },
			search: { en: 'Search products', vi: 'Tìm sản phẩm' },
			searchPh: { en: 'Search names, categories…', vi: 'Tìm tên, danh mục…' },
			empty: { en: 'No products yet.', vi: 'Chưa có sản phẩm nào.' },
			viewAll: { en: 'View all products', vi: 'Xem tất cả sản phẩm' },
			related: { en: 'Related products', vi: 'Sản phẩm liên quan' },
			lead: { en: 'Overview', vi: 'Tổng quan' },
			notFound: { en: 'Product not found.', vi: 'Không tìm thấy sản phẩm.' },
			filterTopics: { en: 'Filter categories', vi: 'Lọc danh mục' },
			noTopics: { en: 'No categories yet.', vi: 'Chưa có danh mục nào.' },
			noMatchTopics: { en: 'No matching categories.', vi: 'Không có danh mục phù hợp.' },
		},
	},
};
