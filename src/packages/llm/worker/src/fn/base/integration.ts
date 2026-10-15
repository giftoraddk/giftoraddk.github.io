import { FUNCTIONS, type FnSpec } from '../types.ts';
import { KINDS } from '../kinds.ts';
import { ONE_PER_LINE } from './shared.ts';

/** Every department handoff — integration reads whichever of them the plan produces (soft `uses`, P3-13). */
const DEPARTMENT_KINDS = Object.keys(KINDS).filter(k => (FUNCTIONS as readonly string[]).includes(KINDS[k].source));

// The signal is a [CODE]: kept in the data for the decision call below, hidden on screen (client tool/codes.js).
const SIGNAL = 'End every line with one signal in square brackets: [STRONG], [ADEQUATE], [WEAK] or [UNKNOWN] (keep it in English). The boss never sees the signal, so the judgement before it must read complete on its own. A dimension with no handoff to judge it from is [UNKNOWN] — never guess it into a pass. The signals are diagnostics, never a score that replaces the reasoning.';

/**
 * Integration (spec §29 Final integration, §30 Universal decision gate, §31 go-live decision, §43 conflict management) —
 * a system step: it runs inside a task once every planned department is approved (P3-13), never as a standalone job.
 */
export const INTEGRATION: FnSpec = {
  fn: 'integration', kind: 'pipeline',
  title: { vi: 'Tích hợp', en: 'Integration' },
  description: {
    vi: 'Rà soát chéo bàn giao của các phòng theo 14 tiêu chí, chỉ ra xung đột và ra quyết định: duyệt / duyệt có điều kiện / tạm hoãn / từ chối.',
    en: "Cross-checks the departments' handoffs on 14 dimensions, surfaces conflicts and decides: approve / approve with conditions / hold / reject.",
  },
  output: null,
  needs: ['context', 'routing'],
  uses: DEPARTMENT_KINDS,
  produces: [{
    kind: 'decision', dest: ['secretary', 'strategy'],
    objective: 'Integrated Decision: the go / no-go call with its conditions, the cross-department conflicts and how to resolve them, the next steps, and the 14-dimension gate it rests on.',
    fields: ['decision', 'conditions', 'conflicts', 'roadmap', 'openQuestions', 'marketFit', 'deliveryFit', 'economicsFit'],
    sections: { decisions: ['decision', 'roadmap'], requirements: ['conditions'], risks: ['conflicts'], open_questions: ['openQuestions'] },
  }],
  steps: [
    {
      id: 1, key: 'gate', vi: 'Rà soát 14 tiêu chí', en: 'Decision gate', type: 'text',
      role: 'an Integration Lead who checks that the departments\' work fits together into one business result',
      task: 'Do NOT simply add the departments\' reports together. Judge each dimension below against the approved handoffs provided (do not skip them): does the whole hold up from customer value through economics to risk? Name the department whose handoff supports or undermines each judgement. A handoff marked as needing re-verification counts as unconfirmed.',
      calls: [
        {
          key: 'market', vi: 'Khách hàng & thị trường', en: 'Customer & market',
          maxTokens: 900, temperature: 0.3, dependsOn: [],
          contextKeys: ['artifact.context', 'artifact.strategy.brief', 'artifact.product.value', 'artifact.marketing.insight', 'artifact.marketing.demand', 'artifact.commercial.offer', 'artifact.commercial.sla'],
          fields: [{ key: 'marketFit', vi: 'Khách hàng & thị trường', en: 'Customer & market fit', desc: `Exactly 4 lines — Customer value, Product/service fit, Market fit, Commercial feasibility — each "dimension: 1-sentence judgement". ${SIGNAL} ${ONE_PER_LINE}` }],
        },
        {
          key: 'delivery', vi: 'Khả năng thực thi', en: 'Delivery',
          maxTokens: 1000, temperature: 0.3, dependsOn: [],
          contextKeys: ['artifact.product.spec', 'artifact.product.quality', 'artifact.ops.package', 'artifact.ops.controls', 'artifact.supply.package', 'artifact.quality.findings', 'artifact.tech.package'],
          fields: [{ key: 'deliveryFit', vi: 'Khả năng thực thi', en: 'Delivery feasibility', desc: `Exactly 5 lines — Operational feasibility, Supply feasibility, Quality, Technology feasibility, Measurement readiness — each "dimension: 1-sentence judgement". ${SIGNAL} ${ONE_PER_LINE}` }],
        },
        {
          key: 'economics', vi: 'Kinh tế & rủi ro', en: 'Economics & risk',
          maxTokens: 1000, temperature: 0.3, dependsOn: [],
          contextKeys: ['artifact.strategy.econFrame', 'artifact.finance.economics', 'artifact.finance.people', 'artifact.strategy.brief', 'artifact.quality.findings'],
          fields: [{ key: 'economicsFit', vi: 'Kinh tế & rủi ro', en: 'Economics & risk', desc: `Exactly 5 lines — Economics, People/capability, Scalability, Risk, Improvement readiness — each "dimension: 1-sentence judgement". ${SIGNAL} ${ONE_PER_LINE}` }],
        },
      ],
    },
    {
      id: 2, key: 'decision', vi: 'Quyết định', en: 'Decision', type: 'text',
      role: 'an Integration Lead and Chief of Staff who brings one decision to the boss',
      task: 'Based on the approved decision gate below (do not skip it), find where the departments contradict each other, then make one integrated decision the boss can act on. Never hide a conflict to make the plan look finished.',
      calls: [
        {
          key: 'conflicts', vi: 'Xung đột', en: 'Conflicts',
          maxTokens: 900, temperature: 0.3, dependsOn: [],
          contextKeys: ['marketFit', 'deliveryFit', 'economicsFit', 'artifact.context'],
          fields: [{ key: 'conflicts', vi: 'Xung đột giữa các phòng', en: 'Cross-department conflicts', desc: `Max 4 conflicts, 1 line each: "conflict — the departments involved — the assumption behind each side — 1-2 options to resolve — who must re-evaluate". If there is none, 1 line saying no material conflict was found and why. ${ONE_PER_LINE}` }],
        },
        {
          key: 'decision', vi: 'Quyết định', en: 'Decision',
          maxTokens: 1000, temperature: 0.3, dependsOn: ['conflicts'],
          contextKeys: ['marketFit', 'deliveryFit', 'economicsFit', 'conflicts'],
          fields: [
            { key: 'decision', vi: 'Quyết định', en: 'Decision', desc: 'Start with exactly one of APPROVE / APPROVE WITH CONDITIONS / HOLD / REJECT (keep these words in English), then " — " and 1 sentence why. Any [WEAK] dimension or unresolved conflict rules out a plain APPROVE; mostly [UNKNOWN] dimensions mean HOLD.' },
            { key: 'conditions', vi: 'Điều kiện', en: 'Conditions', desc: `What must be true before go-live (open quality, operations, customer or business readiness items), 1 per line with the owning department — or "None". Max 5 lines. ${ONE_PER_LINE}` },
            { key: 'roadmap', vi: 'Bước tiếp theo', en: 'Next steps', desc: `3-5 next actions in order, each "action — owning department — when". ${ONE_PER_LINE}` },
            { key: 'openQuestions', vi: 'Câu hỏi mở', en: 'Open questions', desc: `Max 4 questions the boss or real data must answer, each with the decision it would change. ${ONE_PER_LINE}` },
          ],
        },
      ],
    },
  ],
};
