// src/sections/cards/heroSplitGallery.js
//
// Ported from astro-micro's src/sections/hero/spatialSplitGalleryApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: heroSplitGallery (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["hero","spatial","split","gallery","checklist","cta"];

export const data = [
    {
        "subtitle": "THE DECLARATIVE UI ENGINE",
        "title": "From JSON config\nto production UI",
        "description": "Skip the template code. Apex's layout engine turns a JSON config into fully rendered sections — cards, sliders, accordions, and more — with 80+ components, runtime theming, and zero external dependencies.",
        "meta": {
            "titleHighlight": "in minutes.",
            "ctaPrimary": "Get Started Free",
            "ctaSecondary": "View on GitHub"
        },
        "cards": [
            {
                "label": "Framework-agnostic — works everywhere"
            },
            {
                "label": "Zero runtime dependencies"
            },
            {
                "label": "Full TypeScript & SSR support"
            },
            {
                "label": "CSS variable theming out of the box"
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
                "col": "7",
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
                        "maxWidth": "fit-content",
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
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0",
                        "paddingRight": "1.5rem"
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
                                "effect": "scatterIn"
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
                                "effect": "scatterIn"
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
            "layout": {
                "col": "5",
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
            "each": "cards",
            "render": "cards",
            "props": {
                "col": 12,
                "gap": "0.5rem",
                "anime": "slide-in-blurred-bottom",
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
                        "padding": "0 0 0.5rem"
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
                "col": "7",
                "row": "auto"
            }
        },
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
                        "gap": "0.75rem",
                        "paddingRight": "1.5rem"
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
                                "ui": "modern",
                                "color": "primary",
                                "height": "48px",
                                "rounded": "24px"
                            }
                        },
                        {
                            "source": "meta.ctaSecondary",
                            "render": "button",
                            "style": {
                                "fontWeight": "600",
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "padding": "0 2rem",
                                "color": "var(--color-base-content)",
                                "borderColor": "color-mix(in oklab, var(--color-base-content) 22%, transparent)"
                            },
                            "props": {
                                "type": "outline",
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
