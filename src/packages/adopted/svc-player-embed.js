// src/packages/adopted/svc-player-embed.js
//
// Despite the filename, this defines/registers <svc-player-input> — a small UI wrapper: text
// input for a video link (YouTube/Vimeo/TikTok/native mp4), the video-embed counterpart of
// `svc-photor` — same input/clear/preview shell, but no file upload/crop: a link is pasted
// directly, and the preview button opens a live `svc-player` instead of an `<img>`.
//
// Ported from astro-micro's src/webs/media/svc-player-embed.js (Event Bus Global port, media
// domain → src/packages/adopted/ tier). Logic unchanged. Adaptations:
//   - './svc-player.js' side-effect import kept as-is — both files now live flat in
//     src/packages/adopted/, so the relative path still resolves correctly.
//   - './styles/svc-player-embed.css?inline' → './css/svc-player-embed.css?inline' (verbatim CSS
//     copy).
//   - Added the standard svc-* baseline properties from CLAUDE.md (theme, mainColors, bg,
//     textColor, actived, service, _data, _actived) that the source component didn't declare —
//     none of them are read in render()/logic below, they're present only for baseline
//     conformance/forward-compat with how other svc-* components are driven by callers. `value`
//     and `ui` were already declared by the source component.
import { LitElement, html, unsafeCSS } from 'lit'
import css from './css/svc-player-embed.css?inline'
import './svc-player.js'
import { txtLingo } from '@/services/tools/lingo.js'
import { emit } from '@/services/tools/util.js'
import pastelStyles from '@/packages/apex/css/pastel.css?inline'

/**
 * SvcPlayerInput
 *
 * Text input for a video link (YouTube/Vimeo/TikTok/native mp4), the
 * video-embed counterpart of `svc-photor` — same input/clear/preview
 * shell, but no file upload/crop: a link is pasted directly, and the preview
 * button opens a live `svc-player` instead of an `<img>`.
 *
 * Props: value, placeholder, disabled, height, ui, txt, lang
 * Events: 'change' — { value } on every input edit or clear
 */

const TXT_STD = {
  vi: { ph: 'Dán link video (YouTube, Vimeo, TikTok, mp4)...', delete: 'Xóa', preview: 'Xem trước' },
  en: { ph: 'Paste video link (YouTube, Vimeo, TikTok, mp4)...', delete: 'Delete', preview: 'Preview' },
}

export class SvcPlayerInput extends LitElement {
  static styles = [unsafeCSS(pastelStyles), unsafeCSS(css)]

  static properties = {
    // ── standard svc-* baseline (CLAUDE.md) — not read by this component's own logic, kept for
    // conformance with how callers/conductor drive other svc-* components ──
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
    disabled:     { type: Boolean },
    height:       { type: String },
    ui:           { type: String },
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
    this.disabled     = false
    this.height       = '36px'
    this.ui           = 'modern'
    this._previewOpen = false
    this.txt  = null
    this.lang = 'vi'
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  _handleInput(e) {
    this.value = e.target.value
    this._emit()
  }

  _clear() {
    this.value = ''
    this._previewOpen = false
    this._emit()
  }

  _emit() { emit(this, 'change', { value: this.value }) }

  get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

  // ── Render ───────────────────────────────────────────────────────────────────

  render() {
    const wrapCls = this.ui === 'pastel'
      ? 'pastel svc-player-input'
      : 'svc-player-input'

    return html`
      <div class="${wrapCls} ${this.disabled ? 'disabled' : ''}"
           style="--core-height:${this.height}">

        <input
          class="text-input"
          .value=${this.value}
          placeholder=${this.placeholder || this._txt.ph}
          ?disabled=${this.disabled}
          @input=${this._handleInput}
        />

        ${this.value ? html`
          <button class="clear-btn" @click=${this._clear} tabindex="-1" title="${this._txt.delete}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <button class="preview-btn" tabindex="-1" title="${this._txt.preview}" @click=${() => { this._previewOpen = true }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        ` : ''}
      </div>

      ${this._previewOpen ? html`
        <div class="modal-backdrop"
             @click=${e => e.target === e.currentTarget && (this._previewOpen = false)}>
          <div class="preview-modal">
            <button class="modal-close preview-modal-close" @click=${() => { this._previewOpen = false }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <svc-player class="preview-modal-player" .src=${this.value} .control=${true}></svc-player>
          </div>
        </div>
      ` : ''}
    `
  }
}

if (!customElements.get('svc-player-input')) {
  customElements.define('svc-player-input', SvcPlayerInput)
}
export default SvcPlayerInput
