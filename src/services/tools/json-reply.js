// src/services/tools/json-reply.js
//
// Thuần: tách JSON object từ câu trả lời AI (model reasoning in suy luận TRƯỚC JSON — khối {...} cuối cùng parse
// được mới là câu trả lời) + dò chữ Hán/Kana/Hangul lẫn vào câu trả lời ngôn ngữ Latin.

/** Khối {...} cuối cùng parse được, hoặc null. */
export function parseJsonObject(raw) {
    const text = String(raw ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const end = text.lastIndexOf('}')
    for (let i = text.lastIndexOf('{', end); end !== -1 && i !== -1; i = i > 0 ? text.lastIndexOf('{', i - 1) : -1) {
        try {
            const parsed = JSON.parse(text.slice(i, end + 1))
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
        } catch { /* thử dấu '{' kế bên trái */ }
    }
    return null
}

// Flag `u` bắt buộc — thiếu nó dải 豈-﫿 khớp cả nửa surrogate mà mọi emoji dùng.
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힣豈-﫿]/u
const CJK_LANGS = new Set(['Chinese', 'Japanese', 'Korean'])

export function hasForeignScript(obj, languageName) {
    if (CJK_LANGS.has(languageName)) return false
    return Object.values(obj).some((v) => typeof v === 'string' && CJK.test(v))
}
