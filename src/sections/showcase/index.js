// src/sections/showcase/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernHoriCase, data as modernHoriCaseData } from './modernHoriCase.js'
import { config as modernSlideNeat, data as modernSlideNeatData } from './modernSlideNeat.js'
import { config as modernSlidePortfolio, data as modernSlidePortfolioData } from './modernSlidePortfolio.js'

// `data` — xem hero/index.js. Cả 3 template là slider case-study/portfolio/gallery (3-6 dòng,
// không phải content chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các
// dòng còn lại qua svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernHoriCase',       label: { vi: 'Trượt case study',        en: 'Case Study Slider' },  config: modernHoriCase,       data: modernHoriCaseData },
    { key: 'modernSlideNeat',      label: { vi: 'Trượt toàn màn hình',     en: 'Full-width Slider' },   config: modernSlideNeat,      data: modernSlideNeatData },
    { key: 'modernSlidePortfolio', label: { vi: 'Trượt portfolio',         en: 'Portfolio Slider' },     config: modernSlidePortfolio, data: modernSlidePortfolioData },
].map(t => ({ ...t, config: omitBg(t.config) }))
