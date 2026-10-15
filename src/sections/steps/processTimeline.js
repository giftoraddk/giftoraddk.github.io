// src/sections/steps/processTimeline.js
//
// Ported from astro-micro's src/sections/process/modernStepTimeline.js — schema converted from the old
// tiers/groupCol/makes shape to the recursive node schema via
// src/packages/apex/tool/legacy-migrate.js. Catalog id: processStepTimeline (see sections/index.js).

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
                        "col": 12,
                        "row": "auto",
                        "justify": "none"
                    },
                    "style": {
                        "flexDirection": "column",
                        "gap": "0.5rem"
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
                            "render": "h2",
                            "style": {
                                "margin": "0"
                            },
                            "props": {
                                "motion": true,
                                "word": false,
                                "effect": "driftIn"
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
