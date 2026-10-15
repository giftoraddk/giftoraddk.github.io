import type { FnSpec } from '../types.ts';
import { HANDOFF_RULE, ONE_PER_LINE } from './shared.ts';

/** Quality & Performance (spec §14, §28): STANDARD → ACCEPTANCE → QA / QC → DEFECTS / FAILURE MODES → KPI → IMPROVEMENT. */
export const QUALITY: FnSpec = {
  fn: 'quality', kind: 'pipeline',
  title: { vi: 'Chất lượng & Hiệu suất', en: 'Quality & Performance' },
  description: {
    vi: 'Tiêu chuẩn, tiêu chí nghiệm thu, kế hoạch QA/QC, phân loại lỗi và bộ KPI đo được — chất lượng từ đầu, không chỉ kiểm tra cuối.',
    en: 'Standards, acceptance criteria, QA/QC plans, defect taxonomy and measurable KPIs — quality built in, not just a final check.',
  },
  output: null,
  needs: ['context'],
  uses: ['strategy.brief', 'product.quality', 'commercial.sla', 'ops.controls', 'supply.package', 'tech.package'],
  produces: [{
    kind: 'quality.findings', dest: ['product', 'operations', 'supply', 'technology', 'integration'],
    objective: 'Quality Findings: the standard and acceptance criteria, how it is checked, the failure modes found and the KPIs that will show whether it holds.',
    fields: ['qualityStandard', 'acceptanceCriteria', 'qcPlan', 'failureModes', 'defectTaxonomy', 'kpis'],
    sections: { requirements: ['qualityStandard', 'kpis'], acceptance_criteria: ['acceptanceCriteria'], risks: ['failureModes'] },
  }],
  steps: [
    {
      id: 1, key: 'standard', vi: 'Tiêu chuẩn', en: 'Standard', type: 'text', knowledge: true,
      role: 'a Head of Quality (QA/QC) for the {sector} sector',
      task: `Set the quality bar for 1 TOPIC from every department's critical requirements — product, supplier, process, customer commitments and technology — not from generic words like "good" or "professional". Choose only the quality dimensions that matter here (accuracy, reliability, consistency, safety, durability, performance, customer experience, compliance, timeliness, defect rate) — in {sector} quality usually turns on {qualityFocus}. ${HANDOFF_RULE}`,
      calls: [{
        key: 'standard', vi: 'Tiêu chuẩn & nghiệm thu', en: 'Standard & acceptance',
        maxTokens: 1000, temperature: 0.4, dependsOn: [],
        contextKeys: ['artifact.context', 'artifact.product.quality', 'artifact.commercial.sla', 'artifact.ops.controls', 'artifact.strategy.brief'],
        fields: [
          { key: 'qualityStandard', vi: 'Tiêu chuẩn chất lượng', en: 'Quality standard', desc: `Max 5 lines, 1 per dimension that matters: "dimension: the standard to meet". ${ONE_PER_LINE}` },
          { key: 'acceptanceCriteria', vi: 'Tiêu chí nghiệm thu', en: 'Acceptance criteria', desc: `Max 5 measurable pass/fail criteria (what is measured + the threshold), 1 per line. ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 2, key: 'plan', vi: 'Kế hoạch QA/QC', en: 'QA/QC plan', type: 'text',
      role: 'a Quality Engineer for the {sector} sector',
      task: `Based on the approved standard below (do not skip it), plan how quality is built in (QA) and checked (QC), and where it will most likely fail. ${HANDOFF_RULE}`,
      calls: [
        {
          key: 'plan', vi: 'QA & QC', en: 'QA & QC',
          maxTokens: 900, temperature: 0.4, dependsOn: [], contextKeys: ['qualityStandard', 'acceptanceCriteria', 'artifact.ops.controls', 'artifact.supply.package'],
          fields: [
            { key: 'qaPlan', vi: 'Kế hoạch QA', en: 'QA plan', desc: `How quality is built in before it can fail — training, checklists, supplier standards, design reviews — max 4 lines. ${ONE_PER_LINE}` },
            { key: 'qcPlan', vi: 'Kế hoạch QC', en: 'QC plan', desc: `What is inspected, when, how and on what sample (incoming, in-process, final) — max 5 lines. ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'failures', vi: 'Lỗi & chế độ hỏng', en: 'Defects & failure modes',
          maxTokens: 900, temperature: 0.4, dependsOn: [], contextKeys: ['qualityStandard', 'acceptanceCriteria', 'artifact.product.quality', 'artifact.tech.package'],
          fields: [
            { key: 'defectTaxonomy', vi: 'Phân loại lỗi', en: 'Defect taxonomy', desc: `Max 4 defect classes, each with its severity CRITICAL/MAJOR/MINOR and an example. ${ONE_PER_LINE}` },
            { key: 'failureModes', vi: 'Chế độ hỏng', en: 'Failure modes', desc: `The top 3 failure modes, 1 line each: "cause → effect → how it is detected → corrective and preventive action". ${ONE_PER_LINE}` },
          ],
        },
      ],
    },
    {
      id: 3, key: 'kpi', vi: 'KPI & cải tiến', en: 'KPIs & improvement', type: 'text',
      role: 'a Performance Analyst for the {sector} sector',
      task: 'Based on the approved standard and QA/QC plan below (do not skip them), define how performance is measured and improved. No vanity metrics: every KPI must drive an action when it misses. Targets are proposals — mark them as such, never as company policy. Common {sector} KPIs: {kpis} — use only the ones that fit this task.',
      calls: [{
        key: 'kpi', vi: 'KPI', en: 'KPIs',
        maxTokens: 1200, temperature: 0.4, dependsOn: [], contextKeys: ['qualityStandard', 'acceptanceCriteria', 'qcPlan', 'failureModes'],
        fields: [
          { key: 'kpis', vi: 'Bộ KPI', en: 'KPI framework', desc: `3-5 KPIs, 1 per line, in this shape: "KPI | Definition | Formula | Proposed target | Frequency | Data source | Owner | Action if below target". ${ONE_PER_LINE}` },
          { key: 'improvementLoop', vi: 'Vòng cải tiến', en: 'Improvement loop', desc: `How feedback and defects flow back: classification → root cause → product/process change → validation → standard update — max 4 lines. ${ONE_PER_LINE}` },
        ],
      }],
    },
  ],
};
