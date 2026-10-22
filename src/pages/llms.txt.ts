// llms.txt (llmstxt.org) — bản tóm tắt giftoraddk.com dạng Markdown thuần cho AI Search/LLM crawler đọc nhanh, không
// cần tự trích từ HTML. Cùng khung build-time với sitemap.xml.ts/rss.xml.ts, tái dùng đúng fetchCollection() (build-cache
// dùng chung, không fetch lại collection lần 2). Chỉ nhắc tới trang có build (builtUrl, site.pages).
// GEO: phần đầu là các câu tự đủ nghĩa về doanh nghiệp (ai, bán gì, ở đâu, liên hệ, giờ làm việc) — AI hay trích nguyên
// câu; tên / địa chỉ / số điện thoại lấy từ modules/company.js để khớp từng chữ với footer, chính sách và JSON-LD.
import { fetchCollection } from '@/services/core/fetcher.server.js';
import { site, builtUrl } from '@/services/tools/site';
import { productSlug, postSlug, tagSlugMap } from '@/services/tools/util';
import { page as homePage, shopPage, ZALO } from '@/modules/gift/meta.js';
import { GIFT_GROUPS } from '@/modules/gift/nav.js';
import { company, companyHours, companySocials } from '@/modules/company.js';

// File kiến thức của trợ lý chọn quà (public/data) — tệp tĩnh, luôn có mặt cùng trang chủ.
const KNOWLEDGE_JSON = '/data/gift.json';

const DAY_VI: Record<string, string> = {
    Monday: 'Thứ 2', Tuesday: 'Thứ 3', Wednesday: 'Thứ 4', Thursday: 'Thứ 5', Friday: 'Thứ 6', Saturday: 'Thứ 7', Sunday: 'Chủ nhật',
};

type Link = [path: string, label: string, note?: string];

function stripHtml(html: string): string {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** "Thứ 2 – Thứ 6: 08:00–17:30; Thứ 7: 08:00–12:00" */
const hoursText = () => companyHours
    .map((h) => {
        const days = h.days.map((d) => DAY_VI[d] ?? d);
        return `${days.length > 1 ? `${days[0]} – ${days.at(-1)}` : days[0]}: ${h.opens}–${h.closes}`;
    })
    .join('; ');

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
    const socials = companySocials.filter((s) => /^https?:\/\//.test(s.href));

    const lines = [
        `# ${site.subtitle}`,
        '',
        `> ${site.description}`,
        '',
        '## Thông tin doanh nghiệp',
        '',
        `- Pháp nhân: ${company.name.vi} (${company.name.en}), mã số thuế ${company.taxNumber}.`,
        `- Địa chỉ: ${company.address}.`,
        `- Hotline / Zalo: ${company.hotline} — nhận báo giá qua Zalo: ${ZALO}.`,
        `- Email: ${company.email}.`,
        `- Giờ làm việc: ${hoursText()}.`,
        '- Khu vực phục vụ: giao hàng toàn quốc (Việt Nam), nhận đơn số lượng lớn cho doanh nghiệp.',
        '- Thanh toán: chuyển khoản ngân hàng hoặc tiền mặt khi nhận hàng (COD).',
        ...(socials.length ? [`- Mạng xã hội: ${socials.map((s) => `[${s.text}](${s.href})`).join(', ')}.`] : []),
        '',
        ...section('Trang chính', homePage.path, [
            [homePage.path, homePage.name, homePage.description],
            [shopPage.path, shopPage.name, shopPage.description],
            [KNOWLEDGE_JSON, 'Kiến thức Giftora DDK (JSON)', 'sản phẩm, dịch vụ, giá theo ngân sách, giao hàng, thanh toán, đổi trả và liên hệ — tiếng Việt'],
            ['/product/', 'Quà tặng & sản phẩm', 'toàn bộ mẫu quà, lọc theo danh mục, so sánh giá'],
            ['/product/tag/', 'Danh mục sản phẩm', 'mọi danh mục quà kèm số mẫu trong từng danh mục'],
            ['/post/', 'Cẩm nang quà tặng', 'ý tưởng chọn quà theo dịp, đối tượng và ngân sách'],
            ['/post/tag/', 'Chủ đề bài viết'],
        ]),
        // Đối tượng · ngân sách · dịch vụ · chính sách (modules/gift/nav.js — cùng nguồn getStaticPaths của các trang /gift/*)
        ...GIFT_GROUPS.flatMap((g) => section(g.title, homePage.path, g.links.map((l): Link => [l.path, l.name, l.description]))),
        ...section('Sản phẩm', '/product/', products.slice(0, 100).map((p: any): Link => [`/product/${productSlug(p)}/`, p.title, excerpt(p)]), '(chưa có sản phẩm)'),
        ...section('Bài viết', '/post/', posts.slice(0, 100).map((p: any): Link => [`/post/${postSlug(p)}/`, p.title, excerpt(p)]), '(chưa có bài viết)'),
        ...section('Danh mục sản phẩm theo từ khoá', '/product/', [...tagSlugMap(products)].map(([slug, { label }]): Link => [`/product/tag/${slug}/`, label]), '(chưa có danh mục)'),
        ...section('Chủ đề bài viết theo từ khoá', '/post/', [...tagSlugMap(posts)].map(([slug, { label }]): Link => [`/post/tag/${slug}/`, label]), '(chưa có chủ đề)'),
    ];

    return new Response(lines.join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
