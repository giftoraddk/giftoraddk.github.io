// src/sections/sliders/testimonial.js
//
// Ported from astro-micro's src/sections/testimonials/modernSlideTestimonials.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: testimonialSlideTestimonials (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["gifts","modern","testimonials","slider","avatar","rating"];

export const data = [
    {
        "title": {
            "vi": "Khách hàng nói gì về chúng tôi",
            "en": "What our customers say"
        },
        "description": {
            "vi": "\"Trải nghiệm mua quà thật dễ dàng và tiện lợi tại Teamo\"",
            "en": "\"Buying gifts at Teamo is such an easy and convenient experience\""
        },
        "slider": [
            {
                "title": "Ngọc Hân",
                "content": {
                    "vi": "Nhân viên tư vấn rất nhiệt tình, người yêu mình thích quà kiểu này cực.",
                    "en": "The staff were super helpful, and my partner loved this kind of gift."
                },
                "pics": "https://i.ibb.co/Wp7x49ZS/nu-1.webp",
                "score": "5~20",
                "meta": {
                    "role": {
                        "vi": "NV Văn phòng",
                        "en": "Office worker"
                    }
                }
            },
            {
                "title": "Tiến Đạt",
                "content": {
                    "vi": "Nhân viên tư vấn rất nhiệt tình, người yêu mình thích quà kiểu này cực.",
                    "en": "The staff were super helpful, and my partner loved this kind of gift."
                },
                "pics": "https://i.ibb.co/GQSxs1fk/nam-1.webp",
                "score": "5~15",
                "meta": {
                    "role": {
                        "vi": "Kinh doanh tự do",
                        "en": "Freelance business owner"
                    }
                }
            },
            {
                "title": "Thanh Mai",
                "content": {
                    "vi": "Mua ở shop lần thứ 4 rồi, quà đẹp mà rất tiện. Chắc chắn sẽ còn quay lại nhiều lần nữa.",
                    "en": "This is my 4th time buying here — beautiful gifts and very convenient. I will definitely come back again."
                },
                "pics": "https://i.ibb.co/1tfRPZzD/nu-2.webp",
                "score": "5~41",
                "meta": {
                    "role": {
                        "vi": "Giáo viên",
                        "en": "Teacher"
                    }
                }
            },
            {
                "title": "Trần Minh Hiếu",
                "content": {
                    "vi": "Quà đóng gói siêu cẩn thận, ship xa cũng không sợ móp nát gì bên trong luôn ý.",
                    "en": "The gift was packed with great care — even shipped far away, nothing inside got damaged."
                },
                "pics": "https://i.ibb.co/xKYcbhWk/nam-2.webp",
                "score": "5~32",
                "meta": {
                    "role": {
                        "vi": "Giám đốc",
                        "en": "Director"
                    }
                }
            },
            {
                "title": "Bảo Trân",
                "content": {
                    "vi": "Giao hàng nhanh, đóng gói đẹp mắt, rất đáng tiền.",
                    "en": "Fast delivery, beautifully packaged, totally worth it."
                },
                "pics": "https://i.ibb.co/0pW6xdx3/nu-3.webp",
                "score": "5~27",
                "meta": {
                    "role": {
                        "vi": "NV Marketing",
                        "en": "Marketing staff"
                    }
                }
            },
            {
                "title": "Hoàng Việt",
                "content": {
                    "vi": "Giá cả hợp lý, chất lượng vượt mong đợi, chắc chắn sẽ ủng hộ tiếp.",
                    "en": "Reasonable price, quality exceeded expectations — will definitely support again."
                },
                "pics": "https://i.ibb.co/zh95hSQC/nam-3.webp",
                "score": "5~24",
                "meta": {
                    "role": {
                        "vi": "Kỹ sư",
                        "en": "Engineer"
                    }
                }
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
                        "col": 12,
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "flexDirection": "column",
                        "alignItems": "center",
                        "padding": "0 0 3rem"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.5rem)",
                                "fontWeight": "800",
                                "letterSpacing": "0.02em",
                                "color": "var(--color-primary)",
                                "margin": "0",
                                "textAlign": "center"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "swingIn"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.95rem, 1.3vw, 1.125rem)",
                                "fontStyle": "italic",
                                "color": "color-mix(in oklab, var(--color-base-content) 70%, transparent)",
                                "margin": "0.75rem 0 0",
                                "textAlign": "center",
                                "maxWidth": "40rem"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "slider",
            "render": "slider",
            "style": {
                "background": "color-mix(in oklab, var(--color-base-100) 70%, transparent)",
                "backdropFilter": "blur(25px)",
                "borderRadius": "1.5rem",
                "overflow": "hidden",
                "boxShadow": "rgba(0, 0, 0, 0.08) 0px 14px 32px -12px"
            },
            "props": {
                "nav": false,
                "loop": true,
                "autoplay": 4500,
                "slides": 4,
                "spacing": 24,
                "dots": false
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "center"
                    },
                    "style": {
                        "paddingTop": "1.75rem"
                    },
                    "children": [
                        {
                            "source": "$item.pics",
                            "render": "gallery",
                            "style": {
                                "width": "6rem",
                                "height": "6rem",
                                "borderRadius": "50%",
                                "objectFit": "cover",
                                "border": "4px solid var(--color-base-100)",
                                "boxShadow": "rgba(0, 0, 0, 0.12) 0px 6px 16px -4px"
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
                        "flexDirection": "column",
                        "gap": "0.15rem",
                        "padding": "0.75rem 1.25rem 0",
                        "textAlign": "center"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(1rem, 1.3vw, 1.125rem)",
                                "fontWeight": "700",
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "$item.meta.role",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.8rem, 1vw, 0.875rem)",
                                "color": "color-mix(in oklab, var(--color-base-content) 55%, transparent)",
                                "margin": "0"
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
                        "padding": "0.75rem 1.5rem 0",
                        "textAlign": "justify"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "minHeight": "98px",
                                "fontSize": "clamp(0.85rem, 1.05vw, 0.95rem)",
                                "lineHeight": "1.6",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
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
                        "padding": "1rem 1.25rem 1.5rem"
                    },
                    "children": [
                        {
                            "source": "$item.score",
                            "render": "rating",
                            "props": {
                                "size": "sm",
                                "disabled": true,
                                "color": "error",
                                "mask": "mask-star-2"
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
