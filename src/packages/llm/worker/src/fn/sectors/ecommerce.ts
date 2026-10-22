import type { SectorAdapter } from '../types.ts';

/** E-commerce (spec §34's example adapter). Its product department keeps the tuned physical / gift-set wording the base
 *  spec had before it became sector-neutral (Phase 5.2) — patched here by step / call / field key (mergeSpec). */
export const ECOMMERCE: SectorAdapter = {
  id: 'ecommerce',
  title: { vi: 'AI-Ecommerce', en: 'AI-Ecommerce' },
  name: { vi: 'Thương mại điện tử', en: 'E-commerce' },
  icon: 'ri:shopping-bag-3-line',
  tints: ['primary', 'secondary'],
  released: true,
  vars: {
    sector: 'e-commerce',
    domains: 'D2C, marketplace, retail e-commerce, social commerce, B2B e-commerce, subscription commerce',
    customers: 'online shoppers, gift buyers, repeat customers, small business buyers (B2B), marketplace shoppers',
    offering: 'physical product or gift set',
    components: 'the physical items with quantities, packaging, inserts and branding placement',
    qualityFocus: 'product defects, packaging damage, accuracy of the listing versus what arrives, delivery time, return rate',
    kpis: 'conversion rate, AOV, CAC, repeat purchase rate, return rate, fulfilment time, gross margin',
    regulations: 'consumer protection and return rights, product labelling and origin, e-commerce and personal-data rules, tax invoices',
    supplyFocus: 'goods, packaging materials, printing, warehousing and last-mile delivery partners',
    useCases: 'gifting for an occasion, restocking an everyday item, comparing options before buying, buying for a team or client (B2B), subscribing to a refill',
    processes: 'listing and catalogue management, order → pick → pack → ship, returns and refunds, customer-service tickets, promotions and flash sales',
    risks: 'stock-outs and overstock, delivery delays or damage, return fraud, platform fee or policy changes, counterfeit or IP claims, payment fraud',
    techPatterns: 'a storefront or marketplace seller centre, order and inventory management, a payment gateway, shipping integrations, CRM and email automation, analytics',
    businessModels: 'D2C margin on goods, marketplace reselling, bundles and gift sets, subscription refills, B2B corporate gifting, dropshipping',
    consultScope: 'products and what each includes, prices, stock, shipping times and fees, returns and warranty, choosing a gift',
    consultEscalate: 'a problem with an existing order or payment, a damaged or missing delivery, a refund dispute, a bulk or corporate quote',
    guardrails: 'Never invent certifications, origin claims, reviews or sales figures; never use fake urgency or fake scarcity.',
  },
  lenses: {
    strategy: { role: 'an e-commerce strategist who weighs channel mix and unit margins', focus: 'which channel (own store, marketplace or social) wins this, and whether the margin survives platform fees, shipping and returns' },
    product: { role: 'a merchandiser and product developer', focus: 'what the shopper actually receives in the box, how it photographs, and how it survives shipping' },
    marketing: { role: 'a performance and content marketer for online stores', focus: 'search and social intent, the product page that converts, and seasonal or gifting moments' },
    commercial: { role: 'an online sales and customer-experience lead', focus: 'pricing, bundles and promotions, checkout friction, and the post-purchase care that brings repeat orders' },
    operations: { role: 'a fulfilment and order-operations manager', focus: 'the order-to-delivery flow, peak-day capacity, and the returns process' },
    supply: { role: 'a sourcing and inventory planner', focus: 'supplier lead times and MOQs, stock per SKU, packaging, and the last-mile delivery partner' },
    quality: { role: 'a product QC and customer-experience quality lead', focus: 'defects and damage caught before dispatch, listing accuracy versus what arrives, and the reasons behind returns' },
    finance: { role: 'an e-commerce finance lead', focus: 'contribution margin per order after platform fees, shipping, returns and ad spend, and the cash tied up in stock' },
    technology: { role: 'an e-commerce systems lead', focus: 'the storefront, order and inventory sync, payment and shipping integrations, and the data that tracks the funnel' },
  },
  core: ['product', 'marketing'],
  review: null,
  functions: {
    product: {
      steps: [
        {
          key: 'concept',
          role: 'a Senior Product Manager and Industrial/Packaging Designer specializing in physical product and gift-set composition',
          task: 'Based on the customer/problem analysis provided as context below (do not skip it), answer the question: what does this product ACTUALLY look like, and what is it physically made of? Do NOT write a vague marketing idea — define a CONCRETE "Product Concept V0": what it is, who it is for, an estimated budget, and its exact physical component list. Then specify each of those components further.',
          calls: [
            { key: 'productConcept', fields: [{ key: 'productConcept', desc: 'A "Product Concept V0" write-up in this exact shape: (1) ONE opening sentence naming the concept + target recipient/use-case + an estimated budget RANGE in the customer\'s local currency, a plausible range for this product tier (e.g. "800,000-1,200,000 VND per box"); (2) a blank line, then a short section header meaning "Expected composition"; (3) a bullet list (each line starts with "- ") of the EXACT physical components with quantities (e.g. "01 premium rigid box"), then 1-2 bullets for logo/branding placement, then a final bullet noting 1-2 components may be swapped depending on budget. 6-10 bullets total — grounded in the context below, no generic filler. IMPORTANT: insert a REAL newline character (JSON escape "\\n") between the opening sentence and the header, between the header and the first bullet, and between EVERY bullet — e.g. "...per box.\\n\\nExpected composition:\\n- 01 premium box...\\n- 01 insulated bottle...". NEVER put two bullets or the header on the same line separated only by a space.' }] },
            { key: 'componentSpecs', fields: [{ key: 'componentSpecs', desc: 'For EACH physical component listed in productConcept above (skip logo/branding bullets and the budget-swap note), write one short block specifying its concrete attributes — choose whichever apply to that component\'s type: a box/case -> size, material, color, opening mechanism, logo method; a bottle/container -> capacity, material, color, logo method, packaging; a printed item (notebook/card) -> size, page count/cover, logo method; adapt freely for anything else. Format: the component\'s name on its own line, then each attribute as "label: value" on the next lines, with a blank line separating each component. IMPORTANT: insert a REAL newline character (JSON escape "\\n") between the name and each attribute line, between each attribute, and between components (double "\\n\\n") — e.g. "Insulated bottle\\nCapacity: 500ml\\nMaterial: stainless steel\\n\\nNotebook\\n...". NEVER put the name and its attributes, or two attributes, on the same line.' }] },
          ],
        },
        {
          key: 'development',
          calls: [
            { key: 'content', fields: [{ key: 'content', desc: 'Full product content as valid HTML (use <h2>/<h3>/<p>/<ul>/<li> tags). Include: an opening paragraph on the value/outcome, a section describing what the product physically includes (grounded in the approved component list/specs), and a closing <h2> section heading (meaning "Production Process & Quality Control", written in the OUTPUT_LANGUAGE — never hardcode it in another language) summarizing the production process and the top quality checks before handover. About 300-500 words.' }] },
            { key: 'tags', fields: [{ key: 'tags', desc: 'EXACTLY 3-6 final prioritized keywords chosen per the strategy above (mix of primary + secondary + long-tail + problem/solution + commercial intent, each genuinely SEO-relevant — not filler words, not a plain copy of the title, no questions, no comparison words like vs/alternative/best/review). Format: tag1|tag2|tag3 — separate tags ONLY with a single | character, never with commas or any other punctuation. Correct: gift box|personalized|handmade. Wrong: gift box, personalized, handmade. No quotes, no hashtags, no leading/trailing |.' }] },
          ],
        },
      ],
    },
    // The platform's shop data (ALL_DB products / invoices) is e-commerce's alone: only this sector's jobs take it as input
    // (client service/talk.js _inputsFor sends only what the outline declares; the Worker keeps only declared keys).
    marketing: {
      inputs: ['productContext', 'tags'],
      output: { table: 'posts', fields: ['title', 'description', 'content', 'pics', 'tags'], status: 'draft' },
    },
    finance: {
      inputs: ['financialContext'],
      output: { table: 'finance_reports', fields: ['conclusion', 'analysis', 'impact', 'risk', 'recommendation', 'decision'], status: 'active' },
    },
    consult: {},
  },
};
