// src/sections/masonries/testimonialNeatApex.js
//
// Ported from astro-micro's src/sections/testimonials/spatialMasonryNeatApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: testimonialMasonryNeatApex (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["testimonials","spatial","masonry","quotes","clients","cards","apex"];

export const data = [
    {
        "subtitle": "CUSTOMER STORIES",
        "meta": {
            "sectionHeading": "What our clients say",
            "sectionHeadingAccent": "about Apex.",
            "sectionDescription": "Real developers. Real products. Zero boilerplate."
        },
        "masonry": [
            {
                "title": "\"Dropped it into our React app in 10 minutes\"",
                "content": "No wrappers, no adapters — just import the script tag and all 80+ components work. Our design system migration that was supposed to take a quarter finished in three weeks.",
                "pics": "https://i.pravatar.cc/80?img=15",
                "meta": {
                    "name": "Andy Tran",
                    "handle": "@andytran_dev"
                }
            },
            {
                "title": "\"True framework agnosticism — finally\"",
                "content": "We run React, Vue, and a legacy jQuery app. Apex is the only component library that works across all three without a single line of glue code.",
                "pics": "https://i.pravatar.cc/80?img=25",
                "meta": {
                    "name": "Sara Kim",
                    "handle": "@sarakim_ui"
                }
            },
            {
                "title": "\"The theming system is a work of art\"",
                "content": "Five CSS variables and you have a completely branded design system. Dark mode, high-contrast, even per-tenant white-labeling — all handled without forking the library. Our customers love the polish.",
                "pics": "https://i.pravatar.cc/80?img=8",
                "meta": {
                    "name": "James Okafor",
                    "handle": "@jamesokafor"
                }
            },
            {
                "title": "\"SSR just worked out of the box\"",
                "content": "Next.js + Apex. Zero hydration mismatches, zero flash of unstyled content. Ship it.",
                "pics": "https://i.pravatar.cc/80?img=47",
                "meta": {
                    "name": "Mia Chen",
                    "handle": "@mia_frontend"
                }
            },
            {
                "title": "\"web-board replaced 2000 lines of template code\"",
                "content": "We rebuilt our marketing pages as JSON configs. Designers now ship layout changes without touching a single JSX file. The declarative approach feels like the right abstraction the ecosystem was always missing.",
                "pics": "https://i.pravatar.cc/80?img=12",
                "meta": {
                    "name": "Lucas Pereira",
                    "handle": "@lucaspereira"
                }
            },
            {
                "title": "\"IndexedDB caching saved our mobile users\"",
                "content": "Offline-first data without writing a single service worker. The conductor layer just handled it.",
                "pics": "https://i.pravatar.cc/80?img=35",
                "meta": {
                    "name": "Emma Walsh",
                    "handle": "@emmawalsh"
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
            "tint": "var(--color-primary)",
            "total": 2,
            "blobType": "circleOverlap",
            "deg": 180,
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
                        "maxWidth": "fit-content",
                        "margin": "3rem auto 0",
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
                        "gap": "0.25rem",
                        "textAlign": "center",
                        "padding": "1rem 0 2.5rem"
                    },
                    "children": [
                        {
                            "source": "meta.sectionHeading",
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
                            "source": "meta.sectionHeadingAccent",
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
                            "source": "meta.sectionDescription",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "maxWidth": "40rem",
                                "margin": "1.25rem auto 0"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "masonry",
            "render": "masonry",
            "bg": { ...getStyleOpts({
                    "rounded": "1.25rem",
                    "tint": "var(--color-primary)",
                    "total": 1,
                    "blobType": "ellipse",
                    "deg": 135
                }) },
            "props": {
                "col": 3,
                "gap": "1.5rem",
                "anime": "tilt-in-bl",
                "animeQueue": "100ms"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "padding": "1.5rem 1.5rem 0.75rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontWeight": "700",
                                "margin": "0",
                                "color": "var(--color-base-content)"
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
                        "padding": "0 1.5rem 1.25rem"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 72%, transparent)"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "2",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "alignItems": "center",
                        "padding": "0 0 1.5rem 1.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "2.5rem",
                                "height": "2.5rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "flexShrink": "0",
                                "display": "block"
                            }
                        }
                    ]
                },
                {
                    "layout": {
                        "col": "10",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.15rem",
                        "padding": "0 1.5rem 1.5rem 0.75rem",
                        "justifyContent": "center"
                    },
                    "children": [
                        {
                            "source": "$item.meta.name",
                            "render": "span",
                            "style": {
                                "fontWeight": "700",
                                "lineHeight": "1.3",
                                "display": "block",
                                "color": "var(--color-base-content)"
                            }
                        },
                        {
                            "source": "$item.meta.handle",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.3",
                                "display": "block",
                                "color": "var(--color-primary)"
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
