/**
 * Role/permission checks for this Worker's own routes — enforces the SAME role rules the app's
 * frontend already uses for UI gating (a '|'-separated `roles` string on the user record), just
 * server-side so it can't be bypassed by calling the API directly.
 *
 * Used by this Worker's `data.ts` (`/v1/data/:table` — flat admin gate via `isAdminCaller`; every
 * table there is either public-read/admin-write or admin-only, see this Worker's
 * `tablePolicy.ts`) and can be reused by any other route here that needs a per-table capability
 * check (`canWriteTable`) or a raw role/permission test (`hasAccess`).
 */

export interface RolesUser {
  roles?: string | null;
  status?: string | null;
}

export function parseRoles(user: RolesUser | string | null | undefined) {
  const rolesStr = typeof user === 'string' ? user : user?.roles;
  const roles = (rolesStr || '').split('|').filter(Boolean);
  return { roles, isAdmin: roles.includes('admin'), hasAnyPerm: roles.some(r => r.includes('.')) };
}

/** True if `roles[]` grants `require` — exact match or as a namespace prefix ("posts.read" satisfies "posts"). */
export function hasAccess(roles: string[], require: string) {
  if (!require) return false;
  return roles.some(r => r === require || r.startsWith(require + '.'));
}

/**
 * Authorization gate for table writes. `admin` always passes (parseRoles().isAdmin). Two ways a
 * non-admin can write a table:
 *   1. Any `{table}.*` capability token — same shorthand the frontend's role management writes for
 *      its per-table Editor/Moderator/Admin presets — e.g. `products.admin` grants writes on
 *      'products'.
 *   2. TABLE_CAPABILITY below — a narrower LEGACY allowlist for the couple of tables that predate
 *      that per-table system and use a differently-named capability than their own table name
 *      (`invoice`/`orders`, capability `*.write` not `*.admin`/`*.read`/...). New tables should
 *      just get their per-table capability granted via the frontend's role management (path 1)
 *      instead of an entry here.
 * `revisions` is a special case: revision/snapshot docs have no field naming which primary table
 * they belong to (just `record_id`), so there's nothing to check per-table capability against —
 * any caller with SOME per-table permission (hasAnyPerm) may write their own edit's revision trail.
 */
const TABLE_CAPABILITY: Record<string, string> = {
  invoice: 'invoice.write',
  invoices: 'invoice.write',
  orders: 'orders.write',
};

export function canWriteTable(user: RolesUser, table: string) {
  const { roles, isAdmin, hasAnyPerm } = parseRoles(user);
  if (user.status !== 'active') return false;
  if (isAdmin) return true;
  if (hasAccess(roles, table)) return true;
  if (table === 'revisions' && hasAnyPerm) return true;
  const required = TABLE_CAPABILITY[table];
  if (!required) return false; // no entry → default deny, not default allow
  return hasAccess(roles, required);
}

/**
 * Tables an anonymous guest caller (no Supabase session at all) may write to — e.g. `customers`
 * (phone lead capture). Kept at the same trust level such writes already run at in the browser
 * client (gated only by the destination store's own rules, not a login wall).
 */
const GUEST_WRITABLE_TABLES = new Set(['customers']);

export function isGuestWritable(table: string) {
  return GUEST_WRITABLE_TABLES.has(table);
}

/** Flat admin gate for /v1/data/:table (D1) — every table there is public-read/admin-write or
 *  admin-only, no finer-grained capability needed (unlike canWriteTable's per-table allowlist). */
export function isAdminCaller(user: RolesUser | null): boolean {
  if (!user || user.status !== 'active') return false;
  return parseRoles(user).isAdmin;
}
