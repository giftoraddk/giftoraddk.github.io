// src/sections/cards/statRowSpatial.js
//
// Ported from astro-micro's src/sections/stats/spatialCardRow.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: statCardRowSpatial (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["stats","modern","metrics","numbers","row"];

export const data = [
    {
        "subtitle": "TRUSTED BY HIGH PERFORMING TEAMS",
        "stats": [
            {
                "value": "10K+",
                "label": "Active teams"
            },
            {
                "value": "2.3M+",
                "label": "Projects delivered"
            },
            {
                "value": "99.99%",
                "label": "Uptime SLA"
            },
            {
                "value": "40%",
                "label": "Faster time to market"
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
            "hueCustom": 0
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
                        "justify": "none"
                    },
                    "children": [
                        {
                            "source": "subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "letterSpacing": "0.12em",
                                "fontWeight": "600",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "stats",
            "render": "cards",
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
                    "style": {
                        "padding": "0 0 0.375rem"
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
