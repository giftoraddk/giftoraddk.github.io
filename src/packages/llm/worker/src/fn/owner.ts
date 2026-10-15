import { requireAuth } from '../lib/auth';
import { HttpError, isFirstParty } from '../lib/http';
import { hasAccess, isAdminCaller, parseRoles } from '../lib/roles';
import { findCallerProfile } from '../lib/profile';
import type { DataEnv } from '../data';
import { freshHub, hubActive, syncedHub } from '../hubs';
import { planGrants } from '../../../../purchase/tool/plans.js';
import { canRunPlatformJobs, embedHostOk, embedOwnerOk, hubDomains, isLocalHost, originHost, siteOfOwner } from './access.ts';
import { trialAsked } from './trial.ts';

export interface Caller {
  userId: string;
  owner: string;      // '' = platform (admin / talks staff with a write grant); else the caller's own hub id
  isAdmin: boolean;
  bearer: string;     // forwarded to auth when an approved result is written to a platform table
  pro: boolean;       // a hub whose plan grants the departments (or the platform) — full use of every released sector
  trial: boolean;     // asked for trial mode (X-Fn-Trial) with an active profile — fn/trial.ts modeOf decides per sector
}

/**
 * Who is calling and whose data they act on — decided from the JWT, never from the request body. Every route behind it
 * is the Secretary (svc-talk) or a department (svc-fn), so a hub needs a plan that grants 'departments' (Pro —
 * purchase/tool/plans.js `grants`); Starter is svc-aide only (/v1/fn/aide stays outside this gate) → 402.
 * Asking for trial mode (fn/trial.ts) lets any active account in as its own owner instead of the 402 — every route
 * then gates and counts through modeOf / claimTrial. Without the header nothing here changes.
 */
export async function resolveCaller(request: Request, env: DataEnv & { AUTH_URL?: string }): Promise<Caller> {
  const verified = await requireAuth(request, env.SUPABASE_URL);
  const bearer = request.headers.get('Authorization') ?? '';
  const profile = await findCallerProfile(env, verified.userId);
  const admin = isAdminCaller(profile);
  const active = profile?.status === 'active';
  const roles = active ? parseRoles(profile).roles : [];
  // Running platform departments writes platform tables — a talks.VIEW / talks.read / ~own grant only looks (P2-14).
  if (admin || canRunPlatformJobs(roles)) return { userId: verified.userId, owner: '', isAdmin: admin, bearer, pro: true, trial: false };
  const trial = active && trialAsked(request);
  let hub = await env.LLM_DB.prepare('SELECT * FROM hubs WHERE id = ? AND deleted_at IS NULL').bind(verified.userId).first<Record<string, any>>();
  if (hubActive(hub) && !departmentsOk(hub)) hub = await freshHub(request, env, hub); // just upgraded to Pro?
  if (hubActive(hub) && departmentsOk(hub)) return { userId: verified.userId, owner: verified.userId, isAdmin: false, bearer, pro: true, trial };
  // Own data only (owner = the account = its hub id once it buys) — what it may do is fn/trial.ts's call.
  if (trial) return { userId: verified.userId, owner: verified.userId, isAdmin: false, bearer, pro: false, trial };
  if (hasAccess(roles, 'talks')) throw new HttpError(403, 'Read-only talks access cannot run departments');
  if (hubActive(hub)) throw new HttpError(402, 'The Secretary and the departments need the Pro plan — upgrade to use them');
  throw new HttpError(402, 'An active plan is required');
}

// An admin hub (no plan bought) counts as every grant — the same rule hubActive() applies to billing.
const departmentsOk = (hub: Record<string, any> | null) => hub?.plan_id === 'admin' || planGrants(hub?.plan_id, 'departments');

/** Platform staff (admin, or a talks grant that can write everything) — the same rule resolveCaller uses for owner ''.
 *  '' (a guest) or a failed profile lookup is never staff. */
export async function isPlatformStaff(env: DataEnv, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const profile = await findCallerProfile(env, userId);
    const roles = profile?.status === 'active' ? parseRoles(profile).roles : [];
    return isAdminCaller(profile) || canRunPlatformJobs(roles);
  } catch {
    return false;
  }
}

/** A signed-in account in good standing (profile 'active' — not banned / suspended / pending): who trial mode is for
 *  (fn/trial.ts) on a public route. '' (a guest) or a failed profile lookup never is. */
export async function isActiveAccount(env: DataEnv, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    return (await findCallerProfile(env, userId))?.status === 'active';
  } catch {
    return false;
  }
}

/** Why a public call may not read a hub — the client's widget hides itself on any of these (svc-aide). */
export type OwnerDenied = 'hub_unknown' | 'hub_expired' | 'hub_disabled' | 'hub_domain';
const DENIED_MESSAGE: Record<OwnerDenied, string> = {
  hub_unknown: 'Unknown knowledge owner',
  hub_expired: 'The plan of this assistant has lapsed — renew it to switch the assistant back on',
  hub_disabled: 'Embedding is switched off for this assistant',
  hub_domain: 'This site is not allowed to run this assistant — add it to the sites of the hub',
};

/** 403 a public route answers when ownerAccess() refuses — `code` lets the widget tell the reasons apart. */
export const deniedResponse = (code: OwnerDenied) =>
  new Response(JSON.stringify({ message: DENIED_MESSAGE[code], code }), { status: 403, headers: { 'Content-Type': 'application/json' } });

type OwnerEnv = Pick<DataEnv, 'LLM_DB' | 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'> & { AUTH_URL?: string; BILLING_SERVICE_KEY?: string; ALLOWED_ORIGIN?: string };

/**
 * Whether a public call (/v1/search, /v1/fn/aide, /v1/fn/sectors, GET /v1/data/know|rel — the embedded widget) may READ
 * `owner`'s data: null = yes, else why not. The platform ('') only on its own sites (ALLOWED_ORIGIN), one platform site's
 * own ('@<host>', fn/access.ts siteOfOwner) only on that site; a hub only while active (billing re-read without the
 * owner — hubs.ts syncedHub), embedding is on (meta.embed) and the page's Origin is one of its sites (meta.domains,
 * fn/access.ts embedHostOk). The hub itself / an admin (JWT) always may — they manage or test it.
 * `callerId`: the caller's already-verified JWT subject (from the SAME request) to skip verifying it twice — '' means
 * "verified, but no session" (guest); leave undefined to have this function verify the JWT itself.
 */
export async function ownerAccess(request: Request, env: OwnerEnv, owner: string, callerId?: string, ctx?: ExecutionContext): Promise<OwnerDenied | null> {
  // The platform's knowledge answers only on the platform's own sites (ALLOWED_ORIGIN, local dev): a tag without an
  // owner copied anywhere else would run a free assistant on this worker's AI — customers embed with their owner.
  const site = siteOfOwner(owner);
  const denied = !owner || site
    ? (platformSiteOk(request.headers.get('Origin'), env.ALLOWED_ORIGIN ?? '', site) ? null : 'hub_domain')
    : await hubDenied(request, env, owner, ctx);
  if (!denied) return null;
  return (await isSelfOrAdmin(request, env, owner, callerId)) ? null : denied;
}

/** A page of the platform's own sites — and, for one site's own knowledge ('@<host>'), that very site (or local dev). */
function platformSiteOk(origin: string | null, allowed: string, site: string | null): boolean {
  if (!isFirstParty(origin, allowed)) return false;
  const host = originHost(origin);
  return !site || isLocalHost(host) || host === site;
}

async function hubDenied(request: Request, env: OwnerEnv, owner: string, ctx?: ExecutionContext): Promise<OwnerDenied | null> {
  const row = await env.LLM_DB.prepare('SELECT * FROM hubs WHERE id = ? AND deleted_at IS NULL').bind(owner).first<Record<string, any>>();
  if (!row) return 'hub_unknown';
  const hub = await syncedHub(env, row, ctx);
  if (!hubActive(hub)) return 'hub_expired';
  if (!embedOwnerOk(hub, true)) return 'hub_disabled';
  if (!embedHostOk(hubDomains(hub), originHost(request.headers.get('Origin')))) return 'hub_domain';
  return null;
}

async function isSelfOrAdmin(request: Request, env: OwnerEnv, owner: string, callerId?: string): Promise<boolean> {
  let userId = callerId;
  if (userId === undefined) {
    if (!request.headers.get('Authorization')) return false;
    try {
      userId = (await requireAuth(request, env.SUPABASE_URL)).userId;
    } catch {
      return false;
    }
  }
  if (!userId) return false;
  if (userId === owner) return true;
  try {
    return isAdminCaller(await findCallerProfile(env, userId));
  } catch {
    return false; // a profile lookup failure must not fall through to "allowed"
  }
}
