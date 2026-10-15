// src/sections/masonries/statStatsIntro.js
//
// Ported from astro-micro's src/sections/stats/modernStatsIntro.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: statStatsIntro (see sections/index.js).
//
// Kiểu tints (giống panel svc-node): tiêu đề chữ trung tính, màu nhấn (--layout-tint-a/b của layout) chỉ ở pill,
// glyph icon và link; card = bề mặt base-100 + viền mảnh, không đổ bóng. Mỗi card có mô tả ngắn + link tới trang
// dịch vụ tương ứng (giữ mô tả xấp xỉ cùng độ dài — masonry không kéo bằng chiều cao).

import { getStyleOpts } from '../helper.js';
import { ZALO, shopPage } from '@/modules/gift/meta.js';

export const hashtags = ["gifts","modern","stats","intro","cards"];

const TINT_A = 'var(--layout-tint-a, var(--color-error))';
const TINT_B = 'var(--layout-tint-b, var(--color-primary))';
const MUTED = 'color-mix(in oklab, var(--color-base-content) 65%, transparent)';
// Nền card = --gs-card-bg của components/Shop/shop.css: glow tints nhỏ cố định (px) ở 2 góc trên — a phải, b trái
const CARD_BG = `radial-gradient(220px 140px at 100% 0%, color-mix(in oklab, ${TINT_A} 12%, transparent), transparent 70%),
    radial-gradient(200px 120px at 0% 0%, color-mix(in oklab, ${TINT_B} 9%, transparent), transparent 70%),
    var(--color-base-100)`;

export const data = [
    {
        "title": { "vi": "Hộp quà theo yêu cầu", "en": "Custom gift boxes" },
        "content": { "vi": "Tự chọn từng món, hộp, thiệp và ruy băng theo dịp và ngân sách.", "en": "Pick every item, box, card and ribbon to fit the occasion and budget." },
        "meta": { "icon": "ri:gift-2-line", "url": "/gift/service/gift-box" }
    },
    {
        "title": { "vi": "Quà tặng doanh nghiệp", "en": "Corporate gifts" },
        "content": { "vi": "Set quà in logo cho khách hàng, đối tác và nhân viên, số lượng lớn.", "en": "Logo-printed gift sets for clients, partners and staff, in bulk." },
        "meta": { "icon": "ri:building-4-line", "url": shopPage.path }
    },
    {
        "title": { "vi": "Tư vấn thiết kế", "en": "Design consulting" },
        "content": { "vi": "Gợi ý concept và mockup quà theo đúng nhận diện thương hiệu của bạn.", "en": "Concepts and mockups that match your brand identity." },
        "meta": { "icon": "ri:palette-line", "url": "/gift/service/thiet-ke-qua-tang" }
    },
    {
        "title": { "vi": "Liên hệ báo giá", "en": "Request a quote" },
        "content": { "vi": "Nhắn Zalo yêu cầu của bạn, nhận báo giá chi tiết trong 24 giờ.", "en": "Message us on Zalo and get a detailed quote within 24 hours." },
        "meta": { "icon": "ri:price-tag-3-line", "url": ZALO }
    }
];

export const config = {
    "style": {
        "padding": "3rem 0 1rem"
    },
    "bg": { ...getStyleOpts({
            "rounded": "0",
            "gradient": false
        }) },
    "children": [
        // ── Tiêu đề: pill "100+" + h2 + mô tả ────────────────────────────────
        {
            "layout": { "col": "12", "row": "auto" },
            "style": { "padding": "0 0 1.75rem", "rowGap": "0.65rem", "maxWidth": "42rem" },
            "children": [
                {
                    "layout": { "col": "12" },
                    "value": { "vi": "100+ mẫu quà · Trọn gói", "en": "100+ gifts · All-in-one" },
                    "render": "span",
                    "style": {
                        "display": "inline-block",
                        "padding": "0.3rem 0.8rem",
                        "borderRadius": "999px",
                        "background": `color-mix(in oklab, ${TINT_A} 12%, transparent)`,
                        "color": TINT_A,
                        "fontSize": "0.75rem",
                        "fontWeight": "700",
                        "letterSpacing": "0.06em",
                        "textTransform": "uppercase"
                    }
                },
                {
                    "layout": { "col": "12" },
                    "value": { "vi": "Một đầu mối cho mọi món quà", "en": "One partner for every gift" },
                    "render": "h2",
                    "style": {
                        "fontSize": "clamp(1.75rem, 3.2vw, 2.5rem)",
                        "fontWeight": "800",
                        "lineHeight": "1.15",
                        "letterSpacing": "-0.02em",
                        "color": "var(--color-base-content)",
                        "margin": "0"
                    },
                    "props": { "motion": true, "word": false, "effect": "slideUp", "delay": 30 }
                },
                {
                    "layout": { "col": "12" },
                    "value": {
                        "vi": "Từ chọn quà, in logo, đóng hộp đến giao tận tay — Giftora lo trọn gói để bạn chỉ việc trao quà.",
                        "en": "From picking and logo printing to boxing and doorstep delivery — Giftora handles it all, you just hand it over."
                    },
                    "render": "p",
                    "style": { "fontSize": "1rem", "lineHeight": "1.6", "color": MUTED, "margin": "0" }
                }
            ]
        },
        // ── 4 card dịch vụ: glyph icon + tiêu đề + mô tả + link ──────────────
        // Grid (không masonry) + props.stretch + height 100% → 4 card cao bằng nhau; hàng mô tả 1fr đẩy link xuống đáy.
        {
            "each": "$records",
            "render": "cards",
            "style": {
                "height": "100%",
                "gridTemplateRows": "auto auto 1fr auto",
                "borderRadius": "1.25rem",
                "background": CARD_BG,
                "border": "1px solid color-mix(in oklab, var(--color-base-content) 9%, transparent)",
                "padding": "1.25rem",
                "rowGap": "0.6rem"
            },
            "props": {
                "col": 3,
                "stretch": true,
                "gap": "1rem",
                "anime": "fade-in",
                "animeQueue": "80ms"
            },
            "children": [
                {
                    "layout": { "col": "12" },
                    "source": "$item.meta.icon",
                    "render": "icon",
                    "style": {
                        "width": "fit-content",
                        "padding": "0.7rem",
                        "marginBottom": "0.35rem",
                        "borderRadius": "0.9rem",
                        "background": `linear-gradient(135deg, color-mix(in oklab, ${TINT_A} 14%, transparent), color-mix(in oklab, ${TINT_B} 14%, transparent))`
                    },
                    "props": { "size": "1.35rem", "color": TINT_A }
                },
                {
                    "layout": { "col": "12" },
                    "source": "$item.title",
                    "render": "h3",
                    "style": {
                        "fontSize": "1.05rem",
                        "fontWeight": "700",
                        "lineHeight": "1.35",
                        "color": "var(--color-base-content)",
                        "margin": "0"
                    }
                },
                {
                    "layout": { "col": "12" },
                    "source": "$item.content",
                    "render": "p",
                    "style": { "fontSize": "0.88rem", "lineHeight": "1.55", "color": MUTED, "margin": "0" }
                },
                {
                    "layout": { "col": "12" },
                    "value": { "vi": "Xem chi tiết", "en": "Learn more" },
                    "render": "a",
                    "style": {
                        "display": "inline-flex",
                        "alignItems": "center",
                        "gap": "0.3rem",
                        "marginTop": "0.25rem",
                        "fontSize": "0.85rem",
                        "fontWeight": "600",
                        "color": TINT_A
                    },
                    "props": { "org": "$item.meta.url", "suffix": "ri:arrow-right-line", "iconSize": "1rem" }
                }
            ],
            "layout": {
                "col": "12",
                "row": "auto"
            }
        }
    ]
};
