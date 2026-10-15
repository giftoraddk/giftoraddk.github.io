/**
 * POST /mcp — Model Context Protocol server for a hub owner's AI agents (Claude, Cursor, a custom
 * agent...) to load knowledge into THEIR assistant fast: map any JSON API, or push items the agent
 * shaped itself. Everything is scoped to the token's hub — `know.owner` = hub id, so an agent can only
 * see, write and delete its own owner's rows. Data logic lives in knowImport.ts. Spec: hook/MCP.rst.
 *
 * Transport: Streamable HTTP, stateless — every POST carries one JSON-RPC message (or a batch) and is
 * answered with application/json; no sessions, no server-initiated SSE (GET/DELETE → 405). That is all
 * a tools-only server needs, and it keeps the Worker free of Durable Objects.
 *
 * Auth: `Authorization: Bearer <MCP_TOKEN>` — the per-hub token emailed after a purchase (hubs.ts),
 * looked up by its SHA-256. Revoked hub, lapsed plan (past current_period_end + grace) → 402.
 */
import { json, HttpError } from './lib/http';
import { readBodyUnknown, MCP_BODY_MAX } from './lib/body';
import { hubActive, hubByToken, syncedHub, type HubsEnv } from './hubs';
import {
  KNOW_TYPES, KNOW_SECTORS, KNOW_FNS, MAX_ITEMS, ToolError, countKnow, knowScopeOf, pendingIndex, reindexKnow, upsertKnow, deleteKnow, listKnow, readUrl,
} from './knowImport';

export type McpEnv = HubsEnv;

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'mega-knowledge', version: '2.0.0' };
const INSTRUCTIONS = [
  'Knowledge base behind this hub\'s assistant (D1 `know` + Vectorize). The assistant answers ONLY from these rows, so each row must be self-contained: put everything worth knowing in title + description.',
  'Typical flow: hub_info → import_url for a JSON API (dryRun first to check the guessed mapping) or upsert_knowledge for data you gathered yourself → list_knowledge to verify.',
  `Pick a type per row (${KNOW_TYPES.join(', ')} or your own). Give items stable ids so re-imports update instead of duplicating. Rows sharing a tag are linked automatically.`,
].join(' ');

type Rec = Record<string, any>;
type Hub = Rec;

// ── Tool catalogue ───────────────────────────────────────────────────────────

const itemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Stable id — reusing it updates the row. Omit for a new random id.' },
    type: { type: 'string', description: `know.type, e.g. ${KNOW_TYPES.join(', ')}. Falls back to the call-level \`type\`.` },
    title: { type: 'string' },
    description: { type: 'string', description: 'Main content the assistant reads and quotes — make it self-contained.' },
    tags: { type: ['string', 'array'], items: { type: 'string' }, description: 'Rows sharing a tag get linked for related answers.' },
    meta: { type: 'object', description: 'Extra fields kept on the row (price, unit, url, …).' },
    status: { type: 'string', enum: ['active', 'draft'] },
  },
  required: ['title'],
};

const statusProp = { type: 'string', enum: ['active', 'draft'], description: 'active (default) = searchable now; draft = stored but hidden.' };
// Who the rows serve: one sector and/or one department ('' or omitted = all) — each department reads its own scope.
const scopeProps = {
  sector: { type: 'string', enum: ['', ...KNOW_SECTORS], description: 'The sector these rows serve; omit for every sector.' },
  fn: { type: 'string', enum: ['', ...KNOW_FNS], description: 'The department these rows serve (consult = the guest chat); omit for every department. finance rows are never shown to guests.' },
};

const TOOLS = [
  {
    name: 'hub_info',
    description: 'This hub: owner id, plan, saved sources and how many knowledge rows it has per type.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_knowledge',
    description: 'Recent knowledge rows of this hub, optionally one type / status.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        status: { type: 'string', enum: ['active', 'draft'] },
        limit: { type: 'number', description: `1–${MAX_ITEMS}, default 50` },
        ...scopeProps,
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'import_url',
    description: 'Fetch a JSON API and copy its items into knowledge. Field paths are optional — missing ones are guessed (title/name/question, description/content/answer, id, tags). Paths are dot paths inside each item.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        type: { type: 'string', description: `know.type for every item, e.g. ${KNOW_TYPES.join(', ')}.` },
        itemsPath: { type: 'string', description: 'Dot path to the item array (default: the first array found).' },
        fields: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: ['string', 'array'], items: { type: 'string' }, description: 'One path or several, joined as paragraphs.' },
            id: { type: 'string', description: 'Path of the external id — makes re-imports update in place.' },
            tags: { type: 'string' },
          },
        },
        headers: { type: 'object', additionalProperties: { type: 'string' }, description: 'Request headers, e.g. an API key for that API.' },
        limit: { type: 'number' },
        status: statusProp,
        ...scopeProps,
        dryRun: { type: 'boolean', description: 'Map and return a preview + the mapping used, without writing.' },
      },
      required: ['url', 'type'],
    },
  },
  {
    name: 'upsert_knowledge',
    description: `Create or update up to ${MAX_ITEMS} knowledge rows you already prepared (e.g. after reading another API yourself).`,
    inputSchema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: itemSchema, maxItems: MAX_ITEMS },
        type: { type: 'string', description: 'Default know.type for items without one.' },
        status: statusProp,
        ...scopeProps,
      },
      required: ['items'],
    },
  },
  {
    name: 'reindex_knowledge',
    description: 'Build the search index (passages + vectors + keyword index) of rows not indexed yet — hub_info.pendingIndex — 50 per call; call again while `remaining` > 0. `force` rebuilds everything (pass the returned `after` to continue).',
    inputSchema: { type: 'object', properties: { force: { type: 'boolean' }, after: { type: 'string' }, limit: { type: 'number' } } },
  },
  {
    name: 'delete_knowledge',
    description: 'Soft-delete knowledge rows of this hub by id (drops their vectors and links).',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] },
    annotations: { destructiveHint: true },
  },
];

// ── Tool handlers ────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (env: McpEnv, hub: Hub, args: Rec) => Promise<unknown>> = {
  async hub_info(env, hub) {
    return {
      owner: hub.id, email: hub.email, plan: hub.plan_id, plan_interval: hub.plan_interval,
      current_period_end: hub.current_period_end || null,
      sources: hub.meta?.sources ?? [],
      knowledge: await countKnow(env, hub.id),
      pendingIndex: await pendingIndex(env, hub.id),
      suggestedTypes: KNOW_TYPES,
    };
  },

  async list_knowledge(env, hub, args) {
    return listKnow(env, hub.id, { type: args.type, status: args.status, limit: args.limit, ...knowScopeOf(args) });
  },

  async import_url(env, hub, args) {
    if (!args.type) throw new ToolError('`type` is required.');
    const scope = knowScopeOf(args);
    const { items, mapping } = await readUrl({ ...args, url: args.url } as any);
    if (args.dryRun) return { count: items.length, sample: items.slice(0, 5), mapping };
    if (!items.length) throw new ToolError('The mapping produced no items with a title.');
    return { ...(await upsertKnow(env, hub.id, items, { type: args.type, status: args.status, source: args.url, ...scope })), mapping };
  },

  async upsert_knowledge(env, hub, args) {
    return upsertKnow(env, hub.id, args.items, { type: args.type, status: args.status, source: 'mcp', ...knowScopeOf(args) });
  },

  async delete_knowledge(env, hub, args) {
    return { deleted: await deleteKnow(env, hub.id, args.ids) };
  },

  async reindex_knowledge(env, hub, args) {
    return reindexKnow(env, hub.id, { force: Boolean(args.force), after: args.after, limit: args.limit });
  },
};

// ── JSON-RPC ─────────────────────────────────────────────────────────────────

const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const toolText = (value: unknown, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

async function dispatch(env: McpEnv, hub: Hub, msg: Rec): Promise<Rec | null> {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(msg?.id, -32600, 'Invalid Request');
  const isNotification = msg.id === undefined;
  if (isNotification) return null; // notifications/initialized, notifications/cancelled — nothing to answer

  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion;
      return rpcResult(msg.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return rpcResult(msg.id, {});
    case 'tools/list':
      return rpcResult(msg.id, { tools: TOOLS });
    case 'tools/call': {
      const handler = HANDLERS[msg.params?.name];
      if (!handler) return rpcError(msg.id, -32602, `Unknown tool: ${msg.params?.name}`);
      try {
        return rpcResult(msg.id, toolText(await handler(env, hub, msg.params?.arguments ?? {})));
      } catch (err) {
        // Tool failures go back as a result the model can read and react to, not a protocol error.
        const message = err instanceof ToolError ? err.message : 'Internal error';
        if (!(err instanceof ToolError)) console.error('[worker-llm/mcp] tool failed:', err);
        return rpcResult(msg.id, toolText(message, true));
      }
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function handleMcp(request: Request, env: McpEnv): Promise<Response> {
  if (request.method !== 'POST') return json({ message: 'Method not allowed — this MCP server is POST-only (no SSE stream).' }, { status: 405, headers: { Allow: 'POST' } });

  const header = request.headers.get('Authorization') ?? '';
  // syncedHub: a plan renewed (or lapsed) since the stored snapshot counts now — the owner needn't open the settings.
  const hub = await syncedHub(env, header.startsWith('Bearer ') ? await hubByToken(env, header.slice(7).trim()) : null);
  if (!hub) return json({ message: 'Unauthorized — use the MCP_TOKEN from your purchase email.' }, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
  if (!hubActive(hub)) return json({ message: 'This hub has no active plan — renew it to use MCP again.' }, { status: 402 });
  await env.LLM_DB.prepare('UPDATE hubs SET token_used_at = ? WHERE id = ?').bind(new Date().toISOString(), hub.id).run();

  let body: unknown;
  try {
    body = await readBodyUnknown(request, MCP_BODY_MAX); // a batch is a JSON array — readBody's object-only contract would flatten it to {}
  } catch (err) {
    return json(rpcError(null, -32700, 'Parse error'), { status: err instanceof HttpError ? err.status : 400 });
  }

  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map(m => dispatch(env, hub, m)))).filter(Boolean);
    return replies.length ? json(replies) : new Response(null, { status: 202 });
  }
  const reply = await dispatch(env, hub, body as Rec);
  return reply ? json(reply) : new Response(null, { status: 202 });
}
