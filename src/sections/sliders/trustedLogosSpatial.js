// src/sections/sliders/trustedLogosSpatial.js
//
// Ported from astro-micro's src/sections/trusted/spatialSlideLogos.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: trustedSlideLogosSpatial (see sections/index.js).

export const hashtags = ["trusted","spatial","logos","brands","slider"];

export const data = [
    {
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
            },
            {
                "name": "Airbnb",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Canon",
                "logo": "https://placehold.co/10/8B8680/8B8680"
            },
            {
                "name": "Quora",
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
            "each": "slider",
            "render": "slider",
            "props": {
                "reverse": false,
                "autoplay": 8000,
                "marquee": true,
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
