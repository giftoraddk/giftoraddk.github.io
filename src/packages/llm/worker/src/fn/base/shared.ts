/** Prompt rules several base specs share — one wording to tune instead of seven copies. Worker-only, like every spec. */

/** For a step that reads other departments' approved handoffs (spec §17, Rule 5). */
export const HANDOFF_RULE = 'When approved handoffs from other departments are provided below, build on their decisions, requirements and constraints instead of redoing their analysis; keep their hypotheses, assumptions and estimates as such (never restate one as a fact), and when something you need is missing, state the assumption you make instead of inventing a fact.';

/** Spec §13.2 / §37: a function with nothing real to contribute says so instead of producing filler. */
export const NOT_MATERIAL_RULE = 'If this topic genuinely needs nothing from your function, write "NOT MATERIAL FOR THIS TASK" and 1 sentence why in each field — never fabricate content to fill the shape.';

/** Spec §4.1 without tags: the boss reads plain sentences, so fact vs inference vs guess shows in the wording itself.
 *  A stray tag — or data label such as [FINANCIAL_CONTEXT] — the model writes anyway is dropped server-side (artifacts.ts stripTags). */
export const EVIDENCE_RULE = 'Write plain, natural sentences — never a bracketed label, tag or ALL-CAPS code at the start of a line. Only what the topic or an approved handoff states is a fact: write it plainly. An inference, estimate or guess must read as one from its wording (likely, estimated, assumed) — never present it as a fact.';

/** Multi-line fields: models otherwise run list items together on one line. */
export const ONE_PER_LINE = 'Put each item on its own line — insert a REAL newline character (JSON escape "\\n") between items, never two items on one line.';
