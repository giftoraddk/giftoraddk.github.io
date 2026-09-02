// src/sections/team/index.js
import { omitBg } from '@/services/helper.js'
import { config as spatialCardGridNeat, data as spatialCardGridNeatData } from './spatialCardGridNeat.js'

// `data` — xem hero/index.js. Template là lưới 6 thành viên (pics/title/meta.role, không phải
// content chính dạng 1-record) — vẫn seed đúng data[0] làm mồi, owner tự thêm các dòng còn
// lại qua svc-admin nếu cần đủ bộ.
export const templates = [
    { key: 'spatialCardGridNeat', label: { vi: 'Lưới thành viên', en: 'Team Grid' }, config: spatialCardGridNeat, data: spatialCardGridNeatData },
].map(t => ({ ...t, config: omitBg(t.config) }))
