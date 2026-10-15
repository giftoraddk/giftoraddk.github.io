/**
 * Parses a pipe-separated roles string ("posts.read|admin") on a `profiles` row — enforces the SAME
 * role rules the app's frontend already uses for UI gating, server-side so it can't be bypassed by
 * calling the API directly. Trimmed down from ../../../llm/worker/src/lib/roles.ts to just what
 * profiles.ts needs — this worker has exactly one table, so the per-table capability allowlist
 * (canWriteTable/TABLE_CAPABILITY) that file has doesn't apply here.
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
