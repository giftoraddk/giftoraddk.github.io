// src/sections/sliders/showcaseNeat.js
//
// Ported from astro-micro's src/sections/showcase/modernSlideNeat.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: showcaseSlideNeat (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["showcase","image","simple","slider"];

export const data = [
    {
        "title": "Flash Coffee",
        "slider": [
            {
                "pics": "https://i.ibb.co/XrgDTmSb/cafe-a.jpg"
            },
            {
                "pics": "https://i.ibb.co/1pkwcpk/cafe-b.jpg"
            },
            {
                "pics": "https://i.ibb.co/PvSkpWS9/cafe-c.jpg"
            },
            {
                "pics": "https://i.ibb.co/Vc1dh9fn/cafe-d.jpg"
            },
            {
                "pics": "https://i.ibb.co/4ZxQ4ryT/cafe-e.jpg"
            },
            {
                "pics": "https://i.ibb.co/SLx8HwG/cafe-f.jpg"
            }
        ]
    }
];

export const config = {
    "children": [
        {
            "each": "slider",
            "render": "slider",
            "style": {
                "overflow": "hidden"
            },
            "bg": { ...getStyleOpts({
                    "rounded": "1.75rem",
                    "gradient": false
                }) },
            "props": {
                "autoplay": 5000,
                "loop": true,
                "slides": 1,
                "spacing": 20,
                "nav": false,
                "dots": false
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
                                "aspectRatio": "21/9",
                                "objectFit": "cover",
                                "display": "block"
                            },
                            "props": {
                                "rounded": "1.75rem"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": 12
            }
        },
        {
            "layout": {
                "col": 12
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "padding": "2.5rem 0"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h1",
                            "style": {
                                "fontSize": "clamp(2rem, 4vw, 3.5rem)"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "scatterIn"
                            }
                        }
                    ]
                }
            ]
        }
    ]
};
