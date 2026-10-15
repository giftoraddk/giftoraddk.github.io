// src/sections/expansions/faqQuestion.js
//
// Ported from astro-micro's src/sections/faq/modernExpansionQuestion.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: faqExpansionQuestion (see sections/index.js).

export const hashtags = ["faq","modern","accordion","expansion","questions"];

export const data = [
    {
        "subtitle": "FAQ",
        "title": "Frequently\nasked questions",
        "expansion": [
            {
                "title": "What is Nexons?",
                "content": "Nexons is a project management platform that helps teams plan, collaborate, and ship better products together — from idea to launch."
            },
            {
                "title": "Is there a free plan?",
                "content": "Yes! We offer a free plan with core features for up to 3 team members. No credit card required to get started."
            },
            {
                "title": "Can I change plans later?",
                "content": "Absolutely. You can upgrade or downgrade your plan at any time from your account settings. Changes take effect at the next billing cycle."
            },
            {
                "title": "How does billing work?",
                "content": "We bill monthly or annually. Annual plans come with a 20% discount compared to monthly billing. All major credit cards accepted."
            },
            {
                "title": "Is my data secure?",
                "content": "We take security seriously. All data is encrypted in transit and at rest using industry-standard protocols. We perform regular security audits."
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
            "layout": {
                "col": "5"
            },
            "children": [
                {
                    "layout": {
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "1rem"
                    },
                    "children": [
                        {
                            "source": "subtitle",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "600",
                                "letterSpacing": "0.12em",
                                "textTransform": "uppercase",
                                "color": "color-mix(in oklab, var(--color-base-content) 45%, transparent)",
                                "margin": "0"
                            }
                        },
                        {
                            "source": "title",
                            "render": "h3",
                            "style": {
                                "fontWeight": "700",
                                "letterSpacing": "-0.02em",
                                "color": "var(--color-base-content)",
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "spinIn"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "expansion",
            "render": "expansion",
            "props": {
                "labelField": "title",
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
                        "padding": "0.5rem 0"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.7",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0",
                                "padding": "0 1rem"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": "7"
            }
        }
    ]
};
