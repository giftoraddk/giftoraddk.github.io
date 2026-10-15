// board-seo.js — build-time helpers (Astro frontmatter, không đụng DOM) biến `sections[]` của <web-board>
// thành nội dung crawler đọc được: outline ngữ nghĩa (components/Seo/BoardOutline.astro) + JSON-LD.
//
// Vì sao cần: web-board dựng nội dung ở trình duyệt, vào Shadow DOM của web-box/web-cell — HTML tĩnh
// chỉ mang 1 khối JSON trong <script>, mà phần lớn AI crawler (GPTBot, ClaudeBot, PerplexityBot...)
// không chạy JS nên không thấy gì (GEO kém); Googlebot chạy JS nhưng render trễ, dễ sót.
// Outline lấy CHÍNH data mà web-board hiển thị (không viết nội dung riêng cho bot) và bị web-board gỡ
// khỏi DOM ngay khi chạy (xem connectedCallback) — trình duyệt/Googlebot sau render không còn bản trùng.
//
// Chỉ đọc section có `data` tĩnh — section `dataTable`/`dataSrc` (fetch lúc chạy) và `component` bỏ qua;
// muốn đưa dữ liệu bảng (vd sản phẩm) vào outline thì dựng trước bằng boardStaticSections() bên dưới.

import { filterRecords } from './recursive-render.js';

/**
 * Kiểu dữ liệu outline — components/Seo/BoardOutline.astro import thẳng các typedef này (`import type`).
 * @typedef {{ title: string, text: string, href: string }} OutlineItem
 * @typedef {{ key: string, caption: string, items: OutlineItem[] }} OutlineList
 * @typedef {{ id?: string, eyebrow: string, heading: string, paragraphs: string[], lists: OutlineList[] }} OutlineBase
 * @typedef {OutlineBase & { level: 1 | 2 }} OutlineSection
 */

// Chuỗi thường hoặc bag { vi, en } (cùng quy ước resolveLocale của web-cell).
const raw = (v, lang) => {
	if (v == null) return '';
	if (typeof v === 'string' || typeof v === 'number') return String(v);
	if (typeof v === 'object') return raw(v[lang] ?? v.vi ?? v.en, lang);
	return '';
};
// Bỏ thẻ HTML (vd `content` sản phẩm là HTML) — outline chỉ cần chữ; Astro vẫn escape khi in.
const text = (v, lang) => raw(v, lang).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Link nội bộ / http(s) duy nhất được phép ra outline — chặn 'javascript:', '//evil.com'... từ data.
const safeHref = (v) => (typeof v === 'string' && (/^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v)) ? v : '');
const paragraphs = (v, lang) => raw(v, lang).split(/\n+/).map((p) => p.trim()).filter(Boolean);
const join = (...parts) => parts.filter(Boolean).join(' ');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Tiêu đề phụ cho list hai cột (benefitCompare: leftCards | rightCards).
const LIST_CAPTION = { leftCards: 'leftPanelTitle', rightCards: 'rightPanelTitle' };

// 1 phần tử list → { title, text, href }. stats dùng { value, label } → "0đ — Chi phí vận hành".
// href: link chi tiết của record (vd sản phẩm có meta.url, vd meta.url = trang /product/<slug>/) — outline in thành <a>.
// Record sản phẩm có cả `description` (ngắn) lẫn `content` (HTML dài) — ưu tiên description khi có href.
function entry(o, lang) {
	const title = text(o.title ?? o.label ?? o.name, lang);
	const value = text(o.value, lang);
	const href = safeHref(o.href ?? o.meta?.url ?? o.url);
	const body = text(href ? (o.description || o.content) : (o.content ?? o.description), lang);
	return {
		title: value && title ? `${value} — ${title}` : title || value,
		// record có trang chi tiết riêng → chỉ cần đoạn tóm tắt, nội dung đầy đủ nằm ở trang đó
		text: href && body.length > 200 ? `${body.slice(0, 197)}…` : body,
		href,
	};
}

/** @returns {OutlineItem[]} */
const entries = (arr, lang) => arr.filter(isPlainObject).map((o) => entry(o, lang)).filter((e) => e.title || e.text);

/** @returns {OutlineBase | null} */
function sectionOutline(sec, lang) {
	if (sec.component || sec.dataTable || sec.dataSrc) return null;
	const data = Array.isArray(sec.data) ? sec.data.filter(isPlainObject) : [];
	if (!data.length) return null;

	// Nhiều record (vd logo slider) — mỗi record là 1 mục, section không có tiêu đề riêng. `asRecords`
	// (boardStaticSections) — dữ liệu bảng luôn là danh sách, kể cả khi lọc ra đúng 1 record.
	if (data.length > 1 || sec.asRecords) {
		const items = entries(data, lang);
		return items.length ? { id: sec.id, eyebrow: '', heading: '', paragraphs: [], lists: [{ key: 'data', caption: '', items }] } : null;
	}

	const item = data[0];
	const meta = isPlainObject(item.meta) ? item.meta : {};
	const lists = Object.entries(item)
		.filter(([, v]) => Array.isArray(v))
		.map(([key, arr]) => ({ key, caption: text(meta[LIST_CAPTION[key]], lang), items: entries(arr, lang) }))
		.filter((l) => l.items.length);

	const out = {
		id: sec.id,
		eyebrow: text(item.subtitle ?? meta.badge, lang),
		heading: join(
			text(item.title ?? meta.heading ?? meta.sectionHeading, lang),
			text(meta.titleHighlight ?? meta.sectionHeadingAccent, lang),
		),
		paragraphs: [item.description, meta.sectionDescription, meta.socialProof].flatMap((v) => paragraphs(v, lang)),
		lists,
	};
	return out.heading || out.paragraphs.length || lists.length ? out : null;
}

/**
 * sections (đã sort như web-board: theo `sort`) → outline[]. Section đầu tiên có tiêu đề nhận level 1
 * (<h1> duy nhất của trang), các section sau level 2.
 * @param {object[]} sections  cùng mảng truyền cho <web-board>
 * @param {string}   [lang]    'vi' | 'en' — chọn nhánh của bag { vi, en }
 * @returns {OutlineSection[]}
 */
export function boardOutline(sections = [], lang = 'vi') {
	const sorted = [...sections].sort((a, b) => (a.sort ?? 9999) - (b.sort ?? 9999));
	let h1Used = false;
	// flatMap thay cho .filter(Boolean) — TypeScript không tự loại `null` qua filter(Boolean), kiểu trả về sẽ sai
	return sorted.flatMap((sec) => {
		const s = sectionOutline(sec, lang);
		if (!s) return [];
		/** @type {1 | 2} */
		const level = s.heading && !h1Used ? 1 : 2;
		if (level === 1) h1Used = true;
		return [{ ...s, level }];
	});
}

/**
 * Section `dataTable` (web-boxs tự fetch ở client) → bản `data` tĩnh CHỈ để dựng outline/JSON-LD lúc build:
 * lọc đúng như web-boxs lọc ở client (filterRecords + filterState: tag `active`, khoảng giá `rangeKey`), nên
 * outline liệt kê đúng những record người dùng thấy. Mảng trả về KHÔNG truyền cho <web-board>.
 * @param {object[]} sections
 * @param {Record<string, object[]>} [collections]  { [dataTable]: rows } — vd { products } từ fetchCollection()
 * @param {{ limit?: number }} [opts]  limit: số record tối đa mỗi section (outline/ItemList không cần cả kho)
 */
export function boardStaticSections(sections = [], collections = {}, { limit = 48 } = {}) {
	return sections.map((sec) => {
		const rows = !sec.component && collections[sec.dataTable];
		if (!Array.isArray(rows)) return sec;
		const fs = sec.filterState || {};
		const data = filterRecords(rows, {
			active: fs.active || [],
			field: fs.field || sec.tags?.filterField || 'tags',
			range: (fs.ranges || []).find((r) => r.key === fs.rangeKey) || null,
			rangeField: fs.rangeField || 'pricing',
		}).slice(0, limit);
		const { dataTable, dataSrc, loadLimit, ...rest } = sec;
		return { ...rest, data, asRecords: true };
	});
}

/**
 * BreadcrumbList — [{ name, path }] theo thứ tự từ gốc tới trang hiện tại.
 * @param {{ name: string, path: string }[]} trail
 * @param {string|URL} base
 */
export function breadcrumbJsonLd(trail = [], base) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: new URL(t.path, base).href })),
	};
}

/**
 * Gói SEO cho 1 trang dựng bằng <web-board> — dùng chung cho src/pages/landing/*, src/pages/gift/*.
 * @param {{ path: string, lang: string, title: string, description: string }} page  meta của trang
 * @param {object[]} sections  sections của view (cùng mảng truyền cho <web-board>, hoặc bản boardStaticSections)
 * @param {string|URL} base    Astro.site (fallback Astro.url) — để ra URL tuyệt đối
 * @param {{ breadcrumb?: { name: string, path: string }[] }} [opts]  breadcrumb → thêm BreadcrumbList
 * @returns {{ url: string, outline: OutlineSection[], jsonLd: object[] }}
 */
export function boardPageSeo(page, sections, base, { breadcrumb } = {}) {
	const url = new URL(page.path, base).href;
	const outline = boardOutline(sections, page.lang);
	const jsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: page.title,
			description: page.description,
			url,
			inLanguage: page.lang,
		},
		...(breadcrumb?.length ? [breadcrumbJsonLd(breadcrumb, base)] : []),
		...boardJsonLd(outline, { url, lang: page.lang }),
	];
	return { url, outline, jsonLd };
}

/**
 * outline → JSON-LD suy ra từ chính nội dung: FAQPage (list `expansion`), HowTo (list `steps`).
 * @param {OutlineSection[]} outline
 * @param {{ url?: string, lang?: string }} [opts]  url = URL tuyệt đối của trang (gắn #id cho từng bước)
 */
export function boardJsonLd(outline = [], { url = '', lang = 'vi' } = {}) {
	const ld = [];
	const listOf = (s, key) => s.lists.find((l) => l.key === key)?.items ?? [];

	const faq = outline.flatMap((s) => listOf(s, 'expansion')).filter((q) => q.title && q.text);
	if (faq.length) {
		ld.push({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			inLanguage: lang,
			mainEntity: faq.map((q) => ({
				'@type': 'Question',
				name: q.title,
				acceptedAnswer: { '@type': 'Answer', text: q.text },
			})),
		});
	}

	for (const s of outline) {
		const steps = listOf(s, 'steps').filter((st) => st.title);
		if (!steps.length || !s.heading) continue;
		ld.push({
			'@context': 'https://schema.org',
			'@type': 'HowTo',
			inLanguage: lang,
			name: s.heading,
			...(s.paragraphs[0] && { description: s.paragraphs[0] }),
			step: steps.map((st, i) => ({
				'@type': 'HowToStep',
				position: i + 1,
				name: st.title,
				text: st.text || st.title,
				...(url && { url: `${url.split('#')[0]}#${s.id}` }),
			})),
		});
	}

	// ItemList — list có link trang chi tiết (vd sản phẩm): Google/AI hiểu đây là trang danh sách, mỗi mục 1 URL.
	for (const s of outline) {
		for (const l of s.lists) {
			const linked = l.items.filter((it) => it.href && it.title);
			if (!linked.length) continue;
			ld.push({
				'@context': 'https://schema.org',
				'@type': 'ItemList',
				...((l.caption || s.heading) && { name: l.caption || s.heading }),
				numberOfItems: linked.length,
				itemListElement: linked.map((it, i) => ({
					'@type': 'ListItem',
					position: i + 1,
					name: it.title,
					url: url ? new URL(it.href, url).href : it.href,
				})),
			});
		}
	}
	return ld;
}
