/**
 * Per-table config driving the generic /v1/data/:table dispatcher (data.ts) and D1Client (d1.ts) —
 * one place to look up trust level + column coercion for any of the tables this Worker serves,
 * instead of scattering table-name branches through the request-handling code.
 *
 * Trust levels mirror worker/src/db.ts's existing split for the analogous Firestore connections:
 *   - talks: the group chat + jobs — run ONLY through /v1/fn/* (owner from the JWT, status derived server-side, D6).
 *     This generic route is read-only for admins (`write: 'none'`): nobody PATCHes status/approved/reviewed here (S5/S9).
 *   - divisions: one row per department face ('<sector>.<fn>', owner '' platform / hub id). Read is PUBLIC (names,
 *     avatars); `meta` (the override patch = private expertise) and `ai` (legacy raw key) are privateCols AND
 *     lockedCols — never shown to guests, never written here; admins edit them through /v1/fn/override (validated).
 *   - know/rel: like 'DB_LLM' (mind/customers) — svc-aide.js reads this data with no session at
 *     all too; writes (from /admin/knowledge) need admin auth OR a `know.*`/`rel.*` capability
 *     token (`tableScoped: true`) — bundled under 'products' (TABLE_BUNDLES), same mechanism as
 *     `talks` used before Task 16 (Phase 2 lockdown): a token in `profiles.roles` written by
 *     Firestore-side `services/schemas/roles-constant.js`, accepted here without a full 'admin' role.
 *   - hubs: admin-only here (token hashes, billing snapshots) — a customer reads/updates their own hub
 *     through hubs.ts's /v1/hubs/* routes instead, never this generic route.
 *   - products/posts/invoices/finance_reports are NOT here — they live on the auth (DB_ALL),
 *     see src/packages/llm/tool/server.js's serverOf().
 */

export type TableName = 'divisions' | 'talks' | 'know' | 'rel' | 'hubs' | 'artifacts';

export interface TableConfig {
  jsonCols: string[];
  boolCols: string[];
  read: 'public' | 'admin';
  write: 'admin' | 'none'; // 'none' = no generic writes at all (the table is run by /v1/fn/*)
  // When true, a caller doesn't need the global 'admin' role — holding any `{table}.*` capability
  // token (see roles.ts's hasAccess()) on their `profiles.roles` also passes. 'know'/'rel' need this
  // today (bundled under 'products', see the file header comment above); 'talks' used to (pre-Task-16).
  tableScoped?: boolean;
  // Stripped from responses to callers who didn't authenticate as admin/table-scoped.
  privateCols?: string[];
  // Never written through the generic route — dropped from PATCH/_batch bodies (their own /v1/fn route validates them).
  lockedCols?: string[];
}

export const TABLES: Record<TableName, TableConfig> = {
  // meta = override patch (private expertise, S1) · ai = legacy raw key (S3) — hidden from guests, never written here.
  divisions: { jsonCols: ['meta'], boolCols: [], read: 'public', write: 'admin', privateCols: ['meta', 'ai'], lockedCols: ['meta', 'ai'] },
  // Run through /v1/fn/* only (owner-checked, derived status) — admins may still read it here.
  talks: { jsonCols: ['fields'], boolCols: ['approved', 'resumed', 'trial'], read: 'admin', write: 'none' },
  // source = the API URL a row was imported from (may carry a key in its query) — S12.
  know: { jsonCols: ['meta'], boolCols: [], read: 'public', write: 'admin', tableScoped: true, privateCols: ['source'] },
  rel: { jsonCols: ['meta'], boolCols: [], read: 'public', write: 'admin', tableScoped: true },
  // Paying customers + their MCP token hash — admin-only on the generic route; owners go through hubs.ts.
  hubs: { jsonCols: ['meta'], boolCols: [], read: 'admin', write: 'admin' },
  // Handoffs — written only by /v1/fn/* (approve, verify; owner-checked): admins may read them here, nobody writes (P3-7).
  artifacts: { jsonCols: ['data'], boolCols: [], read: 'admin', write: 'none' },
};

export function isTableName(table: string): table is TableName {
  return Object.prototype.hasOwnProperty.call(TABLES, table);
}
