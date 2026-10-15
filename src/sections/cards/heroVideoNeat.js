// src/sections/cards/heroVideoNeat.js
//
// Ported from astro-micro's src/sections/hero/spatialVideoNeatApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js.

export const hashtags = [
    "hero",
    "spatial",
    "video",
    "fullbleed",
    "overlay",
    "apex"
];

export const data = [
    {
        "subtitle": "S9TV HUB",
        "title": "Sáng tạo.\nCộng đồng.\nKết nối quốc tế.",
        "description": "Một creative hub kết nối đào tạo, sản xuất và hợp tác quốc tế trong lĩnh vực điện ảnh.",
        "meta": {
            "exploreCta": "KHÁM PHÁ"
        }
    }
];

export const config = {
    "style": {
        "padding": "0"
    },
    "children": [
        {
            "each": "$records",
            "style": {
                "position": "relative",
                "overflow": "hidden",
                "height": "100vh"
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
                        "inset": "0",
                        "zIndex": "0",
                        "overflow": "hidden",
                        "height": "100%"
                    },
                    "children": [
                        {
                            "value": "https://www.youtube.com/watch?v=itQQCkA87Hs",
                            "render": "player",
                            // player fill bám ancestor có position gần nhất = wrapper leaf → phải phủ kín khung
                            "style": {
                                "position": "absolute",
                                "inset": "0"
                            },
                            "props": {
                                "fill": true,
                                "autoPlay": true,
                                "mute": true,
                                "loops": true,
                                "control": false
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
                        "position": "absolute",
                        "inset": "0",
                        "zIndex": "1",
                        "height": "100%",
                        "flexDirection": "column",
                        "alignItems": "center",
                        "gap": "1.25rem",
                        "textAlign": "center",
                        "padding": "0 1.5rem",
                        "background": "linear-gradient(180deg, color-mix(in oklab, var(--color-base-300) 35%, transparent) 0%, color-mix(in oklab, var(--color-base-300) 75%, transparent) 100%)"
                    },
                    "children": [
                        {
                            "source": "$item.subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 1vw, 0.75rem)", // fontSize custom
                                "textTransform": "uppercase",
                                "letterSpacing": "0.25em",
                                "fontWeight": "600",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 70%, transparent)"
                            }
                        },
                        {
                            "source": "$item.title",
                            "render": "h1",
                            "style": {
                                "margin": "0",
                                "color": "var(--color-base-content)"
                            },
                            "props": {
                                "motion": true,
                                "word": true,
                                "effect": "focusIn"
                            }
                        },
                        {
                            "source": "$item.description",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(1rem, 1.5vw, 1.25rem)",
                                "maxWidth": "32rem",
                                "margin": "0.5rem 0 0",
                                "color": "color-mix(in oklab, var(--color-base-content) 75%, transparent)"
                            }
                        },
                        {
                            "source": "$item.meta.exploreCta",
                            "render": "span",
                            "style": {
                                "position": "absolute",
                                "bottom": "10%",
                                "left": "50%",
                                "transform": "translateX(-50%)",
                                "fontSize": "clamp(0.65rem, 0.8vw, 0.75rem)",
                                "letterSpacing": "0.2em",
                                "fontWeight": "600",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
                            }
                        },
                        {
                            "value": "",
                            "render": "span",
                            "style": {
                                "position": "absolute",
                                "bottom": "2rem",
                                "left": "50%",
                                "transform": "translateX(-50%)",
                                "display": "block",
                                "width": "1px",
                                "height": "1.5rem",
                                "background": "color-mix(in oklab, var(--color-base-content) 40%, transparent)"
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
