// src/sections/sliders/showcaseGalleryStrip.js
//
// Ported from astro-micro's src/sections/showcase/modernGalleryStrip.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: showcaseGalleryStrip (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["gifts","modern","gallery","image","filmstrip","intro"];

export const data = [
    {
        "title": {
            "vi": "Hình ảnh nổi bật",
            "en": "Featured gallery"
        },
        "description": "\"The meaning, purpose and stories behind the each item are lovely\"",
        "slider": [
            {
                "pics": "/images/common/gift-a.webp"
            },
            {
                "pics": "/images/common/gift-b.webp"
            },
            {
                "pics": "/images/common/gift-c.webp"
            },
            {
                "pics": "/images/common/gift-d.webp"
            },
            {
                "pics": "/images/common/gift-e.webp"
            }
        ]
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
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "alignItems": "center",
                        "padding": "0 0 2.5rem"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.5rem)",
                                "fontWeight": "800",
                                "letterSpacing": "0.02em",
                                "color": "var(--color-primary)",
                                "margin": "0",
                                "textAlign": "center"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "swingIn"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.95rem, 1.3vw, 1.125rem)",
                                "fontStyle": "italic",
                                "color": "color-mix(in oklab, var(--color-base-content) 70%, transparent)",
                                "margin": "0.75rem 0 0",
                                "textAlign": "center",
                                "maxWidth": "40rem"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "slider",
            "render": "slider",
            "props": {
                "marquee": true,
                "autoplay": 10000,
                "reverse": false,
                "loop": true,
                "mode": "free",
                "slides": 3.5,
                "spacing": 20,
                "nav": false,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "overflow"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "height": "26rem",
                                "objectFit": "cover",
                                "display": "block"
                            },
                            "props": {
                                "rounded": "1.25rem"
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
