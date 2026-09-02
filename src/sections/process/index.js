// src/sections/process/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernStepTimeline, data as modernStepTimelineData } from './modernStepTimeline.js'

// `data` — xem hero/index.js. Template là timeline 4 bước (không phải content chính dạng
// 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn lại qua svc-admin
// nếu cần đủ bộ.
export const templates = [
    { key: 'modernStepTimeline', label: { vi: 'Quy trình từng bước', en: 'Step Timeline' }, config: modernStepTimeline, data: modernStepTimelineData },
].map(t => ({ ...t, config: omitBg(t.config) }))
