// src/sections/cards/statRowApex.js
//
// Ported from astro-micro's src/sections/stats/spatialCardRowApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: statCardRowApex (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["stats","spatial","metrics","numbers","row","apex"];

export const data = [
    {
        "meta": {
            "badge": "APEX STATISTICAL OVERVIEW"
        },
        "stats": [
            {
                "value": "80+",
                "label": "UI Components"
            },
            {
                "value": "28K+",
                "label": "Weekly downloads"
            },
            {
                "value": "4.9★",
                "label": "Developer rating"
            },
            {
                "value": "100%",
                "label": "Framework-agnostic"
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "3rem 0"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "gradient": false
        }) },
    "children": [
        {
            "layout": {
                "col": 12
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
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
                            "source": "meta.badge",
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
                }
            ]
        },
        {
            "each": "stats",
            "render": "cards",
            "style": {
                "marginTop": "1rem",
                "textAlign": "center"
            },
            "props": {
                "col": 3
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "children": [
                        {
                            "source": "$item.value",
                            "render": "h2",
                            "style": {
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "loop": true,
                                "effect": "slideUp"
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
                    "children": [
                        {
                            "source": "$item.label",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": 12
            }
        }
    ]
};
