import type { FnSpec } from '../types.ts';
import { HANDOFF_RULE, ONE_PER_LINE, EVIDENCE_RULE } from './shared.ts';

/** Strategy & Governance (spec §8): CONTEXT → OPPORTUNITY → ALTERNATIVES → BUSINESS MODEL → RISK / GOVERNANCE → DIRECTION. */
export const STRATEGY: FnSpec = {
  fn: 'strategy', kind: 'pipeline',
  title: { vi: 'Chiến lược & Quản trị', en: 'Strategy & Governance' },
  description: {
    vi: 'Có nên làm không, theo hướng nào, trong giới hạn nào, với rủi ro nào — phương án, mô hình kinh doanh, rủi ro và tiêu chí quyết định.',
    en: 'Whether to do it, which way, within which boundaries and at what risk — options, business model, risks and decision criteria.',
  },
  output: null,
  needs: ['context'],
  uses: [],
  produces: [
    {
      kind: 'strategy.brief', dest: ['product', 'marketing', 'commercial', 'quality'],
      objective: 'Strategic Brief: the chosen direction, the opportunity it targets, its boundaries and non-goals, the business-model hypothesis, and the risk and governance requirements every department must respect.',
      fields: ['strategicDirection', 'opportunity', 'boundaries', 'businessModel', 'riskMap', 'governance'],
      sections: { decisions: ['strategicDirection'], constraints: ['boundaries', 'governance'], assumptions: ['businessModel'], risks: ['riskMap'] },
    },
    {
      kind: 'strategy.econFrame', dest: ['finance'],
      objective: 'Economic Decision Frame: the strategic objective, the investment boundary and acceptable risk, and the business outcomes the economics must reach.',
      fields: ['strategicDirection', 'investmentFrame', 'decisionCriteria'],
      sections: { decisions: ['strategicDirection'], constraints: ['investmentFrame'], acceptance_criteria: ['decisionCriteria'] },
    },
  ],
  steps: [
    {
      id: 1, key: 'context', vi: 'Bối cảnh chiến lược', en: 'Strategic context', type: 'text', knowledge: true,
      role: 'a Chief Strategy Officer and business analyst for the {sector} sector',
      task: `Frame the strategic problem behind 1 business TOPIC before any option is chosen: the market and business-model context it sits in, and the opportunity it represents. Do NOT recommend a direction yet. ${HANDOFF_RULE}`,
      calls: [{
        key: 'situation', vi: 'Bối cảnh & cơ hội', en: 'Context & opportunity',
        maxTokens: 900, temperature: 0.5, contextKeys: ['artifact.context'], dependsOn: [],
        fields: [
          { key: 'strategicContext', vi: 'Bối cảnh chiến lược', en: 'Strategic context', desc: 'The strategic problem in 1 sentence, then the market, the business model it touches and the current state — max 4 sentences, no generic industry filler.' },
          { key: 'opportunity', vi: 'Cơ hội', en: 'Opportunity', desc: `Customer value, market need, strategic fit, competitive situation and timing — 1 line each, only those that genuinely apply. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 2, key: 'options', vi: 'Phương án', en: 'Strategic options', type: 'text',
      role: 'a Chief Strategy Officer for the {sector} sector',
      task: 'Based on the approved strategic context below (do not skip it), lay out the realistic strategic alternatives and the business model each one implies. Compare honestly — include the option of a smaller first step when it is genuinely viable. Do not pick the winner yet.',
      calls: [
        {
          key: 'alternatives', vi: 'Các phương án', en: 'Alternatives',
          maxTokens: 1200, temperature: 0.6, dependsOn: [], contextKeys: ['strategicContext', 'opportunity', 'artifact.context'],
          fields: [{ key: 'strategicOptions', vi: 'Phương án chiến lược', en: 'Strategic options', desc: `2-4 options. For each: the option's name on its own line, then 1 short line each for Rationale, Benefit, Cost, Risk, Feasibility, Dependencies (as "label: value"), with a blank line between options. ${ONE_PER_LINE}` }],
        },
        {
          key: 'model', vi: 'Mô hình kinh doanh', en: 'Business model',
          maxTokens: 700, temperature: 0.5, dependsOn: [], contextKeys: ['strategicContext', 'opportunity', 'artifact.context'],
          fields: [{ key: 'businessModel', vi: 'Giả thuyết mô hình kinh doanh', en: 'Business model hypothesis', desc: `Who pays, for what, through which channel, and what makes it profitable — 3-5 lines. Weigh the common {sector} models ({businessModels}) before inventing a new one. ${EVIDENCE_RULE} ${ONE_PER_LINE}` }],
        },
      ],
    },
    {
      id: 3, key: 'direction', vi: 'Định hướng & rủi ro', en: 'Direction & risk', type: 'text',
      role: 'a Chief Strategy Officer and Risk & Governance lead for the {sector} sector',
      task: 'Based on the approved context and options below (do not skip them), map the material risks and governance needs, then choose the direction and state its boundaries and the criteria that will decide success. Strategy sets direction and boundaries — it does not do the departments\' execution work.',
      calls: [
        {
          key: 'risk', vi: 'Rủi ro & quản trị', en: 'Risk & governance',
          maxTokens: 900, temperature: 0.4, dependsOn: [], contextKeys: ['strategicContext', 'strategicOptions', 'businessModel'],
          fields: [
            { key: 'riskMap', vi: 'Bản đồ rủi ro', en: 'Risk map', desc: `Only the material risks among strategic, legal, regulatory, financial, operational, reputational, technology and customer — 1 line each: "group: the risk — severity HIGH/MEDIUM/LOW — mitigation". Check the {sector} regulatory frame: {regulations}; and the risks common in {sector}: {risks}. Max 6 lines. ${ONE_PER_LINE}` },
            { key: 'governance', vi: 'Yêu cầu quản trị', en: 'Governance requirements', desc: `Who decides, the approval points, and the policy / compliance rules the work must respect — max 4 lines. ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'direction', vi: 'Định hướng', en: 'Direction',
          maxTokens: 1000, temperature: 0.4, dependsOn: ['risk'], contextKeys: ['strategicContext', 'opportunity', 'strategicOptions', 'businessModel', 'riskMap'],
          fields: [
            { key: 'strategicDirection', vi: 'Định hướng chiến lược', en: 'Strategic direction', desc: 'The recommended option by name and why it beats the others — max 3 sentences.' },
            { key: 'boundaries', vi: 'Giới hạn & không làm', en: 'Boundaries & non-goals', desc: `What is in scope, what is explicitly NOT a goal, and the limits every department must stay within — max 5 lines. ${ONE_PER_LINE}` },
            { key: 'investmentFrame', vi: 'Khung đầu tư', en: 'Investment frame', desc: `The investment boundary, the acceptable risk and the business outcomes the economics must reach — max 4 lines; amounts only as stated or as clearly worded assumptions. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
            { key: 'decisionCriteria', vi: 'Tiêu chí quyết định', en: 'Decision criteria', desc: `3-5 measurable criteria (metric + threshold + timeframe) that decide whether to continue, adjust or stop. ${ONE_PER_LINE}` },
          ],
        },
      ],
    },
  ],
};
