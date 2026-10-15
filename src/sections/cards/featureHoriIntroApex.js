// src/sections/cards/featureHoriIntroApex.js
//
// Ported from astro-micro's src/sections/features/spatialHoriIntroApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: featureHoriIntroApex (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["features","spatial","product","introRow","cards","icon","apex"];

export const data = [
    {
        "subtitle": "CORE COMPONENTS",
        "meta": {
            "heading": "Designed for Websites\nof Any Scale"
        },
        "cards": [
            {
                "title": "Blueprint Engine",
                "content": "Describe entire page sections as a JSON blueprint — layout, content, animations.",
                "meta": {
                    "icon": "ri:layout-grid-line",
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
                "title": "Adaptive Card Grid",
                "content": "One dataset, infinite views from a single config.",
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
                "title": "Micro Services",
                "content": "Self-contained Lit custom elements with built-in state, events, and IndexedDB caching.",
                "meta": {
                    "icon": "ri:puzzle-line",
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
            },
            {
                "title": "Theming Engine",
                "content": "Five-color palette via CSS variables. Switch dark/light or full custom themes at runtime.",
                "meta": {
                    "icon": "ri:palette-line",
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
            "gradient": false
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
                            "value": "https://placehold.co/700x700/8B8680/ddd",
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
                            "source": "subtitle",
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
                "col": 12,
                "anime": "slide-in-blurred-bottom"
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
