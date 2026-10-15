/** Job lifecycle helpers for routes.ts: the hub job budget (P2-15, P3-20) and what happens after an approve (P2-18). */
import { HttpError } from '../lib/http';
import { upsertKnow } from '../knowImport';
import type { Caller } from './owner';
import type { FnEnv } from './routes';
import { parseDivisionId } from './registry.ts';
import { knowFromApproved } from './know.ts';
import { HUB_JOBS_PER_DAY, sinceIso } from './access.ts';
import { now } from './util.ts';
import type { FnSpec, OutputSpec, Rec } from './types.ts';

/**
 * An approved result's knowledge (its owner's) from `fields` — at the approve, and again when the boss edits the
 * approved job later. In the background: it never fails the request (P2-18). `recordId` = the platform record its
 * approve wrote ('' for a hub — the job's own id then). A trial job's knowledge is always a draft (fn/trial.ts): kept,
 * never searchable until its owner publishes it.
 */
export function syncKnow(env: FnEnv, ctx: ExecutionContext, caller: Caller, job: Rec, out: OutputSpec, fields: Rec, recordId: string): void {
  const parsed = parseDivisionId(String(job.division));
  const platform = caller.owner === '';
  const known = knowFromApproved(out, fields, recordId || String(job.id), platform);
  const item = job.trial ? { ...known, status: 'draft' as const } : known;
  ctx.waitUntil(upsertKnow(env, caller.owner, [item], { keepIds: platform && !!recordId, sector: parsed?.sector ?? '', fn: parsed?.fn ?? '' })
    .then(() => undefined, err => console.error('[fn/approve] knowledge sync failed:', err)));
}

/** Hubs get a daily job budget; platform staff are trusted (their AI calls stay per-user rate limited). `adding` = how many
 *  jobs this request opens (a task's /next may open several at once — all of them must fit). */
export async function assertJobQuota(env: FnEnv, caller: Caller, adding = 1): Promise<void> {
  if (!caller.owner) return;
  // >= includes a job created at the exact cutoff instant — a rolling window must not undercount its own edge.
  const row = await env.LLM_DB
    .prepare("SELECT COUNT(*) AS n FROM talks WHERE owner = ? AND kind = 'job' AND created_at >= ?")
    .bind(caller.owner, sinceIso(Date.now())).first<{ n: number }>();
  if (Number(row?.n) + adding > HUB_JOBS_PER_DAY) throw new HttpError(429, `At most ${HUB_JOBS_PER_DAY} jobs a day — try again tomorrow`);
}

/**
 * After a job is approved: its result becomes knowledge of the caller's owner, in the background (never fails the
 * approve, P2-18), and createdPostId is stamped. `recordId` = the platform record written ('' for a hub). Handing work
 * on to the next department is the task scheduler's job (fn/tasks.ts, P3-14) — nothing waits on a product job.
 */
export async function afterApprove(env: FnEnv, ctx: ExecutionContext, caller: Caller, job: Rec, spec: FnSpec, recordId: string): Promise<void> {
  if (spec.output) syncKnow(env, ctx, caller, job, spec.output, job.fields ?? {}, recordId);

  await env.LLM_DB.prepare('UPDATE talks SET createdPostId = ?, updated_at = ? WHERE id = ?').bind(recordId, now(), job.id).run();
}
