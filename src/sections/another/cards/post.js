// src/sections/another/cards/post.js
//
// Ported from astro-micro's src/sections/another/_cardPost.js — card config (1 card / record) cho
// trang post (post/index, post/tag/*, PostDetail). Root là each '$records' → web-boxs `masonry`
// attribute vẫn đổi được render-mode (xem _effectiveConfig).

import { getStyleOpts } from '../../helper.js';

export const hashtags = ['products', 'modern', 'post', 'photo', 'social', 'landscape', 'card'];

export const data = [
    {
        id: 1, status: 'active', mode: 'product',
        title: 'This photo was taken by Robert Lukeman',
        pics: 'https://i.ibb.co/S7R6zp64/mountain.jpg',
        tags: 'mountain|travel',
        meta: { views: '27615', likes: '217', url: '#' },
    },
];

// Pill thống kê đè lên góc ảnh — chỉ khác vị trí trái/phải
const statPill = (side) => ({
    position: 'absolute', top: '0.75rem', [side]: '0.75rem',
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.25rem 0.6rem', borderRadius: '999px',
    background: 'color-mix(in oklab, var(--color-base-100) 70%, transparent)',
    color: 'var(--color-base-description)',
    fontSize: '0.8rem',
});

export const config = {
    each: '$records',
    style: {
        padding: '1rem', height: '100%',
        border: '1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent)',
        borderRadius: '.5rem',
    },
    bg: { ...getStyleOpts({ rounded: '0', hueCustom: 1 }) },
    props: { anime: 'fade-in' },
    children: [
        // Ảnh + views/likes đè góc
        {
            layout: { col: 12, row: 'auto', justify: 'none' },
            style: { position: 'relative', marginBottom: '1.75rem' },
            children: [
                {
                    source: '$item.pics', render: 'gallery',
                    style: { width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' },
                    props: { rounded: '.75rem', org: '$item.meta.url' },
                },
                { source: '$item.meta.views', render: 'p', style: statPill('right'), props: { prefix: 'ri:eye-line', iconSize: '1rem' } },
                { source: '$item.meta.likes', render: 'p', style: statPill('left'),  props: { prefix: 'ri:heart-3-line', iconSize: '1rem' } },
            ],
        },
        // Tags
        {
            layout: { col: 12, row: 'auto', justify: 'left' },
            style: { marginBottom: '0.75rem' },
            children: [{ source: '$item.tags', render: 'tags' }],
        },
        // Title → meta.url = '/post/{slug}-{id}/' (postSlug), không phải id thô
        {
            layout: { col: 12, row: 'auto', justify: 'none' },
            style: {
                marginBottom: '0', gap: '0.35rem',
                borderTop: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)',
                paddingTop: '0.85rem',
            },
            children: [
                {
                    source: '$item.title', render: 'a',
                    style: {
                        display: 'block',
                        fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)',
                        fontWeight: '400',
                        letterSpacing: '0.01em',
                        color: 'var(--color-base-description)',
                        lineHeight: '1.2',
                        margin: '0',
                    },
                    props: { org: '$item.meta.url' },
                },
            ],
        },
    ],
};
