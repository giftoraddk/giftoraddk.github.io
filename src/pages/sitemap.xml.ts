// sitemap.xml — endpoint build-time (output:'static' => prerendered), cùng nguồn dữ liệu
// getStaticPaths() của post/[id].astro + product/[id].astro dùng (fetchCollection), nên URL trong
// sitemap luôn khớp với URL thật đã build ra. Không cần package @astrojs/sitemap: chỉ vài chục
// URL cố định + 2 collection, viết tay rẻ hơn thêm 1 integration mới.
import { fetchCollection } from '@/services/firestore.server.ts';
import { site } from '@/services/constants/site.js';
import { occasions } from '@/services/constants/tags.js';
import { productSlug, postSlug, tagSlugMap } from '@/services/helper.js';

// Cùng slice(0, 5) mà src/pages/gift/[occasions].astro dùng cho getStaticPaths() — chỉ 5 dịp
// đầu tiên thực sự được build ra trang tĩnh, không phải toàn bộ danh mục occasions.
const OCCASION_KEYS = Object.keys(occasions.vi).slice(0, 5);

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
    const [posts, products] = await Promise.all([
        fetchCollection('posts'),
        fetchCollection('products'),
    ]);

    // Trang tag — cùng tagSlugMap() mà product/tag/[tag].astro và post/tag/[tag].astro dùng cho
    // getStaticPaths(), đảm bảo URL luôn khớp (xem services/helper.js).
    const productTagSlugs = [...tagSlugMap(products).keys()];
    const postTagSlugs = [...tagSlugMap(posts).keys()];

    const entries: string[] = [
        urlEntry(`${base}/`, null, 'monthly', '1.0'),
        urlEntry(`${base}/gift/`, null, 'weekly', '1.0'),
        urlEntry(`${base}/gift/shop`, null, 'daily', '0.9'),
        urlEntry(`${base}/post/`, null, 'daily', '0.7'),
        urlEntry(`${base}/product/`, null, 'daily', '0.8'),
        ...OCCASION_KEYS.map((key) => urlEntry(`${base}/gift/${key}`, null, 'weekly', '0.8')),
        ...posts.map((p: any) => urlEntry(`${base}/post/${postSlug(p)}/`, toIso(p.updated_at ?? p.created_at), 'weekly', '0.6')),
        ...products.map((p: any) => urlEntry(`${base}/product/${productSlug(p)}/`, toIso(p.updated_at ?? p.created_at), 'weekly', '0.7')),
        ...productTagSlugs.map((slug) => urlEntry(`${base}/product/tag/${slug}/`, null, 'weekly', '0.5')),
        ...postTagSlugs.map((slug) => urlEntry(`${base}/post/tag/${slug}/`, null, 'weekly', '0.5')),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
}
