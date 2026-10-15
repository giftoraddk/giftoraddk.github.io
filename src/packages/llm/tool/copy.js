// src/packages/llm/tool/copy.js
//
// Thuần: nội dung 1 field kết quả dạng để dán sang chỗ khác (nút Sao chép trong app/svc-progress.js) — tags thành
// hashtag, content (HTML) kèm bản chữ thuần cho nơi không nhận HTML.

/** Field kết quả có nút Sao chép. */
export const COPYABLE = new Set(['title', 'description', 'content', 'tags'])

/** 'hộp quà|quà tết|#handmade' → '#hộpquà #quàtết #handmade' — hashtag không có khoảng trắng. */
export const hashtags = (tags) => String(tags ?? '').split('|')
    .map((t) => t.trim().replace(/^#+/, '').replace(/\s+/g, ''))
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(' ')

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** HTML → chữ thuần giữ dòng: hết khối (p, h*, li, div) / <br> xuống dòng, <li> thành "• ". */
export const htmlToText = (html) => String(html ?? '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|h[1-6]|li|div|ul|ol|figure|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
        if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** Chữ để chép của field `key` — tags thành hashtag, content thành chữ thuần, field khác giữ nguyên. */
export const copyText = (key, value) => (key === 'tags' ? hashtags(value) : key === 'content' ? htmlToText(value) : String(value ?? '').trim())
