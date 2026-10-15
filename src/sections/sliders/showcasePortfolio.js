// src/sections/sliders/showcasePortfolio.js
//
// Ported from astro-micro's src/sections/showcase/modernSlidePortfolio.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: showcaseSlidePortfolio (see sections/index.js).

export const hashtags = ["showcase","modern","portfolio","slider","image","overlay"];

export const data = [
    {
        "subtitle": "OUR WORK",
        "description": "We help creative teams turn rough ideas into refined digital products that connect with people.",
        "meta": {
            "heading": "From rough design files,\nto powerful products"
        },
        "slider": [
            {
                "title": "It's Lora Smith",
                "pics": "https://placehold.co/600x360/6B3A4B/ddd",
                "meta": {
                    "category": "Photography",
                    "badge": "Creative Direction"
                }
            },
            {
                "title": "Mark Miller.",
                "pics": "https://placehold.co/600x360/8B8680/ddd",
                "meta": {
                    "category": "Digital Art",
                    "badge": "Creative Services"
                }
            },
            {
                "title": "Acne Studio.",
                "pics": "https://placehold.co/600x360/3A4B5C/ddd",
                "meta": {
                    "category": "Fashion",
                    "badge": "Brand Identity"
                }
            },
            {
                "title": "Studio Drift",
                "pics": "https://placehold.co/600x360/4A3B6C/ddd",
                "meta": {
                    "category": "Installation",
                    "badge": "Art Direction"
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
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "alignItems": "center",
                        "gap": "0.75rem",
                        "textAlign": "center",
                        "padding": "0 0 1.5rem"
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
                                "fontSize": "clamp(1.75rem, 3vw, 2.75rem)",
                                "fontWeight": "800",
                                "lineHeight": "1.1",
                                "letterSpacing": "-0.03em",
                                "margin": "0",
                                "whiteSpace": "pre-line"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "riseUp"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "maxWidth": "540px",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
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
                "position": "relative",
                "overflow": "hidden",
                "borderRadius": "0.75rem",
                "height": "320px"
            },
            "props": {
                "nav": true,
                "loop": true,
                "slides": 3,
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
                    "style": {
                        "position": "absolute",
                        "inset": "0",
                        "zIndex": "0"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "100%",
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
                        "position": "absolute",
                        "bottom": "0",
                        "left": "0",
                        "right": "0",
                        "zIndex": "1",
                        "flexDirection": "column",
                        "gap": "0.375rem",
                        "padding": "4rem 1.25rem 1.25rem",
                        "background": "linear-gradient(to top, var(--color-base-300) 0%, transparent 100%)"
                    },
                    "children": [
                        {
                            "source": "$item.meta.category",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "letterSpacing": "0.1em",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 55%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "$item.title",
                            "render": "h3",
                            "style": {
                                "fontSize": "clamp(1.5rem, 2.5vw, 2rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "margin": "0",
                                "whiteSpace": "pre-line"
                            }
                        },
                        {
                            "source": "$item.meta.badge",
                            "render": "badge",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "marginTop": "0.25rem"
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
