// src/webs/llm/svc-production.js
//
// <svc-production> — generic AI product-generation popup, attached to any web-table row via the
// `production` prop (mirrors svc-marketing.js's `marketing` integration). Public API: open(recordId).
// Cloned from division/svc-production.js (domain-isolation clone) — logic unchanged, chuyên môn
// đọc từ bảng `divisions` (LLM_DB, doc id 'production' — CÙNG config llm/svc-talk.js dùng làm tiền
// đề "tạo sản phẩm trước" cho các phòng ban khác) qua tools/admin-base.js's DivisionAdminBase.
import { DivisionAdminBase } from './tools/admin-base.js'
import { PRODUCTION_DIVISION_SEED } from './tools/seed-production.js'

const TXT_STD = {
    vi: {
        title: 'AI Sản phẩm',
        topicLabel: 'Chủ đề', topicPlaceholder: 'Nhập chủ đề/tên sản phẩm cần tạo…',
        languageLabel: 'Ngôn ngữ nội dung',
        colorsLabel: 'Màu chủ đạo cho ảnh (bỏ trống = ngẫu nhiên)',
        generate: 'Tạo sản phẩm',
        errNeedTopic: 'Vui lòng nhập chủ đề', errNeedAi: 'Cần cấu hình AI để dùng tính năng này',
        errBadResponse: 'AI trả dữ liệu không hợp lệ',
        titleLabel: 'Tên sản phẩm', descLabel: 'Mô tả ngắn', contentLabel: 'Nội dung', picsLabel: 'Ảnh minh họa',
        contentPlaceholder: 'Nội dung sản phẩm…',
        regenerate: 'Tạo lại', save: 'Lưu',
        saveOk: 'Đã lưu vào sản phẩm', saveFail: 'Lưu thất bại',
    },
    en: {
        title: 'AI Product',
        topicLabel: 'Topic', topicPlaceholder: 'Enter a product topic/name to create…',
        languageLabel: 'Content language',
        colorsLabel: 'Image accent colors (leave empty = random)',
        generate: 'Generate product',
        errNeedTopic: 'Please enter a topic', errNeedAi: 'AI must be configured to use this feature',
        errBadResponse: 'AI returned invalid data',
        titleLabel: 'Product name', descLabel: 'Short description', contentLabel: 'Content', picsLabel: 'Image',
        contentPlaceholder: 'Product content…',
        regenerate: 'Regenerate', save: 'Save',
        saveOk: 'Saved to product', saveFail: 'Save failed',
    },
}

export class SvcProduction extends DivisionAdminBase {
    static SEED = PRODUCTION_DIVISION_SEED
    static SEED_ID = 'production'
    static TXT_STD = TXT_STD
    static SAVED_EVENT = 'production:saved'

    constructor() {
        super()
        this.table    = 'products'
        this.processTable = 'productions'
        this.division = 'production'
    }
}

// Tag name 'svc-production', NOT 'svc-production' — avoids a global Custom Elements registry
// collision with division/svc-production.js (same rationale as svc-talk, see that file's header).
if (!customElements.get('svc-production')) customElements.define('svc-production', SvcProduction)
export default SvcProduction
