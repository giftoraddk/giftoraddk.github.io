// src/sections/cards/contactHoriMap.js
//
// Ported from astro-micro's src/sections/contact/modernHoriMap.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

export const hashtags = [
    "contact",
    "modern",
    "hori",
    "map",
    "icon",
    "link"
];

export const data = [
    {
        "subtitle": "CONTACT",
        "title": "Let's build something\ngreat together",
        "description": "Have questions or want to learn more?\nWe'd love to hear from you.",
        "meta": {
            "address": "1 Đ. Nguyễn Tất Thành, Xóm Chiếu, Hồ Chí Minh, Việt Nam",
            "phone": "+1 (669) 123-4567",
            "email": "hello@apex.com"
        }
    }
];

export const config = {
    "style": {
        "padding": "3rem 0"
    },
    "children": [
        {
            "each": "$records",
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.subtitle",
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
                            "source": "$item.title",
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
                                "effect": "scatterIn"
                            }
                        },
                        {
                            "source": "$item.description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0",
                                "whiteSpace": "pre-line"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "5",
                "row": "auto"
            }
        },
        {
            "each": "$records",
            "style": {
                "height": "100%"
            },
            "props": {
                "anime": "swirl-in-fwd"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "children": [
                        {
                            "source": "$item.meta.address",
                            "render": "google-map",
                            "style": {
                                "width": "100%",
                                "minHeight": "320px"
                            },
                            "props": {
                                "zoom": 15,
                                "rounded": "1rem",
                                "height": "100%"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "7",
                "row": 2
            }
        },
        {
            "each": "$records",
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "gap": "0.75rem",
                        "alignItems": "flex-start",
                        "padding": "0",
                        "flexWrap": "nowrap"
                    },
                    "children": [
                        {
                            "value": "ri:map-pin-2-line",
                            "render": "icon",
                            "style": {
                                "flexShrink": "0"
                            },
                            "props": {
                                "width": "1rem",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        },
                        {
                            "source": "$item.meta.address",
                            "render": "a",
                            "props": {
                                "target": "_blank",
                                "location": true
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
                        "gap": "0.75rem",
                        "alignItems": "flex-start",
                        "padding": "0",
                        "flexWrap": "nowrap"
                    },
                    "children": [
                        {
                            "value": "ri:phone-line",
                            "render": "icon",
                            "style": {
                                "flexShrink": "0"
                            },
                            "props": {
                                "width": "1rem",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        },
                        {
                            "source": "$item.meta.phone",
                            "render": "a",
                            "props": {
                                "target": "_blank"
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
                        "gap": "0.75rem",
                        "alignItems": "flex-start",
                        "padding": "0",
                        "flexWrap": "nowrap"
                    },
                    "children": [
                        {
                            "value": "ri:mail-line",
                            "render": "icon",
                            "style": {
                                "flexShrink": "0"
                            },
                            "props": {
                                "width": "1rem",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        },
                        {
                            "source": "$item.meta.email",
                            "render": "a",
                            "props": {
                                "target": "_blank"
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
