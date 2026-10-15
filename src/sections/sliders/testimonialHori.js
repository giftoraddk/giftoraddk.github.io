// src/sections/sliders/testimonialHori.js
//
// Ported from astro-micro's src/sections/testimonials/modernHori.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: testimonialHori (see sections/index.js).

export const hashtags = ["testimonials","modern","slider","quotes","hori"];

export const data = [
    {
        "subtitle": "TESTIMONIALS",
        "meta": {
            "sectionHeading": "Loved by teams\naround the world"
        },
        "slider": [
            {
                "title": "Sarah Kim",
                "content": "Nexora transformed the way we build software. Our team ships faster, with fewer bugs and less stress.",
                "pics": "https://i.pravatar.cc/80?img=47",
                "meta": {
                    "role": "Head of Engineering, Finova"
                }
            },
            {
                "title": "Marcus Lee",
                "content": "The onboarding was seamless and the integrations just work. I wish we had switched to Nexora sooner.",
                "pics": "https://i.pravatar.cc/80?img=12",
                "meta": {
                    "role": "CTO, Arclight Labs"
                }
            },
            {
                "title": "Priya Nair",
                "content": "Deployment pipelines that used to take hours now run in minutes. The visibility across our stack is incredible.",
                "pics": "https://i.pravatar.cc/80?img=30",
                "meta": {
                    "role": "VP Engineering, Solaris"
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
                "col": "5",
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
                        "flexDirection": "column",
                        "gap": "0.5rem"
                    },
                    "children": [
                        {
                            "source": "subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "letterSpacing": "0.12em",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "meta.sectionHeading",
                            "render": "h3",
                            "style": {
                                "fontWeight": "700",
                                "letterSpacing": "-0.02em",
                                "color": "var(--color-base-content)",
                                "margin": "0",
                                "whiteSpace": "pre-line"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "riseUp"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "layout": {
                "col": "7",
                "row": 2
            },
            "style": {
                "height": "100%"
            },
            "props": {
                "anime": "bounce-in-right"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "overflow"
                    },
                    "style": {
                        "borderRadius": "1rem",
                        "height": "100%"
                    },
                    "children": [
                        {
                            "value": "https://placehold.co/900x600/8B8680/ddd",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "100%",
                                "objectFit": "cover",
                                "display": "block",
                                "minHeight": "420px"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "slider",
            "render": "slider",
            "style": {
                "background": "var(--color-base-200)",
                "borderRadius": "0.875rem",
                "border": "1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)"
            },
            "props": {
                "nav": true,
                "loop": true,
                "slides": 1,
                "spacing": 20,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "padding": "1.25rem 1.25rem 0.5rem"
                    },
                    "children": [
                        {
                            "value": "“",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(2.5rem, 5vw, 4.5rem)",
                                "lineHeight": "0.8",
                                "color": "var(--color-primary)",
                                "display": "block"
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
                        "padding": "0 1.25rem 1rem"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "margin": "0",
                                "color": "var(--color-base-content)"
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
                        "padding": "0.25rem 0 1.25rem 1.25rem"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "2.25rem",
                                "height": "2.25rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "flexShrink": "0"
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
                        "gap": "0.1rem",
                        "padding": "0.25rem 1.25rem 1.25rem 0.5rem",
                        "justifyContent": "center"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "span",
                            "style": {
                                "fontWeight": "700",
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.3",
                                "display": "block",
                                "color": "var(--color-base-content)"
                            }
                        },
                        {
                            "source": "$item.meta.role",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.4",
                                "display": "block",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "5",
                "row": "auto"
            }
        }
    ]
};
