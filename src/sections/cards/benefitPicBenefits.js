// src/sections/cards/benefitPicBenefits.js
//
// Ported from astro-micro's src/sections/benefits/modernPicBenefits.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: benefitPicBenefits (see sections/index.js).

export const hashtags = ["benefits","modern","checklist","image","hori","services"];

export const data = [
    {
        "subtitle": "SERVICES",
        "title": "Expert services to\naccelerate your journey",
        "description": "From strategy to implementation, our experts help you get the most out of Nexora.",
        "cards": [
            {
                "text": "Onboarding & migration"
            },
            {
                "text": "Custom integrations"
            },
            {
                "text": "Training & enablement"
            },
            {
                "text": "Ongoing support"
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
                "col": "5",
                "row": "auto"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
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
                            "source": "title",
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
                                "effect": "fallDown"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "layout": {
                "col": "7",
                "row": 2
            },
            "props": {
                "anime": "flip-in-diag-br"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "right"
                    },
                    "children": [
                        {
                            "value": "https://placehold.co/600x300/8B8680/ddd",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "100%",
                                "objectFit": "cover",
                                "display": "block"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "cards",
            "render": "cards",
            "props": {
                "col": 12
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "gap": "0.625rem",
                        "alignItems": "center"
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
                            "source": "$item.text",
                            "render": "span",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
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
