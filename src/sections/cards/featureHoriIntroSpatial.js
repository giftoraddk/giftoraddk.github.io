// src/sections/cards/featureHoriIntroSpatial.js
//
// Ported from astro-micro's src/sections/features/spatialHoriIntro.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: featureHoriIntroSpatial (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["features","modern","product","introRow","cards","icon"];

export const data = [
    {
        "subtitle": "PRODUCTS",
        "meta": {
            "heading": "Powerful products\nfor modern teams"
        },
        "cards": [
            {
                "title": "Nexora Core",
                "content": "Project management and tracking",
                "meta": {
                    "icon": "ri:compass-3-line",
                    "iconStyle": {
                        "width": "3rem",
                        "height": "3rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-base-content) 12%, transparent)"
                    }
                }
            },
            {
                "title": "Nexora CI",
                "content": "Continuous integration made simple",
                "meta": {
                    "icon": "ri:apps-2-line",
                    "iconStyle": {
                        "width": "3rem",
                        "height": "3rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-accent) 25%, transparent)"
                    }
                }
            },
            {
                "title": "Nexora Deploy",
                "content": "Automated deployments you can trust",
                "meta": {
                    "icon": "ri:rocket-line",
                    "iconStyle": {
                        "width": "3rem",
                        "height": "3rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-primary) 25%, transparent)"
                    }
                }
            },
            {
                "title": "Nexora Insights",
                "content": "Analytics and reporting that drive impact",
                "meta": {
                    "icon": "ri:bar-chart-2-line",
                    "iconStyle": {
                        "width": "3rem",
                        "height": "3rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-secondary) 25%, transparent)"
                    }
                }
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "3rem 0",
        "columnGap": "1.5rem !important"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "hueCustom": 0
        }) },
    "children": [
        {
            "layout": {
                "col": "7",
                "row": 2
            },
            "style": {
                "height": "100%"
            },
            "props": {
                "anime": "flip-in-diag-tr"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "overflow"
                    },
                    "style": {
                        "height": "100%"
                    },
                    "children": [
                        {
                            "value": "https://placehold.co/900x700/8B8680/ddd",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "100%",
                                "objectFit": "cover",
                                "display": "block",
                                "minHeight": "420px"
                            }
                        }
                    ]
                }
            ]
        },
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
                        "justify": "none"
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
                                "margin": "0",
                                "whiteSpace": "pre-line"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "floatIn"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "cards",
            "render": "cards",
            "style": {
                "padding": "0.75rem",
                "background": "var(--color-base-200)",
                "borderRadius": "0.875rem"
            },
            "props": {
                "col": 12
            },
            "children": [
                {
                    "layout": {
                        "col": "2",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "alignItems": "center"
                    },
                    "children": [
                        {
                            "source": "$item.meta.icon",
                            "render": "icon",
                            "style": "$item.meta.iconStyle",
                            "props": {
                                "width": "1.25rem",
                                "color": "var(--color-base-content)"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "8",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.15rem",
                        "padding": "0 0.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "fontWeight": "700",
                                "lineHeight": "1.3",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.45",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "2",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "height": "100%",
                        "placeContent": "center"
                    },
                    "children": [
                        {
                            "value": "",
                            "render": "a",
                            "style": {
                                "width": "2rem",
                                "height": "2rem",
                                "flexShrink": "0",
                                "borderRadius": "50%",
                                "border": "1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)",
                                "color": "var(--color-base-content)",
                                "display": "flex",
                                "justifyContent": "center",
                                "alignItems": "center"
                            },
                            "props": {
                                "prefix": "ri:add-line",
                                "iconSize": "1rem",
                                "org": "#"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "5",
                "row": "auto"
            }
        }
    ]
};
