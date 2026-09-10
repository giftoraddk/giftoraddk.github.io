// src/webs/division/svc-marketing.js
//
// <svc-marketing> — generic AI content-generation popup, attached to any web-table row via the
// `marketing` prop (mirrors svc-diffs.js's `history` integration). Public API: open(recordId).
//
// Chuyên môn (steps/fields/prompts) KHÔNG hardcode ở đây — đọc từ Firestore collection `divisions`
// (doc theo `division` prop, mặc định 'marketing'; seed 1 lần từ tools/seed-marketing.js nếu chưa
// tồn tại) và chạy qua engine dùng chung (tools/engine.js/image.js) — xem
// hook/superpowers/specs/2026-09-05-division-talk-design.md.
//
// Toàn bộ orchestration (data/pipeline/Firestore) sống ở tools/admin-base.js's DivisionAdminBase —
// dùng chung với svc-production.js (mirror y hệt, khác division/table/seed/text). File này chỉ
// khai default props + hằng số riêng của phòng Marketing.
import { DivisionAdminBase } from './tools/admin-base.js'
import { MARKETING_DIVISION_SEED } from './tools/seed-marketing.js'

const TXT_STD = {
    vi: {
        title: 'AI Marketing',
        topicLabel: 'Chủ đề', topicPlaceholder: 'Nhập chủ đề cần viết nội dung marketing…',
        languageLabel: 'Ngôn ngữ nội dung',
        colorsLabel: 'Màu chủ đạo cho ảnh (bỏ trống = ngẫu nhiên)',
        generate: 'Tạo nội dung',
        errNeedTopic: 'Vui lòng nhập chủ đề', errNeedAi: 'Cần cấu hình AI để dùng tính năng này',
        errBadResponse: 'AI trả dữ liệu không hợp lệ',
        titleLabel: 'Tiêu đề', descLabel: 'Mô tả', contentLabel: 'Nội dung', picsLabel: 'Ảnh minh họa',
        contentPlaceholder: 'Nội dung bài viết…',
        regenerate: 'Tạo lại', save: 'Lưu',
        saveOk: 'Đã lưu vào bài viết', saveFail: 'Lưu thất bại',
    },
    en: {
        title: 'AI Marketing',
        topicLabel: 'Topic', topicPlaceholder: 'Enter a topic to generate marketing content…',
        languageLabel: 'Content language',
        colorsLabel: 'Image accent colors (leave empty = random)',
        generate: 'Generate content',
        errNeedTopic: 'Please enter a topic', errNeedAi: 'AI must be configured to use this feature',
        errBadResponse: 'AI returned invalid data',
        titleLabel: 'Title', descLabel: 'Description', contentLabel: 'Content', picsLabel: 'Image',
        contentPlaceholder: 'Article content…',
        regenerate: 'Regenerate', save: 'Save',
        saveOk: 'Saved to record', saveFail: 'Save failed',
    },
}

export class SvcMarketing extends DivisionAdminBase {
    static SEED = MARKETING_DIVISION_SEED
    static SEED_ID = 'marketing'
    static TXT_STD = TXT_STD
    static SAVED_EVENT = 'marketing:saved'

    constructor() {
        super()
        this.table    = 'records'
        this.processTable = 'marketing'
        this.division = 'marketing'
    }
}

if (!customElements.get('svc-marketing')) customElements.define('svc-marketing', SvcMarketing)
export default SvcMarketing
