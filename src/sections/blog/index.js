// src/sections/blog/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernSlideIntro, data as modernSlideIntroData } from './modernSlideIntro.js'
import { config as spatialSlideNeat, data as spatialSlideNeatData } from './spatialSlideNeat.js'

// `data` — xem hero/index.js. Cả 2 template ở đây là slider bài viết (3 dòng, không phải
// content chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn
// lại qua svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernSlideIntro', label: { vi: 'Trượt bài viết',      en: 'Slider Intro' },  config: modernSlideIntro, data: modernSlideIntroData },
    { key: 'spatialSlideNeat', label: { vi: 'Trượt kính mờ',       en: 'Glass Slider' },  config: spatialSlideNeat, data: spatialSlideNeatData },
].map(t => ({ ...t, config: omitBg(t.config) }))
