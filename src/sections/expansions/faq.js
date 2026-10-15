// src/sections/expansions/faq.js
//
// Ported from astro-micro's src/sections/faq/spatialExpansionApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: faqExpansion (see sections/index.js).

export const hashtags = ["faq","spatial","accordion","expansion","questions","apex"];

export const data = [
    {
        "subtitle": "FREQUENTLY ASKED",
        "description": "Everything you need to know about Apex — and then some.",
        "title": "FAQs Answered",
        "expansion": [
            {
                "title": "What is Apex?",
                "content": "Apex is a production-ready UI library built on native Web Components and Lit 3. It provides 80+ composable, themeable elements — from layout engines like web-board to micro-service components — that work in any JavaScript environment without wrappers or adapters."
            },
            {
                "title": "Is Apex really framework-agnostic?",
                "content": "Yes. Apex components are standard custom elements that the browser natively understands. They work inside React, Vue, Angular, Svelte, Astro, plain HTML, or any other framework — no glue code, no wrappers, no adapter packages required."
            },
            {
                "title": "Do I need to learn Lit or Web Components to use Apex?",
                "content": "No. You can consume Apex components just like any HTML element. Advanced users who want to extend or build their own components on top of Apex will benefit from knowing Lit, but it is not required for everyday use."
            },
            {
                "title": "Can I use Apex with SSR frameworks like Next.js or Nuxt?",
                "content": "Yes. Apex components are designed for SSR compatibility — they do not access the DOM during module evaluation, which eliminates hydration mismatches and flash-of-unstyled-content (FOUC) issues that plague most component libraries."
            },
            {
                "title": "How does the theming system work?",
                "content": "Apex reads five CSS custom properties (primary, secondary, accent, and two base colors) injected via the mainColors prop. Switch themes at runtime by updating those variables — no JavaScript rebuild needed. Dark and light modes toggle via a data-theme attribute on <html>."
            },
            {
                "title": "What is web-board and do I have to use it?",
                "content": "web-board is Apex's optional declarative layout engine. You describe your page as a JSON config and web-board renders the full section layout — headings, cards, sliders, accordions — without writing template code. It is entirely optional; you can use any Apex component standalone in your own markup."
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "0 0 4rem"
    },
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
                        "justify": "center"
                    },
                    "style": {
                        "maxWidth": "fit-content",
                        "margin": "3.5rem auto 0",
                        "padding": "0 0.5rem",
                        "borderRadius": "2rem",
                        "border": "1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)",
                        "background": "color-mix(in oklab, var(--color-primary) 5%, transparent)",
                        "backdropFilter": "blur(8px)"
                    },
                    "children": [
                        {
                            "source": "subtitle",
                            "render": "span",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "fontWeight": "500",
                                "color": "color-mix(in oklab, var(--color-base-content) 80%, transparent)"
                            },
                            "props": {
                                "prefix": "ri:bard-fill",
                                "iconSize": "1.1rem"
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
                        "alignItems": "center",
                        "textAlign": "center",
                        "gap": "0.75rem",
                        "padding": "1rem 1rem 2.5rem"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h2",
                            "style": {
                                "margin": "0",
                                "color": "var(--color-base-content)"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "riseUp"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
                                "maxWidth": "36rem"
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
                        "padding": "0.375rem 1.25rem 1rem"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.75",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
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
