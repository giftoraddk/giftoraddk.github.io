/**
 * Handoff artifacts (spec §4.1, §17, §41, §42) — pure: plain lines, the §17 envelope, what a prompt gets, versioning.
 * IO lives in fn/tasks.ts; routes.ts only calls these helpers.
 */
import type { FnSpec, Produces, Rec, Section } from './types.ts';
import { readersOf, type Reader } from './kinds.ts';
import { plainText } from './parse.ts';

export const TAGS = ['FACT', 'INFERENCE', 'HYPOTHESIS'] as const;
export type Tag = (typeof TAGS)[number];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toUpperCase().replace(/\s+/g, ' ').trim();

// Evidence tags a model may still write out of habit (spec §4.1's old line tags) — English or translated to Vietnamese.
const TAG_WORDS = new Set(['FACT', 'SU THAT', 'INFERENCE', 'SUY LUAN', 'SUY DIEN', 'HYPOTHESIS', 'GIA THUYET', 'GIA DINH', 'ASSUMPTION']);
const LEAD = /^\s*(?:(?:[-*•+]|\d{1,2}[.)])(?=\s))?\s*/;
const BRACKET = /^[[(]\s*([^\])]{2,24}?)\s*[\])]\s*[:\-–—]?\s*/;
// Anywhere in a line only the unmistakable forms: "[FACT]", "[INFERENCE]: " — "(giả định)" mid-sentence is wording.
const INLINE = /\[\s*(?:FACT|INFERENCE|HYPOTHESIS|ASSUMPTION)\s*\]\s*[:\-–—]?[ \t]*/gi;
const COLON = /^(?:FACT|INFERENCE|HYPOTHESIS|ASSUMPTION)\s*:\s*/;

/**
 * The one name a prompt gives a piece of data: its key as an [UPPER_SNAKE] tag — financialContext → [FINANCIAL_CONTEXT],
 * artifact.strategy.econFrame → [STRATEGY_ECON_FRAME]. The key stays the single source (contextKeys, fields, inputs);
 * the bracket shape matches the evidence tags, so the model reads it as a label, not a word to reuse — and one it still
 * writes is dropped by the same pass (stripTags). Specs refer to their data by this label ("… in [FINANCIAL_CONTEXT]").
 * Not to be confused with a code a spec asks the answer to carry ("[WEAK]"): that is data, kept, and only hidden on screen
 * (client tool/codes.js).
 */
export function dataLabel(key: string): string {
  const name = key.startsWith(HANDOFF_PREFIX) ? key.slice(HANDOFF_PREFIX.length) : key;
  return `[${name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}]`;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The exact labels a call was given — only those are stripped, so a code the answer must carry ("[WEAK]") stays.
const labelRe = (labels: string[]) => (labels.length ? new RegExp(`(?:${labels.map(escapeRe).join('|')})[ \\t]*[:\\-–—]?[ \\t]*`, 'g') : null);

/** The text a line says, its bullet, evidence tags and the given data labels removed — "- [FACT] x", "(Giả thuyết) x",
 *  "FACT: x", "[FINANCIAL_CONTEXT] x" → "x". */
function untag(line: string, labels: RegExp | null = null): string {
  const lead = line.match(LEAD)?.[0] ?? '';
  let rest = line.slice(lead.length);
  const m = rest.match(BRACKET);
  if (m && TAG_WORDS.has(fold(m[1]))) rest = rest.slice(m[0].length);
  rest = rest.replace(COLON, '').replace(INLINE, '');
  return (labels ? rest.replace(labels, '') : rest).trim();
}

/** Every line plain: an evidence tag, or a data label of `labels` (dataLabel of the call's contextKeys), the model still
 *  wrote is dropped, bullets and line breaks kept. Applied to every generated text field (routes.ts runCall). */
export function stripTags(text: string, labels: string[] = []): string {
  const re = labelRe(labels);
  return String(text ?? '').split(/\r?\n/).map(line => {
    const lead = line.match(LEAD)?.[0] ?? '';
    const body = untag(line, re);
    return body ? `${lead}${body}` : (line.trim() ? '' : line);
  }).join('\n');
}

const lines = (text: string): string[] => String(text ?? '').split(/\r?\n/).map(line => untag(line)).filter(Boolean);

// ── The §17 envelope (P3-5) ────────────────────────────────────────────────────

export const ENVELOPE_FIELD_MAX = 3000; // one produced field inside an artifact
export const LIST_MAX = 12;             // items per §17 list
const ITEM_MAX = 500;

/** One §17 list item: its text + its evidence tag — HYPOTHESIS for every assumption, so one is never presented downstream
 *  as a fact (spec §4.1); null for any other line (the text says itself what it is). */
export type Item = { text: string; tag: Tag | null };

export type Envelope = {
  objective: string;
  context: Record<string, string>;
  decisions: Item[]; requirements: Item[]; assumptions: Item[]; constraints: Item[];
  dependencies: string[]; risks: Item[]; acceptance_criteria: Item[]; open_questions: Item[];
  created_by: string; // the user id who approved it — the artifacts table has no column for it (no new columns)
  expert_review: SignOff | null; // the qualified person who signed it off (sector review) — null when none was needed
};

/** A qualified person's sign-off on a result (SectorAdapter.review): who (as typed by the approver), as what, when. */
export interface SignOff { by: string; role: string; at: string }

const fieldText = (v: unknown) => plainText(String(v ?? '')).trim().slice(0, ENVELOPE_FIELD_MAX);

/** One produced handoff as a §17 envelope: every produced field under `context`, the lists its spec maps fields into
 *  (one line = one item; every assumption tagged HYPOTHESIS). `dependencies` = the "kind@vN" it was built on;
 *  `createdBy` = the approving user's id; `signOff` = the expert sign-off it was approved with. */
export function envelope(p: Produces, fields: Rec, dependencies: string[], createdBy = '', signOff: SignOff | null = null): Envelope {
  const context: Record<string, string> = {};
  for (const k of p.fields) {
    const t = fieldText(fields[k]);
    if (t) context[k] = t;
  }
  const from = (s: Section) => (p.sections?.[s] ?? []).map(k => context[k] ?? '');
  const list = (s: Section, tag: Tag | null = null): Item[] =>
    from(s).flatMap(lines).slice(0, LIST_MAX).map(text => ({ text: text.slice(0, ITEM_MAX), tag }));
  return {
    objective: p.objective,
    context,
    decisions: list('decisions'),
    requirements: list('requirements'),
    assumptions: list('assumptions', 'HYPOTHESIS'),
    constraints: list('constraints'),
    dependencies,
    risks: list('risks'),
    acceptance_criteria: list('acceptance_criteria'),
    open_questions: list('open_questions'),
    created_by: createdBy,
    expert_review: signOff,
  };
}

// ── Stored rows + what a prompt gets (P3-6, P3-17) ─────────────────────────────

// DRAFT / READY_FOR_REVIEW / BLOCKED are derived from the producing job and the schedule, never stored (P3-6).
export type ArtifactStatus = 'APPROVED' | 'REQUIRES_VERIFICATION' | 'SUPERSEDED';
export interface ArtifactRow {
  id: string; kind: string; version: number; status: ArtifactStatus; source_fn: string; dest_fns: string[];
  job_id: string; depends_on: string[]; supersedes: string; created_at: string; data?: Rec;
}

/** The live version of a kind in a task: the highest one not SUPERSEDED. */
export function current(rows: ArtifactRow[], kind: string): ArtifactRow | undefined {
  return rows.filter(r => r.kind === kind && r.status !== 'SUPERSEDED').sort((a, b) => b.version - a.version)[0];
}

export const HANDOFF_PREFIX = 'artifact.'; // prompt field of a handoff: `artifact.<kind>` — prompt.ts fences it apart
export const ARTIFACT_PROMPT_MAX = 3000;   // one handoff inside a prompt
export const HANDOFF_PROMPT_MAX = 7000;    // every handoff of one call together
const FIELD_PROMPT_MAX = 700;

const ELLIPSIS = '…';
const clip = (s: string, n: number) => (s.length <= n ? s : n <= 0 ? '' : `${s.slice(0, n - 1)}${ELLIPSIS}`);

/**
 * One handoff as compact prompt text, never longer than `max`: its objective, then EVERY produced field keeping its
 * head. The budget is shared per field (max-min fair: a short field's unused share passes on to the longer ones) —
 * a cap on the joined text would cut the tail fields (constraints, assumptions, gaps, success criteria) off whole.
 * Each field is also capped at FIELD_PROMPT_MAX; a cut field ends with "…". Fields are dropped from the end only when
 * the budget can't even hold their labels.
 */
export function compactArtifact(data: Rec | undefined, max = ARTIFACT_PROMPT_MAX): string {
  // A signed-off handoff says so — the reader must not treat its clinical / legal content as unreviewed AI output.
  const review = data?.expert_review?.role ? `Signed off by ${data.expert_review.role}: ${data.expert_review.by}` : '';
  const head = [data?.objective ? `Objective: ${data.objective}` : '', review].filter(Boolean).join('\n');
  if (head.length >= max) return clip(head, max);
  const fields = Object.entries((data?.context ?? {}) as Rec).map(([k, v]) => ({ k, v: String(v ?? '') })).filter(f => f.v);
  // Fixed cost of a field line: the "\n" before it (unless it is the very first line) + "[LABEL] ". 2 = the least value kept.
  const overhead = (i: number) => (head || i > 0 ? 1 : 0) + dataLabel(fields[i].k).length + 1;
  let room = max - head.length;
  let n = 0;
  for (let used = 0; n < fields.length && used + overhead(n) + 2 <= room; n++) used += overhead(n) + 2;
  const kept = fields.slice(0, n);
  room -= kept.reduce((s, _f, i) => s + overhead(i), 0);
  const give = new Array<number>(kept.length).fill(0);
  const order = kept.map((_f, i) => i).sort((a, b) => kept[a].v.length - kept[b].v.length);
  order.forEach((i, at) => {
    give[i] = Math.min(kept[i].v.length, FIELD_PROMPT_MAX, Math.floor(room / (order.length - at)));
    room -= give[i];
  });
  const lines = kept.map((f, i) => `${dataLabel(f.k)} ${clip(f.v, give[i])}`);
  const text = [...(head ? [head] : []), ...lines].join('\n');
  return clip(text, max); // already ≤ max — a guard, never a tail cut in practice
}

/** `artifact.<kind>` prompt fields for the kinds a spec reads (in order — hard needs first), from the task's live
 *  artifacts, all together capped at `total`. One awaiting re-verification is still given, flagged as such. */
export function artifactFields(rows: ArtifactRow[], kinds: string[], total = HANDOFF_PROMPT_MAX): Record<string, string> {
  const out: Record<string, string> = {};
  let left = total;
  for (const kind of [...new Set(kinds)]) {
    const a = current(rows, kind);
    if (!a || left <= 0) continue;
    const note = a.status === 'REQUIRES_VERIFICATION' ? '(Needs re-verification: a handoff it was built on has changed.)\n' : '';
    // The note (with its newline) comes out of the same budget — the handoff stays ≤ 3000 and the call ≤ 7000.
    const budget = Math.min(ARTIFACT_PROMPT_MAX, left) - note.length;
    if (budget <= 0) continue;
    const text = `${note}${compactArtifact(a.data, budget)}`;
    out[`${HANDOFF_PREFIX}${kind}`] = text;
    left -= text.length;
  }
  return out;
}

// ── Versioning (§42, P3-8, P3-9) ───────────────────────────────────────────────

/** Rows built — directly or through others — on any of `changed` that are still APPROVED: they now need re-verification. */
export function downstreamOf(rows: ArtifactRow[], changed: string[]): string[] {
  const hit = new Set<string>();
  let frontier = new Set(changed);
  while (frontier.size) {
    const next = new Set<string>();
    for (const r of rows) {
      if (r.status !== 'APPROVED' || hit.has(r.id) || changed.includes(r.id)) continue;
      if (r.depends_on.some(d => frontier.has(d))) {
        hit.add(r.id);
        next.add(r.id);
      }
    }
    frontier = next;
  }
  return [...hit];
}

export interface ApprovePlan { inserts: ArtifactRow[]; superseded: string[]; toVerify: string[] }

/**
 * What approving a task job of `spec` writes: one new version per produced kind, the previous live one SUPERSEDED,
 * everything built on a superseded row REQUIRES_VERIFICATION — never a silent overwrite. A new version is born
 * REQUIRES_VERIFICATION when an upstream it read changed while the job ran (newer than the job) or awaits verification.
 * A kind approved for the FIRST time in the task (e.g. a secretary re-run added product after marketing was approved without
 * it) also flags the live APPROVED artifacts of every function reading it (`graph`: needs/uses) — they were built without
 * it — and, transitively, what was built on those. `by` = the approving user's id, `signOff` = the expert sign-off —
 * both kept in each envelope.
 */
export function approveArtifacts(p: {
  spec: FnSpec; job: { id: string; fields: Rec; created_at: string }; rows: ArtifactRow[]; at: string; newId: () => string;
  graph?: readonly Reader[]; by?: string; signOff?: SignOff | null;
}): ApprovePlan {
  const upstream = [...new Set([...(p.spec.needs ?? []), ...(p.spec.uses ?? [])])]
    .map(k => current(p.rows, k))
    .filter((a): a is ArtifactRow => !!a);
  const shaky = upstream.some(a => a.status !== 'APPROVED' || a.created_at > p.job.created_at);
  const plan: ApprovePlan = { inserts: [], superseded: [], toVerify: [] };
  const firstTime: string[] = [];
  for (const prod of p.spec.produces ?? []) {
    const prev = current(p.rows, prod.kind);
    plan.inserts.push({
      id: p.newId(), kind: prod.kind,
      version: Math.max(0, ...p.rows.filter(r => r.kind === prod.kind).map(r => r.version)) + 1,
      status: shaky ? 'REQUIRES_VERIFICATION' : 'APPROVED',
      source_fn: p.spec.fn, dest_fns: [...prod.dest], job_id: p.job.id,
      depends_on: upstream.map(a => a.id), supersedes: prev?.id ?? '', created_at: p.at,
      data: envelope(prod, p.job.fields, upstream.map(a => `${a.kind}@v${a.version}`), p.by ?? '', p.signOff ?? null),
    });
    if (prev) plan.superseded.push(prev.id);
    if (!p.rows.some(r => r.kind === prod.kind)) firstTime.push(prod.kind);
  }
  const readers = new Set(firstTime.flatMap(k => readersOf(p.graph ?? [], k)).filter(fn => fn !== p.spec.fn));
  const builtWithout = p.rows.filter(r => r.status === 'APPROVED' && readers.has(r.source_fn)).map(r => r.id);
  plan.toVerify = [...new Set([...downstreamOf(p.rows, plan.superseded), ...builtWithout, ...downstreamOf(p.rows, builtWithout)])];
  return plan;
}

/** "Still valid": an artifact awaiting re-verification becomes APPROVED again, now recorded against the live upstream
 *  versions of the kinds it was built on — plus `reads` (the kinds its producer needs/uses) that are live now, so one
 *  flagged for a first-time upstream records it — refused while any of those is not APPROVED itself. */
export function verifyArtifact(rows: ArtifactRow[], id: string, reads: string[] = []): { depends_on: string[]; dependencies: string[] } | { error: string } {
  const a = rows.find(r => r.id === id);
  if (!a || a.status !== 'REQUIRES_VERIFICATION') return { error: 'Nothing to verify' };
  const built = a.depends_on.map(d => rows.find(r => r.id === d)?.kind).filter((k): k is string => !!k);
  const kinds = [...new Set([...built, ...reads.filter(k => k !== a.kind && current(rows, k))])];
  const live = kinds.map(k => current(rows, k));
  if (live.some(x => !x || x.status !== 'APPROVED')) return { error: 'Verify or re-run the upstream handoffs first' };
  return { depends_on: live.map(x => x!.id), dependencies: live.map(x => `${x!.kind}@v${x!.version}`) };
}
