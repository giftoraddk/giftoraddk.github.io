// src/sections/another/products/bold.js
//
// Ported from astro-micro's src/sections/products/cardBold.js — card config (1 card / record), root each '$records'.

import { getStyleOpts } from '../../helper.js';

export const hashtags = [
    "products",
    "cafe",
    "cafe",
    "menu",
    "coffee",
    "drink",
    "card"
];

export const data = [
    {
        "id": 1,
        "status": "active",
        "mode": "product",
        "title": "Espresso",
        "description": "Cà phê pha ép kiểu Ý, đậm đặc và thơm nồng.",
        "pics": "https://i.ibb.co/7xR5YY03/espresso.png",
        "tags": "hot|coffee|strong",
        "score": "4.5~1",
        "pricing": "35000~7200~ly"
    }
];

export const config = {
    "each": "$records",
    "style": {
        "padding": "1.75rem",
        "height": "100%",
        "border": "2px solid color-mix(in oklab, var(--color-secondary) 35%, transparent)"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "tint": "var(--color-secondary)",
            "total": 1,
            "gradient": true,
            "blobType": "circleOverlap",
            "deg": 45
        }) },
    "props": {
        "anime": "slide-in-blurred-top"
    },
    "children": [
        {
            "layout": {
                "col": 12,
                "row": "auto",
                "justify": "none"
            },
            "style": {
                "position": "relative",
                "display": "flex",
                "justifyContent": "center",
                "alignItems": "center",
                "minHeight": "160px"
            },
            "children": [
                {
                    "value": "",
                    "render": "span",
                    "style": {
                        "position": "absolute",
                        "top": "50%",
                        "left": "50%",
                        "transform": "translate(-50%, -50%) rotate(-8deg)",
                        "width": "68%",
                        "aspectRatio": "1/1",
                        "background": "var(--color-primary)",
                        "borderRadius": "1.25rem",
                        "zIndex": "0"
                    }
                },
                {
                    "source": "$item.pics",
                    "render": "gallery",
                    "style": {
                        "width": "62%",
                        "margin": "0 auto",
                        "objectFit": "contain",
                        "position": "relative",
                        "zIndex": "1",
                        "aspectRatio": "1/1",
                        "filter": "drop-shadow(0 10px 14px color-mix(in oklab, var(--color-base-content) 25%, transparent))"
                    }
                },
                {
                    "value": "HOT",
                    "render": "badge",
                    "style": {
                        "position": "absolute",
                        "top": "0.5rem",
                        "left": "-0.5rem",
                        "transform": "rotate(-12deg)",
                        "fontWeight": "800",
                        "letterSpacing": "0.05em",
                        "zIndex": "2",
                        "padding": "0.25rem 1rem"
                    },
                    "props": {
                        "type": "fill",
                        "color": "error"
                    }
                },
                {
                    "source": "$item.description",
                    "render": "popover",
                    "style": {
                        "position": "absolute",
                        "top": "0",
                        "right": "0",
                        "zIndex": "2"
                    },
                    "props": {
                        "icon": "ri:information-line",
                        "ui": "modern",
                        "placement": "bottom-end",
                        "iconSize": "1.25rem"
                    }
                }
            ]
        },
        {
            "layout": {
                "col": 12,
                "row": "auto",
                "justify": "left"
            },
            "style": {
                "marginBottom": "0"
            },
            "children": [
                {
                    "source": "$item.tags",
                    "render": "tags"
                }
            ]
        },
        {
            "layout": {
                "col": 12,
                "row": "auto",
                "justify": "none"
            },
            "style": {
                "marginBottom": "0.75rem",
                "gap": "0.5rem"
            },
            "children": [
                {
                    "source": "$item.title",
                    "render": "a",
                    "style": {
                        "display": "block",
                        "fontSize": "clamp(1.375rem, 2.2vw, 1.75rem)",
                        "fontWeight": "800",
                        "color": "var(--color-base-description)",
                        "lineHeight": "1.1",
                        "margin": "0"
                    },
                    "props": {
                        "org": "$item.meta.url"
                    }
                },
                {
                    "source": "$item.score",
                    "render": "rating",
                    "props": {
                        "size": "md",
                        "disabled": true,
                        "color": "error",
                        "mask": "mask-star-2"
                    }
                }
            ]
        },
        {
            "layout": {
                "col": 12,
                "row": "auto",
                "justify": "between"
            },
            "style": {
                "marginBottom": "0"
            },
            "children": [
                {
                    "source": "$item.pricing",
                    "render": "span",
                    "style": {
                        "fontSize": "clamp(1.375rem, 2.2vw, 1.75rem)",
                        "fontWeight": "900",
                        "color": "var(--color-primary)"
                    },
                    "props": {
                        "currency": "đ"
                    }
                },
                {
                    "value": "",
                    "render": "button",
                    "props": {
                        "prefix": "ri:shopping-cart-line",
                        "iconSize": "1rem",
                        "ui": "modern",
                        "type": "fill",
                        "color": "primary",
                        "height": "45px",
                        "rounded": "8px",
                        "action": "add-to-cart"
                    }
                }
            ]
        }
    ]
};
