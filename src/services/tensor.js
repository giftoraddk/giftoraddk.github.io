/**
 * tensor.js — thin client for the AI gateway, hosted on llm-worker's `/v1/ai/*` routes
 * (worker/packages/llm-worker/src/ai.ts) — this Worker owns ALL AI processing app-wide, alongside
 * its own D1 data routes (webs/llm domain). Firestore/Supabase proxying is a SEPARATE deployment
 * (db-worker, see services/api.js's workerFetch) — both share source via worker/'s pnpm workspace
 * but deploy independently (see hook/WORKER.rst).
 *
 * The model-selection engine (provider detection, fallback chains, real API keys) used to live
 * here and call OpenRouter/Groq/NVIDIA directly from the browser — it now lives entirely in the
 * Worker. This file never holds a real key, only a symbolic `chain` string like `DEFAULT_CHAIN`
 * ('@default') that the Worker expands using its own secrets (see worker/packages/llm-worker/src/ai.ts's
 * resolveFreeChain()). Public API is unchanged from before — createAIStream()/generateText() are
 * the same async-generator shape — so every downstream call site (svc-talk.js, svc-sale.js,
 * svc-editor.js, svc-assist.js, ...) needed no changes beyond what string they pass as `chain`.
 *
 * Dropped from the old client-side version: rankModels()/demoteModel() (IndexedDB-cached
 * per-session model ranking/demotion). Once the client no longer knows real (key, model) pairs,
 * there's nothing left for it to rank or demote — the Worker just tries its own configured chain
 * in order, per request, statelessly.
 */
import { llmFetch } from '@/services/api.js'

/** Worker's own default provider chain (pinned NVID + NVID/GROQ/OPER fallback) — see
 *  worker/packages/llm-worker/src/ai.ts's resolveFreeChain(). Pass this (optionally joined with a raw per-entity
 *  override, see engine.js's resolveAi()) as `chain`; never a real provider key. */
export const DEFAULT_CHAIN = '@default'

/**
 * Stream text from the AI gateway, falling back across its own configured models.
 * @param {string} chain     DEFAULT_CHAIN, or a chain string forwarded as-is (see engine.js's resolveAi)
 * @param {Array<{role:'user'|'assistant', content:string}>} messages
 * @param {Object} [opts]    { system, maxTokens, temperature }
 * @yields {string} text chunks as they arrive
 */
export async function* createAIStream(chain, messages, opts = {}) {
    const res = await llmFetch('/v1/ai/stream', { method: 'POST', body: { chain, messages, opts } })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) yield chunk
    }
}

/** Convenience helper: collect all chunks into a single string (non-streaming). */
export async function generateText(chain, messages, opts = {}) {
    let text = ''
    for await (const chunk of createAIStream(chain, messages, opts)) text += chunk
    return text
}
