// Dữ liệu cửa hàng lúc build cho 3 trang mua sắm của giftoraddk.com — /gift/shop, /gift/<danh mục>, /gift/<ngân sách>
// (markup: components/Shop/*). Trang chỉ gọi shopPageData() rồi đưa kết quả cho <Shop>; mọi thứ SEO/GEO dựng ở đây:
// - sản phẩm render sẵn trong HTML (crawlable), trang lọc sẵn chỉ chứa đúng sản phẩm của nó (không trùng nội dung nhau);
// - bộ lọc: "Quà tặng theo dịp" / "Quà tặng theo ngân sách" là LINK sang mọi trang danh mục / ngân sách (crawler đi
//   được), khoảng giá + các nhóm còn lại lọc ngay trên trang (components/Shop/shop.client.ts);
// - đoạn tóm tắt + FAQ dựng từ số liệu thật của catalog (AI Search trích nguyên câu), JSON-LD CollectionPage + ItemList +
//   BreadcrumbList + FAQPage khớp đúng nội dung hiển thị.
import { fetchCollection } from '@/services/core/fetcher.server.js';
import { normText, slugify } from '@/services/tools/util';
import { site } from '@/services/tools/site';
import {
	CATEGORY_KEYS, categoryLabel, categoryPath, categorySeo, categoriesOfTag, COLOR_KEYS, colorTypes,
} from '@/services/shared/tags';
import { toView, breadcrumbLd, absUrl, base } from '@/components/Catalog/lib';
import { KINDS } from '@/components/Catalog/kinds';
import { company } from '@/modules/company.js';
import { budgetTiers, budgetPath } from './budget.js';
import { GIFT_HOME, GIFT_LANG, ZALO, shopPage } from './meta.js';

export const SHOP_PATH = shopPage.path;
export const PAGE_SIZE = 24; // số card hiện sẵn — phần còn lại vẫn nằm trong HTML, nút "Xem thêm" mở dần
const TREND_MAX = 5;        // số chip "Xu hướng" trên đầu lưới
const TAG_MAX = 16;         // số đặc điểm tối đa trong bộ lọc

// Mẫu màu cho swatch trên card / bộ lọc — key theo COLOR_KEYS (services/shared/tags.ts).
const SWATCH = {
	beige: '#e8dcc4', black: '#222222', red: '#e5484d', pink: '#f4a6c0', brown: '#8b5e3c', purple: '#8e6bd8',
	white: '#ffffff', yellow: '#f5c84c', gray: '#9aa0a6', blue: '#3b82f6', green: '#22a06b',
};

// Tag (đã bỏ dấu, chữ thường) → màu. Danh mục của tag: categoriesOfTag (services/shared/tags.ts — nguyên văn + từ khoá).
const COLOR_OF_TAG = new Map(COLOR_KEYS.flatMap((key) => [key, colorTypes.vi[key], colorTypes.en[key]].map((v) => [normText(v).trim(), key])));

// URL tuyệt đối trong JSON-LD khớp canonical (Head/Base.astro — build `directory`, luôn có '/' cuối).
const absPage = (path) => `${base}${path.endsWith('/') ? path : `${path}/`}`;
const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const uniq = (arr) => [...new Set(arr)];

/** Mức ngân sách của 1 giá (min <= giá < max) — giá 0 ("Liên hệ") không thuộc mức nào. */
const tierOf = (price) => (price > 0 ? budgetTiers.find((t) => price >= t.min && price < t.max)?.key ?? '' : '');

/** 1 sản phẩm → dữ liệu hiển thị của catalog (Catalog/lib toView) + các chiều lọc của cửa hàng. */
function toItem(record) {
	const view = toView(record, KINDS.product);
	const cats = [];
	const colors = [];
	const extra = [];
	for (const raw of view.tags) {
		const k = normText(raw).trim();
		const tagCats = categoriesOfTag(raw);
		if (tagCats.length) cats.push(...tagCats);
		else if (COLOR_OF_TAG.has(k)) colors.push(COLOR_OF_TAG.get(k));
		else if (slugify(raw)) extra.push({ slug: slugify(raw), label: raw });
	}
	return {
		...view,
		pricing: String(record.pricing ?? ''), // nguyên dạng 'giá~vốn~đơn vị' — giỏ hàng (svc-pay) tự tách giá
		cats: uniq(cats),
		colors: uniq(colors).map((key) => ({ key, label: colorTypes.vi[key], hex: SWATCH[key] })),
		extra: [...new Map(extra.map((x) => [x.slug, x])).values()],
		tier: tierOf(view.price),
		feat: KINDS.product.featuredScore(view),
	};
}

/** Toàn bộ sản phẩm active (fetchCollection: 1 lần fetch / build, luôn mới khi `astro dev`), nổi bật trước. */
async function allItems() {
	const items = (await fetchCollection('products')).map(toItem);
	// Shop chưa theo dõi tồn kho (mọi sản phẩm đều 0 — quà làm theo đơn) → coi như còn hàng: không gắn "Đặt trước" lên mọi
	// card, không hiện lọc "hàng có sẵn" ra rỗng. Có ít nhất 1 sản phẩm còn hàng thì tồn kho mới là số liệu thật.
	const tracked = items.some((x) => x.inStock);
	return items
		.map((x) => (tracked ? x : { ...x, inStock: true }))
		.sort((a, b) => b.feat - a.feat || (b.published || '').localeCompare(a.published || ''));
}

const countBy = (items, pick) => {
	const map = new Map();
	for (const it of items) for (const v of pick(it)) map.set(v, (map.get(v) ?? 0) + 1);
	return map;
};

/** Khoảng giá (chỉ sản phẩm có giá) — { min, max } hoặc null. */
function priceSpan(items) {
	const prices = items.map((x) => x.price).filter((p) => p > 0);
	return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
}

/** Bước của thanh trượt giá: ~100 nấc, làm tròn về 1k / 10k / 50k / 100k… cho số đẹp. */
function priceStep(span) {
	const raw = Math.max(1000, (span.max - span.min) / 100);
	const mag = 10 ** Math.floor(Math.log10(raw));
	return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
}

/**
 * Khung thanh trượt giá của trang: trang ngân sách theo đúng khoảng của mức (mức cuối không có trần → giá cao nhất),
 * trang khác theo giá thấp/cao nhất của trang; chưa có sản phẩm có giá thì lấy toàn catalog — bộ lọc giá luôn hiện.
 */
function priceRange(items, all, lock) {
	const span = priceSpan(items) ?? priceSpan(all) ?? { min: 0, max: 5_000_000 };
	const tier = lock?.group === 'tier' && budgetTiers.find((t) => t.key === lock.key);
	const bounds = tier ? { min: tier.min, max: Number.isFinite(tier.max) ? tier.max : Math.max(span.max, tier.min * 2) } : span;
	const step = priceStep(bounds);
	return {
		lo: Math.floor(bounds.min / step) * step,
		hi: Math.max(Math.ceil(bounds.max / step) * step, Math.floor(bounds.min / step) * step + step),
		step,
	};
}

/**
 * Các nhóm của bộ lọc. "Quà tặng theo dịp" / "Quà tặng theo ngân sách" là LINK sang trang danh mục / ngân sách (đủ mọi
 * trang — liên kết nội bộ cho crawler, đánh dấu trang hiện tại; số đếm trên toàn catalog), các nhóm còn lại lọc trên trang.
 * @param {object[]} items  sản phẩm của trang
 * @param {object[]} all    toàn bộ sản phẩm
 * @param {{ group: 'cat'|'tier', key: string } | null} lock  chiều của chính trang (null = /gift/shop)
 */
function facetsOf(items, all, lock) {
	const catCount = countBy(all, (x) => x.cats);
	const tierCount = countBy(all, (x) => (x.tier ? [x.tier] : []));
	const colorCount = countBy(items, (x) => x.colors.map((c) => c.key));
	const tagCount = countBy(items, (x) => x.extra.map((t) => t.slug));
	const tagLabel = new Map(items.flatMap((x) => x.extra.map((t) => [t.slug, t.label])));

	const cat = {
		group: 'cat',
		title: { vi: 'Quà tặng theo dịp', en: 'Gifts by occasion' },
		link: true,
		all: { vi: 'Tất cả dịp', en: 'All occasions' },
		allCurrent: !lock, // "Tất cả" → /gift/shop: chỉ là trang hiện tại khi đang ở chính /gift/shop
		options: CATEGORY_KEYS.map((key) => ({
			value: key, label: categoryLabel(key), count: catCount.get(key) ?? 0, href: categoryPath(key), current: lock?.group === 'cat' && lock.key === key,
		})),
	};
	const tier = {
		group: 'tier',
		title: { vi: 'Quà tặng theo ngân sách', en: 'Gifts by budget' },
		link: true,
		all: { vi: 'Tất cả mức giá', en: 'All budgets' },
		allCurrent: !lock, // "Tất cả" → /gift/shop: chỉ là trang hiện tại khi đang ở chính /gift/shop
		options: budgetTiers.map((t) => ({
			value: t.key, label: t.label, count: tierCount.get(t.key) ?? 0, href: budgetPath(t.key), current: lock?.group === 'tier' && lock.key === t.key,
		})),
	};
	const color = {
		group: 'color',
		title: { vi: 'Màu sắc', en: 'Color' },
		options: COLOR_KEYS.filter((key) => colorCount.has(key)).map((key) => ({
			value: key, label: { vi: colorTypes.vi[key], en: colorTypes.en[key] }, count: colorCount.get(key), hex: SWATCH[key],
		})),
	};
	const tag = {
		group: 'tag',
		title: { vi: 'Đặc điểm', en: 'Features' },
		options: [...tagCount.entries()]
			.sort((a, b) => b[1] - a[1] || tagLabel.get(a[0]).localeCompare(tagLabel.get(b[0]), 'vi'))
			.slice(0, TAG_MAX)
			.map(([slug, count]) => ({ value: slug, label: tagLabel.get(slug), count })),
	};

	return {
		groups: [cat, tier, color, tag].filter((g) => g.options.length > 0),
		price: priceRange(items, all, lock),
		rating: items.some((x) => x.scoreCount > 0),
		stock: items.some((x) => !x.inStock),
		trends: tag.options.slice(0, TREND_MAX),
	};
}

/** Câu liệt kê "Quà Tết (12), Quà nhân viên (8)" từ map đếm — dùng cho tóm tắt / FAQ. */
const listCounts = (entries) => entries.map(([label, n]) => `${label}: ${n} mẫu`).join(', ');

/** Đoạn tóm tắt đầu trang — câu trả lời ngắn, đủ số liệu để AI Search trích dẫn nguyên văn. */
function summaryOf(scope, items) {
	const span = priceSpan(items);
	if (!items.length) return `${scope} đang được cập nhật mẫu mới. Liên hệ Zalo ${company.hotline} để Giftora DDK tư vấn quà theo ngân sách và số lượng.`;
	const priceText = span ? (span.min === span.max ? `, giá ${vnd(span.min)}` : `, giá từ ${vnd(span.min)} đến ${vnd(span.max)}`) : '';
	return `${scope} tại Giftora DDK hiện có ${items.length} mẫu${priceText}. Nhận in logo theo yêu cầu, đóng gói và giao hàng toàn quốc cho đơn số lượng lớn.`;
}

/** FAQ của trang — trả lời bằng số liệu thật (catalog, chính sách vận chuyển, hotline), cùng nội dung với FAQPage JSON-LD. */
function faqOf(scope, items, lock) {
	const span = priceSpan(items);
	const faq = [];

	if (lock?.group === 'cat') {
		const byTier = budgetTiers.map((t) => [t.label.vi, items.filter((x) => x.tier === t.key).length]).filter(([, n]) => n > 0);
		if (byTier.length) faq.push({
			q: `${scope} có những mức giá nào?`,
			a: `Theo ngân sách: ${listCounts(byTier)}${span ? `; rẻ nhất ${vnd(span.min)}, cao nhất ${vnd(span.max)}` : ''}.`,
		});
	} else {
		const byCat = CATEGORY_KEYS.map((k) => [categoryLabel(k).vi, items.filter((x) => x.cats.includes(k)).length]).filter(([, n]) => n > 0);
		if (byCat.length) faq.push({
			q: `${scope} phù hợp tặng dịp nào?`,
			a: `Theo dịp tặng: ${listCounts(byCat)}. Mỗi mẫu có thể in logo và đổi bao bì theo nhận diện thương hiệu của doanh nghiệp.`,
		});
	}
	faq.push(
		{
			q: 'Có in logo doanh nghiệp lên quà tặng không?',
			a: 'Có. Giftora DDK nhận in logo, thiết kế gift box và thiệp theo yêu cầu. Thời gian giao có thể thay đổi tuỳ yêu cầu in ấn — được báo cụ thể khi tư vấn và báo giá.',
		},
		{
			q: 'Đặt quà số lượng lớn và nhận báo giá như thế nào?',
			a: `Thêm sản phẩm vào giỏ để đặt hàng trực tiếp, hoặc nhắn Zalo/hotline ${company.hotline} (email ${company.email}) để nhận báo giá số lượng lớn.`,
		},
		{
			q: 'Phí và thời gian giao hàng?',
			a: 'Giao hàng toàn quốc cho đơn từ 1 triệu đồng, miễn phí vận chuyển cho đơn từ 5 triệu đồng. Nội thành TP. HCM 1–2 ngày làm việc, các tỉnh thành khác 3–5 ngày làm việc.',
		},
	);
	return faq;
}

/** JSON-LD 1 @graph (Organization do Head/Base.astro in sẵn — chỉ tham chiếu @id): CollectionPage/ItemList + BreadcrumbList + FAQPage. */
function jsonLdOf({ url, title, description, items, crumbs, faq, about }) {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'CollectionPage',
				'@id': `${url}#page`,
				url,
				name: title,
				description,
				inLanguage: GIFT_LANG,
				isPartOf: { '@type': 'WebSite', name: site.subtitle, url: site.domain },
				publisher: { '@id': `${base}/#organization` },
				...(about && { about: { '@type': 'Thing', name: about } }),
				mainEntity: {
					'@type': 'ItemList',
					numberOfItems: items.length,
					itemListElement: items.map((p, i) => ({
						'@type': 'ListItem',
						position: i + 1,
						url: `${base}${p.url}`,
						name: p.title,
						...(p.image && { image: absUrl(p.image) }),
					})),
				},
			},
			breadcrumbLd(crumbs.map((c) => ({ name: c.name, href: absPage(c.path).slice(base.length) })), url),
			{
				'@type': 'FAQPage',
				'@id': `${url}#faq`,
				mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
			},
		],
	};
}

/**
 * Toàn bộ dữ liệu của 1 trang mua sắm.
 * @param {{ type: 'shop' } | { type: 'cat', key: import('@/services/shared/tags').CategoryKey } | { type: 'tier', key: string }} spec
 */
export async function shopPageData(spec) {
	const all = await allItems();
	let meta, items, lock = null, scope, crumbName;

	if (spec.type === 'cat') {
		const label = categoryLabel(spec.key);
		meta = { path: categoryPath(spec.key), ...categorySeo(spec.key) };
		items = all.filter((x) => x.cats.includes(spec.key));
		lock = { group: 'cat', key: spec.key };
		scope = label.vi;
		crumbName = label.vi;
	} else if (spec.type === 'tier') {
		const tier = budgetTiers.find((t) => t.key === spec.key);
		meta = { path: budgetPath(tier.key), ...tier.seo };
		items = all.filter((x) => x.tier === tier.key);
		lock = { group: 'tier', key: tier.key };
		scope = `Quà tặng doanh nghiệp ${tier.label.vi.charAt(0).toLowerCase()}${tier.label.vi.slice(1)}`;
		crumbName = `Quà tặng ${tier.label.vi}`;
	} else {
		meta = { path: shopPage.path, title: shopPage.title, description: shopPage.description };
		items = all;
		scope = 'Quà tặng doanh nghiệp';
		crumbName = 'Cửa hàng';
	}

	const url = absPage(meta.path);
	const crumbs = lock
		? [GIFT_HOME, { name: 'Cửa hàng', path: SHOP_PATH }, { name: crumbName, path: meta.path }]
		: [GIFT_HOME, { name: crumbName, path: meta.path }];
	const faq = faqOf(scope, items, lock);

	return {
		page: { ...meta, lang: GIFT_LANG, image: items.find((x) => x.image)?.image ?? '/images/common/gift-light.webp' },
		items,
		lock,
		crumbs,
		summary: summaryOf(scope, items),
		facets: facetsOf(items, all, lock),
		faq,
		quote: ZALO,
		jsonLd: [jsonLdOf({ url, title: meta.title, description: meta.description, items, crumbs, faq, about: lock ? crumbName : undefined })],
	};
}
