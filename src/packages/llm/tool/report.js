// src/packages/llm/tool/report.js
//
// Thuần: nội dung báo cáo (PDF) của 1 job — đúng cây step → call → field mà <svc-progress> hiện cho sếp: field máy đọc
// (outline `hidden`) bỏ đi, mã máy [CODE] ẩn (tool/codes.js), step ảnh bỏ qua (ảnh đã nằm đầu `content`). Không biết
// gì về pdfmake — service/pdf.js dựng tài liệu từ đây.
import { hideCodes } from './codes.js'

const label = (o, lang) => o?.[lang] ?? o?.vi ?? ''

// Giá trị 1 field như sếp đọc: `content` giữ HTML, `tags` nối bằng dấu phẩy, còn lại là chữ thuần.
function valueOf(key, raw) {
    if (key === 'content') return { html: raw }
    if (key === 'tags') return { text: raw.split('|').filter(Boolean).join(', ') }
    return { text: hideCodes(raw) }
}

/**
 * Các phần của 1 job → [{ title, items: [{ label, text } | { label, html }] }] — chỉ step/field đã có nội dung.
 * Call có đúng 1 field trùng tên call → nhãn là tên call (như <svc-progress> không lặp lại nhãn).
 */
export function jobSections(job, outline, lang = 'vi') {
    const fields = job?.fields ?? {}
    return (outline?.steps ?? [])
        .filter((step) => step.type !== 'image')
        .map((step) => ({
            title: label(step, lang),
            items: (step.calls ?? []).flatMap((call) => {
                const single = call.fields.length === 1 && call.fields[0].key === call.key
                return call.fields
                    .filter((f) => !f.hidden && String(fields[f.key] ?? '').trim())
                    .map((f) => ({ label: label(single ? call : f, lang), ...valueOf(f.key, String(fields[f.key])) }))
            }),
        }))
        .filter((section) => section.items.length)
}

// `**đậm**` trong 1 dòng → [{ text, bold }] (dấu * lẻ giữ nguyên).
const spansOf = (line) => line.split(/\*\*(.+?)\*\*/g).map((text, i) => ({ text, bold: i % 2 === 1 })).filter((s) => s.text)

// "nhãn: giá trị" — nhãn ngắn (≤ 40 ký tự, ≤ 6 từ), sau dấu hai chấm có khoảng trắng (không bắt "https://…").
const KV = /^([^:：]{1,40}?)\s*[:：]\s+(\S.*)$/
const kvOf = (line) => {
    const m = KV.exec(line)
    const label = m?.[1].replace(/\*\*/g, '').trim()
    return m && label && label.split(/\s+/).length <= 6 ? { label, value: m[2] } : null
}
const kvSpans = ({ label, value }) => [{ text: `${label}: `, bold: true }, ...spansOf(value)]
const plainLine = (line) => !/^(#{1,6}|[-*•+–]|\d{1,3}[.)])\s/.test(line)

/**
 * Chữ thuần AI viết → khối để trình bày: { type: 'h' | 'p', spans } hoặc { type: 'ul' | 'ol', items: [spans] }.
 * Mỗi dòng 1 đoạn; dòng "- …" / "• …" / "1. …" liền nhau gộp thành 1 danh sách; "# …" là tiêu đề nhỏ.
 * Nhóm thuộc tính (2026-10-20 — "Cụ thể hoá thành phần": "Khung xe\nSize: …\nMaterial: …\n\nĐộng cơ\n…"): ≥ 2 dòng
 * "nhãn: giá trị" liền nhau → danh sách chấm tròn, nhãn đậm; dòng ngắn ngay trên (tên thành phần, không dấu chấm câu cuối)
 * → tiêu đề nhỏ của nhóm. Trước đây mỗi dòng 1 đoạn ngang hàng → không phân biệt được từng thành phần.
 */
export function textBlocks(text) {
    const blocks = []
    const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim())
    // chuỗi dòng "nhãn: giá trị" liền nhau (không dòng trống) bắt đầu ở `from`
    const kvRun = (from) => { let n = 0; while (from + n < lines.length && plainLine(lines[from + n]) && kvOf(lines[from + n])) n++; return n }
    const nameAt = (i, min) => plainLine(lines[i]) && !kvOf(lines[i]) && lines[i].length <= 60 && !/[.!?。:：]$/.test(lines[i]) && kvRun(i + 1) >= min
    // Đã có 1 nhóm đủ chuẩn (tên + ≥ 2 thuộc tính) → thành phần chỉ 1 thuộc tính cũng là nhóm (trình bày đồng đều)
    const minKv = lines.some((l, i) => l && nameAt(i, 2)) ? 1 : 2
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue
        const named = nameAt(i, minKv)
        const run = named ? kvRun(i + 1) : plainLine(line) ? kvRun(i) : 0
        if (named || run >= 2) {
            if (named) blocks.push({ type: 'h', spans: spansOf(line.replace(/^\*\*(.+)\*\*$/, '$1')) })
            const from = named ? i + 1 : i
            blocks.push({ type: 'ul', items: lines.slice(from, from + run).map((l) => kvSpans(kvOf(l))) })
            i = from + run - 1
            continue
        }
        const heading = /^#{1,6}\s+(.+)$/.exec(line)
        const bullet = /^[-*•+–]\s+(.+)$/.exec(line)
        const numbered = /^\d{1,3}[.)]\s+(.+)$/.exec(line)
        const type = bullet ? 'ul' : numbered ? 'ol' : null
        if (type) {
            const spans = spansOf((bullet ?? numbered)[1])
            const last = blocks.at(-1)
            if (last?.type === type) last.items.push(spans)
            else blocks.push({ type, items: [spans] })
        } else {
            blocks.push({ type: heading ? 'h' : 'p', spans: spansOf(heading ? heading[1] : line) })
        }
    }
    return blocks
}

const slugOf = (text, max) => String(text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '')

/** Tên file từ chủ đề (+ `-<tên phòng>` khi là báo cáo 1 phòng): bỏ dấu, chỉ chữ-số-gạch, chủ đề tối đa 60 ký tự. */
export function pdfName(topic, fallback = 'report', department = '') {
    const dept = slugOf(department, 40)
    return `${slugOf(topic, 60) || fallback}${dept ? `-${dept}` : ''}.pdf`
}

// ── chữ cho font PDF (2026-10-19) ─────────────────────────────────────────────
// Font Roboto của pdfmake (vfs_fonts) thiếu nhiều ký tự AI hay viết: khoảng trắng hẹp U+202F giữa số và đơn vị ("<12 tháng",
// "≈ 80 triệu USD"), mũi tên, dấu tick, sao, emoji… Ký tự thiếu glyph thành ô vuông và bị đo sai bề rộng → chữ phía sau đè lên
// nhau. pdfText(): NFC (font chỉ có 6 dấu kết hợp — tiếng Việt tách dấu NFD sẽ vỡ) → đổi ký tự thiếu sang ký tự font có →
// bỏ phần còn lại. PDF_OK = đúng các ký tự cả 4 file Roboto (thường / đậm / nghiêng / đậm nghiêng) có glyph — đo bằng fontkit.
const PDF_OK = '\\t\\n\\r\\x20-\\x7E\\u00A0-\\u017F\\u018F\\u0192\\u01A0\\u01A1\\u01AF\\u01B0\\u01F0\\u01FA-\\u01FF\\u0218-\\u021B\\u0237' +
    '\\u0300\\u0301\\u0303\\u0309\\u030F\\u0323\\u0384-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03CE\\u03D1\\u03D2\\u03D6\\u0400-\\u0486\\u0488-\\u04FF' +
    '\\u1E00\\u1E01\\u1E3E\\u1E3F\\u1E80-\\u1E85\\u1E9E\\u1EA0-\\u1EF9\\u2000-\\u200B\\u2010\\u2011\\u2013-\\u2015\\u2017-\\u201E\\u2020-\\u2022' +
    '\\u2025-\\u2027\\u2030\\u2032\\u2033\\u2039\\u203A\\u203C\\u2044\\u20A3\\u20A4\\u20A6-\\u20AC\\u20B1\\u20B9\\u20BA\\u20BC\\u20BD\\u2105\\u2113' +
    '\\u2116\\u2122\\u2126\\u212E\\u215B-\\u215E\\u2202\\u2206\\u220F\\u2211\\u2212\\u221A\\u221E\\u222B\\u2248\\u2260\\u2264\\u2265\\u25A0' +
    '\\u25CA\\u25CB\\u25CF'
const PDF_BAD = new RegExp(`[^${PDF_OK}]`, 'gu')

// Ký tự font không có → ký tự gần nghĩa mà font có (trước khi bỏ phần còn lại).
const PDF_SWAP = {
    ' ': ' ', ' ': ' ', '⁠': '', '‌': '', '‍': '', '️': '', ' ': ' ', '　': ' ',
    ' ': '\n', ' ': '\n', '‒': '–', '⁃': '•',
    '→': '->', '⟶': '->', '➔': '->', '➜': '->', '←': '<-', '↔': '<->', '⇒': '=>', '⇐': '<=', '⇔': '<=>', '↑': '+', '↓': '−',
    '✓': '√', '✔': '√', '✅': '√', '☑': '√', '✗': '×', '✘': '×', '❌': '×', '☒': '×',
    '★': '*', '☆': '*', '⭐': '*', '▪': '•', '▫': '•', '◦': '•', '‣': '•', '►': '•', '▶': '•', '▸': '•', '◆': '•', '◇': '•',
    '∼': '~', '⋅': '·', '∙': '·', '≃': '≈', '≅': '≈', '≡': '=', '∈': 'in',
}
const PDF_SWAP_RE = new RegExp(`[${Object.keys(PDF_SWAP).join('')}]`, 'gu')

/** Chữ an toàn cho font PDF: chỉ ký tự font có glyph. Ký tự bị bỏ giữa 2 khoảng trắng → còn 1 khoảng trắng ("a 📌 b" → "a b"). */
export const pdfText = (s) => String(s ?? '')
    .normalize('NFC')
    .replace(PDF_SWAP_RE, (c) => PDF_SWAP[c])
    .replace(PDF_BAD, '\0')
    .replace(/( ?)\0+( ?)/g, (m, a, b) => a || b)
