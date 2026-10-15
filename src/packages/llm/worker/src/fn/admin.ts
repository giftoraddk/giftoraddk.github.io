/**
 * /v1/fn/override — the platform's override of one department (admin only):
 *   GET  /v1/fn/override/:division[?owner=] → { id, sector, fn, owner, kind, face, patch, persona }
 *   POST /v1/fn/override           { division, owner?, patch?, face? } — a given patch is validated + dry-run merged
 *                                  (override.ts) and REPLACES the stored one; no patch = keep it. face = name/description/avatar/on-off.
 * The row is divisions(id '<sector>.<fn>', owner ''). owner '@<host>' = one platform site's own row (fn/access.ts
 * siteOfOwner, id '<sector>.<fn>@<host>') — layered over the platform's like any owner's (talk.ts consultReply / faces), so
 * the homepage assistant gets its own persona and face without changing every other assistant's. `meta` holds the patch
 * and never leaves through /v1/data (privateCols). Hub-owned override rows are already read by specFor(); writing them is
 * a later phase.
 */
import { json, HttpError } from '../lib/http';
import { D1Client } from '../d1';
import { readBody, OVERRIDE_BODY_MAX } from '../lib/body.ts';
import { resolveCaller } from './owner';
import { type FnEnv } from './routes';
import { parseDivisionId, resolveSpec } from './registry.ts';
import { validateOverride, parseFace, parsePatch } from './override.ts';
import { siteOfOwner } from './access.ts';
import type { Rec } from './types.ts';

const ADMIN_PATH = /^\/v1\/fn\/override(?:\/([A-Za-z0-9._-]{1,128}))?$/;

/** The row an admin edits: the platform's (owner '') or one platform site's ('@<host>') — never a hub's. */
function target(division: unknown, owner: unknown = '') {
  const parsed = parseDivisionId(typeof division === 'string' ? division : '');
  if (!parsed) throw new HttpError(404, 'Unknown division');
  const o = typeof owner === 'string' ? owner : '';
  if (o && !siteOfOwner(o)) throw new HttpError(400, "Unknown owner — '' or '@<site host>'");
  return { ...parsed, owner: o, id: `${parsed.sector}.${parsed.fn}${o}` };
}

async function overrideRow(env: FnEnv, owner: string, sector: string, fn: string): Promise<Rec | null> {
  return env.LLM_DB.prepare('SELECT * FROM divisions WHERE owner = ? AND sector = ? AND fn = ? AND deleted_at IS NULL LIMIT 1')
    .bind(owner, sector, fn).first<Rec>();
}

async function getOverride(env: FnEnv, division: string, owner: string | null): Promise<Response> {
  const t = target(division, owner ?? '');
  const row = await overrideRow(env, t.owner, t.sector, t.fn);
  const patch = parsePatch(row?.meta);
  // A site's persona shows as it answers: the platform patch under the site's own.
  const spec = t.owner ? resolveSpec(t.sector, t.fn, parsePatch((await overrideRow(env, '', t.sector, t.fn))?.meta), patch) : resolveSpec(t.sector, t.fn, patch);
  if (!spec) throw new HttpError(404, 'Unknown division');
  return json({
    id: t.id, sector: t.sector, fn: t.fn, owner: t.owner, kind: spec.kind,
    face: row ? { title: row.title, description: row.description, pics: row.pics, status: row.status, lang: row.lang } : null,
    patch,
    // Persona only exists for a chat department; a pipeline's overridden step/call text still reaches the admin
    // above, through `patch` — this key is simply null where there is no persona to show.
    persona: spec.kind === 'chat' ? { role: spec.role ?? '', principles: spec.principles ?? [] } : null,
  });
}

async function saveOverride(env: FnEnv, b: Rec): Promise<Response> {
  const t = target(b.division, b.owner);
  const base = resolveSpec(t.sector, t.fn);
  if (!base) throw new HttpError(404, 'Unknown division');
  // A stored patch was checked when it was saved (or copied by the migration) — only a new one is validated.
  if (b.patch !== undefined) {
    const error = validateOverride(base, b.patch);
    if (error) throw new HttpError(400, error);
  }
  const { face, error } = parseFace(b.face);
  if (error) throw new HttpError(400, error);
  const row = await overrideRow(env, t.owner, t.sector, t.fn);
  // The fallback id `<sector>.<fn>` may already belong to an unrelated row (legacy id, or another owner/sector/fn) —
  // an upsert by id alone would silently clobber it, so a mismatch is refused rather than overwritten.
  if (!row) {
    const clash = await env.LLM_DB.prepare('SELECT owner, sector, fn FROM divisions WHERE id = ? AND deleted_at IS NULL').bind(t.id).first<Rec>();
    if (clash && (clash.owner !== t.owner || clash.sector !== t.sector || clash.fn !== t.fn)) {
      throw new HttpError(409, 'A different row already owns this id');
    }
  }
  const at = new Date().toISOString();
  const data: Rec = {
    title: face.title ?? row?.title ?? '',
    description: face.description ?? row?.description ?? '',
    pics: face.pics ?? row?.pics ?? '',
    // A site's row leaves what it doesn't set blank — faces.ts mergeFaces then falls through to the platform row.
    status: face.status ?? row?.status ?? (t.owner ? '' : 'active'),
    lang: face.lang ?? row?.lang ?? (t.owner ? '' : 'vi'),
    meta: b.patch !== undefined ? b.patch : parsePatch(row?.meta),
    ai: '',
    sector: t.sector, fn: t.fn, owner: t.owner,
    created_at: row?.created_at ?? at, updated_at: at, deleted_at: null,
  };
  const id = String(row?.id ?? t.id);
  await new D1Client(env.LLM_DB).set('divisions', id, data);
  return json({ id, ...data });
}

export async function handleAdminRoute(request: Request, env: FnEnv, url: URL): Promise<Response | null> {
  const m = url.pathname.match(ADMIN_PATH);
  if (!m) return null;
  const caller = await resolveCaller(request, env);
  if (!caller.isAdmin) throw new HttpError(403, 'Admins only');
  if (request.method === 'GET' && m[1]) return getOverride(env, m[1], url.searchParams.get('owner'));
  if (request.method === 'POST' && !m[1]) return saveOverride(env, await readBody(request, OVERRIDE_BODY_MAX));
  throw new HttpError(405, 'Unsupported method/path combination');
}
