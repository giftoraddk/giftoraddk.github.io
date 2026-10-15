// src/packages/llm/app/card-parts.js
//
// Mảnh giao diện dùng chung của card task (svc-task-card), card chi tiết job (svc-job-card) và bảng phân công
// (svc-routing): nhãn mức kích hoạt / trạng thái / giai đoạn, chip màu, thanh tiến độ chia đoạn. Thuần hiển thị —
// chỉ html``, không state; CSS ở css/svc-cards.css (cả 3 component cùng nạp).
import { html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'

export const CARD_TXT = {
    vi: {
        level: { lead: 'Chủ trì', REQUIRED: 'Bắt buộc', RELEVANT: 'Liên quan', CONDITIONAL: 'Có điều kiện', NOT_MATERIAL: 'Không cần' },
        state: {
            waiting: 'Chờ bàn giao', runnable: 'Sắp chạy', running: 'Đang chạy', review: 'Chờ duyệt', approved: 'Đã duyệt',
            stale: 'Cần xác minh', blocked: 'Bị chặn', error: 'Lỗi',
        },
        stage: {
            secretary: 'Thư ký đang chuẩn bị', context: 'Chờ duyệt bối cảnh', routing: 'Chờ duyệt phân công',
            running: 'Đang thực hiện', stale: 'Cần xác minh', blocked: 'Bị chặn', done: 'Hoàn thành',
        },
        verdict: { 'APPROVE': 'Duyệt', 'APPROVE WITH CONDITIONS': 'Duyệt có điều kiện', 'HOLD': 'Tạm hoãn', 'REJECT': 'Không triển khai' },
        reason: { not_material: 'không trọng yếu', conditional: 'có điều kiện', depth: 'vượt độ sâu' },
        approve: 'Duyệt', retry: 'Thử lại',
        approvedOf: (done, total) => `${done}/${total} đã duyệt`, waitingGroup: (n) => `${n} phòng chờ bàn giao`,
        proposed: (n) => `Đề xuất ${n} phòng`, subSteps: (done, total) => `${done}/${total} bước con`,
    },
    en: {
        level: { lead: 'Lead', REQUIRED: 'Required', RELEVANT: 'Relevant', CONDITIONAL: 'Conditional', NOT_MATERIAL: 'Not needed' },
        state: {
            waiting: 'Waiting', runnable: 'Up next', running: 'Running', review: 'To review', approved: 'Approved',
            stale: 'Re-check', blocked: 'Blocked', error: 'Error',
        },
        stage: {
            secretary: 'Secretary preparing', context: 'Context to review', routing: 'Routing to review',
            running: 'In progress', stale: 'Re-check', blocked: 'Blocked', done: 'Done',
        },
        verdict: { 'APPROVE': 'Approve', 'APPROVE WITH CONDITIONS': 'Approve with conditions', 'HOLD': 'Hold', 'REJECT': 'Reject' },
        reason: { not_material: 'not material', conditional: 'conditional', depth: 'beyond the depth' },
        approve: 'Approve', retry: 'Retry',
        approvedOf: (done, total) => `${done}/${total} approved`, waitingGroup: (n) => `${n} departments waiting for handoffs`,
        proposed: (n) => `${n} departments proposed`, subSteps: (done, total) => `${done}/${total} sub-steps`,
    },
}
export const cardTxt = (lang) => CARD_TXT[lang] ?? CARD_TXT.vi

export const LEVEL_TONE = { lead: 'primary', REQUIRED: 'warning', RELEVANT: 'info', CONDITIONAL: 'neutral', NOT_MATERIAL: 'muted' }
export const STATE_TONE = {
    waiting: 'neutral', runnable: 'info', running: 'info', review: 'warning', approved: 'success', stale: 'warning', blocked: 'error', error: 'error',
}
export const STAGE_TONE = { secretary: 'primary', context: 'warning', routing: 'warning', running: 'info', stale: 'warning', blocked: 'error', done: 'success' }
export const VERDICT_TONE = { 'APPROVE': 'success', 'APPROVE WITH CONDITIONS': 'warning', 'HOLD': 'neutral', 'REJECT': 'error' }

/** FnState của 1 phòng → đoạn của thanh tiến độ. */
export const segOf = (state) =>
    (state === 'approved' ? 'done' : state === 'error' || state === 'blocked' ? 'error' : ['running', 'review', 'runnable', 'stale'].includes(state) ? 'active' : 'todo')

export const chip = (label, tone = 'neutral') => html`<span class="cd-chip" data-tone=${tone}>${label}</span>`

/** Thanh chia đoạn — `segments`: [{ state: 'done'|'active'|'error'|'todo', label? }]. */
export const segBar = (segments) => html`
    <div class="cd-bar">${segments.map((s) => html`<span class="cd-seg" data-s=${s.state} title=${s.label || ''}></span>`)}</div>
`

/** Vạch tiến độ mảnh của 1 dòng phòng ban — `tone` primary / error. */
export const meter = (pct, tone = 'primary') => html`
    <div class="cd-meter" data-tone=${tone}><span style=${styleMap({ width: `${pct}%` })}></span></div>
`

export const percent = ({ done, total }) => (total ? Math.round((done / total) * 100) : 0)
