// src/sections/cards/heroHoriBase.js
//
// Ported from astro-micro's src/sections/hero/modernHoriBase.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

export const hashtags = [
    "hero",
    "spatial",
    "horizontal",
    "split",
    "cta"
];

export const data = [
    {
        "subtitle": "DESIGNED FOR TEAMS WHO BUILD",
        "title": "Software that\nmoves faster",
        "description": "Nexora helps development teams plan, build, and ship better software with confidence.",
        "pics": "https://placehold.co/600x400/8B8680/ddd",
        "meta": {
            "ctaPrimary": "Start free trial",
            "ctaSecondary": "Book a demo"
        }
    }
];

export const config = {
    "style": {
        "padding": "3rem 0"
    },
    "children": [
        {
            "each": "$records",
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "1.25rem",
                        "paddingRight": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "letterSpacing": "0.12em",
                                "fontWeight": "600",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "$item.title",
                            "render": "h1",
                            "style": {
                                "whiteSpace": "pre-line",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": true,
                                "effect": "focusIn"
                            }
                        },
                        {
                            "source": "$item.description",
                            "render": "p",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "7",
                "row": "auto"
            }
        },
        {
            "each": "$records",
            "props": {
                "anime": "tilt-in-tr"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "overflow": "hidden"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "maxHeight": "320px",
                                "objectFit": "contain",
                                "display": "block"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "5",
                "row": "2"
            }
        },
        {
            "layout": {
                "col": "7",
                "row": "auto"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "gap": "0.75rem"
                    },
                    "children": [
                        {
                            "source": "meta.ctaPrimary",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)"
                            },
                            "props": {
                                "type": "fill",
                                "color": "primary",
                                "height": "45px",
                                "rounded": "8px"
                            }
                        },
                        {
                            "source": "meta.ctaSecondary",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
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
            ]
        }
    ]
};
