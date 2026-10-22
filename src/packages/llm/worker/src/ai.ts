import { readBody, AI_STREAM_BODY_MAX, AI_IMAGE_BODY_MAX } from './lib/body.ts'

export interface AiEnv {
    OPER_KEY?: string
    CLOU_KEY?: string
    CLOU_ACCOUNT?: string
    NVID_KEY?: string
    PRO_KEY?: string
    AI_FREE_TIMEOUT_MS?: string
}

const jsonError = (status: number, message: string) => new Response(JSON.stringify({ message }), { status })

/** Workers AI REST theo account — dùng chung cho chat (`/v1/chat/completions`) và ảnh (`/run/<model>`). */
const cloudflareBase = (env: AiEnv) => (env.CLOU_ACCOUNT ? `https://api.cloudflare.com/client/v4/accounts/${env.CLOU_ACCOUNT}/ai` : null)

type ProviderId = 'openrouter' | 'nvidia' | 'cloudflare'

interface Provider {
    /** Biến env chứa key free của provider — thứ tự khai báo trong PROVIDERS là thứ tự chain. */
    envKey: 'OPER_KEY' | 'NVID_KEY' | 'CLOU_KEY'
    match: (key: string) => boolean
    /** null = thiếu cấu hình (vd Cloudflare chưa có CLOU_ACCOUNT) — bỏ qua key thay vì gọi 1 URL hỏng. */
    url: (env: AiEnv) => string | null
    /** Thứ tự thử: chất lượng (JSON tiếng Việt đúng khuôn, ý cụ thể) trước, rồi tốc độ. */
    models: string[]
    /** Model suy luận nghĩ trước — phần suy luận ăn max_tokens + thời gian trước khi ra content ("empty content"). */
    extraBody: (model: string) => Record<string, unknown>
}

// gpt-oss chỉ hạ được xuống low (không tắt hẳn); nemotron/gemma trên NVIDIA, Cloudflare tắt qua chat template.
const GPT_OSS_LOW = { reasoning_effort: 'low' }
const NO_THINKING = { chat_template_kwargs: { enable_thinking: false } }

// Benchmark 18/10/2026 — 1 call cỡ job thật (JSON tiếng Việt, max_tokens 900, stream): token đầu ≤ 3s, JSON đúng khuôn.
// Cloudflare + NVIDIA nhanh nhất (2–5s) và không có hạn mức/ngày chặt; OpenRouter free chỉ 50 lượt/ngày/tài khoản (hết là
// 429 cho MỌI model :free — rateClass() cho cả key nghỉ tới lúc reset). Đã loại: gemma-4-26b trên Cloudflare (content rỗng);
// gemma-4-31b / deepseek-v4.1-flash / glm-5.3-flash trên NVIDIA (treo > 45s); kimi-k2.6, mistral-large-2,
// llama-3.1-nemotron-70b, nemotron-nano-3 trên NVIDIA (404); deepseek-v4.1/glm-5.3/nemotron-3-ultra/3.5-lightning (treo/rỗng).
// Thứ tự ở đây chỉ là thứ tự KHỞI ĐẦU — rank() xếp lại theo sức khoẻ thực tế (model vừa trả lời tốt lên trước).
const PROVIDERS: Record<ProviderId, Provider> = {
    openrouter: {
        envKey: 'OPER_KEY',
        match: (key) => key.startsWith('sk-or-'),
        url: () => 'https://openrouter.ai/api/v1/chat/completions',
        models: [
            'nvidia/nemotron-3.5-super-vl:free',        // ~9s, gọn + đúng khuôn nhất
            'dots-studio/dots-3-note-preview:free',     // ~15s
            'google/gemma-4-31b-it:free',               // tiếng Việt tốt; hay 429 nhưng fail nhanh (<1s)
            'nvidia/nemotron-3-super-120b-a12b:free',   // chi tiết nhất nhưng chậm (~30s)
        ],
        extraBody: () => ({ reasoning: { enabled: false } }),
    },
    nvidia: {
        envKey: 'NVID_KEY',
        match: (key) => key.startsWith('nvapi-'),
        url: () => 'https://integrate.api.nvidia.com/v1/chat/completions',
        models: [
            'nvidia/nemotron-3.5-super-vl-120b-a12b',   // token đầu 0.8s, xong 4s
            'openai/gpt-oss-20b',                       // 0.9s / 4s
            'nvidia/nemotron-3-super-120b-a12b',        // 0.6s / 14s — chi tiết nhất
        ],
        extraBody: (model) => (model.includes('gpt-oss') ? GPT_OSS_LOW : NO_THINKING),
    },
    cloudflare: {
        envKey: 'CLOU_KEY',
        // API token Cloudflare: "cfut_…" (user token) / "cfat_…" (account token).
        match: (key) => /^cf[a-z]+_/.test(key),
        url: (env) => {
            const base = cloudflareBase(env)
            return base && `${base}/v1/chat/completions`
        },
        models: [
            '@cf/openai/gpt-oss-120b',                  // 0.7s / 2.6s — tốt nhất
            '@cf/meta/llama-3.3-70b-instruct-fp8-fast', // 0.5s / 4.8s
            '@cf/qwen/qwen3-30b-a3b-fp8',               // 2.8s / 4.3s
            '@cf/openai/gpt-oss-20b',                   // 0.9s / 1.7s — ngắn hơn
            '@cf/meta/llama-4-scout-17b-16e-instruct',  // 0.5s / 8.5s
            '@cf/mistralai/mistral-small-3.1-24b-instruct', // 1.4s / 9.7s
        ],
        extraBody: (model) => (model.includes('gpt-oss') ? GPT_OSS_LOW : {}),
    },
}

const PROVIDER_ORDER = Object.keys(PROVIDERS) as ProviderId[]

// Key không nhận ra (vd PRO_KEY của nhà cung cấp OpenAI-compatible khác) → OpenRouter.
const detectProvider = (key: string): ProviderId => PROVIDER_ORDER.find((id) => PROVIDERS[id].match(key)) ?? 'openrouter'

interface Attempt { key: string; model: string; provider: ProviderId; url: string }

/** `key1|key2|…` → mọi (key, model), xen kẽ giữa các key (model 1 của mỗi key, rồi model 2…) — 1 key hết lượt / bị chặn
 *  không làm cả loạt đầu chain toàn model của nó. */
function attemptsFor(keys: string, env: AiEnv): Attempt[] {
    const perKey = keys
        .split('|')
        .map((k) => k.trim())
        .filter(Boolean)
        .map((key) => {
            const provider = detectProvider(key)
            const url = PROVIDERS[provider].url(env)
            return url ? PROVIDERS[provider].models.map((model) => ({ key, model, provider, url })) : []
        })
    const depth = Math.max(0, ...perKey.map((list) => list.length))
    return Array.from({ length: depth }, (_, i) => perKey.map((list) => list[i]).filter(Boolean)).flat()
}

// Thứ tự key của chain free: 2 provider nhanh + không hạn mức/ngày chặt trước, OpenRouter (50 lượt/ngày) sau cùng.
const FREE_ORDER: ProviderId[] = ['cloudflare', 'nvidia', 'openrouter']

/** The client may only name symbols (`@default`); anything else it sends — e.g. a raw key — is ignored. */
export function resolveFreeChain(chain: string, env: AiEnv): string {
    const segments = (chain || '@default').split('|').map((s) => s.trim()).filter(Boolean)
    if (segments.some((seg) => seg !== '@default')) console.warn('[ai] ignored non-symbolic chain segment(s)')
    return FREE_ORDER.map((id) => env[PROVIDERS[id].envKey]).filter(Boolean).join('|')
}

function resolveProChain(env: AiEnv): string {
    return env.PRO_KEY || ''
}

// Cửa sổ để chain free BẮT ĐẦU ra content (AI_FREE_TIMEOUT_MS ghi đè) — hết cửa sổ mới chuyển sang PRO_KEY.
const FREE_WINDOW_MS = 15_000
// Model chưa ra token content đầu tiên sau ngần này → bỏ (hàng đợi, 429 ngầm, treo sau header); model tốt ra ~2s.
const FREE_FIRST_TOKEN_MS = 6_000
const PRO_FIRST_TOKEN_MS = 30_000

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

// ── Sức khoẻ model ───────────────────────────────────────────────────────────
// Theo isolate (bộ nhớ, không ghi DB): mọi call đang chạy trong isolate dùng chung — 1 call vừa gặp 429 thì call sau
// bỏ qua model đó ngay, model vừa trả lời tốt được thử trước. Isolate mới bắt đầu lại từ thứ tự PROVIDERS.

/** Tối đa bấy nhiêu lượt (mỗi lượt 1 model khác) cho 1 câu trả lời — hết thì caller báo lỗi. */
export const MAX_ATTEMPTS = 9
const RECENT_OK_MS = 10 * 60_000 // trả lời tốt trong ngần này → xếp trước model chưa thử
const MIN = 60_000

interface Health { fails: number; okAt: number; coolUntil: number }
const health = new Map<string, Health>()  // `${provider}/${model}` (+ key) → sức khoẻ
const keyCool = new Map<string, number>() // key → nghỉ tới (hạn mức của CẢ key: OpenRouter 50 lượt/ngày, key sai…)

const healthId = (a: Attempt) => `${a.key}\n${a.model}`
const healthOf = (a: Attempt): Health => {
    const id = healthId(a)
    let h = health.get(id)
    if (!h) health.set(id, (h = { fails: 0, okAt: 0, coolUntil: 0 }))
    return h
}
const cooling = (a: Attempt, now: number) => (keyCool.get(a.key) ?? 0) > now || healthOf(a).coolUntil > now

/** Model còn dùng được, tốt trước: ít lỗi liên tiếp → vừa trả lời tốt → thứ tự khởi đầu. */
function rank(attempts: Attempt[], now: number): Attempt[] {
    const recent = (a: Attempt) => (now - healthOf(a).okAt < RECENT_OK_MS ? healthOf(a).okAt : 0)
    return attempts
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => !cooling(a, now))
        .sort((x, y) => healthOf(x.a).fails - healthOf(y.a).fails || recent(y.a) - recent(x.a) || x.i - y.i)
        .map(({ a }) => a)
}

type FailKind = 'key' | 'rate' | 'auth' | 'missing' | 'error' | 'unusable'
interface Failure { kind: FailKind; reason: string; retryMs?: number }

const backoff = (base: number, fails: number, cap: number) => Math.min(cap, base * 2 ** Math.max(0, fails - 1))

function markOk(a: Attempt) {
    const h = healthOf(a)
    h.fails = 0; h.okAt = Date.now(); h.coolUntil = 0
}

function markFail(a: Attempt, f: Failure, n: number) {
    const now = Date.now()
    const h = healthOf(a)
    h.fails++
    let until = 0
    if (f.kind === 'key') keyCool.set(a.key, (until = now + (f.retryMs ?? 60 * MIN)))
    else if (f.kind === 'auth') keyCool.set(a.key, (until = now + 30 * MIN))
    else if (f.kind === 'missing') h.coolUntil = until = now + 6 * 60 * MIN
    else if (f.kind === 'rate') h.coolUntil = until = now + (f.retryMs ?? backoff(MIN, h.fails, 10 * MIN))
    else if (f.kind === 'error') h.coolUntil = until = now + backoff(20_000, h.fails, 5 * MIN)
    // 'unusable' (trả lời nhưng sai khuôn): chỉ tụt hạng, không nghỉ — lần sau vẫn có thể đúng.
    const rest = until ? ` — ${f.kind === 'key' || f.kind === 'auth' ? 'key' : 'model'} nghỉ ${Math.round((until - now) / 1000)}s` : ''
    console.warn(`[ai] ${n}/${MAX_ATTEMPTS} ${a.provider}/${a.model} failed: ${f.reason}${rest}`)
}

/** Hạn mức của cả key (đợi model khác cũng vô ích) hay chỉ model này — đọc body 429 (OpenRouter / Cloudflare ghi rõ). */
async function rateClass(res: Response): Promise<Failure> {
    const body = (await res.text().catch(() => '')).slice(0, 2000)
    const after = Number(res.headers.get('retry-after'))
    const reset = Number(body.match(/X-RateLimit-Reset"?\s*:\s*"?(\d{13})/i)?.[1]) - Date.now()
    const retryMs = reset > 0 ? reset : after > 0 ? after * 1000 : undefined
    if (/free-models-per-(day|min)|per[- ]day|daily|allocation|quota|credits/i.test(body)) {
        const perMin = /per-min/i.test(body)
        return { kind: 'key', reason: `429 (${perMin ? 'key limit/min' : 'key quota/day'})`, retryMs: retryMs ?? (perMin ? MIN : undefined) }
    }
    return { kind: 'rate', reason: '429', retryMs }
}

async function failureOf(res: Response): Promise<Failure> {
    if (res.status === 429) return rateClass(res)
    res.body?.cancel().catch(() => {})
    if (res.status === 401 || res.status === 403) return { kind: 'auth', reason: String(res.status) }
    if (res.status === 404) return { kind: 'missing', reason: '404' }
    return { kind: 'error', reason: String(res.status || 'no body') }
}

/** Model kế tiếp: hạng cao nhất chưa thử ở lượt này; thử hết rồi thì vòng lại từ đầu (vẫn bỏ model đang nghỉ). */
function nextAttempt(pool: Attempt[], tried: Set<string>, last: Attempt | null): Attempt | null {
    const fresh = pool.find((a) => !tried.has(healthId(a)))
    if (fresh) return fresh
    return pool.find((a) => a !== last) ?? pool[0] ?? null
}

/**
 * One answer: at most MAX_ATTEMPTS models, each a different one (best-ranked first — rank()); the free chain while its
 * window is open (or always, when there is no pro key), the pro key after it — null when none gave an `accept`ed
 * answer. A model that starts streaming content may finish (only `until`, the caller's hard deadline, cuts it); a
 * model that stays silent is dropped after its first-token wait so the next one still gets a turn.
 */
export async function runChain(
    env: AiEnv, chain: string, messages: unknown[], opts: ReturnType<typeof clampOpts>, until = Infinity,
    accept: (text: string) => boolean = () => true,
): Promise<string | null> {
    const free = attemptsFor(resolveFreeChain(chain, env), env)
    const pro = attemptsFor(resolveProChain(env), env)
    const freeUntil = pro.length ? Math.min(until, Date.now() + (Number(env.AI_FREE_TIMEOUT_MS) || FREE_WINDOW_MS)) : until
    const tried = new Set<string>()
    let last: Attempt | null = null
    for (let n = 1; n <= MAX_ATTEMPTS; n++) {
        const now = Date.now()
        if (now >= until) break
        const freePool = now < freeUntil ? rank(free, now) : []
        const isFree = freePool.length > 0
        const attempt = nextAttempt(isFree ? freePool : rank(pro, now), tried, last)
        if (!attempt) {
            console.warn('[ai] every model is cooling down — giving up')
            break
        }
        tried.add(healthId(attempt))
        last = attempt
        const firstTokenMs = Math.min(isFree ? FREE_FIRST_TOKEN_MS : PRO_FIRST_TOKEN_MS, until - now)
        const out = await tryAttempt(attempt, messages, opts, firstTokenMs, until)
        if (typeof out !== 'string') { markFail(attempt, out, n); continue }
        if (!accept(out)) { markFail(attempt, { kind: 'unusable', reason: 'unusable answer' }, n); continue }
        markOk(attempt)
        return out
    }
    return null
}

/** Fully consumes an OpenAI-compatible SSE stream and returns the concatenated content, dropping reasoning-only deltas. */
async function extractFullContent(upstreamBody: ReadableStream<Uint8Array>, onFirstContent: () => void): Promise<string> {
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
                if (content) {
                    if (!out) onFirstContent()
                    out += content
                }
            } catch {
                // malformed SSE chunk — skip
            }
        }
    }
    return out
}

/** Content của 1 model, hoặc vì sao không có (lỗi / im lặng quá `firstTokenMs` / quá `until` / chỉ ra reasoning) — caller
 *  ghi sức khoẻ rồi thử model kế tiếp. */
async function tryAttempt(attempt: Attempt, messages: unknown[], opts: ReturnType<typeof clampOpts>, firstTokenMs: number, until: number): Promise<string | Failure> {
    const { system, maxTokens, temperature } = opts
    const controller = new AbortController()
    let reason = ''
    const abortAfter = (ms: number, why: string) =>
        Number.isFinite(ms) ? setTimeout(() => ((reason = why), controller.abort()), Math.max(0, ms)) : null
    const firstTimer = abortAfter(firstTokenMs, 'no content in time')
    const hardTimer = abortAfter(until - Date.now(), 'deadline')
    try {
        const upstream = await fetch(attempt.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${attempt.key}` },
            body: JSON.stringify({
                ...PROVIDERS[attempt.provider].extraBody(attempt.model),
                model: attempt.model,
                messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
                stream: true,
                max_tokens: maxTokens,
                temperature,
            }),
            signal: controller.signal,
        })
        if (!upstream.ok || !upstream.body) return await failureOf(upstream)
        const text = await extractFullContent(upstream.body, () => clearTimeout(firstTimer))
        if (!text.trim()) return { kind: 'error', reason: 'empty content' }
        return text
    } catch (err) {
        return { kind: 'error', reason: reason || (err as Error).message }
    } finally {
        clearTimeout(firstTimer)
        clearTimeout(hardTimer)
    }
}

export async function handleAiStream(request: Request, env: AiEnv): Promise<Response> {
    // Called after index.ts's rate-limit gate — capped well above AI_LIMITS.chars (60000) so real messages
    // always fit, leaving headroom for JSON structure/opts overhead.
    const body = (await readBody(request, AI_STREAM_BODY_MAX)) as { chain?: string; messages?: unknown[]; opts?: Record<string, unknown> }
    const opts = clampOpts(body.opts)
    if (!validMessages(body.messages, opts.system ?? '')) {
        return jsonError(400, 'messages invalid or too long')
    }
    if (!resolveFreeChain('@default', env) && !resolveProChain(env)) {
        return jsonError(500, 'No AI models configured')
    }
    // Only role/content reach the providers — drop any other client-supplied fields riding along on each message.
    const messages = body.messages.map(({ role, content }) => ({ role, content }))
    const text = await runChain(env, body.chain ?? '@default', messages, opts)
    if (text) return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return jsonError(502, 'All AI models failed')
}

// Cloudflare Workers AI (cloudflareBase — cùng CLOU_KEY/CLOU_ACCOUNT với chain chat) — thử lần lượt tới khi có ảnh.
// flux-1-schnell nhanh (~5s) → flux-2-klein-4b đẹp hơn nhưng chậm (~15s, input multipart) → sdxl-lightning (miễn phí, có negative_prompt).
// FLUX không nhận negative_prompt — các yếu tố cần tránh chỉ đi vào model SDXL.
const IMAGE_NEGATIVE_PROMPT_FALLBACK = 'blurry, low quality, distorted, watermark, text'

interface ImageModel { model: string; body: (prompt: string, negative: string) => { body: BodyInit; json: boolean } }

const IMAGE_MODELS: ImageModel[] = [
    {
        model: '@cf/black-forest-labs/flux-1-schnell',
        body: (prompt) => ({ body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 8 }), json: true }),
    },
    {
        model: '@cf/black-forest-labs/flux-2-klein-4b',
        body: (prompt) => {
            const form = new FormData()
            form.append('prompt', prompt)
            form.append('width', '1024')
            form.append('height', '1024')
            return { body: form, json: false }
        },
    },
    {
        model: '@cf/bytedance/stable-diffusion-xl-lightning',
        body: (prompt, negative) => ({ body: JSON.stringify({ prompt, negative_prompt: negative }), json: true }),
    },
]

const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

/** 1 lần gọi model — FLUX trả JSON `{ result: { image: base64 jpeg } }`, SDXL trả thẳng ảnh nhị phân. */
async function runImageModel(base: string, key: string, m: ImageModel, prompt: string, negative: string): Promise<Response> {
    const { body, json } = m.body(prompt, negative)
    const res = await fetch(`${base}/run/${m.model}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, ...(json ? { 'content-type': 'application/json' } : {}) },
        body,
    })
    if (!res.ok) {
        const err = await res.json<{ errors?: { message?: string }[] }>().catch(() => ({}) as { errors?: { message?: string }[] })
        throw new Error(`${m.model} ${res.status}: ${err.errors?.[0]?.message || res.statusText}`)
    }
    const type = res.headers.get('content-type') || ''
    if (!type.includes('json')) return new Response(res.body, { headers: { 'Content-Type': type || 'image/png' } })
    const data = await res.json<{ result?: { image?: string }; errors?: { message?: string }[] }>()
    if (!data.result?.image) throw new Error(`${m.model}: ${data.errors?.[0]?.message || 'no image'}`)
    return new Response(base64ToBytes(data.result.image), { headers: { 'Content-Type': 'image/jpeg' } })
}

export async function handleAiImage(request: Request, env: AiEnv): Promise<Response> {
    const base = cloudflareBase(env)
    if (!env.CLOU_KEY || !base) return jsonError(500, 'Image generation not configured')

    // Called after index.ts's rate-limit gate — a prompt + negative prompt only, never an upload.
    const body = (await readBody(request, AI_IMAGE_BODY_MAX)) as { prompt?: string; negativePrompt?: string }
    if (!body.prompt) return jsonError(400, 'prompt required')

    const negative = body.negativePrompt || IMAGE_NEGATIVE_PROMPT_FALLBACK
    let lastErr: Error | null = null
    for (const m of IMAGE_MODELS) {
        try {
            return await runImageModel(base, env.CLOU_KEY, m, body.prompt, negative)
        } catch (err) {
            lastErr = err as Error
            console.warn('[ai] image', lastErr.message)
        }
    }
    return jsonError(502, lastErr?.message || 'Image generation failed')
}
