// src/sections/masonries/heroHoriFeature.js
//
// Ported from astro-micro's src/sections/hero/spatialHoriFeature.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: heroHoriFeature (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["hero","spatial","horizontal","split","features","cta"];

export const data = [
    {
        "subtitle": "Workflow Integration",
        "description": "So how does it work? Let's check our Getting Started tutorial pre-made templates.",
        "meta": {
            "heading": "Why you\nShould choose Sasup"
        },
        "masonry": [
            {
                "title": "Daily Auto Update",
                "meta": {
                    "icon": "ri:refresh-line",
                    "linkLabel": "Learn More →"
                }
            },
            {
                "title": "Why Choose Sasup",
                "meta": {
                    "icon": "ri:focus-3-line",
                    "linkLabel": "Learn More →"
                }
            },
            {
                "title": "Accelerated Process",
                "meta": {
                    "icon": "ri:flashlight-fill",
                    "linkLabel": "Learn More →"
                }
            },
            {
                "title": "Google Analytics",
                "meta": {
                    "icon": "ri:bar-chart-2-fill",
                    "linkLabel": "Learn More →"
                }
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
            "tint": "#ffc75f",
            "total": 1,
            "blobType": "circleOverlap",
            "deg": 180
        }) },
    "children": [
        {
            "layout": {
                "col": "6",
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
                        "gap": "1.25rem",
                        "paddingRight": "1.5rem",
                        "paddingBottom": "2rem"
                    },
                    "children": [
                        {
                            "source": "subtitle",
                            "render": "badge",
                            "style": {
                                "alignSelf": "flex-start",
                                "fontWeight": "600",
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)"
                            },
                            "props": {
                                "type": "fill",
                                "color": "primary"
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
                                "word": true,
                                "effect": "pinIn"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0",
                                "maxWidth": "38rem"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "layout": {
                "col": "6",
                "row": "auto"
            },
            "props": {
                "anime": "tilt-in-tl"
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
                            "value": "https://i.ibb.co/Gf97mpFP/landscape-2.png",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "maxHeight": "400px",
                                "objectFit": "contain",
                                "display": "block"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "masonry",
            "render": "masonry",
            "style": {
                "padding": "1rem",
                "borderRadius": "1.25rem",
                "border": "1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)"
            },
            "bg": { ...getStyleOpts({
                    "rounded": "1.25rem",
                    "tint": "#ffc75f",
                    "total": 1,
                    "blobType": "circleOverlap"
                }) },
            "props": {
                "col": 4,
                "gap": "1rem",
                "anime": "fade-in",
                "animeQueue": "80ms"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "padding": "0",
                        "alignItems": "center"
                    },
                    "children": [
                        {
                            "source": "$item.meta.icon",
                            "render": "icon",
                            "style": {
                                "width": "2.5rem",
                                "height": "2.5rem",
                                "borderRadius": "50%",
                                "background": "color-mix(in oklab, var(--color-primary) 15%, transparent)",
                                "display": "flex",
                                "alignItems": "center",
                                "justifyContent": "center",
                                "flexShrink": "0"
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
                                "marginLeft": "0.5rem",
                                "color": "var(--color-base-content)"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "right"
                    },
                    "style": {
                        "padding": "0"
                    },
                    "children": [
                        {
                            "source": "$item.meta.linkLabel",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "color": "var(--color-base-content)",
                                "cursor": "pointer"
                            }
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
