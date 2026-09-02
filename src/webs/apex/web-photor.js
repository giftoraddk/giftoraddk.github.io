import { LitElement, html, unsafeCSS } from 'lit'
import css from './styles/web-photor.css?inline'
import './web-cropper.js'

const TXT_STD = {
  vi: { add: 'Thêm ảnh', cropTitle: 'Chỉnh ảnh', cancel: 'Hủy', done: 'Xong' },
  en: { add: 'Add Photo', cropTitle: 'Edit Photo', cancel: 'Cancel', done: 'Done' },
}

export class WebPhotor extends LitElement {
  static styles = [unsafeCSS(css)]

  static properties = {
    multiple:     { type: Boolean },
    ui:           { type: String },
    _photos:      { state: true },  // [{ id, url, file, cropData }]
    _pendingSrc:  { state: true },  // data URL of image waiting to be cropped
    _pendingFile: { state: true },
    txt:   { type: Object },
    lang:  { type: String },
  }

  constructor() {
    super()
    this.multiple     = false
    this.ui           = 'modern'
    this._photos      = []
    this._pendingSrc  = null
    this._pendingFile = null
    this.txt   = null
    this.lang  = 'vi'
  }

  // Promote the crop modal to the top layer via the native Popover API — plain
  // position:fixed isn't enough if any ancestor (eg. web-dialog's .web-dialog-content, when
  // this field lives inside a <web-setting> form) has transform/filter/backdrop-filter
  // (creates a new containing block for fixed descendants) combined with overflow:hidden
  // (then clips it). Top-layer rendering bypasses both regardless of nesting depth.
  // The modal is conditionally rendered (removed from the DOM on close), so there's no
  // dedicated hide step — Lit removing the node auto-closes any open popover with it.
  updated(changedProperties) {
    if (changedProperties.has('_pendingSrc') && this._pendingSrc) {
      const backdrop = this.shadowRoot.querySelector('.modal-backdrop')
      if (backdrop?.showPopover && !backdrop.matches(':popover-open')) {
        try { backdrop.showPopover() } catch {}
      }
    }
  }

  // ── File input ──────────────────────────────────────────────────────────────

  _openPicker() {
    this.shadowRoot.querySelector('input[type="file"]').click()
  }

  _onFileChange(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''          // allow re-selecting same file
    if (!files.length) return
    // Process one at a time: open cropper for first, queue the rest if multiple
    this._loadFile(files[0])
    this._queue = this.multiple ? files.slice(1) : []
  }

  _loadFile(file) {
    const reader = new FileReader()
    reader.onload = ev => {
      this._pendingFile = file
      this._pendingSrc  = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  // ── Crop modal ──────────────────────────────────────────────────────────────

  _cancelCrop() {
    this._pendingSrc  = null
    this._pendingFile = null
    this._queue       = []
  }

  _applyCrop() {
    const cropper = this.shadowRoot.querySelector('web-cropper')
    if (!cropper) return

    const canvas = cropper.getCroppedCanvas()
    const url    = canvas
      ? canvas.toDataURL('image/jpeg', 0.92)
      : this._pendingSrc            // fallback: use original if cropper not ready

    const photo = {
      id:       Math.random().toString(36).slice(2, 11),
      url,
      file:     this._pendingFile,
      cropData: cropper.getCropData(),
    }

    this._photos      = this.multiple ? [...this._photos, photo] : [photo]
    this._pendingSrc  = null
    this._pendingFile = null
    this._dispatch()

    // If queued files remain (multiple mode), open next
    if (this._queue?.length) {
      const next = this._queue.shift()
      requestAnimationFrame(() => this._loadFile(next))
    }
  }

  _removePhoto(id) {
    this._photos = this._photos.filter(p => p.id !== id)
    this._dispatch()
  }

  _dispatch() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { photos: this._photos },
      bubbles: true,
      composed: true,
    }))
  }

  /** Returns current photos array: [{ id, url, file, cropData }] */
  getPhotos() {
    return this._photos
  }

  /** Clears all photos */
  clear() {
    this._photos = []
    this._dispatch()
  }

  get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

  // ── Render ──────────────────────────────────────────────────────────────────

  render() {
    const showAdd = this.multiple || this._photos.length === 0

    return html`
      <input type="file" accept="image/*" .multiple=${this.multiple}
        style="display:none" @change=${this._onFileChange} />

      <div class="photo-grid">
        ${this._photos.map(p => html`
          <div class="photo-item">
            <img src=${p.url} alt="" />
            <div class="remove-btn" @click=${() => this._removePhoto(p.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
          </div>
        `)}

        ${showAdd ? html`
          <div class="upload-btn" @click=${this._openPicker}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>${this._txt.add}</span>
          </div>
        ` : ''}
      </div>

      ${this._pendingSrc ? html`
        <div class="modal-backdrop" popover="manual" @click=${e => e.target === e.currentTarget && this._cancelCrop()}>
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
              <button class="btn btn-apply" @click=${this._applyCrop}>${this._txt.done}</button>
            </div>
          </div>
        </div>
      ` : ''}
    `
  }
}

if (!customElements.get('web-photor')) customElements.define('web-photor', WebPhotor)
export default WebPhotor
