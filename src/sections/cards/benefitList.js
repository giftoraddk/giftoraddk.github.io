// src/sections/cards/benefitList.js
//
// Ported from astro-micro's src/sections/benefits/modernCardList.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

export const hashtags = [
    "benefits",
    "modern",
    "checklist",
    "list",
    "features"
];

export const data = [
    {
        "subtitle": "BENEFITS",
        "title": "Built for speed.\nDesigned for scale.",
        "description": "From early-stage startups to global teams, Nexora adapts to the way you work.",
        "cards": [
            {
                "title": "Reduce cycle time"
            },
            {
                "title": "Improve code quality"
            },
            {
                "title": "Increase deployment frequency"
            },
            {
                "title": "Empower high-performing teams"
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "3rem 0"
    },
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
                    "style": {
                        "display": "flex",
                        "flexDirection": "column",
                        "alignItems": "flex-start"
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
                        },
                        {
                            "source": "title",
                            "render": "h2",
                            "style": {
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "blurIn"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "cards",
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "display": "flex",
                        "flexWrap": "nowrap",
                        "alignItems": "start",
                        "gap": "0.5rem"
                    },
                    "children": [
                        {
                            "value": "ri:checkbox-circle-fill",
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
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
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
