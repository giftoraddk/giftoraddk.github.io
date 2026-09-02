// src/webs/apex/web-driver.js
//
// Product-tour / element-highlight overlay — cùng ý tưởng driver.js (https://driverjs.com):
// truyền vào 1 mảng `steps` (mỗi step trỏ 1 CSS selector/element/hàm resolver + nội dung
// popover), gọi `.drive()` để chạy tour từng bước (Tiếp/Trước/Đóng), hoặc `.highlight()` để
// dí đèn spotlight vào đúng 1 element (không có nút điều hướng — chỉ 1 nút "Đã hiểu").
//
// Overlay là 1 <dialog> top-layer DUY NHẤT (cùng kỹ thuật web-dialog.js — miễn nhiễm
// transform/filter/backdrop-filter của ancestor, vd glass pane ui="spatial"), nhưng KHÔNG
// dùng ::backdrop để dim — phần tối vẽ bằng box-shadow khổng lồ trên chính ô "spotlight"
// (.wdr-stage), nhờ vậy ô đó trong suốt thật sự và để lộ đúng element gốc đang render trong
// trang (không phải bản sao/clone), pointer-events: none nên click vẫn xuyên qua tới element
// thật bên dưới.
//
// Chuyển bước: fade+zoom ĐƠN GIẢN — ẩn (opacity+scale nhỏ lại) cả spotlight lẫn popover NHƯ 1
// KHỐI DUY NHẤT, đổi vị trí lúc đang ẩn (không có gì "trượt" qua màn hình), rồi fade+zoom hiện
// lại ở vị trí mới. Không còn CSS transition riêng cho top/left như bản trước — vừa mượt hơn
// vừa đơn giản hơn hẳn (1 hiệu ứng, không phải phối 2 nhịp animation khác nhau).
//
// `element` của mỗi step nhận 3 dạng: string (document.querySelector), Element (dùng thẳng),
// hoặc function (tự resolve — bắt buộc khi target nằm TRONG shadow DOM của 1 component khác,
// vd () => document.querySelector('svc-bay-list')?.shadowRoot?.querySelector('.byl-search-input')).
//
// Singleton toàn trang — cùng pattern window.webToast (web-toast.js): gọi hàm global
// `window.webDriver(steps, opts)` ở BẤT KỲ đâu (kể cả ngoài Lit component), hàm tự tạo (hoặc
// tái dùng) đúng 1 <web-driver> gắn vào <body>, trả về controller {drive, moveNext,
// movePrevious, destroy, highlight, isActive, isCompleted} — API hình dạng giống hệt driver.js.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-button.js'
import styles from './styles/web-driver.css?inline'

// Phải khớp đúng thời lượng transition khai báo trong web-driver.css (.wdr-stage/.wdr-popover)
const FADE_MS = 200

const CONFIG_STD = {
    showProgress: true,
    allowClose: true,
    allowKeyboard: true,
    stagePadding: 6,
    nextBtnText: null, // null → dùng txt theo lang
    prevBtnText: null,
    doneBtnText: null,
    onHighlighted: null, // (el, step, driver) => void
    onNextClick: null,   // (step, driver) => void — return false để chặn chuyển bước
    onPrevClick: null,
    onDestroyed: null,   // (driver) => void — driver.isCompleted() phân biệt "xem hết" vs "đóng giữa chừng"
}

const TXT = {
    vi: { next: 'Tiếp →', prev: '← Trước', done: 'Xong', gotIt: 'Đã hiểu' },
    en: { next: 'Next →', prev: '← Prev', done: 'Done', gotIt: 'Got it' },
}

function _dcInViewport(el) {
    const r = el.getBoundingClientRect()
    return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth
}

export class WebDriver extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        _open:         { state: true },
        _steps:        { state: true },
        _stepIndex:    { state: true },
        _config:       { state: true },
        _highlightOnly:{ state: true },
        _rect:         { state: true }, // { top, left, width, height } của stage hiện tại (đã cộng padding)
        _visible:      { state: true }, // fade+zoom cả spotlight lẫn popover như 1 khối
    }

    get _t() { return TXT[this.lang] ?? TXT.vi }

    constructor() {
        super()
        this.ui = 'modern'
        this.theme = ''
        this.lang = 'vi'
        this._open = false
        this._steps = []
        this._stepIndex = 0
        this._config = { ...CONFIG_STD }
        this._highlightOnly = false
        this._rect = null
        this._visible = false
        this._transitioning = false // chặn double-click Next/Prev chồng lấn giữa lúc đang chuyển bước
        this._completed = false     // true nếu vừa xem hết tour (Next ở bước cuối), phân biệt với đóng giữa chừng

        this._dhKeydown       = this._dhKeydown.bind(this)
        this._dhRawReposition = this._dhRawReposition.bind(this)
    }

    updated(changed) {
        if (changed.has('theme') && this.theme) this.setAttribute('data-theme', this.theme)
        else if (changed.has('theme') && !this.theme) this.removeAttribute('data-theme')

        if (changed.has('_open')) {
            const d = this.shadowRoot?.querySelector('dialog.wdr-overlay')
            if (!d) return
            if (this._open && !d.open) {
                d.showModal()
                window.addEventListener('resize', this._dhRawReposition)
                window.addEventListener('scroll', this._dhRawReposition, true)
                if (this._config.allowKeyboard) window.addEventListener('keydown', this._dhKeydown)
            } else if (!this._open && d.open) {
                d.close()
                window.removeEventListener('resize', this._dhRawReposition)
                window.removeEventListener('scroll', this._dhRawReposition, true)
                window.removeEventListener('keydown', this._dhKeydown)
            }
        }
    }

    // ── Public API — hình dạng giống driver.js thật ──────────────────────────

    /** Nạp steps + config trước khi drive()/highlight() — tách riêng để gọi lại nhiều lần
     *  trên cùng 1 instance singleton (window.webDriver) mà không phải tạo lại element. */
    setSteps(steps, config = {}) {
        this._steps = steps ?? []
        this._config = { ...CONFIG_STD, ...config }
        return this
    }

    /** Chạy tour nhiều bước từ `startIndex` — có Tiếp/Trước/tiến trình. */
    drive(startIndex = 0) {
        if (!this._steps.length) return this
        this._highlightOnly = false
        this._completed = false
        this._stepIndex = Math.min(Math.max(startIndex, 0), this._steps.length - 1)
        this._open = true
        this._dcTransitionTo(this._stepIndex)
        return this
    }

    /** Dí spotlight vào đúng 1 element — không có nút Tiếp/Trước, chỉ 1 nút "Đã hiểu". */
    highlight(step) {
        this._steps = [step]
        this._config = { ...CONFIG_STD, ...(step?.config ?? {}) }
        this._highlightOnly = true
        this._completed = false
        this._stepIndex = 0
        this._open = true
        this._dcTransitionTo(0)
        return this
    }

    async moveNext() {
        if (this._transitioning) return this
        const step = this._steps[this._stepIndex]
        if (this._config.onNextClick?.(step, this) === false) return this
        if (this._stepIndex >= this._steps.length - 1) { this._completed = true; this.destroy(); return this }
        await this._dcTransitionTo(this._stepIndex + 1)
        return this
    }

    async movePrevious() {
        if (this._transitioning) return this
        const step = this._steps[this._stepIndex]
        if (this._config.onPrevClick?.(step, this) === false) return this
        if (this._stepIndex <= 0) return this
        await this._dcTransitionTo(this._stepIndex - 1)
        return this
    }

    destroy() {
        this._open = false
        this._rect = null
        this._visible = false
        this._config.onDestroyed?.(this)
        return this
    }

    isActive() { return this._open }
    /** true nếu tour vừa kết thúc do xem hết tới bước cuối (Next), không phải đóng giữa chừng
     *  (X/Escape/click ra ngoài) — dùng trong onDestroyed để quyết định "đã xem xong". */
    isCompleted() { return this._completed }

    // ── Internals ──────────────────────────────────────────────────────────

    _dhKeydown(e) {
        if (e.key === 'Escape') { if (this._config.allowClose) this.destroy(); return }
        if (this._highlightOnly) return
        if (e.key === 'ArrowRight' || e.key === 'Enter') this.moveNext()
        else if (e.key === 'ArrowLeft') this.movePrevious()
    }

    /**
     * Flow chuyển bước fade+zoom: stepIndex -> ẩn khối cũ -> đo vị trí mới -> hiện khối mới
     */
    async _dcTransitionTo(stepIndex) {
        // [1] CHECK: đã có 1 lượt chuyển bước khác đang chạy thì bỏ qua (double-click Next/Prev)
        if (this._transitioning) return
        this._transitioning = true
        const hadPrevious = this._rect != null

        // [2] PROCESS: fade+zoom ẩn khối hiện tại (nếu có) trước khi đổi bước — spotlight và
        // popover ẩn/hiện CÙNG LÚC như 1 khối duy nhất, đơn giản hơn hẳn kiểu tách nhịp trước đây
        if (hadPrevious) {
            this._visible = false
            await new Promise(r => setTimeout(r, FADE_MS))
        }

        this._stepIndex = stepIndex
        const step = this._steps[this._stepIndex]
        const el = this._dcResolveEl(step?.element)
        if (!el) { this._rect = null; this._visible = false; this._transitioning = false; return }

        // [3] EXECUTE: cuộn tới element (nếu chưa trong viewport) trong lúc đang ẩn, đo vị trí
        // thật, rồi fade+zoom hiện khối mới đúng tại vị trí đó
        const inView = _dcInViewport(el)
        if (!inView) {
            el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
            await new Promise(r => setTimeout(r, 350))
        }

        const r = el.getBoundingClientRect()
        const pad = this._config.stagePadding ?? 6
        this._rect = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
        this._config.onHighlighted?.(el, step, this)

        this._visible = true
        this._transitioning = false
    }

    // Recompute "thô" cho resize/scroll khi tour ĐANG đứng yên (không phải đang chuyển bước) —
    // không cần fade, chỉ theo kịp vị trí thật ngay lập tức.
    _dhRawReposition() {
        if (this._transitioning) return
        if (this._rawScheduled) return
        this._rawScheduled = true
        requestAnimationFrame(() => {
            this._rawScheduled = false
            const step = this._steps[this._stepIndex]
            const el = this._dcResolveEl(step?.element)
            if (!el) return
            const r = el.getBoundingClientRect()
            const pad = this._config.stagePadding ?? 6
            this._rect = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
        })
    }

    _dcResolveEl(target) {
        if (!target) return null
        if (typeof target === 'function') return target() ?? null
        if (typeof target === 'string') return document.querySelector(target)
        return target
    }

    _comPopoverPos() {
        if (!this._rect) return ''
        const { top, left, width, height } = this._rect
        const gap = 12
        const step = this._steps[this._stepIndex] || {}
        const side  = step.popover?.side  ?? 'bottom'
        const align = step.popover?.align ?? 'start'
        const vw = window.innerWidth, vh = window.innerHeight
        const popW = 320, popH = 160 // kích thước ước lượng (khớp .wdr-popover trong CSS) — đủ để clamp trong viewport, không cần đo lại DOM 2 lần

        let t, l
        if (side === 'top')    { t = top - gap - popH; l = left }
        else if (side === 'left')  { t = top; l = left - gap - popW }
        else if (side === 'right') { t = top; l = left + width + gap }
        else /* bottom/over */ { t = top + height + gap; l = left }

        if (side === 'top' || side === 'bottom') {
            if (align === 'center') l = left + width / 2 - popW / 2
            else if (align === 'end') l = left + width - popW
        } else if (side === 'left' || side === 'right') {
            if (align === 'center') t = top + height / 2 - popH / 2
            else if (align === 'end') t = top + height - popH
        }

        l = Math.min(Math.max(l, 8), vw - popW - 8)
        t = Math.min(Math.max(t, 8), vh - popH - 8)
        return `top:${t}px; left:${l}px;`
    }

    render() {
        if (!this._steps.length) return html``
        const step = this._steps[this._stepIndex] || {}
        const { title = '', description = '', side = 'bottom' } = step.popover ?? {}
        const t = this._t
        const hidden = !this._visible ? 'wdr-hidden' : ''

        return html`
            <dialog class="wdr-overlay"
                @cancel=${e => { e.preventDefault(); if (this._config.allowClose) this.destroy() }}
                @click=${e => this._dhOverlayClick(e)}
            >
                ${this._rect ? html`
                    <div class="wdr-stage ${hidden}"
                        style="top:${this._rect.top}px; left:${this._rect.left}px; width:${this._rect.width}px; height:${this._rect.height}px;"
                    ></div>
                    <div class="wdr-popover ${this.ui === 'spatial' ? 'spatial' : ''} ${side} ${hidden}" style=${this._comPopoverPos()}>
                        ${!this._highlightOnly && this._config.showProgress ? html`
                            <div class="wdr-progress">${this._stepIndex + 1} / ${this._steps.length}</div>
                        ` : ''}
                        ${title ? html`<div class="wdr-title">${title}</div>` : ''}
                        ${description ? html`<div class="wdr-desc">${description}</div>` : ''}
                        <div class="wdr-actions">
                            ${this._highlightOnly ? html`
                                <web-button type="fill" color="primary" height="32px" ui=${this.ui} theme=${this.theme}
                                    @clicked=${() => this.destroy()}>${this._config.doneBtnText ?? t.gotIt}</web-button>
                            ` : html`
                                ${this._config.allowClose ? html`
                                    <web-button type="ghost" color="base-content" square rounded="50%" height="28px"
                                        ui=${this.ui} theme=${this.theme} @clicked=${() => this.destroy()}>
                                        <iconify-icon icon="ri:close-line" width="16px"></iconify-icon>
                                    </web-button>
                                ` : ''}
                                <span class="wdr-actions-spacer"></span>
                                ${this._stepIndex > 0 ? html`
                                    <web-button type="outline" color="primary" height="30px" ui=${this.ui} theme=${this.theme}
                                        @clicked=${() => this.movePrevious()}>${this._config.prevBtnText ?? t.prev}</web-button>
                                ` : ''}
                                <web-button type="fill" color="primary" height="30px" ui=${this.ui} theme=${this.theme}
                                    @clicked=${() => this.moveNext()}>
                                    ${this._stepIndex === this._steps.length - 1 ? (this._config.doneBtnText ?? t.done) : (this._config.nextBtnText ?? t.next)}
                                </web-button>
                            `}
                        </div>
                    </div>
                ` : ''}
            </dialog>
        `
    }

    // Click ra ngoài spotlight (không phải trên popover, không phải trong vùng đang highlight)
    // → đóng tour nếu allowClose. Toạ độ click so trực tiếp với _rect thay vì cắt lỗ bằng CSS
    // pointer-events (stage đã pointer-events:none để không chặn tương tác với element thật).
    _dhOverlayClick(e) {
        if (e.target !== e.currentTarget) return // click trúng popover — bỏ qua
        if (!this._config.allowClose) return
        const r = this._rect
        if (r && e.clientX >= r.left && e.clientX <= r.left + r.width && e.clientY >= r.top && e.clientY <= r.top + r.height) return
        this.destroy()
    }
}

if (!customElements.get('web-driver')) customElements.define('web-driver', WebDriver)

// ── Global helper — cùng pattern window.webToast (web-toast.js) ──────────────
// Tự tạo (hoặc tái dùng) đúng 1 <web-driver> gắn vào <body>, trả về chính element đó — public
// API (setSteps/drive/highlight/moveNext/movePrevious/destroy/isActive/isCompleted) gọi thẳng
// lên nó, giống hệt `driver({ steps }).drive()` của driver.js thật.
function _dcSingleton() {
    let el = document.querySelector('web-driver#wdr-singleton')
    if (!el) {
        el = document.createElement('web-driver')
        el.id = 'wdr-singleton'
        document.body.appendChild(el)
    }
    return el
}

window.webDriver = (steps, config = {}) => _dcSingleton().setSteps(steps, config)

export default WebDriver
