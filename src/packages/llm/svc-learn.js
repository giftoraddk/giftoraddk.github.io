// src/packages/llm/svc-learn.js
//
// "Nạp dữ liệu" panel cho /admin/knowledge (modules/admin) — trước đây toàn bộ logic (đọc products, ghi
// know qua syncKnowFromRecord, auto-link rel qua autoLinkKnowByTags, parse CSV) nằm thẳng trong
// <script> của trang; đóng gói lại thành 1 custom element tự chứa (tự đọc/ghi know/rel, dispatch
// event ra ngoài) đúng tinh thần các svc-* khác trong domain này — trang chỉ còn lắng nghe
// 'learn:done' rồi reload 2 lưới know/rel (xem pages/admin/[table].astro).
//
// Ported from astro-micro's src/webs/llm/svc-learn.js (Event Bus Global port).
//
// Đọc `products` qua crud.js (auth, xem tool/server.js); ghi `know` qua Worker POST /v1/hubs/items (service/hub.js
// importItems → knowImport.ts upsertKnow) — 1 đường duy nhất lo đủ: id = owner + id gốc (bấm lại thì ĐÈ đúng mục cũ,
// mục mới thì THÊM), FTS + chunk + vector (nội dung không đổi thì giữ index, không tốn embedding), `rel` theo tag chung.
// Đồng bộ sản phẩm gửi `prune` ở lượt cuối: sản phẩm đã xoá khỏi cửa hàng cũng rời kho tri thức.
//
// `site` (vd 'https://giftoraddk.com') = kho riêng của site đó ('@giftoraddk.com' — cái <svc-aide site> của site đọc) +
// link trang sản phẩm gắn vào mỗi mục ("Link: …" — trợ lý chỉ đưa link có trong kiến thức). Không có `site` = kiến thức
// chung của nền tảng (owner ''), giữ nguyên id bản ghi như know-sync.js khi admin lưu 1 sản phẩm.
//
// Giao diện kiểu tints (css/svc-learn.css): không tự vẽ khung — nằm trong khung panel của trang admin (.adm-panel);
// 2 thẻ hành động: đồng bộ bảng products · nhập file CSV (loại dữ liệu + ngành + phòng).
// Hàng nút: "Nạp từ sản phẩm" chiếm ~1/4, cụm input(type)+nút CSV chiếm phần còn lại — cùng
// nguyên tắc input co giãn (flex:1) + nút giữ nguyên kích thước như .sas-input-row.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-text.js'
import '@/packages/apex/web-button.js'
import { createService } from '@/services/core/crud.js'
import { txtLingo, toastEmit, parseCsvRows, slugify, toPrice, productSlug } from '@/services/tools/util.js'
import { hub, siteOwner } from './service/hub.js'
import { serverOf } from './tool/server.js'
import { fnApi } from './service/fn-api.js'
import { displayTitle } from './tool/divisions.js'
import styles from './css/svc-learn.css?inline'

const productSvc = createService('products', '', serverOf('products'))

const BATCH = 50 // mục mỗi lần gọi /v1/hubs/items — nội dung sản phẩm (HTML dài) vẫn nằm gọn trong giới hạn body
const SOURCE_PRODUCTS = 'sync:products' // tên lượt đồng bộ — `prune` chỉ đụng các mục của nó, không đụng CSV / API khác
// Kho chung của nền tảng: sản phẩm thuộc ngành thương mại điện tử, phòng sản phẩm (cùng scopeOf của know-sync.js) —
// trợ lý tư vấn ngành khác không trả lời từ danh mục của shop. Kho riêng 1 site: mọi ngành ('').
const PLATFORM_PRODUCT_SCOPE = { sector: 'ecommerce', fn: 'product' }

const plain = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const metaOf = (m) => {
    if (m && typeof m === 'object') return m
    try { return typeof m === 'string' && m.trim().startsWith('{') ? JSON.parse(m) : {} } catch { return {} }
}

/**
 * 1 sản phẩm → 1 mục kiến thức. Chỉ GIÁ BÁN (phần đầu của pricing "giá~vốn~đơn vị") — giá vốn không bao giờ rời admin,
 * kể cả vào kho tri thức (không trông vào redactPricing của Worker search.ts).
 * Câu ngắn, tự đủ nghĩa (trợ lý trích nguyên câu); dòng "Link:" cuối = trang sản phẩm.
 */
function productItem(p, base) {
    const [rawPrice = '', , rawUnit = ''] = String(p.pricing ?? '').split('~')
    const price = toPrice(p.pricing)
    const unit = rawUnit.trim()
    const meta = metaOf(p.meta)
    const stock = meta.stock ?? p.quantity
    const url = base ? `${base}/product/${productSlug(p)}/` : ''
    const description = [
        String(p.description ?? '').trim(),
        plain(p.content),
        `Giá: ${price ? `${price}${unit ? ` / ${unit}` : ''}` : 'Liên hệ để nhận báo giá theo số lượng'}.`,
        p.promo ? `Khuyến mãi: ${plain(p.promo)}.` : '',
        stock !== undefined && stock !== null && stock !== '' && Number(stock) === 0 ? 'Tình trạng: tạm hết hàng.' : '',
        url ? `Link: ${url}` : '',
    ].filter(Boolean).join('\n\n')
    return {
        id: String(p.id),
        type: 'product',
        title: String(p.title ?? '').trim(),
        description,
        tags: String(p.tags ?? '').split('|').map((t) => t.trim()).filter(Boolean),
        // pricing cùng dạng "giá~vốn~đơn vị" mà Worker chatPrompt.ts formatPrice đọc (dòng PRICE) — ô vốn để TRỐNG
        meta: { ...(url && { url }), ...(price && { pricing: `${Number(rawPrice)}~~${unit}` }) },
        status: p.status === 'active' ? 'active' : 'draft',
    }
}

/** Cộng dồn kết quả các lượt /v1/hubs/items. */
const addUp = (a, b) => Object.fromEntries(['created', 'updated', 'unchanged', 'indexed', 'related', 'pruned'].map((k) => [k, (a[k] || 0) + (b[k] || 0)]))

const TXT_STD = {
    vi: {
        legend: 'Nạp dữ liệu', hint: 'Đưa sản phẩm vào kho tri thức để trợ lý tư vấn đúng hàng đang bán.',
        syncTitle: 'Đồng bộ sản phẩm', syncDesc: 'Nạp lại toàn bộ sản phẩm của cửa hàng: trùng thì cập nhật, mới thì thêm, đã xoá khỏi cửa hàng thì gỡ; tự lập chỉ mục tìm kiếm và liên kết các mục cùng tag. Bấm nhiều lần vẫn an toàn.',
        syncBtn: 'Nạp sản phẩm', csvTitle: 'Nhập từ file CSV', csvBtn: 'Chọn file CSV',
        csvDesc: 'Cột theo thứ tự: title · description · content · tags · pricing · promo · quantity (dòng tiêu đề tự bỏ qua). Nhập lại cùng tiêu đề thì cập nhật dòng cũ.',
        typeLabel: 'Loại dữ liệu', typePlaceholder: 'Bỏ trống = product',
        sectorLabel: 'Ngành dùng dữ liệu này', allSectors: 'Mọi ngành', fnLabel: 'Phòng dùng dữ liệu này', allFns: 'Mọi phòng',
        syncOk: 'Đã nạp {ok} sản phẩm: {created} mới, {updated} cập nhật, {pruned} gỡ bỏ · lập chỉ mục {indexed} · {linked} quan hệ',
        syncErr: 'Nạp sản phẩm thất bại',
        csvOk: 'Đã nhập {ok} dòng CSV (type="{type}"): {created} mới, {updated} cập nhật · {linked} quan hệ',
        csvErr: 'Nhập CSV thất bại',
    },
    en: {
        legend: 'Data ingestion', hint: 'Load products into the knowledge base so the assistant recommends what is actually on sale.',
        syncTitle: 'Sync products', syncDesc: 'Re-import every shop product: existing ones are updated, new ones added, removed ones dropped; search index and tag links are built automatically. Safe to run repeatedly.',
        syncBtn: 'Sync products', csvTitle: 'Import a CSV file', csvBtn: 'Choose CSV file',
        csvDesc: 'Columns in order: title · description · content · tags · pricing · promo · quantity (a header row is skipped). Re-importing the same title updates that row.',
        typeLabel: 'Data type', typePlaceholder: 'Blank = product',
        sectorLabel: 'Sector that uses this data', allSectors: 'Every sector', fnLabel: 'Department that uses this data', allFns: 'Every department',
        syncOk: 'Synced {ok} products: {created} new, {updated} updated, {pruned} removed · {indexed} indexed · {linked} relations',
        syncErr: 'Product sync failed',
        csvOk: 'Imported {ok} CSV rows (type="{type}"): {created} new, {updated} updated · {linked} relations',
        csvErr: 'CSV import failed',
    },
}

function _fmt(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

/**
 * <svc-learn site="https://giftoraddk.com">
 * Props: site/ui/theme/lang. Event: 'learn:done' { ok, created, updated, pruned, indexed, linked, type? } — phát
 * sau mỗi lần nạp (bulk products HOẶC CSV) thành công, để caller reload lưới know/rel của nó.
 */
export class SvcLearn extends LitElement {
    static styles = unsafeCSS(styles)
    static properties = {
        site:  { type: String }, // origin của site — kho riêng '@<host>' + link trang sản phẩm; '' = kiến thức chung
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object },
        _type:        { state: true },
        _sectors:     { state: true }, // GET /v1/fn/sectors — options of the CSV scope pickers
        _sector:      { state: true }, // '' = mọi ngành
        _fn:          { state: true }, // '' = mọi phòng
        _syncLoading: { state: true },
        _csvLoading:  { state: true },
    }

    constructor() {
        super()
        this.site = ''; this.ui = ''; this.theme = ''; this.lang = 'vi'; this.txt = null
        this._type = ''
        this._sectors = []
        this._sector = ''
        this._fn = ''
        this._syncLoading = false
        this._csvLoading = false
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    get _owner() { return siteOwner(this.site) } // '' khi không có site = kiến thức chung của nền tảng
    get _base() { try { return this.site ? new URL(this.site).origin : '' } catch { return '' } }

    /**
     * Gửi `items` theo lượt BATCH tới /v1/hubs/items — `prune` gắn vào lượt CUỐI kèm `since` = startedAt của lượt đầu
     * (mục của `source` không được ghi trong lần này = đã bị xoá ở nguồn). Trả kết quả cộng dồn; lỗi lượt nào ném luôn.
     */
    async _sendItems(items, { source, type, sector = '', fn = '', prune = false }) {
        let total = {}, since = ''
        const batches = items.length ? Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) => items.slice(i * BATCH, (i + 1) * BATCH)) : [[]]
        for (let i = 0; i < batches.length; i++) {
            const last = i === batches.length - 1
            const res = await hub.importItems({
                owner: this._owner, source, type, sector, fn, items: batches[i],
                ...(prune && last && { prune: true, ...(since && { since }) }),
            })
            if (!res.ok) throw new Error(res.message || `HTTP ${res.statusCode}`)
            since ||= res.data?.startedAt ?? ''
            total = addUp(total, res.data ?? {})
        }
        return total
    }

    connectedCallback() {
        super.connectedCallback()
        fnApi.sectors().then((res) => { if (res.ok) this._sectors = res.data ?? [] })
    }

    // Phòng của ngành đang chọn + Tư vấn (worker knowImport.ts KNOW_FNS); chưa chọn ngành → phòng của ngành đầu tiên
    // (9 phòng giống nhau ở mọi ngành). Worker vẫn tự kiểm cặp ngành/phòng (parseKnowScope) khi ghi.
    get _fnOptions() {
        const s = this._sectors.find((x) => x.id === this._sector) ?? this._sectors[0]
        return (s?.functions ?? []).map((f) => ({ fn: f.fn, title: displayTitle(f, this.lang) }))
    }

    _emitDone(detail) {
        this.dispatchEvent(new CustomEvent('learn:done', { detail, bubbles: true, composed: true }))
    }

    _dhTypeInput(e) { this._type = e.detail.value }

    // Case 1 — đồng bộ lại TOÀN BỘ bảng products (auth D1) vào kho tri thức của `site`: trùng id thì đè, mới thì thêm,
    // sản phẩm đã xoá khỏi cửa hàng thì gỡ (prune) — an toàn bấm nhiều lần. Index + rel do Worker làm (upsertKnow).
    async _dhSyncProducts() {
        if (this._syncLoading) return
        this._syncLoading = true
        try {
            const rows = (await productSvc.findAll()).filter((r) => String(r?.title ?? '').trim())
            const base = this._base
            const scope = this._owner ? {} : PLATFORM_PRODUCT_SCOPE
            const r = await this._sendItems(rows.map((p) => productItem(p, base)), { source: SOURCE_PRODUCTS, type: 'product', ...scope, prune: true })
            const detail = { ok: rows.length, ...r, linked: r.related }
            this._emitDone(detail)
            toastEmit(_fmt(this._txt.syncOk, detail), 'success')
        } catch (err) {
            toastEmit(`${this._txt.syncErr}: ${err.message}`, 'error')
        } finally {
            this._syncLoading = false
        }
    }

    _dhPickCsv() { this.shadowRoot.querySelector('input[type="file"]')?.click() }

    // Case 2 — nhập CSV ngoài (không có sẵn trong bảng products) — cột CỐ ĐỊNH thứ tự
    // title|description|content|tags|pricing|promo|quantity (dòng đầu header thì tự bỏ qua). Input `type` áp dụng cho CẢ
    // FILE. Id = slug của tiêu đề → nhập lại file đã sửa thì ĐÈ đúng dòng cũ (không nhân đôi); không prune (CSV có thể
    // chỉ là 1 phần dữ liệu).
    async _dhCsvChange(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || this._csvLoading) return
        this._csvLoading = true
        try {
            const type = this._type.trim().toLowerCase() || 'product'
            const csvText = await file.text()
            const rows = parseCsvRows(csvText.replace(/^﻿/, '')).filter(r => r.some(c => c.trim() !== ''))
            const hasHeader = rows.length > 0 && (rows[0][0] || '').trim().toLowerCase() === 'title'
            const dataRows = hasHeader ? rows.slice(1) : rows
            const byId = new Map() // cùng tiêu đề 2 lần trong file → dòng sau thắng
            for (const cols of dataRows) {
                const [title, description, content, tags, pricing, promo, quantity] = cols
                const slug = slugify(title ?? '')
                if (!slug) continue
                byId.set(`csv-${type}-${slug}`, productItem({
                    id: `csv-${type}-${slug}`,
                    title: title.trim(), description: (description || '').trim(), content: (content || '').trim(),
                    tags: (tags || '').trim().replace(/,/g, '|'), pricing: (pricing || '').trim(), promo: (promo || '').trim(),
                    quantity: (quantity || '').trim(), status: 'active',
                }, ''))
            }
            const items = [...byId.values()].map((item) => ({ ...item, type }))
            const r = items.length ? await this._sendItems(items, { source: `csv:${type}`, type, sector: this._sector, fn: this._fn }) : {}
            const detail = { ok: items.length, ...r, linked: r.related ?? 0, type }
            this._emitDone(detail)
            toastEmit(_fmt(this._txt.csvOk, detail), 'success')
        } catch (err) {
            toastEmit(`${this._txt.csvErr}: ${err.message}`, 'error')
        } finally {
            this._csvLoading = false
        }
    }

    render() {
        const t = this._txt
        return html`
            <section class="svl" aria-labelledby="svl-h">
                <header class="svl-head">
                    <span class="svl-glyph"><iconify-icon icon="ri:database-2-line"></iconify-icon></span>
                    <div>
                        <h2 id="svl-h" class="svl-title">${t.legend}</h2>
                        <p class="svl-hint">${t.hint}</p>
                    </div>
                </header>

                <div class="svl-cards">
                    <article class="svl-card">
                        <div class="svl-card-head">
                            <iconify-icon icon="ri:refresh-line"></iconify-icon>
                            <h3>${t.syncTitle}</h3>
                        </div>
                        <p class="svl-desc">${t.syncDesc}</p>
                        <div class="svl-actions">
                            <web-button ui="modern" theme=${this.theme} type="fill" color="primary" height="38px" rounded="10px"
                                prefix="ri:upload-cloud-2-line" ?loading=${this._syncLoading} @click=${() => this._dhSyncProducts()}>${t.syncBtn}</web-button>
                        </div>
                    </article>

                    <article class="svl-card">
                        <div class="svl-card-head">
                            <iconify-icon icon="ri:file-excel-2-line"></iconify-icon>
                            <h3>${t.csvTitle}</h3>
                        </div>
                        <p class="svl-desc">${t.csvDesc}</p>
                        <div class="svl-fields">
                            <label class="svl-field svl-field-wide">
                                <span>${t.typeLabel}</span>
                                <web-text ui=${this.ui} theme=${this.theme} height="36px" placeholder=${t.typePlaceholder}
                                    .value=${this._type} @input=${e => this._dhTypeInput(e)}></web-text>
                            </label>
                            <label class="svl-field">
                                <span>${t.sectorLabel}</span>
                                <select class="svl-select" @change=${e => { this._sector = e.target.value; this._fn = '' }}>
                                    <option value="" ?selected=${!this._sector}>${t.allSectors}</option>
                                    ${this._sectors.map(s => html`<option value=${s.id} ?selected=${this._sector === s.id}>${s.name?.[this.lang] || s.name?.vi || s.id}</option>`)}
                                </select>
                            </label>
                            <label class="svl-field">
                                <span>${t.fnLabel}</span>
                                <select class="svl-select" @change=${e => { this._fn = e.target.value }}>
                                    <option value="" ?selected=${!this._fn}>${t.allFns}</option>
                                    ${this._fnOptions.map(f => html`<option value=${f.fn} ?selected=${this._fn === f.fn}>${f.title}</option>`)}
                                </select>
                            </label>
                        </div>
                        <input type="file" accept=".csv" hidden @change=${e => this._dhCsvChange(e)} />
                        <div class="svl-actions">
                            <web-button ui="modern" theme=${this.theme} type="outline" color="primary" height="38px" rounded="10px"
                                prefix="ri:file-upload-line" ?loading=${this._csvLoading} @click=${() => this._dhPickCsv()}>${t.csvBtn}</web-button>
                        </div>
                    </article>
                </div>
            </section>
        `
    }
}

if (!customElements.get('svc-learn')) customElements.define('svc-learn', SvcLearn)
