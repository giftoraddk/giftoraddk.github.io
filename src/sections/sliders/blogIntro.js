// src/sections/sliders/blogIntro.js
//
// Ported from astro-micro's src/sections/blog/modernSlideIntro.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: blogSlideIntro (see sections/index.js).

export const hashtags = ["blog","modern","slider","image","hori","posts"];

export const data = [
    {
        "subtitle": "BLOG",
        "meta": {
            "heading": "Insights & updates",
            "ctaLabel": "View all posts →"
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
    "children": [
        {
            "layout": {
                "col": "12",
                "row": "auto"
            },
            "children": [
                {
                    "layout": {
                        "col": "9",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.5rem"
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
                            "render": "h3",
                            "style": {
                                "fontWeight": "700",
                                "letterSpacing": "-0.02em",
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "typeIn"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "3",
                        "row": "auto",
                        "justify": "right"
                    },
                    "style": {
                        "alignItems": "center",
                        "padding": "2rem 0 1.5rem"
                    },
                    "children": [
                        {
                            "source": "meta.ctaLabel",
                            "render": "a",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "color": "var(--color-primary)",
                                "textDecoration": "none",
                                "whiteSpace": "nowrap"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "slider",
            "render": "slider",
            "style": {
                "background": "var(--color-base-200)",
                "borderRadius": "0.75rem",
                "overflow": "hidden",
                "border": "1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)"
            },
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
                                "display": "block"
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
