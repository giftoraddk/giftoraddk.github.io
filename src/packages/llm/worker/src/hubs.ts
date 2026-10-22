/**
 * /v1/hubs/* — a hub is one paying customer (table `hubs`, schema.sql): a billing snapshot + the MCP
 * token they load knowledge with. The hub id is the Supabase user id, and it is also `know.owner` of
 * everything that hub imports. Spec: hook/MCP.rst.
 *
 *   POST /v1/hubs/issue          { rotate? }  → create/refresh the caller's hub; a new token is emailed
 *                                               (Resend) and returned once in the response
 *   GET  /v1/hubs/me[?owner=]                 → { hub, active, isAdmin, knowledge, pending, mcpUrl, types } — pending =
 *                                               unindexed rows of ?owner (admin only), else of the caller's hub
 *   POST /v1/hubs/import         { url, type, owner?, sector?, fn?, itemsPath?, fields?, dryRun? } → import a JSON API
 *                                               into `know` (+ `rel`), saved to hub.meta.sources
 *   POST /v1/hubs/items          { items, source, type?, owner?, sector?, fn?, prune?, since? } → caller-shaped rows into
 *                                               `know` (+ index + `rel`): same key = overwrite, new key = append; `prune`
 *                                               soft-deletes this `source`'s rows not written since `since` (svc-learn's
 *                                               product sync — a product removed from the shop leaves the knowledge too)
 *   POST /v1/hubs/remove-source  { id }       → drop a saved source (its knowledge stays)
 *   POST /v1/hubs/domains        { owner?, domains: string[] } → the sites allowed to run the hub's embedded assistant
 *                                               ([] = any site); own hub, or any hub for an admin
 *   POST /v1/hubs/reindex        { owner?, force?, after? } → (re)build the chunk/vector/FTS index of an
 *                                               owner's rows, 50 per call — loop while `remaining` > 0
 *
 * Every route needs a Supabase JWT. Payment is never taken from the client: issue/me re-read the
 * caller's billing record from auth (GET {AUTH_URL}/v1/billing/subscription, forwarding the
 * same bearer token). Admins may use every route without a plan and may import for any owner
 * ('' = shared platform knowledge).
 *
 * Tokens: `mcp_` + 64 hex chars. Only the SHA-256 (token_hash) and the last 4 chars (token_hint) are
 * stored — the raw token exists in the email and in the issue response only.
 */
import { requireAuth, type VerifiedUser } from './lib/auth';
import { isAdminCaller, type RolesUser } from './lib/roles';
import { json } from './lib/http';
import { readBody, HUBS_BODY_MAX, HUBS_ITEMS_BODY_MAX } from './lib/body';
import { D1Client } from './d1';
import { findCallerProfile } from './lib/profile';
import { sendMail, mcpTokenMail, siteUrlOf, type EmailEnv } from './email';
import { planGrants } from '../../../purchase/tool/plans.js';
import { KNOW_TYPES, ToolError, countKnow, knowScopeOf, pendingIndex, pruneKnow, readUrl, reindexKnow, upsertKnow, type KnowImportEnv } from './knowImport';
import { MAX_DOMAINS, embedOwnerOk, hubDomains, hubMeta, parseHost } from './fn/access';

export interface HubsEnv extends KnowImportEnv, EmailEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AUTH_URL?: string;
  SITE_URL?: string;       // the site the token email links (embed bundle, docs, workspace) — else ALLOWED_ORIGIN's first
  ALLOWED_ORIGIN?: string;
  BILLING_SERVICE_KEY?: string; // shared with auth (≥ 32 chars) — peekBilling; blank = billing only re-read with the owner's JWT
}

type Rec = Record<string, any>;

const ACTIVE_BILLING = new Set(['active', 'approved']); // = purchase/tool/billing.js's ACTIVE_STATUSES
const GRACE_SECONDS = 3 * 24 * 3600; // /mcp keeps working this long past current_period_end
const MAX_SOURCES = 20;

const badRequest = (message: string, status = 400) => json({ message }, { status });

// ── Tokens ───────────────────────────────────────────────────────────────────

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function newToken(prefix = 'mcp_', size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return `${prefix}${[...bytes].map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Hub is usable for imports / MCP: not revoked, plan active (admin hubs skip the billing check). A cancelled plan stops
 * renewing but stays usable until the end of the period already paid for — no grace, and never without a known end
 * (auth billing.ts keeps the paid-through date on cancel; /system/legal/refund promises this).
 */
export function hubActive(hub: Rec | null | undefined): boolean {
  if (!hub || hub.deleted_at || hub.status !== 'active') return false;
  if (hub.plan_id === 'admin') return true;
  const end = Number(hub.current_period_end) || 0;
  if (hub.billing_status === 'cancelled') return end > 0 && Date.now() / 1000 <= end;
  if (!ACTIVE_BILLING.has(hub.billing_status)) return false;
  return !end || Date.now() / 1000 <= end + GRACE_SECONDS;
}

/** The hub a raw MCP token belongs to, or null. Constant-time enough: lookup by hash, never by token. */
export async function hubByToken(env: HubsEnv, token: string): Promise<Rec | null> {
  if (!token) return null;
  const row = await env.LLM_DB
    .prepare('SELECT * FROM hubs WHERE token_hash = ? AND deleted_at IS NULL LIMIT 1')
    .bind(await hashToken(token))
    .first();
  if (!row) return null;
  const hub = row as Rec;
  try { hub.meta = JSON.parse(hub.meta || '{}'); } catch { hub.meta = {}; }
  return hub;
}

/** What a client may see of a hub — never token_hash. support_* = columns of the dropped Zap Support reply key
 *  (2026-10-21, hook/ZAP-SUPPORT.rst §13) that older databases still have (d1-schema never drops a column). */
function publicHub(hub: Rec | null) {
  if (!hub) return null;
  const { token_hash: _hash, deleted_at: _deleted, support_hash: _sh, support_hint: _si, support_issued_at: _sa, support_used_at: _su, ...rest } = hub;
  return { ...rest, has_token: Boolean(hub.token_hash), sources: hub.meta?.sources ?? [] };
}

// ── Billing ──────────────────────────────────────────────────────────────────

/** The caller's billing record from auth (null = never bought / signed out there). */
async function fetchBilling(env: Pick<HubsEnv, 'AUTH_URL'>, request: Request): Promise<Rec | null> {
  if (!env.AUTH_URL) throw new ToolError('AUTH_URL is not configured on the llm.');
  const res = await fetch(`${env.AUTH_URL.replace(/\/$/, '')}/v1/billing/subscription`, {
    headers: { Authorization: request.headers.get('Authorization') ?? '' },
  });
  if (!res.ok) throw new ToolError(`Billing check failed (${res.status}).`);
  return (await res.json()) as Rec | null;
}

function billingColumns(record: Rec | null, now: string): Rec {
  return {
    plan_id: record?.plan_id ?? '',
    plan_interval: record?.interval ?? '',
    billing_status: record?.status ?? '',
    subscription_id: record?.subscription_id ?? '',
    payer_id: record?.payer_id ?? '',
    trial_end: Number(record?.trial_end) || 0,
    current_period_end: Number(record?.current_period_end) || 0,
    billing_synced_at: now,
  };
}

const RESYNC_MS = 60_000; // a snapshot this fresh is trusted as is — freshHub() asks auth at most once a minute

/**
 * `hub` with its billing snapshot refreshed from auth (the caller's own JWT) when the stored one is older than
 * RESYNC_MS — so a plan bought or changed elsewhere (Starter → Pro) counts on the next call, without opening the
 * settings first. Admin hubs, a missing AUTH_URL or a failed lookup keep the stored row: never looser than it was.
 */
export async function freshHub(request: Request, env: BillingSyncEnv, hub: Rec | null): Promise<Rec | null> {
  if (!hub || hub.plan_id === 'admin' || !env.AUTH_URL) return hub;
  if (Date.now() - (Date.parse(hub.billing_synced_at || '') || 0) < RESYNC_MS) return hub;
  let record = await peekBilling(env, hub.id);
  if (record === undefined) record = await fetchBilling(env, request).catch(() => undefined);
  return record === undefined ? hub : saveBilling(env, hub, record);
}

type BillingSyncEnv = Pick<HubsEnv, 'AUTH_URL' | 'LLM_DB' | 'BILLING_SERVICE_KEY'>;

const SERVICE_RESYNC_MS = 3_600_000; // without the owner (a guest's call), a hub's billing is re-read at most hourly
const PEEK_RETRY_MS = 300_000; // per isolate: a failing auth is asked again after 5 min, not on every guest call
const _peekAt = new Map<string, number>();

const serviceKeyOf = (env: BillingSyncEnv) => (env.AUTH_URL && (env.BILLING_SERVICE_KEY ?? '').length >= 32 ? env.BILLING_SERVICE_KEY! : '');

/** billing/{userId} read server → server (auth GET /v1/billing/peek/:userId) — undefined = not configured / failed. */
async function peekBilling(env: BillingSyncEnv, userId: string): Promise<Rec | null | undefined> {
  const key = serviceKeyOf(env);
  if (!key) return undefined;
  try {
    const res = await fetch(`${env.AUTH_URL!.replace(/\/$/, '')}/v1/billing/peek/${encodeURIComponent(userId)}`, { headers: { 'X-Service-Key': key } });
    if (!res.ok) {
      console.warn(`[hubs] billing peek for ${userId} failed (${res.status})`);
      return undefined;
    }
    return (await res.json()) as Rec | null;
  } catch (err) {
    console.warn('[hubs] billing peek failed:', err);
    return undefined;
  }
}

async function saveBilling(env: BillingSyncEnv, hub: Rec, record: Rec | null): Promise<Rec> {
  const client = new D1Client(env.LLM_DB);
  const patch = { ...billingColumns(record, client.now()), updated_at: client.now() };
  await client.put('hubs', hub.id, patch);
  return { ...hub, ...patch };
}

/**
 * `hub` with a billing snapshot no older than SERVICE_RESYNC_MS (an inactive one: re-read every PEEK_RETRY_MS), read
 * WITHOUT the owner (peekBilling) — what lets an
 * embedded assistant follow the plan on its own: an auto-renewal keeps it on, an unpaid / cancelled period switches it
 * off. A snapshot still active keeps serving while it refreshes in the background (ctx); an inactive one waits for the
 * answer, so a renewal switches it back on with this very call. Admin hubs, no service key, or a failed lookup keep the
 * stored row — never looser than it was.
 */
export async function syncedHub(env: BillingSyncEnv, hub: Rec | null, ctx?: ExecutionContext): Promise<Rec | null> {
  if (!hub || hub.plan_id === 'admin' || !serviceKeyOf(env)) return hub;
  const now = Date.now();
  const active = hubActive(hub);
  // An inactive snapshot skips the hourly window: a renewal right after a sync must not wait an hour to switch back on.
  if (active && now - (Date.parse(hub.billing_synced_at || '') || 0) < SERVICE_RESYNC_MS) return hub;
  if (now - (_peekAt.get(hub.id) ?? 0) < PEEK_RETRY_MS) return hub;
  _peekAt.set(hub.id, now);
  const refresh = async () => {
    const record = await peekBilling(env, hub.id);
    return record === undefined ? hub : saveBilling(env, hub, record);
  };
  if (ctx && active) {
    ctx.waitUntil(refresh().catch(() => undefined));
    return hub;
  }
  return refresh().catch(() => hub);
}

// ── Context ──────────────────────────────────────────────────────────────────

interface Caller {
  user: VerifiedUser;
  profile: (RolesUser & Rec) | null;
  isAdmin: boolean;
  client: D1Client;
  hub: Rec | null;
}

async function callerOf(request: Request, env: HubsEnv): Promise<Caller> {
  const user = await requireAuth(request, env.SUPABASE_URL); // throws AuthError → 401 (index.ts)
  const profile = (await findCallerProfile(env, user.userId)) as (RolesUser & Rec) | null;
  const client = new D1Client(env.LLM_DB);
  return { user, profile, isAdmin: isAdminCaller(profile), client, hub: await client.findById('hubs', user.userId) };
}

const mcpUrlOf = (request: Request) => `${new URL(request.url).origin}/mcp`;

// ── Routes ───────────────────────────────────────────────────────────────────

export async function handleHubsRoute(request: Request, env: HubsEnv, action: string): Promise<Response> {
  try {
    if (action === 'me' && request.method === 'GET') return await me(request, env);
    if (request.method !== 'POST') return badRequest('Not found', 404);
    // Gate before spending a body-read on an unauthenticated caller — every action below re-verifies via callerOf()
    // anyway (requireAuth's JWKS lookup is memoized, so this second verify is cheap), never a duplicate query.
    await requireAuth(request, env.SUPABASE_URL);
    const body = await readBody(request, action === 'items' ? HUBS_ITEMS_BODY_MAX : HUBS_BODY_MAX);
    if (action === 'issue') return await issue(request, env, body);
    if (action === 'import') return await importSource(request, env, body);
    if (action === 'items') return await importItems(request, env, body);
    if (action === 'remove-source') return await removeSource(request, env, body);
    if (action === 'reindex') return await reindex(request, env, body);
    if (action === 'domains') return await setDomains(request, env, body);
    return badRequest('Not found', 404);
  } catch (err) {
    if (err instanceof ToolError) return badRequest(err.message);
    throw err; // AuthError / unexpected → index.ts maps it
  }
}

async function me(request: Request, env: HubsEnv): Promise<Response> {
  const c = await callerOf(request, env);
  let hub = c.hub;
  // Opening the settings refreshes the billing snapshot, so a renewed or cancelled plan shows up here.
  if (hub && hub.plan_id !== 'admin' && env.AUTH_URL) {
    const record = await fetchBilling(env, request).catch(() => undefined);
    if (record !== undefined) {
      const patch = { ...billingColumns(record, c.client.now()), updated_at: c.client.now() };
      await c.client.put('hubs', hub.id, patch);
      hub = { ...hub, ...patch };
    }
  }
  // The owner the settings manage: ?owner= (admin only — any hub, '' = shared platform knowledge), else the caller's
  // own hub. `pending` = its index backlog; `managed` = whether its embedded assistant runs, and where.
  const asked = new URL(request.url).searchParams.get('owner');
  const owner = asked !== null && c.isAdmin ? asked : hub?.id ?? null;
  const managedHub = !owner ? null : owner === hub?.id ? hub : await c.client.findById('hubs', owner);
  return json({
    hub: publicHub(hub),
    active: hubActive(hub),
    isAdmin: c.isAdmin,
    knowledge: hub ? await countKnow(env, hub.id) : {},
    pending: owner !== null ? await pendingIndex(env, owner) : 0,
    managed: managedHub ? { id: managedHub.id, active: hubActive(managedHub), embed: embedOwnerOk(managedHub, true), domains: hubDomains(managedHub) } : null,
    mcpUrl: mcpUrlOf(request),
    types: KNOW_TYPES,
  });
}

async function issue(request: Request, env: HubsEnv, body: Rec): Promise<Response> {
  const c = await callerOf(request, env);
  const now = c.client.now();
  const record = c.isAdmin ? null : await fetchBilling(env, request);
  if (!c.isAdmin && !ACTIVE_BILLING.has(record?.status)) return badRequest('No active plan — buy a plan first.', 402);

  const billing = c.isAdmin && !ACTIVE_BILLING.has(record?.status ?? '')
    ? { ...billingColumns(null, now), plan_id: 'admin', billing_status: 'active' }
    : billingColumns(record, now);
  const rotate = Boolean(body.rotate) || !c.hub?.token_hash || c.hub.status !== 'active';
  const token = rotate ? newToken() : '';
  const email = c.user.email || c.profile?.email || c.hub?.email || '';
  const name = c.profile?.display_name || c.hub?.display_name || '';

  const data: Rec = {
    email, display_name: name, status: 'active', ...billing,
    meta: c.hub?.meta ?? { sources: [] },
    created_at: c.hub?.created_at || now, updated_at: now, deleted_at: null,
  };
  if (rotate) Object.assign(data, { token_hash: await hashToken(token), token_hint: token.slice(-4), token_issued_at: now });
  await c.client.set('hubs', c.user.userId, data);

  let emailed = false;
  if (rotate) {
    const sent = await sendMail(env, mcpTokenMail({ to: email, name, token, mcpUrl: mcpUrlOf(request), plan: billing.plan_id, rotated: Boolean(c.hub?.token_hash), owner: c.user.userId,
      siteUrl: siteUrlOf(env), departments: billing.plan_id === 'admin' || planGrants(billing.plan_id, 'departments') }));
    emailed = sent.ok;
    await c.client.put('hubs', c.user.userId, { email_sent_at: sent.ok ? now : c.hub?.email_sent_at ?? '', email_error: sent.error ?? '' });
  }
  const hub = await c.client.findById('hubs', c.user.userId);
  return json({ hub: publicHub(hub), active: hubActive(hub), token: token || undefined, emailed, mcpUrl: mcpUrlOf(request) });
}

async function importSource(request: Request, env: HubsEnv, body: Rec): Promise<Response> {
  const c = await callerOf(request, env);
  const wantsOther = body.owner != null && body.owner !== (c.hub?.id ?? c.user.userId);
  if (wantsOther && !c.isAdmin) return badRequest('You can only import into your own knowledge.', 403);
  if (!c.isAdmin && !hubActive(c.hub)) return badRequest('No active hub — buy a plan (or reissue your token) first.', 402);
  const owner = wantsOther ? String(body.owner) : c.user.userId;
  const type = String(body.type || '').trim().toLowerCase();
  if (!type) return badRequest('`type` is required (e.g. product, law, faq).');
  const scope = knowScopeOf(body); // ToolError → 400, like a bad URL

  const { items, mapping } = await readUrl({ url: body.url, itemsPath: body.itemsPath, fields: body.fields, type, limit: body.limit });
  if (body.dryRun) return json({ dryRun: true, count: items.length, sample: items.slice(0, 5), mapping });
  if (!items.length) return badRequest('The API returned no items with a title.');
  const result = await upsertKnow(env, owner, items, { type, status: body.status, source: body.url, ...scope });

  // Remember it on the caller's hub so the settings can list and re-run it.
  let sources = c.hub?.meta?.sources ?? [];
  if (c.hub) {
    const key = (s: Rec) => `${s.url}|${s.type}|${s.owner}|${s.sector ?? ''}|${s.fn ?? ''}`;
    const prev = sources.find((s: Rec) => key(s) === `${body.url}|${type}|${owner}|${scope.sector}|${scope.fn}`);
    const entry = {
      id: prev?.id ?? crypto.randomUUID(), url: body.url, type, owner, sector: scope.sector, fn: scope.fn,
      itemsPath: mapping.itemsPath, fields: mapping.fields,
      last_import_at: c.client.now(), last_count: result.created + result.updated,
    };
    sources = [entry, ...sources.filter((s: Rec) => s.id !== entry.id)].slice(0, MAX_SOURCES);
    await c.client.put('hubs', c.hub.id, { meta: { ...c.hub.meta, sources }, updated_at: c.client.now() });
  }
  return json({ ...result, owner, mapping, sources });
}

/**
 * Rows the caller shaped itself (svc-learn: the shop's products, a CSV) → upsertKnow — row id = owner + item id, so a
 * re-sync overwrites the same rows and appends new ones; FTS, chunks, vectors (unchanged content skipped) and `rel`
 * tag links come with it. `source` names the sync; `prune` (sent on a sync's LAST batch, `since` = the first batch's
 * `startedAt`) soft-deletes that source's rows the sync no longer sent. Shared platform knowledge (owner '') keeps the
 * record id as-is (keepIds) — the same id services/know-sync.js writes when an admin saves one record.
 */
async function importItems(request: Request, env: HubsEnv, body: Rec): Promise<Response> {
  const c = await callerOf(request, env);
  const wantsOther = body.owner != null && body.owner !== (c.hub?.id ?? c.user.userId);
  if (wantsOther && !c.isAdmin) return badRequest('You can only import into your own knowledge.', 403);
  if (!c.isAdmin && !hubActive(c.hub)) return badRequest('No active hub — buy a plan (or reissue your token) first.', 402);
  const owner = wantsOther ? String(body.owner) : c.user.userId;
  const source = String(body.source ?? '').trim().slice(0, 200);
  if (!source) return badRequest('`source` is required — it names the sync, so `prune` only touches its own rows.');
  const items = Array.isArray(body.items) ? body.items : null;
  if (!items) return badRequest('`items` must be a list.');
  const scope = knowScopeOf(body);
  const startedAt = c.client.now(); // before any write — rows this call writes are stamped >= it

  const result = items.length
    ? await upsertKnow(env, owner, items, { type: body.type, source, keepIds: owner === '', ...scope })
    : { created: 0, updated: 0, skipped: 0, indexed: 0, unchanged: 0, related: 0, ids: [] as string[] };
  const pruned = body.prune ? await pruneKnow(env, owner, source, typeof body.since === 'string' && body.since ? body.since : startedAt) : 0;
  return json({ ...result, pruned, owner, startedAt });
}

async function reindex(request: Request, env: HubsEnv, body: Rec): Promise<Response> {
  const c = await callerOf(request, env);
  const wantsOther = body.owner != null && body.owner !== c.user.userId;
  if (wantsOther && !c.isAdmin) return badRequest('You can only reindex your own knowledge.', 403);
  if (!c.isAdmin && !hubActive(c.hub)) return badRequest('No active hub.', 402);
  const owner = wantsOther ? String(body.owner) : c.user.userId;
  return json({ owner, ...(await reindexKnow(env, owner, { force: Boolean(body.force), after: body.after, limit: body.limit })) });
}

/** The sites allowed to run a hub's embedded assistant (fn/access.ts embedHostOk) — its own hub, or any hub for an admin. */
async function setDomains(request: Request, env: HubsEnv, body: Rec): Promise<Response> {
  const c = await callerOf(request, env);
  const owner = body.owner != null && body.owner !== '' ? String(body.owner) : c.user.userId;
  if (owner !== c.user.userId && !c.isAdmin) return badRequest('You can only change your own hub.', 403);
  const target = owner === c.hub?.id ? c.hub : await c.client.findById('hubs', owner);
  if (!target) return badRequest('No hub — activate MCP first.', 404);
  if (!Array.isArray(body.domains)) return badRequest('`domains` must be a list of site hosts.');
  if (body.domains.length > MAX_DOMAINS) return badRequest(`At most ${MAX_DOMAINS} sites.`);
  const domains: string[] = [];
  for (const raw of body.domains) {
    const host = typeof raw === 'string' ? parseHost(raw.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').replace(/\/.*$/, '')) : null;
    if (!host) return badRequest(`Not a site host: ${String(raw).slice(0, 80)}`);
    if (!domains.includes(host)) domains.push(host);
  }
  await c.client.put('hubs', target.id, { meta: { ...hubMeta(target), domains }, updated_at: c.client.now() });
  return json({ owner: target.id, domains });
}

async function removeSource(request: Request, env: HubsEnv, body: Rec): Promise<Response> {
  const c = await callerOf(request, env);
  if (!c.hub) return badRequest('No hub.', 404);
  const sources = (c.hub.meta?.sources ?? []).filter((s: Rec) => s.id !== body.id);
  await c.client.put('hubs', c.hub.id, { meta: { ...c.hub.meta, sources }, updated_at: c.client.now() });
  return json({ sources });
}
