// src/sections/another/products/ticket.js
//
// Ported from astro-micro's src/sections/products/cardTicket.js — card config (1 card / record), root each
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
        rounded: "1.5rem",
        tint: "var(--color-secondary)",
        total: 2,
        gradient: true,
        blobType: "ellipse",
        deg: 0
    }) },
    props: {
        anime: "slide-in-blurred-top"
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
                margin: "0 0 1.25rem",
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
                        width: "58%",
                        margin: "0 auto",
                        objectFit: "contain"
                    }
                },
                {
                    value: "ƯU ĐÃI",
                    render: "badge",
                    style: {
                        position: "absolute",
                        top: "0.4rem",
                        left: "0.4rem",
                        fontWeight: "700",
                        fontSize: "0.65rem",
                        letterSpacing: "0.05em",
                        zIndex: "2",
                        padding: "0.2rem 0.75rem"
                    },
                    props: {
                        type: "dash",
                        color: "success"
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
                marginBottom: "0.85rem",
                gap: "0.5rem",
                paddingBottom: "0.85rem",
                borderBottom: "2px dashed color-mix(in oklab, var(--color-base-content) 20%, transparent)"
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
                        fontWeight: "500",
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
                        color: "success",
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
                        type: "dash",
                        color: "success",
                        height: "40px",
                        rounded: "12px",
                        action: "add-to-cart"
                    }
                }
            ]
        }
    ]
};
