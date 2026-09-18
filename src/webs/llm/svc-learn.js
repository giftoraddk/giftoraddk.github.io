// src/webs/llm/svc-learn.js
//
// "Nạp dữ liệu" panel cho /admin/knowledge.astro — trước đây toàn bộ logic (đọc products, ghi
// know qua syncKnowFromRecord, auto-link rel qua autoLinkKnowByTags, parse CSV) nằm thẳng trong
// <script> của trang; đóng gói lại thành 1 custom element tự chứa (tự đọc/ghi know/rel, dispatch
// event ra ngoài) đúng tinh thần các svc-* khác trong domain này — trang chỉ còn lắng nghe
// 'learn:done' rồi reload 2 lưới know/rel (xem knowledge.astro).
//
// Style/bố cục mượn của svc-assist.js: fieldset + legend bọc khối (xem styles/svc-learn.css).
// Hàng nút: "Nạp từ sản phẩm" chiếm ~1/4, cụm input(type)+nút CSV chiếm phần còn lại — cùng
// nguyên tắc input co giãn (flex:1) + nút giữ nguyên kích thước như .sas-input-row.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-button.js'
import { createService } from '@/services/crud.js'
import { parseCsvRows, toastEmit, txtLingo } from '@/services/helper.js'
import { syncKnowFromRecord } from './tools/know-sync.js'
import { autoLinkKnowByTags } from './tools/rel-sync.js'
import styles from './styles/svc-learn.css?inline'

const TXT_STD = {
    vi: {
        legend: 'Nạp dữ liệu', syncBtn: 'Nạp sản phẩm', csvBtn: 'Nhập CSV sản phẩm',
        typePlaceholder: 'Loại dữ liệu gắn cho CSV (bỏ trống = product)',
        syncOk: 'Đã nạp {ok} sản phẩm vào kho tri thức, sinh {linked} quan hệ liên quan',
        syncErr: 'Nạp sản phẩm thất bại',
        csvOk: 'Đã nhập {ok} dòng từ CSV (type="{type}"), sinh {linked} quan hệ liên quan',
        csvErr: 'Nhập CSV thất bại',
    },
    en: {
        legend: 'Data ingestion', syncBtn: 'Sync products', csvBtn: 'Import product CSV',
        typePlaceholder: 'Type label for this CSV batch (leave blank = product)',
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
        _syncLoading: { state: true },
        _csvLoading:  { state: true },
    }

    constructor() {
        super()
        this.ui = ''; this.theme = ''; this.lang = 'vi'; this.txt = null
        this._type = ''
        this._syncLoading = false
        this._csvLoading = false
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    _emitDone(detail) {
        this.dispatchEvent(new CustomEvent('learn:done', { detail, bubbles: true, composed: true }))
    }

    _dhTypeInput(e) { this._type = e.detail.value }

    // Case 1 — đồng bộ lại TOÀN BỘ bảng products (Firestore DB_ALL) vào know, rồi auto-link rel
    // theo tag chung — an toàn bấm nhiều lần (upsert theo id, xem know-sync.js/rel-sync.js).
    async _dhSyncProducts() {
        this._syncLoading = true
        try {
            const rows = await createService('products').findAll()
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
                }, 'products', { type })
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
            <fieldset class="svl-panel">
                <legend class="svl-legend">
                    <iconify-icon icon="ri:database-2-line"></iconify-icon>${t.legend}
                </legend>
                <div class="svl-row">
                    <web-button class="svl-sync-btn" theme=${this.theme} type="fill" color="primary" height="34px"
                        ?loading=${this._syncLoading} @clicked=${() => this._dhSyncProducts()}>${t.syncBtn}</web-button>
                    <div class="svl-input-row">
                        <web-text ui=${this.ui} theme=${this.theme} height="34px" placeholder=${t.typePlaceholder}
                            .value=${this._type} @input=${e => this._dhTypeInput(e)}></web-text>
                        <input type="file" accept=".csv" hidden @change=${e => this._dhCsvChange(e)} />
                        <web-button ui="modern" theme=${this.theme} type="fill" color="primary" square rounded="50%" height="34px"
                            ?loading=${this._csvLoading} title=${t.csvBtn} @clicked=${() => this._dhPickCsv()}>
                            <iconify-icon icon="ri:check-line" width="20px"></iconify-icon>
                        </web-button>
                    </div>
                </div>
            </fieldset>
        `
    }
}

if (!customElements.get('svc-learn')) customElements.define('svc-learn', SvcLearn)
