// src/webs/auth/svc-assist.js
//
// Trợ lý AI điền nhanh dữ liệu cho svc-admin, nhận prop `schema` (CÙNG shape props.schema của
// svc-admin/web-table.js: [{label, field, key, type, opts, segments, segmentHints, required,
// write, csvWrite}]). 2 chế độ (prop `multiple`):
//
//   multiple=false (mặc định) — sinh ĐÚNG 1 record, dispatch 'assist:fields' { fields } (object
//   NESTED cùng shape 1 row thật, vd { meta: { address: '...' } }) — dùng mồi form "Thêm mới"
//   (svc-admin.js gọi <web-table>.openNew(fields)) hoặc merge vào form đang sửa ở mode `single`
//   (svc-admin.js gọi <web-table>.applyAiDraft(fields)).
//
//   multiple=true — sinh NHIỀU record cùng lúc (số lượng theo prop `count`), dispatch
//   'assist:records' { rows } (Array<Object> NESTED) — dùng bulk-create trực tiếp (bỏ qua form
//   review từng cái, giống luồng CSV import), vd svc-bay-sections.js tạo nhanh N sản phẩm.
//
// Prop `inline` (mặc định true) — false thì bọc nút tròn + <web-dialog> riêng (dùng khi nhúng
// vào 1 toolbox nút tròn, vd svc-bay-sections.js) thay vì hiện thẳng form (dùng khi đặt cố định
// trên đầu <web-table>, xem svc-admin.js).
//
// Field type 'repeater' (mảng object nested, xem web-table.js) CŨNG được AI điền — mỗi field
// repeater khai báo `itemSchema` (field/label/type của mỗi phần tử con), _promptSchema() mô tả
// nó dưới dạng "type": "array" + "items", AI tự chọn số lượng phần tử hợp lý (xem _arrayLine).
//
// Component KHÔNG tự ghi DB — chỉ dispatch event, caller tự ghi.
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import '@/webs/apex/web-dialog.js'
import '@/webs/apex/web-select.js'
import { generateText } from '@/services/tensor.js'
import TOPIC_GROUPS from '@/services/products/all.json'
import { buildNested, txtLingo } from '@/services/helper.js'
import styles from './styles/svc-assist.css?inline'

// Field kiểu này AI không nên tự sinh — ảnh (bịa URL vô nghĩa), toạ độ (bịa vị trí sai), rich
// text (dài, hay lệch định dạng ProseMirror), mật khẩu (không bao giờ AI sinh hộ). `repeater`
// (mảng object nested, xem web-table.js) KHÔNG nằm trong danh sách này — AI vẫn điền được, xem
// _promptSchema()/_coerceFields() xử lý riêng dựa vào `col.itemSchema`.
const SKIP_TYPES = new Set(['photor', 'editor', 'location', 'password'])

// Field hệ thống theo tên (không tin `write` khai báo đúng cho mọi schema — 1 số cột như
// products.js's `index` không set write:false dù rõ ràng do code quản lý, không phải content).
// `score` cũng nằm đây dù có `csvWrite:true` (products.js) — luôn cùng 1 giá trị mặc định
// (xem SCORE_STD) chứ không cần AI bịa ra, khác hẳn field CSV import thật sự cho ghi tay.
const SKIP_FIELDS = new Set(['id', 'index', 'created_at', 'updated_at', 'deleted_at', 'actors', 'user_id', 'scope', 'secure', 'score'])

// Giá trị mặc định gán thẳng cho field `score` (avg~count) khi schema có field này — không hỏi
// AI vì mọi bản ghi mới đều chưa có review thật, tránh AI bịa số liệu vô nghĩa.
const SCORE_STD = '4.5~1'

const TXT_STD = {
    vi: {
        titleSingle: 'Trợ lý điền nhanh', titleMultiple: 'Trợ lý tạo nhanh nhiều sản phẩm',
        placeholder: 'Nhập mô tả để AI bắt đầu sáng tạo...',
        confirm: 'Xác nhận', aiLegend: 'Gợi ý nhanh bằng AI', allGroups: 'Tất cả các chủ đề',
        errNeedAi: 'Cần cấu hình AI để dùng trợ lý điền nhanh',
        errBadResponse: 'AI trả dữ liệu không hợp lệ',
        errFailed: 'Không tạo được dữ liệu, vui lòng thử lại',
        errNoSchema: 'Chưa có field nào để AI điền',
    },
    en: {
        titleSingle: 'Quick-fill assistant', titleMultiple: 'Quick multi-record assistant',
        placeholder: 'Enter a description for AI to start creating...',
        confirm: 'Confirm', aiLegend: 'AI quick suggestions', allGroups: 'All topic groups',
        errNeedAi: 'AI must be configured to use the quick-fill assistant',
        errBadResponse: 'AI returned invalid data',
        errFailed: 'Could not generate data, please try again',
        errNoSchema: 'No fillable field found',
    },
}

/**
 * <svc-assist>
 * Props: ui/theme/lang, ai (config string tensor.js), schema (Array — cùng shape svc-admin.schema),
 *        multiple (Boolean, mặc định false), count (Number, mặc định 6, chỉ dùng khi multiple),
 *        inline (Boolean, mặc định true), hint (String, mặc định '' — ngữ cảnh phân loại ngầm
 *        của form đang điền, vd "Câu hỏi thường gặp (FAQ)" khi schema chung records.js đang dùng
 *        cho 1 section FAQ cụ thể — schema tự nó không đủ để AI biết đây là FAQ hay Hero hay Team,
 *        xem svc-bay-sections.js truyền `assistHint` qua svc-admin.js).
 * Events: assist:fields { fields: Object } (multiple=false) | assist:records { rows: Object[] }
 *         (multiple=true) — fields/rows đã NESTED (dot-path key → object con), KHÔNG tự ghi DB.
 */
export class SvcAssist extends LitElement {
    static styles = unsafeCSS(styles)
    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        ai:    { type: String },
        schema:   { type: Array },
        multiple: { type: Boolean },
        count:    { type: Number },
        inline:   { type: Boolean },
        hint:     { type: String },
        _query:   { state: true },
        _loading: { state: true },
        _error:   { state: true },
        _showDialog: { state: true },
        _selectedGroup: { state: true },
        _collapsed: { state: true },
    }

    constructor() {
        super()
        this.ui = ''; this.theme = ''; this.lang = 'vi'; this.txt = null; this.ai = ''
        this.schema = []
        this.multiple = false
        this.count = 6
        this.inline = true
        this.hint = ''
        this._query = ''
        this._loading = false
        this._error = ''
        this._showDialog = false
        this._selectedGroup = '' // '' = tất cả nhóm — value web-select dùng để lọc _topicGroups
        this._collapsed = true // panel inline mặc định đóng, mở khi user bấm header
        this._reqId = 0
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }
    get _title() { return this.multiple ? this._txt.titleMultiple : this._txt.titleSingle }

    // Cột thực sự nên để AI điền — loại field hệ thống (SKIP_FIELDS/SKIP_TYPES). Field write:false
    // khác (không nằm trong SKIP_FIELDS) vẫn cho qua khi multiple + có csvWrite:true — cùng ngoại
    // lệ CSV import của svc-admin.js (_dfImportCsv), vì bulk-create ở đây không qua form review
    // từng cái, giống hệt luồng import.
    get _fillableCols() {
        return (this.schema ?? []).filter(c => {
            if (!c.type || SKIP_TYPES.has(c.type)) return false
            if (SKIP_FIELDS.has(c.key || c.field)) return false
            if (c.write === false) return this.multiple && c.csvWrite
            return true
        })
    }

    // Nhóm topic lớn (all.json: { groupKey: { lang, items: [{id, lang}] } }) → localize theo
    // this.lang, fallback 'vi' vì all.json chỉ đảm bảo có sẵn "vi"/"en". Group hiện đúng vai trò
    // "mục lục" — chip con bên trong mới là thứ thật sự đưa vào _dhPickChip(). Lọc theo
    // _selectedGroup (từ <web-select>) — '' nghĩa là hiện hết, không lọc.
    get _topicGroups() {
        return Object.entries(TOPIC_GROUPS)
            .filter(([key]) => !this._selectedGroup || key === this._selectedGroup)
            .map(([, group]) => ({
                label: group.lang?.[this.lang] ?? group.lang?.vi,
                items: (group.items ?? []).map(it => it.lang?.[this.lang] ?? it.lang?.vi),
            }))
    }

    // options cho <web-select> lọc nhóm — value là group key, kèm 1 lựa chọn "Tất cả nhóm" đầu
    // danh sách (value: '') để quay lại hiện hết.
    get _groupOptions() {
        return [
            { value: '', label: this._txt.allGroups },
            ...Object.entries(TOPIC_GROUPS).map(([key, group]) => ({
                value: key, label: group.lang?.[this.lang] ?? group.lang?.vi,
            })),
        ]
    }

    _dhGroupChange(e) { this._selectedGroup = e.detail.value ?? '' }

    _dhInput(e) { this._query = e.detail.value; this._error = '' }
    // Có `hint` (biết rõ form đang điền thuộc loại section nào) → ghép ngầm chủ đề chọn với loại
    // section đó (vd chọn "Quán cà phê" trong form FAQ → "Quán cà phê — Câu hỏi thường gặp"),
    // không thì giữ nguyên gợi ý chung của tag như trước giờ.
    _dhPickChip(label) { this._query = this.hint ? `${label} — ${this.hint}` : label; this._error = '' }
    // Mở dialog (mode inline=false) → panel bên trong luôn hiện sẵn (đã "mở" bằng hành động bấm
    // FAB), không cần đóng thêm 1 lớp nữa như panel inline gắn cố định trên form.
    _dhOpen() { this._showDialog = true; this._collapsed = false }
    _dhCancel() { this._reqId++; this._setLoading(false); this._showDialog = false; this._error = '' }
    _dhToggleCollapse() { this._collapsed = !this._collapsed }

    // Báo cho component ngoài (svc-admin.js) biết đang chờ AI — để overlay loading lên đúng form
    // sắp bị AI điền vào (xem web-table.js prop `aiLoading`), không chỉ riêng nút xác nhận nhỏ ở
    // đây. Luôn đi kèm set _loading để 2 nơi đồng bộ, tránh quên set 1 trong 2 chỗ.
    _setLoading(v) {
        this._loading = v
        this.dispatchEvent(new CustomEvent('assist:loading', { detail: { loading: v }, bubbles: true, composed: true }))
    }

    get _promptSchema() {
        return this._fillableCols.map(c => {
            const key = c.key || c.field
            // repeater — field là 1 MẢNG object (vd modernCardList.js's `cards`), không phải giá
            // trị đơn — mô tả riêng bằng "items" (field con của mỗi phần tử), xem _systemPrompt
            // giải thích cách AI phải trả cho type "array".
            if (c.type === 'repeater') {
                return {
                    field: key, label: c.label, type: 'array',
                    items: (c.itemSchema ?? []).map(s => ({ field: s.field, label: s.label ?? s.field, type: s.type })),
                }
            }
            const desc = { field: key, label: c.label, type: c.type }
            if (c.type === 'select') desc.options = (c.opts ?? []).map(o => typeof o === 'string' ? o : o.value)
            // Field dạng segment (vd products.pricing: "price~cost~unit") — text 1 dòng nhưng
            // AI phải trả ĐÚNG số phần nối "~", không phải câu văn thường.
            if (c.segments > 1) {
                desc.format = `chuỗi ${c.segments} phần nối bằng dấu "~"${c.segmentHints ? `, thứ tự: ${c.segmentHints}` : ''}`
                // `currency` (vd products/staff/orders/inventory's pricing) — AI hay viết tắt theo
                // "nghìn" (trả "20" cho ý 20.000đ) vì thói quen nói giá ngoài đời, phải nói rõ trả
                // ĐỦ số theo đồng để khớp với cách hệ thống hiển thị/lưu (Number(v).toLocaleString()
                // + 'đ', không tự nhân lại — xem render() của các schema trên).
                if (c.currency) desc.format += '; các phần là số tiền phải là số ĐẦY ĐỦ theo đơn vị đồng Việt Nam, KHÔNG viết tắt theo nghìn/triệu (ví dụ giá 20 nghìn đồng phải ghi "20000", không ghi "20" hay "20k")'
            }
            // Field multi-value (vd products.tags: "hot|coffee|strong") — nhiều giá trị ngắn nối
            // bằng "|", KHÔNG phải danh sách câu văn nối bằng dấu phẩy.
            else if (c.multi) desc.format = 'nhiều giá trị ngắn nối bằng dấu "|" (không dùng dấu phẩy), ví dụ "tag1|tag2|tag3"'
            return desc
        })
    }

    get _hintLine() {
        return this.hint
            ? `Ngữ cảnh bắt buộc: nội dung tạo ra phải phù hợp phần "${this.hint}" của trang web (không phải mô tả chung, mà đúng vai trò của phần này).\n`
            : ''
    }

    // Field type "array" (repeater) cần câu giải thích riêng — dùng chung cho cả 2 nhánh
    // multiple/single vì repeater có thể xuất hiện ở bất kỳ nhánh nào.
    get _arrayLine() {
        return this._fillableCols.some(c => c.type === 'repeater')
            ? `Field có "type": "array" phải trả về 1 MẢNG JSON gồm nhiều OBJECT con, mỗi object
CHỈ chứa các field liệt kê trong "items" của field đó (đúng "type" từng field con) — tự chọn số
lượng phần tử hợp lý theo ngữ cảnh (thường 3-6), không cố định, không lặp lại y hệt nhau.\n`
            : ''
    }

    get _systemPrompt() {
        const schemaText = JSON.stringify(this._promptSchema, null, 2)
        if (this.multiple) {
            return `Bạn là trợ lý tạo nhanh NHIỀU bản ghi demo cho 1 form nhập liệu. Người dùng mô
tả ngắn gọn nội dung/chủ đề — hãy trả về ĐÚNG 1 JSON ARRAY gồm ${this.count} phần tử (không
markdown, không code fence, không giải thích gì thêm), mỗi phần tử là 1 JSON OBJECT CHỈ chứa các
"field" sau, đúng theo "type"/"format" mô tả — type "number" trả số, type "select" CHỈ trả 1 giá
trị nằm trong "options" đã cho (giữ đúng chữ, không dịch/sửa), field có "format" PHẢI theo ĐÚNG
định dạng đã nêu, các field khác trả text ngắn phù hợp:
${schemaText}
${this._arrayLine}${this._hintLine}Bỏ qua hẳn field nào không chắc chắn (không đoán bừa, không
thêm field lạ). Mỗi phần tử phải khác nhau (không lặp lại y hệt), nội dung bằng tiếng Việt, ngắn
gọn, tự nhiên, phù hợp mô tả người dùng, giá cả (nếu có) hợp lý theo thị trường Việt Nam.`
        }
        return `Bạn là trợ lý điền nhanh form nhập liệu. Người dùng mô tả ngắn gọn nội dung họ
muốn tạo — hãy trả về ĐÚNG 1 JSON OBJECT (không markdown, không code fence, không giải thích gì
thêm) CHỈ chứa các "field" sau, đúng theo "type"/"format" mô tả — type "number" trả số, type
"select" CHỈ trả 1 giá trị nằm trong "options" đã cho (giữ đúng chữ, không dịch/sửa), field có
"format" PHẢI theo ĐÚNG định dạng đã nêu, các type khác trả text ngắn phù hợp:
${schemaText}
${this._arrayLine}${this._hintLine}Bỏ qua hẳn field nào không chắc chắn (không đoán bừa, không
thêm field lạ). Nội dung bằng tiếng Việt, ngắn gọn, tự nhiên, phù hợp mô tả người dùng.`
    }

    // repeater sinh thêm nhiều object con → JSON trả về dài hơn hẳn field đơn, cần nhiều token
    // hơn mức 1200 mặc định của form single, tránh AI bị cắt giữa chừng JSON (parse lỗi liên tục).
    get _maxTokens() {
        if (this.multiple) return 2200
        return this._fillableCols.some(c => c.type === 'repeater') ? 2000 : 1200
    }

    async _dhConfirm() {
        const q = this._query.trim()
        if (!q) return
        if (!this._fillableCols.length) { this._error = this._txt.errNoSchema; return }
        if (!this.ai) { this._error = this._txt.errNeedAi; return }
        const reqId = ++this._reqId
        this._setLoading(true)
        this._error = ''
        try {
            const raw = await generateText(this.ai, [{ role: 'user', content: q }], {
                system: this._systemPrompt, maxTokens: this._maxTokens, temperature: 0.7,
            })
            if (reqId !== this._reqId) return
            this._setLoading(false)
            if (this.multiple) this._emitRecords(this._parseArray(raw).map(o => this._coerceFields(o)))
            else this._emitFields(this._coerceFields(this._parseObject(raw)))
        } catch (err) {
            if (reqId !== this._reqId) return
            this._setLoading(false)
            this._error = err.message || this._txt.errFailed
        }
    }

    _cleanJson(raw) { return raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim() }

    _parseObject(raw) {
        let parsed
        try { parsed = JSON.parse(this._cleanJson(raw)) } catch { throw new Error(this._txt.errBadResponse) }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(this._txt.errBadResponse)
        return parsed
    }

    _parseArray(raw) {
        let parsed
        try { parsed = JSON.parse(this._cleanJson(raw)) } catch { throw new Error(this._txt.errBadResponse) }
        if (!Array.isArray(parsed) || !parsed.length) throw new Error(this._txt.errBadResponse)
        return parsed
    }

    // Ép đúng type theo schema + bỏ field select có giá trị không khớp options (AI đôi khi trả
    // gần đúng/sai chính tả) — an toàn hơn tin thẳng AI, dữ liệu sai type sẽ vỡ web-currency/
    // web-select lúc render form. Trả object FLAT (dot-path key) — nest ở buildNested() (helper.js)
    // ngay trước khi emit, giữ hàm này thuần theo field/type.
    _coerceFields(aiObj) {
        const fields = {}
        for (const col of this._fillableCols) {
            const key = col.key || col.field
            if (!(key in aiObj)) continue
            const v = aiObj[key]
            if (col.type === 'repeater') {
                const rows = this._coerceRepeaterRows(v, col.itemSchema ?? [])
                if (rows.length) fields[key] = rows
            } else if (col.type === 'number') {
                const n = Number(v)
                if (!Number.isNaN(n)) fields[key] = n
            } else if (col.type === 'select') {
                const opts = (col.opts ?? []).map(o => typeof o === 'string' ? o : o.value)
                if (opts.includes(v)) fields[key] = v
            } else if (typeof v === 'string' && v.trim()) {
                fields[key] = v
            }
        }
        // `score` bị loại khỏi _fillableCols (SKIP_FIELDS) nên AI không bao giờ thấy field này —
        // chỉ bulk-create (multiple) cần gán thẳng SCORE_STD để record mới có sẵn giá trị
        // hiển thị hợp lý; form "Thêm mới" single vốn đã ẩn hẳn field score (read-only), không cần.
        if (this.multiple) {
            const scoreCol = (this.schema ?? []).find(c => (c.key || c.field) === 'score')
            if (scoreCol) fields[scoreCol.key || scoreCol.field] = SCORE_STD
        }
        return fields
    }

    // Ép từng phần tử của 1 field repeater theo itemSchema — cùng nguyên tắc "an toàn hơn tin
    // thẳng AI" như _coerceFields(), chỉ giữ item còn ít nhất 1 field con hợp lệ (bỏ hẳn item
    // rỗng/toàn field sai kiểu thay vì tạo dòng trống trong form).
    _coerceRepeaterRows(v, itemSchema) {
        if (!Array.isArray(v)) return []
        return v.map(item => {
            if (!item || typeof item !== 'object') return null
            const row = {}
            for (const sub of itemSchema) {
                const sv = item[sub.field]
                if (sub.type === 'number') {
                    const n = Number(sv)
                    if (!Number.isNaN(n)) row[sub.field] = n
                } else if (typeof sv === 'string' && sv.trim()) {
                    row[sub.field] = sv
                }
            }
            return Object.keys(row).length ? row : null
        }).filter(Boolean)
    }

    _emitFields(flat) {
        this._query = ''; this._error = ''; this._showDialog = false
        this.dispatchEvent(new CustomEvent('assist:fields', { detail: { fields: buildNested(flat) }, bubbles: true, composed: true }))
    }

    _emitRecords(flatRows) {
        this._query = ''; this._error = ''; this._showDialog = false
        this.dispatchEvent(new CustomEvent('assist:records', { detail: { rows: flatRows.map(buildNested) }, bubbles: true, composed: true }))
    }

    _rbForm() {
        return html`
            <div class="sas-form">
                <fieldset class="sas-panel ${this._collapsed ? '' : 'open'}">
                    <legend class="sas-legend" @click=${() => this._dhToggleCollapse()}>
                        <iconify-icon icon="ri:sparkling-2-line"></iconify-icon>${this._txt.aiLegend}
                        <svg class="sas-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </legend>
                    <div class="sas-content">
                        <div class="sas-body">
                            <web-select ui=${this.ui} theme=${this.theme} lang=${this.lang} height="34px"
                                .options=${this._groupOptions} .value=${this._selectedGroup} ?searchable=${false}
                                @change=${this._dhGroupChange}></web-select>
                            <div class="sas-groups">
                                ${this._topicGroups.map(g => html`
                                    <div class="sas-group">
                                        <div class="sas-group-label">${g.label}</div>
                                        <div class="sas-chips">
                                            ${g.items.map(label => html`
                                                <web-button mode="badge" type="dash" color="primary"
                                                    rounded="4px" style="font-size:0.75rem" ui=${this.ui} theme=${this.theme}
                                                    @clicked=${() => this._dhPickChip(label)}>${label}</web-button>
                                            `)}
                                        </div>
                                    </div>
                                `)}
                            </div>
                            <div class="sas-input-row">
                                <web-text ui=${this.ui} placeholder=${this._txt.placeholder}
                                    .value=${this._query} @input=${e => this._dhInput(e)}></web-text>
                                <web-button  ui="modern" theme=${this.theme} type="fill" color="primary" square rounded="50%" height="38px"
                                    ?loading=${this._loading} ?disabled=${!this._query.trim()}
                                    title=${this._txt.confirm} @clicked=${() => this._dhConfirm()}>
                                    <iconify-icon icon="ri:check-line" width="22px"></iconify-icon>
                                </web-button>
                            </div>
                        </div>
                    </div>
                </fieldset>
                ${this._error ? html`<div class="sas-msg err">${this._error}</div>` : nothing}
            </div>
        `
    }

    render() {
        if (this.inline) return this._rbForm()
        return html`
            <web-button type="fill" color="primary" square rounded="50%" height="45px"
                ui=${this.ui} theme=${this.theme} title=${this._title}
                @clicked=${() => this._dhOpen()}>
                <iconify-icon icon="ri:sparkling-2-line" width="20px"></iconify-icon>
            </web-button>
            <web-dialog ?open=${this._showDialog} title=${this._title} lang=${this.lang}
                maxWidth="520px" persistent ?disabled=${this._loading} ui=${this.ui} theme=${this.theme}
                @confirm=${() => this._dhConfirm()} @cancel=${() => this._dhCancel()}>
                ${this._rbForm()}
            </web-dialog>
        `
    }
}

if (!customElements.get('svc-assist')) customElements.define('svc-assist', SvcAssist)
