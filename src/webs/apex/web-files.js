import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-files.css?inline'

const TXT_STD = {
  vi: { dropLabel: 'Click hoặc kéo thả để tải lên' },
  en: { dropLabel: 'Click or drag files to upload' },
}

export class WebFiles extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(styles)]

  static properties = {
    multiple:     { type: Boolean },
    accept:       { type: String },
    files:        { type: Array, state: true },
    theme:        { type: String },
    ui:           { type: String },
    txt:   { type: Object },
    lang:  { type: String },
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-files',
        drop: 'drop-zone',
        item: 'file-item',
      },
      spatial: {
        wrap: 'spatial web-files',
        drop: 'drop-zone glass',
        item: 'file-item glass',
      }
    }
  }

  constructor() {
    super()
    this.multiple     = false
    this.accept       = '*'
    this.files        = []
    this.theme        = ''
    this.ui           = 'modern'
    this.txt   = null
    this.lang  = 'vi'
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme)  this.setAttribute('data-theme', this.theme)
    if (changedProperties.has('theme') && !this.theme) this.removeAttribute('data-theme')
  }

  _handleClick() {
    this.shadowRoot.querySelector('input[type="file"]').click()
  }

  _handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files)
    if (this.multiple) {
      this.files = [...this.files, ...selectedFiles]
    } else {
      this.files = selectedFiles
    }
    this._dispatchEvent()
  }

  _removeFile(index) {
    this.files = this.files.filter((_, i) => i !== index)
    this._dispatchEvent()
  }

  _dispatchEvent() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { files: this.files },
      bubbles: true,
      composed: true
    }))
  }

  _formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

  render() {
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
    return html`
      <div class="${uiConfig.wrap}">
        <input type="file" style="display: none" .multiple=${this.multiple} .accept=${this.accept} @change=${this._handleFileChange}>
        
        <div class="${uiConfig.drop}" @click=${this._handleClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <div class="label">${this._txt.dropLabel}</div>
        </div>

        <div class="file-list">
          ${this.files.map((file, index) => html`
            <div class="${uiConfig.item}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${this._formatSize(file.size)}</div>
              </div>
              <div class="remove-btn" @click=${() => this._removeFile(index)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>
          `)}
        </div>
      </div>
    `
  }
}

if (!customElements.get('web-files')) {
  customElements.define('web-files', WebFiles)
}

export default WebFiles
