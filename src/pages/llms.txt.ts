// llms.txt (llmstxt.org) — bản tóm tắt site dạng Markdown thuần cho AI Search/LLM crawler đọc
// nhanh, không cần tự trích từ HTML. Cùng khung build-time với sitemap.xml.ts/rss.xml.ts, tái
// dùng đúng fetchCollection() (build-cache dùng chung, không fetch lại collection lần 2).
// Chỉ nhắc tới trang có build (builtUrl, site.pages).
import { fetchCollection } from '@/services/core/fetcher.server.js';
import { site, builtUrl } from '@/services/tools/site';
import { productSlug, postSlug, tagSlugMap } from '@/services/tools/util';
import { page as homePage, shopPage } from '@/modules/gift/meta.js';
import { GIFT_GROUPS } from '@/modules/gift/nav.js';
import { company } from '@/modules/company.js';

// File kiến thức của trợ lý chọn quà (public/data) — tệp tĩnh, luôn có mặt cùng trang chủ.
const KNOWLEDGE_JSON = '/data/gift.json';

type Link = [path: string, label: string, note?: string];

function stripHtml(html: string): string {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
    const base = site.domain.replace(/\/$/, '');
    // Collection chỉ tải khi trang của nó được build — không build /post, /product thì không gọi API.
    const collectionOf = (path: string, table: string) => (builtUrl(path) ? fetchCollection(table) : Promise.resolve([]));
    const [posts, products] = await Promise.all([
        collectionOf('/post/', 'posts'),
        collectionOf('/product/', 'products'),
    ]);

    /**
     * 1 mục Markdown — có mặt khi trang `gate` được build; chỉ giữ link tới trang có build. Hết link thì in `empty`
     * (vd "(chưa có sản phẩm)"), không có `empty` thì bỏ cả mục.
     */
    const section = (title: string, gate: string, links: Link[], empty = ''): string[] => {
        if (!builtUrl(gate)) return [];
        const items = links
            .filter(([path]) => path === KNOWLEDGE_JSON || builtUrl(path))
            .map(([path, label, note]) => `- [${label}](${base}${path})${note ? `: ${note}` : ''}`);
        if (!items.length && !empty) return [];
        return [`## ${title}`, '', ...(items.length ? items : [empty]), ''];
    };
    const excerpt = (p: any) => p.description || stripHtml(p.content).slice(0, 140);

    const lines = [
        `# ${site.subtitle}`,
        '',
        `> ${site.description}`,
        '',
        `${company.name.vi} — MST ${company.taxNumber} — ${company.address} — Hotline/Zalo ${company.hotline} — ${company.email}`,
        '',
        ...section('Trang chính', homePage.path, [
            [homePage.path, homePage.name, homePage.description],
            [shopPage.path, shopPage.name, shopPage.description],
            [KNOWLEDGE_JSON, 'Kiến thức Giftora DDK (JSON)', 'sản phẩm, dịch vụ, giá theo ngân sách, giao hàng, thanh toán, đổi trả và liên hệ — tiếng Việt'],
            ['/product/', 'Danh sách sản phẩm'],
            ['/product/tag/', 'Danh mục sản phẩm'],
            ['/post/', 'Danh sách bài viết'],
            ['/post/tag/', 'Chủ đề bài viết'],
        ]),
        ...GIFT_GROUPS.flatMap((g) => section(g.title, homePage.path, g.links.map((l): Link => [l.path, l.name, l.description]))),
        ...section('Sản phẩm', '/product/', products.slice(0, 100).map((p: any): Link => [`/product/${productSlug(p)}/`, p.title, excerpt(p)]), '(chưa có sản phẩm)'),
        ...section('Bài viết', '/post/', posts.slice(0, 100).map((p: any): Link => [`/post/${postSlug(p)}/`, p.title, excerpt(p)]), '(chưa có bài viết)'),
        ...section('Danh mục sản phẩm theo từ khoá', '/product/', [...tagSlugMap(products)].map(([slug, { label }]): Link => [`/product/tag/${slug}/`, label]), '(chưa có danh mục)'),
        ...section('Danh mục bài viết theo từ khoá', '/post/', [...tagSlugMap(posts)].map(([slug, { label }]): Link => [`/post/tag/${slug}/`, label]), '(chưa có danh mục)'),
    ];

    return new Response(lines.join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
