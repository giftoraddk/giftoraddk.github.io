// src/sections/another/products/bestSeller.js
//
// Ported from astro-micro's src/sections/products/modernSlideBestSeller.js — slider quà bán chạy (header + each '$records' render slider).

import { getStyleOpts } from '../../helper.js';

export const hashtags = ["gifts","modern","slider","products","bestseller","cards"];

export const data = [
    {
        "id": 1,
        "title": "RELAX & GLOW",
        "pics": "/images/common/gift-1.webp",
        "score": "5~124",
        "pricing": "799000"
    },
    {
        "id": 2,
        "title": "SCENT & SOUND",
        "pics": "/images/common/gift-2.webp",
        "score": "5~89",
        "pricing": "975000"
    },
    {
        "id": 3,
        "title": "DAILY GROW",
        "pics": "/images/common/gift-3.webp",
        "score": "5~156",
        "pricing": "735000"
    },
    {
        "id": 4,
        "title": "HARMONY & MUSIC",
        "pics": "/images/common/gift-4.webp",
        "score": "5~106",
        "pricing": "835000"
    }
];

export const config = {
    "style": {
        "padding": "3rem 0"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "gradient": false
        }) },
    "children": [
        {
            "layout": {
                "col": "12",
                "row": "auto"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "alignItems": "center",
                        "gap": "1.5rem",
                        "padding": "0 0 2.5rem"
                    },
                    "children": [
                        {
                            "value": {
                                "vi": "Quà tặng bán chạy",
                                "en": "Best-selling gifts"
                            },
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.5rem)",
                                "fontWeight": "800",
                                "color": "var(--color-primary)",
                                "margin": "0",
                                "whiteSpace": "nowrap"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "driftIn"
                            }
                        },
                        {
                            "value": "",
                            "render": "span",
                            "style": {
                                "display": "block",
                                "flex": "1",
                                "minWidth": "2rem",
                                "height": "1px",
                                "background": "color-mix(in oklab, var(--color-base-content) 20%, transparent)"
                            }
                        },
                        {
                            "value": {
                                "vi": "Xem thêm",
                                "en": "See more"
                            },
                            "render": "a",
                            "style": {
                                "height": "2.5rem",
                                "flexShrink": "0",
                                "color": "var(--color-primary)",
                                "padding": "0 1rem",
                                "display": "flex",
                                "justifyContent": "center",
                                "alignItems": "center"
                            },
                            "props": {
                                "suffix": "ri:arrow-right-s-line",
                                "iconSize": "1rem",
                                "org": "/gift/shop"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "$records",
            "render": "slider",
            "props": {
                "nav": false,
                "loop": true,
                "slides": 3,
                "spacing": 24,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "overflow": "hidden",
                        "borderRadius": "1rem",
                        "marginBottom": "1rem"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "aspectRatio": "1/1",
                                "objectFit": "cover",
                                "display": "block"
                            },
                            "props": {
                                "rounded": "1.75rem"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "marginBottom": "0.4rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "a",
                            "style": {
                                "display": "block",
                                "fontSize": "clamp(0.75rem, 0.95vw, 0.85rem)",
                                "fontWeight": "700",
                                "letterSpacing": "0.06em",
                                "textTransform": "uppercase",
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            },
                            "props": {
                                "org": "$item.meta.url"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "marginBottom": "0.6rem"
                    },
                    "children": [
                        {
                            "source": "$item.score",
                            "render": "rating",
                            "props": {
                                "size": "sm",
                                "disabled": true,
                                "color": "error",
                                "mask": "mask-star-2"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "children": [
                        {
                            "source": "$item.pricing",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(1.1rem, 1.6vw, 1.375rem)",
                                "fontWeight": "800",
                                "color": "var(--color-primary)"
                            },
                            "props": {
                                "currency": " Đ",
                                "lang": "en-US"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "12",
                "row": "auto"
            }
        }
    ]
};
