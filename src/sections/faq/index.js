// src/sections/faq/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernExpansionQuestion, data as modernExpansionQuestionData } from './modernExpansionQuestion.js'
import { config as spatialExpansionApex, data as spatialExpansionApexData } from './spatialExpansionApex.js'

// `data` — xem hero/index.js. Cả 2 template là accordion Q&A (5-6 dòng, không phải content
// chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn lại qua
// svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'modernExpansionQuestion', label: { vi: 'Câu hỏi dạng xổ xuống',        en: 'FAQ Accordion' },        config: modernExpansionQuestion, data: modernExpansionQuestionData },
    { key: 'spatialExpansionApex',    label: { vi: 'Câu hỏi dạng xổ xuống (Apex)', en: 'FAQ Accordion (Apex)' }, config: spatialExpansionApex,    data: spatialExpansionApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
