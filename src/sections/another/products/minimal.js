// src/sections/another/products/minimal.js
//
// Ported from astro-micro's src/sections/products/cardMinimal.js — card config (1 card / record), root each
// '$records' → web-boxs `masonry`/`list` attribute vẫn đổi được render-mode (xem _effectiveConfig).

import { getStyleOpts } from '../../helper.js';

export const hashtags = ["products","cafe","cafe","menu","coffee","drink","card"];

export const data = [
    {
        id: 1,
        status: "active",
        mode: "product",
        title: "Espresso",
        description: "Cà phê pha ép kiểu Ý, đậm đặc và thơm nồng.",
        pics: "https://i.ibb.co/7xR5YY03/espresso.png",
        tags: "hot|coffee|strong",
        score: "4.5~1",
        pricing: "35000~7200~ly"
    }
];

export const config = {
    each: "$records",
    style: {
        padding: "2rem",
        height: "100%",
        border: "1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent)"
    },
    bg: { ...getStyleOpts({
        rounded: "0",
        hueCustom: 1
    }) },
    props: {
        anime: "fade-in"
    },
    children: [
        {
            layout: {
                col: 12,
                row: "auto",
                justify: "none"
            },
            style: {
                position: "relative",
                margin: "0 0 1.75rem",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "150px"
            },
            children: [
                {
                    source: "$item.pics",
                    render: "gallery",
                    style: {
                        width: "68%",
                        margin: "0 auto",
                        objectFit: "contain"
                    }
                },
                {
                    source: "$item.description",
                    render: "popover",
                    style: {
                        position: "absolute",
                        top: "0",
                        right: "0"
                    },
                    props: {
                        icon: "ri:information-line",
                        ui: "modern",
                        placement: "bottom-end",
                        iconSize: "1.1rem"
                    }
                }
            ]
        },
        {
            layout: {
                col: 12,
                row: "auto",
                justify: "left"
            },
            style: {
                marginBottom: "0.75rem"
            },
            children: [
                {
                    source: "$item.tags",
                    render: "tags"
                }
            ]
        },
        {
            layout: {
                col: 12,
                row: "auto",
                justify: "none"
            },
            style: {
                marginBottom: "1rem",
                gap: "0.35rem",
                borderTop: "1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)",
                paddingTop: "0.85rem"
            },
            children: [
                {
                    source: "$item.title",
                    render: "a",
                    style: {
                        display: "block",
                        fontSize: "clamp(1.125rem, 1.8vw, 1.375rem)",
                        fontWeight: "400",
                        letterSpacing: "0.01em",
                        color: "var(--color-base-description)",
                        lineHeight: "1.2",
                        margin: "0"
                    },
                    props: {
                        org: "$item.meta.url"
                    }
                },
                {
                    source: "$item.score",
                    render: "rating",
                    props: {
                        size: "md",
                        disabled: true,
                        color: "neutral",
                        mask: "mask-star-2"
                    }
                }
            ]
        },
        {
            layout: {
                col: 12,
                row: "auto",
                justify: "between"
            },
            style: {
                marginBottom: "0"
            },
            children: [
                {
                    source: "$item.pricing",
                    render: "span",
                    style: {
                        fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                        fontWeight: "300",
                        color: "var(--color-base-description)"
                    },
                    props: {
                        currency: "đ"
                    }
                },
                {
                    value: "",
                    render: "button",
                    props: {
                        prefix: "ri:shopping-cart-line",
                        iconSize: "0.9rem",
                        ui: "modern",
                        type: "outline",
                        color: "primary",
                        height: "40px",
                        rounded: "999px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
