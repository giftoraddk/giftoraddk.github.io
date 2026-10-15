// src/sections/cards/benefitCompare.js
//
// Ported from astro-micro's src/sections/benefits/modernCardCompare.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: benefitCardCompare (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["benefits","modern","compare","features","vs"];

export const data = [
    {
        "subtitle": "THE HONEST COMPARISON",
        "title": "Why Apex?",
        "description": "Most UI frameworks tie you to one stack and slow you down.\nApex drops into any stack and ships beautiful interfaces in hours, not weeks.",
        "meta": {
            "leftPanelTitle": "Apex",
            "vsBadge": "VS",
            "rightPanelTitle": "Other Frameworks"
        },
        "leftCards": [
            {
                "title": "Drop into any stack — React, Vue, Angular, Svelte"
            },
            {
                "title": "Theme with CSS variables — zero config"
            },
            {
                "title": "JSON-driven layout composition"
            },
            {
                "title": "Built-in animation & motion system"
            },
            {
                "title": "Responsive & adaptive out of the box"
            },
            {
                "title": "Ships production UIs in hours, not weeks"
            }
        ],
        "rightCards": [
            {
                "title": "Locked to a single framework or stack"
            },
            {
                "title": "Complex setup required for every project"
            },
            {
                "title": "Hard-coded layouts, hard to maintain"
            },
            {
                "title": "Need third-party animation libraries"
            },
            {
                "title": "Manual responsive breakpoints everywhere"
            },
            {
                "title": "Weeks of development before shipping anything"
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "4rem 0"
    },
    // Nền full-section — web-board render ngoài gi-container (xem sectionBg)
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "tint": "var(--color-primary)",
            "total": 2,
            "blobType": "circleOverlap",
            "deg": 0,
            "distance": 100
        }) },
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
                    "children": [
                        {
                            "source": "$item.subtitle",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 1vw, 0.75rem)",
                                "fontWeight": "600",
                                "letterSpacing": "0.1em",
                                "color": "var(--color-primary)",
                                "padding": "0.3rem 0.875rem",
                                "borderRadius": "2rem",
                                "border": "1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent)",
                                "background": "color-mix(in oklab, var(--color-primary) 8%, transparent)",
                                "display": "inline-flex",
                                "alignItems": "center",
                                "gap": "0.375rem"
                            },
                            "props": {
                                "prefix": "ri:scales-3-line",
                                "iconSize": "0.875rem"
                            }
                        }
                    ]
                },
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
                        "padding": "1rem 0 3rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h2",
                            "style": {
                                "fontStyle": "italic",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "scatterIn"
                            }
                        },
                        {
                            "source": "$item.description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "maxWidth": "32rem",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0",
                                "whiteSpace": "pre-line",
                                "textAlign": "center"
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
            "layout": {
                "col": "5",
                "row": "auto"
            },
            "bg": { ...getStyleOpts({
                    "rounded": "1.25rem",
                    "tint": "var(--color-primary)",
                    "total": 1,
                    "blobType": "ellipse",
                    "deg": 315
                }) },
            "style": {
                "gap": "0"
            },
            "children": [
                {
                    "layout": {
                        "col": "12"
                    },
                    "props": {
                        "anime": "slide-in-blurred-left"
                    },
                    "children": [
                        {
                            "layout": {
                                "col": 12,
                                "row": "auto",
                                "justify": "center"
                            },
                            "style": {
                                "justifyContent": "center",
                                "alignItems": "center",
                                "gap": "0.625rem",
                                "padding": "1.25rem 1.5rem 0.5rem"
                            },
                            "children": [
                                {
                                    "value": "ri:bard-fill",
                                    "render": "icon",
                                    "props": {
                                        "width": "1.25rem",
                                        "color": "var(--color-primary)"
                                    }
                                },
                                {
                                    "source": "meta.leftPanelTitle",
                                    "render": "span",
                                    "style": {
                                        "fontWeight": "700",
                                        "letterSpacing": "-0.01em",
                                        "color": "var(--color-base-content)"
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    "each": "leftCards",
                    "render": "cards",
                    "layout": {
                        "col": "12"
                    },
                    "props": {
                        "col": 12,
                        "padding": "1.5rem 0",
                        "anime": "slide-in-blurred-left"
                    },
                    "children": [
                        {
                            "layout": {
                                "col": 12,
                                "row": "auto",
                                "justify": "left"
                            },
                            "style": {
                                "flexWrap": "nowrap",
                                "alignItems": "center",
                                "gap": "0.75rem",
                                "padding": "0.5rem 1.5rem"
                            },
                            "children": [
                                {
                                    "value": "ri:checkbox-circle-line",
                                    "render": "icon",
                                    "style": {
                                        "flexShrink": "0"
                                    },
                                    "props": {
                                        "width": "1.25rem",
                                        "color": "var(--color-primary)"
                                    }
                                },
                                {
                                    "source": "$item.title",
                                    "render": "span",
                                    "style": {
                                        "color": "var(--color-base-content)"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "layout": {
                "col": "2",
                "row": "auto"
            },
            "style": {
                "alignSelf": "center",
                "display": "flex",
                "alignItems": "center",
                "justifyContent": "center"
            },
            "children": [
                {
                    "children": [
                        {
                            "layout": {
                                "col": 12,
                                "row": "auto",
                                "justify": "center"
                            },
                            "style": {
                                "alignItems": "center",
                                "justifyContent": "center"
                            },
                            "children": [
                                {
                                    "source": "meta.vsBadge",
                                    "render": "span",
                                    "style": {
                                        "width": "3rem",
                                        "height": "3rem",
                                        "display": "flex",
                                        "alignItems": "center",
                                        "justifyContent": "center",
                                        "background": "var(--color-primary)",
                                        "borderRadius": "50%",
                                        "fontWeight": "800",
                                        "color": "var(--color-base-100)",
                                        "letterSpacing": "0.05em",
                                        "flexShrink": "0"
                                    }
                                }
                            ]
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
            "bg": { ...getStyleOpts({
                    "rounded": "1.25rem",
                    "tint": "var(--color-secondary)",
                    "total": 1,
                    "blobType": "ellipse",
                    "deg": 45
                }) },
            "style": {
                "gap": "0"
            },
            "children": [
                {
                    "layout": {
                        "col": "12"
                    },
                    "props": {
                        "anime": "slide-in-blurred-right"
                    },
                    "children": [
                        {
                            "layout": {
                                "col": 12,
                                "row": "auto",
                                "justify": "center"
                            },
                            "style": {
                                "justifyContent": "center",
                                "alignItems": "center",
                                "gap": "0.625rem",
                                "padding": "1.25rem 1.5rem 0.5rem"
                            },
                            "children": [
                                {
                                    "source": "meta.rightPanelTitle",
                                    "render": "h3",
                                    "style": {
                                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                        "fontWeight": "800",
                                        "color": "var(--color-base-content)",
                                        "margin": "0"
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    "each": "rightCards",
                    "render": "cards",
                    "layout": {
                        "col": "12"
                    },
                    "props": {
                        "col": 12,
                        "padding": "1.5rem 0",
                        "anime": "slide-in-blurred-right"
                    },
                    "children": [
                        {
                            "layout": {
                                "col": 12,
                                "row": "auto",
                                "justify": "left"
                            },
                            "style": {
                                "flexWrap": "nowrap",
                                "alignItems": "center",
                                "gap": "0.75rem",
                                "padding": "0.5rem 1.5rem"
                            },
                            "children": [
                                {
                                    "value": "ri:close-circle-line",
                                    "render": "icon",
                                    "style": {
                                        "flexShrink": "0"
                                    },
                                    "props": {
                                        "width": "1.25rem",
                                        "color": "var(--color-secondary)"
                                    }
                                },
                                {
                                    "source": "$item.title",
                                    "render": "span",
                                    "style": {
                                        "color": "var(--color-base-content)"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};
