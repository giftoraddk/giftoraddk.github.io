// src/sections/masonries/testimonialNeat.js
//
// Ported from astro-micro's src/sections/testimonials/spatialMasonryNeat.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: testimonialMasonryNeat (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["testimonials","spatial","masonry","quotes","clients","cards"];

export const data = [
    {
        "meta": {
            "sectionHeading": "What our clients say",
            "sectionHeadingAccent": "about us.",
            "sectionDescription": "Lorem ipsum dolor sit amet, consectetur adipiscing elit nulla at ultrices urna adipiscing penatibus duis elementum ante."
        },
        "masonry": [
            {
                "title": "\"Best investment our engineering team made this year\"",
                "content": "Onboarding a new backend engineer used to take a full week. Now they're making meaningful commits by day two. The local dev environment spins up in one command, docs are always in sync with the code, and the architecture diagrams generate themselves. It just works.",
                "pics": "https://i.pravatar.cc/80?img=15",
                "meta": {
                    "name": "Andy Smith",
                    "handle": "@andysmith"
                }
            },
            {
                "title": "\"Code reviews that actually teach\"",
                "content": "Inline suggestions explain the why, not just the what. Junior devs on my team are leveling up faster than ever.",
                "pics": "https://i.pravatar.cc/80?img=25",
                "meta": {
                    "name": "Kate Morrison",
                    "handle": "@katemorrison"
                }
            },
            {
                "title": "\"Shipping features has never been this fast\"",
                "content": "We cut our release cycle from two weeks to two days. The CI/CD pipeline practically configures itself, and rollbacks take seconds. Our engineers stopped dreading deploy Fridays — now every day feels safe to ship.",
                "pics": "https://i.pravatar.cc/80?img=8",
                "meta": {
                    "name": "John Carter",
                    "handle": "@johncarter"
                }
            },
            {
                "title": "\"Finally, a dev tool that respects my time\"",
                "content": "The autocomplete is scarily accurate and the editor feels instant even on large monorepos.",
                "pics": "https://i.pravatar.cc/80?img=47",
                "meta": {
                    "name": "Sophie Moore",
                    "handle": "@sophiemoore"
                }
            },
            {
                "title": "\"Our on-call rotation went from chaos to calm\"",
                "content": "Alerts used to wake us up at 3 AM for things that weren't even real incidents. Since we switched, the noise dropped by 80%. The anomaly detection actually understands our traffic patterns instead of firing on every spike. Sleep has been restored.",
                "pics": "https://i.pravatar.cc/80?img=12",
                "meta": {
                    "name": "Mike Warren",
                    "handle": "@mikewarren"
                }
            },
            {
                "title": "\"Debugging used to ruin my mornings\"",
                "content": "Stack traces now link directly to the exact line and the relevant recent deploy. I find the root cause before my coffee gets cold.",
                "pics": "https://i.pravatar.cc/80?img=35",
                "meta": {
                    "name": "Lily Woods",
                    "handle": "@lilywoods"
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
            "deg": 45,
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
                    "tint": "#a77ceb",
                    "total": 1,
                    "blobType": "ellipse",
                    "deg": 135
                }) },
            "props": {
                "col": 3,
                "gap": "1.5rem",
                "anime": "fade-in",
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
