// src/sections/sliders/trustedLogos.js
//
// Ported from astro-micro's src/sections/trusted/modernSlideLogos.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: trustedSlideLogos (see sections/index.js).

export const hashtags = ["trusted","spatial","logos","brands","slider"];

export const data = [
    {
        "subtitle": "TRUSTED BY ENGINEERING TEAMS AT",
        "slider": [
            {
                "name": "Linear",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Loom",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Shopify",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Vercel",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Notion",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Mapbox",
                "logo": "https://placehold.co/10/8B8680/8B8680"
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
                "col": 12
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
                            "source": "subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "letterSpacing": "0.12em",
                                "fontWeight": "600",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "slider",
            "render": "slider",
            "props": {
                "autoplay": 2800,
                "loop": true,
                "mode": "free",
                "slides": 6,
                "spacing": 0,
                "nav": false,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "alignItems": "center",
                        "gap": "0.5rem",
                        "paddingRight": "1rem"
                    },
                    "children": [
                        {
                            "source": "$item.logo",
                            "render": "gallery",
                            "style": {
                                "height": "36px",
                                "width": "auto",
                                "objectFit": "contain",
                                "display": "block",
                                "flexShrink": "0"
                            }
                        },
                        {
                            "source": "$item.name",
                            "render": "span",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": 12
            }
        }
    ]
};
