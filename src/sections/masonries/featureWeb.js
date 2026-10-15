// src/sections/masonries/featureWeb.js
//
// Ported from astro-micro's src/sections/features/spatialCardWebApex.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: featureCardWeb (see sections/index.js).

import { getStyleOpts } from '../helper.js';

export const hashtags = ["features","spatial","components","grid","cards","apex"];

export const data = [
    {
        "subtitle": "COMPONENT LIBRARY",
        "description": "80+ production-ready elements, from layout engines to micro-service inputs — all built on native Web Components.",
        "meta": {
            "heading": "Explore the full\ncomponent suite"
        },
        "cards": [
            {
                "title": "web-board",
                "content": "Declarative layout engine — compose full pages from JSON config, no template code.",
                "meta": {
                    "icon": "ri:layout-masonry-line",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-primary) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-boxs",
                "content": "Card-grid renderer with masonry, tabs, slider, expansion, and infinite scroll.",
                "meta": {
                    "icon": "ri:gallery-view-2",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-accent) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-table",
                "content": "Sortable, filterable, paginated data table with virtual scrolling.",
                "meta": {
                    "icon": "ri:table-2",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-secondary) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-dialog",
                "content": "Accessible modal with animated backdrop, focus trap, and programmatic API.",
                "meta": {
                    "icon": "ri:window-line",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-primary) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-tabs",
                "content": "Tab panels with keyboard navigation, lazy content rendering, and smooth transitions.",
                "meta": {
                    "icon": "ri:file-list-3-line",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-accent) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-slider",
                "content": "Touch-friendly carousel with autoplay, dot indicators, and responsive breakpoints.",
                "meta": {
                    "icon": "ri:slideshow-line",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-secondary) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-toast",
                "content": "Stackable notifications with auto-dismiss, queuing, and configurable position.",
                "meta": {
                    "icon": "ri:notification-3-line",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-primary) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-select",
                "content": "Searchable dropdown with multi-select, option groups, and async data loading.",
                "meta": {
                    "icon": "ri:list-check-2",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-accent) 20%, transparent)"
                    }
                }
            },
            {
                "title": "web-gallery",
                "content": "Responsive image gallery with lightbox, zoom controls, and lazy loading.",
                "meta": {
                    "icon": "ri:image-2-line",
                    "iconStyle": {
                        "width": "2.5rem",
                        "height": "2.5rem",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "0.625rem",
                        "background": "color-mix(in oklab, var(--color-secondary) 20%, transparent)"
                    }
                }
            }
        ]
    }
];

export const config = {
    "style": {
        "padding": "0 0 4rem"
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
                        "justify": "center"
                    },
                    "style": {
                        "maxWidth": "fit-content",
                        "margin": "3rem auto 0",
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
                        "gap": "0.5rem",
                        "padding": "1rem 0 2rem"
                    },
                    "children": [
                        {
                            "source": "meta.heading",
                            "render": "h2",
                            "style": {
                                "margin": "0",
                                "whiteSpace": "pre-line",
                                "color": "var(--color-base-content)"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "floatIn"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
                                "margin": "0",
                                "maxWidth": "38rem"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "cards",
            "render": "masonry",
            "style": {
                "padding": "1.25rem",
                "background": "var(--color-base-200)",
                "borderRadius": "0.875rem"
            },
            "props": {
                "col": 3,
                "anime": "slide-in-blurred-bottom"
            },
            "children": [
                {
                    "layout": {
                        "col": "12",
                        "row": "auto",
                        "justify": "left"
                    },
                    "style": {
                        "marginBottom": "0.75rem"
                    },
                    "children": [
                        {
                            "source": "$item.meta.icon",
                            "render": "icon",
                            "style": "$item.meta.iconStyle",
                            "props": {
                                "width": "1.25rem",
                                "color": "var(--color-base-content)"
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
                        "marginBottom": "0.25rem"
                    },
                    "children": [
                        {
                            "source": "$item.title",
                            "render": "h4",
                            "style": {
                                "fontSize": "clamp(0.875rem, 1.2vw, 1rem)",
                                "fontWeight": "700",
                                "lineHeight": "1.3",
                                "margin": "0",
                                "color": "var(--color-base-content)"
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
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "fontSize": "clamp(0.7rem, 0.9vw, 0.8rem)",
                                "lineHeight": "1.55",
                                "margin": "0",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)"
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
