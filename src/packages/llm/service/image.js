// src/packages/llm/service/image.js
//
// Ảnh header của step `type: 'image'` — phần CÒN LẠI ở client: prompt phong cách ảnh (master prompt + bảng màu +
// negative prompt), model ảnh (/v1/ai/image) và upload imgbb. Concept (topic → cảnh tiếng Anh) là 1 call ở Worker
// (fn/state.ts IMAGE_CONCEPT); figure chèn đầu `content` do route /image của Worker dựng. Đây là khuôn phong cách,
// không phải chuyên môn phòng ban — nút "mở ChatGPT/Gemini/Claude" của svc-progress vốn copy nó cho người dùng.
import { generateImage } from '@/services/shared/tensor-api.js'
import { uploadImageBlob } from '@/packages/adopted/service/photor.js'

// Nhãn 3 sub-step cố định của MỌI step `type: 'image'` — cơ chế của engine, không phải chuyên môn riêng phòng nào.
export const IMAGE_SUBSTEP_LABELS = [
    { key: 'concept',  vi: 'Mô tả ảnh',   en: 'Image concept' },
    { key: 'generate', vi: 'Tạo ảnh',     en: 'Generate image' },
    { key: 'upload',   vi: 'Tải ảnh lên', en: 'Upload image' },
]

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

// Prompt cuối gửi model text-to-image — `subject` là concept tiếng Anh Worker đã dịch (fields.imagePrompt).
// Template "Master Prompt" flat-lay editorial cố định, chỉ đổi [SUBJECT]/[COLOR PALETTE] — ảnh đồng bộ giữa các lần tạo.
export function buildImagePrompt(subject, colorsStr) {
    const palette = _describeColors(colorsStr)
    return `A sophisticated minimalist editorial flat lay featuring ${subject}. Carefully art-directed composition with elegant asymmetry and generous negative space. Premium contemporary aesthetic, refined color theory, harmonious palette of ${palette}, high-quality materials and subtle decorative details. Clean matte surface, soft diffused natural lighting, delicate realistic shadows, restrained styling, carefully balanced visual hierarchy, modern luxury branding, contemporary lifestyle campaign, tasteful botanical accents, subtle cultural influences, plain unbranded packaging with no visible text or logos. Minimal yet visually rich, calm, polished, timeless, premium, photorealistic, high-end commercial photography, top-down view, ultra-detailed, realistic textures.`
}

// Gửi qua `negative_prompt` của Workers AI — những gì KHÔNG muốn xuất hiện (chỉ model SDXL dự phòng dùng; FLUX bỏ qua).
export const IMAGE_NEGATIVE_PROMPT = 'text, watermark, logo, brand name, writing, letters, typography, label text, signature, caption, random text, distorted typography, cluttered composition, excessive decoration, oversaturated colors, harsh lighting, strong reflections, messy arrangement, cheap packaging, excessive props, unrealistic objects, awkward proportions, plastic-looking materials, heavy shadows, busy background, illustration, cartoon, anime, 3d render, cgi, digital art, low quality, blurry, deformed'

/** Model ảnh (Cloudflare Workers AI qua Worker, tự chuyển model dự phòng khi lỗi) — concept đã dịch, fallback topic. */
export const generateImageBlob = (imagePrompt, topic, colors) =>
    generateImage(buildImagePrompt(imagePrompt || topic, colors), IMAGE_NEGATIVE_PROMPT)

/** Upload imgbb → URL https cho POST /v1/fn/jobs/:id/image. */
export const uploadImage = (blob) => uploadImageBlob(blob)
