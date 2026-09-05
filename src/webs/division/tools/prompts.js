// src/webs/division/tools/prompts.js
//
// Prompt builders for the AI pipeline of <svc-marketing>, condensed from the 18-step framework
// in hook/maketing.md (Topic -> Customer -> Situation -> Need -> Pain -> Desire -> Fear/Objection
// -> Buying Motivation -> Insight -> Content Strategy -> Content). Each builder returns
// { system, user } messages for tensor.js's generateText(). AI is asked to return JSON only (no
// markdown/code fence) so callers can JSON.parse it directly.
//
// Each field description below caps BOTH the number of enumerated items ("top 3", not "at least
// 5+") AND the sentence count — asking for open-ended lists ("liệt kê ít nhất 5...") while also
// asking for a short field is self-contradictory and reliably produces responses too long for a
// single generateText() call's maxTokens, truncating mid-JSON (confirmed in production: a step-1
// call with all 9 fields cut off mid-string at ~5200 chars under maxTokens:1600). To stay inside
// a safe token budget per call, svc-marketing.js additionally calls buildStep1Prompt() 3 times
// (STEP1_GROUPS, 3 fields per call) instead of once for all 9 fields, and step 3's `content`
// (a full article — inherently long) is generated in its own dedicated call, separate from
// `title`/`description`.

export const STEP1_KEYS = [
    'topicAnalysis', 'targetCustomer', 'customerSituation', 'customerNeeds',
    'painPoints', 'customerDesires', 'fearsObjections', 'buyingMotivation', 'customerInsight',
]

// 3 fields per call — keeps every step-1 generateText() call small enough to finish well inside
// its maxTokens budget. svc-marketing.js's _runStep1() iterates this and merges the 3 results.
export const STEP1_GROUPS = [
    ['topicAnalysis', 'targetCustomer', 'customerSituation'],
    ['customerNeeds', 'painPoints', 'customerDesires'],
    ['fearsObjections', 'buyingMotivation', 'customerInsight'],
]

export const STEP2_KEYS = ['contentPillars', 'funnelStrategy', 'contentAngles']

// 1 field/lệnh — 3 field vốn đã ít nhưng vẫn bị cắt cụt giữa chừng khi gộp 1 lệnh (xác nhận thực
// tế: Unterminated string ở ~1191 ký tự dù maxTokens:1200) — tách tối đa giống STEP1_GROUPS.
// svc-marketing.js's _runStep2() lặp qua đây (song song, 3 field độc lập nhau) rồi merge kết quả.
export const STEP2_GROUPS = STEP2_KEYS.map(k => [k])

export const MKT_ALL_KEYS = [...STEP1_KEYS, ...STEP2_KEYS]

// value = gửi lên <web-select> (mã ngắn lưu vào doc.language); name = tên đầy đủ gửi cho AI
// trong system prompt (tránh model hiểu nhầm mã 2 ký tự, vd "en" có thể lẫn với từ khác).
export const LANGUAGE_OPTIONS = [
    { value: 'vi', label: 'Tiếng Việt', name: 'Vietnamese' },
    { value: 'en', label: 'English',    name: 'English' },
    { value: 'zh', label: '中文',        name: 'Chinese' },
    { value: 'ja', label: '日本語',      name: 'Japanese' },
    { value: 'ko', label: '한국어',      name: 'Korean' },
    { value: 'fr', label: 'Français',   name: 'French' },
]

const STEP1_FIELD_DESC = {
    topicAnalysis: 'Which category the topic belongs to, what problem it solves, who cares about it, why people search for or ignore it. Max 3 sentences.',
    targetCustomer: 'Primary target customer profile: current situation, search behavior, who they trust, what drives them to act. Max 3 sentences.',
    customerSituation: 'Current situation: what they are doing, what frustrates them or is missing, what they are trying to achieve, what happens if they do nothing. Max 3 sentences.',
    customerNeeds: 'Needs at 3 levels — functional, emotional, identity — 1 short sentence each. Max 3 sentences total.',
    painPoints: 'ONLY the top 3 most important pain points (not 5+) — 1 short sentence each (the problem + its main emotion/consequence). Max 3 sentences total, no long numbered lists.',
    customerDesires: 'What the customer truly wants: 1 sentence surface desire, 1 sentence deeper/emotional desire, 1 sentence transformation. Max 3 sentences total.',
    fearsObjections: 'ONLY the top 3 most common objections (not 5+) — 1 short sentence each, combining the real reason with the response angle. Max 3 sentences total.',
    buyingMotivation: 'Strongest buying motivation — current problem + desired outcome + trigger — written as 1 paragraph of 2-3 sentences.',
    customerInsight: '1 DEEP, specific, surprising customer insight — connecting what they say/do/fear/want and why. 2-3 sentences, must NOT repeat content from other fields.',
}

/**
 * Step 1 — Strategy Analysis (hook/maketing.md step 1-9). `keys` (mặc định toàn bộ 9 field, dùng
 * qua STEP1_GROUPS để gọi 3 field/lần) chọn field nào đưa vào JSON shape yêu cầu AI trả về.
 */
export function buildStep1Prompt(topic, languageName, keys = STEP1_KEYS) {
    const shape = keys.map(k => `  "${k}": "${STEP1_FIELD_DESC[k]}"`).join(',\n')
    const system = `You are a Senior Content Strategist, Customer Researcher, and Consumer
Psychologist. Task: deeply analyze 1 marketing TOPIC to understand the customer BEFORE writing
any content. Do NOT write marketing content at this step — analysis only.

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation), written in
${languageName}, with EXACTLY ${keys.length} of the fields below. Each field MUST respect the
sentence-count limit stated in its description — this is mandatory to avoid the response getting
too long and truncated mid-way. Use ONLY ${languageName} — including holiday names/foreign terms —
do not insert any word or character from another language:

{
${shape}
}`
    const user = `TOPIC: ${topic}\nOUTPUT_LANGUAGE: ${languageName}`
    return { system, user }
}

const STEP2_FIELD_DESC = {
    contentPillars: 'ONLY the 3 most important content pillars (not 5+), directly matching the analyzed pain/need/desire — 1 short sentence each (name + purpose). Max 3 sentences total.',
    funnelStrategy: 'How content guides the customer through Awareness -> Interest -> Consideration -> Conversion, combined into 1 paragraph of 3-4 sentences.',
    contentAngles: 'ONLY the 3 most specific content angles (not 6+), 1 short sentence each tied to exactly 1 pain/desire/insight. Max 3 sentences total.',
}

// Content strategy chỉ thật sự cần phần khách hàng liên quan trực tiếp tới pillar/funnel/angle —
// không cần dump nguyên 9 field step 1. Input lớn cộng model fallback context window nhỏ có thể
// khiến response bị cắt cụt ngay cả khi maxTokens còn dư (đúng nguyên nhân đã xác nhận ở step 3
// trước đây, xem STEP3_CONTEXT_KEYS) — giảm input là hướng phòng ngừa trực tiếp cho step 2 luôn.
const STEP2_CONTEXT_KEYS = ['targetCustomer', 'painPoints', 'customerDesires', 'buyingMotivation', 'customerInsight']

/**
 * Step 2 — Content Strategy (hook/maketing.md step 10-12), dùng mkt của step 1 làm context.
 * `keys` (mặc định toàn bộ 3 field, dùng qua STEP2_GROUPS để gọi 1 field/lần) chọn field nào đưa
 * vào JSON shape yêu cầu AI trả về.
 */
export function buildStep2Prompt(topic, languageName, mkt, keys = STEP2_KEYS) {
    const context = STEP2_CONTEXT_KEYS.map(k => `${k}: ${mkt[k] || ''}`).join('\n')
    const shape = keys.map(k => `  "${k}": "${STEP2_FIELD_DESC[k]}"`).join(',\n')
    const system = `You are a Content Marketing Strategist. Based on the customer analysis already
provided below (do not skip it, do not write a generic strategy unrelated to it), build a content
strategy.

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation), written in
${languageName}, with EXACTLY ${keys.length} of the fields below, each respecting the sentence-count
limit stated in its description. Use ONLY ${languageName} — including holiday names/foreign terms —
do not insert any word or character from another language:

{
${shape}
}`
    const user = `TOPIC: ${topic}\nOUTPUT_LANGUAGE: ${languageName}\n\nExisting customer analysis:\n${context}`
    return { system, user }
}

// Step 3 chỉ cần phần chiến lược thật sự dùng để viết (đúng các field 2 system prompt bên dưới
// đã tự tham chiếu tên: customerSituation/painPoints cho mở bài, customerInsight/contentAngles
// cho thân bài, buyingMotivation/contentPillars cho CTA) — không cần dump nguyên 12 field. Input
// prompt lớn (12 field x vài câu) cộng với model fallback có context window nhỏ có thể khiến
// provider chỉ còn rất ít chỗ cho output, bị cắt cụt ngay cả khi maxTokens yêu cầu còn dư (case
// thực tế: response chỉ ~113 ký tự dù maxTokens: 500) — giảm input là hướng phòng ngừa trực tiếp.
const STEP3_CONTEXT_KEYS = [
    'customerSituation', 'painPoints', 'customerInsight', 'buyingMotivation', 'contentPillars', 'contentAngles',
]

/** Step 3a — Title + Description (ngắn, gọi riêng khỏi content để không bị content kéo dài lấn hết token). */
export function buildStep3TitleDescPrompt(topic, languageName, mkt) {
    const context = STEP3_CONTEXT_KEYS.map(k => `${k}: ${mkt[k] || ''}`).join('\n')
    const system = `You are a Copywriter specialized in SEO content marketing. Based on the
customer/content strategy analyzed below (do not write directly from the topic), write a title +
description for an SEO-optimized Blog post.

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation), written in
${languageName}, with EXACTLY 2 of the fields below. Use ONLY ${languageName} — including holiday
names/foreign terms — do not insert any word or character from another language:

{
  "title": "SEO-optimized title, about 50-60 characters, containing the main keyword related to the topic, click-worthy but not misleading clickbait. 1 sentence.",
  "description": "Short 2-3 sentence description, written like a natural Facebook post (emoji/line breaks welcome where fitting), usable both as a caption and as an SEO meta description."
}`
    const user = `TOPIC: ${topic}\nOUTPUT_LANGUAGE: ${languageName}\n\nAnalyzed strategy:\n${context}`
    return { system, user }
}

/** Step 3b — Content (bài viết đầy đủ, gọi riêng với budget token lớn hơn hẳn vì đây là field dài nhất). */
export function buildStep3ContentPrompt(topic, languageName, mkt, title) {
    const context = STEP3_CONTEXT_KEYS.map(k => `${k}: ${mkt[k] || ''}`).join('\n')
    const system = `You are a Copywriter specialized in SEO content marketing. Write content BASED
ON the customer/content strategy analyzed below (do not write directly from the topic, must reflect
the analyzed insight/pain/desire/pillar/angle). Target format: SEO-optimized Blog post, the
finalized title is "${title}".

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation), written in
${languageName}, with EXACTLY 1 of the fields below. Use ONLY ${languageName} — including holiday
names/foreign terms — do not insert any word or character from another language:

{
  "content": "Full content as valid HTML (use <h2>/<h3>/<p>/<ul>/<li> tags where appropriate), standard SEO blog structure, with an opening that states the problem (based on customerSituation/painPoints), a body developed from customerInsight/contentAngles, and a closing CTA fitting the awareness/interest funnel stage (no direct sales CTA if the insight shows the customer hasn't recognized the problem yet). About 400-600 words."
}`
    const user = `TOPIC: ${topic}\nOUTPUT_LANGUAGE: ${languageName}\n\nAnalyzed strategy:\n${context}`
    return { system, user }
}

// Step 4a — dịch/diễn giải TOPIC (viết bằng bất kỳ ngôn ngữ nào user chọn) thành 1 mô tả cảnh/vật
// thể CỤ THỂ bằng tiếng Anh cho model text-to-image (SD3's CLIP text encoder chủ yếu hiểu tiếng
// Anh — đưa thẳng topic thô ngôn ngữ khác vào từng gây ảnh sai hẳn chủ đề, model rơi về mặc định
// stock-photo chung chung, vd "quà tri ân" ra toàn ảnh chân dung phụ nữ vì CLIP không hiểu được
// cụm từ). Context CHỈ lấy topicAnalysis/contentPillars (không lấy targetCustomer/desire...) —
// cố tình tránh gợi ý model vẽ CHÂN DUNG NGƯỜI, giữ mô tả tập trung vào chủ đề/vật thể/bối cảnh.
const IMAGE_CONTEXT_KEYS = ['topicAnalysis', 'contentPillars']

export function buildImageConceptPrompt(topic, mkt) {
    const context = IMAGE_CONTEXT_KEYS.map(k => `${k}: ${mkt[k] || ''}`).join('\n')
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

// Bảng màu tham chiếu để chuyển hex user chọn (qua <web-colors>, xem svc-marketing.js's
// _rbInputPhase) thành tên màu tự nhiên cho prompt ảnh — CLIP text encoder hiểu "emerald green"/
// "terracotta" tốt hơn hẳn mã hex thô (model không "đọc" được #2ebd85 như 1 màu cụ thể).
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

// `colorsStr` — chuỗi hex `|`-nối từ <web-colors> (cùng quy ước với mainColors của các component
// apex khác), '' nếu user không chọn màu nào. Có màu -> map từng hex sang tên gần nhất (dedupe);
// không có -> random 1 palette có sẵn (xem RANDOM_PALETTES) thay vì để prompt thiếu hẳn phần màu.
function _describeColors(colorsStr) {
    const hexList = (colorsStr || '').split('|').map(c => c.trim()).filter(c => _HEX_RE.test(c))
    if (!hexList.length) return RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)]
    return [...new Set(hexList.map(_nearestColorName))].join(' and ')
}

// Step 4b — build chuỗi prompt cuối cùng gửi cho model text-to-image (Hugging Face Inference API,
// xem svc-marketing.js's _runStep4). `subject` là mô tả tiếng Anh đã dịch ở buildImageConceptPrompt
// (KHÔNG phải topic thô). `colorsStr` là hex user chọn qua <web-colors> ('' -> random palette).
// Template "Master Prompt" phong cách flat-lay editorial cao cấp (đồng nhất nhận diện thương hiệu
// giữa nhiều lần tạo ảnh) — chỉ đổi phần [SUBJECT]/[COLOR PALETTE], phần còn lại cố định để giữ
// đúng 1 aesthetic xuyên suốt. Đã thay "elegant packaging and refined typography where appropriate"
// (bản gốc) thành "plain unbranded packaging with no visible text or logos" — giữ đúng yêu cầu
// không có chữ/logo/brand trong ảnh, kết hợp negative_prompt riêng (xem IMAGE_NEGATIVE_PROMPT).
export function buildImagePrompt(subject, colorsStr) {
    const palette = _describeColors(colorsStr)
    return `A sophisticated minimalist editorial flat lay featuring ${subject}. Carefully art-directed composition with elegant asymmetry and generous negative space. Premium contemporary aesthetic, refined color theory, harmonious palette of ${palette}, high-quality materials and subtle decorative details. Clean matte surface, soft diffused natural lighting, delicate realistic shadows, restrained styling, carefully balanced visual hierarchy, modern luxury branding, contemporary lifestyle campaign, tasteful botanical accents, subtle cultural influences, plain unbranded packaging with no visible text or logos. Minimal yet visually rich, calm, polished, timeless, premium, photorealistic, high-end commercial photography, top-down view, ultra-detailed, realistic textures.`
}

// Gửi qua `parameters.negative_prompt` của Hugging Face Inference API (xác nhận field này có hỗ
// trợ qua docs chính thức) — liệt kê rõ những gì KHÔNG muốn xuất hiện, bổ sung cho hậu tố tích cực
// ở buildImagePrompt (model text-to-image thường tuân theo negative_prompt tốt hơn là chỉ dựa vào
// mô tả phủ định trong câu prompt chính). Gộp nhóm "no text/logo/brand" (đã xác nhận là bug thật —
// ảnh trước đây tự vẽ chữ/nhãn hiệu lên sản phẩm) với nhóm "premium editorial flat lay" đi kèm
// Master Prompt ở trên (tránh bố cục lộn xộn/màu chói/ánh sáng gắt không hợp phong cách tối giản).
export const IMAGE_NEGATIVE_PROMPT = 'text, watermark, logo, brand name, writing, letters, typography, label text, signature, caption, random text, distorted typography, cluttered composition, excessive decoration, oversaturated colors, harsh lighting, strong reflections, messy arrangement, cheap packaging, excessive props, unrealistic objects, awkward proportions, plastic-looking materials, heavy shadows, busy background, illustration, cartoon, anime, 3d render, cgi, digital art, low quality, blurry, deformed'
