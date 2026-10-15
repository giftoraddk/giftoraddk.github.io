import { reqHeaders } from '@/services/core/requester.js'

export const DEFAULT_CHAIN = '@default'

// Header chung của requester (tự gắn token — /v1/ai/image bắt buộc đăng nhập); `accept` theo kiểu body trả về.
const _headers = (base, opts, accept) =>
    reqHeaders(base, { Accept: accept, ...(opts.authHeader ? { Authorization: opts.authHeader } : {}) })

/** Alias for createAIStream — kept as a separate name for call-site parity with astro-micro's tensor.js. */
export async function generateText(messages, opts = {}) {
    return createAIStream(messages, opts)
}

/**
 * The worker's /v1/ai/stream endpoint returns a plain text body (see the
 * worker's ai.ts, a later task), not JSON — called directly with fetch
 * rather than through requester.js, whose helpers assume a JSON response.
 */
export async function createAIStream(messages, { signal, ...opts } = {}) {
    const base = import.meta.env.PUBLIC_LLM_URL
    const headers = await _headers(base, opts, 'text/plain')
    // `signal` — aborts the request (a timeout, a Stop button); it stays on this side, never in the body.
    const res = await fetch(`${base}/v1/ai/stream`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({ chain: opts.chain ?? DEFAULT_CHAIN, messages, opts }),
    })
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
    return res.text()
}

export async function generateImage(prompt, negativePrompt, opts = {}) {
    const base = import.meta.env.PUBLIC_LLM_URL
    const headers = await _headers(base, opts, 'image/*')
    const res = await fetch(`${base}/v1/ai/image`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, negativePrompt }),
    })
    if (!res.ok) throw new Error(`Image generation failed: ${res.status}`)
    return res.blob()
}

/**
 * POST /v1/search — server-side Vectorize semantic search + `rel` expansion (see
 * worker/packages/llm/src/search.ts, a later task). Returns the parsed JSON body
 * (`{ evidence: [...] }`) directly — called via plain fetch like createAIStream/generateImage
 * above, not through services/core/requester.js, for call-site consistency within this file.
 */
export async function search(query, opts = {}) {
    const base = import.meta.env.PUBLIC_LLM_URL
    const headers = await _headers(base, opts, 'application/json')
    const res = await fetch(`${base}/v1/search`, {
        method: 'POST',
        headers,
        // owner: hub id whose knowledge to search ('' = shared platform knowledge) — see search.ts
        body: JSON.stringify({ query, types: opts.types, owner: opts.owner ?? '', limit: opts.limit, maxExtra: opts.maxExtra }),
    })
    if (!res.ok) throw new Error(`Search request failed: ${res.status}`)
    return res.json()
}
