// llms.txt (llmstxt.org) — bản tóm tắt site dạng Markdown thuần cho AI Search/LLM crawler đọc
// nhanh, không cần tự trích từ HTML. Cùng khung build-time với sitemap.xml.ts/rss.xml.ts, tái
// dùng đúng fetchCollection() (build-cache dùng chung, không fetch lại collection lần 2).
import { fetchCollection } from '@/services/firestore.server.ts';
import { site } from '@/services/constants/site.js';
import { productSlug, postSlug, tagSlugMap } from '@/services/helper.js';

function stripHtml(html: string): string {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
    const base = site.domain.replace(/\/$/, '');
    const [posts, products] = await Promise.all([
        fetchCollection('posts'),
        fetchCollection('products'),
    ]);

    const productLines = products
        .slice(0, 100)
        .map((p: any) => `- [${p.title}](${base}/product/${productSlug(p)}/): ${p.description || stripHtml(p.content).slice(0, 140)}`);

    const postLines = posts
        .slice(0, 100)
        .map((p: any) => `- [${p.title}](${base}/post/${postSlug(p)}/): ${p.description || stripHtml(p.content).slice(0, 140)}`);

    const productTagLines = [...tagSlugMap(products)].map(([slug, { label }]) => `- [${label}](${base}/product/tag/${slug}/)`);
    const postTagLines = [...tagSlugMap(posts)].map(([slug, { label }]) => `- [${label}](${base}/post/tag/${slug}/)`);

    const lines = [
        `# ${site.subtitle}`,
        '',
        `> ${site.description}`,
        '',
        '## Trang chính',
        '',
        `- [Trang chủ](${base}/gift/)`,
        `- [Cửa hàng](${base}/gift/shop)`,
        `- [Danh sách sản phẩm](${base}/product/)`,
        `- [Danh sách bài viết](${base}/post/)`,
        '',
        '## Sản phẩm',
        '',
        ...(productLines.length > 0 ? productLines : ['(chưa có sản phẩm)']),
        '',
        '## Bài viết',
        '',
        ...(postLines.length > 0 ? postLines : ['(chưa có bài viết)']),
        '',
        '## Danh mục sản phẩm theo từ khoá',
        '',
        ...(productTagLines.length > 0 ? productTagLines : ['(chưa có danh mục)']),
        '',
        '## Danh mục bài viết theo từ khoá',
        '',
        ...(postTagLines.length > 0 ? postTagLines : ['(chưa có danh mục)']),
        '',
    ];

    return new Response(lines.join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
