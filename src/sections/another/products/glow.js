// src/sections/another/products/glow.js
//
// Ported from astro-micro's src/sections/products/cardGlow.js — card config (1 card / record), root each
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
    ui: "pastel",
    style: {
        padding: "1.75rem",
        height: "100%"
    },
    bg: { ...getStyleOpts({
        rounded: "0",
        tint: "var(--color-info)",
        total: 4,
        gradient: true,
        blur: true,
        blobType: "circleOverlap",
        deg: 200
    }) },
    props: {
        anime: "swirl-in-fwd"
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
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "160px"
            },
            children: [
                {
                    value: "",
                    render: "span",
                    style: {
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "86%",
                        aspectRatio: "1/1",
                        background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
                        opacity: "0.35",
                        zIndex: "0"
                    }
                },
                {
                    source: "$item.pics",
                    render: "gallery",
                    style: {
                        width: "60%",
                        margin: "0 auto",
                        objectFit: "contain",
                        position: "relative",
                        zIndex: "1"
                    }
                },
                {
                    source: "$item.description",
                    render: "popover",
                    style: {
                        position: "absolute",
                        top: "0",
                        right: "0",
                        zIndex: "2"
                    },
                    props: {
                        icon: "ri:information-line",
                        ui: "pastel",
                        placement: "bottom-end",
                        iconSize: "1.25rem"
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
                marginBottom: "0"
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
                marginBottom: "0.75rem",
                gap: "0.5rem"
            },
            children: [
                {
                    source: "$item.title",
                    render: "a",
                    style: {
                        display: "block",
                        fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                        fontWeight: "600",
                        color: "var(--color-base-description)",
                        lineHeight: "1.1",
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
                        color: "primary",
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
                        color: "var(--color-base-description)",
                        textShadow: "0 0 12px color-mix(in oklab, var(--color-primary) 40%, transparent)"
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
                        ui: "pastel",
                        type: "fill",
                        color: "primary",
                        height: "45px",
                        rounded: "999px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
