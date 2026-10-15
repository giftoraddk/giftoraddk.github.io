// src/sections/sliders/blogNeat.js
//
// Ported from astro-micro's src/sections/blog/spatialSlideNeat.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: blogSlideNeat (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["blog","modern","slider","image","hori","posts"];

export const data = [
    {
        "subtitle": "POWERFUL & INTUITIVE",
        "description": "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est.",
        "meta": {
            "heading": "Many tools to express\nyour creativity"
        },
        "slider": [
            {
                "pics": "https://placehold.co/600x300/8B8680/ddd",
                "title": "Best practices for continuous delivery in 2024",
                "meta": {
                    "date": "May 20, 2024",
                    "category": "DevOps"
                }
            },
            {
                "pics": "https://placehold.co/600x300/8B8680/ddd",
                "title": "Scaling your engineering team effectively",
                "meta": {
                    "date": "May 15, 2024",
                    "category": "Leadership"
                }
            },
            {
                "pics": "https://placehold.co/600x300/8B8680/ddd",
                "title": "How to improve deployment success rates",
                "meta": {
                    "date": "May 10, 2024",
                    "category": "Engineering"
                }
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
            "hueCustom": 0
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
                        "justify": "none"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.5rem",
                        "textAlign": "center"
                    },
                    "children": [
                        {
                            "source": "subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "letterSpacing": "0.12em",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "meta.heading",
                            "render": "h2",
                            "style": {
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
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "2rem 0"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "slider",
            "render": "slider",
            "bg": { ...getStyleOpts({
                    "rounded": "1.25rem",
                    "tint": "#a77ceb",
                    "total": 1,
                    "blobType": "circleOverlap",
                    "deg": 225
                }) },
            "props": {
                "nav": false,
                "loop": true,
                "slides": 3,
                "spacing": 20,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "180px",
                                "objectFit": "cover",
                                "display": "block",
                                "borderRadius": "1.25rem 1.25rem 0 0"
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
                        "padding": "0.875rem 1rem 0.375rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "fontWeight": "700",
                                "lineHeight": "1.4",
                                "minHeight": "3rem",
                                "margin": "0",
                                "color": "var(--color-base-content)"
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
                        "gap": "0.75rem",
                        "alignItems": "center",
                        "padding": "0 1rem 1rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.date",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)"
                            }
                        },
                        {
                            "source": "$item.meta.category",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)"
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
