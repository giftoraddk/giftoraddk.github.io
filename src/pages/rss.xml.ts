// rss.xml — Head/Base.astro (mọi trang) đã emit <link rel="alternate" href="/rss.xml"> từ trước,
// nhưng file này chưa từng tồn tại (404) — endpoint này lấp đúng chỗ đó. Cùng khung build-time với
// sitemap.xml.ts, dùng lại fetchCollection('posts') (build-cache dùng chung, không fetch lại).
import { fetchCollection } from '@/services/firestore.server.ts';
import { site } from '@/services/constants/site.js';

const escapeXml = (s: string) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const toRfc822 = (v: unknown): string => {
    const d = v ? new Date(v as string) : new Date(NaN);
    return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
};

export async function GET() {
    const base = site.domain.replace(/\/$/, '');
    const posts = (await fetchCollection('posts'))
        .sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, 50);

    const items = posts.map((p: any) => {
        const link = `${base}/post/${p.id}`;
        const plainText = String(p.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const description = p.description || plainText.slice(0, 300);
        return [
            '    <item>',
            `      <title>${escapeXml(p.title || '')}</title>`,
            `      <link>${link}</link>`,
            `      <guid>${link}</guid>`,
            `      <pubDate>${toRfc822(p.created_at)}</pubDate>`,
            `      <description><![CDATA[${description}]]></description>`,
            '    </item>',
        ].join('\n');
    });

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '  <channel>',
        `    <title>${escapeXml(site.subtitle)}</title>`,
        `    <link>${base}/post/</link>`,
        `    <description>${escapeXml(site.description)}</description>`,
        `    <language>${site.lang}</language>`,
        ...items,
        '  </channel>',
        '</rss>',
        '',
    ].join('\n');

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
}
