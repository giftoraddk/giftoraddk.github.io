// src/sections/cards/pricingPlansSpatial.js
//
// Ported from astro-micro's src/sections/pricing/spatialCardPlans.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: pricingCardPlansSpatial (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["pricing","spatial","plans","cards","tiers","features"];

export const data = [
    {
        "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit tincidunt sed pharetra aliquam ultrices imperdiet in dui pellentesque dignissim.",
        "meta": {
            "heading": "Pricing plans."
        },
        "cards": [
            {
                "pics": "ri:box-3-line",
                "title": "Basic plan",
                "content": "Lorem ipsum dolor sit amet elit sed non doconsectetur adipiscing id.",
                "meta": {
                    "currency": "$",
                    "price": "19.99",
                    "unit": "USD",
                    "period": "/month",
                    "badge": "",
                    "f1": "Trading up to $100K per month",
                    "f2": "Send and recieve over 85 tokens",
                    "f3": "Real time crypto trading",
                    "f4": "iOS and Android App",
                    "btn": "Learn more",
                    "iconStys": {
                        "background": "var(--color-base-300)",
                        "borderRadius": "50%",
                        "padding": "0.875rem",
                        "display": "inline-flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "boxSizing": "content-box"
                    },
                    "badgeStys": {
                        "display": "none"
                    },
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 25%, transparent)",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "500",
                        "color": "var(--color-base-content)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "pics": "ri:box-3-line",
                "title": "Pro plan",
                "content": "Lorem ipsum dolor sit amet elit sed non doconsectetur adipiscing id.",
                "meta": {
                    "currency": "$",
                    "price": "29.99",
                    "unit": "USD",
                    "period": "/month",
                    "badge": "",
                    "f1": "Everything included in Basic",
                    "f2": "Trading up to $1MM per month",
                    "f3": "Windows & macOS App",
                    "f4": "Premium Support",
                    "btn": "Learn more",
                    "iconStys": {
                        "background": "color-mix(in oklab, var(--color-primary) 15%, var(--color-base-200))",
                        "borderRadius": "50%",
                        "padding": "0.875rem",
                        "display": "inline-flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "boxSizing": "content-box"
                    },
                    "badgeStys": {
                        "display": "none"
                    },
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 25%, transparent)",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "500",
                        "color": "var(--color-base-content)",
                        "width": "100%",
                        "boxSizing": "border-box"
                    }
                }
            },
            {
                "pics": "ri:box-3-line",
                "title": "Expert plan",
                "content": "Lorem ipsum dolor sit amet elit sed non doconsectetur adipiscing id.",
                "meta": {
                    "currency": "$",
                    "price": "39.99",
                    "unit": "USD",
                    "period": "/month",
                    "badge": "Popular",
                    "f1": "Everything included in Pro",
                    "f2": "Trading up to $10MM per month",
                    "f3": "Windows & macOS App",
                    "f4": "Dedicated Support",
                    "btn": "Learn more",
                    "iconStys": {
                        "background": "var(--color-primary)",
                        "borderRadius": "50%",
                        "padding": "0.875rem",
                        "display": "inline-flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "boxSizing": "content-box",
                        "color": "var(--color-base-100)"
                    },
                    "badgeStys": {},
                    "btnStys": {
                        "display": "flex",
                        "justifyContent": "center",
                        "alignItems": "center",
                        "height": "48px",
                        "background": "var(--color-primary)",
                        "borderRadius": "2rem",
                        "cursor": "pointer",
                        "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                        "fontWeight": "700",
                        "color": "var(--color-base-100)",
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
                        "justify": "between"
                    },
                    "style": {
                        "gap": "0.5rem",
                        "padding": "3rem 0",
                        "flexWrap": "wrap"
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
                                "word": false,
                                "effect": "riseUp"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "maxWidth": "40rem",
                                "margin": "0.75rem auto 0",
                                "width": "100%",
                                "textAlign": "right"
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
                "padding": "1.75rem"
            },
            "bg": { ...getStyleOpts({
                    "rounded": "1.25rem",
                    "tint": "#ffc75f",
                    "total": 2,
                    "blobType": "circleOverlap"
                }) },
            "props": {
                "col": 4
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "position": "absolute",
                        "top": "1.25rem",
                        "right": "1.25rem"
                    },
                    "children": [
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
                        "justify": "center"
                    },
                    "style": {
                        "marginBottom": "1.25rem"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "icon",
                            "style": "$item.meta.iconStys",
                            "props": {
                                "width": "2rem"
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
                        "marginBottom": "0.25rem"
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
                        "gap": "0.25rem",
                        "marginBottom": "0.75rem"
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
                                "marginTop": "0.5rem",
                                "lineHeight": "1"
                            }
                        },
                        {
                            "source": "$item.meta.price",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(1.5rem, 2.5vw, 2rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "lineHeight": "1"
                            }
                        },
                        {
                            "source": "$item.meta.unit",
                            "render": "span",
                            "style": {
                                "fontWeight": "600",
                                "color": "var(--color-base-content)",
                                "alignSelf": "flex-end",
                                "marginBottom": "0.2rem"
                            }
                        },
                        {
                            "source": "$item.meta.period",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 55%, transparent)",
                                "alignSelf": "flex-end",
                                "marginBottom": "0.2rem"
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
                        "marginBottom": "1.25rem"
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
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "marginBottom": "1.25rem"
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
                                "color": "var(--color-primary)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.4"
                            },
                            "props": {
                                "prefix": "ri:checkbox-circle-fill",
                                "iconSize": "1.125rem"
                            }
                        },
                        {
                            "source": "$item.meta.f2",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "var(--color-base-content)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.4"
                            },
                            "props": {
                                "prefix": "ri:checkbox-circle-fill",
                                "iconSize": "1.125rem"
                            }
                        },
                        {
                            "source": "$item.meta.f3",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "var(--color-base-content)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.4"
                            },
                            "props": {
                                "prefix": "ri:checkbox-circle-fill",
                                "iconSize": "1.125rem"
                            }
                        },
                        {
                            "source": "$item.meta.f4",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "color": "var(--color-base-content)",
                                "display": "flex",
                                "alignItems": "center",
                                "gap": "0.5rem",
                                "lineHeight": "1.4"
                            },
                            "props": {
                                "prefix": "ri:checkbox-circle-fill",
                                "iconSize": "1.125rem"
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
