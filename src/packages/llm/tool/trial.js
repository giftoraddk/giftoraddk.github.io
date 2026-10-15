// src/packages/llm/tool/trial.js
//
// Thuần: dòng "Dùng thử · còn …" của chế độ thử (prop `trial` — page /system/<sector>) từ GET /v1/fn/trial
// ({ mode, limits: { task, job, chat, log }, used: { task, chat, log, jobs: { [fn]: n } } }, worker fn/trial.ts).
// Chỉ để hiển thị — Worker tự đếm và chặn mọi lượt.

const TXT = {
    vi: { trial: 'Dùng thử', task: 'việc cả nhóm', job: 'việc riêng phòng này', chat: 'tin nhắn', left: 'còn', none: 'đã dùng hết', plan: 'chọn gói để dùng tiếp' },
    en: { trial: 'Trial', task: 'team task', job: 'department job', chat: 'messages', left: '', none: 'used up', plan: 'choose a plan to keep going' },
}

const left = (limit, used) => Math.max(0, (Number(limit) || 0) - (Number(used) || 0))

/**
 * → '' khi không ở chế độ thử (chưa tải, hoặc tài khoản đã có quyền đầy đủ ở ngành này).
 * `fn` = phòng của panel <svc-fn> (job riêng của phòng đó); bỏ trống = nhóm chat Thư ký (task + tin nhắn).
 */
export function trialLine(usage, lang = 'vi', fn = '') {
    if (usage?.mode !== 'trial') return ''
    const t = TXT[lang] ?? TXT.vi
    const count = (n, of) => (n ? `${t.left ? `${t.left} ` : ''}${n}/${of}` : t.none)
    const { limits = {}, used = {} } = usage
    const parts = fn
        ? [`${t.job}: ${count(left(limits.job, used.jobs?.[fn]), limits.job)}`]
        : [`${t.task}: ${count(left(limits.task, used.task), limits.task)}`, `${t.chat}: ${count(left(limits.chat, used.chat), limits.chat)}`]
    const out = fn ? !left(limits.job, used.jobs?.[fn]) : !left(limits.task, used.task) && !left(limits.chat, used.chat)
    return `${t.trial} · ${parts.join(' · ')}${out ? ` — ${t.plan}` : ''}`
}
