// src/webs/media/svc-media.js
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import styles from './styles/svc-media.css?inline'
import { cssInline, emit } from '@/services/helper.js'

/**
 * SvcMedia
 *
 * Standalone image/video viewer — 1 item renders inline (click zooms into a
 * fullscreen dialog); 2+ items render as a stacked thumbnail (click opens the
 * same dialog as a carousel). Independent from web-gallery (no web-slider,
 * own dialog/carousel) so it can mix image + video slides and accept blobs
 * directly, which web-gallery's URL-only `src` string can't do.
 *
 * Props:
 * - items:   (Array) [{ src, blob, mime, alt }]. `src` — any URL, including a
 *            caller-managed `blob:` URL. `blob` — a raw Blob/File; svc-media
 *            creates+revokes its OWN objectURL for these (never revokes a
 *            caller-supplied `src` — that lifecycle stays with the caller).
 *            An item with neither renders as a pending/loading slide (useful
 *            while a P2P blob transfer is still in flight).
 *            `mime` picks image vs video; falls back to `blob.type`, then to
 *            sniffing the file extension in `src`.
 * - size:    (String) Max width/height of the single/stack thumbnail. Default '220px'.
 * - rounded: (String) Border-radius. Default '0.5rem'.
 * - ui, theme, mainColors, textColor — passthrough, no visual effect yet
 *   (kept for consistency with other apex/media components).
 *
 * Events:
 * - 'clicked' — { index, item } — dispatched when a thumbnail is clicked, right
 *   before the dialog opens (does not preventDefault-able; purely informational).
 */
export class SvcMedia extends LitElement {
    static styles = [unsafeCSS(styles)]

    static properties = {
        items:      { type: Array },
        size:       { type: String },
        rounded:    { type: String },
        ui:         { type: String },
        theme:      { type: String },
        mainColors: { type: String },
        textColor:  { type: String },
        _open:         { state: true },
        _activeIndex:  { state: true },
    }

    constructor() {
        super()
        this.items      = []
        this.size       = '220px'
        this.rounded    = '0.5rem'
        this.ui         = 'modern'
        this.theme      = ''
        this.mainColors = ''
        this.textColor  = ''
        this._open        = false
        this._activeIndex = 0
        this._ownBlobUrls = new Map() // Blob -> objectURL, chỉ chứa URL do CHÍNH component này tạo
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    disconnectedCallback() {
        super.disconnectedCallback()
        this._ownBlobUrls.forEach(url => URL.revokeObjectURL(url))
        this._ownBlobUrls.clear()
    }

    updated(changed) {
        if (changed.has('theme') && this.theme) this.setAttribute('data-theme', this.theme)
        else if (changed.has('theme') && !this.theme) this.removeAttribute('data-theme')

        if (changed.has('_open')) {
            const d = this.shadowRoot?.querySelector('dialog.sm-dialog')
            if (d) { if (this._open && !d.open) d.showModal(); else if (!this._open && d.open) d.close() }
            if (!this._open) this._dfPauseStageVideo()
        }
        if (changed.has('_activeIndex')) this._dfPauseStageVideo()
    }

    // ==========================================
    // DATA FOOTER
    // ==========================================

    // Đổi slide / đóng dialog → dừng video đang chạy ở stage, tránh chạy nền trong lúc ẩn.
    _dfPauseStageVideo() {
        this.shadowRoot?.querySelectorAll('.sm-stage video').forEach(v => v.pause())
    }

    // Blob của caller (item.src, kể cả 'blob:...' họ tự quản) không bao giờ bị revoke ở đây —
    // chỉ objectURL do _comResolved tự tạo từ item.blob mới được track + dọn.
    _dfResolveBlobUrl(blob) {
        if (!this._ownBlobUrls.has(blob)) this._ownBlobUrls.set(blob, URL.createObjectURL(blob))
        return this._ownBlobUrls.get(blob)
    }

    // ==========================================
    // COMPUTED
    // ==========================================

    get _comItems() {
        return (this.items || []).map(item => this._comResolve(item))
    }

    _comResolve(item) {
        const url = item.src || (item.blob ? this._dfResolveBlobUrl(item.blob) : '')
        return { url, kind: this._comKind(item), alt: item.alt || '', pending: !url }
    }

    _comKind(item) {
        const mime = item.mime || item.blob?.type || ''
        if (mime.startsWith('video')) return 'video'
        if (mime.startsWith('image')) return 'image'
        return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(item.src || '') ? 'video' : 'image'
    }

    // ==========================================
    // DATA HEAD
    // ==========================================

    _dhOpen(index) {
        this._activeIndex = index
        emit(this, 'clicked', { index, item: this._comItems[index] })
        this._open = true
    }

    _dhClose() { this._open = false }

    _dhPrev(e) {
        e?.stopPropagation()
        const n = this._comItems.length
        this._activeIndex = (this._activeIndex - 1 + n) % n
    }

    _dhNext(e) {
        e?.stopPropagation()
        const n = this._comItems.length
        this._activeIndex = (this._activeIndex + 1) % n
    }

    _dhKeydown(e) {
        if (e.key === 'ArrowLeft') this._dhPrev()
        else if (e.key === 'ArrowRight') this._dhNext()
    }

    // ==========================================
    // RENDER
    // ==========================================

    get _comBoxStyle() {
        return cssInline({ '--sm-size': this.size || '220px', '--sm-rounded': this.rounded || '0.5rem' })
    }

    render() {
        const items = this._comItems
        if (!items.length) return nothing
        return html`
            <div style="${this._comBoxStyle}">
                ${items.length === 1 ? this._rbSingle(items[0]) : this._rbStack(items)}
                ${this._rbDialog(items)}
            </div>
        `
    }

    // [1] _rbSingle — 1 item, click mở dialog cùng cơ chế với stack (zoom fullscreen)
    _rbSingle(item) {
        if (item.pending) return this._rbLoading()
        return html`
            <div class="sm-single" @click=${() => this._dhOpen(0)}>
                ${this._rfThumb(item)}
            </div>
        `
    }

    // [2] _rbStack — 2+ item, tối đa 3 tấm chồng, "+N" nếu nhiều hơn
    _rbStack(items) {
        if (items.every(i => i.pending)) return this._rbLoading()
        const shown = items.slice(0, 3)
        const extra = items.length - shown.length
        return html`
            <div class="sm-stack" @click=${() => this._dhOpen(0)}>
                ${shown.map(item => html`
                    <div class="sm-stack-item">${item.pending ? nothing : this._rfThumb(item)}</div>
                `)}
                ${extra > 0 ? html`<div class="sm-stack-more">+${extra}</div>` : nothing}
            </div>
        `
    }

    _rbLoading() {
        return html`<div class="sm-loading">Đang tải tệp đính kèm…</div>`
    }

    // [3a] _rfThumb — bản thu nhỏ (single/stack): video câm + badge play, không controls
    _rfThumb(item) {
        return item.kind === 'video'
            ? html`
                <video src=${item.url} muted playsinline preload="metadata"></video>
                <div class="sm-play-badge">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>`
            : html`<img src=${item.url} alt=${item.alt} />`
    }

    // [3b] _rfStage — bản fullscreen trong dialog: video có controls + tiếng, xem/nghe được
    _rfStage(item) {
        return item.kind === 'video'
            ? html`<video src=${item.url} controls playsinline></video>`
            : html`<img src=${item.url} alt=${item.alt} />`
    }

    // [4] _rbDialog — fullscreen viewer, dùng chung cho single lẫn stack
    _rbDialog(items) {
        const item = items[this._activeIndex] || items[0]
        return html`
            <dialog class="sm-dialog"
                @cancel=${e => { e.preventDefault(); this._dhClose() }}
                @click=${e => { if (e.target === e.currentTarget) this._dhClose() }}
                @keydown=${this._dhKeydown}
            >
                <div class="sm-dialog-inner">
                    <button class="sm-close" @click=${this._dhClose} aria-label="Đóng">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                    ${items.length > 1 ? html`
                        <button class="sm-prev" @click=${this._dhPrev} aria-label="Trước">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 6l-6 6 6 6"/></svg>
                        </button>
                        <button class="sm-next" @click=${this._dhNext} aria-label="Sau">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>
                        </button>
                    ` : nothing}
                    <div class="sm-stage">
                        ${item?.pending ? this._rbLoading() : (item ? this._rfStage(item) : nothing)}
                    </div>
                    ${items.length > 1 ? html`
                        <div class="sm-dots">
                            ${items.map((_, i) => html`
                                <button class="sm-dot ${i === this._activeIndex ? 'active' : ''}"
                                    @click=${e => { e.stopPropagation(); this._activeIndex = i }}
                                    aria-label=${`Ảnh ${i + 1}`}
                                ></button>
                            `)}
                        </div>
                    ` : nothing}
                </div>
            </dialog>
        `
    }
}

if (!customElements.get('svc-media')) {
    customElements.define('svc-media', SvcMedia)
}
