// src/sections/cards/ctaNeatSpatial.js
//
// Ported from astro-micro's src/sections/cta/spatialNeat.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

import { getStyleOpts } from '../helper.js';

export const hashtags = [
    "cta",
    "modern",
    "centered",
    "buttons",
    "image",
    "neat"
];

export const data = [
    {
        "title": "Ready to build\nbetter software ?",
        "description": "Join thousands of teams who trust Nexora\nto deliver exceptional software.",
        "pics": "https://placehold.co/1400x400/8B8680/ddd",
        "meta": {
            "ctaPrimaryLabel": "Start free trial",
            "ctaSecondaryLabel": "Book a demo"
        }
    }
];

export const config = {
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "hueCustom": 0
        }) },
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
                        "flexDirection": "column",
                        "gap": "0.875rem",
                        "padding": "3rem 1.5rem",
                        "alignItems": "center"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(2.5rem, 5vw, 4.5rem)",
                                "lineHeight": "1.1",
                                "textAlign": "center"
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
