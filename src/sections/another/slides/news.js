// src/sections/another/slides/news.js
//
// Ported from astro-micro's src/sections/another/_slideNews.js — slider tin nổi bật cho post/index.
// Root là each '$records' render slider (mỗi slide 1 record).

import { getStyleOpts } from '../../helper.js';

export const hashtags = ["news","blog","article","overlay","modern","card"];

export const data = [
    {
        "id": 1,
        "status": "active",
        "mode": "news",
        "title": "How to improve your UI design skills",
        "description": "The design industry is constantly evolving, but good design is timeless.",
        "pics": "https://i.ibb.co/KpnkmF38/bird.jpg",
        "tags": [
            "Design",
            "Product",
            "12 min read"
        ],
        "meta": {
            "url": "#"
        }
    },
    {
        "id": 2,
        "status": "active",
        "mode": "news",
        "title": "Quickly develop an \"eye\" for great design",
        "description": "Learn how to quickly develop an \"eye\" for UI design and improve your design skills.",
        "pics": "https://i.ibb.co/S7R6zp64/mountain.jpg",
        "tags": [
            "Design",
            "Product",
            "12 min read"
        ],
        "meta": {
            "url": "#"
        }
    }
];

export const config = {
    "bg": { ...getStyleOpts({
            "rounded": "1.25rem",
            "gradient": false
        }) },
    "each": "$records",
    "render": "slider",
    "props": {
        "autoplay": 5000,
        "loop": true,
        "slides": 1,
        "spacing": 20,
        "nav": false,
        "dots": false,
        "effect": "fade",
        "blur": true
    },
    "children": [
        {
            "layout": {
                "col": 12,
                "row": "auto",
                "justify": "none"
            },
            "style": {
                "position": "relative",
                "overflow": "hidden",
                "borderRadius": "1.25rem"
            },
            "children": [
                {
                    "source": "$item.pics",
                    "render": "gallery",
                    "style": {
                        "width": "100%",
                        "aspectRatio": "16/9",
                        "objectFit": "cover",
                        "display": "block",
                        "borderRadius": "1.25rem"
                    },
                    "props": {
                        "float": "none",
                        "org": "$item.meta.url"
                    }
                },
                {
                    "source": "$item.title",
                    "render": "h3",
                    "style": {
                        "position": "absolute",
                        "bottom": "1.25rem",
                        "left": "1.5rem",
                        "right": "1.5rem",
                        "color": "white",
                        "textShadow": "0 2px 12px rgba(0,0,0,0.6)",
                        "fontSize": "clamp(1.75rem, 3vw, 2.5rem)"
                    }
                },
                {
                    "source": "$item.tags",
                    "render": "tags",
                    "style": {
                        "position": "absolute",
                        "maxWidth": "50%",
                        "display": "flex",
                        "flexWrap": "wrap",
                        "justifyContent": "flex-end",
                        "top": "1.25rem",
                        "right": "1.5rem"
                    },
                    "props": {
                        "type": "fill",
                        "gap": "0.5rem"
                    }
                }
            ]
        }
    ]
};
