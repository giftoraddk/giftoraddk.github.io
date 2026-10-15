import type { SectorAdapter } from '../types.ts';

/** Real Estate & Property (spec §33 Tier 1). Product = a project, unit or listing; the sale is long and legal-heavy. */
export const REALESTATE: SectorAdapter = {
  id: 'realestate',
  title: { vi: 'AI-Real Estate', en: 'AI-Real Estate' },
  name: { vi: 'Bất động sản', en: 'Real Estate & Property' },
  icon: 'ri:building-2-line',
  tints: ['secondary', 'primary'],
  released: false,
  vars: {
    sector: 'real estate & property',
    domains: 'residential sales, rental and leasing, commercial property, property development, brokerage, property management',
    customers: 'home buyers, property investors, tenants, landlords, businesses looking for office or retail space',
    offering: 'property project, unit, listing or property service',
    components: 'unit types and areas, layout, amenities, location advantages, legal status, price and payment schedule',
    qualityFocus: 'accuracy of listing information, verification of legal documents, construction and handover quality, response time to clients',
    kpis: 'leads per listing, viewing-to-deal conversion, days on market, absorption rate, commission per deal, client satisfaction',
    regulations: 'land and housing law, title and construction permits, brokerage licensing, anti-money-laundering checks, truthful advertising',
    supplyFocus: 'contractors and fit-out materials, legal and notary services, listing platforms, photography and staging services',
    useCases: 'a family buying its first home, an investor buying to rent out, a tenant looking for an apartment, a business looking for office or retail space, an owner selling or leasing a property',
    processes: 'listing intake and verification, lead qualification, viewings, negotiation and deposit, legal checks and contract signing, the payment schedule, handover and after-sales or property management',
    risks: 'an unclear title or missing permits, project delays, mis-stated area or amenities, buyer financing falling through, price corrections, fraud and money laundering, disputes at handover',
    techPatterns: 'listing portals and the company website, a CRM for leads and deals, virtual tours and 3D floor plans, e-contracts and payment tracking, property-management software',
    businessModels: 'brokerage commission, project sales agency, developer margin on units, rental and property-management fees, leasing commercial space',
    consultScope: 'projects and listings, unit types and areas, prices and payment schedules, location and amenities, how viewings and deposits work, which legal documents a property has',
    consultEscalate: 'a legal judgement on a title or a contract, negotiating a price or a discount, an existing deposit, payment or handover dispute, any request for investment-return advice',
    guardrails: 'Never promise guaranteed returns, price growth or rental yield; always flag the legal status (title, permits, ownership term) as something to verify; never overstate area, distance or amenities.',
  },
  lenses: {
    strategy: { role: 'a real estate investment and project strategist', focus: 'market and location fundamentals, the legal status of the land or project, and the downside of each option' },
    product: { role: 'a real estate product developer', focus: 'the unit mix, layouts and amenities, and the legal status each unit can be sold under' },
    marketing: { role: 'a property marketer who follows truthful-advertising rules', focus: 'buyers\' or tenants\' motives, accurate listings (area, distance, legal status), and lead generation' },
    commercial: { role: 'a brokerage and property-sales lead', focus: 'lead qualification, viewings through to deposit, payment schedules and the sales policy, and after-sales care' },
    operations: { role: 'a transaction and property-operations manager', focus: 'the path from deposit to contract to handover, document checklists, and building management after handover' },
    supply: { role: 'a contractor and service-partner manager', focus: 'contractors and fit-out materials, notary and legal services, and listing and photography partners' },
    quality: { role: 'a legal-verification and handover-quality lead', focus: 'verifying the title, permits and ownership term, the accuracy of every listing fact, and construction and handover quality' },
    finance: { role: 'a real estate finance lead', focus: 'project cash flow, payment schedules and buyer financing, commissions, and the sensitivity to price changes' },
    technology: { role: 'a property-technology lead', focus: 'the lead CRM, listing portals, virtual tours, and secure handling of buyers\' documents' },
  },
  core: ['strategy', 'quality', 'finance'],
  // Legal status, sales terms and listing claims are signed off by a property lawyer before they are approved (routes.ts
  // approve refuses otherwise) — a wrong title or a misleading listing is this sector's costliest mistake.
  review: {
    who: { vi: 'luật sư hoặc chuyên viên pháp lý bất động sản', en: 'a property lawyer or real estate legal specialist' },
    fns: ['strategy', 'marketing', 'commercial', 'quality'],
  },
  functions: {
    product: { steps: [{ key: 'concept', role: 'a Real Estate Product Developer and Project Planner' }] },
    marketing: { output: { table: 'posts', fields: ['title', 'description', 'content', 'pics', 'tags'], status: 'draft' } },
    consult: { role: 'a knowledgeable, honest property advisor for a {sector} business' },
  },
};
