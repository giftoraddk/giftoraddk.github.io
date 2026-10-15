/**
 * POST /v1/mcp/:server — relays <svc-ask>'s MCP calls (src/packages/node/service/mcp-client.js) to a public
 * MCP server on the allowlist below. Browsers can't reliably talk to them directly — CORS differs server by
 * server: trivago never exposes Mcp-Session-Id, others reject MCP-Protocol-Version in a preflight or answer
 * OPTIONS with 4xx — so the Worker forwards the JSON-RPC body server-to-server and streams the
 * answer back untouched (JSON or SSE), with the session header exposed. Only listed servers: never an open
 * proxy. All of them are keyless public servers (checked 2026-09), so no secret is involved.
 *
 * Rate limit: MCP_RELAY_LIMIT (wrangler.jsonc `ratelimits`, Workers Rate Limiting — no KV write per request),
 * keyed by caller IP + server, so nobody turns the relay into a free proxy that hammers those servers.
 */
import { json, HttpError } from './lib/http';
import { readText } from './lib/body';
import { ipKey } from './rateLimit';

export interface McpRelayEnv {
  MCP_RELAY_LIMIT: RateLimit;
}

const MCP_SERVERS = new Map<string, string>([
  ['trivago', 'https://mcp.trivago.com/mcp'], // trivago hotel search (official)
  ['cars', 'https://mcp.octotrip.app/rental-cars/mcp'], // OctoTrip rental cars
  ['weather', 'https://ads.getlulu.dev/weather/mcp'], // Open-Meteo weather
  ['meals', 'https://gateway.pipeworx.io/recipes/mcp'], // TheMealDB recipes
  ['tv', 'https://gateway.pipeworx.io/movies/mcp'], // TVmaze / iTunes movies & shows
]);

const FORWARD = ['content-type', 'accept', 'mcp-session-id', 'mcp-protocol-version'];
const MAX_BODY = 64 * 1024; // one JSON-RPC message — tool arguments, never uploads
const TIMEOUT_MS = 45000;
const LIMIT_PERIOD_S = 60; // keep in step with wrangler.jsonc's MCP_RELAY_LIMIT `period`

export async function handleMcpRelay(request: Request, env: McpRelayEnv, server: string): Promise<Response> {
  const upstream = MCP_SERVERS.get(server);
  if (!upstream) return json({ message: `Unknown MCP server: ${server}` }, { status: 404 });
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });

  // One IPv6 allocation is a /64, not a single address — key on that prefix so it isn't unlimited buckets (rateLimit.ts).
  const ip = ipKey(request.headers.get('CF-Connecting-IP') || 'unknown');
  const { success } = await env.MCP_RELAY_LIMIT.limit({ key: `${ip}:${server}` });
  if (!success) {
    return json({ message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(LIMIT_PERIOD_S) } });
  }

  let body: string;
  try {
    body = await readText(request, MAX_BODY); // streamed + capped — never buffers a large upstream-bound body before checking its size
  } catch (err) {
    return json({ message: 'Payload too large' }, { status: err instanceof HttpError ? err.status : 413 });
  }

  // No Origin / cookies: some servers reject browser origins outright, and none of them needs ours.
  const headers = new Headers();
  for (const name of FORWARD) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let res: Response;
  try {
    res = await fetch(upstream, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    return json({ message: `MCP server unreachable: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }

  const out = new Headers({ 'Access-Control-Expose-Headers': 'Mcp-Session-Id', 'Cache-Control': 'no-store' });
  for (const name of ['content-type', 'mcp-session-id']) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(res.body, { status: res.status, headers: out });
}
