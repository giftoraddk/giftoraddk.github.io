import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-select.css?inline'

const TXT_STD = {
  vi: { ph: 'Chọn...', searchPh: 'Tìm kiếm...', noResults: 'Không có kết quả' },
  en: { ph: 'Select...', searchPh: 'Search...', noResults: 'No results found' },
}

export class WebSelect extends LitElement {
  static shadowRootOptions = { mode: 'open' }
  static styles = [unsafeCSS(styles)]

  static properties = {
    options:      { type: Array },
    value:        { type: Object },
    multiple:     { type: Boolean },
    searchable:   { type: Boolean },
    placeholder:  { type: String },
    disabled:     { type: Boolean },
    theme:        { type: String },
    ui:           { type: String },
    isOpen:       { type: Boolean, state: true },
    searchQuery:  { type: String, state: true },
    height:       { type: String },
    placement:    { type: String },
    placementGap: { type: Number },
    txt:   { type: Object },
    lang:  { type: String },
  }

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-select',
        trigger: 'select-trigger',
        dropdown: 'dropdown-menu',
      },
      spatial: {
        wrap: 'spatial web-select',
        trigger: 'spatial select-trigger',
        dropdown: 'spatial dropdown-menu',
      }
    }
  }

  constructor() {
    super()
    this.options = []
    this.value = null
    this.multiple = false
    this.searchable = true
    this.placeholder  = ''
    this.disabled     = false
    this.theme        = ''
    this.ui           = 'modern'
    this.isOpen       = false
    this.searchQuery  = ''
    this.height       = '36px'
    this.placement    = 'bottom-start'
    this.placementGap = 4
    this.txt   = null
    this.lang  = 'vi'
    this._hideTimer = null
    this._handleOutsideClick = this._handleOutsideClick.bind(this)
    this._updateDropdownPosition = this._updateDropdownPosition.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('mousedown', this._handleOutsideClick, { capture: true })
    window.addEventListener('scroll', this._updateDropdownPosition, true)
    window.addEventListener('resize', this._updateDropdownPosition)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    clearTimeout(this._hideTimer)
    window.removeEventListener('mousedown', this._handleOutsideClick, { capture: true })
    window.removeEventListener('scroll', this._updateDropdownPosition, true)
    window.removeEventListener('resize', this._updateDropdownPosition)
  }

  updated(changedProperties) {
    if (changedProperties.has('theme') && this.theme)  this.setAttribute('data-theme', this.theme)
    if (changedProperties.has('theme') && !this.theme) this.removeAttribute('data-theme')
  }

  _handleOutsideClick(e) {
    if (!this.isOpen) return
    const isInside = e.composedPath().includes(this)
    if (!isInside) {
      this._closeDropdown()
    }
  }

  _closeDropdown() {
    this.isOpen = false
    this.searchQuery = ''
    this._scheduleHidePopover()
  }

  // Promote .dropdown-menu to the top layer via the native Popover API — this is what actually
  // fixes clipping/mispositioning. `position:fixed` alone isn't enough: any ancestor with
  // transform/filter/backdrop-filter (eg. web-dialog's .web-dialog-content) creates a new
  // containing block for fixed descendants, and overflow:hidden on that same ancestor then
  // clips the dropdown. Top-layer rendering bypasses both regardless of nesting depth.
  // 'manual' mode (not 'auto') — no UA backdrop/light-dismiss, we already handle outside-click.
  _showPopover() {
    clearTimeout(this._hideTimer)
    const dropdown = this.shadowRoot.querySelector('.dropdown-menu')
    if (dropdown?.showPopover && !dropdown.matches(':popover-open')) {
      try { dropdown.showPopover() } catch {}
    }
  }

  _hidePopover() {
    const dropdown = this.shadowRoot.querySelector('.dropdown-menu')
    if (dropdown?.hidePopover && dropdown.matches(':popover-open')) {
      try { dropdown.hidePopover() } catch {}
    }
  }

  // Removing from the top layer immediately (synchronous hidePopover()) mid fade-out drops the
  // dropdown back into normal flow while it's still visually animating — it then re-clips/jumps
  // against whatever ancestor transform it was escaping (see _showPopover comment), which read as
  // the dropdown "sliding down" right before it vanished. Waiting for the CSS transition to finish
  // keeps it promoted for the whole close animation; the timeout is a fallback in case
  // transitionend never fires (e.g. reduced-motion, no matching transition).
  _scheduleHidePopover() {
    const dropdown = this.shadowRoot.querySelector('.dropdown-menu')
    if (!dropdown?.hidePopover || !dropdown.matches(':popover-open')) return
    clearTimeout(this._hideTimer)
    const finish = () => {
      dropdown.removeEventListener('transitionend', onEnd)
      clearTimeout(this._hideTimer)
      if (!this.isOpen) this._hidePopover()
    }
    const onEnd = (e) => { if (e.target === dropdown) finish() }
    dropdown.addEventListener('transitionend', onEnd)
    this._hideTimer = setTimeout(finish, 450)
  }

  _toggleDropdown(e) {
    e.stopPropagation()
    if (this.disabled) return
    this.isOpen = !this.isOpen

    if (this.isOpen) {
      this.updateComplete.then(() => {
        this._showPopover()
        this._updateDropdownPosition()
        if (this.searchable) {
          setTimeout(() => {
            const input = this.shadowRoot.querySelector('.search-input')
            if (input) input.focus()
          }, 0)
        }
      })
    } else {
      this._closeDropdown()
    }
  }

  _updateDropdownPosition() {
    if (!this.isOpen) return

    const trigger = this.shadowRoot.querySelector('.select-trigger')
    const dropdown = this.shadowRoot.querySelector('.dropdown-menu')
    if (!trigger || !dropdown) return

    // .dropdown-menu renders in the top layer (popover) — its fixed position is always
    // relative to the true viewport, same coordinate space as getBoundingClientRect(),
    // so no ancestor-transform offset compensation is needed here anymore.
    const tr = trigger.getBoundingClientRect()
    const dw = Math.max(tr.width, 200)
    const dh = (dropdown.scrollHeight || dropdown.offsetHeight) + 8
    const gap = parseFloat(this.placementGap || 4)
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    const [side, align] = (this.placement || 'bottom-start').split('-')

    // 1. Calculate initial position based on placement
    let top = side === 'top' ? tr.top - dh - gap : tr.bottom + gap
    let left = align === 'end' ? tr.right - dw : tr.left

    // 2. Clamp vertical: flip if overflows, also set maxHeight for long lists
    const spaceBelow = vh - tr.bottom - margin
    const spaceAbove = tr.top - margin

    if (side === 'bottom' && top + dh > vh - margin) {
      top = tr.top - dh - gap
      dropdown.style.maxHeight = `${spaceAbove}px`
    } else if (side === 'top' && top < margin) {
      top = tr.bottom + gap
      dropdown.style.maxHeight = `${spaceBelow}px`
    } else {
      dropdown.style.maxHeight = side === 'top' ? `${spaceAbove}px` : `${spaceBelow}px`
    }
    if (top < margin) top = margin

    // 3. Clamp horizontal: keep within viewport
    if (left + dw > vw - margin) left = vw - dw - margin
    if (left < margin) left = margin

    dropdown.style.width = `${dw}px`
    dropdown.style.top = `${top}px`
    dropdown.style.left = `${left}px`
    dropdown.style.right = 'auto'
  }

  _handleSearch(e) {
    this.searchQuery = e.target.value
  }

  _selectOption(option) {
    const optionValue = option.value !== undefined ? option.value : option.id

    if (this.multiple) {
      const currentValues = Array.isArray(this.value) ? [...this.value] : []
      const index = currentValues.indexOf(optionValue)
      if (index > -1) {
        currentValues.splice(index, 1)
      } else {
        currentValues.push(optionValue)
      }
      this.value = currentValues
    } else {
      this.value = optionValue
      this._closeDropdown()
    }

    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    )
  }

  _isSelected(option) {
    const optionValue = option.value !== undefined ? option.value : option.id
    if (this.multiple) {
      return Array.isArray(this.value) && this.value.includes(optionValue)
    }
    return this.value === optionValue
  }

  _getDisplayValue() {
    if (this.multiple) {
      if (!Array.isArray(this.value) || this.value.length === 0) return null
      const selectedOptions = this.options.filter((opt) => {
        const val = opt.value !== undefined ? opt.value : opt.id
        return this.value.includes(val)
      })
      return selectedOptions.map((opt) => opt.label || opt.name).join(', ')
    } else {
      const selectedOption = this.options.find((opt) => {
        const val = opt.value !== undefined ? opt.value : opt.id
        return val === this.value
      })
      return selectedOption ? (selectedOption.label || selectedOption.name) : null
    }
  }

  get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

  render() {
    const filteredOptions = this.options.filter((opt) => {
      const label = opt.label || opt.name || ''
      return label.toLowerCase().includes(this.searchQuery.toLowerCase())
    })

    const displayValue = this._getDisplayValue()
    const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']

    // slot="trigger" (vd <web-button> icon) thay hẳn trigger mặc định — box padding/border/
    // background/width:100% của .select-trigger (+ :host width:100%) được thiết kế cho
    // trigger text mặc định, không hợp khi nội dung slot chỉ là 1 icon nhỏ (tạo khoảng trống
    // to bất thường bên phải icon). Set thẳng inline style trên :host (thắng mọi rule trong
    // stylesheet, không cần chờ thêm 1 vòng update như cách dùng classList.toggle ở updated()
    // — vốn chạy SAU render() nên sẽ chậm mất 1 nhịp ở lần render đầu).
    const hasCustomTrigger = !!this.querySelector('[slot="trigger"]')
    this.style.width = hasCustomTrigger ? 'auto' : ''

    return html`
      <div class="${uiConfig.wrap}" style="--core-height: ${this.height}">

        <!-- slot="trigger" — caller có thể thay hẳn trigger mặc định (text + chevron) bằng
             nội dung riêng (vd <web-button slot="trigger"> icon), vẫn bấm mở/đóng dropdown
             bình thường vì click trên nội dung slot bubbles qua đúng div này. Không truyền gì
             thì fallback dùng trigger mặc định như cũ (không đổi behavior các nơi đang dùng). -->
        <div
          class="${uiConfig.trigger} ${hasCustomTrigger ? 'custom-trigger' : ''} ${this.isOpen ? 'open' : ''} ${this.disabled ? 'disabled' : ''}"
          @click=${this._toggleDropdown}
        >
          <slot name="trigger">
            <div class="selected-value ${!displayValue ? 'placeholder' : ''}">
              ${displayValue || this.placeholder || this._txt.ph}
            </div>
            <svg
              class="chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </slot>
        </div>

        <div class="${uiConfig.dropdown} ${this.isOpen ? 'show' : ''}" popover="manual">
          ${this.searchable
        ? html`
                <div class="search-container">
                  <input
                    type="text"
                    class="search-input"
                    placeholder="${this._txt.searchPh}"
                    .value=${this.searchQuery}
                    @input=${this._handleSearch}
                    @click=${(e) => e.stopPropagation()}
                  />
                </div>
              `
        : ''}
          <div class="options-list">
            ${filteredOptions.length > 0
        ? filteredOptions.map(
          (opt) => html`
                    <div
                      class="option-item ${this._isSelected(opt) ? 'selected' : ''}"
                      @click=${() => this._selectOption(opt)}
                    >
                      <span>${opt.label || opt.name}</span>
                      <svg
                        class="checkmark"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  `
        )
        : html`<div class="no-results">${this._txt.noResults}</div>`}
          </div>
        </div>
      </div>
    `
  }

}

if (!customElements.get('web-select')) {
  customElements.define('web-select', WebSelect)
}

export default WebSelect
