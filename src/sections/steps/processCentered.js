// src/sections/steps/processCentered.js
//
// Ported from astro-micro's src/sections/process/modernStepCentered.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: processStepCentered (see sections/index.js).

export const hashtags = ["process","modern","timeline","steps"];

export const data = [
    {
        "subtitle": "PROCESS",
        "title": "A better way to work from start to ship",
        "steps": [
            {
                "id": "plan",
                "title": "Plan",
                "icon": "ri:file-list-3-line",
                "content": "Map your work and set clear priorities."
            },
            {
                "id": "build",
                "title": "Build",
                "icon": "ri:code-s-slash-line",
                "content": "Collaborate and build with your team."
            },
            {
                "id": "test",
                "title": "Test",
                "icon": "ri:test-tube-line",
                "content": "Ensure quality with automated testing."
            },
            {
                "id": "deploy",
                "title": "Deploy",
                "icon": "ri:rocket-line",
                "content": "Ship with confidence every time."
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
                "col": 12
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
                                "prefix": "ri:gift-line",
                                "iconSize": "1rem"
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
                        "padding": "1rem 0 2rem"
                    },
                    "children": [
                        {
                            "source": "title",
                            "render": "h2",
                            "style": {
                                "fontSize": "clamp(1.75rem, 3vw, 2.5rem)",
                                "fontWeight": "800",
                                "margin": "0",
                                "color": "var(--color-base-content)"
                            },
                            "props": {
                                "motion": true,
                                "effect": "riseUp"
                            }
                        },
                        {
                            "source": "description",
                            "render": "p",
                            "style": {
                                "color": "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
                                "margin": "0",
                                "maxWidth": "32rem"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "each": "steps",
            "render": "steps",
            "props": {
                "idField": "id",
                "labelField": "title",
                "iconField": "icon",
                "active": "plan"
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
                        "gap": "0.25rem",
                        "padding": "0.5rem 0"
                    },
                    "children": [
                        {
                            "source": "$item.content",
                            "render": "p",
                            "style": {
                                "lineHeight": "1.65",
                                "color": "color-mix(in oklab, var(--color-base-content) 65%, transparent)",
                                "margin": "0"
                            }
                        }
                    ]
                }
            ],
            "layout": {
                "col": 12
            }
        }
    ]
};
