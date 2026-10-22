// src/modules/system/nav.js — các mục con ĐƯỢC INDEX của trang chủ AI Operations (ứng viên sitelinks của Google): trang
// Hướng dẫn + không gian làm việc từng ngành đã phát hành (SECTOR_FACES `released`). 1 nguồn cho JSON-LD trang chủ
// (WebSite + SiteNavigationElement, pages/index.astro), <noscript> của /system/<ngành>, sitemap.xml và llms.txt.
// Trang noindex (pricing — trang thao tác; ngành chưa phát hành) không có ở đây: Google không lấy sitelink từ trang noindex.
import { SECTOR_FACES } from '@/packages/llm/tool/sectors.js'
import { SITE, page, docsPage, sectorPage } from './meta.js'

const base = SITE.replace(/\/$/, '')

/** [{ id, name, path, title, description }] — ngành đã phát hành, theo thứ tự menu Workspace. */
export const SECTOR_PAGES = SECTOR_FACES.filter((f) => f.released === true).map((f) => ({ id: f.id, name: f.title.en, ...sectorPage(f.id) }))

/** [{ name, path, description }] — mục con của trang chủ, theo thứ tự menu. */
export const SITE_NAV = [
	{ name: docsPage.name, path: docsPage.path, description: docsPage.description },
	...SECTOR_PAGES.map(({ name, path, description }) => ({ name, path, description })),
]

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
	]
}
