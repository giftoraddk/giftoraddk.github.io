// src/sections/another/products/base.js
//
// Ported from astro-micro's src/sections/products/cardBase.js — card config (1 card / record), root each
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
        rounded: "1.75rem",
        tint: "var(--color-primary)",
        total: 1
    }) },
    props: {
        anime: "bounce-in-left"
    },
    children: [
        {
            layout: {
                col: 12,
                row: "auto",
                justify: "none"
            },
            style: {
                overflow: "hidden",
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            },
            children: [
                {
                    value: "",
                    render: "span",
                    style: {
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        position: "absolute",
                        width: "75%",
                        aspectRatio: "1/1",
                        background: "var(--color-primary)",
                        clipPath: "ellipse(50% 40% at 50% 100%)",
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
                justify: "left"
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
                        fontWeight: "400",
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
                        type: "fill",
                        color: "primary",
                        height: "40px",
                        rounded: "12px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
