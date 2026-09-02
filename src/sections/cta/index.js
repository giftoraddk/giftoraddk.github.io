// src/sections/cta/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernNeat, data as modernNeatData } from './modernNeat.js'
import { config as spatialNeat, data as spatialNeatData } from './spatialNeat.js'
import { config as spatialNeatApex, data as spatialNeatApexData } from './spatialNeatApex.js'

// `data` — demo row 1-phần-tử của chính file config đó, dùng làm sectionItem mặc định khi tạo
// section mới (xem svc-channel-sections.js § _dcSeedDefaultItem). Cả 3 template đều có đúng 1
// dòng "records-chuẩn" (title/description/pics, +subtitle cho Apex) — không có template dạng
// feature/checklist nào trong domain này.
export const templates = [
    { key: 'modernNeat',      label: { vi: 'Điểm chạm (giữa)',      en: 'Centered CTA' },        config: modernNeat,      data: modernNeatData },
    { key: 'spatialNeat',     label: { vi: 'Điểm chạm (kính mờ)',   en: 'Centered CTA (Glass)' }, config: spatialNeat,     data: spatialNeatData },
    { key: 'spatialNeatApex', label: { vi: 'Điểm chạm (Apex)',      en: 'Centered CTA (Apex)' },  config: spatialNeatApex, data: spatialNeatApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
