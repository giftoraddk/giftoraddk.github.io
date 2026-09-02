// src/sections/features/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernCardIntro, data as modernCardIntroData } from './modernCardIntro.js'
import { config as modernHoriIntro, data as modernHoriIntroData } from './modernHoriIntro.js'
import { config as spatialHoriIntro, data as spatialHoriIntroData } from './spatialHoriIntro.js'
import { config as spatialCardWebApex, data as spatialCardWebApexData } from './spatialCardWebApex.js'
import { config as spatialHoriIntroApex, data as spatialHoriIntroApexData } from './spatialHoriIntroApex.js'

// `data` — xem hero/index.js. Cả 5 template là lưới feature/product card (4-9 dòng, không
// phải content chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng
// còn lại qua svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernCardIntro',      label: { vi: 'Thẻ tính năng',                    en: 'Feature Cards' },         config: modernCardIntro,      data: modernCardIntroData },
    { key: 'modernHoriIntro',      label: { vi: 'Danh sách tính năng',              en: 'Feature List' },          config: modernHoriIntro,      data: modernHoriIntroData },
    { key: 'spatialHoriIntro',     label: { vi: 'Danh sách tính năng (kính mờ)',    en: 'Feature List (Glass)' },  config: spatialHoriIntro,     data: spatialHoriIntroData },
    { key: 'spatialCardWebApex',   label: { vi: 'Thẻ tính năng (Apex)',             en: 'Feature Cards (Apex)' },  config: spatialCardWebApex,   data: spatialCardWebApexData },
    { key: 'spatialHoriIntroApex', label: { vi: 'Danh sách tính năng (Apex)',       en: 'Feature List (Apex)' },   config: spatialHoriIntroApex, data: spatialHoriIntroApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
