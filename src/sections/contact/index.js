// src/sections/contact/index.js
import { omitBg } from '@/services/helper.js'
import { config as modernHoriMap, data as modernHoriMapData } from './modernHoriMap.js'
import { config as spatialHoriMap, data as spatialHoriMapData } from './spatialHoriMap.js'
import { config as modernHoriGoogleMap, data as modernHoriGoogleMapData } from './modernGoogleMap.js'
import { config as spatialHoriGoogleMap, data as spatialHoriGoogleMapData } from './spatialGoogleMap.js'

// `data` — demo row của chính file config đó, dùng làm sectionItem mặc định khi tạo section
// mới chưa có dữ liệu (xem svc-channel-sections.js § _dcSeedDefaultItem).
export const templates = [
    { key: 'modernHoriMap',    label: { vi: 'Bản đồ kèm thông tin',                 en: 'Map with Info' },              config: modernHoriMap,        data: modernHoriMapData },
    { key: 'spatialHoriMap',   label: { vi: 'Bản đồ kèm thông tin (Bên phải)',            en: 'Map with Info (Right)' },       config: spatialHoriMap,       data: spatialHoriMapData },
    { key: 'modernGoogleMap',  label: { vi: 'Google Map kèm thông tin',             en: 'Google Map with Info' },        config: modernHoriGoogleMap,  data: modernHoriGoogleMapData },
    { key: 'spatialGoogleMap', label: { vi: 'Google Map kèm thông tin (Bên dưới)',   en: 'Google Map with Info (Bottom)' }, config: spatialHoriGoogleMap, data: spatialHoriGoogleMapData },
].map(t => ({ ...t, config: omitBg(t.config) }))
