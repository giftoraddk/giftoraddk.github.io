import { readBody, AI_STREAM_BODY_MAX, AI_IMAGE_BODY_MAX } from './lib/body.ts'

export interface AiEnv {
    OPER_KEY?: string
    GROQ_KEY?: string
    NVID_KEY?: string
    HUGGIN_KEY?: string
    PRO_KEY?: string
    AI_FREE_TIMEOUT_MS?: string
}

// Đối chiếu `GET /v1/models` của từng provider + 1 lượt gọi thử (2026-10-06) — Groq đã gỡ toàn bộ dòng llama-3.x/4.
// OpenRouter: bỏ qwen3.8-27b:free + glm-5.2:free (404 — đã gỡ), openrouter/free (ra rỗng), gemma-4 :free (429 liên tục
// từ nhà cung cấp gốc); thay bằng các model :free trả JSON < 2s. Không dùng inkling:free (403 — chỉ cho agentic
// harness), nemotron-3-ultra:free (~15s, quá trần 1 lượt). Model reasoning chậm (nemotron-3.5-lightning) để cuối vì
// có thể mất 60s+ mới ra content.
const DEFAULTS: Record<string, string> = {
    groq: 'openai/gpt-oss-120b|qwen/qwen3.8-27b|openai/gpt-oss-20b',
    openrouter: 'nvidia/nemotron-3-super-120b-a12b:free|inclusionai/ling-3.0-flash-sante:free|poolside/laguna-s-2.1:free',
    nvidia: 'google/gemma-4-31b-it|moonshotai/kimi-k3|meta/llama-3.2-11b-vision-instruct|nvidia/nemotron-3.5-lightning-30b-a3b',
}

const ENDPOINTS: Record<string, { url: string; label: string }> = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', label: 'Groq' },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', label: 'OpenRouter' },
    nvidia: { url: 'https://integrate.api.nvidia.com/v1/chat/completions', label: 'NVIDIA' },
}

function detectProvider(key: string): string {
    if (key.startsWith('gsk_')) return 'groq'
    if (key.startsWith('sk-or-')) return 'openrouter'
    if (key.startsWith('nvapi-')) return 'nvidia'
    return 'openrouter'
}

interface Descriptor { key: string; model: string; models: string[]; provider: string }

function parseModels(configStr = ''): Descriptor[] {
    return configStr
        .split('|')
        .map((entry) => {
            const key = entry.trim()
            if (!key) return null
            const provider = detectProvider(key)
            const models = DEFAULTS[provider]?.split('|')
            if (!models?.length) return null
            return { key, model: models[0], models, provider }
        })
        .filter((d): d is Descriptor => d != null)
}

/** The client may only name symbols (`@default`); anything else it sends — e.g. a raw key — is ignored. */
export function resolveFreeChain(chain: string, env: AiEnv): string {
    const defaults = [env.GROQ_KEY, env.OPER_KEY, env.NVID_KEY].filter(Boolean) as string[]
    const segments = (chain || '@default').split('|').map((s) => s.trim()).filter(Boolean)
    if (segments.some((seg) => seg !== '@default')) console.warn('[ai] ignored non-symbolic chain segment(s)')
    return defaults.join('|')
}

function resolveProChain(env: AiEnv): string {
    return env.PRO_KEY || ''
}

// gpt-oss trên Groq mặc định suy luận mức medium — phần suy luận ăn hết max_tokens trước khi ra content ("empty content").
const extraBody = (a: Attempt): Record<string, string> =>
    (a.provider === 'groq' && a.model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})

const flatten = (descriptors: Descriptor[]) => descriptors.flatMap((d) => d.models.map((model) => ({ ...d, model })))

interface Attempt { key: string; model: string; provider: string }

// Trần cho 1 lần thử free — không để 1 model treo ăn hết budget chung, các model sau vẫn được thử.
const FREE_ATTEMPT_CAP_MS = 9000

export const AI_LIMITS = { maxTokens: 4096, messages: 40, chars: 60_000 }

/** Only the opts the providers get, within bounds — a caller can't buy a 600s budget or a 100k-token answer. */
export function clampOpts(opts: Record<string, unknown> = {}) {
    const tokens = Number(opts.maxTokens)
    const temp = Number(opts.temperature)
    return {
        system: typeof opts.system === 'string' ? opts.system : undefined,
        maxTokens: Number.isFinite(tokens) && tokens > 0 ? Math.min(Math.floor(tokens), AI_LIMITS.maxTokens) : 1024,
        temperature: Number.isFinite(temp) ? Math.min(Math.max(temp, 0), 1.5) : 0.7,
    }
}

export function validMessages(messages: unknown, system = ''): messages is { role: string; content: string }[] {
    if (!Array.isArray(messages) || !messages.length || messages.length > AI_LIMITS.messages) return false
    let chars = system.length
    for (const m of messages) {
        if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return false
        chars += m.content.length
    }
    return chars <= AI_LIMITS.chars
}

/** One answer from the free chain (latency order, shared deadline), then the pro key — null when every model failed. */
export async function runChain(env: AiEnv, chain: string, messages: unknown[], opts: ReturnType<typeof clampOpts>): Promise<string | null> {
    const deadline = Date.now() + (Number(env.AI_FREE_TIMEOUT_MS) || 9000)
    for (const attempt of flatten(parseModels(resolveFreeChain(chain, env)))) {
        const remaining = deadline - Date.now()
        if (remaining <= 0) break
        const text = await tryAttempt(attempt, messages, opts, Math.min(remaining, FREE_ATTEMPT_CAP_MS))
        if (text) return text
    }
    for (const attempt of flatten(parseModels(resolveProChain(env)))) {
        const text = await tryAttempt(attempt, messages, opts)
        if (text) return text
    }
    return null
}

const logFail = (attempt: Attempt, reason: string | number) =>
    console.warn(`[ai] ${attempt.provider}/${attempt.model} failed: ${reason}`)

async function fetchProvider(
    attempt: Attempt,
    messages: unknown[],
    opts: { system?: string; maxTokens?: number; temperature?: number },
    timeoutMs?: number,
) {
    const { system, maxTokens = 1024, temperature = 0.7 } = opts
    const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
    const { url } = ENDPOINTS[attempt.provider]
    const controller = timeoutMs != null ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), Math.max(0, timeoutMs!)) : null
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${attempt.key}` },
            body: JSON.stringify({ ...extraBody(attempt), model: attempt.model, messages: msgs, stream: true, max_tokens: maxTokens, temperature }),
            signal: controller?.signal,
        })
    } finally {
        if (timer) clearTimeout(timer)
    }
}

/** Fully consumes an OpenAI-compatible SSE stream and returns the concatenated content, dropping reasoning-only deltas. */
async function extractFullContent(upstreamBody: ReadableStream<Uint8Array>): Promise<string> {
    const reader = upstreamBody.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let out = ''
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === '[DONE]') continue
            try {
                const content = JSON.parse(raw)?.choices?.[0]?.delta?.content
                if (content) out += content
            } catch {
                // malformed SSE chunk — skip
            }
        }
    }
    return out
}

/** Content của 1 model, hoặc null nếu lỗi / hết giờ / chỉ ra reasoning — caller thử model kế tiếp. */
async function tryAttempt(attempt: Attempt, messages: unknown[], opts: Record<string, unknown>, timeoutMs?: number): Promise<string | null> {
    try {
        const upstream = await fetchProvider(attempt, messages, opts, timeoutMs)
        if (!upstream.ok || !upstream.body) return logFail(attempt, upstream.status), null
        const text = await extractFullContent(upstream.body)
        if (!text.trim()) return logFail(attempt, 'empty content'), null
        return text
    } catch (err) {
        return logFail(attempt, (err as Error).name === 'AbortError' ? 'timeout' : (err as Error).message), null
    }
}

export async function handleAiStream(request: Request, env: AiEnv): Promise<Response> {
    // Called after index.ts's rate-limit gate — capped well above AI_LIMITS.chars (60000) so real messages
    // always fit, leaving headroom for JSON structure/opts overhead.
    const body = (await readBody(request, AI_STREAM_BODY_MAX)) as { chain?: string; messages?: unknown[]; opts?: Record<string, unknown> }
    const opts = clampOpts(body.opts)
    if (!validMessages(body.messages, opts.system ?? '')) {
        return new Response(JSON.stringify({ message: 'messages invalid or too long' }), { status: 400 })
    }
    if (!resolveFreeChain('@default', env) && !resolveProChain(env)) {
        return new Response(JSON.stringify({ message: 'No AI models configured' }), { status: 500 })
    }
    // Only role/content reach the providers — drop any other client-supplied fields riding along on each message.
    const messages = body.messages.map(({ role, content }) => ({ role, content }))
    const text = await runChain(env, body.chain ?? '@default', messages, opts)
    if (text) return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return new Response(JSON.stringify({ message: 'All AI models failed' }), { status: 502 })
}

const HF_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers'
const IMAGE_NEGATIVE_PROMPT_FALLBACK = 'blurry, low quality, distorted, watermark, text'

export async function handleAiImage(request: Request, env: AiEnv): Promise<Response> {
    if (!env.HUGGIN_KEY) return new Response(JSON.stringify({ message: 'Image generation not configured' }), { status: 500 })

    // Called after index.ts's rate-limit gate — a prompt + negative prompt only, never an upload.
    const body = (await readBody(request, AI_IMAGE_BODY_MAX)) as { prompt?: string; negativePrompt?: string }
    if (!body.prompt) return new Response(JSON.stringify({ message: 'prompt required' }), { status: 400 })

    let lastErr: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) await new Promise((r) => setTimeout(r, attempt * 3000))
        try {
            const res = await fetch(HF_MODEL_URL, {
                method: 'POST',
                headers: { authorization: `Bearer ${env.HUGGIN_KEY}`, 'content-type': 'application/json' },
                body: JSON.stringify({
                    inputs: body.prompt,
                    parameters: { negative_prompt: body.negativePrompt || IMAGE_NEGATIVE_PROMPT_FALLBACK },
                }),
            })
            if (!res.ok) {
                const err = await res.json<{ error?: string }>().catch(() => ({ error: undefined }))
                throw new Error(`Hugging Face ${res.status}: ${err.error || res.statusText}`)
            }
            return new Response(res.body, { headers: { 'Content-Type': res.headers.get('content-type') || 'image/png' } })
        } catch (err) {
            lastErr = err as Error
        }
    }
    return new Response(JSON.stringify({ message: lastErr?.message || 'Image generation failed' }), { status: 502 })
}
