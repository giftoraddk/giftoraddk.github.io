// src/packages/llm/service/rel-sync.js
//
// Auto-generates `rel` edges between `know` entries of the same `type` that share a tag (meta.tags,
// comma/semicolon-separated) — the "Nạp từ sản phẩm"/CSV import flows in /admin/knowledge only ever
// wrote to `know` (know-sync.js), leaving `rel` permanently empty unless an admin hand-typed rows
// (see rel.js's schema comment) — this closes that gap for the common case (products sharing a tag
// are usually genuinely related) without touching the manual admin UI for anything else (custom
// relation types like part_of/has_symptom/caused_by still need a human). Ported from astro-micro's
// src/webs/llm/tools/rel-sync.js (Event Bus Global port) — logic unchanged.
//
// One undirected edge per pair, keyed by a deterministic id (sorted pair + type) — worker's
// _expandViaRelations (search.ts) already treats from_id/to_id as bidirectional, so a single row
// covers both directions; the deterministic id also makes re-running this idempotent (upsert, not
// pile-up) across repeated syncs.
import { createService } from '@/services/core/crud.js'
import { LLM_DB } from '../tool/server.js'

const knowSvc = createService('know', '', LLM_DB)
const relSvc = createService('rel', '', LLM_DB)

// A tag shared by more than this many entries is too generic to signal a real relation (e.g. a
// catalog-wide "sale" tag) — skip pairing on it entirely rather than flooding `rel`.
const MAX_GROUP_SIZE = 40
// Hard cap per run so a large catalog can't blow up `rel` writes in one pass.
const MAX_EDGES = 500

function _parseTags(tags) {
    return String(tags || '')
        .split(/[,;]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
}

/**
 * Best-effort — never throws (mirrors syncKnowFromRecord's contract, see know-sync.js). Links every
 * pair of active `know` rows of the given `type` that share at least one tag. Returns the number of
 * edges upserted.
 */
export async function autoLinkKnowByTags(type = 'product') {
    let edges = 0
    try {
        // Shared platform knowledge only (owner '') — hub rows are linked worker-side per owner (knowImport.ts).
        const rows = (await knowSvc.findAll({ filters: { type, status: 'active' } })).filter((r) => !r.owner)

        const byTag = new Map()
        for (const row of rows) {
            for (const tag of _parseTags(row.meta?.tags)) {
                if (!byTag.has(tag)) byTag.set(tag, [])
                byTag.get(tag).push(row.id)
            }
        }

        // "idA|idB" (sorted) -> Set(shared tags)
        const shared = new Map()
        for (const [tag, ids] of byTag) {
            if (ids.length < 2 || ids.length > MAX_GROUP_SIZE) continue
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    const [a, b] = [ids[i], ids[j]].sort()
                    const key = `${a}|${b}`
                    if (!shared.has(key)) shared.set(key, new Set())
                    shared.get(key).add(tag)
                }
            }
        }

        const now = relSvc.now()
        // Bulk-fetch existing edges of this type once (instead of N findById round-trips) just to
        // preserve created_at across re-runs.
        const existingRel = await relSvc.findAll({ filters: { type: 'related_to' } })
        const createdAtById = new Map(existingRel.map((r) => [r.id, r.created_at]))

        for (const [key, tags] of shared) {
            if (edges >= MAX_EDGES) break
            const [from_id, to_id] = key.split('|')
            const id = `${from_id}_${to_id}_related_to`
            await relSvc.set(id, {
                from_id, to_id, type: 'related_to', owner: '',
                weight: tags.size, // search expands through the strongest links first (worker/src/search.ts)
                meta: { tags: [...tags] },
                created_at: createdAtById.get(id) || now, updated_at: now, deleted_at: null,
            })
            edges++
        }
    } catch (err) {
        console.error('[llm/rel-sync] failed to auto-link know entries:', err?.message ?? err)
    }
    return edges
}
