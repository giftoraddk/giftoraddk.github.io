// src/sections/another/products/maverick.js
//
// Ported from astro-micro's src/sections/products/cardMaverick.js — card config (1 card / record), root each '$records'.

import { getStyleOpts } from '../../helper.js';

export const hashtags = [];

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
        "padding": "1.5rem",
        "height": "100%"
    },
    "bg": { ...getStyleOpts({
            "rounded": "1.75rem",
            "tint": "var(--color-primary)",
            "total": 2
        }) },
    "props": {
        "anime": "fade-in-fwd"
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
                "margin": "0 0 1.25rem",
                "display": "flex",
                "justifyContent": "center",
                "alignItems": "center",
                "minHeight": "140px"
            },
            "children": [
                {
                    "value": "",
                    "render": "span",
                    "style": {
                        "position": "absolute",
                        "top": "-15%",
                        "left": "-10%",
                        "width": "81%",
                        "aspectRatio": "1/1",
                        "background": "var(--color-primary)",
                        "borderRadius": "50%",
                        "opacity": "0.12",
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
                        "zIndex": "1"
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
                        "ui": "pastel",
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
                "marginBottom": "0.6rem",
                "flexDirection": "column",
                "alignItems": "flex-start",
                "gap": "0.2rem"
            },
            "children": [
                {
                    "source": "$item.brand",
                    "render": "span",
                    "style": {
                        "fontSize": "clamp(0.7rem, 1vw, 0.75rem)",
                        "fontWeight": "600",
                        "opacity": "0.45",
                        "textTransform": "uppercase",
                        "letterSpacing": "0.06em"
                    }
                },
                {
                    "source": "$item.title",
                    "render": "a",
                    "style": {
                        "display": "block",
                        "fontSize": "clamp(1.25rem, 2vw, 1.75rem)",
                        "color": "var(--color-base-description)",
                        "lineHeight": "1.2",
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
                        "size": "xs",
                        "disabled": true,
                        "color": "warning",
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
                        "fontSize": "clamp(1.25rem, 2vw, 1.625rem)",
                        "fontWeight": "900",
                        "color": "var(--color-base-description)"
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
                        "height": "40px",
                        "rounded": "12px",
                        "action": "add-to-cart"
                    }
                }
            ]
        }
    ]
};
