// src/sections/pricing/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernCardPlans, data as modernCardPlansData } from './modernCardPlans.js'
import { config as spatialCardPlans, data as spatialCardPlansData } from './spatialCardPlans.js'
import { config as spatialTabPlans, data as spatialTabPlansData } from './spatialTabPlans.js'
import { config as spatialTabPlansApex, data as spatialTabPlansApexData } from './spatialTabPlansApex.js'

// `data` — xem hero/index.js. Cả 4 template là lưới/tab pricing tier (3-6 dòng, không phải
// content chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn
// lại qua svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernCardPlans',     label: { vi: 'Thẻ bảng giá',                en: 'Pricing Cards' },        config: modernCardPlans,     data: modernCardPlansData },
    { key: 'spatialCardPlans',    label: { vi: 'Thẻ bảng giá (kính mờ)',      en: 'Pricing Cards (Glass)' }, config: spatialCardPlans,    data: spatialCardPlansData },
    { key: 'spatialTabPlans',     label: { vi: 'Bảng giá dạng tab',           en: 'Pricing Tabs' },         config: spatialTabPlans,     data: spatialTabPlansData },
    { key: 'spatialTabPlansApex', label: { vi: 'Bảng giá dạng tab (Apex)',    en: 'Pricing Tabs (Apex)' },  config: spatialTabPlansApex, data: spatialTabPlansApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
