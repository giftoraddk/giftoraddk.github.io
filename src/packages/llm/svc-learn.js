// src/packages/llm/svc-learn.js
//
// "Nạp dữ liệu" panel cho /admin/knowledge (modules/admin) — trước đây toàn bộ logic (đọc products, ghi
// know qua syncKnowFromRecord, auto-link rel qua autoLinkKnowByTags, parse CSV) nằm thẳng trong
// <script> của trang; đóng gói lại thành 1 custom element tự chứa (tự đọc/ghi know/rel, dispatch
// event ra ngoài) đúng tinh thần các svc-* khác trong domain này — trang chỉ còn lắng nghe
// 'learn:done' rồi reload 2 lưới know/rel (xem pages/admin/[table].astro).
//
// Ported from astro-micro's src/webs/llm/svc-learn.js (Event Bus Global port) — logic unchanged.
//
// Đọc `products` qua crud.js (auth, xem tool/server.js); ghi `know`/`rel` chỉ qua service/know-sync.js + service/rel-sync.js.
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
import { txtLingo, toastEmit, parseCsvRows } from '@/services/tools/util.js'
import { syncKnowFromRecord } from './service/know-sync.js'
import { autoLinkKnowByTags } from './service/rel-sync.js'
import { serverOf } from './tool/server.js'
import { fnApi } from './service/fn-api.js'
import { displayTitle } from './tool/divisions.js'
import styles from './css/svc-learn.css?inline'

const productSvc = createService('products', '', serverOf('products'))

const TXT_STD = {
    vi: {
        legend: 'Nạp dữ liệu', hint: 'Đưa sản phẩm vào kho tri thức để trợ lý tư vấn đúng hàng đang bán.',
        syncTitle: 'Đồng bộ sản phẩm', syncDesc: 'Nạp lại toàn bộ sản phẩm của cửa hàng, tự liên kết các mục cùng tag. Bấm nhiều lần vẫn an toàn.',
        syncBtn: 'Nạp sản phẩm', csvTitle: 'Nhập từ file CSV', csvBtn: 'Chọn file CSV',
        csvDesc: 'Cột theo thứ tự: title · description · content · tags · pricing · promo · quantity (dòng tiêu đề tự bỏ qua).',
        typeLabel: 'Loại dữ liệu', typePlaceholder: 'Bỏ trống = product',
        sectorLabel: 'Ngành dùng dữ liệu này', allSectors: 'Mọi ngành', fnLabel: 'Phòng dùng dữ liệu này', allFns: 'Mọi phòng',
        syncOk: 'Đã nạp {ok} sản phẩm vào kho tri thức, sinh {linked} quan hệ liên quan',
        syncErr: 'Nạp sản phẩm thất bại',
        csvOk: 'Đã nhập {ok} dòng từ CSV (type="{type}"), sinh {linked} quan hệ liên quan',
        csvErr: 'Nhập CSV thất bại',
    },
    en: {
        legend: 'Data ingestion', hint: 'Load products into the knowledge base so the assistant recommends what is actually on sale.',
        syncTitle: 'Sync products', syncDesc: 'Re-import every shop product and auto-link items that share tags. Safe to run repeatedly.',
        syncBtn: 'Sync products', csvTitle: 'Import a CSV file', csvBtn: 'Choose CSV file',
        csvDesc: 'Columns in order: title · description · content · tags · pricing · promo · quantity (a header row is skipped).',
        typeLabel: 'Data type', typePlaceholder: 'Blank = product',
        sectorLabel: 'Sector that uses this data', allSectors: 'Every sector', fnLabel: 'Department that uses this data', allFns: 'Every department',
        syncOk: 'Synced {ok} products into the knowledge base, generated {linked} relations',
        syncErr: 'Product sync failed',
        csvOk: 'Imported {ok} CSV rows (type="{type}"), generated {linked} relations',
        csvErr: 'CSV import failed',
    },
}

function _fmt(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

/**
 * <svc-learn>
 * Props: ui/theme/lang. Event: 'learn:done' { ok: Number, linked: Number, type?: String } — phát
 * sau mỗi lần nạp (bulk products HOẶC CSV) thành công, để caller reload lưới know/rel của nó.
 */
export class SvcLearn extends LitElement {
    static styles = unsafeCSS(styles)
    static properties = {
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
        this.ui = ''; this.theme = ''; this.lang = 'vi'; this.txt = null
        this._type = ''
        this._sectors = []
        this._sector = ''
        this._fn = ''
        this._syncLoading = false
        this._csvLoading = false
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

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

    // Case 1 — đồng bộ lại TOÀN BỘ bảng products (D1, worker's /v1/data/products) vào know, rồi
    // auto-link rel theo tag chung — an toàn bấm nhiều lần (upsert theo id, xem
    // know-sync.js/rel-sync.js).
    async _dhSyncProducts() {
        this._syncLoading = true
        try {
            const rows = await productSvc.findAll()
            for (const r of rows) await syncKnowFromRecord(r, 'products')
            const linked = await autoLinkKnowByTags('product')
            this._emitDone({ ok: rows.length, linked })
            toastEmit(_fmt(this._txt.syncOk, { ok: rows.length, linked }), 'success')
        } catch (err) {
            toastEmit(`${this._txt.syncErr}: ${err.message}`, 'error')
        } finally {
            this._syncLoading = false
        }
    }

    _dhPickCsv() { this.shadowRoot.querySelector('input[type="file"]')?.click() }

    // Case 2 — nhập CSV sản phẩm ngoài (không có sẵn trong bảng products) — cột CỐ ĐỊNH thứ tự
    // title|description|content|tags|pricing|promo|quantity (dòng đầu header thì tự bỏ qua). Input
    // `type` áp dụng cho CẢ FILE, đi qua CÙNG syncKnowFromRecord như Case 1.
    async _dhCsvChange(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        this._csvLoading = true
        try {
            const type = this._type.trim() || 'product'
            const csvText = await file.text()
            const rows = parseCsvRows(csvText.replace(/^﻿/, '')).filter(r => r.some(c => c.trim() !== ''))
            const hasHeader = rows.length > 0 && (rows[0][0] || '').trim().toLowerCase() === 'title'
            const dataRows = hasHeader ? rows.slice(1) : rows
            let ok = 0
            for (const cols of dataRows) {
                const [title, description, content, tags, pricing, promo, quantity] = cols
                if (!title?.trim()) continue
                await syncKnowFromRecord({
                    id: crypto.randomUUID(),
                    title: title.trim(), description: (description || '').trim(), content: (content || '').trim(),
                    tags: (tags || '').trim(), pricing: (pricing || '').trim(), promo: (promo || '').trim(),
                    quantity: (quantity || '').trim(), status: 'active',
                }, 'products', { type, sector: this._sector, fn: this._fn })
                ok++
            }
            const linked = await autoLinkKnowByTags(type)
            this._emitDone({ ok, linked, type })
            toastEmit(_fmt(this._txt.csvOk, { ok, type, linked }), 'success')
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
