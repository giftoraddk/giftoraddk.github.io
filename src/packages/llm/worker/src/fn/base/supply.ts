import type { FnSpec } from '../types.ts';
import { HANDOFF_RULE, NOT_MATERIAL_RULE, ONE_PER_LINE, EVIDENCE_RULE } from './shared.ts';

/** Supply & Procurement (spec §13, §25): DEMAND → INPUT SPEC → SOURCING → SUPPLIER EVALUATION → INVENTORY / LOGISTICS → RISK / BACKUP. */
export const SUPPLY: FnSpec = {
  fn: 'supply', kind: 'pipeline',
  title: { vi: 'Cung ứng & Mua hàng', en: 'Supply & Procurement' },
  description: {
    vi: 'Đúng đầu vào, đúng nhà cung cấp, đúng chất lượng, số lượng, thời gian và chi phí — đặc tả đầu vào, tìm nguồn, tồn kho và phương án dự phòng.',
    en: 'Right input, supplier, quality, quantity, time and cost — input specs, sourcing, inventory and backup plans.',
  },
  output: null,
  needs: ['context'],
  uses: ['product.spec', 'product.quality', 'ops.package'],
  produces: [{
    kind: 'supply.package', dest: ['operations', 'quality', 'finance'],
    objective: 'Supply Package: what is bought to which spec, how and from what kind of supplier, MOQ and lead times, inventory, and the supply risks with their backup.',
    fields: ['inputSpec', 'supplierRequirements', 'sourcingPlan', 'moqLeadTime', 'inventoryPlan', 'supplierRisk', 'backupPlan'],
    sections: { requirements: ['inputSpec', 'supplierRequirements'], decisions: ['sourcingPlan'], assumptions: ['moqLeadTime'], risks: ['supplierRisk'] },
  }],
  steps: [
    {
      id: 1, key: 'inputs', vi: 'Đặc tả đầu vào', en: 'Input specification', type: 'text', knowledge: true,
      role: 'a Procurement and Supply Chain Manager for the {sector} sector',
      task: `Specify what this TOPIC needs to buy or contract, and what a supplier must meet. Not every task has a physical supply chain: for digital or service work, the inputs are vendors, cloud providers, contractors, data providers and third-party platforms. In {sector}, Supply typically covers {supplyFocus}. ${HANDOFF_RULE} ${NOT_MATERIAL_RULE}`,
      calls: [{
        key: 'inputs', vi: 'Đầu vào & yêu cầu NCC', en: 'Inputs & supplier requirements',
        maxTokens: 1000, temperature: 0.4, dependsOn: [],
        contextKeys: ['artifact.context', 'artifact.product.spec', 'artifact.product.quality', 'artifact.ops.package'],
        fields: [
          { key: 'inputSpec', vi: 'Đặc tả đầu vào', en: 'Input specification', desc: `Max 6 lines, 1 per input: "input — specification — quantity per unit — quality requirement". ${ONE_PER_LINE}` },
          { key: 'supplierRequirements', vi: 'Yêu cầu nhà cung cấp', en: 'Supplier requirements', desc: `What any supplier must meet on cost, quality, lead time, capacity and compliance — max 5 lines. ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 2, key: 'sourcing', vi: 'Nguồn cung & rủi ro', en: 'Sourcing & risk', type: 'text',
      role: 'a Strategic Sourcing Manager for the {sector} sector',
      task: 'Based on the approved input specification below (do not skip it), plan the sourcing and its risks. Name supplier TYPES and the criteria to shortlist them — never invent the names of real companies, prices or certifications that are not in the context or the knowledge provided. MOQ, lead times and costs not given are assumptions — say so in the wording.',
      calls: [
        {
          key: 'sourcing', vi: 'Tìm nguồn', en: 'Sourcing',
          maxTokens: 1000, temperature: 0.5, dependsOn: [], contextKeys: ['inputSpec', 'supplierRequirements', 'artifact.ops.package'],
          fields: [
            { key: 'sourcingPlan', vi: 'Kế hoạch tìm nguồn', en: 'Sourcing plan', desc: `For each key input: the supplier type and the shortlist criteria (cost, quality, lead time, capacity, reliability, compliance, dependency, geographic risk, continuity — only the ones that decide it) — max 5 lines. ${ONE_PER_LINE}` },
            { key: 'moqLeadTime', vi: 'MOQ & thời gian giao', en: 'MOQ & lead time', desc: `MOQ, lead time, availability and delivery schedule per key input — max 5 lines. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'risk', vi: 'Tồn kho & dự phòng', en: 'Inventory & backup',
          maxTokens: 900, temperature: 0.5, dependsOn: [], contextKeys: ['inputSpec', 'supplierRequirements'],
          fields: [
            { key: 'inventoryPlan', vi: 'Tồn kho & vận chuyển', en: 'Inventory & logistics', desc: `Stock levels or reorder logic, storage and logistics — max 4 lines. ${ONE_PER_LINE}` },
            { key: 'supplierRisk', vi: 'Rủi ro nguồn cung', en: 'Supplier risk', desc: `The top 3 supply risks (dependency, geographic, continuity, quality), 1 line each with its likelihood HIGH/MEDIUM/LOW. ${ONE_PER_LINE}` },
            { key: 'backupPlan', vi: 'Phương án dự phòng', en: 'Backup plan', desc: `For each risk above, the backup supplier type or fallback and when to switch — max 3 lines. ${ONE_PER_LINE}` },
          ],
        },
      ],
    },
  ],
};
