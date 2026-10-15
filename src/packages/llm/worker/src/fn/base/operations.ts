import type { FnSpec } from '../types.ts';
import { HANDOFF_RULE, NOT_MATERIAL_RULE, ONE_PER_LINE, EVIDENCE_RULE } from './shared.ts';

/** Operations & Delivery (spec §12, §24): REQUIREMENTS → PROCESS MAP → SOP → CAPACITY → RESOURCES → DELIVERY → CONTROL POINTS. */
export const OPERATIONS: FnSpec = {
  fn: 'operations', kind: 'pipeline',
  title: { vi: 'Vận hành & Giao hàng', en: 'Operations & Delivery' },
  description: {
    vi: 'Biến lời hứa sản phẩm/dịch vụ thành quy trình làm được, lặp lại được: sơ đồ quy trình, SOP, năng lực, nguồn lực và giao hàng.',
    en: 'Turns the product/service promise into a repeatable process: process map, SOP, capacity, resources and delivery.',
  },
  output: null,
  needs: ['context'],
  uses: ['product.spec', 'product.quality', 'marketing.demand', 'commercial.sla'],
  produces: [
    {
      kind: 'ops.package', dest: ['supply', 'finance', 'technology', 'quality'],
      objective: 'Operating Package: the process, its core SOP, the capacity and resources it needs, how it is delivered, the inputs it consumes and what could be automated.',
      fields: ['processMap', 'sop', 'capacityPlan', 'resourcePlan', 'deliveryPlan', 'inputRequirements', 'automationCandidates'],
      sections: { decisions: ['processMap'], requirements: ['inputRequirements', 'automationCandidates'], assumptions: ['capacityPlan'], constraints: ['resourcePlan'] },
    },
    {
      kind: 'ops.controls', dest: ['quality'],
      objective: 'Operational Control Points: where the process is checked, what must pass, and where it is most likely to fail.',
      fields: ['controlPoints', 'failurePoints'],
      sections: { acceptance_criteria: ['controlPoints'], risks: ['failurePoints'] },
    },
  ],
  steps: [
    {
      id: 1, key: 'process', vi: 'Thiết kế quy trình', en: 'Process design', type: 'text', knowledge: true,
      role: 'a Chief Operating Officer and process engineer for the {sector} sector',
      task: `Design how 1 product/service promise is actually delivered, end to end, so it can be executed, repeated, measured and scaled. Map the process from the requirements, not from a generic template. ${HANDOFF_RULE} ${NOT_MATERIAL_RULE}`,
      calls: [{
        key: 'processMap', vi: 'Sơ đồ quy trình', en: 'Process map',
        maxTokens: 1200, temperature: 0.5, dependsOn: [],
        contextKeys: ['artifact.context', 'artifact.product.spec', 'artifact.product.quality', 'artifact.commercial.sla'],
        fields: [
          { key: 'processMap', vi: 'Sơ đồ quy trình', en: 'Process map', desc: `Max 7 numbered stages, each 1 line: "input → activity → output — owner — tool — time". Build on how {sector} businesses usually run it ({processes}) where it fits. ${ONE_PER_LINE}` },
          { key: 'controlPoints', vi: 'Điểm kiểm soát', en: 'Control points', desc: `Max 5 lines: at which stage a check or decision happens and what must pass to continue (a measurable acceptance check). ${ONE_PER_LINE}` },
          { key: 'failurePoints', vi: 'Điểm dễ hỏng', en: 'Failure points', desc: `The top 3 failure points, 1 line each: "where — what goes wrong — exception handling / who it escalates to". ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 2, key: 'sop', vi: 'SOP', en: 'Standard operating procedure', type: 'text',
      role: 'a process engineer who writes SOPs front-line staff can follow on day one',
      task: 'Based on the approved process map below (do not skip it), write the ONE SOP that matters most for this process — concrete enough to train a new hire with, no generic filler.',
      calls: [{
        key: 'sop', vi: 'SOP chính', en: 'Core SOP',
        maxTokens: 1500, temperature: 0.4, dependsOn: [], contextKeys: ['processMap', 'controlPoints', 'failurePoints'],
        fields: [{ key: 'sop', vi: 'SOP', en: 'SOP', desc: `The SOP with these headings, each heading on its own line followed by its content: Purpose, Scope, Trigger, Inputs, Steps (numbered), Decision rules, Quality checks, Exception handling, Escalation, Output, Owner. Keep each section to 1-3 short lines. ${ONE_PER_LINE}` }],
      }],
    },
    {
      id: 3, key: 'capacity', vi: 'Năng lực & giao hàng', en: 'Capacity & delivery', type: 'text',
      role: 'an Operations Planner for the {sector} sector',
      task: `Based on the approved process and SOP below (do not skip them), size the operation and plan how it delivers. Volumes and times not given in the context or handoffs are assumptions — say so in the wording, never present them as known. ${HANDOFF_RULE}`,
      calls: [
        {
          key: 'capacity', vi: 'Năng lực', en: 'Capacity',
          maxTokens: 1000, temperature: 0.4, dependsOn: [], contextKeys: ['processMap', 'sop', 'artifact.marketing.demand', 'artifact.commercial.sla'],
          fields: [
            { key: 'capacityPlan', vi: 'Kế hoạch năng lực', en: 'Capacity plan', desc: `The volume to plan for, the throughput per day/week, and the bottleneck — max 4 lines. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
            { key: 'resourcePlan', vi: 'Nguồn lực', en: 'Resource plan', desc: `People, equipment, space and tools needed, and the main cost drivers — max 5 lines. ${ONE_PER_LINE}` },
            { key: 'deliveryPlan', vi: 'Giao hàng', en: 'Delivery plan', desc: `How the result reaches the customer — fulfilment steps, timing and handover — max 4 lines. ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'requirements', vi: 'Đầu vào & tự động hoá', en: 'Inputs & automation',
          maxTokens: 800, temperature: 0.4, dependsOn: [], contextKeys: ['processMap', 'sop', 'artifact.product.spec'],
          fields: [
            { key: 'inputRequirements', vi: 'Yêu cầu đầu vào', en: 'Input requirements', desc: `What the process consumes, for Supply: each input with volume, timing, quality and inventory need — max 5 lines. ${ONE_PER_LINE}` },
            { key: 'automationCandidates', vi: 'Có thể tự động hoá', en: 'Automation candidates', desc: `Max 3 repetitive or error-prone steps worth automating, each with the data it needs — or "None worth automating yet" with 1 reason. ${ONE_PER_LINE}` },
          ],
        },
      ],
    },
  ],
};
