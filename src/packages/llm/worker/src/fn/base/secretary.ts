import { FUNCTIONS, type FnSpec } from '../types.ts';

// shared.ts EVIDENCE_RULE, worded for the topic alone (the secretary reads no handoff). What is certain is also kept
// apart by the fields themselves: `givenFacts` holds what the boss said, everything else is analysis.
const PLAIN_RULE = 'Writing rule: plain, natural sentences — never start a line with a bracketed label, a tag or an ALL-CAPS code. Only what the TOPIC itself states is certain: write it as a plain statement. Anything you infer or assume must read as such from its wording (likely, probably, assumed) — never present a guess as a fact. Put each item on its own line: a REAL newline character (JSON escape "\\n") between items, never two items on one line.';

const BRIEF = ['givenFacts', 'topicCategory', 'domain', 'intent', 'taskType'];
const CUSTOMERS = ['customerHypotheses', 'useCases'];
const PROBLEMS = ['problems', 'coreNeeds', 'desiredOutcomes'];
const FRAME = ['constraints', 'assumptions', 'informationGaps', 'successCriteria'];

/**
 * Secretary (spec §2.1, §4, §5 Rules 1–4, §19, §37, §41, §44) — ONE function for the boss's side of a task: the host of
 * the sector's group chat (answers the boss, opens a task for a work request) AND the task's first job. Step 1 frames
 * the request into the shared context (the boss reviews and edits it at the pause); step 2 routes it to the 9 functions
 * from that very analysis — not from a compacted handoff. The boss reviews the plan before approving it and may add or
 * drop departments and change the lead: the client rewrites `activation` / `lead` through POST /jobs/:id/fields (normal
 * field edit, re-normalised by routing.ts on every read). Approving writes both handoffs: `context` (every department)
 * and `routing` (the plan).
 */
export const SECRETARY: FnSpec = {
  fn: 'secretary', kind: 'pipeline',
  title: { vi: 'Thư ký', en: 'Secretary' },
  description: {
    vi: 'Nhận mọi yêu cầu công việc của sếp cho công ty (sản phẩm, marketing, bán hàng, vận hành, cung ứng, chất lượng, tài chính, công nghệ), dựng bối cảnh, phân công đúng phòng ban và theo dõi bàn giao giữa các phòng.',
    en: 'Takes every work request the boss has for the company (product, marketing, sales, operations, supply, quality, finance, technology), frames it, routes it to the right departments and tracks their handoffs.',
  },
  output: null,
  needs: [],
  produces: [
    {
      kind: 'context', dest: [...FUNCTIONS],
      objective: 'Shared derived context: the facts the boss gave, what is being asked and why, who it is for, their problems, needs and desired outcomes, and the constraints, assumptions and open questions every department builds on.',
      fields: [...BRIEF, ...CUSTOMERS, ...PROBLEMS, ...FRAME],
      sections: {
        requirements: ['coreNeeds'], assumptions: ['customerHypotheses', 'assumptions'], constraints: ['constraints'],
        acceptance_criteria: ['successCriteria'], open_questions: ['informationGaps'],
      },
    },
    {
      kind: 'routing', dest: ['secretary'],
      objective: 'Function activation for this task: the lead, each function REQUIRED / RELEVANT / CONDITIONAL / NOT_MATERIAL, and the reasoning depth.',
      fields: ['activation', 'lead', 'complexity', 'rationale'],
      sections: { decisions: ['rationale'] },
    },
  ],
  steps: [
    {
      id: 1, key: 'context', vi: 'Bối cảnh', en: 'Context', type: 'text',
      role: 'a Senior Business Analyst who frames every request before any department works on it, strict about keeping what the boss said apart from what you infer',
      task: `Frame 1 business REQUEST for a company in the {sector} sector before any department works on it. The TOPIC is exactly what the boss typed — its literal statements are the only facts you have. The framing is built in this order, each part on top of the existing analysis provided: what is literally asked → what it is and why the boss wants it → who it is for and in which situation → their problems and root causes → their needs and desired outcomes → the constraints, assumptions and gaps every department must respect. Write only your part, consistent with the parts before it. Describe the request and its context only — do NOT propose a solution, product design, campaign, process or plan: that is the departments' work. Missing information is NOT a reason to stop — make a reasonable assumption, word it as one, and list what must be verified. ${PLAIN_RULE}`,
      calls: [
        {
          key: 'brief', vi: 'Yêu cầu', en: 'The request',
          maxTokens: 700, temperature: 0.2, contextKeys: [], dependsOn: [],
          fields: [
            { key: 'givenFacts', vi: 'Dữ kiện sếp nêu', en: 'Given facts', desc: 'Every concrete fact the TOPIC itself states — subject, quantity, budget or price, deadline or season, channel, audience, place — 1 per line, restated faithfully, adding nothing. When the topic names only its subject, write that 1 line.' },
            { key: 'topicCategory', vi: 'Loại chủ đề', en: 'Topic category', desc: 'What kind of subject this is, in plain words (e.g. a seasonal gift product, a clinic booking service, a course for working adults) — 1 line.' },
            { key: 'domain', vi: 'Mảng', en: 'Domain', desc: 'The domain of {sector} it belongs to, chosen from: {domains} — 1 line: the domain, then " — " and why.' },
            { key: 'intent', vi: 'Ý định', en: 'Intent', desc: 'What the boss wants to achieve and the business reason behind it — max 2 lines, 1 sentence each; a reason the topic does not state is worded as likely, not certain.' },
            { key: 'taskType', vi: 'Loại việc', en: 'Task type', desc: 'The kind of work, picked from: launch a new offering, improve an existing offering, growth or marketing campaign, sales channel or customer success, operations or delivery setup, supply or sourcing, financial decision, technology build, research, other — named in plain words of the output language (never a code), then " — " and 1 sentence why. 1 line.' },
          ],
        },
        {
          key: 'customers', vi: 'Khách hàng & tình huống', en: 'Customers & use cases',
          maxTokens: 800, temperature: 0.5, dependsOn: ['brief'], contextKeys: BRIEF,
          fields: [
            { key: 'customerHypotheses', vi: 'Giả thuyết khách hàng', en: 'Customer hypotheses', desc: '2-4 lines, 1 per candidate customer segment, the one the topic points to most directly first: who they are + their situation + what they do today instead — never demographics alone. Typical {sector} customers include {customers}; use them only where the topic fits.' },
            { key: 'useCases', vi: 'Tình huống sử dụng', en: 'Use cases', desc: '2-4 lines, 1 per use case written as a job-to-be-done: "When …, they want to …, so that …" — each tied to a segment above. Common {sector} use cases include {useCases}; use them only where the topic fits.' },
          ],
        },
        {
          key: 'problems', vi: 'Vấn đề & nhu cầu', en: 'Problems & needs',
          maxTokens: 900, temperature: 0.5, dependsOn: ['customers'], contextKeys: [...BRIEF, ...CUSTOMERS],
          fields: [
            { key: 'problems', vi: 'Vấn đề', en: 'Problems', desc: 'The top 3 problems those customers face in those situations, 1 line each: the observed symptom → its likely root cause (never restate the symptom as the cause).' },
            { key: 'coreNeeds', vi: 'Nhu cầu', en: 'Needs', desc: 'Exactly 3 lines — the functional need, the emotional need, the identity need — 1 sentence each, each answering a problem above.' },
            { key: 'desiredOutcomes', vi: 'Kết quả mong muốn', en: 'Desired outcomes', desc: '2-3 lines: the concrete result the customer wants and the result the business wants, each stated so it could be measured.' },
          ],
        },
        {
          key: 'frame', vi: 'Ràng buộc & giả định', en: 'Constraints & assumptions',
          maxTokens: 900, temperature: 0.3, dependsOn: ['problems'], contextKeys: ['givenFacts', 'intent', 'taskType', ...CUSTOMERS, ...PROBLEMS],
          fields: [
            { key: 'constraints', vi: 'Ràng buộc', en: 'Constraints', desc: 'Up to 4 lines: the budget, timing/season, capacity, channel or regulatory limits that bound every solution — the ones the given facts state first, then only ones that genuinely apply here.' },
            { key: 'assumptions', vi: 'Giả định', en: 'Assumptions', desc: '3-5 lines: the working assumptions the departments will proceed on because the topic does not say (e.g. volume, price tier, channel, timeline) — each worded as an assumption, never as a fact, and never contradicting the given facts.' },
            { key: 'informationGaps', vi: 'Thông tin còn thiếu', en: 'Information gaps', desc: '3-5 lines, each 1 question the boss or real data must answer, then " — " and which decision it would change. Questions only.' },
            { key: 'successCriteria', vi: 'Tiêu chí thành công', en: 'Success criteria', desc: '2-3 lines: measurable signs the whole effort worked (metric + target + timeframe), each tied to a desired outcome above.' },
          ],
        },
      ],
    },
    {
      id: 2, key: 'routing', vi: 'Phân công', en: 'Routing', type: 'text',
      role: 'a Chief Operating Officer who routes work across the 9 core business functions',
      task: 'Based on the context analysis provided below (do not skip it), decide which of the 9 core functions THIS task activates, who leads and how deep the work must go. The functions and what each one owns: strategy = direction, boundaries, risk, governance; product = the right product/service and its requirements; marketing = demand, positioning, content, growth; commercial = turning demand into sales, offers and customer success; operations = a repeatable delivery process, SOPs, capacity; supply = inputs, suppliers, inventory, logistics; quality = standards, QA/QC, KPIs; finance = unit economics, budget, cash and people capacity; technology = software, data, AI, automation. Reason before you rate: for each function ask what THIS task concretely needs from it, given its task type, given facts, constraints and information gaps — then rate it. Levels: REQUIRED = the task cannot succeed without it; RELEVANT = it clearly improves the result; CONDITIONAL = it only matters if a condition you name turns out true; NOT_MATERIAL = no real contribution to THIS task — say so instead of inventing work for it. Never activate a function just because it exists. In the {sector} sector these functions matter in almost every task — rate each at least RELEVANT unless it truly adds nothing to THIS task, and then say NOT_MATERIAL: {coreFunctions}. The lead owns the main outcome — usually: a new or improved offering → product; a growth or marketing campaign → marketing; a sales channel or customer success → commercial; an operations or delivery setup → operations; supply or sourcing → supply; a financial decision → finance; a technology build → technology; a direction, expansion or risk question → strategy; a quality problem → quality. Depth: simple = 1 lead + 0-2 support; standard = 1 lead + 2-4 support + a quality review; complex = most functions plus integration — judge it by risk, number of dependencies, capital needed, and customer, operational and regulatory impact.',
      calls: [{
        key: 'activation', vi: 'Kích hoạt phòng ban', en: 'Function activation',
        maxTokens: 900, temperature: 0.2, contextKeys: [...BRIEF, ...CUSTOMERS, ...PROBLEMS, ...FRAME], dependsOn: [],
        // Reasoning first, the machine-read rating last — the levels follow from the reasons, not the other way round.
        fields: [
          { key: 'rationale', vi: 'Lý do', en: 'Rationale', desc: 'Your reasoning, written first: 1 line for EACH of the 9 functions in the order above — "<key>: what this task needs from it, or why nothing" — adding "only if <condition>" for a conditional one. 9 lines, 1 sentence each, each on its own line (a real JSON "\\n" between lines); the keys stay in English exactly as written.' },
          { key: 'complexity', vi: 'Độ phức tạp', en: 'Complexity', desc: 'Exactly one of simple, standard or complex (in English), then " — " and 1 sentence naming the drivers that decided it.' },
          { key: 'lead', vi: 'Chủ trì', en: 'Lead function', desc: 'Exactly 1 key from the list above — the function that owns the main outcome of this task, consistent with your reasoning. The key only, nothing else.' },
          { key: 'activation', vi: 'Mức kích hoạt', en: 'Activation', hidden: true, desc: 'Machine-read — your ratings from the reasoning above, in exactly this shape with all 9 keys in this order, separated by "|": strategy:LEVEL|product:LEVEL|marketing:LEVEL|commercial:LEVEL|operations:LEVEL|supply:LEVEL|quality:LEVEL|finance:LEVEL|technology:LEVEL — each LEVEL exactly REQUIRED, RELEVANT, CONDITIONAL or NOT_MATERIAL, the lead REQUIRED. Keys and levels stay in English exactly as written; no spaces, no other text.' },
        ],
      }],
    },
  ],
};
