// src/sections/cards/heroNeatCenter.js
//
// Ported from astro-micro's src/sections/hero/spatialNeatCenterApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

import { getStyleOpts } from '../helper.js';

export const hashtags = [
    "hero",
    "spatial",
    "centered",
    "badge",
    "avatar",
    "cta"
];

export const data = [
    {
        "subtitle": "TRANSFORMING DIGITAL EXPERIENCES WITH APEX",
        "title": "Build interfaces that\nwork everywhere",
        "description": "Drop Apex into any stack — React, Vue, Angular, Svelte, or plain HTML. Theme with CSS variables, compose with JSON config, and ship beautiful UIs in hours — not weeks.",
        "meta": {
            "titleHighlight": "natively.",
            "ctaPrimary": "Get Started Free",
            "ctaSecondary": "Explore Components",
            "socialProof": "Trusted by 10,000+ developers"
        }
    }
];

export const config = {
    "style": {
        "padding": "4rem 1rem"
    },
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
                        "maxWidth": "fit-content",
                        "margin": "0 auto",
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
                        "alignItems": "center",
                        "gap": "0",
                        "textAlign": "center",
                        "maxWidth": "54rem",
                        "margin": "0 auto",
                        "padding": "1.5rem 1rem 0"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h1",
                            "style": {
                                "whiteSpace": "pre-line",
                                "textAlign": "center",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": true,
                                "effect": "focusIn"
                            }
                        },
                        {
                            "source": "$item.meta.titleHighlight",
                            "render": "h1",
                            "style": {
                                "whiteSpace": "pre-line",
                                "textAlign": "center",
                                "margin": "0",
                                "color": "var(--color-primary)"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "fallDown"
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
                        "alignItems": "center",
                        "textAlign": "center",
                        "maxWidth": "48rem",
                        "margin": "0 auto",
                        "padding": "1.25rem 1rem 0"
                    },
                    "children": [
                        {
                            "source": "$item.description",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(1rem, 1.4vw, 1.125rem)",
                                "lineHeight": "1.7",
                                "textAlign": "center",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
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
                        "gap": "0.875rem",
                        "padding": "2.25rem 0 0"
                    },
                    "children": [
                        {
                            "source": "$item.meta.ctaPrimary",
                            "render": "button",
                            "style": {
                                "fontWeight": "700",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "padding": "0 2rem"
                            },
                            "props": {
                                "type": "fill",
                                "ui": "modern",
                                "color": "primary",
                                "height": "52px",
                                "rounded": "9999px"
                            }
                        },
                        {
                            "source": "$item.meta.ctaSecondary",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "padding": "0 2rem",
                                "color": "var(--color-base-content)",
                                "borderColor": "color-mix(in oklab, var(--color-base-content) 25%, transparent)"
                            },
                            "props": {
                                "type": "outline",
                                "height": "52px",
                                "rounded": "9999px"
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
                        "alignItems": "center",
                        "padding": "2.5rem 0 0"
                    },
                    "children": [
                        {
                            "value": "https://i.pravatar.cc/40?img=5",
                            "render": "gallery",
                            "style": {
                                "width": "2.25rem",
                                "height": "2.25rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "display": "block",
                                "border": "2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)",
                                "flexShrink": "0"
                            }
                        },
                        {
                            "value": "https://i.pravatar.cc/40?img=12",
                            "render": "gallery",
                            "style": {
                                "width": "2.25rem",
                                "height": "2.25rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "display": "block",
                                "border": "2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)",
                                "marginLeft": "-0.75rem",
                                "flexShrink": "0"
                            }
                        },
                        {
                            "value": "https://i.pravatar.cc/40?img=25",
                            "render": "gallery",
                            "style": {
                                "width": "2.25rem",
                                "height": "2.25rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "display": "block",
                                "border": "2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)",
                                "marginLeft": "-0.75rem",
                                "flexShrink": "0"
                            }
                        },
                        {
                            "value": "https://i.pravatar.cc/40?img=35",
                            "render": "gallery",
                            "style": {
                                "width": "2.25rem",
                                "height": "2.25rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "display": "block",
                                "border": "2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)",
                                "marginLeft": "-0.75rem",
                                "flexShrink": "0"
                            }
                        },
                        {
                            "value": "https://i.pravatar.cc/40?img=47",
                            "render": "gallery",
                            "style": {
                                "width": "2.25rem",
                                "height": "2.25rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "display": "block",
                                "border": "2px solid color-mix(in oklab, var(--color-base-100) 80%, transparent)",
                                "marginLeft": "-0.75rem",
                                "flexShrink": "0"
                            }
                        },
                        {
                            "source": "$item.meta.socialProof",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "500",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "marginLeft": "0.875rem"
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
