// src/packages/adopted/svc-photor.js
//
// <svc-photor> — text-input + file-picker widget for uploading images: click upload → native
// file picker → crop modal (delegates to <web-cropper>) → uploads the cropped blob via
// uploadImageBlob → stores the resulting URL string in `value` (pipe-joined when `multiple`).
// Also renders a preview modal and clear button. Paste (Ctrl/⌘+V) an image FILE into the field (screenshot, image copied
// from a file manager / browser) → same crop modal → upload; pasting text (a URL) still goes into the input as usual.
//
// Ported from astro-micro's src/webs/media/svc-photor.js (Event Bus Global port, media domain →
// src/packages/adopted/ tier). Logic unchanged. Adaptations:
//   - '../apex/web-cropper.js' → '@/packages/apex/web-cropper.js' (already ported, self-contained
//     — only imports `lit` + its own CSS; confirmed by reading it before this port).
//   - '@/packages/adopted/tools/photor.js' → './service/photor.js' (sibling file ported in this same task,
//     verbatim copy of uploadImageBlob/uploadImageFromUrl — pure imgbb.com upload helper, no
//     further app-specific dependencies).
//   - './styles/svc-photor.css?inline' → './css/svc-photor.css?inline' (verbatim CSS copy).
//   - Added the standard svc-* baseline properties from CLAUDE.md (theme, mainColors, bg,
//     textColor, actived, service, _data, _actived) that the source component didn't declare —
//     none of them are read in render()/logic below, they're present only for baseline
//     conformance/forward-compat with how other svc-* components are driven by callers.
import { LitElement, html, unsafeCSS } from 'lit'
import css from './css/svc-photor.css?inline'
import '@/packages/apex/web-cropper.js'
import { uploadImageBlob } from './service/photor.js'
import pastelStyles from '@/packages/apex/css/pastel.css?inline'
import { txtLingo } from '@/services/tools/lingo.js'

const TXT_STD = {
  vi: { ph: 'Upload hoặc dán ảnh (Ctrl+V) để lấy URL...', delete: 'Xóa', pick: 'Chọn ảnh để upload', cropTitle: 'Chỉnh ảnh trước khi upload', cancel: 'Hủy', submit: 'Upload' },
  en: { ph: 'Upload or paste an image (Ctrl+V) to get URL...', delete: 'Delete', pick: 'Pick image to upload', cropTitle: 'Edit image before uploading', cancel: 'Cancel', submit: 'Upload' }
}

export class SvcPhotor extends LitElement {
  static styles = [unsafeCSS(pastelStyles), unsafeCSS(css)]

  static properties = {
    // ── standard svc-* baseline (CLAUDE.md) — not read by this component's own logic, kept for
    // conformance with how callers/conductor drive other svc-* components ──
    ui:           { type: String },
    theme:        { type: String },
    mainColors:   { type: String },
    bg:           { type: Object },
    textColor:    { type: String },
    actived:      {},
    service:      { type: String },
    _data:        { state: true },
    _actived:     { state: true },

    // ── component's own properties (verbatim from astro-micro) ──
    value:        { type: String, reflect: true },
    placeholder:  { type: String },
    multiple:     { type: Boolean },
    limit:        { type: Number }, // max images when multiple=true — 0 = unlimited
    persistent:   { type: Boolean }, // true (mặc định) → click ra ngoài modal crop/preview không đóng, chỉ nháy hiệu ứng — giống web-dialog.js
    disabled:     { type: Boolean },
    hideUpload:   { type: Boolean }, // true → ẩn nút chọn ảnh (upload-btn), chỉ còn text-input/
                      // clear/preview — dùng khi nơi gọi muốn khoá không cho thêm/đổi ảnh mới
                      // (vd svc-resources.js truyền xuống theo ngữ cảnh riêng của nó).
    height:       { type: String },
    mime:         { type: String },
    saveLocal:    {}, // (blob: Blob) => Promise<string> — khi truyền vào, dùng thay cho upload
                      // imgbb: nhận Blob đã crop, trả về chuỗi lưu vào `value` (vd `blob:<id>`
                      // theo channeldb.js putBlob() của caller) — cho phép domain gọi tự chọn nơi
                      // lưu blob, component này KHÔNG tự import bất kỳ module domain nào (giữ
                      // apex/web-* domain-agnostic). `value` khi đó là 1 chuỗi tham
                      // chiếu nội bộ (không phải URL ảnh xem được trực tiếp), nên nút xem trước
                      // (preview-btn) tự ẩn khi saveLocal bật — component không biết cách resolve
                      // chuỗi đó thành ảnh, caller tự hiện ảnh ở nơi khác (vd danh sách room).
    _pendingSrc:  { state: true },
    _uploading:   { state: true },
    _error:       { state: true },
    _previewOpen: { state: true },
    txt:  { type: Object },
    lang: { type: String },
  }

  constructor() {
    super()
    // ── standard svc-* baseline defaults ──
    this.theme      = ''
    this.mainColors = ''
    this.bg         = null
    this.textColor  = ''
    this.actived    = null
    this.service    = ''
    this._data      = null
    this._actived   = null

    // ── component's own defaults (verbatim from astro-micro) ──
    this.value        = ''
    this.placeholder  = ''
    this.multiple     = false
    this.limit        = 0
    this.persistent   = true
    this.disabled     = false
    this.hideUpload   = false
    this.height       = '36px'
    this.ui           = 'modern'
    this.mime         = 'image/png'
    this.saveLocal    = null
    this._pendingSrc  = null
    this._uploading   = false
    this._error       = ''
    this._previewOpen = false
    this.txt  = null
    this.lang = 'vi'
  }

  // Số ảnh hiện có (multiple mode, ghép bằng '|') — '' → 0.
  get _comCount() {
    return this.value ? this.value.split('|').filter(Boolean).length : 0
  }

  get _comAtLimit() {
    return this.multiple && this.limit > 0 && this._comCount >= this.limit
  }

  // Promote the crop/preview modal to the top layer via the native Popover API — plain
  // position:fixed isn't enough if any ancestor (eg. web-dialog's .web-dialog-content, when
  // this upload field lives inside a <web-setting> form) has transform/filter/backdrop-filter
  // (creates a new containing block for fixed descendants) combined with overflow:hidden
  // (then clips it). Top-layer rendering bypasses both regardless of nesting depth.
  // The modal is conditionally rendered (removed from the DOM on close), so there's no
  // dedicated hide step — Lit removing the node auto-closes any open popover with it.
  updated(changedProperties) {
    if ((changedProperties.has('_pendingSrc') && this._pendingSrc) ||
        (changedProperties.has('_previewOpen') && this._previewOpen)) {
      const backdrop = this.shadowRoot.querySelector('.modal-backdrop')
      if (backdrop?.showPopover && !backdrop.matches(':popover-open')) {
        try { backdrop.showPopover() } catch {}
      }
    }
  }

  // Click ra ngoài modal (crop hoặc preview) khi persistent=true — không đóng, chỉ nháy hiệu
  // ứng phản hồi, cùng kỹ thuật _fxContent() của web-dialog.js.
  _fxModal() {
    const el = this.shadowRoot.querySelector('.modal-card, .preview-modal')
    if (!el) return
    el.classList.remove('is-persistent-fx')
    void el.offsetWidth
    el.classList.add('is-persistent-fx')
    el.addEventListener('animationend', () => el.classList.remove('is-persistent-fx'), { once: true })
  }

  // ── File picker ─────────────────────────────────────────────────────────────

  _openPicker() {
    if (this.disabled || this._uploading || this._comAtLimit) return
    this.shadowRoot.querySelector('input[type="file"]').click()
  }

  _onFileChange(e) {
    const file = e.target.files[0]
    e.target.value = ''
    this._loadFile(file)
  }

  // File ảnh (chọn từ máy hoặc dán) → data URL → mở modal crop; không phải ảnh thì bỏ qua.
  _loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => { this._pendingSrc = ev.target.result }
    reader.readAsDataURL(file)
  }

  // ── Paste ───────────────────────────────────────────────────────────────────

  // Clipboard có file ảnh → chặn dán chữ, đi đúng luồng chọn file (crop → upload). Chỉ có chữ (vd URL ảnh) → để trình duyệt
  // dán vào ô như cũ. Không nhận ảnh khi ô đang khoá / đang upload / đủ số ảnh / ẩn nút upload (nơi gọi không cho thêm ảnh).
  _onPaste(e) {
    if (this.disabled || this._uploading || this._comAtLimit || this.hideUpload) return
    const items = [...(e.clipboardData?.items ?? [])]
    const file = items.find(i => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile()
      ?? [...(e.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    this._error = ''
    this._loadFile(file)
  }

  // ── Crop modal ───────────────────────────────────────────────────────────────

  _cancelCrop() {
    this._pendingSrc = null
  }

  async _applyCrop() {
    const cropper = this.shadowRoot.querySelector('web-cropper')
    if (!cropper) return

    const canvas  = cropper.getCroppedCanvas()
    const mime    = this.mime || 'image/png'
    const qual    = mime === 'image/png' ? undefined : 0.92
    const dataUrl = canvas ? canvas.toDataURL(mime, qual) : this._pendingSrc

    this._pendingSrc = null
    this._uploading  = true
    this._error      = ''

    try {
      const blob = await (await fetch(dataUrl)).blob()
      const value = this.saveLocal ? await this.saveLocal(blob) : await uploadImageBlob(blob)

      this.value = this.multiple && this.value
        ? `${this.value}|${value}`
        : value

      this._emit()
    } catch (err) {
      this._error = err.message
    } finally {
      this._uploading = false
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  _handleInput(e) {
    this.value = e.target.value
    this._emit()
  }

  _clear() {
    this.value  = ''
    this._error = ''
    this._emit()
  }

  _emit() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }))
  }

  get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

  // ── Render ───────────────────────────────────────────────────────────────────

  render() {
    const wrapCls = this.ui === 'pastel'
      ? 'pastel svc-photor'
      : 'svc-photor'

    return html`
      <input type="file" accept="image/*" style="display:none" @change=${this._onFileChange} />

      <div class="${wrapCls} ${this.disabled ? 'disabled' : ''}"
           style="--core-height:${this.height}">

        <input
          class="text-input"
          .value=${this.value}
          placeholder=${this.placeholder || this._txt.ph}
          ?disabled=${this.disabled}
          @input=${this._handleInput}
          @paste=${this._onPaste}
        />

        ${this.value ? html`
          <button class="clear-btn" @click=${this._clear} tabindex="-1" title="${this._txt.delete}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        ` : ''}

        ${this.value && !this.saveLocal ? html`
          <button class="preview-btn" tabindex="-1" @click=${() => { this._previewOpen = true }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        ` : ''}

        ${this.hideUpload ? '' : html`
          <button
            class="upload-btn"
            @click=${this._openPicker}
            ?disabled=${this.disabled || this._uploading || this._comAtLimit}
            title="${this._txt.pick}"
            tabindex="-1"
          >
            ${this._uploading
              ? html`<span class="spinner"></span>`
              : html`
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>`}
          </button>
        `}
      </div>

      ${this._error ? html`<p class="err-msg">${this._error}</p>` : ''}

      ${this._pendingSrc ? html`
        <div class="modal-backdrop" popover="manual"
             @click=${e => e.target === e.currentTarget && (this.persistent ? this._fxModal() : this._cancelCrop())}>
          <div class="modal-card">
            <div class="modal-header">
              <span>${this._txt.cropTitle}</span>
              <button class="modal-close" @click=${this._cancelCrop}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <web-cropper src=${this._pendingSrc}></web-cropper>
            </div>

            <div class="modal-footer">
              <button class="btn btn-cancel" @click=${this._cancelCrop}>${this._txt.cancel}</button>
              <button class="btn btn-upload" @click=${this._applyCrop}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                ${this._txt.submit}
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      ${this._previewOpen ? html`
        <div class="modal-backdrop" popover="manual" @click=${e => e.target === e.currentTarget && (this.persistent ? this._fxModal() : (this._previewOpen = false))}>
          <div class="preview-modal">
            <button class="modal-close preview-modal-close" @click=${() => { this._previewOpen = false }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <img class="preview-modal-img"
                 src="${this.value.split('|').filter(Boolean).at(-1)}"
                 alt="" />
          </div>
        </div>
      ` : ''}
    `
  }
}

if (!customElements.get('svc-photor')) {
  customElements.define('svc-photor', SvcPhotor)
}
export default SvcPhotor
