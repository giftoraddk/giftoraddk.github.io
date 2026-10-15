// src/sections/cards/heroHoriGallery.js
//
// Ported from astro-micro's src/sections/hero/spatialHoriGallery.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: heroHoriGallery (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["hero","spatial","split","gallery","checklist","cta"];

export const data = [
    {
        "title": "Ship Software\nFaster Than Ever",
        "description": "A modern development platform that streamlines your workflow, automates deployments, and keeps your entire team in sync from day one.",
        "meta": {
            "titleHighlight": "with Confidence",
            "ctaPrimary": "Get Started Free"
        },
        "cards": [
            {
                "label": "Clean, maintainable codebase"
            },
            {
                "label": "Real-time collaboration tools"
            },
            {
                "label": "Automated CI/CD pipeline"
            },
            {
                "label": "Scalable cloud infrastructure"
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "3rem 0",
        "alignItems": "center"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "hueCustom": 0
        }) },
    "children": [
        {
            "layout": {
                "col": "6",
                "row": "3"
            },
            "style": {
                "padding": "0.5rem",
                "alignContent": "center"
            },
            "props": {
                "anime": "tilt-in-tr"
            },
            "children": [
                {
                    "layout": {
                        "col": "6",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "padding": "0.5rem"
                    },
                    "children": [
                        {
                            "value": "https://i.ibb.co/zHH3bRp1/square.png",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "aspectRatio": "1",
                                "objectFit": "cover",
                                "borderRadius": "1.25rem",
                                "display": "block"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "6",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "padding": "0.5rem"
                    },
                    "children": [
                        {
                            "value": "https://i.ibb.co/MxLzRfPK/square-2.png",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "aspectRatio": "1",
                                "objectFit": "cover",
                                "borderRadius": "1.25rem",
                                "display": "block"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "6",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "padding": "0.5rem"
                    },
                    "children": [
                        {
                            "value": "https://i.ibb.co/MxLzRfPK/square-2.png",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "aspectRatio": "1",
                                "objectFit": "cover",
                                "borderRadius": "1.25rem",
                                "display": "block"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "6",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "padding": "0.5rem"
                    },
                    "children": [
                        {
                            "value": "https://i.ibb.co/zHH3bRp1/square.png",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "aspectRatio": "1",
                                "objectFit": "cover",
                                "borderRadius": "1.25rem",
                                "display": "block"
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
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0",
                        "paddingLeft": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h1",
                            "style": {
                                "whiteSpace": "pre-line",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": true,
                                "effect": "focusIn"
                            }
                        },
                        {
                            "source": "meta.titleHighlight",
                            "render": "h2",
                            "style": {
                                "margin": "0",
                                "color": "var(--color-primary)"
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
                                "margin": "1.25rem 0 0",
                                "maxWidth": "38rem"
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
                "col": 12,
                "gap": "0.5rem",
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
                        "padding": "0 1.5rem 0.5rem"
                    },
                    "children": [
                        {
                            "value": "ri:checkbox-circle-fill",
                            "render": "icon",
                            "style": {
                                "paddingRight": "0.75rem"
                            },
                            "props": {
                                "width": "1.25rem",
                                "color": "var(--color-primary)"
                            }
                        },
                        {
                            "source": "$item.label",
                            "render": "span",
                            "style": {
                                "fontWeight": "500",
                                "color": "var(--color-base-content)"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "6",
                "row": "auto"
            }
        },
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
                        "justify": "none"
                    },
                    "style": {
                        "paddingLeft": "1.5rem"
                    },
                    "children": [
                        {
                            "source": "meta.ctaPrimary",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "padding": "0 2rem"
                            },
                            "props": {
                                "type": "fill",
                                "color": "primary",
                                "height": "48px",
                                "rounded": "24px"
                            }
                        }
                    ]
                }
            ]
        }
    ]
};
