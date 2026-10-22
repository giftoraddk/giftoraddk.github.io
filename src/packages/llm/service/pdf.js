// src/packages/llm/service/pdf.js
//
// Xuất PDF ở trình duyệt: 1 job phòng ban (nút tải trên topic đã xong ở <svc-fn>) hoặc cả kế hoạch của 1 task (nút trong
// câu "Xong cả kế hoạch" của <svc-talk> — mỗi phòng 1 phần, theo thứ tự task view). Nội dung lấy từ tool/report.js;
// pdfmake (font Roboto có đủ dấu tiếng Việt) + html-to-pdfmake chỉ tải khi bấm lần đầu — không nằm trong bundle panel.
//
// Bố cục: trang bìa (logo + thương hiệu, tiêu đề, ô thông tin, mục lục có số trang) → nội dung từ trang 2, tiêu đề đánh
// chỉ mục 1 / 1.1 / 1.1.1 (kế hoạch tổng: phòng / bước / mục), header thương hiệu + footer số trang, bookmark PDF theo
// mục lục. Ảnh trong `content` được nhúng nếu tải được (CORS), không thì bỏ ảnh đó — phần chữ vẫn xuất đủ.
import { site } from '@/services/tools/site'
import { jobSections, textBlocks, pdfName, pdfText } from '../tool/report.js'
import { pickTxt } from '@/services/tools/lingo.js'

const TXT = {
    vi: {
        planKind: 'KẾ HOẠCH TỔNG', jobKind: 'BÁO CÁO PHÒNG BAN', toc: 'Mục lục', page: 'Trang',
        exported: 'Ngày xuất', department: 'Phòng ban', status: 'Trạng thái', decision: 'Quyết định', parts: 'Số phòng ban',
        approved: 'Đã duyệt', pending: 'Chờ duyệt',
    },
    en: {
        planKind: 'FULL PLAN', jobKind: 'DEPARTMENT REPORT', toc: 'Contents', page: 'Page',
        exported: 'Exported', department: 'Department', status: 'Status', decision: 'Decision', parts: 'Departments',
        approved: 'Approved', pending: 'To approve',
    },
}
const txt = (lang) => pickTxt(TXT, lang)

// Tông vàng theo logo (trăng + sao vàng) trên nền giấy trắng.
const C = { ink: '#1f2937', body: '#374151', muted: '#6b7280', gold: '#b7791f', goldSoft: '#fbf4e2', line: '#e7e1d3' }
const PAGE_W = 595.28
const MARGIN_X = 48
const CONTENT_W = PAGE_W - MARGIN_X * 2
const IMAGE_MAX_H = 360
const LOGO_URL = '/logo.avif'
const LOGO_PX = 256
const BRAND = site.subtitle
const HOST = site.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

// Style mặc định cho HTML của `content` (html-to-pdfmake) — cùng thang chữ với phần còn lại.
const HTML_STYLES = {
    h1: { fontSize: 15, bold: true, color: C.ink, marginTop: 8, marginBottom: 4 },
    h2: { fontSize: 13, bold: true, color: C.ink, marginTop: 8, marginBottom: 4 },
    h3: { fontSize: 11.5, bold: true, color: C.ink, marginTop: 6, marginBottom: 3 },
    p: { margin: [0, 0, 0, 6] },
    a: { color: C.gold, decoration: 'underline' },
    li: { margin: [0, 0, 0, 2] },
}

// ── Tải lười ──────────────────────────────────────────────────────────────

let _lib = null
let _logo = null

function lib() {
    _lib ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts'), import('html-to-pdfmake')])
        .then(([pm, vfs, h2p]) => {
            const pdfMake = pm.default ?? pm
            pdfMake.addVirtualFileSystem(vfs.default ?? vfs)
            return { pdfMake, htmlToPdfmake: h2p.default ?? h2p }
        })
        .catch((err) => {
            _lib = null // lần bấm sau tải lại
            throw err
        })
    return _lib
}

// Logo AVIF → PNG qua canvas (pdfmake chỉ đọc PNG/JPEG); không tải được → null, PDF vẫn xuất không logo.
function logo() {
    _logo ??= new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            try {
                const scale = LOGO_PX / Math.max(img.naturalWidth, img.naturalHeight)
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.naturalWidth * scale)
                canvas.height = Math.round(img.naturalHeight * scale)
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL('image/png'))
            } catch {
                resolve(null)
            }
        }
        img.onerror = () => resolve(null)
        img.src = LOGO_URL
    })
    return _logo
}

const toDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
})

// <img src> → data URL nhúng thẳng (pdfmake không tự tải ảnh khác origin); ảnh không tải được thì bỏ.
async function inlineImages(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    await Promise.all([...doc.querySelectorAll('img')].map(async (img) => {
        try {
            const res = await fetch(img.src)
            if (!res.ok) throw new Error(String(res.status))
            img.setAttribute('src', await toDataUrl(await res.blob()))
        } catch {
            img.remove()
        }
    }))
    return doc.body.innerHTML
}

// Ảnh vừa khổ giấy, căn giữa — bỏ width/height px của HTML (thường to hơn trang).
function fitImages(node) {
    if (Array.isArray(node)) return node.forEach(fitImages)
    if (!node || typeof node !== 'object') return
    if (node.image) {
        delete node.width
        delete node.height
        node.fit = [CONTENT_W, IMAGE_MAX_H]
        node.alignment = 'center'
        node.margin = [0, 4, 0, 10]
    }
    for (const value of Object.values(node)) if (value && typeof value === 'object') fitImages(value)
}

// ── Khối nội dung ─────────────────────────────────────────────────────────

const rule = (color, width = CONTENT_W, lineWidth = 0.8, y = 0) =>
    ({ canvas: [{ type: 'line', x1: 0, y1: y, x2: width, y2: y, lineWidth, lineColor: color }] })

// Chỉ mục vàng + chữ — span không mang cỡ chữ (mục lục dùng lại chính `text` này với style riêng của nó).
const numbered = (num, title) => [{ text: `${num}   `, color: C.gold }, title]

function blockNode(block) {
    const spans = (list) => list.map((s) => ({ text: s.text, bold: s.bold || undefined }))
    if (block.type === 'h') return { text: spans(block.spans), bold: true, fontSize: 11, color: C.ink, margin: [0, 6, 0, 2] } // tách nhóm thành phần
    if (block.type === 'p') return { text: spans(block.spans), margin: [0, 0, 0, 5] }
    const items = block.items.map((item) => ({ text: spans(item), margin: [0, 0, 0, 2] }))
    return { [block.type]: items, markerColor: C.gold, margin: [6, 0, 0, 6] }
}

async function valueNode(item, htmlToPdfmake) {
    if (item.text != null) return textBlocks(item.text).map(blockNode)
    const content = htmlToPdfmake(await inlineImages(item.html), { removeExtraBlanks: true, defaultStyles: HTML_STYLES })
    fitImages(content)
    return content
}

/**
 * Nội dung 1 job: bước (`prefix` + i — vào mục lục ở `tocLevel`) → mục (bước.j) → giá trị.
 * `breakFirst` = bước đầu sang trang mới (báo cáo 1 phòng: nội dung bắt đầu sau trang bìa).
 */
async function jobNodes(job, outline, lang, htmlToPdfmake, { prefix = '', tocLevel = 1, breakFirst = false } = {}) {
    const out = []
    for (const [i, section] of jobSections(job, outline, lang).entries()) {
        const stepNum = `${prefix}${i + 1}`
        out.push({
            text: numbered(stepNum, section.title), fontSize: 13.5, bold: true, color: C.ink,
            margin: [0, i || breakFirst ? 18 : 6, 0, 0],
            headlineLevel: 1,
            tocItem: true, tocStyle: tocLevel === 1 ? { bold: true } : { color: C.body },
            tocMargin: tocLevel === 1 ? [0, 5, 0, 1] : [18, 1, 0, 1],
            ...(i === 0 && breakFirst ? { pageBreak: 'before' } : {}),
        })
        out.push({ ...rule(C.line, CONTENT_W, 0.8, 5), margin: [0, 0, 0, 8] })
        for (const [j, item] of section.items.entries()) {
            out.push({ text: numbered(`${stepNum}.${j + 1}`, item.label), fontSize: 10.5, bold: true, color: C.ink, margin: [0, 8, 0, 4], headlineLevel: 2 })
            out.push({ stack: await valueNode(item, htmlToPdfmake), fontSize: 10.5, lineHeight: 1.35, color: C.body })
        }
    }
    return out
}

// Dải đầu 1 phòng trong kế hoạch tổng: nền vàng nhạt, chỉ mục + tên phòng (mục lục cấp 1), chủ đề job bên dưới.
function partNode(num, name, topic) {
    return {
        pageBreak: 'before',
        table: {
            widths: ['*'],
            body: [[{
                stack: [
                    { text: numbered(num, name), fontSize: 17, bold: true, color: C.ink, tocItem: true, tocStyle: { bold: true }, tocMargin: [0, 8, 0, 2] },
                    ...(topic ? [{ text: topic, fontSize: 9.5, color: C.muted, margin: [0, 3, 0, 0] }] : []),
                ],
            }]],
        },
        layout: {
            fillColor: () => C.goldSoft,
            hLineWidth: () => 0,
            vLineWidth: (i) => (i === 0 ? 3 : 0),
            vLineColor: () => C.gold,
            paddingLeft: () => 14, paddingRight: () => 14, paddingTop: () => 12, paddingBottom: () => 12,
        },
        margin: [0, 0, 0, 6],
    }
}

// ── Tài liệu ──────────────────────────────────────────────────────────────

// Hàng thương hiệu đầu trang bìa: logo + tên + domain | loại tài liệu + ngày, gạch vàng bên dưới.
function brandRow(logoUrl, kind, date) {
    return [
        {
            columns: [
                ...(logoUrl ? [{ image: logoUrl, width: 40, height: 40 }] : []),
                {
                    width: '*',
                    margin: [logoUrl ? 10 : 0, 5, 0, 0],
                    stack: [
                        { text: BRAND, fontSize: 14, bold: true, color: C.ink },
                        { text: HOST, fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] },
                    ],
                },
                {
                    width: 'auto',
                    margin: [0, 7, 0, 0],
                    alignment: 'right',
                    stack: [
                        { text: kind, fontSize: 8.5, bold: true, color: C.gold, characterSpacing: 1 },
                        { text: date, fontSize: 8.5, color: C.muted, margin: [0, 3, 0, 0] },
                    ],
                },
            ],
        },
        { ...rule(C.gold, CONTENT_W, 1.5, 0), margin: [0, 12, 0, 0] },
    ]
}

// Ô thông tin trên bìa: mỗi cặp [nhãn, giá trị] 1 ô nền vàng nhạt.
function metaNode(meta) {
    return {
        table: {
            widths: meta.map(() => '*'),
            body: [meta.map(([label, value]) => ({
                stack: [
                    { text: label.toUpperCase(), fontSize: 7.5, bold: true, color: C.muted, characterSpacing: 0.6 },
                    { text: value, fontSize: 10.5, bold: true, color: C.ink, margin: [0, 3, 0, 0] },
                ],
            }))],
        },
        layout: {
            fillColor: () => C.goldSoft,
            hLineWidth: () => 0,
            vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0 : 6),
            vLineColor: () => '#ffffff',
            paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 9, paddingBottom: () => 9,
        },
    }
}

// Mọi chữ trong cây pdfmake (cả node html-to-pdfmake dựng từ `content`) qua pdfText — ký tự font Roboto không có (khoảng
// trắng hẹp U+202F, mũi tên, emoji…) thành ô vuông và làm chữ sau đè lên nhau. Không đụng ảnh / svg / link.
const RAW_KEYS = new Set(['image', 'svg', 'link'])
function cleanTree(node) {
    if (typeof node === 'string') return pdfText(node)
    if (Array.isArray(node)) return node.map(cleanTree)
    if (node && typeof node === 'object') for (const k of Object.keys(node)) if (!RAW_KEYS.has(k)) node[k] = cleanTree(node[k])
    return node
}

const dateOf = (lang) => new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

async function save({ title: rawTitle, kind, meta, body, lang, fileName }) {
    const [{ pdfMake }, logoUrl] = await Promise.all([lib(), logo()])
    const t = txt(lang)
    const date = dateOf(lang)
    const title = pdfText(rawTitle) // cũng vào header từng trang + info của file
    const content = cleanTree([
        ...brandRow(logoUrl, kind, date),
        { text: title, fontSize: 24, bold: true, color: C.ink, lineHeight: 1.15, margin: [0, 30, 0, 16] },
        metaNode([...meta, [t.exported, date]]),
        { text: t.toc, fontSize: 13, bold: true, color: C.ink, margin: [0, 32, 0, 6] },
        rule(C.gold, 36, 2),
        {
            toc: { textStyle: { fontSize: 10.5, color: C.ink }, numberStyle: { fontSize: 10, color: C.muted }, textMargin: [0, 3, 0, 3] },
            margin: [0, 10, 0, 0],
        },
        ...body,
    ])
    await pdfMake.createPdf({
        info: { title, author: BRAND, creator: BRAND, subject: kind },
        pageSize: 'A4',
        pageMargins: [MARGIN_X, 70, MARGIN_X, 56],
        defaultStyle: { font: 'Roboto', fontSize: 10.5, color: C.body },
        // Không để tiêu đề (bước / mục) nằm trơ ở cuối trang — sau nó trên cùng trang chỉ còn gạch kẻ / tiêu đề khác thì
        // đẩy sang trang sau cùng nội dung của nó (pdfmake 0.3: nodes.getFollowingNodesOnPage()).
        pageBreakBefore: (node, nodes) => !!node.headlineLevel && nodes.getFollowingNodesOnPage().every((n) => n.headlineLevel || n.canvas),
        header: (page) => (page === 1 ? null : {
            margin: [MARGIN_X, 28, MARGIN_X, 0],
            stack: [
                {
                    columns: [
                        ...(logoUrl ? [{ image: logoUrl, width: 14, height: 14 }] : []),
                        { width: 'auto', text: BRAND, fontSize: 9, bold: true, color: C.ink, margin: [logoUrl ? 6 : 0, 2, 0, 0] },
                        { width: '*', text: clip(title, 80), fontSize: 8.5, color: C.muted, alignment: 'right', margin: [12, 2, 0, 0] },
                    ],
                },
                { ...rule(C.line, CONTENT_W, 0.6, 0), margin: [0, 8, 0, 0] },
            ],
        }),
        footer: (page, pages) => ({
            margin: [MARGIN_X, 22, MARGIN_X, 0],
            columns: [
                { text: HOST, fontSize: 8, color: C.muted },
                { text: `${t.page} ${page} / ${pages}`, fontSize: 8, color: C.muted, alignment: 'right' },
            ],
        }),
        content,
    }).download(fileName)
}

/** PDF 1 job phòng ban → tải về. `department` = tên phòng hiện cho sếp. */
export async function downloadJobPdf({ job, outline, department = '', lang = 'vi' }) {
    const { htmlToPdfmake } = await lib()
    const t = txt(lang)
    const title = job.topic || department
    await save({
        title,
        kind: t.jobKind,
        meta: [...(department ? [[t.department, department]] : []), [t.status, job.approved ? t.approved : t.pending]],
        body: await jobNodes(job, outline, lang, htmlToPdfmake, { breakFirst: true }),
        lang,
        fileName: pdfName(job.topic, 'report', department),
    })
}

/**
 * PDF cả kế hoạch → tải về: bìa (chủ đề, số phòng, quyết định, mục lục) → mỗi phòng 1 phần sang trang mới, chỉ mục
 * phòng.bước.mục. `parts` = [{ name, job, outline }] theo thứ tự task view; `verdict` = nhãn quyết định ('' = không hiện).
 */
export async function downloadPlanPdf({ topic, verdict = '', parts, lang = 'vi' }) {
    const { htmlToPdfmake } = await lib()
    const t = txt(lang)
    const title = topic || t.planKind
    const body = []
    for (const [i, part] of parts.entries()) {
        const num = String(i + 1)
        body.push(partNode(num, part.name, part.job.topic && part.job.topic !== topic ? part.job.topic : ''))
        body.push(...(await jobNodes(part.job, part.outline, lang, htmlToPdfmake, { prefix: `${num}.`, tocLevel: 2 })))
    }
    await save({
        title,
        kind: t.planKind,
        meta: [[t.parts, String(parts.length)], ...(verdict ? [[t.decision, verdict]] : [])],
        body,
        lang,
        fileName: pdfName(title, 'plan'),
    })
}
