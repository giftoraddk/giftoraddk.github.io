// src/sections/cards/featureServiceGrid.js
//
// Ported from astro-micro's src/sections/features/modernServiceGrid.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: featureServiceGrid (see sections/index.js).
//
// Ảnh đã có sẵn chữ tiêu đề → card chỉ là ảnh. Khung giữ đúng tỉ lệ ảnh gốc (1312×816) để không cắt mất chữ;
// viền mảnh kiểu tints thay cho bóng chồng 3 lớp. `meta.url` → bấm ảnh mở trang dịch vụ (không có url → không link).

import { getStyleOpts } from '../helper.js';
import { shopPage } from '@/modules/gift/meta.js';

export const hashtags = ["gifts","modern","service","image","overlay","grid","cards"];

export const data = [
    {
        "title": {
            "vi": "Chọn và tặng quà hộ",
            "en": "Choose & send gifts for you"
        },
        "pics": "/images/common/gift-service.webp",
        "meta": {
            "url": shopPage.path,
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
            "url": "/gift/service/in-logo",
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
            "url": "/gift/service/giao-hang-doanh-nghiep",
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
        "padding": "1rem 0 3rem"
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
                "aspectRatio": "1312 / 816",
                "border": "1px solid color-mix(in oklab, var(--color-base-content) 9%, transparent)"
            },
            "props": {
                "col": 6,
                "gap": "1.25rem",
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
                            },
                            "props": {
                                "org": "$item.meta.url"
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
