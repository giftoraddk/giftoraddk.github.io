// src/sections/another/cards/productSeo.js
//
// Ported from astro-micro's src/sections/another/_cardProductSeo.js — card config cho trang GEO/SEO
// của products (product/index, product/tag/*, ProductDetail). Field bám dữ liệu thật của products
// (pics/title/tags/score/pricing/description); điều hướng qua meta.url/meta.ctaLabel, không có giỏ hàng.

import { getStyleOpts } from '../../helper.js';

export const hashtags = ['products', 'modern', 'seo', 'geo', 'card', 'ecommerce'];

export const data = [
    {
        id: 1, status: 'active', mode: 'product',
        title: 'Hộp quà tặng sinh nhật',
        description: 'Set quà tặng trang trí sẵn, giao nhanh trong ngày.',
        pics: 'https://i.ibb.co/21HNHKW8/shoes.jpg',
        tags: 'gift|birthday',
        score: '4.8~32',
        pricing: '299000~180000~hộp',
        meta: { url: '#', ctaLabel: 'Xem chi tiết' },
    },
];

export const config = {
    each: '$records',
    ui: 'pastel',
    style: { padding: '1.75rem', height: '100%' },
    bg: { ...getStyleOpts({ rounded: '1.75rem', tint: 'var(--color-primary)', total: 1 }) },
    props: { anime: 'bounce-in-left' },
    children: [
        // Ảnh — backdrop elip sau ảnh + popover mô tả góc phải
        {
            layout: { col: 12, row: 'auto', justify: 'center' },
            // padding 20% ngang → ảnh (width 100%) = 60% bề ngang card như bản gốc
            style: { overflow: 'hidden', position: 'relative', alignItems: 'center', padding: '0 20%' },
            children: [
                // Khung absolute phủ kín nhóm, căn giữa hình vuông 75% (padding 12.5% mỗi bên)
                {
                    style: {
                        position: 'absolute', inset: '0', zIndex: '0',
                        height: '100%', padding: '0 12.5%', alignItems: 'center',
                    },
                    children: [
                        {
                            value: '', render: 'span',
                            style: {
                                display: 'block', width: '100%', aspectRatio: '1/1',
                                background: 'var(--color-primary)',
                                clipPath: 'ellipse(50% 40% at 50% 100%)',
                            },
                        },
                    ],
                },
                {
                    source: '$item.pics', render: 'gallery',
                    style: { width: '100%', objectFit: 'contain', position: 'relative', zIndex: '1' },
                    props: { org: '$item.meta.url' },
                },
                {
                    source: '$item.description', render: 'popover',
                    style: { position: 'absolute', top: '0', right: '0', zIndex: '2' },
                    props: { icon: 'ri:information-line', ui: 'pastel', placement: 'bottom-end', iconSize: '1.25rem' },
                },
            ],
        },
        // Title + rating — title đi thẳng meta.url
        {
            layout: { col: 12, row: 'auto', justify: 'left' },
            style: { marginBottom: '0' },
            children: [
                {
                    source: '$item.title', render: 'a',
                    style: {
                        display: 'block',
                        fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
                        fontWeight: '400',
                        color: 'var(--color-base-description)',
                        lineHeight: '1.1',
                        margin: '0',
                    },
                    props: { org: '$item.meta.url' },
                },
                { source: '$item.score', render: 'rating', props: { size: 'xs', disabled: true, color: 'primary', mask: 'mask-star-2' } },
            ],
        },
        // Tags
        {
            layout: { col: 12, row: 'auto', justify: 'left' },
            style: { marginBottom: '0.75rem', gap: '0.5rem' },
            children: [{ source: '$item.tags', render: 'tags' }],
        },
        // Giá + CTA — trang GEO/SEO chỉ dẫn tới detail, không add-to-cart
        {
            layout: { col: 12, row: 'auto', justify: 'between' },
            style: { marginBottom: '0' },
            children: [
                {
                    source: '$item.pricing', render: 'span',
                    style: {
                        fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
                        fontWeight: '900',
                        color: 'var(--color-base-description)',
                    },
                    props: { currency: 'đ' },
                },
                {
                    source: '$item.meta.ctaLabel', render: 'a',
                    style: {
                        height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 1rem', borderRadius: '12px',
                        background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                    },
                    props: { org: '$item.meta.url', suffix: 'ri:arrow-right-s-line', iconSize: '1rem' },
                },
            ],
        },
    ],
};
