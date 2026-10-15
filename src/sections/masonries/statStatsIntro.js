// src/sections/masonries/statStatsIntro.js
//
// Ported from astro-micro's src/sections/stats/modernStatsIntro.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: statStatsIntro (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["gifts","modern","stats","intro","cards"];

export const data = [
    {
        "title": {
            "vi": "Hộp quà theo yêu cầu",
            "en": "Custom gift boxes"
        },
        "meta": {
            "icon": "ri:gift-2-line"
        }
    },
    {
        "title": {
            "vi": "Quà tặng doanh nghiệp",
            "en": "Corporate gifts"
        },
        "meta": {
            "icon": "ri:building-4-line"
        }
    },
    {
        "title": {
            "vi": "Tư vấn thiết kế",
            "en": "Design consulting"
        },
        "meta": {
            "icon": "ri:palette-line"
        }
    },
    {
        "title": {
            "vi": "Liên hệ báo giá",
            "en": "Request a quote"
        },
        "meta": {
            "icon": "ri:price-tag-3-line"
        }
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
            "style": {
                "padding": "0 0 2rem"
            },
            "children": [
                {
                    "layout": {
                        "col": "6",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.25rem"
                    },
                    "children": [
                        {
                            "value": "100+",
                            "render": "h3",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.25rem)",
                                "fontWeight": "800",
                                "color": "var(--color-error)",
                                "margin": "0",
                                "lineHeight": "1.1"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "slideUp",
                                "delay": 30
                            }
                        },
                        {
                            "value": "",
                            "render": "span",
                            "style": {
                                "display": "block",
                                "width": "40px",
                                "height": "2px",
                                "borderRadius": "2px",
                                "background": "linear-gradient(90deg, var(--color-error), transparent)"
                            }
                        },
                        {
                            "value": {
                                "vi": "Món quà",
                                "en": "Gifts"
                            },
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(2rem, 4vw, 3rem)",
                                "fontWeight": "800",
                                "color": "var(--color-error)",
                                "margin": "0",
                                "lineHeight": "1.1",
                                "textTransform": "uppercase"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "slideDown"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "$records",
            "render": "masonry",
            "style": {
                "borderRadius": "1.75rem",
                "background": "color-mix(in oklab, var(--color-base-100) 15%, transparent)",
                "backdropFilter": "blur(25px)",
                "boxShadow": "color-mix(in srgb, var(--color-error) 60%, transparent) 5px 5px,\n                      color-mix(in srgb, var(--color-error) 40%, transparent) 10px 10px,\n                      color-mix(in srgb, var(--color-error) 20%, transparent) 15px 15px"
            },
            "props": {
                "col": 4,
                "gap": "1.25rem",
                "anime": "fade-in",
                "animeQueue": "80ms"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "alignItems": "center",
                        "gap": "1rem",
                        "padding": "1.75rem 1rem 0.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.icon",
                            "render": "icon",
                            "style": {
                                "width": "3.5rem",
                                "height": "3.5rem",
                                "display": "flex",
                                "alignItems": "center",
                                "justifyContent": "center"
                            },
                            "props": {
                                "width": "2.5rem",
                                "color": "var(--color-error)"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "padding": "0 0.5rem 1.75rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(0.95rem, 1.3vw, 1.125rem)",
                                "fontWeight": "700",
                                "color": "var(--color-error)",
                                "margin": "0",
                                "textAlign": "center"
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
