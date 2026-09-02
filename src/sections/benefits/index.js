// src/sections/benefits/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernCardCompare, data as modernCardCompareData } from './modernCardCompare.js'
import { config as modernCardList, data as modernCardListData } from './modernCardList.js'
import { config as modernPicBenefits, data as modernPicBenefitsData } from './modernPicBenefits.js'

// `data` — xem hero/index.js. Cả 3 template chỉ có ĐÚNG 1 record editable (data[0], svc-admin
// dùng mode `single`): modernCardCompare dùng field top-level chuẩn records.js (Tier 0 heading)
// + meta.* cho 2 bảng so sánh cố định; modernCardList/modernPicBenefits có thêm checklist nhiều
// dòng NESTED trong `cards` (dataKey, xem comment trong từng file) — svc-bay-sections.js tự phát
// hiện field này và bổ sung field type 'repeater' vào schema để owner thêm/xoá/sửa từng dòng
// checklist ngay trong form, không cần đụng code template.
export const templates = [
    { key: 'modernCardCompare', label: { vi: 'Bảng so sánh',           en: 'Comparison Table' },  config: modernCardCompare, data: modernCardCompareData },
    { key: 'modernCardList',    label: { vi: 'Danh sách lợi ích',      en: 'Checklist Cards' },    config: modernCardList,    data: modernCardListData },
    { key: 'modernPicBenefits', label: { vi: 'Lợi ích kèm hình ảnh',   en: 'Benefits with Image' }, config: modernPicBenefits, data: modernPicBenefitsData },
].map(t => ({ ...t, config: omitBg(t.config) }))
