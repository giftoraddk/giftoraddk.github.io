/** Function activation (spec §19, §37, §44): the secretary's routing answer → levels, lead, depth → which functions run. Pure. */
import { FUNCTIONS, type BusinessFn, type Rec } from './types.ts';

export type BizFn = BusinessFn;
export const LEVELS = ['REQUIRED', 'RELEVANT', 'CONDITIONAL', 'NOT_MATERIAL'] as const;
export type Level = (typeof LEVELS)[number];
export type Complexity = 'simple' | 'standard' | 'complex';
export interface Routing { levels: Record<BizFn, Level>; lead: BizFn; complexity: Complexity; rated: BizFn[] }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

// The key, the §6 display-name words, and the Vietnamese names a model may answer with — matched as whole words.
const FN_WORDS: Record<BizFn, string[]> = {
  strategy: ['strategy', 'governance', 'chien luoc'],
  product: ['product', 'innovation', 'san pham'],
  marketing: ['marketing', 'growth', 'tiep thi', 'tang truong'],
  commercial: ['commercial', 'sales', 'thuong mai', 'ban hang', 'kinh doanh'],
  operations: ['operations', 'operation', 'delivery', 'van hanh'],
  supply: ['supply', 'procurement', 'cung ung', 'mua hang'],
  quality: ['quality', 'chat luong'],
  finance: ['finance', 'people', 'tai chinh', 'nhan su'],
  technology: ['technology', 'tech', 'intelligence', 'cong nghe'],
};

/** The function a text names — the earliest mention wins ("marketing leads, product supports" → marketing). */
export function fnOf(text: string): BizFn | null {
  const t = ` ${fold(text).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  let best: { fn: BizFn; at: number } | null = null;
  for (const fn of FUNCTIONS) {
    for (const w of FN_WORDS[fn]) {
      const at = t.indexOf(` ${w} `);
      if (at !== -1 && (!best || at < best.at)) best = { fn, at };
    }
  }
  return best?.fn ?? null;
}

// Negative phrases first, so "not relevant" / "không liên quan" never read as RELEVANT.
const LEVEL_WORDS: [string, Level][] = [
  ['not material', 'NOT_MATERIAL'], ['notmaterial', 'NOT_MATERIAL'], ['not relevant', 'NOT_MATERIAL'], ['none', 'NOT_MATERIAL'],
  ['khong trong yeu', 'NOT_MATERIAL'], ['khong lien quan', 'NOT_MATERIAL'], ['khong can', 'NOT_MATERIAL'],
  ['conditional', 'CONDITIONAL'], ['co dieu kien', 'CONDITIONAL'], ['tuy dieu kien', 'CONDITIONAL'],
  ['required', 'REQUIRED'], ['bat buoc', 'REQUIRED'],
  ['relevant', 'RELEVANT'], ['lien quan', 'RELEVANT'],
];

/** The level a text starts with, or null. */
export function levelOf(text: string): Level | null {
  const t = `${fold(text).replace(/[^a-z]+/g, ' ').trim()} `;
  return LEVEL_WORDS.find(([w]) => t.startsWith(`${w} `))?.[1] ?? null;
}

const DEPTHS: [string, Complexity][] = [
  ['simple', 'simple'], ['don gian', 'simple'], ['standard', 'standard'], ['tieu chuan', 'standard'], ['trung binh', 'standard'],
  ['complex', 'complex'], ['phuc tap', 'complex'],
];

export function complexityOf(text: unknown): Complexity {
  const t = `${fold(String(text ?? '')).replace(/[^a-z]+/g, ' ').trim()} `;
  return DEPTHS.find(([w]) => t.startsWith(`${w} `))?.[1] ?? 'standard';
}

/** "product:REQUIRED|supply:NOT_MATERIAL…" — or one per line, "Supply - not material", "Sản phẩm: BẮT BUỘC" — → levels.
 *  Unknown functions / levels are ignored; the first rating of a function wins. */
export function parseActivation(text: unknown): Partial<Record<BizFn, Level>> {
  const out: Partial<Record<BizFn, Level>> = {};
  for (const item of String(text ?? '').split(/[|\n;,]+/)) {
    const m = item.match(/^(.*?)(?::|=|\s[-–—]\s)(.*)$/);
    if (!m) continue;
    const fn = fnOf(m[1]);
    const level = levelOf(m[2]);
    if (fn && level && !(fn in out)) out[fn] = level;
  }
  return out;
}

/** The routing step's fields → a complete routing: every function rated (unrated = NOT_MATERIAL), the lead forced REQUIRED —
 *  the named one, else the first REQUIRED, else the first RELEVANT, else product. `core` = the sector's core departments
 *  (SectorAdapter.core): one the routing left unrated or CONDITIONAL counts as RELEVANT — only an explicit NOT_MATERIAL
 *  (the routing judged it adds nothing to THIS task) or a higher rating stands. */
export function normalizeRouting(f: Rec, core: readonly BizFn[] = []): Routing {
  const parsed = parseActivation(f.activation);
  const levels = Object.fromEntries(FUNCTIONS.map(fn => [fn, parsed[fn] ?? 'NOT_MATERIAL'])) as Record<BizFn, Level>;
  for (const fn of core) if (parsed[fn] === undefined || parsed[fn] === 'CONDITIONAL') levels[fn] = 'RELEVANT';
  const lead = fnOf(String(f.lead ?? ''))
    ?? FUNCTIONS.find(fn => levels[fn] === 'REQUIRED')
    ?? FUNCTIONS.find(fn => levels[fn] === 'RELEVANT')
    ?? 'product';
  levels[lead] = 'REQUIRED';
  return { levels, lead, complexity: complexityOf(f.complexity), rated: FUNCTIONS.filter(fn => fn in parsed) };
}

/** Support functions each depth allows beside the lead (§44); every REQUIRED one runs regardless. */
export const SUPPORT_CAP: Record<Complexity, number> = { simple: 2, standard: 4, complex: Number.POSITIVE_INFINITY };
export type SkipReason = 'not_material' | 'conditional' | 'depth';
/** `integrate`: the Integration step closes the task (§29–§31) — after every planned department, see planFunctions. */
export interface Plan { run: BizFn[]; unavailable: BizFn[]; skipped: { fn: BizFn; level: Level; reason: SkipReason }[]; integrate: boolean }

/** §44: only a complex task ends in an integration — and only when there are at least 2 departments' results to integrate. */
export const INTEGRATE_DEPTHS: readonly Complexity[] = ['complex'];
const INTEGRATE_MIN_RUN = 2;

/**
 * Which functions a task runs (P3-11, P3-12): every REQUIRED one, RELEVANT ones up to the depth's cap in canonical
 * order, plus the quality review a standard task always gets unless quality is NOT_MATERIAL. CONDITIONAL and
 * NOT_MATERIAL never run on their own. A planned function with no base spec here yet is `unavailable` — reported.
 * `available` = what the sector can run: its departments, plus 'integration' when the sector offers that step.
 */
export function planFunctions(r: Routing, available: readonly string[]): Plan {
  const required = FUNCTIONS.filter(fn => r.levels[fn] === 'REQUIRED');
  const relevant = FUNCTIONS.filter(fn => r.levels[fn] === 'RELEVANT');
  const room = Math.max(0, SUPPORT_CAP[r.complexity] - (required.length - 1));
  const picked = new Set<BizFn>([...required, ...relevant.slice(0, room)]);
  if (r.complexity === 'standard' && r.levels.quality !== 'NOT_MATERIAL') picked.add('quality');
  const ordered = [r.lead, ...FUNCTIONS.filter(fn => fn !== r.lead && picked.has(fn))];
  const reason = (l: Level): SkipReason => (l === 'NOT_MATERIAL' ? 'not_material' : l === 'CONDITIONAL' ? 'conditional' : 'depth');
  const run = ordered.filter(fn => available.includes(fn));
  return {
    run,
    unavailable: ordered.filter(fn => !available.includes(fn)),
    skipped: FUNCTIONS.filter(fn => !picked.has(fn)).map(fn => ({ fn, level: r.levels[fn], reason: reason(r.levels[fn]) })),
    integrate: INTEGRATE_DEPTHS.includes(r.complexity) && run.length >= INTEGRATE_MIN_RUN && available.includes('integration'),
  };
}
