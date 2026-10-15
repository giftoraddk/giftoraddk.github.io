/** Shapes of a department's expertise (spec §6–§16). Base specs live in fn/base, sector patches in fn/sectors. */
export const FUNCTIONS = ['strategy', 'product', 'marketing', 'commercial', 'operations', 'supply', 'quality', 'finance', 'technology'] as const;
/** One of the 9 business departments (§6) — not a system step, not a chat. */
export type BusinessFn = (typeof FUNCTIONS)[number];
// secretary = the host of a sector's group chat AND the task's first step: it frames the request and routes it (P3-2).
export const SYSTEM_FNS = ['secretary', 'integration'] as const;
export const CHAT_FNS = ['consult'] as const;
export type FnKey = (typeof FUNCTIONS)[number] | (typeof SYSTEM_FNS)[number] | (typeof CHAT_FNS)[number];

/** The secretary + the integration step — named per sector, never listed as a department (P3-2). */
export const isSystemFn = (fn: string): boolean => (SYSTEM_FNS as readonly string[]).includes(fn);

export const LANGS: Record<string, string> = { vi: 'Vietnamese', en: 'English', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', fr: 'French' };

export type Rec = Record<string, any>;
export interface Label { vi: string; en: string }

// hidden: machine-read (e.g. the routing's activation string) — code-owned like html; the outline flags it and the
// client never shows it.
export interface FieldSpec { key: string; vi?: string; en?: string; desc?: string; max?: number; html?: boolean; hidden?: boolean }

export interface CallSpec {
  key: string; vi?: string; en?: string;
  role?: string; task?: string;               // override the step's persona for this call only
  maxTokens?: number; temperature?: number;
  contextKeys?: string[]; dependsOn?: string[];
  fields: FieldSpec[];
}

export interface StepSpec {
  id: number; key: string; vi?: string; en?: string;
  type: 'text' | 'image';
  role?: string; task?: string;
  calls?: CallSpec[];
  concept?: { contextKeys: string[] };        // image steps only
  // Code-owned (an override can't set it): each call of this step reads ≤ 3 passages of the caller's own knowledge in
  // this sector / department — retrieved per call, never stored in the job (Phase 6.3).
  knowledge?: boolean;
}

export interface OutputSpec { table: string; fields: string[]; status?: string }
/** §17 lists that a produced field's lines also fill — `context` always holds every produced field (P3-5). */
export type Section = 'decisions' | 'requirements' | 'assumptions' | 'constraints' | 'risks' | 'acceptance_criteria' | 'open_questions';
/** One handoff a function writes when its task job is approved — its kind is registered in fn/kinds.ts. */
export interface Produces { kind: string; dest: FnKey[]; objective: string; fields: string[]; sections?: Partial<Record<Section, string[]>> }

export interface FnSpec {
  fn: FnKey;
  kind: 'pipeline' | 'chat';
  title: Label;
  description?: Label;
  role?: string; principles?: string[];       // chat functions
  steps?: StepSpec[];
  output?: OutputSpec | null;                 // platform table the approved result goes to (owner '' only)
  inputs?: string[];                          // context keys the client may supply when creating a job
  needs?: string[];                           // handoff kinds that must be APPROVED before it runs inside a task (§18)
  uses?: string[];                            // handoff kinds it waits for only while their producer is in the plan (P3-13)
  produces?: Produces[];                      // handoffs written when its task job is approved (§17)
}

/**
 * The slots every base prompt may use (spec §34 sector adapter) — each sector fills all of them, so a base spec written
 * once reads naturally in every sector. A slot a sector forgot would reach the model as a literal "{name}"; the type
 * makes that a compile error instead.
 */
export interface SectorVars {
  sector: string;          // "e-commerce"
  domains: string;         // §36 domains, comma-separated — the secretary picks one
  customers: string;       // common customer types
  offering: string;        // what this sector sells — "physical product or gift set", "course or training program"…
  components: string;      // what one offering is made of — the Product department's design vocabulary
  qualityFocus: string;    // the quality dimensions that matter most here (§14.4)
  kpis: string;            // common KPIs (§34)
  regulations: string;     // the regulatory frame to check (§8.4D)
  supplyFocus: string;     // what Supply buys or contracts here (§13.2)
  useCases: string;        // §34 common_use_cases — examples for the secretary's use cases
  processes: string;       // §34 common_processes — what Operations maps a delivery from
  risks: string;           // §34 common_risks — what Strategy's risk map checks besides {regulations}
  techPatterns: string;    // §34 common_technology_patterns — Technology's usual starting point
  businessModels: string;  // §34 common_business_models — the models Strategy weighs
  consultScope: string;    // what visitors here usually ask the consult chat — the scope it answers
  consultEscalate: string; // what the consult never handles itself — it hands the visitor to a person
  guardrails: string;      // must-follow rules for EVERY department + the consult chat here ('' = none) — prompt.ts adds them
}

/** How one department works in a sector: the specialist it is there + what it looks at first. Sector code — an admin
 *  override can't change it (it isn't part of the spec mergeSpec builds). */
export interface Lens { role: string; focus: string }

/** Results a qualified person must sign off before they are approved (clinical, legal…): the Worker refuses an approve
 *  of these departments without a named sign-off, and records it on the job and its handoffs. */
export interface ExpertReview { who: Label; fns: BusinessFn[] }

export interface SectorAdapter {
  id: string;
  title: Label;                               // group title, e.g. AI-Ecommerce
  name: Label;                                // the sector itself, e.g. Thương mại điện tử
  icon: string;
  tints?: string[];
  // false = platform staff only (owner ''): a new sector's prompts need a domain expert's review before hubs may run
  // them (master plan, Risks). Enforced by the Worker (trial.ts modeOf — unreleased = staff, or trial use), not by the node tiers.
  released: boolean;
  vars: SectorVars;                           // prompt placeholders: {sector}, {domains}, {customers}…
  // Every department's specialist identity in this sector — all 9 required, so no department runs generic here.
  lenses: Record<BusinessFn, Lens>;
  // Departments that matter in almost every task of this sector (§37): the secretary's routing rates them at least
  // RELEVANT unless it explicitly calls them NOT_MATERIAL for the task at hand (routing.ts normalizeRouting).
  core: BusinessFn[];
  review: ExpertReview | null;                // null = no department here needs an outside sign-off
  functions: Partial<Record<FnKey, Rec | false>>; // patch over BASE[fn]; false = not offered here
}
