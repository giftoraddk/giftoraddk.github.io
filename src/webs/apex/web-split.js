import { LitElement, html, css } from 'lit'

export class WebSplit extends LitElement {
  static properties = {
    direction: { type: String }, // 'horizontal' or 'vertical'
    size: { type: Number }, // px or % (if < 1)
    min: { type: Number },
    max: { type: Number },
    theme: { type: String },
    ui: { type: String }, // modern, spatial
    showExpanded: { type: Boolean }
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-split',
        resizer: 'resizer',
        pane: 'pane',
      },
      spatial: {
        wrap: 'spatial web-split',
        resizer: 'resizer glass-resizer',
        pane: 'pane glass-pane',
      }
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      --core-blur: var(--haze-blur, 12px);
      --core-glass: var(--haze-glass, 20%);
    }

    .web-split {
      display: flex;
      width: 100%;
      height: 100%;
      background-color: transparent;
    }

    .web-split.spatial {
      gap: 4px;
    }

    .web-split.horizontal {
      flex-direction: row;
    }

    .web-split.vertical {
      flex-direction: column;
    }

    .pane {
      overflow: auto;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .pane.glass-pane {
      background: color-mix(in oklab, var(--color-base-300, #393939) var(--core-glass), transparent);
      backdrop-filter: blur(var(--core-blur));
      border: 1px solid #ffffff4d;
      border-radius: 12px;
    }

    .pane-primary {
      flex: 0 1 auto;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .pane-secondary {
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .resizer {
      flex: 0 0 auto;
      background-color: var(--color-base-200, #232323);
      transition: background-color 0.2s, width 0.2s, height 0.2s;
      position: relative;
      z-index: 10;
    }

    .resizer.glass-resizer {
      background-color: color-mix(in oklab, var(--color-base-300, #393939) var(--core-glass), transparent);
      backdrop-filter: blur(var(--core-blur));
      border: 1px solid #ffffff4d;
      border-radius: 4px;
    }

    .resizer:hover {
      background-color: var(--color-primary, #2ebd85);
    }

    .horizontal > .resizer {
      width: 4px;
      cursor: col-resize;
      background-clip: padding-box;
    }

    .spatial.horizontal > .resizer {
      width: 6px;
    }

    .vertical > .resizer {
      height: 4px;
      cursor: row-resize;
      background-clip: padding-box;
    }

    .spatial.vertical > .resizer {
      height: 6px;
    }

    .resizer .toggle-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 24px;
      height: 24px;
      padding: 0;
      border-radius: 50%;
      background-color: var(--color-base-100, #0d0d0d);
      border: 1px solid var(--color-base-300, #333);
      color: var(--color-base-content, #fff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
      opacity: 0;
      transition: opacity 0.2s, background-color 0.2s, transform 0.2s;
      pointer-events: auto;
    }

    .resizer:hover .toggle-btn {
      opacity: 1;
    }

    .toggle-btn:hover {
      background-color: var(--color-primary, #2ebd85);
      color: #fff;
      transform: translate(-50%, -50%) scale(1.1);
    }

    .horizontal > .resizer .toggle-btn {
      margin-left: 0;
    }

    .vertical > .resizer .toggle-btn {
      transform: translate(-50%, -50%) rotate(90deg);
    }

    .vertical > .resizer .toggle-btn:hover {
      transform: translate(-50%, -50%) rotate(90deg) scale(1.1);
    }

    .toggle-btn svg {
      width: 14px;
      height: 14px;
    }

    :host(.resizing) .pane {
      pointer-events: none;
      user-select: none;
      transition: none !important;
      will-change: width, height;
    }

    :host(.resizing) .resizer {
      transition: none !important;
    }


  `

  constructor() {
    super()
    this.direction = 'horizontal'
    this.size = 0.5 // Default 50%
    this.min = 50
    this.max = Infinity
    this.theme = ''
    this.ui = 'modern'
    this._isResizing = false
    this._isExpanded = false
    this._prevSize = this.size
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme) {
      this.setAttribute('data-theme', this.theme)
    } else if (changedProperties.has('theme') && !this.theme) {
      this.removeAttribute('data-theme')
    }

    if (changedProperties.has('size') || changedProperties.has('direction') || changedProperties.has('_isExpanded')) {
      this._updateSize()
    }
  }

  _updateSize() {
    const pane = this.shadowRoot.querySelector('.pane-primary')
    if (!pane) return

    const unit = this.size <= 1 ? '%' : 'px'
    const val = this.size <= 1 ? this.size * 100 : this.size

    if (this.direction === 'horizontal') {
      pane.style.width = `${val}${unit}`
      pane.style.height = ''
    } else {
      pane.style.height = `${val}${unit}`
      pane.style.width = ''
    }
  }

  _onMouseDown(e) {
    e.preventDefault()
    this._isResizing = true
    window.addEventListener('mousemove', this._boundOnMouseMove || (this._boundOnMouseMove = this._onMouseMove.bind(this)))
    window.addEventListener('mouseup', this._boundOnMouseUp || (this._boundOnMouseUp = this._onMouseUp.bind(this)))
    this.classList.add('resizing')
  }

  _onMouseMove(e) {
    if (!this._isResizing) return

    const rect = this.getBoundingClientRect()
    let newSize

    if (this.direction === 'horizontal') {
      newSize = e.clientX - rect.left
    } else {
      newSize = e.clientY - rect.top
    }

    // Constraints
    if (newSize < this.min) newSize = this.min
    const maxLimit = (this.direction === 'horizontal' ? rect.width : rect.height)
    if (newSize > maxLimit - 20) newSize = maxLimit - 20 // Ensure secondary pane has some space

    this.size = newSize
    this._isExpanded = false
    this._updateSize()

    this.dispatchEvent(new CustomEvent('resize', {
      detail: { size: this.size },
      bubbles: true,
      composed: true
    }))
  }

  _onMouseUp() {
    this._isResizing = false
    window.removeEventListener('mousemove', this._boundOnMouseMove)
    window.removeEventListener('mouseup', this._boundOnMouseUp)
    this.classList.remove('resizing')
  }

  _toggleExpand(e) {
    e.stopPropagation()
    if (this._isExpanded) {
      this.size = this._prevSize
      this._isExpanded = false
    } else {
      this._prevSize = this.size
      this.size = 1 // Expand to 100%
      this._isExpanded = true
    }
    this._updateSize()

    this.dispatchEvent(new CustomEvent('resize', {
      detail: { size: this.size, _isExpanded: this._isExpanded },
      bubbles: true,
      composed: true
    }))
  }

  render() {
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
    return html`
      <div class="${uiConfig.wrap} ${this.direction}">
        <div class="${uiConfig.pane} pane-primary">
          <slot name="primary"></slot>
        </div>
        <div class="${uiConfig.resizer}" @mousedown=${this._onMouseDown}>
          ${this.showExpanded ? html`
            <button class="toggle-btn" @mousedown=${(e) => e.stopPropagation()} @click=${this._toggleExpand}>
              ${this._isExpanded ? html`
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="11 17 6 12 11 7"></polyline>
                  <polyline points="18 17 13 12 18 7"></polyline>
                </svg>
            ` : html`
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            `}
          </button>
          ` : ''}
        </div>
        <div class="${uiConfig.pane} pane-secondary">
          <slot name="secondary"></slot>
        </div>
      </div>
    `
  }
}

if (!customElements.get('web-split')) {
  customElements.define('web-split', WebSplit)
}

export default WebSplit
