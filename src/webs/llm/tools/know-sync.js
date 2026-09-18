// src/webs/llm/tools/know-sync.js
//
// Syncs an approved svc-talk.js output record (products/posts/finance_reports) into THIS domain's
// `know` table (D1, LLM_DB) — successor to the old (retired) Firestore `mind` collection's
// sync-on-approve step, targeting the NEW know/rel schema
// (hook/knowledge_database_cloudflare_d1_vectorize.md) instead.
//
// No refTable/refId, no realtime hydration back to the source table — `know`/`rel` (D1) is the
// ONLY source svc-aide reads from at answer time (see tools/aide-engine.js +
// worker/packages/llm-worker/src/search.ts), by explicit product decision.
import { createService } from '@/services/crud.js'
import { LLM_DB } from './server.js'

const TABLE_TYPE = { products: 'product', posts: 'post', finance_reports: 'finance' }

// products/posts share title/description/content/pics/tags; finance_reports has no title/content
// at all (its output.fields are conclusion/analysis/impact/risk/recommendation/decision — see
// seed-finance.js), so it needs its own composition branch. Returns `description` (know's own
// content column, see 0002_know_description.sql) — NOT the source record's own `description` field
// alone, which is merged in here alongside `content`.
export function buildKnowContent(record, table) {
    if (table === 'finance_reports') {
        return {
            title: (record.conclusion || '(untitled)').slice(0, 120),
            description: [record.analysis, record.impact, record.recommendation, record.decision].filter(Boolean).join('\n\n'),
        }
    }
    const plain = (record.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return {
        title: record.title || '(untitled)',
        description: [record.description, plain].filter(Boolean).join('\n\n'),
    }
}

export function buildKnowMeta(record, table) {
    const base = { tags: record.tags || '' }
    if (table === 'products') return { ...base, pricing: record.pricing || '', promo: record.promo || '', quantity: record.quantity ?? '' }
    if (table === 'finance_reports') return { ...base, risk: record.risk || '', decision: record.decision || '' }
    return base
}

/**
 * Idempotent upsert keyed by `record.id` AS-IS (no `${table}-` prefix — source ids are already
 * ULID/UUID, unique app-wide, so a plain upsert-by-id already overwrites correctly on re-sync) —
 * best-effort, NEVER throws (mirrors mind-sync.js's syncMindFromRecord contract exactly), so a sync
 * failure never breaks the approve flow in svc-talk.js that triggers it.
 *
 * `opts.type` overrides the `TABLE_TYPE[table]` mapping — used by /admin/knowledge's CSV import
 * (knowledge.astro) to tag externally-sourced rows (no real `table` record) with an admin-chosen
 * `know.type` while still reusing this same product-shaped content/meta builder.
 */
export async function syncKnowFromRecord(record, table, opts = {}) {
    try {
        const svc = createService('know', '', LLM_DB)
        const id = record.id
        const existing = await svc.findById(id).catch(() => null)
        const now = await svc.now()
        const { title, description } = buildKnowContent(record, table)
        await svc.set(id, {
            type: opts.type || TABLE_TYPE[table] || 'other',
            title, description,
            meta: buildKnowMeta(record, table),
            version: (existing?.version || 0) + 1,
            status: record.status === 'active' ? 'active' : 'draft',
            created_at: existing?.created_at || now, updated_at: now, deleted_at: null,
        })
    } catch (err) {
        console.error('[llm/know-sync] failed to sync know entry:', err?.message ?? err)
    }
}

/**
 * No-op unless `table` is one of this domain's division output tables. `finance_reports` is a NEW
 * addition vs. mind-sync.js (which only ever supported products/posts) — included here because
 * this domain's `finance` division genuinely outputs to it, and it's a natural fit for the
 * knowledge base's `type:'finance'` bucket from hook/knowledge_database_cloudflare_d1_vectorize.md's
 * own multi-domain examples (§24).
 */
export function syncKnowFromOutputTable(record, table) {
    if (!TABLE_TYPE[table]) return
    return syncKnowFromRecord(record, table)
}
