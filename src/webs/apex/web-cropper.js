import { LitElement, html, unsafeCSS } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import css from './styles/web-cropper.css?inline'

const RATIOS = [
  { key: 'free',     label: 'Free',     ar: 0     },
  { key: 'original', label: 'Original', ar: -1    },
  { key: '1:1',      label: 'Square',   ar: 1     },
  { key: '9:16',     label: '9:16',     ar: 9/16  },
  { key: '16:9',     label: '16:9',     ar: 16/9  },
  { key: '4:5',      label: '4:5',      ar: 4/5   },
  { key: '5:4',      label: '5:4',      ar: 5/4   },
  { key: '3:4',      label: '3:4',      ar: 3/4   },
  { key: '4:3',      label: '4:3',      ar: 4/3   },
]

const ICONS = {
  free:     `<rect x="3" y="5" width="18" height="14" rx="1.5" stroke-dasharray="3 2"/>`,
  original: `<rect x="3" y="5" width="18" height="14" rx="1.5"/><line x1="12" y1="5" x2="12" y2="19" stroke-width="1" opacity=".4"/><line x1="3" y1="12" x2="21" y2="12" stroke-width="1" opacity=".4"/>`,
  '1:1':    `<rect x="4" y="4" width="16" height="16" rx="1.5"/>`,
  '9:16':   `<rect x="8" y="2" width="8" height="20" rx="1.5"/>`,
  '16:9':   `<rect x="2" y="8" width="20" height="8" rx="1.5"/>`,
  '4:5':    `<rect x="6" y="2" width="12" height="20" rx="1.5"/>`,
  '5:4':    `<rect x="2" y="6" width="20" height="12" rx="1.5"/>`,
  '3:4':    `<rect x="6.5" y="2" width="11" height="20" rx="1.5"/>`,
  '4:3':    `<rect x="2" y="6.5" width="20" height="11" rx="1.5"/>`,
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export class WebCropper extends LitElement {
  static styles = [unsafeCSS(css)]

  static properties = {
    src:     { type: String },
    _crop:   { state: true },
    _ratio:  { state: true },
    _nat:    { state: true },
    _loaded: { state: true },
  }

  constructor() {
    super()
    this.src     = ''
    this._ratio  = 'free'
    this._crop   = { x: 0, y: 0, w: 0, h: 0 }
    this._nat    = { w: 0, h: 0 }
    this._loaded = false
    this._drag   = null
  }

  updated(changed) {
    if (changed.has('src') && this.src) {
      this._loaded = false
    }
  }

  _onLoad(e) {
    const img = e.target
    this._nat    = { w: img.naturalWidth, h: img.naturalHeight }
    this._loaded = true
    this._initCrop()
  }

  _initCrop() {
    const canvas = this.shadowRoot?.querySelector('.canvas')
    if (!canvas) return
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    const pad = 0.1
    this._crop = {
      x: Math.round(cw * pad),
      y: Math.round(ch * pad),
      w: Math.round(cw * (1 - pad * 2)),
      h: Math.round(ch * (1 - pad * 2)),
    }
    this._emitChange()
  }

  _clampCrop({ x, y, w, h }, cw, ch) {
    const min = 20
    w = Math.max(min, w)
    h = Math.max(min, h)
    x = Math.max(0, Math.min(x, cw - min))
    y = Math.max(0, Math.min(y, ch - min))
    if (x + w > cw) w = cw - x
    if (y + h > ch) h = ch - y
    w = Math.max(min, w)
    h = Math.max(min, h)
    return { x, y, w, h }
  }

  _resolveAr() {
    const r = RATIOS.find(r => r.key === this._ratio)
    if (!r || r.ar === 0) return 0
    if (r.ar === -1) {
      const ar = this._nat.w / this._nat.h
      return isFinite(ar) && ar > 0 ? ar : 0
    }
    return r.ar
  }

  _applyArToHandle(raw, handle, prevCrop, cw, ch) {
    const ar = this._resolveAr()
    if (!ar) return this._clampCrop(raw, cw, ch)

    let { x, y, w, h } = raw

    const isV = ['n', 's'].includes(handle)
    const isH = ['e', 'w'].includes(handle)

    if (isV) {
      // top/bottom edge: height drives width, center x
      w = Math.round(h * ar)
      x = Math.round(prevCrop.x + (prevCrop.w - w) / 2)
    } else if (isH) {
      // left/right edge: width drives height, center y
      h = Math.round(w / ar)
      y = Math.round(prevCrop.y + (prevCrop.h - h) / 2)
    } else {
      // corner: use the dominant axis
      const wByH = Math.round(h * ar)
      const hByW = Math.round(w / ar)
      if (Math.abs(w - prevCrop.w) >= Math.abs(h - prevCrop.h)) {
        h = hByW
        if (handle === 'nw' || handle === 'ne') y = prevCrop.y + prevCrop.h - h
      } else {
        w = wByH
        if (handle === 'nw' || handle === 'sw') x = prevCrop.x + prevCrop.w - w
      }
    }

    return this._clampCrop({ x, y, w, h }, cw, ch)
  }

  _startDrag(e, type, handle = null) {
    e.preventDefault()
    const t = e.touches?.[0] ?? e
    const rect = this.shadowRoot.querySelector('.canvas').getBoundingClientRect()
    this._drag = {
      type,
      handle,
      startX:    t.clientX,
      startY:    t.clientY,
      startCrop: { ...this._crop },
      cw:        rect.width,
      ch:        rect.height,
    }
    const onMove = ev => this._onMove(ev)
    const onUp   = () => {
      this._drag = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onUp)
  }

  _onMove(e) {
    e.preventDefault()
    if (!this._drag) return
    const t  = e.touches?.[0] ?? e
    const { type, handle, startX, startY, startCrop, cw, ch } = this._drag
    const dx = t.clientX - startX
    const dy = t.clientY - startY

    if (type === 'move') {
      this._crop = this._clampCrop({
        x: startCrop.x + dx,
        y: startCrop.y + dy,
        w: startCrop.w,
        h: startCrop.h,
      }, cw, ch)
      this._emitChange()
      return
    }

    let { x, y, w, h } = { ...startCrop }
    switch (handle) {
      case 'nw': x += dx; w -= dx; y += dy; h -= dy; break
      case 'n':             y += dy; h -= dy; break
      case 'ne': w += dx;  y += dy; h -= dy; break
      case 'e':  w += dx;                    break
      case 'se': w += dx;           h += dy; break
      case 's':             h += dy;          break
      case 'sw': x += dx; w -= dx;  h += dy; break
      case 'w':  x += dx; w -= dx;           break
    }

    this._crop = this._applyArToHandle({ x, y, w, h }, handle, startCrop, cw, ch)
    this._emitChange()
  }

  _setRatio(key) {
    this._ratio = key
    if (key === 'free') { this._emitChange(); return }
    const canvas = this.shadowRoot?.querySelector('.canvas')
    if (!canvas) return
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight

    const r = RATIOS.find(r => r.key === key)
    const ar = r.ar === -1 ? this._nat.w / this._nat.h : r.ar
    if (!isFinite(ar) || ar <= 0) return

    let w, h
    if (cw / ch > ar) {
      h = Math.round(ch * 0.8)
      w = Math.round(h * ar)
    } else {
      w = Math.round(cw * 0.8)
      h = Math.round(w / ar)
    }
    this._crop = this._clampCrop({
      x: Math.round((cw - w) / 2),
      y: Math.round((ch - h) / 2),
      w, h,
    }, cw, ch)
    this._emitChange()
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('crop-change', {
      detail: this.getCropData(), bubbles: true, composed: true,
    }))
  }

  /** Returns crop in natural image pixel coordinates */
  getCropData() {
    const canvas = this.shadowRoot?.querySelector('.canvas')
    if (!canvas || !this._nat.w || !this._loaded) return null
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (!cw || !ch) return null
    const sx = this._nat.w / cw
    const sy = this._nat.h / ch
    return {
      x:      Math.round(this._crop.x * sx),
      y:      Math.round(this._crop.y * sy),
      width:  Math.round(this._crop.w * sx),
      height: Math.round(this._crop.h * sy),
      ratio:  this._ratio,
    }
  }

  /** Returns an offscreen <canvas> with the cropped image */
  getCroppedCanvas() {
    const img  = this.shadowRoot?.querySelector('.img')
    const data = this.getCropData()
    if (!img || !data) return null
    const out = document.createElement('canvas')
    out.width  = data.width
    out.height = data.height
    out.getContext('2d').drawImage(img, data.x, data.y, data.width, data.height, 0, 0, data.width, data.height)
    return out
  }

  render() {
    const { x, y, w, h } = this._crop
    const icon = key => unsafeHTML(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${ICONS[key]}</svg>`
    )

    return html`
      <div class="wrap">
        <div class="canvas">
          ${this.src ? html`
            <img class="img" src=${this.src} alt="" crossorigin="anonymous" @load=${this._onLoad} />
          ` : ''}

          ${this._loaded ? html`
            <!-- 4 darkened overlays -->
            <div class="ov" style="top:0;left:0;right:0;height:${y}px"></div>
            <div class="ov" style="top:${y + h}px;left:0;right:0;bottom:0"></div>
            <div class="ov" style="top:${y}px;left:0;width:${x}px;height:${h}px"></div>
            <div class="ov" style="top:${y}px;left:${x + w}px;right:0;height:${h}px"></div>

            <!-- Crop box -->
            <div
              class="box"
              style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"
              @mousedown=${e => this._startDrag(e, 'move')}
              @touchstart=${e => this._startDrag(e, 'move')}
            >
              <div class="box-border"></div>

              <!-- Rule-of-thirds grid -->
              <div class="gl h" style="top:${Math.round(h / 3)}px"></div>
              <div class="gl h" style="top:${Math.round(h * 2 / 3)}px"></div>
              <div class="gl v" style="left:${Math.round(w / 3)}px"></div>
              <div class="gl v" style="left:${Math.round(w * 2 / 3)}px"></div>

              <!-- Resize handles -->
              ${HANDLES.map(hl => html`
                <div
                  class="hl ${hl}"
                  @mousedown=${e => { e.stopPropagation(); this._startDrag(e, 'resize', hl) }}
                  @touchstart=${e => { e.stopPropagation(); this._startDrag(e, 'resize', hl) }}
                ></div>
              `)}
            </div>
          ` : ''}
        </div>

        <!-- Aspect ratio bar -->
        <div class="bar">
          ${RATIOS.map(r => html`
            <button
              class="rbtn ${this._ratio === r.key ? 'active' : ''}"
              @click=${() => this._setRatio(r.key)}
            >
              ${icon(r.key)}
              ${r.label}
            </button>
          `)}
        </div>
      </div>
    `
  }
}

if (!customElements.get('web-cropper')) customElements.define('web-cropper', WebCropper)
export default WebCropper
