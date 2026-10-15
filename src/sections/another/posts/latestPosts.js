// src/sections/another/posts/latestPosts.js
//
// Slider "Bài viết mới nhất" — cùng khuôn với another/products/bestSeller.js (header + đường kẻ + "Xem thêm", each
// '$records' render slider), card bài viết: ảnh ngang · chủ đề · ngày đăng · tiêu đề (link). loop tắt: ít bài hơn số ô
// (slides: 3) thì web-slider loop xếp bài vào giữa — không loop thì bài luôn bắt đầu từ bên trái.
// Record: { title, pics, meta: { url, date, category } } — modules/gift/index.js dựng từ bảng posts.

import { getStyleOpts } from '../../helper.js';

export const hashtags = ["posts","blog","latest","slider","cards","news"];

// Dữ liệu mẫu (xem trước section trong catalog) — KHÔNG có meta.url: trang thật chỉ dùng bài viết thật.
export const data = [
    {
        "id": 1,
        "title": "5 gợi ý quà tặng nhân viên cuối năm ý nghĩa",
        "pics": "/images/common/gift-1.webp",
        "meta": { "date": "15/10/2026", "category": "Quà nhân viên" }
    },
    {
        "id": 2,
        "title": "Cách in logo lên quà tặng doanh nghiệp bền đẹp",
        "pics": "/images/common/gift-2.webp",
        "meta": { "date": "10/10/2026", "category": "In logo" }
    },
    {
        "id": 3,
        "title": "Quà Tết doanh nghiệp: chuẩn bị từ khi nào?",
        "pics": "/images/common/gift-3.webp",
        "meta": { "date": "05/10/2026", "category": "Quà Tết" }
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
                        "alignItems": "center",
                        "gap": "1.5rem",
                        "padding": "0 0 2.5rem"
                    },
                    "children": [
                        {
                            "value": {
                                "vi": "Bài viết mới nhất",
                                "en": "Latest articles"
                            },
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
                            }
                        },
                        {
                            "value": {
                                "vi": "Xem thêm",
                                "en": "See more"
                            },
                            "render": "a",
                            "style": {
                                "height": "2.5rem",
                                "flexShrink": "0",
                                "borderRadius": "1.75rem",
                                "color": "var(--color-primary)",
                                "background": "color-mix(in oklab, var(--color-base-100) 70%, transparent)",
                                "backdropFilter": "blur(25px)",
                                "padding": "0 1rem",
                                "display": "flex",
                                "justifyContent": "center",
                                "alignItems": "center"
                            },
                            "props": {
                                "suffix": "ri:arrow-right-s-line",
                                "iconSize": "1rem",
                                "org": "/post/"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "$records",
            "render": "slider",
            "props": {
                "nav": false,
                "loop": false,
                "slides": 3,
                "spacing": 24,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "overflow": "hidden",
                        "borderRadius": "1rem",
                        "marginBottom": "1rem"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "100%",
                                "aspectRatio": "16/10",
                                "objectFit": "cover",
                                "display": "block"
                            },
                            "props": {
                                "rounded": "1.75rem"
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
                        "alignItems": "center",
                        "gap": "0.5rem",
                        "marginBottom": "0.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.category",
                            "render": "span",
                            "style": {
                                "fontSize": "0.72rem",
                                "fontWeight": "700",
                                "letterSpacing": "0.04em",
                                "textTransform": "uppercase",
                                "color": "var(--color-primary)"
                            }
                        },
                        {
                            "source": "$item.meta.date",
                            "render": "span",
                            "style": {
                                "fontSize": "0.78rem",
                                "color": "color-mix(in oklab, var(--color-base-content) 55%, transparent)"
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
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "a",
                            "style": {
                                "display": "-webkit-box",
                                "WebkitLineClamp": "2",
                                "WebkitBoxOrient": "vertical",
                                "overflow": "hidden",
                                "fontSize": "clamp(0.95rem, 1.2vw, 1.1rem)",
                                "fontWeight": "700",
                                "lineHeight": "1.35",
                                "color": "var(--color-base-content)",
                                "margin": "0"
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
