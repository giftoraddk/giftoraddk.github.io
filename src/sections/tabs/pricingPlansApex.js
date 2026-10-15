// src/sections/tabs/pricingPlansApex.js
//
// Ported from astro-micro's src/sections/pricing/spatialTabPlansApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: pricingTabPlansApex (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["pricing","spatial","plans","toggle","monthly","annual","tabs","apex"];

export const data = [
    {
        "subtitle": "Subscription Options",
        "description": "Transparent pricing. No hidden fees.",
        "meta": {
            "heading": "Plans and Pricing"
        },
        "tabs": [
            {
                "title": "Free",
                "content": "Try every component — no credit card required",
                "tab": "monthly",
                "tabLabel": "Monthly",
                "meta": {
                    "currency": "$",
                    "price": "0",
                    "billing": "*1 month free trial, no commitment",
                    "f1": "All 80+ UI components",
                    "f2": "Community themes & presets",
                    "f3": "1 project",
                    "f4": "Community support",
                    "btn": "Start Free Trial",
                    "badge": "",
                    "badgeStys": {
                        "display": "none"
                    },
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "500",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)",
                        "color": "var(--color-base-content)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "title": "Pro",
                "content": "For developers building serious products",
                "tab": "monthly",
                "tabLabel": "Monthly",
                "meta": {
                    "currency": "$",
                    "price": "9",
                    "billing": "*billed monthly ($108/year)",
                    "f1": "Everything in Free",
                    "f2": "Unlimited projects",
                    "f3": "Premium themes & custom CSS vars",
                    "f4": "Priority email support",
                    "btn": "Get Started",
                    "badge": "Most popular",
                    "badgeStys": {},
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "700",
                        "background": "var(--color-primary)",
                        "color": "var(--color-base-100)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "title": "Team",
                "content": "For teams shipping together at scale",
                "tab": "monthly",
                "tabLabel": "Monthly",
                "meta": {
                    "currency": "$",
                    "price": "45",
                    "billing": "*up to 10 members, billed monthly",
                    "f1": "Everything in Pro",
                    "f2": "Up to 10 team members",
                    "f3": "Shared design tokens & theme sync",
                    "f4": "Dedicated Slack support",
                    "btn": "Get Started",
                    "badge": "",
                    "badgeStys": {
                        "display": "none"
                    },
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "500",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)",
                        "color": "var(--color-base-content)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "title": "Free",
                "content": "Try every component — no credit card required",
                "tab": "annual",
                "tabLabel": "Annual  −20%",
                "meta": {
                    "currency": "$",
                    "price": "0",
                    "billing": "*3 months free trial, billed yearly",
                    "f1": "All 80+ UI components",
                    "f2": "Community themes & presets",
                    "f3": "1 project",
                    "f4": "Community support",
                    "btn": "Start Free Trial",
                    "badge": "",
                    "badgeStys": {
                        "display": "none"
                    },
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "500",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)",
                        "color": "var(--color-base-content)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "title": "Pro",
                "content": "For developers building serious products",
                "tab": "annual",
                "tabLabel": "Annual  −20%",
                "meta": {
                    "currency": "$",
                    "price": "86",
                    "billing": "*billed yearly ($86  $108) — save 20%",
                    "f1": "Everything in Free",
                    "f2": "Unlimited projects",
                    "f3": "Premium themes & custom CSS vars",
                    "f4": "Priority email support",
                    "btn": "Get Started",
                    "badge": "Most popular",
                    "badgeStys": {},
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "700",
                        "background": "var(--color-primary)",
                        "color": "var(--color-base-100)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "title": "Team",
                "content": "For teams shipping together at scale",
                "tab": "annual",
                "tabLabel": "Annual  −20%",
                "meta": {
                    "currency": "$",
                    "price": "396",
                    "billing": "*up to 10 members, billed yearly — save 20%",
                    "f1": "Everything in Pro",
                    "f2": "Up to 10 team members",
                    "f3": "Shared design tokens & theme sync",
                    "f4": "Dedicated Slack support",
                    "btn": "Get Started",
                    "badge": "",
                    "badgeStys": {
                        "display": "none"
                    },
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "500",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)",
                        "color": "var(--color-base-content)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "0 0 4rem"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "hueCustom": 0
        }) },
    "children": [
        {
            "layout": {
                "col": "12",
                "row": "auto"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "maxWidth": "fit-content",
                        "margin": "3.5rem auto 0",
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
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "alignItems": "center",
                        "textAlign": "center",
                        "gap": "0.75rem",
                        "padding": "1rem 0 2rem"
                    },
                    "children": [
                        {
                            "source": "meta.heading",
                            "render": "h2",
                            "style": {
                                "margin": "0",
                                "color": "var(--color-base-content)"
                            },
                            "props": {
                                "motion": true,
                                "effect": "riseUp"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
                                "margin": "0",
                                "maxWidth": "32rem"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "tabs",
            "render": "tabs",
            "style": {
                "padding": "2rem 1.5rem",
                "position": "relative"
            },
            "bg": { ...getStyleOpts({
                    "rounded": "1.5rem",
                    "tint": "var(--color-primary)",
                    "total": 1,
                    "blobType": "ellipse",
                    "deg": 0
                }) },
            "props": {
                "pack": 3,
                "idField": "tab",
                "labelField": "tabLabel",
                "active": "annual",
                "size": "md"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "between"
                    },
                    "style": {
                        "alignItems": "center",
                        "gap": "0.75rem",
                        "marginBottom": "0.375rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h3",
                            "style": {
                                "fontSize": "clamp(1rem, 1.5vw, 1.25rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "$item.meta.badge",
                            "render": "badge",
                            "style": "$item.meta.badgeStys",
                            "props": {
                                "color": "primary",
                                "type": "fill"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "marginBottom": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
                                "margin": "0",
                                "lineHeight": "1.55"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "alignItems": "baseline",
                        "gap": "0.125rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.currency",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(1.25rem, 2vw, 1.5rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "alignSelf": "flex-start",
                                "marginTop": "0.35rem",
                                "lineHeight": "1"
                            }
                        },
                        {
                            "source": "$item.meta.price",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.5rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "lineHeight": "1"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "marginBottom": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.billing",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.65rem, 0.8vw, 0.75rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 40%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "marginBottom": "1.5rem"
                    },
                    "children": [
                        {
                            "value": "",
                            "render": "span",
                            "style": {
                                "display": "block",
                                "height": "1px",
                                "background": "color-mix(in oklab, var(--color-base-content) 12%, transparent)",
                                "width": "100%"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.75rem",
                        "flex": "1",
                        "marginBottom": "1.75rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.f1",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.5"
                            },
                            "props": {
                                "prefix": "ri:check-line",
                                "iconSize": "1rem"
                            }
                        },
                        {
                            "source": "$item.meta.f2",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.5"
                            },
                            "props": {
                                "prefix": "ri:check-line",
                                "iconSize": "1rem"
                            }
                        },
                        {
                            "source": "$item.meta.f3",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.5"
                            },
                            "props": {
                                "prefix": "ri:check-line",
                                "iconSize": "1rem"
                            }
                        },
                        {
                            "source": "$item.meta.f4",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.5"
                            },
                            "props": {
                                "prefix": "ri:check-line",
                                "iconSize": "1rem"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "children": [
                        {
                            "source": "$item.meta.btn",
                            "render": "span",
                            "style": "$item.meta.btnStys"
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
