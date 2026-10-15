/**
 * Trial mode — a signed-in account trying a sector on /system/<sector>, with or without a plan, released or not.
 * The page asks for it (header X-Fn-Trial: 1); that is only a request: the Worker decides the mode (modeOf) and counts
 * every use in `trials`, so calling the API by hand with one's own JWT buys nothing more than the page gives.
 *   per account, per sector, for good: 1 task (the Secretary + its departments), 1 standalone job per department,
 *   TRIAL_CHAT chat messages, TRIAL_LOG chat-log rows. A trial job runs each call once (no regenerate), a trial task has
 *   no rerun, and approved results become `draft` knowledge (search reads 'active' only).
 * The `trials` table is outside tablePolicy (no /v1/data access) and outside retention (never deleted).
 */
import { HttpError } from '../lib/http';
import { sectorOf } from './registry.ts';
import { FUNCTIONS, type BusinessFn } from './types.ts';
import { now } from './util.ts';
import type { Caller } from './owner';

export interface TrialEnv { LLM_DB: D1Database; FN_TRIAL_SECTORS?: string }

export type Mode = 'full' | 'trial';

export const TRIAL_HEADER = 'X-Fn-Trial';
export const TRIAL_CHAT = 30;
export const TRIAL_LOG = 90;
/** One trial task's job cap: its Secretary + every department + Integration — no reruns. */
export const TRIAL_TASK_JOBS = FUNCTIONS.length + 2;

const SLOT_LIMITS: Record<string, number> = { task: 1, chat: TRIAL_CHAT, log: TRIAL_LOG };
const limitOf = (slot: string) => (Object.hasOwn(SLOT_LIMITS, slot) ? SLOT_LIMITS[slot] : 1); // a department = its one standalone job

export const trialAsked = (request: Request): boolean => request.headers.get(TRIAL_HEADER) === '1';

/** Sectors trial mode is on for (wrangler var FN_TRIAL_SECTORS) — only known ids; blank = off everywhere. */
export function trialOpen(env: TrialEnv, sector: string): boolean {
  if (!sectorOf(sector)) return false;
  return String(env.FN_TRIAL_SECTORS ?? '').split(',').map(s => s.trim()).includes(sector);
}

/**
 * How `caller` may use `sector` — null = not at all (403). The platform ('') always; a Pro hub on a released sector;
 * otherwise trial, when the caller asked for it (resolveCaller) and the sector is open to trial.
 */
export function modeOf(env: TrialEnv, caller: Caller, sector: string): Mode | null {
  const adapter = sectorOf(sector);
  if (!adapter) return null;
  if (caller.owner === '' || (caller.pro && adapter.released)) return 'full';
  return caller.trial && trialOpen(env, sector) ? 'trial' : null;
}

/** modeOf, or 403 — the one message every route answers with. */
export function requireMode(env: TrialEnv, caller: Caller, sector: string): Mode {
  const mode = modeOf(env, caller, sector);
  if (!mode) throw new HttpError(403, 'This sector is not open yet');
  return mode;
}

const validSlot = (sector: string, slot: string) => Object.hasOwn(SLOT_LIMITS, slot)
  || ((FUNCTIONS as readonly string[]).includes(slot) && sectorOf(sector)?.functions[slot as BusinessFn] !== false);

const usedUp = (slot: string) => {
  if (slot === 'task') return 'Your trial task in this sector is used — choose a plan to keep going';
  if (slot === 'chat') return `Your ${TRIAL_CHAT} trial messages in this sector are used — choose a plan to keep going`;
  if (slot === 'log') return 'Your trial chat in this sector is full — choose a plan to keep going';
  return 'Your trial job for this department is used — choose a plan to keep going';
};

/**
 * Takes one use of `slot` — one statement, so two tabs racing can't both get the last use. Throws 429 when it is used
 * up. Pair a claim with refundTrial when the work it paid for then fails.
 */
export async function claimTrial(env: TrialEnv, userId: string, sector: string, slot: string): Promise<void> {
  if (!userId || !validSlot(sector, slot)) throw new HttpError(400, 'Unknown trial slot');
  const at = now();
  const res = await env.LLM_DB.prepare(
    `INSERT INTO trials (user_id, sector, slot, used, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, sector, slot) DO UPDATE SET used = used + 1, updated_at = excluded.updated_at WHERE used < ?`,
  ).bind(userId, sector, slot, at, at, limitOf(slot)).run();
  if (res.meta.changes !== 1) throw new HttpError(429, usedUp(slot));
}

/** Gives back a use claimTrial took — best-effort: a failed refund only costs the caller that one use. */
export async function refundTrial(env: TrialEnv, userId: string, sector: string, slot: string): Promise<void> {
  await env.LLM_DB.prepare('UPDATE trials SET used = MAX(used - 1, 0), updated_at = ? WHERE user_id = ? AND sector = ? AND slot = ?')
    .bind(now(), userId, sector, slot).run()
    .catch(err => console.warn('[fn/trial] refund failed:', err));
}

/** Runs `work` on one claimed use, giving it back if `work` throws. */
export async function withTrial<T>(env: TrialEnv, userId: string, sector: string, slot: string, work: () => Promise<T>): Promise<T> {
  await claimTrial(env, userId, sector, slot);
  try {
    return await work();
  } catch (err) {
    await refundTrial(env, userId, sector, slot);
    throw err;
  }
}

/** GET /v1/fn/trial?sector= — what this account has left in one sector (the page's "Trial · N left"). */
export async function trialUsage(env: TrialEnv, caller: Caller, sector: string) {
  const adapter = sectorOf(sector);
  if (!adapter) throw new HttpError(404, 'Unknown sector');
  const { results } = await env.LLM_DB.prepare('SELECT slot, used FROM trials WHERE user_id = ? AND sector = ?')
    .bind(caller.userId, sector).all<{ slot: string; used: number }>();
  const used = Object.fromEntries((results ?? []).map(r => [r.slot, Number(r.used) || 0]));
  const fns = FUNCTIONS.filter(fn => adapter.functions[fn] !== false);
  return {
    sector,
    mode: modeOf(env, caller, sector),
    limits: { task: 1, job: 1, chat: TRIAL_CHAT, log: TRIAL_LOG },
    used: { task: used.task ?? 0, chat: used.chat ?? 0, log: used.log ?? 0, jobs: Object.fromEntries(fns.map(fn => [fn, used[fn] ?? 0])) },
  };
}
