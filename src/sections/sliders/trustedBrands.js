// src/sections/sliders/trustedBrands.js
//
// Ported from astro-micro's src/sections/trusted/modernSlideBrands.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: trustedSlideBrands (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["gifts","modern","trusted","logos","brands","slider"];

export const data = [
    {
        "title": {
            "vi": "Thương hiệu đối tác",
            "en": "Partner brands"
        },
        "slider": [
            {
                "name": "The Cocoon",
                "logo": "https://placehold.co/240x100/ffffff/706fd3?text=the+cocoon"
            },
            {
                "name": "LocknLock",
                "logo": "https://placehold.co/240x100/ffffff/e2a9db?text=LocknLock"
            },
            {
                "name": "Hapuganic",
                "logo": "https://placehold.co/240x100/ffffff/6aa84f?text=Hapuganic"
            },
            {
                "name": "Dalatfarm",
                "logo": "https://placehold.co/240x100/ffffff/b45f06?text=DALATFARM"
            },
            {
                "name": "L'angfarm",
                "logo": "https://placehold.co/240x100/ffffff/b45f06?text=Langfarm"
            },
            {
                "name": "Tracybee",
                "logo": "https://placehold.co/240x100/ffffff/2b2b2b?text=TRACYBEE"
            },
            {
                "name": "NamViet",
                "logo": "https://placehold.co/240x100/ffffff/34ace0?text=NamViet"
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "3rem 0"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "gradient": false
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
                        "justify": "left"
                    },
                    "style": {
                        "flexWrap": "nowrap",
                        "alignItems": "center",
                        "gap": "1.5rem",
                        "padding": "0 0 2.5rem"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.5rem)",
                                "fontWeight": "800",
                                "color": "var(--color-primary)",
                                "margin": "0",
                                "whiteSpace": "nowrap"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "driftIn"
                            }
                        },
                        {
                            "value": "",
                            "render": "span",
                            "style": {
                                "display": "block",
                                "flex": "1",
                                "minWidth": "2rem",
                                "height": "1px",
                                "background": "color-mix(in oklab, var(--color-base-content) 20%, transparent)"
                            },
                            "props": {
                                "grow": 1
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
                "marquee": true,
                "autoplay": 7000,
                "reverse": false,
                "loop": true,
                "mode": "free",
                "slides": 6,
                "spacing": 48,
                "nav": false,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "children": [
                        {
                            "source": "$item.logo",
                            "render": "gallery",
                            "style": {
                                "objectFit": "contain",
                                "display": "block"
                            },
                            "props": {
                                "rounded": "0.5rem"
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
