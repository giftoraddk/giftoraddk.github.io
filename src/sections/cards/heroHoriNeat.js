// src/sections/cards/heroHoriNeat.js
//
// Ported from astro-micro's src/sections/hero/spatialHoriNeat.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

import { getStyleOpts } from '../helper.js';

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
        "pics": "https://i.ibb.co/zHH3bRp1/square.png",
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
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "hueCustom": 0
        }) },
    "children": [
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
                                "maxHeight": "360px",
                                "objectFit": "contain",
                                "display": "block"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "6",
                "row": "2"
            }
        },
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
                        "paddingLeft": "1.5rem"
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
                "col": "6",
                "row": "auto"
            }
        },
        {
            "layout": {
                "col": "6",
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
                        "gap": "0.75rem",
                        "paddingLeft": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "meta.ctaPrimary",
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
                            "source": "meta.ctaSecondary",
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
            ]
        }
    ]
};
