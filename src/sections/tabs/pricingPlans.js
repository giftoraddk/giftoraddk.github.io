// src/sections/tabs/pricingPlans.js
//
// Ported from astro-micro's src/sections/pricing/spatialTabPlans.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: pricingTabPlans (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["pricing","spatial","plans","toggle","monthly","annual","tabs"];

export const data = [
    {
        "description": "Transparent pricing. No hidden fees.",
        "meta": {
            "heading": "Plans and Pricing"
        },
        "tabs": [
            {
                "title": "Free",
                "content": "Great for occasional prospecting",
                "tab": "monthly",
                "tabLabel": "Monthly",
                "meta": {
                    "currency": "$",
                    "price": "0",
                    "billing": "*per month, no commitment",
                    "f1": "Up to 5 drafts",
                    "f2": "Publishing 15 posts monthly",
                    "f3": "Connect 1 account",
                    "f4": "API integration",
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
                "title": "Pro",
                "content": "Great for influencers and content creators",
                "tab": "monthly",
                "tabLabel": "Monthly",
                "meta": {
                    "currency": "$",
                    "price": "45",
                    "billing": "*billed monthly ($540/year)",
                    "f1": "Unlimited drafts",
                    "f2": "Unlimited posts, threads",
                    "f3": "Unlimited social media profiles",
                    "f4": "Detailed metrics",
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
                "content": "For business purposes and agencies",
                "tab": "monthly",
                "tabLabel": "Monthly",
                "meta": {
                    "currency": "$",
                    "price": "85",
                    "billing": "*billed monthly ($1020/year)",
                    "f1": "Everything in Pro plus:",
                    "f2": "Up to 10 team members",
                    "f3": "Zapier integration",
                    "f4": "Training custom AI",
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
                "content": "Great for occasional prospecting",
                "tab": "annual",
                "tabLabel": "Annual  −25%",
                "meta": {
                    "currency": "$",
                    "price": "0",
                    "billing": "*billed yearly ($0)",
                    "f1": "Up to 5 drafts",
                    "f2": "Publishing 15 posts monthly",
                    "f3": "Connect 1 account",
                    "f4": "API integration",
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
                "title": "Pro",
                "content": "Great for influencers and content creators",
                "tab": "annual",
                "tabLabel": "Annual  −25%",
                "meta": {
                    "currency": "$",
                    "price": "36",
                    "billing": "*billed yearly ($432  $540)",
                    "f1": "Unlimited drafts",
                    "f2": "Unlimited posts, threads",
                    "f3": "Unlimited social media profiles",
                    "f4": "Detailed metrics",
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
                "content": "For business purposes and agencies",
                "tab": "annual",
                "tabLabel": "Annual  −25%",
                "meta": {
                    "currency": "$",
                    "price": "64",
                    "billing": "*billed yearly ($768  $960)",
                    "f1": "Everything in Pro plus:",
                    "f2": "Up to 10 team members",
                    "f3": "Zapier integration",
                    "f4": "Training custom AI",
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
            "gradient": false
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
                        "flexDirection": "column",
                        "alignItems": "center",
                        "textAlign": "center",
                        "gap": "0.75rem",
                        "padding": "3.5rem 0 2rem"
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
                    "tint": "#a77ceb",
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
                                "fontSize": "clamp(2.5rem, 4vw, 3.5rem)",
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
