import type { Rec } from './types.ts';

// Level / capability names (auth/tool/roles.js) that change data — VIEW/read/list only look.
const WRITE_GRANTS = new Set(['EDIT', 'REVIEW', 'PUBLISH', 'MANAGE', 'admin', 'write', 'create', 'update']);

/** Platform staff (owner '') = a talks grant that can write, over every record (~all) — read-only or ~own is not enough. */
export function canRunPlatformJobs(roles: string[]): boolean {
  return roles.some(r => {
    if (!r.startsWith('talks.')) return false;
    const [name, scope = 'all'] = r.slice('talks.'.length).split('~');
    return WRITE_GRANTS.has(name) && scope === 'all';
  });
}

/** hubs.meta as an object — a raw D1 row carries it as JSON text, a D1Client row already parsed. */
export function hubMeta(hub: Rec | null | undefined): Rec {
  try {
    const meta = typeof hub?.meta === 'string' ? JSON.parse(hub.meta || '{}') : hub?.meta;
    return meta && typeof meta === 'object' ? meta : {};
  } catch {
    return {};
  }
}

/** A hub's knowledge answers guests on other sites only while its plan is active and it hasn't opted out (meta.embed = false). */
export function embedOwnerOk(hub: Rec | null | undefined, active: boolean): boolean {
  return !!hub && active && hubMeta(hub).embed !== false;
}

// ── Embed domains ────────────────────────────────────────────────────────────

export const MAX_DOMAINS = 20;
const LOCAL_HOST = /^(localhost|127(?:\.\d+){3}|\[::1\])(?::\d+)?$/;

/** A local dev host (localhost / 127.x / [::1], any port) — one browser on one machine, never a site with visitors. */
export const isLocalHost = (host: string) => LOCAL_HOST.test(host);

/** A site host as every check compares it: lower-case, no "www.", optional port ('' in → ''); null = not a host. */
export function parseHost(v: unknown): string | null {
  if (v == null || v === '') return '';
  if (typeof v !== 'string') return null;
  const host = v.trim().toLowerCase().replace(/^www\./, '');
  return host.length <= 253 && /^[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/.test(host) ? host : null;
}

/**
 * A platform site's own assistant (svc-aide site="chatzui.com", no owner) keeps its knowledge, persona and face under the
 * owner '@<host>' — like a hub of its own, so it shares nothing with the platform's sector knowledge (owner '') nor with
 * any other assistant, and every per-owner rule (search, overrides, faces, Vectorize namespace) just works. Only that
 * site of the platform may read it (fn/owner.ts ownerAccess); only an admin writes it. The host it serves, or null when
 * `owner` isn't one — a host needs a dot, so data.ts's '@shared' sentinel never reads as one.
 */
export function siteOfOwner(owner: string): string | null {
  if (!owner.startsWith('@')) return null;
  const host = parseHost(owner.slice(1));
  return host && host.includes('.') ? host : null;
}

/** The platform's own knowledge — the shared sector rows ('') or one of its sites' ('@<host>'). */
export const isPlatformOwner = (owner: string) => owner === '' || siteOfOwner(owner) !== null;

/** hubs.meta.domains — the sites allowed to run this hub's embedded assistant (hosts as parseHost gives them,
 *  validated on save); [] = any site (a hub that never set one — the owner is warned in the settings). */
export function hubDomains(hub: Rec | null | undefined): string[] {
  const list = hubMeta(hub).domains;
  return Array.isArray(list) ? list.filter((d): d is string => typeof d === 'string' && !!d) : [];
}

/** Host of a request's Origin header, parseHost form (lower-case, no "www."); '' = none or opaque ("null"). */
export function originHost(origin: string | null): string {
  if (!origin || origin === 'null') return '';
  try {
    return new URL(origin).host.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * May a page on `host` use a hub limited to `domains`. A browser can't forge Origin, so a copied embed tag stops on
 * another site; a server could, but then every visitor's call leaves from that one server and hits the per-IP limit.
 * Local dev hosts always pass: one browser, nothing to scale an abuse on — and the owner can try the tag before deploying.
 */
export function embedHostOk(domains: string[], host: string): boolean {
  if (!domains.length) return true;
  if (!host) return false;
  return isLocalHost(host) || domains.includes(host);
}

export const HUB_JOBS_PER_DAY = 100;
export const sinceIso = (nowMs: number) => new Date(nowMs - 86_400_000).toISOString();
