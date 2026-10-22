// sitemap.xml — endpoint build-time (output:'static' => prerendered), cùng nguồn dữ liệu
// getStaticPaths() của post/[id].astro + product/[id].astro dùng (fetchCollection), nên URL trong
// sitemap luôn khớp với URL thật đã build ra. Không cần package @astrojs/sitemap: chỉ vài chục
// URL cố định + 2 collection, viết tay rẻ hơn thêm 1 integration mới.
import { fetchCollection } from '@/services/core/fetcher.server.js';
import { site, builtUrl } from '@/services/tools/site';
import { productSlug, postSlug, tagSlugMap } from '@/services/tools/util';
import { shopPage } from '@/modules/gift/meta.js';
import { GIFT_GROUPS } from '@/modules/gift/nav.js';

// GIFT_GROUPS (modules/gift/nav.js) — đối tượng, ngân sách, dịch vụ, chính sách: cùng nguồn getStaticPaths() của
// src/pages/gift/[group].astro / service/[slug].astro / policy/[slug].astro, nên URL luôn khớp URL thật đã build.
// Thứ tự nhóm = thứ tự GIFT_GROUPS; chính sách (nhóm cuối) ít đổi, ưu tiên thấp.
const GROUP_RANK: [changefreq: string, priority: string][] = [['weekly', '0.8'], ['weekly', '0.7'], ['monthly', '0.6'], ['yearly', '0.3']];

const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const toIso = (v: unknown): string | null => {
    if (!v) return null;
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function urlEntry(loc: string, lastmod?: string | null, changefreq = 'weekly', priority = '0.5') {
    return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
    ].filter(Boolean).join('\n');
}

export async function GET() {
    const base = site.domain.replace(/\/$/, '');
    // Collection chỉ tải khi trang của nó được build (site.pages).
    const collectionOf = (path: string, table: string) => (builtUrl(path) ? fetchCollection(table) : Promise.resolve([]));
    const [posts, products] = await Promise.all([
        collectionOf('/post/', 'posts'),
        collectionOf('/product/', 'products'),
    ]);

    // Trang tag — cùng tagSlugMap() mà product/tag/[tag].astro và post/tag/[tag].astro dùng cho
    // getStaticPaths(), đảm bảo URL luôn khớp (xem services/helper.js).
    const productTagSlugs = [...tagSlugMap(products).keys()];
    const postTagSlugs = [...tagSlugMap(posts).keys()];

    // [path, lastmod, changefreq, priority] — chỉ URL có build (builtUrl, site.pages) mới vào sitemap.
    const urls: [string, string | null, string, string][] = [
        // '/' = trang chủ Giftora (pages/index.astro); /gift/ chỉ chuyển về '/' nên không có ở đây.
        ['/', null, 'weekly', '1.0'],
        [shopPage.path, null, 'daily', '0.9'],
        ['/product/', null, 'daily', '0.8'],
        ['/product/tag/', null, 'weekly', '0.6'],
        ['/post/', null, 'daily', '0.7'],
        ['/post/tag/', null, 'weekly', '0.6'],
        ...GIFT_GROUPS.flatMap((g, i) => g.links.map((l): [string, null, string, string] => [l.path, null, ...(GROUP_RANK[i] ?? GROUP_RANK[2])])),
        ...products.map((p: any): [string, string | null, string, string] => [`/product/${productSlug(p)}/`, toIso(p.updated_at ?? p.created_at), 'weekly', '0.7']),
        ...posts.map((p: any): [string, string | null, string, string] => [`/post/${postSlug(p)}/`, toIso(p.updated_at ?? p.created_at), 'weekly', '0.6']),
        ...productTagSlugs.map((slug): [string, null, string, string] => [`/product/tag/${slug}/`, null, 'weekly', '0.5']),
        ...postTagSlugs.map((slug): [string, null, string, string] => [`/post/tag/${slug}/`, null, 'weekly', '0.5']),
    ];
    const entries = urls.filter(([path]) => builtUrl(path)).map(([path, ...rest]) => urlEntry(`${base}${path}`, ...rest));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
}
