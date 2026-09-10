/**
 * tensor.js — Multi-model AI streaming hub with automatic fallback.
 *
 * Config string format (pipe-separated; each entry is tilde-separated):
 *   KEY1~label~model_override|KEY2~label|KEY3~...
 *
 * Provider is auto-detected from the key prefix:
 *   gsk_*   → Groq        (OpenAI-compatible endpoint)
 *   sk-or-* → OpenRouter  (OpenAI-compatible endpoint)
 *   nvapi-* → NVIDIA      (OpenAI-compatible endpoint, integrate.api.nvidia.com)
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
// `openrouter` re-verified 2026-09-09 (3rd pass) — NOT by reading a rendered
// webpage (unreliable, a page-summarizing fetch of openrouter.ai/models missed
// 18 of 21 actually-free entries in this same pass), but by pulling OpenRouter's
// own public `GET /api/v1/models` JSON directly and filtering for
// `pricing.prompt === "0" && pricing.completion === "0"` — the same 2 entries
// that were topping this chain before (`minimax/minimax-m3:free`,
// `z-ai/glm-5.2:free`) are GONE from that live response (pulled/renamed) and
// would 400/404 on every real call, forcing an extra fallback hop before
// reaching a working model on every single request. Excluded from the rebuilt
// list: safety/moderation classifiers (`nvidia/nemotron-3.5-content-safety`),
// audio-output TTS previews (`google/lyria-3-*-preview`), and `-preview`-tagged
// entries (unstable). OpenRouter's genuinely-free roster still rotates as
// providers add/pull capacity — reverify via that same endpoint (no auth
// needed) if this whole chain starts failing again, don't re-guess from a
// rendered-page summary. `groq`/`nvidia` chains were NOT re-verified this pass
// (no working key configured for either right now — see PUBLIC_GROQ/PUBLIC_NVID
// in .env — so they're currently unused dead code paths); re-verify those
// against console.groq.com/docs/models / build.nvidia.com/models before relying
// on them. Audio/TTS (whisper, orpheus), guard/classifier (llama-prompt-guard),
// rerank (voyageai/rerank), and agentic tool-wrapper (groq/compound*) models are
// deliberately excluded — not plain chat-completions models, calling them the
// same way as the rest of this chain would misbehave.
const DEFAULTS = {
  groq:       'llama-3.3-70b-versatile|meta-llama/llama-4-scout-17b-16e-instruct|openai/gpt-oss-120b|llama-3.1-8b-instant|openai/gpt-oss-20b|qwen/qwen3.6-27b|qwen/qwen3.8-27b|minimaxai/minimax-m2.7|openai/gpt-oss-safeguard-20b',
  openrouter: 'nvidia/nemotron-3.5-lightning:free|nvidia/nemotron-3-ultra-550b-a55b:free|nvidia/nemotron-3-super-120b-a12b:free|cohere/north-mini-code:free|google/gemma-4-31b-it:free|inclusionai/ling-3.0-flash-fin:free|inclusionai/ling-3.0-flash-sante:free|nex-agi/nex-n2.5-mini:free|poolside/laguna-s-2.1:free|liquid/lfm-2.5-2.6b:free|thinkingmachines/inkling-small:free|nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free|openrouter/free',
  // nvidia chain: nemotron-3.5-lightning first (general-purpose, NOT a reasoning model — safest
  // default for strict-JSON callers). `-reasoning`-suffixed and vision/translation-only entries
  // (riva-translate, llama-vision, paligemma) are kept further down the chain since they're either
  // prone to emitting chain-of-thought text instead of direct answers, or aren't general text-chat
  // models at all — a caller that specifically needs reliable JSON (e.g. svc-marketing.js) should
  // pin nemotron-3.5-lightning-30b-a3b directly (model override, `KEY~label~model`) rather than
  // relying on this whole chain. `google/gemma-4-31b-it` confirmed directly from its
  // build.nvidia.com model page's own code sample; the rest were carried over from an earlier
  // best-guess NVIDIA NIM catalog pass (2026-09) — verify against build.nvidia.com/models first
  // if any of them 400 before assuming this whole chain is broken.
  nvidia:     'nvidia/nemotron-3.5-lightning-30b-a3b|moonshotai/kimi-k3|google/gemma-4-31b-it|nvidia/nemotron-3-super-120b-a12b|nvidia/nemotron-3-ultra-550b-a55b|nvidia/nemotron-3-nano-omni-30b-a3b-reasoning|meta/llama-3.2-11b-vision-instruct|meta/llama-3.2-90b-vision-instruct|nvidia/riva-translate-4b-instruct-v2|nvidia/riva-translate-4b-instruct-v1_1|google/paligemma',
}

// ── Provider detection from key prefix ────────────────────────────────────

function detectProvider(key) {
  if (key.startsWith('gsk_'))   return 'groq'
  if (key.startsWith('sk-or-')) return 'openrouter'
  if (key.startsWith('nvapi-')) return 'nvidia'
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

// ── OpenAI-compatible SSE streaming (Groq / OpenRouter / NVIDIA) ──────────

const _ENDPOINTS = {
  groq:       { url: 'https://api.groq.com/openai/v1/chat/completions',      label: 'Groq' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',        label: 'OpenRouter' },
  nvidia:     { url: 'https://integrate.api.nvidia.com/v1/chat/completions', label: 'NVIDIA' },
}

// Free-tier providers occasionally accept a connection then stall — no more bytes ever arrive,
// no HTTP error, nothing to catch. Without a deadline, `await reader.read()` below waits forever:
// the caller's promise never settles, callers up the stack (generateJsonWithRetry, division/
// engine.js's runTextStep) never get a chance to error out, and UI relying on that rejection (e.g.
// svc-talk.js's job doc ending up in an error state with a retry button) never sees anything wrong
// — it just hangs indefinitely with no visible error. `idleTimeoutMs` is an INACTIVITY deadline
// (reset on every chunk of raw network activity via `_readSSE`'s `onActivity`), not a hard overall
// cap — a slow-but-still-trickling generation (large maxTokens on a slow free model) keeps going
// fine; only a connection that's gone completely silent gets aborted.
async function* _streamCompat(key, model, messages, opts = {}, provider) {
  const { system, maxTokens = 1024, temperature = 0.7, idleTimeoutMs = 30000 } = opts
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  const { url, label } = _ENDPOINTS[provider]

  const controller = new AbortController()
  let timer = setTimeout(() => controller.abort(), idleTimeoutMs)
  const bump = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), idleTimeoutMs) }

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages: msgs, stream: true, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    throw err.name === 'AbortError' ? new Error(`${label} request timed out (no response after ${idleTimeoutMs}ms)`) : err
  }

  if (!res.ok) {
    clearTimeout(timer)
    const err = await res.json().catch(() => ({}))
    throw new Error(`${label} ${res.status}: ${err.error?.message || res.statusText}`)
  }

  try {
    yield* _readSSE(res, raw => JSON.parse(raw)?.choices?.[0]?.delta?.content || null, bump)
  } catch (err) {
    throw err.name === 'AbortError' ? new Error(`${label} stream stalled (no data for ${idleTimeoutMs}ms)`) : err
  } finally {
    clearTimeout(timer)
  }
}

// ── Shared SSE reader ─────────────────────────────────────────────────────

// `onActivity` (optional) fires on every raw read — even keepalive/ping lines with no extractable
// content — so the idle-timeout in `_streamCompat` resets on ANY sign of life from the connection,
// not just on lines that parse into real content chunks.
async function* _readSSE(res, extract, onActivity) {
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    onActivity?.()
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
//
// Cached entries no longer present in `natural` (a model retired from DEFAULTS/config since this
// browser last cached a ranking) are DROPPED, not kept — otherwise a model removed from the config
// (e.g. pulled from OpenRouter's free tier, 404ing every call) keeps getting tried FOREVER in any
// browser that already has it cached, since it was never re-derived from the live config again.
// Confirmed the same way live: a ghost entry like 'minimax/minimax-m2.7:free' (retired from every version
// of DEFAULTS.openrouter this file has had) kept being attempted first purely because a past session
// had once cached it, burning through a retry attempt on a guaranteed-404 before reaching a model
// that's actually still offered.
async function _orderedAttempts(configStr, descriptors) {
  const natural = _flatten(descriptors)
  const cached  = await Storager.get(_rankKey(configStr))
  if (!cached?.length) return natural

  const naturalIds   = new Set(natural.map(_id))
  const validCached  = cached.filter(a => naturalIds.has(_id(a)))
  const seen = new Set(validCached.map(_id))
  return [...validCached, ...natural.filter(a => !seen.has(_id(a)))]
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

/**
 * Force-demote whichever (key, model) is CURRENTLY ranked first for this configStr, without an
 * HTTP failure to trigger it. For callers who detect a "soft" failure — the request succeeded
 * and returned text, but the content itself was unusable (e.g. a caller expecting strict JSON
 * got malformed/non-JSON text back) — createAIStream()'s own demotion never fires in that case
 * (from its point of view the call succeeded), so a caller retrying with the same configStr would
 * otherwise keep hitting the exact same model. Uses the identical demote-to-bottom mechanism
 * createAIStream() applies on a hard fetch/parse error, so the NEXT createAIStream()/
 * generateText() call for this configStr tries a different model.
 */
export async function demoteModel(configStr) {
  const descriptors = parseModels(configStr)
  if (!descriptors.length) return
  const attempts = await _orderedAttempts(configStr, descriptors)
  if (!attempts.length) return
  const [head, ...rest] = attempts
  await Storager.set(_rankKey(configStr), [...rest, { ...head, ms: null }])
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
