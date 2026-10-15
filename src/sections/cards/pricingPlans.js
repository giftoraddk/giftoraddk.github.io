// src/sections/cards/pricingPlans.js
//
// Ported from astro-micro's src/sections/pricing/modernCardPlans.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: pricingCardPlans (see sections/index.js).

export const hashtags = ["pricing","modern","plans","features","cta"];

export const data = [
    {
        "description": "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit laborum — semper quis lectus nulla.",
        "meta": {
            "headline": "Start building for free, then\nadd a plan to go live",
            "featuresLabel": "All plans include:"
        },
        "features": [
            {
                "title": "Unlimited domains"
            },
            {
                "title": "Unlimited web pages"
            },
            {
                "title": "Conversion analytics"
            },
            {
                "title": "A/B testing"
            },
            {
                "title": "Exclusive channels"
            },
            {
                "title": "Free resources"
            },
            {
                "title": "Landing page builder"
            },
            {
                "title": "Smart forms and reports"
            }
        ],
        "cards": [
            {
                "title": "Yearly",
                "content": "— Lorem ipsum dolor amet sit consect adipiscing.",
                "meta": {
                    "price": "$27",
                    "billing": "/billed yearly",
                    "badge": "-40%",
                    "ctaLabel": "Go Premium"
                }
            },
            {
                "title": "Monthly",
                "content": "— Lorem ipsum dolor amet sit consect adipiscing.",
                "meta": {
                    "price": "$47",
                    "billing": "/billed yearly",
                    "badge": "-30%",
                    "ctaLabel": "Go Premium"
                }
            },
            {
                "title": "Lifetime",
                "content": "— Lorem ipsum dolor amet sit consect adipiscing.",
                "meta": {
                    "price": "$127",
                    "billing": "/one-time",
                    "badge": "-20%",
                    "ctaLabel": "Go Premium"
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
                "col": "12",
                "row": "auto"
            },
            "children": [
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
                        "padding": "0 0 2.5rem"
                    },
                    "children": [
                        {
                            "source": "meta.headline",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(2rem, 4vw, 3rem)",
                                "fontWeight": "800",
                                "lineHeight": "1.1",
                                "margin": "0",
                                "maxWidth": "700px",
                                "whiteSpace": "pre-line"
                            },
                            "props": {
                                "motion": true,
                                "word": true,
                                "effect": "waveIn"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "maxWidth": "540px",
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
                "col": "3",
                "row": "auto"
            },
            "children": [
                {
                    "children": [
                        {
                            "layout": {
                                "col": 12,
                                "row": "auto",
                                "justify": "none"
                            },
                            "style": {
                                "padding": "0 0 0.5rem"
                            },
                            "children": [
                                {
                                    "source": "meta.featuresLabel",
                                    "render": "p",
                                    "style": {
                                        "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                        "fontWeight": "700",
                                        "color": "var(--color-base-content)",
                                        "margin": "0"
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    "each": "features",
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
                                "alignItems": "center",
                                "gap": "0.25rem"
                            },
                            "children": [
                                {
                                    "value": "ri:check-line",
                                    "render": "icon",
                                    "style": {
                                        "flexShrink": "0",
                                        "marginRight": "4px"
                                    },
                                    "props": {
                                        "color": "var(--color-primary)"
                                    }
                                },
                                {
                                    "source": "$item.title",
                                    "render": "span",
                                    "style": {
                                        "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                        "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "each": "cards",
            "render": "cards",
            "style": {
                "padding": "1.5rem",
                "display": "flex",
                "flexDirection": "column",
                "background": "var(--color-base-200)",
                "borderRadius": "0.875rem",
                "border": "1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)"
            },
            "props": {
                "col": 4
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "alignItems": "center",
                        "justifyContent": "space-between",
                        "marginBottom": "0.25rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h3",
                            "style": {
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "$item.meta.badge",
                            "render": "badge",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "700"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "alignItems": "baseline",
                        "gap": "0.25rem",
                        "margin": "0.5rem 0 0.875rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.price",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(2rem, 4vw, 3.5rem)",
                                "fontWeight": "800",
                                "color": "var(--color-base-content)",
                                "lineHeight": "1"
                            }
                        },
                        {
                            "source": "$item.meta.billing",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 55%, transparent)"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flex": "1",
                        "marginBottom": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
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
                            "source": "$item.meta.ctaLabel",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "width": "100%",
                                "padding": "0 1rem"
                            },
                            "props": {
                                "type": "fill",
                                "color": "primary",
                                "height": "45px",
                                "rounded": "8px"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "9",
                "row": "auto"
            }
        }
    ]
};
