// src/packages/llm/service/know-sync.js
//
// Syncs a products/posts/finance_reports record (svc-resources edits, svc-learn imports — pipeline approvals sync on the Worker) into THIS domain's
// `know` table (D1) — targets the know/rel schema
// (hook/knowledge_database_cloudflare_d1_vectorize.md) that svc-aide.js reads from at answer time.
// Ported from astro-micro's src/webs/llm/tools/know-sync.js (Event Bus Global port).
//
// No refTable/refId, no realtime hydration back to the source table — `know`/`rel` (D1) is the
// ONLY source svc-aide reads from at answer time (the Worker's /v1/fn/aide → worker/src/search.ts),
// by explicit product decision. Ids = the record id as-is — same id the Worker's approve uses (fn/jobs.ts keepIds).
import { createService } from '@/services/core/crud.js'
import { LLM_DB } from '../tool/server.js'

const knowSvc = createService('know', '', LLM_DB)

const TABLE_TYPE = { products: 'product', posts: 'post', finance_reports: 'finance' }

// Which sector / department a platform record's knowledge belongs to when nothing else says (worker search.ts scope):
// the shop's products and finance reports are e-commerce's; a post keeps the sector the Worker stamped on it when a
// department's job created it (fn/routes.ts approve), else e-commerce. Never '' (= every sector): a healthcare or
// education consult must not answer from the shop's catalogue.
const DEFAULT_SECTOR = 'ecommerce'
const scopeOf = (record, table) => ({
    sector: table === 'posts' ? (record.sector || DEFAULT_SECTOR) : DEFAULT_SECTOR,
    fn: table === 'products' ? 'product' : table === 'finance_reports' ? 'finance' : 'marketing',
})

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
        const id = record.id
        const existing = await knowSvc.findById(id)
        const now = knowSvc.now()
        const { title, description } = buildKnowContent(record, table)
        await knowSvc.set(id, {
            type: opts.type || TABLE_TYPE[table] || 'other',
            title, description,
            meta: buildKnowMeta(record, table),
            version: (existing?.version || 0) + 1,
            status: record.status === 'active' ? 'active' : 'draft',
            // Shared platform knowledge — a self-contained copy, no link back to `table`.
            owner: '', source: '',
            // Which sector / department reads it (worker search.ts scope): the caller's pick (svc-learn's CSV import, ''
            // allowed there), else the row's own scope (an approved job wrote it), else the record's (scopeOf) — a row
            // left at '' by an older sync gets its record's scope on its next sync instead of staying in every sector.
            sector: opts.sector ?? (existing?.sector || scopeOf(record, table).sector),
            fn: opts.fn ?? (existing?.sector ? existing.fn ?? '' : scopeOf(record, table).fn),
            created_at: existing?.created_at || now, updated_at: now, deleted_at: null,
        })
    } catch (err) {
        console.error('[llm/know-sync] failed to sync know entry:', err?.message ?? err)
    }
}

/**
 * No-op unless `table` is one of this domain's division output tables. `finance_reports` is
 * included here because this domain's `finance` division genuinely outputs to it, and it's a
 * natural fit for the knowledge base's `type:'finance'` bucket from
 * hook/knowledge_database_cloudflare_d1_vectorize.md's own multi-domain examples (§24).
 */
export function syncKnowFromOutputTable(record, table) {
    if (!TABLE_TYPE[table]) return
    return syncKnowFromRecord(record, table)
}
