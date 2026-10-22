// src/packages/llm/service/fn-api.js
//
// Client mỏng của llm /v1/fn/* (worker/src/fn/routes.ts, talk.ts, admin.ts). requester() KHÔNG throw — mọi hàm trả
// { ok, statusCode, data } | { ok:false, statusCode, message }; nơi gọi tự check `.ok`. Không có prompt nào ở đây.
//
// 2 bản: `fnApi` (thường) và `fnTrialApi` — y hệt nhưng mọi request gửi kèm header X-Fn-Trial: 1 (chế độ dùng thử, worker
// fn/trial.ts). Header chỉ là lời xin: Worker tự quyết định chế độ, tự đếm và chặn lượt — nên chọn bản nào cũng không
// mở thêm quyền gì. Component nhận prop `trial` thì lấy bản thử qua fnApiFor(trial).
import requester from '@/services/core/requester.js'

const BASE = `${import.meta.env.PUBLIC_LLM_URL ?? ''}/v1/fn`
// 1 call = tối đa 6 lượt qua chuỗi model free + key pro ở Worker (trần 70s, fn/generate.ts) — lâu hơn nhiều mức 10s mặc định
const AI_MS = 90_000
const APPROVE_MS = 30_000 // duyệt (ghi bàn giao của task) / ghi bảng nền tảng qua auth
const TRIAL_HEADERS = { 'X-Fn-Trial': '1' }
const enc = (v) => encodeURIComponent(v)

// owner → Promise<res>: 1 lần mỗi lượt tải trang (public, cả khách vãng lai); lỗi thì lần sau hỏi lại. Dùng chung 2 bản.
const _sectors = new Map()
const quickPublic = requester()

function makeFnApi(headers) {
    const quick = requester({ headers })
    const slow = requester({ headers, timeoutMs: AI_MS })
    const approver = requester({ headers, timeoutMs: APPROVE_MS })
    return {
        /** Ngành + phòng ban + face (tên/avatar/bật-tắt); `owner` gộp face riêng của owner đó (hub, hoặc '@<host>' — kho
         *  riêng của 1 site nền tảng). */
        sectors(owner = '') {
            const key = owner
            if (!_sectors.has(key)) {
                _sectors.set(key, quickPublic.get(`${BASE}/sectors`, { owner }).then((res) => {
                    if (!res.ok) _sectors.delete(key)
                    return res
                }))
            }
            return _sectors.get(key)
        },
        /** Face vừa sửa (svc-division) — lần đọc sau lấy lại từ Worker. */
        forgetSectors: () => _sectors.clear(),
        /** Khung step/call/field của 1 phòng (không role/task/desc) — cần đăng nhập. */
        spec: (division) => quick.get(`${BASE}/spec/${enc(division)}`),
        log: (sector) => quick.get(`${BASE}/log`, { sector }),
        /** `task` (tuỳ chọn) — gắn câu Thư ký vào 1 task của chính người gọi (vd "Xong cả kế hoạch" → nút PDF). */
        appendLog: (sector, from, content, task = '') => quick.post(`${BASE}/log`, { sector, from, content, ...(task ? { task } : {}) }),
        /** { division, content, lang } → { lang, reply, isTask, topic } */
        chat: (body) => slow.post(`${BASE}/chat`, body),
        /** Public: { division, content, history, owner, types, lang } → { lang, reply, sources } */
        aide: (body) => slow.post(`${BASE}/aide`, body),
        job: (jobId) => quick.get(`${BASE}/jobs/${enc(jobId)}`),
        /** { division, topic, language?, inputs? } → job row (job đơn lẻ; job của task mở qua /tasks) */
        createJob: (body) => quick.post(`${BASE}/jobs`, body),
        call: (jobId, body) => slow.post(`${BASE}/jobs/${enc(jobId)}/call`, body),
        resume: (jobId) => quick.post(`${BASE}/jobs/${enc(jobId)}/resume`, {}),
        image: (jobId, body) => quick.post(`${BASE}/jobs/${enc(jobId)}/image`, body),
        fields: (jobId, fields) => quick.post(`${BASE}/jobs/${enc(jobId)}/fields`, { fields }),
        /** expertReview = { confirmed: true, by } khi outline.review đòi chuyên gia duyệt (Worker từ chối nếu thiếu)
         *  → { approved, artifacts[] } */
        approve: (jobId, expertReview = null) => approver.post(`${BASE}/jobs/${enc(jobId)}/approve`, expertReview ? { expertReview } : {}),
        /** Job đã duyệt → ghi 1 lần vào bảng output (products/posts…, chỉ nhân viên nền tảng) → { table, recordId } */
        record: (jobId) => approver.post(`${BASE}/jobs/${enc(jobId)}/record`, {}),
        /** { sector, topic, language } → task view + `created` (job context vừa mở) */
        createTask: (body) => quick.post(`${BASE}/tasks`, body),
        /** stage, routing, plan, preview, fns, next, jobs, artifacts, titles, kinds, trial */
        task: (taskId) => quick.get(`${BASE}/tasks/${enc(taskId)}`),
        /** { inputs: { [fn]: {...} } } → task view + `created` (job các phòng vừa được phép chạy) */
        nextTask: (taskId, inputs = {}) => quick.post(`${BASE}/tasks/${enc(taskId)}/next`, { inputs }),
        rerunTask: (taskId, fn, inputs = {}) => quick.post(`${BASE}/tasks/${enc(taskId)}/rerun`, { fn, inputs }),
        verifyArtifact: (taskId, artifact) => quick.post(`${BASE}/tasks/${enc(taskId)}/verify`, { artifact }),
        /** Lượt dùng thử còn lại ở 1 ngành → { sector, mode, limits: { task, job, chat, log }, used: { task, chat, log, jobs: { [fn]: n } } } */
        trialUsage: (sector) => quick.get(`${BASE}/trial`, { sector }),
        /** Admin: { id, sector, fn, kind, face, patch, persona } */
        /** Ghi đè của nền tảng (admin) — `owner` '@<host>' = của riêng 1 site nền tảng (svc-aide site="…"), '' = dùng chung. */
        override: (division, owner = '') => quick.get(`${BASE}/override/${enc(division)}`, { owner }),
        /** Admin: { division, owner?, patch?, face? } */
        saveOverride: (body) => quick.post(`${BASE}/override`, body),
    }
}

export const fnApi = makeFnApi(undefined)
export const fnTrialApi = makeFnApi(TRIAL_HEADERS)
/** Bản theo chế độ của component (prop `trial`). */
export const fnApiFor = (trial) => (trial ? fnTrialApi : fnApi)
