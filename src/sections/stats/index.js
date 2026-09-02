// src/sections/stats/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernCardRow, data as modernCardRowData } from './modernCardRow.js'
import { config as spatialCardRow, data as spatialCardRowData } from './spatialCardRow.js'
import { config as spatialCardRowApex, data as spatialCardRowApexData } from './spatialCardRowApex.js'

// `data` — xem hero/index.js. Cả 3 template là 4 stat counter (value/label, không phải content
// chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn lại qua
// svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernCardRow',      label: { vi: 'Thẻ số liệu',             en: 'Stat Cards' },        config: modernCardRow,      data: modernCardRowData },
    { key: 'spatialCardRow',     label: { vi: 'Thẻ số liệu (kính mờ)',   en: 'Stat Cards (Glass)' }, config: spatialCardRow,     data: spatialCardRowData },
    { key: 'spatialCardRowApex', label: { vi: 'Thẻ số liệu (Apex)',      en: 'Stat Cards (Apex)' },  config: spatialCardRowApex, data: spatialCardRowApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
