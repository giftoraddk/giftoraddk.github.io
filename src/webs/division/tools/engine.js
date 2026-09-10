// src/webs/division/tools/engine.js
//
// Generic pipeline engine shared by every division — reads a division's `meta.steps` JSON config
// (see hook/superpowers/specs/2026-09-05-division-talk-design.md §1-2) instead of hardcoded
// per-department prompt builders. A `step` of `type: 'text'` is fully data-driven here; a step of
// `type: 'image'` is the one non-generalizable exception, handled by tools/image.js.
//
// Callers (svc-marketing.js, svc-talk.js) own the actual doc shape / Firestore persistence / UI
// running-vs-done tracking — this file only builds prompts, orders calls, and calls the AI.
import { generateText, demoteModel } from '@/services/tensor.js'

// value = gửi lên <web-select> (mã ngắn lưu vào doc.language); name = tên đầy đủ gửi cho AI trong
// system prompt (tránh model hiểu nhầm mã 2 ký tự, vd "en" có thể lẫn với từ khác).
export const LANGUAGE_OPTIONS = [
    { value: 'vi', label: 'Tiếng Việt', name: 'Vietnamese' },
    { value: 'en', label: 'English',    name: 'English' },
    { value: 'zh', label: '中文',        name: 'Chinese' },
    { value: 'ja', label: '日本語',      name: 'Japanese' },
    { value: 'ko', label: '한국어',      name: 'Korean' },
    { value: 'fr', label: 'Français',   name: 'French' },
]

// Dò chữ Hán/Kana/Hangul lẫn vào response của ngôn ngữ Latin. Flag `u` bắt buộc — thiếu nó, range
// 豈-﫿 (U+8C48-U+FAFF) khớp luôn theo UTF-16 code unit rời rạc, vô tình trùng cả dải surrogate
// U+D800-U+DFFF mà mọi emoji ngoài BMP (😊, 🎉, ...) dùng để mã hoá — khiến bất kỳ reply nào có
// emoji bị báo nhầm "lẫn ký tự ngôn ngữ khác". Có `u`, JS so khớp theo codepoint đầy đủ nên emoji
// (U+1F60A...) không rơi vào range CJK nữa.
const _CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿가-힣豈-﫿]/u
const _CJK_LANGS = new Set(['Chinese', 'Japanese', 'Korean'])

// Vài model free-tier (đặc biệt reasoning model) in suy luận TRƯỚC khi tới JSON thật dù prompt đã
// dặn "không giải thích gì thêm" — JSON thật luôn là khối {...} CUỐI CÙNG trong response, nên tìm
// từ '{' cuối tới '}' cuối thay vì chỉ strip code-fence ở đầu/cuối chuỗi.
function _cleanJson(raw) {
    const text  = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const start = text.lastIndexOf('{')
    const end   = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1)
    return text
}

function _parseJsonObject(raw, errMessage) {
    let parsed
    try { parsed = JSON.parse(_cleanJson(raw)) } catch (err) {
        console.error('[division/engine] JSON.parse failed:', err.message, '\nraw response:', raw)
        throw new Error(errMessage)
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.error('[division/engine] parsed value is not a plain object:', parsed, '\nraw response:', raw)
        throw new Error(errMessage)
    }
    return parsed
}

// Model free-tier thỉnh thoảng lẫn nguyên cụm chữ Hán/Nhật/Hàn vào response dù system prompt đã
// yêu cầu 1 ngôn ngữ Latin — chỉ kiểm khi ngôn ngữ đích KHÔNG phải chính CJK.
function _hasForeignScript(obj, languageName) {
    if (_CJK_LANGS.has(languageName)) return false
    return Object.values(obj).some(v => typeof v === 'string' && _CJK_PATTERN.test(v))
}

/**
 * Gọi AI + parse JSON, tự động thử lại ngầm tối đa 3 lần trước khi báo lỗi thật cho UI — model
 * free-tier đôi khi trả response hỏng (cắt cụt, lẫn suy luận, lẫn ngôn ngữ khác) một cách ngẫu
 * nhiên, lần gọi lại thường trúng model/kết quả khác ổn định hơn.
 */
export async function generateJsonWithRetry(ai, { system, user, maxTokens, temperature, languageName, errMessage }) {
    let lastErr
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const raw = await generateText(ai, [{ role: 'user', content: user }], { system, maxTokens, temperature })
            const obj = _parseJsonObject(raw, errMessage)
            if (_hasForeignScript(obj, languageName)) {
                console.error('[division/engine] response lẫn ký tự ngôn ngữ khác:', obj)
                throw new Error(errMessage)
            }
            return obj
        } catch (err) {
            lastErr = err
            console.warn(`[division/engine] JSON generation attempt ${attempt}/3 failed:`, err.message)
            // _parseJsonObject lỗi = request đã THÀNH CÔNG (có text trả về), chỉ là không phải JSON
            // hợp lệ — tensor.js không tự demote trong trường hợp này, phải ép thủ công để lần retry
            // kế tiếp thử model khác thay vì lặp lại đúng model vừa trả dữ liệu hỏng.
            await demoteModel(ai).catch(() => {})
        }
    }
    throw lastErr
}

// Toàn bộ field key xuất hiện trong pipeline của 1 division — dùng để khởi tạo bag `fields`
// phẳng rỗng. Step `type:'image'` không khai field trong `calls` (chỉ có `concept.contextKeys`)
// nên 'imagePrompt'/'pics' được thêm thủ công — 2 field CỐ ĐỊNH mọi step ảnh đều sinh ra.
export function allFieldKeys(division) {
    const keys = new Set()
    for (const step of division.meta.steps) {
        if (step.type === 'image') { keys.add('imagePrompt'); keys.add('pics'); continue }
        for (const call of step.calls) for (const f of call.fields) keys.add(f.key)
    }
    return [...keys]
}

// Chuỗi AI config cuối cùng truyền vào generateJsonWithRetry — ưu tiên 1 model "pinned" ổn định
// (PUBLIC_NVID) lên đầu nếu có, rồi tới AI riêng của division/entity (`entityAi`, override qua
// /admin/divisions), cuối cùng mới tới danh sách fallback chung (PUBLIC_NVID/GROQ/OPER) — dùng
// chung bởi svc-talk.js VÀ svc-sale.js (trước đây từng viết trùng y hệt ở svc-talk.js).
export function resolveAi(entityAi) {
    const nvid = import.meta.env.PUBLIC_NVID
    const pinned = nvid ? `${nvid}~pinned~nvidia/nemotron-3.5-lightning-30b-a3b` : ''
    const fallback = [import.meta.env.PUBLIC_NVID, import.meta.env.PUBLIC_GROQ, import.meta.env.PUBLIC_OPER].filter(Boolean).join('|')
    return [pinned, entityAi, fallback].filter(Boolean).join('|')
}

export function pick(obj, keys) {
    const out = {}
    for (const k of keys) out[k] = typeof obj[k] === 'string' ? obj[k] : ''
    return out
}

/**
 * Build {system,user} cho 1 call — tổng quát hoá buildStep1Prompt/buildStep2Prompt/buildStep3*Prompt cũ.
 * `call.role`/`call.task` (optional) ghi đè `step.role`/`step.task` CHỈ cho call này — dùng khi 1 call
 * cần hẳn 1 persona/nhiệm vụ khác biệt so với các call khác CÙNG step (vd step 'content' của
 * seed-marketing.js/seed-production.js có cả call viết content lẫn call chọn từ khoá SEO — 2 việc
 * cần role khác nhau hẳn dù chung 1 step để cùng đọc chung `fields` bag đã tích luỹ tới lúc đó).
 */
export function buildCallPrompt(step, call, topic, languageName, fieldsSoFar) {
    const shape       = call.fields.map(f => `  "${f.key}": "${f.desc}"`).join(',\n')
    // Bỏ qua contextKeys chưa có giá trị thật (vd 'productContext' khi division `requiresProduct`
    // nhưng chưa resolve được sản phẩm nào, hoặc chạy tay qua admin popup không qua svc-talk.js) —
    // tránh prompt lẫn dòng "key: " rỗng vô nghĩa.
    const contextKeys = (call.contextKeys || []).filter(k => (fieldsSoFar[k] || '').toString().trim())
    const contextBlock = contextKeys.length
        ? `\n\nExisting analysis:\n${contextKeys.map(k => `${k}: ${fieldsSoFar[k]}`).join('\n')}`
        : ''
    const system = `You are ${call.role || step.role}. ${call.task || step.task}

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no explanation), written in
${languageName}, with EXACTLY ${call.fields.length} of the fields below${contextKeys.length ? ' — based on the existing analysis provided, do not skip it' : ''}.
Respect each field's sentence-count limit to avoid truncation. Write EVERYTHING — headers, labels,
and any quoted example text below — in natural ${languageName}; the field descriptions are English
notes for you only, never copy their wording verbatim. Reply with ONLY the JSON object, starting
with "{" and ending with "}" — no intro like "Here is...":

{
${shape}
}`
    const user = `TOPIC: ${topic}\nOUTPUT_LANGUAGE: ${languageName}${contextBlock}`
    return { system, user }
}

/** Topo-sort `calls` theo `dependsOn` (mảng call.key) thành từng "wave" chạy song song trong cùng wave. */
export function orderCallWaves(calls) {
    const done = new Set()
    const waves = []
    let remaining = [...calls]
    while (remaining.length) {
        const wave = remaining.filter(c => (c.dependsOn || []).every(k => done.has(k)))
        if (!wave.length) throw new Error('[division/engine] circular dependsOn in step config')
        wave.forEach(c => done.add(c.key))
        waves.push(wave)
        remaining = remaining.filter(c => !wave.includes(c))
    }
    return waves
}

/**
 * Chạy trọn 1 step `type: 'text'` — tổng quát hoá _runStep1/_runStep2/_runStep3 cũ (field group độc
 * lập chạy song song, group phụ thuộc — vd step 3's content chờ titleDesc — chạy ở wave sau qua
 * `call.dependsOn`). Trả về patch merge của TOÀN BỘ field sinh ra trong step; caller tự persist +
 * stamp status/error (mỗi consumer có status vocab hơi khác nhau — svc-marketing giữ nguyên UI cũ).
 *
 * @param {object} step  StepConfig — đọc step.calls / step.role / step.task
 * @param {object} ctx
 * @param {string} ctx.topic
 * @param {string} ctx.languageName
 * @param {string} ctx.ai
 * @param {object} ctx.fields      Bag phẳng đã có TRƯỚC lượt chạy này (context + skip-check)
 * @param {string} ctx.errMessage  Message localized khi AI trả JSON hỏng (vd t.errBadResponse)
 * @param {(call:object) => boolean} [ctx.hasData]  Mặc định: call đã có field thật (some, không
 *   phải every — 1 field có data trong group coi như group đã "làm rồi", giống hành vi cũ)
 * @param {(key:string, fn:() => Promise<any>) => Promise<any>} ctx.runSub  Wrapper đánh dấu
 *   running/done cho UI (key = call.key) — xem svc-marketing.js/svc-talk.js's _runSub
 * @param {(partial:object) => void} [ctx.onPatch]  Gọi ngay khi 1 call xong — cập nhật UI tức thời
 *   trước khi cả step xong (giữ đúng UX "hiện dần từng sub-step" hiện có)
 */
export async function runTextStep(step, ctx) {
    const { topic, languageName, ai, fields, errMessage, runSub, onPatch } = ctx
    const hasData = ctx.hasData || (call => call.fields.some(f => (fields[f.key] || '').toString().trim()))
    const waves = orderCallWaves(step.calls)
    let acc = { ...fields }
    for (const wave of waves) {
        const results = await Promise.all(wave.map(async call => {
            if (hasData(call)) return pick(acc, call.fields.map(f => f.key))
            return runSub(call.key, async () => {
                const { system, user } = buildCallPrompt(step, call, topic, languageName, acc)
                const obj = await generateJsonWithRetry(ai, {
                    system, user, maxTokens: call.maxTokens, temperature: call.temperature, languageName, errMessage,
                })
                const partial = pick(obj, call.fields.map(f => f.key))
                onPatch?.(partial)
                return partial
            })
        }))
        acc = results.reduce((a, r) => ({ ...a, ...r }), acc)
    }
    return acc
}

/**
 * Chạy lại RIÊNG 1 call trong 1 step (khác `runTextStep` chạy CẢ step theo waves) — dùng bởi nút
 * "Tạo lại" cấp sub-step trong <svc-progress> (xem svc-progress.js's `_rfRegenerateRow`). Luôn chạy
 * lại (không check `hasData`, khác `runTextStep`) vì đây LÀ hành động regenerate chủ động của sếp;
 * `instruction` (tuỳ chọn) là chỉ dẫn thêm nhập tay, được nối vào cuối user prompt để ép model bám
 * đúng yêu cầu thay đổi thay vì lặp lại y hệt kết quả cũ.
 */
export async function regenerateCall(step, callKey, instruction, ctx) {
    const call = step.calls.find(c => c.key === callKey)
    if (!call) throw new Error(`[division/engine] call not found: ${callKey}`)
    const { topic, languageName, ai, fields, errMessage, runSub, onPatch } = ctx
    return runSub(call.key, async () => {
        const { system, user } = buildCallPrompt(step, call, topic, languageName, fields)
        const finalUser = instruction?.trim()
            ? `${user}\n\nBoss's additional instruction for THIS rewrite (follow it precisely when producing the fields below, overriding prior output): ${instruction.trim()}`
            : user
        const obj = await generateJsonWithRetry(ai, {
            system, user: finalUser, maxTokens: call.maxTokens, temperature: call.temperature, languageName, errMessage,
        })
        const partial = pick(obj, call.fields.map(f => f.key))
        onPatch?.(partial)
        return partial
    })
}
