// Helper dùng chung cho bộ giao diện catalog (src/components/Catalog/*) — chạy lúc build/SSR.
// Chuẩn hoá 1 record `posts` | `products` (meta có thể là JSON string, pics/tags nối bằng '|', score 'avg~count',
// pricing 'giá~vốn~đơn vị') thành dữ liệu hiển thị phẳng, cùng các builder JSON-LD (SEO/GEO) dùng chung.
// Khác biệt theo loại (đường dẫn, slug, nhãn…) đọc từ `kind` — xem kinds.ts.
import { slugify, pickLang, toPrice } from '@/services/tools/util';
import { site } from '@/services/tools/site';
import type { Kind } from './kinds';

export const PAGE_SIZE = 12; // số card hiện sẵn — phần còn lại vẫn nằm trong HTML (crawlable), JS mở dần

// Tone theo thứ tự — khớp các biến màu theme (default.css), xem .pf-tone-* ở catalog.css
const TONES = ['primary', 'info', 'accent', 'secondary', 'success', 'warning'] as const;

export const base = site.domain.replace(/\/$/, '');

export const asMeta = (m: unknown): Record<string, any> => {
	if (m && typeof m === 'object') return m as Record<string, any>;
	if (typeof m === 'string' && m.trim().startsWith('{')) { try { return JSON.parse(m); } catch {} }
	return {};
};

export const splitPipe = (v: unknown): string[] => String(v ?? '').split('|').map(s => s.trim()).filter(Boolean);
export const stripHtml = (html: unknown): string => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Tone ổn định theo chuỗi — 1 tag luôn giữ cùng màu ở mọi trang. */
export const toneOf = (text: string): string => {
	let h = 0;
	for (const c of String(text ?? '')) h = (h * 31 + (c.codePointAt(0) ?? 0)) | 0;
	return TONES[Math.abs(h) % TONES.length];
};

/** 2 chữ cái đầu ("Quà Tết" → "QT"), dùng cho avatar khi không có ảnh. */
export const initialsOf = (text: string): string => {
	const words = String(text ?? '').normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) || [];
	const chars = words.length > 1 ? words.slice(0, 2).map(w => [...w][0]) : [...(words[0] || '')].slice(0, 2);
	return chars.join('').toLocaleUpperCase('vi') || '#';
};

/** URL trang tag — cùng slugify với tagSlugMap() (sitemap.xml.ts, llms.txt.ts, pages/<loại>/tag/[tag].astro). */
export const tagUrl = (kind: Kind, tag: string) => `${kind.base}tag/${slugify(tag)}/`;

const toIso = (v: unknown): string => {
	if (!v) return '';
	const d = new Date(v as string);
	return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

/** Ngày hiển thị tĩnh (SSR) — JS phía client đổi sang "2 giờ trước" theo ngôn ngữ đang chọn. */
export const fmtDate = (iso: string, withTime = false): string => {
	if (!iso) return '';
	return new Intl.DateTimeFormat(site.lang, {
		day: '2-digit', month: '2-digit', year: 'numeric',
		...(withTime && { hour: '2-digit', minute: '2-digit' }),
		timeZone: 'Asia/Ho_Chi_Minh',
	}).format(new Date(iso));
};

export interface ItemView {
	id: string;
	url: string;
	title: string;
	excerpt: string;
	image: string;
	pics: string[];
	tags: string[];
	tag: string;       // tag chính (đầu tiên) — đóng vai "nguồn" trên card
	tone: string;
	published: string; // ISO
	modified: string;  // ISO
	views: number;
	likes: number;
	readMin: number;
	location: string;
	scoreAvg: number;
	scoreCount: number;
	content: string;
	words: number;
	search: string;    // chuỗi đã chuẩn hoá cho ô tìm kiếm client
	// Sản phẩm (bài viết để trống / 0)
	price: number;     // 0 = chưa có giá → "Liên hệ"
	priceText: string; // '250.000đ'
	unit: string;
	inStock: boolean;  // không theo dõi tồn kho (stock rỗng) cũng tính là còn hàng
	sku: string;
	vat: number;       // 0.08 = 8%
}

export const toView = (p: any, kind: Kind): ItemView => {
	const meta = asMeta(p.meta);
	const pics = splitPipe(p.pics);
	const tags = splitPipe(p.tags);
	const text = stripHtml(p.content);
	const words = text ? text.split(' ').length : 0;
	const [scoreAvg, scoreCount] = String(p.score || '0~0').split('~').map(Number);
	const [rawPrice = '', , unit = ''] = String(p.pricing ?? '').split('~');
	const stock = meta.stock ?? p.quantity;
	const title = String(p.title ?? '').trim() || pickLang({ en: 'Untitled', vi: 'Chưa đặt tên' });
	const excerpt = String(p.description ?? '').trim() || text.slice(0, 180);
	const sku = String(meta.sku ?? '').trim();
	return {
		id: p.id,
		url: `${kind.base}${kind.slug(p)}/`,
		title,
		excerpt,
		image: pics[0] || '',
		pics,
		tags,
		tag: tags[0] || '',
		tone: toneOf(tags[0] || title),
		published: toIso(p.created_at),
		modified: toIso(p.updated_at ?? p.created_at),
		views: Number(meta.views) || 0,
		likes: Number(meta.likes) || 0,
		readMin: Number(meta.reading_time) || Math.max(1, Math.round(words / 220)),
		location: String(meta.location ?? ''),
		scoreAvg: scoreAvg || 0,
		scoreCount: scoreCount || 0,
		content: String(p.content ?? ''),
		words,
		search: slugify([title, excerpt, tags.join(' '), sku].join(' ')).replace(/-/g, ' '),
		price: Number(rawPrice) || 0,
		priceText: toPrice(p.pricing),
		unit: unit.trim(),
		inStock: stock == null || stock === '' || Number(stock) !== 0,
		sku: sku || String(p.id ?? ''),
		vat: parseFloat(p.vat || '0') || 0,
	};
};

/** Mới nhất trước — thứ tự mặc định (khớp sorts[0] 'newest' của mọi loại). */
export const byNewest = (a: ItemView, b: ItemView) => (b.published || '').localeCompare(a.published || '');

export const compactNum = (n: number) =>
	new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

export interface TagStat {
	label: string;
	slug: string;
	url: string;
	count: number;
	cover: string;    // ảnh record mới nhất có ảnh
	tone: string;
	latest: string;   // ISO — record mới nhất của tag
	titles: string[]; // tối đa 2 tiêu đề mới nhất (trang tags hiện làm "xem trước")
}

/** Thống kê tag: label, slug, số record, ảnh bìa, tone, record mới nhất — sắp theo số lượng giảm dần rồi A–Z. */
export const tagStats = (views: ItemView[], kind: Kind): TagStat[] => {
	const map = new Map<string, TagStat>();
	for (const v of [...views].sort(byNewest)) {
		for (const raw of v.tags) {
			const slug = slugify(raw);
			if (!slug) continue;
			const cur = map.get(slug) ?? { label: raw, slug, url: tagUrl(kind, raw), count: 0, cover: '', tone: toneOf(raw), latest: v.published, titles: [] };
			cur.count++;
			if (!cur.cover && v.image) cur.cover = v.image;
			if (cur.titles.length < 2) cur.titles.push(v.title);
			map.set(slug, cur);
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/** Record liên quan: chung nhiều tag nhất, hoà thì mới hơn; thiếu thì bù bằng record mới nhất. */
export const relatedOf = (item: ItemView, all: ItemView[], max = 6): ItemView[] => {
	const others = all.filter(x => x.id !== item.id);
	const scored = others
		.map(v => ({ v, overlap: v.tags.filter(t => item.tags.includes(t)).length }))
		.filter(x => x.overlap > 0)
		.sort((a, b) => b.overlap - a.overlap || byNewest(a.v, b.v))
		.map(x => x.v);
	const fill = [...others].sort(byNewest).filter(v => !scored.includes(v));
	return [...scored, ...fill].slice(0, max);
};

// ── JSON-LD ─────────────────────────────────────────────────────────────────────

export const jsonLdHtml = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

export const absUrl = (src: string) => { try { return new URL(src, base).href; } catch { return src; } };

export const publisherLd = () => ({
	'@type': 'Organization',
	'@id': `${base}/#organization`,
	name: site.subtitle,
	url: site.domain,
	logo: { '@type': 'ImageObject', url: `${base}/logo.avif` },
});

export const breadcrumbLd = (items: { name: string; href?: string }[], currentUrl: string) => ({
	'@type': 'BreadcrumbList',
	itemListElement: items.map((b, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: b.name,
		item: b.href ? `${base}${b.href}` : currentUrl,
	})),
});

/** CollectionPage + ItemList — trang list / tag. ItemList chỉ liệt kê URL (đúng mẫu "summary page"). */
export const collectionLd = (opts: { url: string; name: string; description: string; items: ItemView[]; about?: string }) => ({
	'@type': 'CollectionPage',
	'@id': `${opts.url}#page`,
	url: opts.url,
	name: opts.name,
	description: opts.description,
	inLanguage: site.lang,
	isPartOf: { '@type': 'WebSite', name: site.subtitle, url: site.domain },
	publisher: { '@id': `${base}/#organization` },
	...(opts.about && { about: { '@type': 'Thing', name: opts.about } }),
	mainEntity: {
		'@type': 'ItemList',
		numberOfItems: opts.items.length,
		itemListOrder: 'https://schema.org/ItemListOrderDescending',
		itemListElement: opts.items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}${p.url}`, name: p.title })),
	},
});
