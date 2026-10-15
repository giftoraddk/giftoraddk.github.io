// src/sections/another/faqs/product.js
//
// Ported from astro-micro's src/sections/another/_faqProduct.js — FAQ dạng expansion cho ProductDetail.
// Root là each '$records' render expansion (mỗi câu hỏi 1 record).

export const hashtags = ["faq","product","expansion","seo","geo"];

export const config = {
    "each": "$records",
    "render": "expansion",
    "props": {
        "labelField": "q",
        "openFirst": false,
        "multiple": false
    },
    "children": [
        {
            "layout": {
                "col": 12,
                "row": "auto",
                "justify": "none"
            },
            "style": {
                "padding": "0.375rem 1.25rem 1rem"
            },
            "children": [
                {
                    "source": "$item.a",
                    "render": "p",
                    "style": {
                        "lineHeight": "1.75",
                        "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                        "margin": "0"
                    }
                }
            ]
        }
    ]
};
