// src/sections/cards/featureServiceGrid.js
//
// Ported from astro-micro's src/sections/features/modernServiceGrid.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: featureServiceGrid (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["gifts","modern","service","image","overlay","grid","cards"];

export const data = [
    {
        "title": {
            "vi": "Chọn và tặng quà hộ",
            "en": "Choose & send gifts for you"
        },
        "pics": "/images/common/gift-service.webp",
        "meta": {
            "label": {
                "vi": "Dịch vụ",
                "en": "Service"
            }
        }
    },
    {
        "title": {
            "vi": "In ấn cá nhân hóa",
            "en": "Personalized printing"
        },
        "pics": "/images/common/gift-custom.webp",
        "meta": {
            "label": {
                "vi": "Hộp quà",
                "en": "Gift box"
            }
        }
    },
    {
        "title": {
            "vi": "Hỏa tốc trong 2h!",
            "en": "Express in 2 hours!"
        },
        "pics": "/images/common/gift-ship.webp",
        "meta": {
            "label": {
                "vi": "Vận chuyển",
                "en": "Delivery"
            }
        }
    },
    {
        "title": {
            "vi": "Tích lũy điểm nhận quà",
            "en": "Earn points for rewards"
        },
        "pics": "/images/common/gift-point.webp",
        "meta": {
            "label": {
                "vi": "Điểm thưởng",
                "en": "Reward points"
            }
        }
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
            "each": "$records",
            "render": "cards",
            "style": {
                "position": "relative",
                "overflow": "hidden",
                "borderRadius": "1.75rem",
                "aspectRatio": "16/9",
                "boxShadow": "color-mix(in srgb, var(--color-error) 60%, transparent) 5px 5px,\n                      color-mix(in srgb, var(--color-error) 40%, transparent) 10px 10px,\n                      color-mix(in srgb, var(--color-error) 20%, transparent) 15px 15px"
            },
            "props": {
                "col": 6,
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
                        "position": "absolute",
                        "inset": "0",
                        "zIndex": "0",
                        "overflow": "hidden"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "height": "100%",
                                "objectFit": "cover",
                                "display": "block"
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
