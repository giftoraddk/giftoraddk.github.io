import { LitElement, html, unsafeCSS } from 'lit'
import styles from './css/web-split.css?inline'
import pastelStyles from './css/pastel.css?inline'

export class WebSplit extends LitElement {
  static properties = {
    direction: { type: String }, // 'horizontal' or 'vertical'
    size: { type: Number }, // px or % (if < 1)
    min: { type: Number },
    max: { type: Number },
    theme: { type: String },
    ui: { type: String }, // modern, pastel
    showExpanded: { type: Boolean }
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-split',
        resizer: 'resizer',
        pane: 'pane',
      },
      pastel: {
        wrap: 'pastel web-split',
        resizer: 'resizer',
        pane: 'pane',
      }
    }
  }

  static styles = [unsafeCSS(pastelStyles), unsafeCSS(styles)]

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
