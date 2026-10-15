// src/sections/sliders/showcaseHoriCase.js
//
// Ported from astro-micro's src/sections/showcase/modernHoriCase.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: showcaseHoriCase (see sections/index.js).

export const hashtags = ["showcase","modern","slider","image","hori","case-studies"];

export const data = [
    {
        "subtitle": "SHOWCASE",
        "description": "See how teams around the world use Nexora to build, ship, and scale amazing software.",
        "meta": {
            "heading": "Real teams.\nReal results.",
            "ctaLabel": "View all case studies →"
        },
        "slider": [
            {
                "pics": "https://placehold.co/600x300/8B8680/ddd",
                "title": "How Finova cut release time by 60% with Nexora",
                "content": "Finova reduced deployment cycles and eliminated manual handoffs.",
                "meta": {
                    "category": "FINOVA"
                }
            },
            {
                "pics": "https://placehold.co/600x300/8B8680/ddd",
                "title": "ScaleOps improved deployment speed by 3x",
                "content": "Automated pipelines transformed their engineering workflow.",
                "meta": {
                    "category": "SCALEOPS"
                }
            },
            {
                "pics": "https://placehold.co/600x300/8B8680/ddd",
                "title": "MoveFast increased productivity by 45%",
                "content": "A unified platform gave MoveFast full-stack visibility.",
                "meta": {
                    "category": "SAAS"
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
                "col": "5",
                "row": "auto"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "1rem"
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
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "fallDown"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "meta.ctaLabel",
                            "render": "a",
                            "style": {
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "fontWeight": "600",
                                "color": "var(--color-primary)",
                                "textDecoration": "none",
                                "display": "inline-block"
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
                "slides": 2,
                "spacing": 16,
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
                        "justify": "none"
                    },
                    "style": {
                        "padding": "0.75rem 1rem 0.25rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.category",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "letterSpacing": "0.12em",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
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
                        "flexDirection": "column",
                        "gap": "0.25rem",
                        "padding": "0.25rem 1rem 1rem",
                        "minHeight": "5rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "700",
                                "lineHeight": "1.35",
                                "margin": "0",
                                "color": "var(--color-base-content)"
                            }
                        },
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.5",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "7",
                "row": "auto"
            }
        }
    ]
};
