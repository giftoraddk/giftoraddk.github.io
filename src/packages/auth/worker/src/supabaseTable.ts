/**
 * PostgREST-based client for the Supabase `profiles` table. Ported from astro-micro's
 * worker/packages/shared/src/supabaseTable.ts, trimmed to the 4 operations profiles.ts actually
 * uses (find/findById/set — `add`/`put`/`batch`/`now` dropped, no caller here).
 *
 * Always uses the Supabase SERVICE ROLE key — this bypasses Row Level Security entirely, which is
 * the point: the Worker itself (having verified the caller's Supabase JWT and, for privileged
 * fields, their role via lib/roles.ts) is the trust boundary here, not Postgres RLS. Never send
 * this key to the browser.
 */
export interface QueryOpts {
  filters?: Record<string, unknown>;
}

export class SupabaseTableClient {
  constructor(private supabaseUrl: string, private serviceRoleKey: string) {}

  private _headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async find(table: string, opts: QueryOpts = {}): Promise<Record<string, any>[]> {
    const params = new URLSearchParams({ select: '*' });
    for (const [k, v] of Object.entries(opts.filters ?? {})) {
      if (v == null || v === '') continue;
      params.append(k, `eq.${v}`);
    }
    const res = await fetch(`${this.supabaseUrl}/rest/v1/${table}?${params}`, { headers: this._headers() });
    if (!res.ok) throw new Error(`Supabase query ${res.status}: ${await res.text()}`);
    const rows = await res.json<Record<string, any>[]>();
    return rows.filter(r => r.deleted_at == null);
  }

  async findById(table: string, id: string): Promise<Record<string, any> | null> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`, { headers: this._headers() });
    if (!res.ok) throw new Error(`Supabase query ${res.status}: ${await res.text()}`);
    const rows = await res.json<Record<string, any>[]>();
    const row = rows[0] ?? null;
    return row && row.deleted_at == null ? row : null;
  }

  /** Rows whose id is in `ids` (PostgREST `in.(…)`), only the `select` columns — one round trip for a join. */
  async findByIds(table: string, ids: string[], select = '*'): Promise<Record<string, any>[]> {
    if (!ids.length) return [];
    const list = ids.map(id => `"${id.replace(/"/g, '')}"`).join(',');
    const params = new URLSearchParams({ select, id: `in.(${list})` });
    const res = await fetch(`${this.supabaseUrl}/rest/v1/${table}?${params}`, { headers: this._headers() });
    if (!res.ok) throw new Error(`Supabase query ${res.status}: ${await res.text()}`);
    return res.json<Record<string, any>[]>();
  }

  /** Create or overwrite a row at a known id — upsert via `Prefer: resolution=merge-duplicates`. */
  async set(table: string, id: string, data: Record<string, unknown>): Promise<void> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: this._headers({ Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
  }
}
