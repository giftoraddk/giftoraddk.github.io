import type { FnSpec } from '../types.ts';
import { HANDOFF_RULE, ONE_PER_LINE, EVIDENCE_RULE } from './shared.ts';

/** Commercial & Customer (spec §11, §23): BUYERS → BUYING JOURNEY → VALUE → OFFER → SALES → OBJECTIONS → ONBOARDING → RETENTION. */
export const COMMERCIAL: FnSpec = {
  fn: 'commercial', kind: 'pipeline',
  title: { vi: 'Thương mại & Khách hàng', en: 'Commercial & Customer' },
  description: {
    vi: 'Biến nhu cầu thành giao dịch: người mua, hành trình mua, gói chào bán, quy trình bán, xử lý phản đối, chăm sóc và giữ chân khách.',
    en: 'Turns demand into sales: buyers, buying journey, offer, sales process, objection handling, customer success and retention.',
  },
  output: null,
  needs: ['context'],
  uses: ['strategy.brief', 'product.value', 'marketing.insight', 'marketing.demand'],
  produces: [
    {
      kind: 'commercial.offer', dest: ['marketing', 'finance', 'operations'],
      objective: 'Commercial Offer Package: who buys and decides, the value proposition, what the offer contains, its pricing logic, the sales process and the objections to handle.',
      fields: ['valueProposition', 'offerStructure', 'pricingLogic', 'buyerMap', 'salesProcess', 'objectionMap'],
      sections: { decisions: ['valueProposition', 'offerStructure'], assumptions: ['pricingLogic', 'buyerMap'], risks: ['objectionMap'] },
    },
    {
      kind: 'commercial.sla', dest: ['operations', 'quality'],
      objective: 'Customer Success Requirements: the service and delivery commitments made to the customer, the buying journey they go through, and how they are kept.',
      fields: ['serviceCommitments', 'buyingJourney', 'retentionPlan'],
      sections: { requirements: ['serviceCommitments'], decisions: ['retentionPlan'] },
    },
  ],
  steps: [
    {
      id: 1, key: 'buyers', vi: 'Người mua', en: 'Buyers', type: 'text', knowledge: true,
      role: 'a Commercial Director and sales strategist for the {sector} sector',
      task: `Identify who actually buys for 1 TOPIC and how they decide, BEFORE designing any offer. Distinguish the User, the Buyer, the Decision Maker, the Influencer and the Economic Buyer — never assume they are the same person; say so only when the context shows it. ${HANDOFF_RULE}`,
      calls: [{
        key: 'buyerMap', vi: 'Bản đồ người mua', en: 'Buyer map',
        maxTokens: 900, temperature: 0.5, dependsOn: [],
        contextKeys: ['artifact.context', 'artifact.strategy.brief', 'artifact.product.value', 'artifact.marketing.insight'],
        fields: [
          { key: 'buyerMap', vi: 'Bản đồ người mua', en: 'Buyer map', desc: `Exactly 5 lines — User, Buyer, Decision Maker, Influencer, Economic Buyer — each "role: who it is + what they care about". ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
          { key: 'buyingJourney', vi: 'Hành trình mua', en: 'Buying journey', desc: `The buying process as 3-6 numbered stages from trigger to purchase, each with what the buyer needs at that stage. ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 2, key: 'offer', vi: 'Gói chào bán', en: 'Offer design', type: 'text',
      role: 'a Commercial Director and offer designer for the {sector} sector',
      task: `Based on the approved buyer analysis below (do not skip it), design what is sold and why it is worth buying. Commercial proposes the pricing logic; final economics belong to Finance — never present a price as decided. ${HANDOFF_RULE}`,
      calls: [{
        key: 'offer', vi: 'Giá trị & chào bán', en: 'Value & offer',
        maxTokens: 1000, temperature: 0.6, dependsOn: [],
        contextKeys: ['buyerMap', 'buyingJourney', 'artifact.product.value', 'artifact.marketing.demand', 'artifact.strategy.brief'],
        fields: [
          { key: 'valueProposition', vi: 'Tuyên bố giá trị', en: 'Value proposition', desc: 'For whom, which problem, which outcome, and why this beats their current alternative — max 2 sentences.' },
          { key: 'offerStructure', vi: 'Cấu trúc gói', en: 'Offer structure', desc: `What is included, the tiers or bundles, and any guarantee or risk reversal — max 5 lines. ${ONE_PER_LINE}` },
          { key: 'pricingLogic', vi: 'Logic giá', en: 'Pricing logic', desc: `How the price relates to the value and the alternatives, and the discount boundary — max 4 lines; any number is a stated assumption, never a decided price. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 3, key: 'journey', vi: 'Bán hàng & chăm sóc', en: 'Sales & success', type: 'text',
      role: 'a Head of Sales and Customer Success for the {sector} sector',
      task: 'Based on the approved buyers and offer below (do not skip them), define how the sale is made and how the customer is kept after it. No pressure tactics, no fake urgency or scarcity.',
      calls: [
        {
          key: 'sales', vi: 'Quy trình bán', en: 'Sales process',
          maxTokens: 900, temperature: 0.6, dependsOn: [], contextKeys: ['buyerMap', 'buyingJourney', 'valueProposition', 'offerStructure', 'artifact.marketing.demand'],
          fields: [
            { key: 'salesProcess', vi: 'Quy trình bán hàng', en: 'Sales process', desc: `The sales process as max 6 numbered steps, each with its owner and the signal that moves the buyer on. ${ONE_PER_LINE}` },
            { key: 'objectionMap', vi: 'Xử lý phản đối', en: 'Objection map', desc: `The top 3-5 real objections, 1 line each: "objection → the honest response". ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'success', vi: 'Chăm sóc & giữ chân', en: 'Success & retention',
          maxTokens: 800, temperature: 0.6, dependsOn: [], contextKeys: ['buyerMap', 'valueProposition', 'offerStructure'],
          fields: [
            { key: 'serviceCommitments', vi: 'Cam kết dịch vụ', en: 'Service commitments', desc: `What the customer is promised — delivery time, support response time, onboarding, returns — as max 5 measurable commitments Operations must be able to keep. ${ONE_PER_LINE}` },
            { key: 'retentionPlan', vi: 'Giữ chân khách', en: 'Retention plan', desc: `Onboarding, customer-success check-ins, repeat purchase and upsell/cross-sell moves — max 4 lines. ${ONE_PER_LINE}` },
          ],
        },
      ],
    },
  ],
};
