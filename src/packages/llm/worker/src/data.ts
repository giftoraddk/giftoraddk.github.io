/**
 * /v1/data/:table[/:id] — generic CRUD proxy backing this domain's D1-backed services
 * (svc-aide.js, svc-learn.js, svc-finance-report.js, tool/know-sync.js, tool/rel-sync.js) —
 * see tablePolicy.ts for the per-table read/write trust level (divisions/talks/know/rel).
 * `talks` is read-only here (write: 'none') — svc-talk.js runs departments through /v1/fn/*
 * instead (owner from the JWT, status derived server-side), never this generic route.
 *
 * No DELETE verb: soft-delete rides PATCH, same as everywhere else in this app —
 * FirestoreService.delete() (src/services/crud.js) calls the adapter's put()/PATCH with
 * { deleted_at, updated_at } rather than a dedicated delete transport call.
 *
 * PATCH /v1/data/:table/:id is an UPSERT (create-if-missing, update-if-present), routed below to
 * D1Client.upsert() (UPDATE the sent columns, INSERT when 0 rows changed) — NOT D1Client.put() (UPDATE-only,
 * silently affects 0 rows when the id doesn't exist yet) nor set() (its INSERT half trips NOT NULL on partial bodies). This is a deliberate departure from astro-micro's
 * own PUT/PATCH-to-method mapping (its data.ts routes PATCH -> D1Client.put()), required because
 * every already-ported client in this domain (tool/know-sync.js, tool/rel-sync.js,
 * svc-aide.js, svc-talk.js) calls PATCH expecting "create if missing" semantics.
 *
 * GET /v1/data/:table?<key>=<value>... filters rows by exact-match on each query-string key,
 * translated to a D1 WHERE clause via d1.ts's find(). This is the formalized contract every
 * client in this domain actually uses (see requester.js's `_qs()` — plain key=value pairs, never a
 * JSON-blob `opts=` param), so it's implemented directly rather than astro-micro's original
 * `?opts=<json>` shape (kept there but unused by any ported client).
 */
import { requireAuth, AuthError } from './lib/auth';
import { isAdminCaller, hasAccess, parseRoles } from './lib/roles';
import { findCallerProfile } from './lib/profile';
import { readBody, DATA_BODY_MAX } from './lib/body';
import { D1Client, type QueryOpts } from './d1';
import { columnsOf, unknownKeys, stripCols, dropLocked, keepKnown, ownerLockFor, rejectPrivateFilters, redactPricing } from './columns';
import { TABLES, isTableName, type TableName } from './tablePolicy';
import { syncKnowIndex, removeKnowIndex, type VectorizeEnv, type KnowRow } from './vectorize';
import { ownerAccess, deniedResponse } from './fn/owner';

/** ?owner= value meaning "the shared platform rows" (owner '') — see handleDataRoute. Same constant: llm/svc-division.js. */
export const SHARED_OWNER = '@shared';
import { parseKnowScope } from './fn/registry';

export interface DataEnv extends VectorizeEnv {
  LLM_DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH';

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ message }), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Whether `userId` (an already-verified JWT subject, '' = none) is an active admin, or a `{table}.*` holder
 *  of a tableScoped table — the one "full access" check shared by writes and by privateCols/ownership reads. */
async function isTrusted(env: DataEnv, table: TableName, userId: string): Promise<boolean> {
  if (!userId) return false;
  const profile = await findCallerProfile(env, userId);
  const scoped = !!TABLES[table].tableScoped && profile?.status === 'active' && hasAccess(parseRoles(profile).roles, table);
  return isAdminCaller(profile) || scoped;
}

export async function handleDataRoute(
  request: Request,
  env: DataEnv,
  table: string,
  idOrBatch: string | undefined,
  ctx: ExecutionContext,
): Promise<Response> {
  if (!isTableName(table)) return badRequest('Unknown table', 404);
  const cfg = TABLES[table];
  const method = request.method as Method;
  const isBatch = idOrBatch === '_batch';
  const id = isBatch ? undefined : idOrBatch;
  const isWrite = method !== 'GET';
  const url = new URL(request.url);

  // talks is run by /v1/fn/* only (owner from the JWT, derived status — D6): readable here, never writable.
  if (isWrite && cfg.write === 'none') return badRequest('This table is written through /v1/fn/* only', 405);

  // read:'public' tables (know/rel/divisions) allow anonymous GET (svc-aide.js's guest widget) — same
  // trust level the app already runs 'mind'/DB_LLM at. Every write on every table here requires an authenticated admin caller (see
  // tablePolicy.ts — there is no guest-writable table for THIS route family, unlike roles.ts's
  // `customers` exception which only applies to db-worker's tables).
  const needsAuth = isWrite ? cfg.write === 'admin' : cfg.read === 'admin';
  // The verified JWT subject, '' = guest/unauthenticated — resolved at most once per request and reused below
  // (privateCols stripping, the know/rel owner lock, ownerAccess) so a token is never verified twice.
  let callerId = '';
  let trusted = false;
  if (needsAuth) {
    const verified = await requireAuth(request, env.SUPABASE_URL); // throws AuthError -> 401 if missing/invalid
    callerId = verified.userId;
    trusted = await isTrusted(env, table, callerId);
    if (!trusted) throw new AuthError('Forbidden');
  }

  let body: any = null;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    body = await readBody(request, DATA_BODY_MAX); // admin-only writes; generous for CSV/batch knowledge imports
    // SQLite column names are case-insensitive — a differently-cased key (e.g. "META") would still write the
    // real column, silently bypassing dropLocked below (which only strips an exact-case match). Keep exact-case
    // columns only; svc-resources's generic extras (actors, user_id, …) are dropped the same way.
    body = keepKnown(body, await columnsOf(env.LLM_DB, table), isBatch);
  }
  if (cfg.lockedCols?.length) body = dropLocked(body, cfg.lockedCols, isBatch);
  // A know row's sector / fn decide which departments (and, for fn = 'finance', whether guests) read it — the same
  // validation as import / MCP (fn/registry.ts parseKnowScope), so a typo is refused instead of stored.
  if (table === 'know' && body && knowScopeInvalid(body, isBatch)) return badRequest('Unknown sector or department (fn)');

  // A second trust check, only for a read that could actually need one — a table with no privateCols and no
  // ownership scoping (e.g. talks, hubs, artifacts) never pays for a profile lookup on a plain GET, and a write
  // already resolved (and required) trust above.
  const ownerScoped = table === 'know' || table === 'rel';
  if (!isWrite && !needsAuth && (cfg.privateCols?.length || ownerScoped) && request.headers.get('Authorization')) {
    try {
      callerId = (await requireAuth(request, env.SUPABASE_URL)).userId;
      trusted = await isTrusted(env, table, callerId);
    } catch {
      // an expired / bad token reads like a guest
    }
  }

  // privateCols never reach a guest; a signed-in admin / table-scoped caller of a public table still gets the full row.
  const strip = trusted ? [] : cfg.privateCols ?? [];

  // S12: know/rel are public-read, but a caller who is neither admin/table-scoped nor reading their OWN owner's
  // rows may only ever see owner '' (shared platform knowledge), or another owner ownerAccess() accepts for
  // them (an active hub that still allows embedding, or an admin) — never "every hub's rows" via an arbitrary ?owner=.
  let ownerLock: string | null = null;
  // `?owner=@shared` = only the shared platform rows (owner ''). An empty ?owner= never arrives (clients drop empty
  // params, d1 filters skip them), so without this a trusted reader of '' got every hub's rows to filter itself.
  const shared = !isWrite && ownerScoped && url.searchParams.get('owner') === SHARED_OWNER;
  if (shared) url.searchParams.delete('owner');
  if (shared && trusted) ownerLock = '';
  if (!isWrite && ownerScoped && !trusted) {
    const requested = url.searchParams.get('owner') || '';
    const denied = requested ? await ownerAccess(request, env, requested, callerId, ctx) : null;
    if (denied) return deniedResponse(denied);
    ownerLock = ownerLockFor(trusted, ownerScoped, requested);
  }
  // A hub reading exactly its own rows (svc-division etc. — the JWT subject equals the pinned owner) still gets
  // its own drafts, finance rows and true cost; every other untrusted read of `know` is redacted (below).
  const selfRead = ownerLock !== null && !!callerId && callerId === ownerLock;
  const restrictKnow = table === 'know' && !trusted && !selfRead;

  const client = new D1Client(env.LLM_DB);
  return _dispatch(client, table, method, id, isBatch, body, url, env, ctx, { strip, ownerLock, restrictKnow });
}

/** Any written know row whose sector / fn (when the write sets them) isn't a valid scope. A partial PATCH setting only
 *  one of the two is checked on its own — the pairing rule (a sector that disables that fn) applies when both are sent. */
function knowScopeInvalid(body: any, isBatch: boolean): boolean {
  const rows: Record<string, unknown>[] = isBatch ? (body?.items ?? []).map((i: any) => i?.data ?? {}) : [body];
  return rows.some(r => ('sector' in r || 'fn' in r) && !parseKnowScope(r.sector ?? '', r.fn ?? ''));
}

/** Best-effort re-index after a `know` write (chunks + vectors + FTS, skipped when the content hash is
 *  unchanged) — never awaited by the response, see vectorize.ts's header. No-op for every other table. */
function _syncKnowAfterWrite(env: VectorizeEnv, ctx: ExecutionContext, table: TableName, client: D1Client, id: string): void {
  if (table !== 'know') return;
  ctx.waitUntil(
    client.findById(table, id).then(async row => { if (row) await syncKnowIndex(env, [row as KnowRow]); else await removeKnowIndex(env, [id]); }),
  );
}

interface ReadGuard {
  strip: string[];
  ownerLock: string | null;
  // Untrusted, non-self read of `know`: pin status='active', exclude fn='finance', redact meta.pricing's cost.
  restrictKnow: boolean;
}

async function _dispatch(
  client: D1Client,
  table: TableName,
  method: Method,
  id: string | undefined,
  isBatch: boolean,
  body: any,
  url: URL,
  env: DataEnv,
  ctx: ExecutionContext,
  guard: ReadGuard,
): Promise<Response> {
  const { strip, ownerLock, restrictKnow } = guard;
  if (isBatch && method === 'POST') {
    const items: { id: string; data: Record<string, unknown> }[] = body?.items ?? [];
    await client.batch(table, items);
    for (const item of items) _syncKnowAfterWrite(env, ctx, table, client, item.id);
    return new Response(null, { status: 204 });
  }
  if (method === 'GET' && id) {
    let found = await client.findById(table, id);
    // ownerLock (know/rel, S12): a row of another owner is invisible to this caller — same as not found.
    if (ownerLock !== null && found && String(found.owner ?? '') !== ownerLock) found = null;
    // A draft or finance-fn row, or its true cost, never reaches an untrusted non-owner reader.
    if (restrictKnow && found && (found.status !== 'active' || found.fn === 'finance' || found.type === 'finance')) found = null;
    if (restrictKnow && found) found = { ...found, meta: redactPricing(found.meta) };
    const row = stripCols(found, strip);
    return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'GET') {
    // Every query-string key is an exact-match filter (see this file's header) — e.g.
    // `?type=faq&status=active` -> { filters: { type: 'faq', status: 'active' } }. Empty values are
    // dropped up front since find() ignores them too, so they never trip the unknown-column check.
    const filters: Record<string, unknown> = {};
    for (const [k, v] of url.searchParams.entries()) if (v !== '') filters[k] = v;
    if (Object.keys(filters).length) {
      // A guest must not even FILTER by a column stripped from their view (know.source, divisions.meta/ai) —
      // matching on a guessed value would be an exact-match oracle for it, even without seeing it in the response.
      const badPriv = rejectPrivateFilters(Object.keys(filters), strip);
      if (badPriv.length) return badRequest(`Filtering by ${badPriv.join(', ')} is not allowed`);
      const bad = unknownKeys(Object.keys(filters), await columnsOf(env.LLM_DB, table));
      if (bad.length) return badRequest(`Unknown filter column: ${bad.join(', ')}`);
    }
    // pin/exclude are always applied, even for an empty-string value — unlike `filters` above, which silently
    // drops one (d1.ts's find()), so "pinned to owner ''" can never collapse into "no restriction at all".
    const pin: Record<string, string> = {};
    const exclude: Record<string, string> = {};
    if (ownerLock !== null) pin.owner = ownerLock;
    if (restrictKnow) { pin.status = 'active'; exclude.fn = 'finance'; exclude.type = 'finance'; } // type: rows synced by know-sync.js carry fn ''
    const opts: QueryOpts = {
      ...(Object.keys(filters).length ? { filters } : {}),
      ...(Object.keys(pin).length ? { pin } : {}),
      ...(Object.keys(exclude).length ? { exclude } : {}),
    };
    const rows = (await client.find(table, opts)) as Record<string, any>[];
    const shaped = restrictKnow ? rows.map(r => ({ ...r, meta: redactPricing(r.meta) })) : rows;
    return new Response(JSON.stringify(shaped.map(r => stripCols(r, strip))), { headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'POST' && !id) {
    const created = await client.add(table, body);
    _syncKnowAfterWrite(env, ctx, table, client, created.id);
    return new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'PUT' && id) {
    await client.set(table, id, body);
    _syncKnowAfterWrite(env, ctx, table, client, id);
    return new Response(null, { status: 204 });
  }
  if (method === 'PATCH' && id) {
    // Upsert — see this file's header: partial UPDATE if the row exists, INSERT if not.
    await client.upsert(table, id, body);
    if (table === 'know' && body?.deleted_at) {
      // Soft-delete — no point re-reading the row just to see deleted_at is set, drop the vector directly.
      ctx.waitUntil(removeKnowIndex(env, [id]));
    } else {
      _syncKnowAfterWrite(env, ctx, table, client, id);
    }
    return new Response(null, { status: 204 });
  }
  return badRequest('Unsupported method/path combination', 405);
}
