// src/sections/hero/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernHoriBase, data as modernHoriBaseData } from './modernHoriBase.js'
import { config as spatialHoriFeature, data as spatialHoriFeatureData } from './spatialHoriFeature.js'
import { config as spatialHoriGallery, data as spatialHoriGalleryData } from './spatialHoriGallery.js'
import { config as spatialHoriNeat, data as spatialHoriNeatData } from './spatialHoriNeat.js'
import { config as spatialNeatCenterApex, data as spatialNeatCenterApexData } from './spatialNeatCenterApex.js'
import { config as spatialSplitGalleryApex, data as spatialSplitGalleryApexData } from './spatialSplitGalleryApex.js'
import { config as spatialVideoNeatApex, data as spatialVideoNeatApexData } from './spatialVideoNeatApex.js'

// `data` — demo row của chính file config đó, dùng làm sectionItem mặc định khi tạo section
// mới chưa có dữ liệu (xem svc-channel-sections.js § _dcSeedDefaultItem) — luôn lấy đúng data[0]
// làm mồi, kể cả 3 template có `data` là mảng feature/checklist KHÔNG cùng hình dạng content
// chính (spatialHoriFeature/spatialHoriGallery/spatialSplitGalleryApex, xem comment trong các
// file đó) — dòng đầu vẫn seed được vì luôn có field `title` khớp records-chuẩn, chỉ thiếu các
// dòng feature còn lại (owner tự thêm qua svc-admin nếu cần đủ bộ).
export const templates = [
    { key: 'modernHoriBase',          label: { vi: 'Giới thiệu mở đầu',                en: 'Hero Intro' },                    config: modernHoriBase,          data: modernHoriBaseData },
    { key: 'spatialHoriFeature',      label: { vi: 'Giới thiệu kèm tính năng',         en: 'Hero with Features' },            config: spatialHoriFeature,      data: spatialHoriFeatureData },
    { key: 'spatialHoriGallery',      label: { vi: 'Giới thiệu kèm thư viện ảnh',      en: 'Hero with Gallery' },              config: spatialHoriGallery,      data: spatialHoriGalleryData },
    { key: 'spatialHoriNeat',         label: { vi: 'Giới thiệu chia đôi',              en: 'Hero Split' },                     config: spatialHoriNeat,         data: spatialHoriNeatData },
    { key: 'spatialNeatCenterApex',   label: { vi: 'Giới thiệu giữa (Apex)',           en: 'Hero Centered (Apex)' },           config: spatialNeatCenterApex,   data: spatialNeatCenterApexData },
    { key: 'spatialSplitGalleryApex', label: { vi: 'Giới thiệu chia đôi kèm ảnh (Apex)', en: 'Hero Gallery Split (Apex)' },    config: spatialSplitGalleryApex, data: spatialSplitGalleryApexData },
    { key: 'spatialVideoNeatApex',    label: { vi: 'Giới thiệu nền video (Apex)',      en: 'Hero Video Background (Apex)' },  config: spatialVideoNeatApex,    data: spatialVideoNeatApexData },
].map(t => ({ ...t, config: omitBg(t.config) }))
