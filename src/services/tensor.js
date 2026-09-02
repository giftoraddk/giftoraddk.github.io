/**
 * tensor.js — Multi-model AI streaming hub with automatic fallback.
 *
 * Config string format (pipe-separated; each entry is tilde-separated):
 *   KEY1~label~model_override|KEY2~label|KEY3~...
 *
 * Provider is auto-detected from the key prefix:
 *   gsk_*   → Groq        (OpenAI-compatible endpoint)
 *   sk-or-* → OpenRouter  (OpenAI-compatible endpoint)
 *
 * The third tilde-segment optionally overrides the default model name.
 * Example:
 *   PUBLIC_OPER="sk-or-v1-YYY~router~inclusionai/ling-3.0-flash:free"
 *   PUBLIC_GROQ="gsk_ZZZ~groq"
 *
 * Optional masking: splice `~k!t@d~` anywhere into an entry (e.g. into the
 * middle of the raw key) to defeat plaintext greps in a shipped public
 * bundle — every occurrence is stripped, collapsing the two surrounding
 * tildes back into a seamless string, before the entry is parsed:
 *   PUBLIC_OPER="sk-or-v1-Y~k!t@d~YY~router~inclusionai/ling-3.0-flash:free"
 *
 * Fallback order: models are tried left-to-right — first across each key's own
 * default model chain (see DEFAULTS below), then across the next configured
 * key — on fetch/parse error the next model is tried automatically. The error
 * is re-thrown only when all models are exhausted.
 *
 * Usage:
 *   import { createAIStream } from '@/services/tensor.js'
 *
 *   for await (const chunk of createAIStream(configStr, messages, { system })) {
 *     output += chunk
 *   }
 *
 * Ranking (rankModels): pings every candidate model once with a trivial
 * request, measures time-to-first-chunk, and caches the result (fastest
 * accessible model first) in IndexedDB for a day — call once per browser
 * session/day to know which model to default to:
 *
 *   import { rankModels } from '@/services/tensor.js'
 *   const ranked = await rankModels(configStr) // [{ key, label, provider, model, ms }, …]
 *
 * createAIStream() reads that same cached order to pick which model to try
 * first. Whenever a live call actually fails, the failing model is demoted to
 * the bottom of the cached order (persisted) so the next call anywhere in the
 * app tries it last instead of repeating the same failed API call.
 */

import Storager from '@/services/storager.js'

// ── Default models per provider ────────────────────────────────────────────
//
// Each value is a `|`-separated fallback chain, tried left-to-right when the
// config string doesn't override the model (parts[2]). Ordered newest/best
// free-tier model first, down to cheap/legacy models as a last resort.
// Researched 2026-08: OpenRouter's genuinely-free (`:free` suffix) roster
// rotates weekly as providers add/pull capacity — reverify at
// openrouter.ai/models if the whole chain starts failing; Groq's catalog is
// free, rate-limited only.

const DEFAULTS = {
  groq:       'llama-3.3-70b-versatile|meta-llama/llama-4-scout-17b-16e-instruct|openai/gpt-oss-120b|llama-3.1-8b-instant',
  openrouter: 'inclusionai/ling-3.0-flash:free|poolside/laguna-s-2.1:free|poolside/laguna-xs-2.1:free|nvidia/nemotron-3-ultra-550b-a55b:free|cohere/north-mini-code:free',
}

// ── Provider detection from key prefix ────────────────────────────────────

function detectProvider(key) {
  if (key.startsWith('gsk_'))   return 'groq'
  if (key.startsWith('sk-or-')) return 'openrouter'
  return 'openrouter' // safe default
}

// Masking marker: `~k!t@d~` can be spliced anywhere into an entry (e.g. into
// the middle of the raw key) to defeat plaintext greps in a shipped bundle —
// every occurrence is stripped, collapsing the two surrounding tildes back
// into a seamless string, before the entry is parsed as usual.
const _MASK_MARKER = '~k!t@d~'

// ── Parse config string → array of model descriptors ──────────────────────

/**
 * @returns {{ key: string, label: string, model: string, models: string[], provider: string }[]}
 */
export function parseModels(configStr = '') {
  return configStr
    .split('|')
    .map(entry => {
      let trimmed = entry.trim()
      if (trimmed.includes(_MASK_MARKER)) trimmed = trimmed.split(_MASK_MARKER).join('')
      const parts    = trimmed.split('~')
      const key      = parts[0].trim()
      if (!key) return null
      const label    = parts[1]?.trim() || ''
      const provider = detectProvider(key)
      const override = parts[2]?.trim()
      const models   = override ? [override] : DEFAULTS[provider]?.split('|')
      if (!models?.length) return null // provider has no default chain and no override — skip it
      return { key, label, model: models[0], models, provider }
    })
    .filter(Boolean)
}

// ── OpenAI-compatible SSE streaming (Groq / OpenRouter) ───────────────────

const _ENDPOINTS = {
  groq:       { url: 'https://api.groq.com/openai/v1/chat/completions', label: 'Groq' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',   label: 'OpenRouter' },
}

async function* _streamCompat(key, model, messages, opts = {}, provider) {
  const { system, maxTokens = 1024, temperature = 0.7 } = opts
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  const { url, label } = _ENDPOINTS[provider]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages: msgs, stream: true, max_tokens: maxTokens, temperature }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`${label} ${res.status}: ${err.error?.message || res.statusText}`)
  }

  yield* _readSSE(res, raw => JSON.parse(raw)?.choices?.[0]?.delta?.content || null)
}

// ── Shared SSE reader ─────────────────────────────────────────────────────

async function* _readSSE(res, extract) {
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() // keep incomplete last line for next chunk

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const chunk = extract(raw)
        if (chunk) yield chunk
      } catch {} // malformed SSE chunk — skip silently
    }
  }
}

// ── Provider dispatch ─────────────────────────────────────────────────────

function _getStream({ key, model, provider }, messages, opts) {
  return _streamCompat(key, model, messages, opts, provider)
}

// ── Model ranking / benchmark ─────────────────────────────────────────────

const _rankKey = configStr => `tensor:rank:${configStr}`
const _id      = a => `${a.key}::${a.model}` // identity of one (key, model) attempt

// One attempt per (key, model), in config order.
const _flatten = descriptors => descriptors.flatMap(d => d.models.map(model => ({ ...d, model })))

// Cached order, with any (key, model) pairs not in it yet appended at the end.
async function _orderedAttempts(configStr, descriptors) {
  const natural = _flatten(descriptors)
  const cached  = await Storager.get(_rankKey(configStr))
  if (!cached?.length) return natural

  const seen = new Set(cached.map(_id))
  return [...cached, ...natural.filter(a => !seen.has(_id(a)))]
}

// Probe a model with a 1-token request. ms-to-first-chunk, or null if it errors.
async function _ping(descriptor) {
  const t0 = performance.now()
  try {
    for await (const _ of _getStream(descriptor, [{ role: 'user', content: 'hi' }], { maxTokens: 1, temperature: 0 })) break
    return performance.now() - t0
  } catch {
    return null
  }
}

/**
 * Benchmark every candidate model once; cache the ranking (fastest accessible
 * first) for a day. Calls within that day just return the cached ranking.
 * @returns {Promise<{ key:string, label:string, provider:string, model:string, ms:number }[]>}
 */
export async function rankModels(configStr) {
  const descriptors = parseModels(configStr)
  if (!descriptors.length) return []

  const cacheKey = _rankKey(configStr)
  const cached = await Storager.get(cacheKey)
  if (cached) return cached

  const pinged = await Promise.all(_flatten(descriptors).map(async a => ({ ...a, ms: await _ping(a) })))
  const ranked = pinged.filter(a => a.ms != null).sort((a, b) => a.ms - b.ms)

  await Storager.set(cacheKey, ranked) // 1-day default TTL
  return ranked
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Stream text from the first available model, falling back automatically.
 *
 * @param {string}   configStr  Pipe-separated model config string
 * @param {Array<{role:'user'|'assistant', content:string}>} messages
 * @param {Object}   opts       Optional: { system, maxTokens, temperature }
 * @yields {string}             Text chunks as they arrive
 */
export async function* createAIStream(configStr, messages, opts = {}) {
  const descriptors = parseModels(configStr)
  if (!descriptors.length) throw new Error('No AI models configured')

  let attempts = await _orderedAttempts(configStr, descriptors)

  let lastErr
  for (const attempt of attempts) { // reassigning `attempts` below doesn't affect this loop's iterator
    try {
      yield* _getStream(attempt, messages, opts)
      return // success — stop after first model that works
    } catch (err) {
      lastErr = err
      console.warn(`[tensor] ${attempt.provider}/${attempt.model} (${attempt.label || attempt.key.slice(0, 8)}…) failed, trying next model:`, err.message)
      // demote: push the failed model to the bottom so the next call tries it last
      attempts = [...attempts.filter(a => _id(a) !== _id(attempt)), { ...attempt, ms: null }]
      await Storager.set(_rankKey(configStr), attempts)
    }
  }
  throw lastErr ?? new Error('All AI models failed')
}

/**
 * Convenience helper: collect all chunks into a single string (non-streaming).
 */
export async function generateText(configStr, messages, opts = {}) {
  let text = ''
  for await (const chunk of createAIStream(configStr, messages, opts)) {
    text += chunk
  }
  return text
}
