// src/sections/cards/teamGridNeat.js
//
// Ported from astro-micro's src/sections/team/spatialCardGridNeat.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: teamCardGridNeat (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["team","spatial","grid","members","people","cards"];

export const data = [
    {
        "meta": {
            "introHeading": "Meet the team",
            "introHeadingHighlight": "behind Finantech.",
            "introText": "Lorem ipsum dolor sit amet consectetur adipiscing id elit volutpat\namet tortor nunc ridiculus felis venenatis ipsum dui."
        },
        "cards": [
            {
                "pics": "https://i.pravatar.cc/400?img=11",
                "title": "John Carter",
                "meta": {
                    "role": "CEO & Founder"
                }
            },
            {
                "pics": "https://i.pravatar.cc/400?img=45",
                "title": "Matt Cannon",
                "meta": {
                    "role": "VP of Marketing"
                }
            },
            {
                "pics": "https://i.pravatar.cc/400?img=47",
                "title": "Sophie Moore",
                "meta": {
                    "role": "VP of Product"
                }
            },
            {
                "pics": "https://i.pravatar.cc/400?img=12",
                "title": "Andy Smith",
                "meta": {
                    "role": "VP of Design"
                }
            },
            {
                "pics": "https://i.pravatar.cc/400?img=8",
                "title": "Patrick Meyer",
                "meta": {
                    "role": "VP of Development"
                }
            },
            {
                "pics": "https://i.pravatar.cc/400?img=35",
                "title": "Graham Hills",
                "meta": {
                    "role": "VP of Sales"
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
            "tint": "#a77ceb",
            "total": 2,
            "blobType": "circleOverlap",
            "blobMove": "swap",
            "deg": 225,
            "distance": 100
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
                        "gap": "0.25rem",
                        "textAlign": "center",
                        "padding": "3rem 0 2.5rem"
                    },
                    "children": [
                        {
                            "source": "meta.introHeading",
                            "render": "h2",
                            "style": {
                                "margin": "0",
                                "color": "var(--color-base-content)"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "fallDown"
                            }
                        },
                        {
                            "source": "meta.introHeadingHighlight",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(2.5rem, 5vw, 4.5rem)",
                                "margin": "0",
                                "color": "var(--color-primary)"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "riseUp"
                            }
                        },
                        {
                            "source": "meta.introText",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "maxWidth": "40rem",
                                "margin": "1.25rem auto 0",
                                "whiteSpace": "pre-line"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "layout": {
                "col": "12",
                "row": "auto"
            },
            "style": {
                "borderRadius": "1.25rem",
                "overflow": "hidden"
            },
            "children": [
                {
                    "each": "cards",
                    "render": "cards",
                    "style": {
                        "position": "relative",
                        "overflow": "hidden",
                        "padding": "0"
                    },
                    "bg": { ...getStyleOpts({
                            "rounded": "0",
                            "tint": "#2ebd85",
                            "total": 2
                        }) },
                    "props": {
                        "col": 4,
                        "gap": "1px"
                    },
                    "children": [
                        {
                            "layout": {
                                "col": "12",
                                "row": "auto",
                                "justify": "none"
                            },
                            "children": [
                                {
                                    "source": "$item.pics",
                                    "render": "gallery",
                                    "style": {
                                        "width": "100%",
                                        "aspectRatio": "3/4",
                                        "objectFit": "cover",
                                        "display": "block",
                                        "filter": "grayscale(100%)"
                                    }
                                }
                            ]
                        },
                        {
                            "layout": {
                                "col": "12",
                                "row": "auto",
                                "justify": "between"
                            },
                            "style": {
                                "position": "absolute",
                                "bottom": "0",
                                "left": "0",
                                "right": "0",
                                "padding": "1.5rem 1.25rem 1.1rem",
                                "background": "linear-gradient(to top, var(--color-base-100) 0%, transparent 100%)",
                                "flexWrap": "wrap",
                                "gap": "0.2rem",
                                "alignItems": "center"
                            },
                            "children": [
                                {
                                    "source": "$item.title",
                                    "render": "p",
                                    "style": {
                                        "fontWeight": "700",
                                        "fontSize": "clamp(1rem, 1.5vw, 1.25rem)",
                                        "lineHeight": "1.3",
                                        "color": "var(--color-base-content)",
                                        "width": "100%",
                                        "margin": "0"
                                    }
                                },
                                {
                                    "source": "$item.meta.role",
                                    "render": "p",
                                    "style": {
                                        "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                        "color": "var(--color-primary)",
                                        "flex": "1",
                                        "margin": "0"
                                    }
                                },
                                {
                                    "value": "ri:facebook-fill",
                                    "render": "icon",
                                    "style": {
                                        "color": "var(--color-base-content)",
                                        "cursor": "pointer",
                                        "opacity": "0.75"
                                    },
                                    "props": {
                                        "width": "1rem"
                                    }
                                },
                                {
                                    "value": "ri:twitter-x-line",
                                    "render": "icon",
                                    "style": {
                                        "color": "var(--color-base-content)",
                                        "cursor": "pointer",
                                        "opacity": "0.75"
                                    },
                                    "props": {
                                        "width": "1rem"
                                    }
                                },
                                {
                                    "value": "ri:linkedin-fill",
                                    "render": "icon",
                                    "style": {
                                        "color": "var(--color-base-content)",
                                        "cursor": "pointer",
                                        "opacity": "0.75"
                                    },
                                    "props": {
                                        "width": "1rem"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};
