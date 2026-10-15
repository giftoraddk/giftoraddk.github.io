// src/sections/cards/ctaNeatApex.js
//
// Ported from astro-micro's src/sections/cta/spatialNeatApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

export const hashtags = [
    "cta",
    "spatial",
    "centered",
    "buttons",
    "image",
    "neat",
    "apex"
];

export const data = [
    {
        "subtitle": "GET STARTED TODAY",
        "title": "Start building with\nApex today.",
        "description": "Join thousands of developers who build\nbeautiful UIs with native web standards.",
        "pics": "https://placehold.co/1400x400/8B8680/ddd",
        "meta": {
            "ctaPrimaryLabel": "Get Started Free",
            "ctaSecondaryLabel": "View Docs"
        }
    }
];

export const config = {
    "children": [
        {
            "each": "$records",
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "maxWidth": "fit-content",
                        "margin": "3rem auto 0",
                        "padding": "0 0.5rem",
                        "borderRadius": "2rem",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)",
                        "background": "color-mix(in oklab, var(--color-primary) 5%, transparent)",
                        "backdropFilter": "blur(8px)"
                    },
                    "children": [
                        {
                            "source": "$item.subtitle",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "500",
                                "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)"
                            },
                            "props": {
                                "prefix": "ri:bard-fill",
                                "iconSize": "1.1rem"
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
                        "flexDirection": "column",
                        "gap": "0.875rem",
                        "padding": "1.5rem 1.5rem 0",
                        "alignItems": "center"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(2.5rem, 5vw, 4.5rem)",
                                "lineHeight": "1.1",
                                "textAlign": "center",
                                "whiteSpace": "pre-line"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "swingIn"
                            }
                        },
                        {
                            "source": "$item.description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0",
                                "textAlign": "center",
                                "whiteSpace": "pre-line"
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
                        "gap": "0.75rem",
                        "padding": "0.5rem 0 3rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.ctaPrimaryLabel",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "padding": "0 1.5rem"
                            },
                            "props": {
                                "type": "fill",
                                "ui": "modern",
                                "color": "primary",
                                "height": "45px",
                                "rounded": "8px"
                            }
                        },
                        {
                            "source": "$item.meta.ctaSecondaryLabel",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "padding": "0 1.5rem",
                                "color": "var(--color-base-content)",
                                "borderColor": "color-mix(in oklab, var(--color-base-content) 22%, transparent)"
                            },
                            "props": {
                                "type": "outline",
                                "height": "45px",
                                "rounded": "8px"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "12",
                "row": "auto"
            }
        },
        {
            "each": "$records",
            "props": {
                "anime": "slide-in-blurred-bottom"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "overflow"
                    },
                    "style": {
                        "borderRadius": "1rem 1rem 0 0",
                        "maxHeight": "220px"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "100%",
                                "objectFit": "cover",
                                "objectPosition": "top",
                                "display": "block"
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
