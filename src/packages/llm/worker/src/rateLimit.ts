/**
 * AI call limits — Workers Rate Limiting bindings (wrangler.jsonc `ratelimits`), no KV write per request: KV Free
 * allows 1000 writes a day, which one busy pipeline would burn through.
 *   AI_GUEST_LIMIT — no session (guest svc-aide widget), keyed by IP
 *   AI_USER_LIMIT  — signed in, keyed by user id; generous because one step fires several calls, each retried
 */
export interface RateLimitEnv {
  AI_GUEST_LIMIT: RateLimit;
  AI_USER_LIMIT: RateLimit;
}

export const clientIp = (request: Request) => request.headers.get('CF-Connecting-IP') || 'unknown';

/**
 * One IPv6 allocation is a /64, not a single address — key on that prefix so a client can't rotate through its own
 * addresses for fresh buckets. '::' is expanded first (a naive split would read "2001:db8::1" as 4 groups of the
 * prefix), and an IPv4-mapped / embedded address ("::ffff:1.2.3.4") keys on its IPv4 part, never the shared "0:0:0:0".
 */
export function ipKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  const v4 = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) return v4[1];
  const [head, tail] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return `${groups.slice(0, 4).map(g => (g.toLowerCase().replace(/^0+(?=.)/, '') || '0')).join(':')}::/64`;
}

export const AI_LIMIT_PERIOD_S = 60; // keep in step with wrangler.jsonc AI_*_LIMIT period

/** PUBLIC_READ_LIMIT — the public GETs (widget faces /v1/fn/sectors, raw know/rel/divisions): no AI, but each one reads
 *  D1 (and may re-read a hub's billing), so a script can't hammer them; keyed by IP, roomy for a person browsing. */
export interface PublicReadEnv { PUBLIC_READ_LIMIT: RateLimit }

export async function allowPublicRead(env: PublicReadEnv, request: Request): Promise<boolean> {
  const { success } = await env.PUBLIC_READ_LIMIT.limit({ key: `ip:${ipKey(clientIp(request))}` });
  return success;
}

export async function allowAi(env: RateLimitEnv, request: Request, userId: string): Promise<boolean> {
  const { success } = userId
    ? await env.AI_USER_LIMIT.limit({ key: `user:${userId}` })
    : await env.AI_GUEST_LIMIT.limit({ key: `ip:${ipKey(clientIp(request))}` });
  return success;
}
