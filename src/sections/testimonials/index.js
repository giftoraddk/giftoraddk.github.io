// src/sections/testimonials/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernHori, data as modernHoriData } from './modernHori.js'
import { config as spatialMasonryNeat, data as spatialMasonryNeatData } from './spatialMasonryNeat.js'
import { config as spatialMasonryNeatApex, data as spatialMasonryNeatApexData } from './spatialMasonryNeatApex.js'

// `data` — xem hero/index.js. Cả 3 template là slider/masonry testimonial quote (3-6 dòng,
// không phải content chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các
// dòng còn lại qua svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernHori',             label: { vi: 'Trượt đánh giá',                       en: 'Testimonial Slider' },        config: modernHori,             data: modernHoriData },
    { key: 'spatialMasonryNeat',     label: { vi: 'Lưới đánh giá dạng masonry',           en: 'Testimonial Masonry' },        config: spatialMasonryNeat,     data: spatialMasonryNeatData },
    { key: 'spatialMasonryNeatApex', label: { vi: 'Lưới đánh giá dạng masonry (Apex)',    en: 'Testimonial Masonry (Apex)' }, config: spatialMasonryNeatApex, data: spatialMasonryNeatApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
