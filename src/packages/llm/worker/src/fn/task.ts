/**
 * A task = the caller's jobs sharing one `task` id + their artifacts (P3-1). Its plan, per-function state and stage are
 * derived here on every read — never stored (D7). Pure.
 */
import { FUNCTIONS, type FnKey, type Rec } from './types.ts';
import { resolveSpec } from './registry.ts';
import { current, type ArtifactRow } from './artifacts.ts';
import { normalizeRouting, planFunctions, type BizFn, type Plan, type Routing } from './routing.ts';

export interface GraphNode { fn: string; needs: string[]; uses: string[]; produces: string[] }
export interface TaskJob { id: string; fn: string; status: string; approved: boolean; created_at: string; fields?: Rec }
export type FnState = 'waiting' | 'runnable' | 'running' | 'review' | 'approved' | 'stale' | 'blocked';
export interface FnStatus { fn: string; state: FnState; jobId: string; missing: string[] }
export type Stage = 'secretary' | 'running' | 'stale' | 'blocked' | 'done';

/** The opening system step: one job frames the request and routes it — its approve writes `context` + `routing`. */
export const SECRETARY: FnKey = 'secretary';
/** The closing system step (§29–§31): planned by the routing (Plan.integrate), it reads every department's handoff. */
export const INTEGRATION: FnKey = 'integration';
export const MAX_TASK_JOBS = 24; // the secretary + 9 functions + integration + re-runs — bounds one task's AI spend (P3-20)

/** The dependency graph of a sector (§18): the secretary, integration + every function with a pipeline base spec there. */
export function graphOf(sector: string): GraphNode[] {
  return [SECRETARY, ...FUNCTIONS, INTEGRATION].flatMap(fn => {
    const spec = resolveSpec(sector, fn);
    return spec?.kind === 'pipeline'
      ? [{ fn, needs: spec.needs ?? [], uses: spec.uses ?? [], produces: (spec.produces ?? []).map(p => p.kind) }]
      : [];
  });
}

/** What a plan can run in this sector — a pipeline base spec exists and the sector offers it: departments + integration. */
export const availableOf = (sector: string): string[] =>
  [...FUNCTIONS, INTEGRATION].filter(fn => resolveSpec(sector, fn)?.kind === 'pipeline');

const latestOf = (jobs: TaskJob[], fn: string) =>
  jobs.filter(j => j.fn === fn).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

/**
 * Each planned function's state (P3-13, P3-14). It waits for its hard `needs` and for the `uses` whose producer is
 * planned, and may start once all of those are APPROVED. A need that nobody planned can produce blocks it — reported,
 * never faked. An approved function whose handoff awaits re-verification (or is missing) is stale.
 */
export function schedule(graph: GraphNode[], planned: string[], jobs: TaskJob[], rows: ArtifactRow[]): FnStatus[] {
  const producer = (kind: string) => graph.find(n => n.produces.includes(kind))?.fn;
  const isPlanned = (kind: string) => {
    const p = producer(kind);
    return !!p && planned.includes(p);
  };
  return planned.map((fn): FnStatus => {
    const node = graph.find(n => n.fn === fn);
    if (!node) return { fn, state: 'blocked', jobId: '', missing: [] };
    const wanted = [...node.needs, ...node.uses.filter(isPlanned)];
    const missing = wanted.filter(k => current(rows, k)?.status !== 'APPROVED');
    const latest = latestOf(jobs, fn);
    if (latest && !latest.approved) return { fn, state: latest.status === 'done' ? 'review' : 'running', jobId: latest.id, missing };
    if (latest) {
      const stale = node.produces.some(k => current(rows, k)?.status !== 'APPROVED');
      return { fn, state: stale ? 'stale' : 'approved', jobId: latest.id, missing };
    }
    const unmeetable = missing.filter(k => !isPlanned(k));
    if (unmeetable.length) return { fn, state: 'blocked', jobId: '', missing: unmeetable };
    return { fn, state: missing.length ? 'waiting' : 'runnable', jobId: '', missing };
  });
}

/** secretary → running → stale | blocked | done (P3-15). Only a job that runs, awaits review or may start is
 *  progress — `waiting` is not: with nothing moving, a waiter can only wait on a stale or blocked producer. So once
 *  nothing moves, any stale function makes the task `stale` (the boss re-runs or verifies it), and a task left with only
 *  waiting / blocked functions is `blocked` — never `running` forever. */
export function taskStage(fns: FnStatus[]): Stage {
  const settled = (fn: string) => ['approved', 'stale'].includes(fns.find(s => s.fn === fn)?.state ?? '');
  if (!settled(SECRETARY)) return 'secretary';
  if (fns.some(s => ['running', 'review', 'runnable'].includes(s.state))) return 'running';
  if (fns.some(s => s.state === 'stale')) return 'stale';
  if (fns.some(s => s.state === 'blocked' || s.state === 'waiting')) return 'blocked';
  return 'done';
}

/** What `/next` may open now (P3-14): while the secretary is unsettled, only the secretary itself — never a department
 *  from a plan that is about to change; else the runnable functions. */
function nextOf(stage: Stage, fns: FnStatus[]): string[] {
  const runnable = (fn: string) => fns.some(s => s.fn === fn && s.state === 'runnable');
  if (stage === 'secretary') return runnable(SECRETARY) ? [SECRETARY] : [];
  if (stage !== 'running') return [];
  return fns.filter(s => s.state === 'runnable').map(s => s.fn);
}

export const VERDICTS = ['APPROVE WITH CONDITIONS', 'APPROVE', 'HOLD', 'REJECT'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** The integration's call (§31) from its `decision` field — the longest phrase first, so "APPROVE WITH CONDITIONS" never
 *  reads as APPROVE. null when the text starts with none of them (the boss then reads the decision itself). */
export function verdictOf(text: unknown): Verdict | null {
  const t = String(text ?? '').trim().toUpperCase().replace(/[\s_]+/g, ' ');
  return VERDICTS.find(v => t.startsWith(v)) ?? null;
}

export interface TaskView {
  stage: Stage; routing: Routing | null; plan: Plan | null;
  preview: { routing: Routing; plan: Plan } | null;   // the secretary's finished routing, before its job is approved
  fns: FnStatus[]; next: string[];
  verdict: Verdict | null;                            // the live integrated decision's call, when there is one
}

/** Routing from the live `routing` artifact (re-parsed every read, P3-10), the plan it implies, per-function state, and
 *  what may start now. `preview` = the secretary's done-but-unapproved routing, so the chat can show the plan first.
 *  `core` = the sector's core departments — the same floor for the live routing and the preview. */
export function buildTaskView(p: { graph: GraphNode[]; available: string[]; jobs: TaskJob[]; rows: ArtifactRow[]; core?: readonly BizFn[] }): TaskView {
  const live = current(p.rows, 'routing');
  const routing = live ? normalizeRouting((live.data?.context ?? {}) as Rec, p.core) : null;
  const plan = routing ? planFunctions(routing, p.available) : null;
  const fns = schedule(p.graph, [SECRETARY, ...(plan?.run ?? []), ...(plan?.integrate ? [INTEGRATION] : [])], p.jobs, p.rows);
  const draft = latestOf(p.jobs, SECRETARY);
  const draftRouting = draft && !draft.approved && draft.status === 'done' ? normalizeRouting(draft.fields ?? {}, p.core) : null;
  const stage = taskStage(fns);
  return {
    stage, routing, plan,
    preview: draftRouting ? { routing: draftRouting, plan: planFunctions(draftRouting, p.available) } : null,
    fns, next: nextOf(stage, fns),
    verdict: verdictOf(current(p.rows, 'decision')?.data?.context?.decision),
  };
}
