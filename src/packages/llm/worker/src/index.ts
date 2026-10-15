/**
 * Worker entrypoint — router + CORS. D1 + AI + semantic search ONLY:
 *   *    /v1/data/:table[/:id | /_batch]           — generic CRUD proxy over D1 (see data.ts)
 *   POST /v1/search                                — semantic search over `know` (see search.ts)
 *   POST /v1/ai/stream                              — LLM chat (guest-allowed, IP or per-user rate-limited; see ai.ts)
 *   POST /v1/ai/image                               — image generation (auth required; see ai.ts)
 *   *    /v1/fn/*                                   — sector department pipelines, expertise stays server-side (see fn/routes.ts)
 *   *    /v1/hubs/:action                           — paying customers' hub: token issue, settings, API import (see hubs.ts)
 *   POST /mcp                                       — MCP server for a hub's AI agents to load knowledge (per-hub token; see mcp.ts)
 *   POST /v1/mcp/:server                            — relay to an allowlisted public MCP server for <svc-ask> (IP rate-limited; see mcpRelay.ts)
 *   cron (scheduled)                                — daily: deletes group-chat data past 30 days (see fn/retention.ts)
 *
 * This Worker owns ALL AI processing app-wide (chat + image generation, every domain —
 * division/svc-talk.js, division/svc-sale.js, llm/svc-talk.js, llm/svc-aide.js, ...) AND its own D1
 * data (webs/llm domain's divisions/talks/know/rel). Firestore/Supabase proxying lives on the
 * separate packages/db-worker deployment (different Cloudflare account — see hook/WORKER.rst).
 *
 * Ported from astro-micro/worker/packages/llm/src/index.ts with two reconciliations against
 * this repo's already-ported src/lib/http.ts (that file's signatures differ from the
 * @worker/shared/http original it was ported from):
 *   1. corsHeaders()/json() here take a single `origin: string` / `(data, init?: ResponseInit)` —
 *      not the original's `(origin, allowedOrigin)` / `(data, status: number)` — status codes are
 *      passed as `{ status }` init objects; origin selection is lib/http.ts's pickOrigin() (allowlist
 *      vs. '*') gated by lib/cors.ts's isPublicRoute().
 *   2. handleWorkerError(err) here has no built-in AuthError -> 401/403 mapping (it answers 500 for
 *      unexpected errors), unlike the original's version which special-cased it. requireAuth() (data.ts's table
 *      guard, this file's /v1/ai/image guard) throws AuthError on missing/invalid/forbidden auth,
 *      so that mapping is reproduced locally in the catch block below to preserve the original
 *      401/403 behavior instead of silently degrading auth failures to 500s.
 */
import { handleDataRoute, type DataEnv } from './data';
import { handleAiStream, handleAiImage, type AiEnv } from './ai';
import { allowAi, allowPublicRead, AI_LIMIT_PERIOD_S, type PublicReadEnv, type RateLimitEnv } from './rateLimit';
import { requireAuth, AuthError } from './lib/auth';
import { corsHeaders, withCors, json, handleWorkerError, pickOrigin, isFirstParty } from './lib/http';
import { isPublicRoute } from './lib/cors';
import { handleSearch } from './search';
import { handleMcp, type McpEnv } from './mcp';
import { handleHubsRoute } from './hubs';
import { handleMcpRelay, type McpRelayEnv } from './mcpRelay';
import { handleFnRoute } from './fn/routes';
import { purgeExpired } from './fn/retention';

export interface Env extends DataEnv, AiEnv, RateLimitEnv, PublicReadEnv, McpEnv, McpRelayEnv {
  ALLOWED_ORIGIN: string;
}

// Ids may carry a dot — division rows are '<sector>.<fn>' (their face is edited in /admin/divisions).
const DATA_PATH = /^\/v1\/data\/([a-zA-Z0-9_]+)(?:\/([a-zA-Z0-9_.-]+))?$/;
const HUBS_PATH = /^\/v1\/hubs\/([a-z-]+)$/;
const MCP_RELAY_PATH = /^\/v1\/mcp\/([a-z0-9-]+)$/;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = pickOrigin(request.headers.get('Origin'), env.ALLOWED_ORIGIN, isPublicRoute(request, url.pathname));
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/mcp') {
        // Per-hub MCP token, not a Supabase session — see mcp.ts's header.
        return withCors(await handleMcp(request, env), origin);
      }

      const hubsMatch = url.pathname.match(HUBS_PATH);
      if (hubsMatch) return withCors(await handleHubsRoute(request, env, hubsMatch[1]), origin);

      // Public, keyless servers only (allowlist in mcpRelay.ts) — same trust level as /v1/search, plus a per-IP limit.
      const relayMatch = url.pathname.match(MCP_RELAY_PATH);
      if (relayMatch) return withCors(await handleMcpRelay(request, env, relayMatch[1]), origin);

      if (request.method === 'POST' && url.pathname === '/v1/search') {
        // Public — same trust level as GET /v1/data/know|rel (guest-facing svc-aide.js widget). It embeds the
        // query (spends Workers AI), so handleSearch applies the same guest/user rate limit as /v1/ai/stream.
        return withCors(await handleSearch(request, env, ctx), origin);
      }

      if (request.method === 'POST' && url.pathname === '/v1/ai/stream') {
        // A raw AI proxy: guests only from the platform's own pages (radar, json-ai…) — a copied call on another site
        // would spend this worker's AI keys; the embedded widget answers through /v1/fn/aide instead. Guests are
        // IP-limited (10/min), signed-in callers by user id (120/min, generous since one step fires several retried calls).
        const userId = await requireAuth(request, env.SUPABASE_URL).then(u => u.userId, () => '');
        if (!userId && !isFirstParty(request.headers.get('Origin'), env.ALLOWED_ORIGIN)) {
          return withCors(json({ message: 'Sign in to use the AI from this site' }, { status: 403 }), origin);
        }
        if (!(await allowAi(env, request, userId))) {
          return withCors(json({ message: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(AI_LIMIT_PERIOD_S) } }), origin);
        }
        return withCors(await handleAiStream(request, env), origin);
      }

      if (request.method === 'POST' && url.pathname === '/v1/ai/image') {
        // Authenticated admin/content flow, not guest-facing — still per-user limited, it spends the HF key.
        const { userId } = await requireAuth(request, env.SUPABASE_URL);
        if (!(await allowAi(env, request, userId))) {
          return withCors(json({ message: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(AI_LIMIT_PERIOD_S) } }), origin);
        }
        return withCors(await handleAiImage(request, env), origin);
      }

      // Public reads (widget faces, raw know/rel/divisions) hit D1 on every call — capped per IP (rateLimit.ts).
      if (request.method === 'GET' && isPublicRoute(request, url.pathname) && !(await allowPublicRead(env, request))) {
        return withCors(json({ message: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(AI_LIMIT_PERIOD_S) } }), origin);
      }

      if (url.pathname.startsWith('/v1/fn/')) {
        const res = await handleFnRoute(request, env, url, ctx);
        if (res) return withCors(res, origin);
      }

      const dataMatch = url.pathname.match(DATA_PATH);
      if (dataMatch) {
        const [, table, idOrBatch] = dataMatch;
        return withCors(await handleDataRoute(request, env, table, idOrBatch, ctx), origin);
      }

      return withCors(json({ message: 'Not found' }, { status: 404 }), origin);
    } catch (err) {
      // See header comment #2 — reproduce the AuthError -> 401/403 mapping that this repo's
      // handleWorkerError doesn't itself do.
      if (err instanceof AuthError) {
        return withCors(json({ message: err.message || 'Unauthorized' }, { status: err.message === 'Forbidden' ? 403 : 401 }), origin);
      }
      return withCors(handleWorkerError(err), origin);
    }
  },

  // Cron (wrangler.jsonc triggers): the group chat keeps 30 days — see fn/retention.ts.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeExpired(env.LLM_DB).then(
      n => console.log('[retention] deleted', n),
      err => console.error('[retention] purge failed:', err),
    ));
  },
};
