/** Real columns of a D1 table (PRAGMA, cached per isolate) — the /v1/data filter contract is "exact match on a column". */
const cache = new Map<string, Set<string>>();

export async function columnsOf(db: D1Database, table: string): Promise<Set<string>> {
  let cols = cache.get(table);
  if (!cols) {
    const { results } = await db.prepare(`PRAGMA table_info("${table.replace(/"/g, '""')}")`).all<{ name: string }>();
    cols = new Set((results ?? []).map(r => r.name));
    if (cols.size) cache.set(table, cols); // a missing table returns 0 rows — never cache that, or it 400s forever
  }
  return cols;
}

export const unknownKeys = (keys: string[], cols: Set<string>) => keys.filter(k => !cols.has(k));

/** Drop admin-only columns (e.g. a raw provider key) before a row reaches an unauthenticated caller. */
export function stripCols(row: Record<string, any> | null, cols: string[]): Record<string, any> | null {
  if (!row || !cols.length) return row;
  const out = { ...row };
  for (const c of cols) delete out[c];
  return out;
}

/** Drop columns the generic route may never write — they have their own validated /v1/fn route (PATCH body or _batch body). */
/**
 * Keep only the write-body keys that are exact-case real columns (single body or each `_batch` item's data).
 * SQLite column names are case-insensitive, so a "META" key would otherwise still write `meta` past dropLocked;
 * dropping (not rejecting) also lets svc-resources's generic extras (`actors`, `user_id`, `scope`, `secure`) through.
 */
export function keepKnown(body: any, cols: Set<string>, isBatch: boolean): any {
  if (!body || typeof body !== 'object') return body;
  const clean = (data: Record<string, any>) => Object.fromEntries(Object.entries(data ?? {}).filter(([k]) => cols.has(k)));
  if (isBatch) return { ...body, items: (body.items ?? []).map((it: any) => ({ ...it, data: clean(it?.data ?? {}) })) };
  return clean(body);
}

export function dropLocked(body: any, cols: string[], isBatch: boolean): any {
  if (!body || typeof body !== 'object' || !cols.length) return body;
  const clean = (data: Record<string, any>) => {
    const out = { ...data };
    for (const c of cols) delete out[c];
    return out;
  };
  if (isBatch) return { ...body, items: (body.items ?? []).map((it: any) => ({ ...it, data: clean(it?.data ?? {}) })) };
  return clean(body);
}

/**
 * Whose `know`/`rel` rows an untrusted GET (data.ts) may see, always as a `pin` (never a `filters` entry — D1Client
 * .find() silently drops a filter whose value is '', which would turn "pin to shared knowledge" into "no
 * restriction at all"). `requested` must already be ownerAccess()-checked by the caller; this function only
 * decides WHETHER a pin applies, not whether a given owner is allowed.
 *   - trusted (admin / table-scoped) or a table with no ownership scoping (not know/rel) → null: no restriction.
 *   - otherwise → the requested (and already-approved) owner, or '' (shared platform knowledge) when none was asked.
 */
export function ownerLockFor(trusted: boolean, ownerScoped: boolean, requested: string): string | null {
  if (!ownerScoped || trusted) return null;
  return requested;
}

/** A guest/non-trusted caller must not filter by a column stripped from their own view of the row (know.source,
 *  divisions.meta/ai) — even never seeing its value, matching on a guessed one is an exact-match oracle for it. */
export function rejectPrivateFilters(keys: string[], strip: string[]): string[] {
  return keys.filter(k => strip.includes(k));
}

/**
 * `know.meta.pricing` is "price~cost~unit" (know-sync.js's buildKnowMeta) — cost is internal COGS and must never
 * reach an untrusted reader (GET /v1/data/know, /v1/search evidence). Keeps price + unit, drops the cost slot;
 * an unparseable/missing price drops the `pricing` key entirely rather than risk leaking a raw cost value.
 */
export function redactPricing(meta: Record<string, any> | null | undefined): Record<string, any> {
  const out = meta && typeof meta === 'object' ? { ...meta } : {};
  if (!('pricing' in out)) return out;
  const parts = String(out.pricing ?? '').split('~');
  const price = parts[0]?.trim();
  if (!price || Number.isNaN(Number(price))) { delete out.pricing; return out; }
  out.pricing = parts.length > 2 ? `${price}~~${parts[2]}` : price;
  return out;
}
