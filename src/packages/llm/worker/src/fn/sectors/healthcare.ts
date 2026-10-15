import type { SectorAdapter } from '../types.ts';

/**
 * Healthcare (spec §33 Tier 1, §36). The departments plan the BUSINESS of care — never clinical care itself: the
 * guardrails keep diagnoses, treatments and dosages out of every department and the consult chat.
 */
export const HEALTHCARE: SectorAdapter = {
  id: 'healthcare',
  title: { vi: 'AI-Healthcare', en: 'AI-Healthcare' },
  name: { vi: 'Y tế & Sức khoẻ', en: 'Healthcare' },
  icon: 'ri:heart-pulse-line',
  tints: ['success', 'info'],
  released: false,
  vars: {
    sector: 'healthcare',
    domains: 'hospital, clinic, dental, telemedicine, diagnostics, pharmacy, wellness',
    customers: 'patients, caregivers and family members, corporate health buyers, insurers, referring doctors',
    offering: 'healthcare service, care package or health product',
    components: 'the service steps and patient touchpoints, the clinical and support roles involved, equipment and facilities, duration, and the safety check around each step',
    qualityFocus: 'patient safety, clinical governance, infection control, privacy of health data, waiting time, patient experience',
    kpis: 'appointment fill rate, waiting time, no-show rate, patient satisfaction, complaint or readmission rate, revenue per visit',
    regulations: 'medical practice and facility licensing, health-data privacy (HIPAA-like rules), medical advertising rules, drug and device regulations',
    supplyFocus: 'medical consumables, medicines, equipment and its maintenance, laboratory partners and clinical staff contracts',
    useCases: 'booking a check-up or a specialist visit, a corporate health-screening package, a follow-up or chronic-care programme, a remote (telemedicine) consultation, ordering lab tests',
    processes: 'appointment booking and reminders, registration and insurance checks, the consultation flow, lab or imaging orders and results, billing and insurance claims, follow-up care',
    risks: 'patient-safety incidents, liability for clinical errors, health-data breaches, infection outbreaks, licensing or advertising violations, clinician shortages, rejected insurance claims',
    techPatterns: 'a HIS / EMR (electronic medical records), an appointment and queue system, telemedicine, a lab information system, insurance claims and billing, a patient app with reminders',
    businessModels: 'a fee per visit or service, health-check packages, corporate health contracts, insurance-billed services, membership or chronic-care programmes, telemedicine subscriptions',
    consultScope: 'the services and packages offered, doctors\' schedules, prices, booking and how to prepare for a visit, insurance accepted, opening hours and location',
    consultEscalate: 'any symptom, diagnosis, medication or test-result question (refer to a doctor — and anything urgent to emergency services), a complaint about care, anything involving a patient\'s records',
    guardrails: 'This is business planning, not medical advice: never write a diagnosis, treatment, prescription or dosage, and mark any clinical content as requiring review by a licensed professional; for symptoms, point the person to a qualified professional, and for anything urgent, to emergency services; treat every piece of health data as sensitive; no guaranteed outcomes and no before/after promises.',
  },
  lenses: {
    strategy: { role: 'a healthcare business strategist working with the medical director', focus: 'which services and patients to serve, the licensing and clinical scope, and the patient-safety and reputational risk of each option' },
    product: { role: 'a healthcare service designer working with licensed clinical leads', focus: 'the patient journey and service steps, which clinician does what, and the safety check at each step' },
    marketing: { role: 'a healthcare marketer who follows medical-advertising rules', focus: 'patients\' concerns and trust signals, truthful and compliant claims, and never promising an outcome' },
    commercial: { role: 'a patient-access and partnerships lead', focus: 'booking and the patient journey, insurance and corporate health contracts, and the follow-up that keeps patients in care' },
    operations: { role: 'a clinic operations manager', focus: 'patient flow and waiting time, clinician rosters, room and equipment capacity, and infection-control routines' },
    supply: { role: 'a medical supplies and partner manager', focus: 'medicines and consumables, equipment maintenance, lab partners, and clinical staff contracts' },
    quality: { role: 'a patient-safety and clinical-governance lead', focus: 'patient safety, infection control, clinical protocols signed off by licensed staff, and the privacy of health data' },
    finance: { role: 'a healthcare finance lead', focus: 'the price per service, insurance reimbursement and rejected claims, clinician cost, and the revenue per visit' },
    technology: { role: 'a health-information-systems lead', focus: 'the EMR / HIS, booking and telemedicine, and protecting patients\' health data' },
  },
  core: ['strategy', 'operations', 'quality'],
  // Anything clinical — the service design, its marketing claims, the care flow, the safety protocols — is signed off by a
  // licensed clinician before it is approved (routes.ts approve refuses otherwise).
  review: {
    who: { vi: 'người có chứng chỉ hành nghề y (bác sĩ hoặc trưởng chuyên môn)', en: 'a licensed clinician (a doctor or the clinical lead)' },
    fns: ['product', 'marketing', 'operations', 'quality'],
  },
  functions: {
    product: { steps: [{ key: 'concept', role: 'a Healthcare Service Designer working alongside licensed clinical leads' }] },
    marketing: { output: { table: 'posts', fields: ['title', 'description', 'content', 'pics', 'tags'], status: 'draft' } },
    consult: { role: 'a caring, honest patient-care coordinator for a {sector} provider — not a clinician' },
  },
};
