import type { FnSpec } from '../types.ts';
import { ONE_PER_LINE, EVIDENCE_RULE } from './shared.ts';

/** Finance & People (spec §15, §26): DATA → CHECK → UNIT ECONOMICS → ANALYZE → RISK → RECOMMEND → DECIDE, then the people
 *  needed to run it. Never invents numbers — a figure that is not in the data is a stated assumption. */
export const FINANCE: FnSpec = {
  fn: 'finance', kind: 'pipeline',
  title: { vi: 'Tài chính & Nhân sự', en: 'Finance & People' },
  description: { vi: 'Phân tích tài chính, kinh tế đơn vị, dòng tiền, rủi ro, đề xuất GO/NO-GO từ số liệu thật và kế hoạch nhân sự.', en: 'Financial analysis, unit economics, cash flow, risk, a GO/NO-GO call from real numbers and the workforce plan.' },
  // No `inputs` here: real numbers come from a sector's own data — e-commerce feeds its shop invoices (sectors/ecommerce.ts).
  needs: ['context'],
  uses: ['strategy.econFrame', 'product.spec', 'marketing.demand', 'commercial.offer', 'ops.package', 'supply.package', 'tech.package'],
  produces: [
    {
      kind: 'finance.economics', dest: ['strategy', 'product', 'operations', 'commercial'],
      objective: 'Economics Package: the financial conclusion, unit economics, budget and cash need, its impact and risk level, and the GO / NO-GO call with its conditions.',
      fields: ['conclusion', 'unitEconomics', 'budgetCash', 'analysis', 'impact', 'risk', 'recommendation', 'decision'],
      sections: { decisions: ['decision', 'recommendation'], risks: ['risk'], assumptions: ['analysis', 'unitEconomics', 'budgetCash'] },
    },
    {
      kind: 'finance.people', dest: ['operations', 'strategy'],
      objective: 'Workforce Plan: the roles and capabilities the plan needs, their workload, and how they are staffed and trained.',
      fields: ['roles', 'staffingPlan'],
      sections: { requirements: ['roles'], decisions: ['staffingPlan'] },
    },
  ],
  output: null,
  steps: [
    {
      id: 1, key: 'analysis', vi: 'Phân tích tài chính', en: 'Financial Analysis', type: 'text', knowledge: true,
      role: 'a Financial Controller and CFO — reasoning as a team of accountant/cash-flow-manager/budget-controller/risk-analyst combined',
      task: 'Task: analyze the financial QUESTION or DECISION being asked, grounded STRICTLY in the real financial data provided below as [FINANCIAL_CONTEXT] and, when present, in the approved handoffs from other departments (product specification, demand plan, operations, supply) — do not skip them, do not invent numbers not present in them. Follow DATA -> CHECK -> CLASSIFY -> ANALYZE -> ASSESS RISK -> RECOMMEND -> DECIDE. If [FINANCIAL_CONTEXT] is missing a number needed to answer precisely, say so explicitly instead of guessing.',
      calls: [
        {
          key: 'g1', vi: 'Kết luận & phân tích', en: 'Conclusion & analysis',
          maxTokens: 900, temperature: 0.4,
          contextKeys: ['financialContext', 'artifact.context', 'artifact.strategy.econFrame', 'artifact.marketing.demand', 'artifact.commercial.offer'],
          dependsOn: [],
          fields: [
            { key: 'conclusion', vi: 'Kết luận', en: 'Conclusion', desc: 'The short, direct answer to the financial question asked — 1-2 sentences, no hedging filler.' },
            { key: 'analysis', vi: 'Phân tích', en: 'Analysis', desc: 'The reasoning behind the conclusion — what the numbers in [FINANCIAL_CONTEXT] show, any trend/ratio/margin relevant, and what data was insufficient or assumed (mark assumptions explicitly as "Giả định:"). Max 5 sentences.' },
            { key: 'impact', vi: 'Tác động', en: 'Financial Impact', desc: 'Concrete impact on Revenue / Profit / Cash / Risk if this situation continues or this decision is taken — 1 short sentence per dimension that applies, skip ones with no real impact.' },
          ],
        },
        {
          // Kinh tế đơn vị chạy song song g1 (dependsOn: []) — đọc bàn giao về chi phí (sản phẩm, cung ứng, vận hành, công nghệ).
          key: 'unitEconomics', vi: 'Kinh tế đơn vị', en: 'Unit economics',
          maxTokens: 900, temperature: 0.3, dependsOn: [],
          contextKeys: ['financialContext', 'artifact.product.spec', 'artifact.supply.package', 'artifact.ops.package', 'artifact.tech.package', 'artifact.commercial.offer'],
          fields: [
            { key: 'unitEconomics', vi: 'Kinh tế đơn vị', en: 'Unit economics', desc: `Price, COGS per unit, gross margin, contribution margin and break-even volume — 1 line each, computed only from numbers in [FINANCIAL_CONTEXT] or the handoffs; when a number is missing, say which one and mark the estimate you use as one. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
            { key: 'budgetCash', vi: 'Ngân sách & dòng tiền', en: 'Budget & cash', desc: `The budget to start, the working capital tied up (stock, receivables, payment terms) and the cash runway impact — max 4 lines. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'g2', vi: 'Rủi ro & quyết định', en: 'Risk & decision',
          maxTokens: 700, temperature: 0.4, contextKeys: ['financialContext', 'conclusion', 'analysis', 'unitEconomics', 'budgetCash'], dependsOn: ['g1', 'unitEconomics'],
          fields: [
            { key: 'risk', vi: 'Rủi ro', en: 'Risk', desc: 'Start with exactly one of GREEN/YELLOW/ORANGE/RED (mark any threshold you use as "Ngưỡng phân tích đề xuất", never claim it is official company policy), then 1 sentence why.' },
            { key: 'recommendation', vi: 'Khuyến nghị', en: 'Recommendation', desc: 'The recommended action(s) — what to do, who/which department should act, priority, and the risk of doing nothing. Max 4 sentences.' },
            { key: 'decision', vi: 'Quyết định', en: 'Decision', desc: 'Start with exactly one of GO / GO WITH CONDITIONS / NO-GO / NEED MORE DATA, then 1 sentence justifying it. Use NEED MORE DATA honestly when [FINANCIAL_CONTEXT] lacks what is needed — never force a GO/NO-GO on insufficient data.' },
          ],
        },
      ],
    },
    {
      id: 2, key: 'people', vi: 'Nhân sự', en: 'People', type: 'text',
      role: 'an HR Business Partner and workforce planner',
      task: 'Based on the approved financial decision below (do not skip it) and, when present, the operating package, define the people this plan needs: REQUIRED OUTCOMES → CAPABILITIES → WORKLOAD → ROLES → HIRING / ALLOCATION → TRAINING. Prefer reallocating existing people before hiring. If the plan genuinely needs no people change, say "NOT MATERIAL FOR THIS TASK" and 1 sentence why in each field.',
      calls: [{
        key: 'people', vi: 'Vai trò & bố trí', en: 'Roles & staffing',
        maxTokens: 900, temperature: 0.4, dependsOn: [],
        contextKeys: ['conclusion', 'decision', 'unitEconomics', 'artifact.ops.package', 'artifact.context'],
        fields: [
          { key: 'roles', vi: 'Vai trò & năng lực', en: 'Roles & capabilities', desc: `Max 5 roles, 1 line each: "role — the capability it needs — its workload (hours or FTE, marked as an estimate when not given)". ${ONE_PER_LINE}` },
          { key: 'staffingPlan', vi: 'Tuyển dụng & đào tạo', en: 'Staffing & training', desc: `For each role: hire, reallocate or outsource and why, then the training it needs before go-live — max 5 lines. ${ONE_PER_LINE}` },
        ],
      }],
    },
  ],
};
