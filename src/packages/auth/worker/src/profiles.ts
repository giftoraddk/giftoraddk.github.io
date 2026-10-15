/**
 * /v1/data/profiles[/:id] — Supabase `profiles` table proxy, backing src/packages/auth/svc-auth.js
 * (client). Ported from astro-micro's worker/packages/db-worker/src/db.ts's 'DB_ACC' branch — the
 * ONLY connection that applies here (this repo has no Firestore involvement anywhere, unlike
 * astro-micro's db.ts which also proxies legacy Firestore connections 'DB_ALL'/'DB_LLM' — that half
 * is intentionally not ported, matching every other "no crud.js multi-backend adapter" port in this
 * repo, see src/packages/llm's own worker header comments).
 *
 * Auth policy: every request needs a valid Supabase JWT (`Authorization: Bearer <token>`) — profile/
 * role data is never public, unlike llm's `know`/`rel` tables. A non-admin caller may only
 * read/write THEIR OWN row, and only the fields in SELF_EDITABLE_FIELDS — `roles`/`status` are
 * always server-controlled (see _sanitize), so a self-write can never smuggle a privilege escalation.
 *
 * Method contract matches this app's other Worker (`llm/worker/src/data.ts`) for a consistent
 * client-side shape: GET (list/by-id) + PATCH as upsert (create-or-update) — no separate POST/PUT.
 */
import { requireAuth, AuthError } from './lib/auth';
import { parseRoles, type RolesUser } from './lib/roles';
import { SupabaseTableClient } from './supabaseTable';

export interface ProfilesEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

type Method = 'GET' | 'PATCH';

// Fields a non-admin caller may write on THEIR OWN row. `notes` — their own canvas nodes (svc-node-builder.js).
const SELF_EDITABLE_FIELDS = new Set(['display_name', 'avatar', 'email', 'username', 'meta', 'connections', 'notes']);

// Never self-editable by value, but a caller-supplied doc (e.g. first-time signup) is allowed to
// CONTAIN these keys — _sanitize() unconditionally strips whatever value was sent and re-injects
// safe server-chosen defaults, so their presence here can't smuggle a privilege escalation.
const SANITIZED_FIELDS = new Set(['roles', 'status']);

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ message }), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleProfilesRoute(request: Request, env: ProfilesEnv, id: string | undefined): Promise<Response> {
  const method = request.method as Method;
  const verified = await requireAuth(request, env.SUPABASE_URL);
  const supa = new SupabaseTableClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const caller = (await supa.findById('profiles', verified.userId)) as RolesUser | null;

  let body: any = null;
  if (method === 'PATCH') {
    try { body = await request.json(); } catch { return badRequest('Invalid JSON body'); }
  }

  _authorize(caller, verified.userId, method, id, body);
  if (method === 'PATCH') body = _sanitize(caller, verified.userId, id, body);

  return _dispatch(supa, method, id, body);
}

function _authorize(caller: RolesUser | null, callerId: string, method: Method, id: string | undefined, body: any) {
  const { isAdmin } = parseRoles(caller ?? {});
  if (isAdmin) return; // admins may read/write any row

  if (method === 'GET') {
    if (id) { if (id !== callerId) throw new AuthError('Forbidden'); return; }
    throw new AuthError('Forbidden'); // full-table listing is admin-only
  }

  const targetId = id ?? body?.id;
  if (targetId !== callerId) throw new AuthError('Forbidden');
  const disallowed = Object.keys(body ?? {}).filter(k => k !== 'id' && !SELF_EDITABLE_FIELDS.has(k) && !SANITIZED_FIELDS.has(k));
  if (disallowed.length) throw new AuthError(`Cannot self-edit field(s): ${disallowed.join(', ')}`);
}

/** Strips + re-injects roles/status so a self-write can never smuggle a privilege escalation,
 *  whether creating (find-or-create on first login) or updating an existing row. */
function _sanitize(caller: RolesUser | null, callerId: string, id: string | undefined, body: any) {
  const { isAdmin } = parseRoles(caller ?? {});
  if (isAdmin) return body;
  const { roles: _roles, status: _status, ...safe } = body ?? {};
  const isSelf = (id ?? body?.id) === callerId;
  if (isSelf && !caller) return { ...safe, roles: 'user', status: 'active' }; // first-time signup row
  return safe; // existing row — roles/status simply untouched, not overwritten
}

async function _dispatch(supa: SupabaseTableClient, method: Method, id: string | undefined, body: any): Promise<Response> {
  if (method === 'GET' && id) {
    const row = await supa.findById('profiles', id);
    return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'GET') {
    const rows = await supa.find('profiles');
    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'PATCH' && id) {
    await supa.set('profiles', id, body); // upsert — create-or-update, per this app's /v1/data/:table/:id contract
    return new Response(null, { status: 204 });
  }
  return badRequest('Unsupported method/path combination', 405);
}
