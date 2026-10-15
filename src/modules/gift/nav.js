// src/modules/gift/nav.js — các mục con ĐƯỢC INDEX của trang chủ Giftora DDK (ứng viên sitelinks của Google): cửa hàng,
// danh mục quà doanh nghiệp, mức ngân sách, dịch vụ, chính sách. 1 nguồn cho JSON-LD trang chủ (WebSite +
// SiteNavigationElement, pages/index.astro), sitemap.xml và llms.txt — cùng nguồn getStaticPaths của từng route /gift/*,
// nên URL luôn khớp trang thật đã build.
import { CATEGORY_KEYS, categoryLabel, categoryPath, categorySeo } from '@/services/shared/tags';
import { SITE, page, shopPage } from './meta.js';
import { budgetTiers, budgetPath } from './budget.js';
import { services } from './services.js';
import { policies } from './policies.js';

const base = SITE.replace(/\/$/, '');

/** Mỗi nhóm: { title, links: [{ name, path, description }] } — thứ tự = thứ tự menu. */
export const GIFT_GROUPS = [
	{
		title: 'Quà tặng doanh nghiệp theo đối tượng',
		links: CATEGORY_KEYS.map((key) => ({ name: categoryLabel(key).vi, path: categoryPath(key), description: categorySeo(key).description })),
	},
	{
		title: 'Quà tặng theo ngân sách',
		links: budgetTiers.map((t) => ({ name: `Quà tặng ${t.label.vi}`, path: budgetPath(t.key), description: t.seo.description })),
	},
	{
		title: 'Dịch vụ',
		links: services.map((svc) => ({ name: svc.title.vi, path: `/gift/service/${svc.slug}`, description: svc.seo.description })),
	},
	{
		title: 'Chính sách',
		links: policies.map((doc) => ({ name: doc.title.vi, path: `/gift/policy/${doc.slug}`, description: doc.intro?.vi ?? '' })),
	},
];

/** Mục con của trang chủ cho sitelinks — cửa hàng + danh mục + ngân sách + dịch vụ (chính sách không phải điểm đến). */
export const SITE_NAV = [
	{ name: shopPage.name, path: shopPage.path, description: shopPage.description },
	...GIFT_GROUPS.slice(0, 3).flatMap((g) => g.links),
];

/** JSON-LD trang chủ: WebSite (tên site hiện trên kết quả Google) + danh sách SiteNavigationElement của mục con. */
export function siteNavLd() {
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			'@id': `${base}/#website`,
			url: `${base}/`,
			name: page.name,
			alternateName: new URL(SITE).host,
			description: page.description,
			inLanguage: page.lang,
			publisher: { '@id': `${base}/#organization` },
		},
		{
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			'@id': `${base}/#navigation`,
			name: page.name,
			itemListElement: SITE_NAV.map((l, i) => ({
				'@type': 'SiteNavigationElement',
				position: i + 1,
				name: l.name,
				description: l.description,
				url: `${base}${l.path}`,
			})),
		},
	];
}
