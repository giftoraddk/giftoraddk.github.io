// src/webs/division/tools/image.js
//
// Image-generation pipeline shared by any division step with `type: 'image'` (currently only
// `marketing`). Moved out of svc-marketing.js/prompts.js verbatim during the divisions/engine
// refactor (see hook/superpowers/specs/2026-09-05-division-talk-design.md) — only change is that
// the fixed IMAGE_CONTEXT_KEYS constant became a `contextKeys` param read from the division's
// `meta.steps[].concept.contextKeys` config.
import { uploadImageBlob } from '@/webs/media/tools/photor.js'

// Nhãn 3 sub-step cố định của MỌI step `type: 'image'` (không phải chuyên môn riêng của division
// nào — đây là cơ chế của engine, nên sống ở đây thay vì trong seed JSON của từng division).
export const IMAGE_SUBSTEP_LABELS = [
    { key: 'concept',  vi: 'Mô tả ảnh',   en: 'Image concept' },
    { key: 'generate', vi: 'Tạo ảnh',     en: 'Generate image' },
    { key: 'upload',   vi: 'Tải ảnh lên', en: 'Upload image' },
]

// Cùng quy ước mask key với src/services/tensor.js: splice `~k!t@d~` vào giữa key để né grep
// văn bản thuần trong bundle đã build — bóc marker này ra trước khi dùng.
const _MASK_MARKER = '~k!t@d~'
function _unmaskEnv(s) {
    return s?.includes(_MASK_MARKER) ? s.split(_MASK_MARKER).join('') : s
}

// alt="" attribute của <img> chèn vào content phải escape — title là text tự do (có thể chứa
// dấu ngoặc kép) được nội suy thẳng vào chuỗi HTML.
export function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Bóc <figure> ảnh CŨ (nếu có) khỏi ĐẦU content trước khi chèn ảnh MỚI — cần thiết khi regenerate
// ảnh SAU KHI đã từng thành công 1 lần (nút "Tạo lại ảnh" ở review phase), tránh chèn trùng 2
// <figure> liên tiếp. Vô hại (no-op) ở lượt chạy pipeline đầu tiên vì content lúc đó chưa có figure.
export function stripLeadingFigure(content) {
    return (content || '').replace(/^\s*<figure data-media-wrap="image"[^>]*>[\s\S]*?<\/figure>\s*/, '')
}

// Step 4a — dịch/diễn giải TOPIC (viết bằng bất kỳ ngôn ngữ nào) thành 1 mô tả cảnh/vật thể CỤ
// THỂ bằng tiếng Anh cho model text-to-image (SD3's CLIP text encoder chủ yếu hiểu tiếng Anh —
// đưa thẳng topic thô ngôn ngữ khác vào từng gây ảnh sai hẳn chủ đề, model rơi về mặc định
// stock-photo chung chung, vd "quà tri ân" ra toàn ảnh chân dung phụ nữ vì CLIP không hiểu được
// cụm từ). `contextKeys` chọn field nào trong `fields` (bag phẳng của division đang chạy) đưa vào
// làm ngữ cảnh — cố tình không đưa targetCustomer/desire... để tránh gợi ý model vẽ CHÂN DUNG NGƯỜI.
export function buildImageConceptPrompt(topic, fields, contextKeys = []) {
    const context = contextKeys.map(k => `${k}: ${fields[k] || ''}`).join('\n')
    const system = `You are an art director briefing a text-to-image model for a blog header photo.
Task: translate/interpret the TOPIC below (it may be written in ANY language) into 1 concrete,
concise ENGLISH visual description of a scene or object suitable as an editorial blog header photo.

Rules:
- Describe a SPECIFIC scene/object/product composition directly related to the topic — not a
  generic stock-photo cliche.
- Do NOT default to a portrait of a person (especially not gender-specific) unless the topic is
  literally about a specific person or profession.
- Describe items as PLAIN/UNBRANDED — never mention a brand name, logo, or any visible text/label
  on packaging or products.
- 1 sentence, purely visual/descriptive (no marketing language, no camera/lighting jargon — that
  is added separately).

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation) with 1 field:

{
  "imagePrompt": "1 concise English sentence describing the visual scene/object."
}`
    const user = `TOPIC: ${topic}\n\nContext:\n${context}`
    return { system, user }
}

// Bảng màu tham chiếu để chuyển hex user chọn thành tên màu tự nhiên cho prompt ảnh — CLIP text
// encoder hiểu "emerald green"/"terracotta" tốt hơn hẳn mã hex thô.
const NAMED_COLORS = {
    'emerald green': '#2ecc71', 'forest green': '#1e5631', 'sage green': '#9caf88',
    'olive green': '#6b8e23', 'teal': '#008080', 'navy blue': '#1b2a4a', 'slate blue': '#4a5a7a',
    'sky blue': '#7ec8e3', 'lavender': '#b39ddb', 'royal purple': '#5b2c6f', 'burgundy': '#6d1a2b',
    'dusty rose': '#c99aa0', 'blush pink': '#f4c2c2', 'coral': '#ff6f61', 'rust orange': '#b5502e',
    'terracotta': '#c9714f', 'mustard yellow': '#d4ac0d', 'champagne gold': '#d9c68e',
    'warm brass': '#b08d57', 'cream': '#f5f0e1', 'ivory': '#fffff0', 'charcoal grey': '#3b3b3b',
    'black': '#111111', 'white': '#fafafa', 'silver': '#c0c0c0',
}

// Bộ palette "premium editorial" dùng khi user KHÔNG chọn màu — random 1 trong số này thay vì để
// model tự chọn màu (dễ ra màu chói/không đồng bộ nếu prompt không ghim màu cụ thể nào).
const RANDOM_PALETTES = [
    'warm terracotta and cream', 'sage green and soft ivory', 'dusty rose and champagne gold',
    'deep navy and warm brass', 'muted burgundy and blush pink', 'charcoal grey and warm beige',
    'forest green and antique gold', 'soft lavender and warm white', 'teal and sand beige',
    'rust orange and warm cream',
]

const _HEX_RE = /^#[0-9a-f]{6}$/i

function _hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function _nearestColorName(hex) {
    const [r, g, b] = _hexToRgb(hex)
    let best = null, bestDist = Infinity
    for (const [name, ref] of Object.entries(NAMED_COLORS)) {
        const [rr, rg, rb] = _hexToRgb(ref)
        const dist = (r - rr) ** 2 + (g - rg) ** 2 + (b - rb) ** 2
        if (dist < bestDist) { bestDist = dist; best = name }
    }
    return best
}

// `colorsStr` — chuỗi hex `|`-nối từ <web-colors>, '' nếu user không chọn màu nào. Có màu -> map
// từng hex sang tên gần nhất (dedupe); không có -> random 1 palette có sẵn.
function _describeColors(colorsStr) {
    const hexList = (colorsStr || '').split('|').map(c => c.trim()).filter(c => _HEX_RE.test(c))
    if (!hexList.length) return RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)]
    return [...new Set(hexList.map(_nearestColorName))].join(' and ')
}

// Step 4b — build chuỗi prompt cuối cùng gửi cho model text-to-image (Hugging Face Inference
// API). `subject` là mô tả tiếng Anh đã dịch ở buildImageConceptPrompt (KHÔNG phải topic thô).
// Template "Master Prompt" phong cách flat-lay editorial cao cấp (đồng nhất nhận diện thương hiệu
// giữa nhiều lần tạo ảnh) — chỉ đổi phần [SUBJECT]/[COLOR PALETTE], phần còn lại cố định.
export function buildImagePrompt(subject, colorsStr) {
    const palette = _describeColors(colorsStr)
    return `A sophisticated minimalist editorial flat lay featuring ${subject}. Carefully art-directed composition with elegant asymmetry and generous negative space. Premium contemporary aesthetic, refined color theory, harmonious palette of ${palette}, high-quality materials and subtle decorative details. Clean matte surface, soft diffused natural lighting, delicate realistic shadows, restrained styling, carefully balanced visual hierarchy, modern luxury branding, contemporary lifestyle campaign, tasteful botanical accents, subtle cultural influences, plain unbranded packaging with no visible text or logos. Minimal yet visually rich, calm, polished, timeless, premium, photorealistic, high-end commercial photography, top-down view, ultra-detailed, realistic textures.`
}

// Gửi qua `parameters.negative_prompt` của Hugging Face Inference API — liệt kê rõ những gì KHÔNG
// muốn xuất hiện, bổ sung cho hậu tố tích cực ở buildImagePrompt.
export const IMAGE_NEGATIVE_PROMPT = 'text, watermark, logo, brand name, writing, letters, typography, label text, signature, caption, random text, distorted typography, cluttered composition, excessive decoration, oversaturated colors, harsh lighting, strong reflections, messy arrangement, cheap packaging, excessive props, unrealistic objects, awkward proportions, plastic-looking materials, heavy shadows, busy background, illustration, cartoon, anime, 3d render, cgi, digital art, low quality, blurry, deformed'

/**
 * Nửa ĐẦU (rẻ, an toàn) của step `type: 'image'` — chỉ dịch/diễn giải concept sang tiếng Anh, KHÔNG
 * gọi Hugging Face. Tách riêng khỏi runImageGenerate() để caller (svc-talk.js/admin-base.js) có thể
 * dừng pipeline NGAY sau bước này, chờ sếp chọn "Tạo ảnh bằng AI" hay "Bỏ qua" trước khi tốn 1 lệnh
 * gọi ảnh thật — xem svc-progress.js's image-choice UI.
 *
 * @param {object}   opts
 * @param {string}   opts.topic       Chủ đề gốc (ngôn ngữ bất kỳ)
 * @param {object}   opts.fields      Bag phẳng hiện có của lượt chạy (đọc contextKeys)
 * @param {string[]} opts.contextKeys Field nào trong `fields` đưa vào prompt dịch concept
 * @param {(opts:{system,user,maxTokens,temperature,languageName}) => Promise<object>} opts.generateJson
 * @param {(key:string) => boolean} opts.hasData   'concept' đã có `fields.imagePrompt` thật chưa
 * @param {(key:string, fn:() => Promise<any>) => Promise<any>} opts.runSub
 * @returns {Promise<{imagePrompt: string}>}
 */
export async function runImageConcept({ topic, fields, contextKeys = [], generateJson, hasData, runSub }) {
    const subject = hasData('concept')
        ? (fields.imagePrompt || topic)
        : await runSub('concept', async () => {
            const { system, user } = buildImageConceptPrompt(topic, fields, contextKeys)
            const obj = await generateJson({ system, user, maxTokens: 150, temperature: 0.7, languageName: 'English' })
            return typeof obj.imagePrompt === 'string' && obj.imagePrompt.trim() ? obj.imagePrompt.trim() : topic
        })
    return { imagePrompt: subject }
}

/**
 * Nửa SAU (tốn kém) — gọi Hugging Face sinh ảnh thật + upload, dùng concept ĐÃ CÓ SẴN (từ
 * runImageConcept() hoặc từ lượt chạy trước — KHÔNG tự dịch lại). Trả về patch
 * { imagePrompt, pics, content } để caller merge vào `fields` phẳng.
 *
 * @param {object}   opts
 * @param {string}   opts.topic   Chủ đề gốc — chỉ dùng làm fallback nếu fields.imagePrompt rỗng
 * @param {object}   opts.fields  Bag phẳng hiện có — đọc `imagePrompt`/`title`/`content` cũ
 * @param {string}   opts.colors  Hex `|`-nối từ <web-colors>, '' = random palette
 * @param {(key:string, fn:() => Promise<any>) => Promise<any>} opts.runSub
 */
export async function runImageGenerate({ topic, fields, colors, runSub }) {
    const subject = fields.imagePrompt || topic
    const promptText = buildImagePrompt(subject, colors)
    const altText = fields.title || topic

    // Model free serverless của HF thỉnh thoảng trả 503 "model đang load" ở lần gọi đầu (cold
    // start) hoặc lỗi mạng thoáng qua — retry có backoff tăng dần (không delay ở lần đầu).
    const hfKey = _unmaskEnv(import.meta.env.PUBLIC_HUGGIN)
    if (!hfKey) throw new Error('PUBLIC_HUGGIN chưa được cấu hình')

    let lastErr
    for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) await new Promise(r => setTimeout(r, attempt * 3000))
        try {
            const blob = await runSub('generate', async () => {
                const res = await fetch('https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers', {
                    method: 'POST',
                    headers: { authorization: `Bearer ${hfKey}`, 'content-type': 'application/json' },
                    body: JSON.stringify({ inputs: promptText, parameters: { negative_prompt: IMAGE_NEGATIVE_PROMPT } }),
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(`Hugging Face ${res.status}: ${err.error || res.statusText}`)
                }
                return res.blob()
            })
            const url = await runSub('upload', async () => uploadImageBlob(blob))
            const figure = `<figure data-media-wrap="image" data-align="center"><img src="${escapeAttr(url)}" alt="${escapeAttr(altText)}"></figure>`
            return { imagePrompt: subject, pics: url, content: `${figure}${stripLeadingFigure(fields.content)}` }
        } catch (err) {
            lastErr = err
            console.warn(`[division/image] generation attempt ${attempt}/3 failed:`, err.message)
        }
    }
    throw lastErr
}

/**
 * Chạy trọn step `type: 'image'` trong 1 lần (concept + generate + upload) — giữ lại cho lượt
 * "Tạo lại ảnh" (regenerate), vốn LUÔN tái dùng concept đã dịch (`hasData` truyền vào luôn trả
 * true) nên gộp cả 2 nửa lại làm 1 lệnh gọi cho gọn, không cần dừng chờ chọn gì thêm.
 */
export async function runImageStep({ topic, fields, colors, contextKeys = [], generateJson, hasData, runSub }) {
    const { imagePrompt } = await runImageConcept({ topic, fields, contextKeys, generateJson, hasData, runSub })
    return runImageGenerate({ topic, fields: { ...fields, imagePrompt }, colors, runSub })
}
