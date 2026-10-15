import type { RolesUser } from './roles';

export interface ProfileEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * Looks up the caller's `profiles` row via Supabase's PostgREST API (service-role key, bypasses
 * RLS — this Worker is the trust boundary, same rationale as astro-micro's shared
 * SupabaseTableClient). Behavior matches `SupabaseTableClient.findById('profiles', id)` exactly:
 * lookup by id, soft-delete-aware.
 *
 * A leaf module (imports nothing from data.ts or fn/*): data.ts and fn/owner.ts both need this
 * lookup, and importing it from data.ts (its original home) would make them import each other —
 * fn/owner.ts already needs data.ts's `DataEnv` type, and data.ts needs fn/owner.ts's `ownerAccess`
 * (S12's know/rel owner lock). Giving the shared piece its own home avoids that cycle entirely.
 */
export async function findCallerProfile(env: ProfileEnv, userId: string): Promise<RolesUser | null> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase query ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as Record<string, any>[];
  const row = rows[0] ?? null;
  return row && row.deleted_at == null ? (row as RolesUser) : null;
}
