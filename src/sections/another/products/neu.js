// src/sections/another/products/neu.js
//
// Ported from astro-micro's src/sections/products/cardNeu.js — card config (1 card / record), root each
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
        padding: "1.75rem",
        height: "100%"
    },
    bg: { ...getStyleOpts({
        rounded: "1.75rem",
        hueCustom: 1
    }) },
    props: {
        anime: "bounce-in-top"
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
                minHeight: "170px"
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
                        width: "68%",
                        aspectRatio: "1/1",
                        borderRadius: "50%",
                        zIndex: "0",
                        background: "var(--color-base-200)",
                        boxShadow: "inset 8px 8px 16px color-mix(in oklab, var(--color-base-content) 14%, transparent), inset -8px -8px 16px color-mix(in oklab, var(--color-base-100) 65%, transparent)"
                    }
                },
                {
                    source: "$item.pics",
                    render: "gallery",
                    style: {
                        width: "48%",
                        margin: "0 auto",
                        objectFit: "contain",
                        position: "relative",
                        zIndex: "1",
                        filter: "drop-shadow(0 6px 10px color-mix(in oklab, var(--color-base-content) 20%, transparent))"
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
                        ui: "modern",
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
                justify: "left"
            },
            style: {
                marginBottom: "0.75rem"
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
                        size: "xs",
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
                    style: {
                        background: "var(--color-base-200)",
                        border: "none",
                        boxShadow: "5px 5px 10px color-mix(in oklab, var(--color-base-content) 16%, transparent), -5px -5px 10px color-mix(in oklab, var(--color-base-100) 70%, transparent)"
                    },
                    props: {
                        prefix: "ri:shopping-cart-line",
                        iconSize: "1rem",
                        ui: "modern",
                        type: "ghost",
                        color: "primary",
                        height: "45px",
                        rounded: "14px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
