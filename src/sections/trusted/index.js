// src/sections/trusted/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernSlideLogos, data as modernSlideLogosData } from './modernSlideLogos.js'
import { config as spatialSlideLogos, data as spatialSlideLogosData } from './spatialSlideLogos.js'

// `data` — xem hero/index.js. Cả 2 template là slider logo (6-9 dòng, không phải content
// chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn lại qua
// svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernSlideLogos',  label: { vi: 'Trượt logo đối tác',            en: 'Logo Slider' },        config: modernSlideLogos,  data: modernSlideLogosData },
    { key: 'spatialSlideLogos', label: { vi: 'Trượt logo đối tác (kính mờ)',  en: 'Logo Slider (Glass)' }, config: spatialSlideLogos, data: spatialSlideLogosData },
].map(t => ({ ...t, config: omitBg(t.config) }))
