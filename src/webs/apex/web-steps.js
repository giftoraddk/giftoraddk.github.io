import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import styles from './styles/web-steps.css?inline'

export class WebSteps extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        // [{ id, label, icon?, status?: 'done'|'active'|'pending'|'error' }]
        steps:      { type: Array  },
        active:     { type: String },
        ui:         { type: String },
        theme:      { type: String },
        size:       { type: String }, // sm | md | lg | xl
        isVertical: { type: Boolean }, // vertical timeline: circle+line left, label+content right, per step
        linear:     { type: Boolean }, // true → click chỉ đi tới step đã qua/đang active, chặn nhảy tới step 'pending'
        // true → cả quá trình đã KẾT THÚC ở đúng step active hiện tại (vd đơn hàng terminal: đã trả
        // hàng/đã huỷ/đã nhận hàng) — không còn gì "đang chạy" tiếp theo nữa, nên step active hiện
        // tại đổi thành 'done' (dấu check) thay vì spin vô thời hạn như đang xử lý dở.
        ended:      { type: Boolean },
        mainColors: { type: String }, // pipe-separated 5 colors
        textColor:  { type: String },
        // linear mode: step đang được XEM LẠI (khác `active` thật) — '' nghĩa là đang xem đúng step
        // active. Tách riêng khỏi `active` để lùi lại xem step cũ KHÔNG hạ luôn mốc tiến độ thật
        // (nếu không, _activeIndex tụt xuống theo step vừa xem, chặn luôn việc tiến lại step hiện tại).
        _viewing:   { state: true },
    }

    constructor() {
        super()
        this.steps      = []
        this.active     = ''
        this.ui         = 'modern'
        this.theme      = ''
        this.size       = 'md'
        this.isVertical = false
        this.linear     = false
        this.ended      = false
        this.mainColors = ''
        this.textColor  = ''
        this._viewing   = ''
    }

    get _colors() {
        const [primary = '', secondary = '', accent = '', info = '', warning = '']
            = (this.mainColors || '').split('|').map(c => c.trim())
        return { primary, secondary, accent, info, warning }
    }

    _applyCSS() {
        this.theme
            ? this.setAttribute('data-theme', this.theme)
            : this.removeAttribute('data-theme')
        const c = this._colors
        const vars = {
            '--color-primary':      c.primary,
            '--color-secondary':    c.secondary,
            '--color-accent':       c.accent,
            '--color-info':         c.info,
            '--color-warning':      c.warning,
            '--color-base-content': this.textColor,
        }
        for (const [k, v] of Object.entries(vars)) {
            v ? this.style.setProperty(k, v) : this.style.removeProperty(k)
        }
    }

    firstUpdated() {
        if (!this.active && this.steps.length > 0) {
            this.active = this.steps[0].id
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') || changedProperties.has('mainColors')
            || changedProperties.has('textColor')) {
            this._applyCSS()
        }
        // Tiến độ thật vừa đổi (vd order sang bước kế) — bỏ view-override cũ, quay lại theo dõi
        // đúng step hiện tại thay vì kẹt ở step đã xem trước đó.
        if (changedProperties.has('active') && this._viewing) this._viewing = ''
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    // Fallback to step 0 khi `active` rỗng HOẶC không khớp bất kỳ step nào hiện có (vd config
    // dùng chung hardcode 1 id demo — process/modernStepTimeline.js có `steps.active: 'plan'`
    // nhưng trang khác tái dùng config này với step id khác hẳn) — luôn có 1 step active ngay
    // khi component vào, không để rơi vào trạng thái không step nào active.
    get _activeIndex() {
        const i = this.steps.findIndex(s => s.id === this.active)
        return i === -1 ? 0 : i
    }

    // Resolved active step id (sau fallback) — LUÔN phản ánh tiến độ thật (dùng cho circle/line
    // status), bất kể đang xem lại step nào — xem `_viewId` cho step panel nào thực sự hiển thị.
    get _activeId() {
        return this.steps[this._activeIndex]?.id
    }

    // Step panel nào đang hiển thị: linear mode ưu tiên `_viewing` (đang xem lại 1 step cũ),
    // ngược lại (không linear, hoặc chưa xem lại gì) theo đúng `_activeId`.
    get _viewIndex() {
        if (this.linear && this._viewing) {
            const i = this.steps.findIndex(s => s.id === this._viewing)
            if (i !== -1) return i
        }
        return this._activeIndex
    }

    get _viewId() {
        return this.steps[this._viewIndex]?.id
    }

    _stepStatus(step, index) {
        if (step.status) return step.status
        const ai = this._activeIndex
        if (index < ai)  return 'done'
        if (index === ai) return this.ended ? 'done' : 'active'
        return 'pending'
    }

    _lineStatus(i) {
        return i + 1 <= this._activeIndex ? 'done' : ''
    }

    // ── Event ─────────────────────────────────────────────────────────────────

    _selectStep(id) {
        if (this.linear) {
            // Chỉ cho XEM LẠI step đã qua ('done') hoặc đang active — chặn nhảy tới step 'pending'
            // (chưa tới lượt). Đổi `_viewing` (không đụng `active`) nên tiến độ thật không bị hạ
            // xuống theo step vừa xem — vẫn tiến lại được step hiện tại/step đã xem khác bất cứ lúc nào.
            const targetIndex = this.steps.findIndex(s => s.id === id)
            if (targetIndex === -1 || targetIndex > this._activeIndex) return
            const nextViewing = id === this.active ? '' : id
            if (nextViewing === this._viewing) return
            this._viewing = nextViewing
            this.dispatchEvent(new CustomEvent('change', { detail: { active: id }, bubbles: true, composed: true }))
            return
        }

        if (this.active === id) return
        this.active = id
        this.dispatchEvent(new CustomEvent('change', {
            detail: { active: id },
            bubbles: true,
            composed: true,
        }))
    }

    // ── Render helpers ────────────────────────────────────────────────────────

    _rbCircleContent(status, index) {
        if (status === 'done')    return html`<iconify-icon icon="ri:check-line"></iconify-icon>`
        if (status === 'active')  return html`<iconify-icon icon="ri:refresh-line" class="spin"></iconify-icon>`
        if (status === 'error')   return html`<iconify-icon icon="ri:close-line"></iconify-icon>`
        return html`<span>${index + 1}</span>`
    }

    // Per-step cell markup for the horizontal head (step column i): icon/circle/label + connecting
    // line into the next column. Content lives in the separate tabbed `.steps-content` below.
    _rfHorizontalCells(step, i, n, status, hasIcons, circleRow, labelRow) {
        const col = i * 2 + 1
        return html`
            ${hasIcons ? html`
                <div class="cell icon-cell" style="grid-column:${col};grid-row:1">
                    ${step.icon ? html`<iconify-icon class="step-icon ${status}" icon=${step.icon}></iconify-icon>` : ''}
                </div>
            ` : ''}

            <div class="cell circle-cell" style="grid-column:${col};grid-row:${circleRow}">
                <button class="step-circle ${status}" @click=${() => this._selectStep(step.id)}>
                    ${this._rbCircleContent(status, i)}
                </button>
            </div>

            <div class="cell label-cell" style="grid-column:${col};grid-row:${labelRow}">
                <span class="step-label ${status}">${step.label}</span>
            </div>

            ${i < n - 1 ? html`
                <div class="cell line-cell" style="grid-column:${col + 1};grid-row:${circleRow}">
                    <div class="step-line ${this._lineStatus(i)}"></div>
                </div>
            ` : ''}
        `
    }

    // Per-step cell markup for the vertical timeline (row i): marker (icon+circle+line) in column 1,
    // label+content in column 2 — both cells share the SAME grid row, so marker stretches to match
    // content's height and its line (flex:1) fills the gap down to the next circle with no seam.
    // Only the active step's content expands (like a tab panel); every label stays visible.
    _rfVerticalCells(step, i, n, status) {
        const row      = i + 1
        const isActive = this._viewId === step.id
        return html`
            <div class="cell marker-cell" style="grid-column:1;grid-row:${row}">
                ${step.icon ? html`<iconify-icon class="step-icon ${status}" icon=${step.icon}></iconify-icon>` : ''}
                <button class="step-circle ${status}" @click=${() => this._selectStep(step.id)}>
                    ${this._rbCircleContent(status, i)}
                </button>
                ${i < n - 1 ? html`<div class="step-line vertical ${this._lineStatus(i)}"></div>` : ''}
            </div>

            <div class="cell content-cell" style="grid-column:2;grid-row:${row}">
                <span class="step-label ${status}" @click=${() => this._selectStep(step.id)}>${step.label}</span>
                <div class="step-content ${isActive ? 'active' : ''}"><slot name="${step.id}"></slot></div>
            </div>
        `
    }

    render() {
        const n = this.steps.length
        if (!n) return html``

        const vertical  = this.isVertical
        const hasIcons  = this.steps.some(s => s.icon)
        const size      = this.size || 'md'

        // Horizontal: 1 column-pair (step + connector) per step, marker rows stacked (icon/circle/label).
        // Vertical:   1 row-pair (marker + connector) per step, 2 shared columns (marker | content).
        const gridCols = vertical
            ? 'auto 1fr'
            : Array.from({ length: n }, (_, i) => i < n - 1 ? 'auto 1fr' : 'auto').join(' ')
        // row indices shift down by 1 when icons are shown (horizontal only)
        const circleRow = hasIcons ? 2 : 1
        const labelRow  = hasIcons ? 3 : 2

        return html`
            <div class="web-steps ${this.ui || 'modern'} size-${size} ${vertical ? 'steps-vertical' : ''} ${this.linear ? 'steps-linear' : ''}">
                <div class="steps-head" style="grid-template-columns:${gridCols}">
                    ${this.steps.map((step, i) => {
                        const status = this._stepStatus(step, i)
                        return vertical
                            ? this._rfVerticalCells(step, i, n, status)
                            : this._rfHorizontalCells(step, i, n, status, hasIcons, circleRow, labelRow)
                    })}
                </div>

                ${vertical ? '' : html`
                    <div class="steps-content">
                        ${this.steps.map(step => html`
                            <div class="step-panel ${this._viewId === step.id ? 'active' : ''}">
                                <slot name="${step.id}"></slot>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        `
    }
}

if (!customElements.get('web-steps')) customElements.define('web-steps', WebSteps)
export default WebSteps
