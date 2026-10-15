// src/sections/cards/featureIntro.js
//
// Ported from astro-micro's src/sections/features/modernCardIntro.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: featureCardIntro (see sections/index.js).

export const hashtags = ["features","modern","showcase"];

export const data = [
    {
        "subtitle": "FEATURES",
        "meta": {
            "heading": "Everything you need\nto build better"
        },
        "cards": [
            {
                "title": "Plan smarter",
                "content": "Break down work, set priorities, and stay on track with clarity.",
                "meta": {
                    "icon": "ri:task-line",
                    "ctaLabel": "Learn more"
                }
            },
            {
                "title": "Build together",
                "content": "Collaborate in real time and keep everyone in the loop.",
                "meta": {
                    "icon": "ri:team-line",
                    "ctaLabel": "Learn more"
                }
            },
            {
                "title": "Ship with confidence",
                "content": "Automate testing and deployments across all environments.",
                "meta": {
                    "icon": "ri:rocket-line",
                    "ctaLabel": "Learn more"
                }
            },
            {
                "title": "Improve continuously",
                "content": "Track performance, gather insights, and keep getting better.",
                "meta": {
                    "icon": "ri:line-chart-line",
                    "ctaLabel": "Learn more"
                }
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
                "col": "7",
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
                                "letterSpacing": "0.12em",
                                "fontWeight": "600",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "meta.heading",
                            "render": "h2",
                            "style": {
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "riseUp"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "layout": {
                "col": "5",
                "row": "2"
            },
            "props": {
                "anime": "tilt-in-br"
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
                            "value": "https://placehold.co/600x700/8B8680/ddd",
                            "render": "gallery",
                            "style": {
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
                "col": 6
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
                        "gap": "0.5rem",
                        "padding": "1.25rem",
                        "background": "var(--color-base-200)",
                        "borderRadius": "0.75rem",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)"
                    },
                    "children": [
                        {
                            "source": "$item.meta.icon",
                            "render": "icon",
                            "style": {
                                "padding": "0.5rem",
                                "background": "color-mix(in oklab, var(--color-primary) 12%, transparent)",
                                "borderRadius": "0.5rem"
                            },
                            "props": {
                                "width": "1.25rem",
                                "color": "var(--color-primary)"
                            }
                        },
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "fontWeight": "700",
                                "lineHeight": "1.3",
                                "margin": "0.5rem 0 0"
                            }
                        },
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.5",
                                "color": "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
                                "margin": "0",
                                "minHeight": "45px"
                            }
                        },
                        {
                            "source": "$item.meta.ctaLabel",
                            "render": "span",
                            "style": {
                                "color": "var(--color-primary)",
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "500",
                                "cursor": "pointer",
                                "display": "inline-flex",
                                "alignItems": "center",
                                "gap": "0.25rem",
                                "marginTop": "0.25rem"
                            },
                            "props": {
                                "suffix": "ri:arrow-right-line",
                                "iconSize": "0.875rem"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "7",
                "row": "auto"
            }
        }
    ]
};
