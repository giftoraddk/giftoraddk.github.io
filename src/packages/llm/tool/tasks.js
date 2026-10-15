// src/packages/llm/tool/tasks.js
//
// Thuần: đọc task view Worker trả (GET /v1/fn/tasks/:id) cho nhóm chat — câu Thư ký khi giai đoạn đổi, bàn giao
// chờ xác minh lại, task nào cần tải lại, dữ liệu của card task + bảng phân công. Không có chuyên môn: nhãn + trạng
// thái đều do Worker tính (P3-16).
import { callDone } from './waves.js'

const TXT = {
    vi: {
        plan: (draft, lead, depth) => `${draft ? 'Đề xuất phân công' : 'Phân công xong'} — chủ trì: ${lead}; độ sâu: ${depth}.`,
        run: (list) => ` Sẽ làm: ${list}.`,
        integrate: (name) => ` Cuối cùng: ${name} rà soát chéo và ra quyết định.`,
        unavailable: (list) => `Chưa có phòng: ${list} — phần bàn giao của họ sẽ thiếu.`,
        skipped: (list) => `Lần này không làm: ${list}.`,
        done: 'Xong cả kế hoạch 🎉 — mọi bàn giao đã được duyệt.',
        verdict: { 'APPROVE': 'Quyết định: DUYỆT ✅', 'APPROVE WITH CONDITIONS': 'Quyết định: DUYỆT CÓ ĐIỀU KIỆN ⚠️ — xem điều kiện trong bàn giao Tích hợp.', 'HOLD': 'Quyết định: TẠM HOÃN ⏸️ — còn thiếu điều kiện để triển khai.', 'REJECT': 'Quyết định: KHÔNG TRIỂN KHAI ⛔' },
        blocked: (list) => `⛔ Chưa chạy được: ${list}.`,
        missing: (kinds) => `thiếu ${kinds}`,
        stale: (list) => `⚠️ Cần xác minh lại: ${list} — bàn giao phía trước vừa có bản mới. Sếp chọn Chạy lại hoặc Vẫn dùng được.`,
        reason: { not_material: 'không trọng yếu', conditional: 'có điều kiện', depth: 'vượt độ sâu' },
        depth: { simple: 'đơn giản', standard: 'tiêu chuẩn', complex: 'phức tạp' },
    },
    en: {
        plan: (draft, lead, depth) => `${draft ? 'Routing proposal' : 'Routing done'} — lead: ${lead}; depth: ${depth}.`,
        run: (list) => ` Working: ${list}.`,
        integrate: (name) => ` Finally: ${name} cross-checks it all and decides.`,
        unavailable: (list) => `No department yet: ${list} — their handoffs will be missing.`,
        skipped: (list) => `Not this time: ${list}.`,
        done: 'The whole plan is done 🎉 — every handoff is approved.',
        verdict: { 'APPROVE': 'Decision: APPROVE ✅', 'APPROVE WITH CONDITIONS': 'Decision: APPROVE WITH CONDITIONS ⚠️ — see the conditions in the Integration handoff.', 'HOLD': 'Decision: HOLD ⏸️ — conditions to go ahead are still missing.', 'REJECT': 'Decision: REJECT ⛔' },
        blocked: (list) => `⛔ Cannot start: ${list}.`,
        missing: (kinds) => `missing ${kinds}`,
        stale: (list) => `⚠️ Needs re-checking: ${list} — an upstream handoff has a new version. Re-run it, or keep it as still valid.`,
        reason: { not_material: 'not material', conditional: 'conditional', depth: 'beyond the depth' },
        depth: { simple: 'simple', standard: 'standard', complex: 'complex' },
    },
}
const txt = (lang) => TXT[lang] ?? TXT.vi
const labelOf = (map, key, lang) => map?.[key]?.[lang] || map?.[key]?.vi || key

/** Tên 1 function: tên phòng trong nhóm chat (face) nếu có → nhãn Worker gửi kèm view → chính key. */
export const fnName = (view, fn, faceTitle, lang = 'vi') => faceTitle?.(fn) || labelOf(view?.titles, fn, lang)

/** Câu phân công: chủ trì, độ sâu, phòng sẽ làm, phòng chưa có, phòng bỏ qua (kèm lý do). '' khi chưa có phân công. */
export function planSummary(view, faceTitle, lang = 'vi', draft = false) {
    const { routing, plan } = view ?? {}
    if (!routing || !plan) return ''
    const t = txt(lang)
    const name = (fn) => fnName(view, fn, faceTitle, lang)
    const lines = [`${t.plan(draft, name(routing.lead), t.depth[routing.complexity] ?? routing.complexity)}${plan.run.length ? t.run(plan.run.map(name).join(', ')) : ''}${plan.integrate ? t.integrate(name('integration')) : ''}`]
    if (plan.unavailable.length) lines.push(t.unavailable(plan.unavailable.map(name).join(', ')))
    if (plan.skipped.length) lines.push(t.skipped(plan.skipped.map((s) => `${name(s.fn)} (${t.reason[s.reason] ?? s.reason})`).join(', ')))
    return lines.join('\n')
}

/** Phân công Thư ký vừa đề xuất (job xong, chưa duyệt) — cho bubble của job Thư ký. */
export const previewSummary = (view, faceTitle, lang = 'vi') =>
    (view?.preview ? planSummary({ ...view, ...view.preview }, faceTitle, lang, true) : '')

/** Câu Thư ký khi giai đoạn task đổi (prev → view.stage); '' khi không có gì mới để báo. `verdict: false` = không
 *  báo quyết định của Tích hợp (svc-talk `no-verdict`). */
export function stageLine(prev, view, faceTitle, lang = 'vi', { verdict = true } = {}) {
    if (!view || !prev || view.stage === prev) return ''
    const t = txt(lang)
    const name = (fn) => fnName(view, fn, faceTitle, lang)
    const lines = []
    // Duyệt phân công không có câu chat — kế hoạch các phòng đã hiện ngay trên card task.
    if (view.stage === 'done') lines.push(t.done)
    // Bước Tích hợp (task phức tạp) chốt bằng 1 quyết định — Worker đọc sẵn từ bàn giao `decision` (view.verdict).
    if (verdict && view.stage === 'done' && t.verdict[view.verdict]) lines.push(t.verdict[view.verdict])
    if (view.stage === 'blocked') {
        lines.push(t.blocked(view.fns.filter((s) => s.state === 'blocked')
            .map((s) => `${name(s.fn)} (${t.missing(s.missing.map((k) => labelOf(view.kinds, k, lang)).join(', '))})`).join('; ')))
    }
    if (view.stage === 'stale') lines.push(t.stale(view.fns.filter((s) => s.state === 'stale').map((s) => name(s.fn)).join(', ')))
    return lines.filter(Boolean).join('\n')
}

/** Task của các job trong nhật ký — task còn việc dở trước, rồi mới nhất trước, tối đa `max` (tải view khi mở trang). */
export function taskIdsOf(log, max = 5) {
    const jobs = (log ?? []).filter((d) => d.kind === 'job' && d.task)
    const open = new Set(jobs.filter((d) => !d.approved).map((d) => d.task))
    const all = [...new Set([...jobs].reverse().map((d) => d.task))]
    return [...all.filter((id) => open.has(id)), ...all.filter((id) => !open.has(id))].slice(0, max)
}

/** Bàn giao của job này đang chờ xác minh lại — chỉ khi nó là job mới nhất của function đó trong task (P3-9). */
export function staleFor(view, job) {
    const fn = String(job?.division ?? '').split('.')[1]
    const s = view?.fns?.find((x) => x.fn === fn)
    if (!s || s.state !== 'stale' || s.jobId !== job.id) return []
    return (view.artifacts ?? []).filter((a) => a.source_fn === fn && a.status === 'REQUIRES_VERIFICATION')
}

// ── Card task (nhóm chat) + bảng phân công (bước Phân công của Thư ký) ─────────────────────────────────────

const fnOfDivision = (division) => String(division ?? '').split('.')[1] ?? ''
const running = (job) => !job.status || job.status === 'queued' || /^step\d+$/.test(job.status)

/** Tiến độ 1 job theo outline: call đã có dữ liệu / tổng call (step ảnh tính 1). Job đã duyệt = đủ. */
export function jobProgress(outline, job) {
    const units = (outline?.steps ?? []).flatMap((s) => (s.type === 'image' ? [null] : s.calls ?? []))
    const total = units.length
    if (!job || !total) return { done: 0, total }
    if (job.approved) return { done: total, total }
    const f = job.fields ?? {}
    const done = units.filter((c) => (c ? callDone(c, f) : !!f.pics || job.imageChoice === 'skip')).length
    return { done, total }
}

/** Trạng thái 1 dòng của card: theo view Worker (FnState), riêng job đang lỗi giữa chừng = 'error', đang dừng chờ sếp
 *  xem step = 'review'. Chưa có view thì suy từ chính job. */
export function rowState(s, job) {
    if (job && !job.approved && job.error && running(job)) return 'error'
    if (job && !job.approved && job.status === 'awaiting_review') return 'review'
    if (s) return s.state
    if (!job) return 'waiting'
    return job.approved ? 'approved' : job.status === 'done' ? 'review' : 'running'
}

/**
 * Các dòng của card 1 task — Thư ký, các phòng trong plan, Tích hợp: { fn, state, job, missing }. `jobs` = job của task
 * trong nhật ký. Task chưa tải view (cũ hơn các task tải sẵn): mỗi function 1 dòng theo job mới nhất của nó.
 */
export function taskRows(view, jobs = []) {
    if (view?.fns?.length) {
        return view.fns.map((s) => {
            const job = jobs.find((j) => j.id === s.jobId) ?? null
            return { fn: s.fn, state: rowState(s, job), job, missing: s.missing ?? [] }
        })
    }
    const latest = new Map()
    for (const j of jobs) {
        const fn = fnOfDivision(j.division)
        if (!latest.has(fn) || String(j.created_at) >= String(latest.get(fn).created_at)) latest.set(fn, j)
    }
    return [...latest].map(([fn, job]) => ({ fn, state: rowState(null, job), job, missing: [] }))
}

/** Phân công đang xem: bản Thư ký vừa đề xuất (chưa duyệt) nếu có, không thì bản đang hiệu lực — { routing, plan } | null. */
export const routingOf = (view) => view?.preview ?? (view?.routing && view?.plan ? { routing: view.routing, plan: view.plan } : null)

/** Field `rationale` của Phân công ("<key>: lý do" mỗi dòng) → { key: lý do }. */
export function rationaleOf(text) {
    const out = {}
    for (const line of String(text ?? '').split(/\r?\n/)) {
        const m = /^[\s\-*•\d.)]*([a-z]+)\s*:\s*(.+)$/i.exec(line)
        if (m && !out[m[1].toLowerCase()]) out[m[1].toLowerCase()] = m[2].trim()
    }
    return out
}

/**
 * Phân công sau 1 chỉnh sửa của sếp → { activation, lead } đúng định dạng Worker đọc (routing.ts parseActivation).
 * `routing.levels` đã chuẩn hoá (đủ 9 phòng, đúng thứ tự). add → REQUIRED (chắc chắn chạy, không bị cắt theo độ sâu),
 * drop → NOT_MATERIAL (không bỏ được phòng chủ trì), lead → phòng đó chủ trì + REQUIRED.
 */
export function editRouting(routing, { add, drop, lead } = {}) {
    const levels = { ...routing.levels }
    let next = routing.lead
    if (add) levels[add] = 'REQUIRED'
    if (drop && drop !== next) levels[drop] = 'NOT_MATERIAL'
    if (lead) { next = lead; levels[lead] = 'REQUIRED' }
    return { activation: Object.entries(levels).map(([fn, level]) => `${fn}:${level}`).join('|'), lead: next }
}
