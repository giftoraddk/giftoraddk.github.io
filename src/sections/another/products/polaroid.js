// src/sections/another/products/polaroid.js
//
// Ported from astro-micro's src/sections/products/cardPolaroid.js — card config (1 card / record), root each
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
        padding: "1.75rem 1.75rem 1.5rem",
        height: "100%"
    },
    bg: { ...getStyleOpts({
        rounded: "1.5rem",
        tint: "var(--color-warning)",
        total: 1,
        gradient: true,
        blobType: "circleOverlap",
        deg: 290
    }) },
    props: {
        anime: "rotate-in-ccw"
    },
    children: [
        {
            layout: {
                col: 12,
                row: "auto",
                justify: "center"
            },
            style: {
                position: "relative",
                margin: "0 0 1.25rem",
                display: "flex",
                justifyContent: "center",
                transform: "rotate(-3deg)"
            },
            children: [
                {
                    source: "$item.pics",
                    render: "gallery",
                    style: {
                        width: "70%",
                        padding: "1rem",
                        aspectRatio: "1/1",
                        objectFit: "cover",
                        border: "0.9rem solid color-mix(in oklab, var(--color-base-100) 85%, transparent)",
                        borderRadius: "0.15rem",
                        boxShadow: "0 6px 8px color-mix(in oklab, var(--color-base-content) 30%, transparent)"
                    }
                },
                {
                    value: "",
                    render: "span",
                    style: {
                        position: "absolute",
                        top: "-0.6rem",
                        left: "40%",
                        transform: "translateX(-50%) rotate(-1deg)",
                        width: "3.5rem",
                        height: "1.1rem",
                        zIndex: "2",
                        background: "color-mix(in oklab, var(--color-primary) 55%, transparent)",
                        boxShadow: "0 2px 4px color-mix(in oklab, var(--color-base-content) 15%, transparent)"
                    }
                },
                {
                    source: "$item.description",
                    render: "popover",
                    style: {
                        position: "absolute",
                        top: "0",
                        right: "0.5rem",
                        zIndex: "2"
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
                justify: "center"
            },
            style: {
                marginBottom: "0.75rem",
                gap: "0.5rem"
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
                justify: "center"
            },
            style: {
                marginBottom: "1rem",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.3rem"
            },
            children: [
                {
                    source: "$item.title",
                    render: "a",
                    style: {
                        display: "block",
                        fontSize: "clamp(1.125rem, 1.8vw, 1.375rem)",
                        fontWeight: "500",
                        fontStyle: "italic",
                        textAlign: "center",
                        color: "var(--color-base-description)",
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
                        color: "secondary",
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
                        fontSize: "clamp(1.25rem, 2vw, 1.625rem)",
                        fontWeight: "900",
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
                        iconSize: "1rem",
                        ui: "modern",
                        type: "soft",
                        color: "secondary",
                        height: "40px",
                        rounded: "12px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
