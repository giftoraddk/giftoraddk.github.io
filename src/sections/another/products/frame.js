// src/sections/another/products/frame.js
//
// Ported from astro-micro's src/sections/products/cardFrame.js — card config (1 card / record), root each
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
        height: "100%",
        border: "1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)"
    },
    bg: { ...getStyleOpts({
        rounded: "0",
        tint: "var(--color-warning)",
        total: 1,
        gradient: true,
        blur: true,
        blobType: "circleOverlap",
        deg: 180
    }) },
    props: {
        anime: "fade-in-bck"
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
                    value: "",
                    render: "span",
                    style: {
                        position: "absolute",
                        width: "1.25rem",
                        height: "1.25rem",
                        zIndex: "2",
                        top: "0",
                        borderTop: "2px solid var(--color-primary)",
                        left: "0",
                        borderLeft: "2px solid var(--color-primary)"
                    }
                },
                {
                    value: "",
                    render: "span",
                    style: {
                        position: "absolute",
                        width: "1.25rem",
                        height: "1.25rem",
                        zIndex: "2",
                        top: "0",
                        borderTop: "2px solid var(--color-primary)",
                        right: "0",
                        borderRight: "2px solid var(--color-primary)"
                    }
                },
                {
                    value: "",
                    render: "span",
                    style: {
                        position: "absolute",
                        width: "1.25rem",
                        height: "1.25rem",
                        zIndex: "2",
                        bottom: "0",
                        borderBottom: "2px solid var(--color-primary)",
                        left: "0",
                        borderLeft: "2px solid var(--color-primary)"
                    }
                },
                {
                    value: "",
                    render: "span",
                    style: {
                        position: "absolute",
                        width: "1.25rem",
                        height: "1.25rem",
                        zIndex: "2",
                        bottom: "0",
                        borderBottom: "2px solid var(--color-primary)",
                        right: "0",
                        borderRight: "2px solid var(--color-primary)"
                    }
                },
                {
                    source: "$item.description",
                    render: "popover",
                    style: {
                        position: "absolute",
                        top: "0",
                        right: "1.5rem",
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
                        fontSize: "clamp(1.1rem, 1.8vw, 1.375rem)",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
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
                        size: "xs",
                        disabled: true,
                        color: "info",
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
                        borderBottom: "2px solid color-mix(in oklab, var(--color-primary) 45%, transparent)",
                        paddingBottom: "0.15rem"
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
                        type: "ghost",
                        color: "primary",
                        height: "40px",
                        rounded: "6px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
