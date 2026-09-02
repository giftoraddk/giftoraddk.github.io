// src/webs/apex/web-theme.js
//
// Nút bật/tắt light/dark dùng chung toàn site — cùng cơ chế BtnTheme.astro
// (src/components/Nav/Action/BtnTheme.astro): set thẳng `data-theme` lên <html> + persist
// cookie (storeCookie.js). Khác BtnTheme.astro (thuần Astro script, chỉ chạy trên trang có
// load Nav) — đây là 1 Lit custom element tự quản lý toàn bộ state/sync, dùng được ở bất kỳ
// đâu (kể cả trang không load Nav/astroApp, vd /channel/ dùng Empty.astro).
//
// Tự đọc theme hiện tại lúc connect (cookie → data-theme đang có trên <html> → 'dark') và
// SET LẠI ngay vào <html> — đảm bảo <html data-theme> luôn đúng giá trị đã lưu ngay cả khi
// trang chưa có component nào khác từng set nó. Quan sát tiếp `data-theme` qua
// MutationObserver để tự đồng bộ nếu nơi khác (vd 1 <web-theme> khác trên cùng trang) đổi.
import { LitElement, html, css } from 'lit'
import '@/webs/apex/web-button.js'
import 'iconify-icon'
import { ClientCookies, COOKIE_CONFIG } from '@/services/storeCookie.js'

export class WebTheme extends LitElement {
    static styles = css`
    :host {
        display: inline-block;
    }
    `

    static properties = {
        ui:     { type: String }, // modern, spatial — truyền xuống web-button
        height: { type: String },
        _theme: { state: true },
    }

    constructor() {
        super()
        this.ui = 'modern'
        this.height = '36px'
        this._theme = 'dark'
    }

    connectedCallback() {
        super.connectedCallback()
        const resolved = ClientCookies.get(COOKIE_CONFIG.THEME) ?? document.documentElement.getAttribute('data-theme') ?? 'dark'
        this._applyDom(resolved)

        this._observer = new MutationObserver(() => {
            this._theme = document.documentElement.getAttribute('data-theme') || this._theme
        })
        this._observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._observer?.disconnect()
    }

    // Chỉ set attribute lên <html> — không tự persist cookie (khác _dhToggle, xem dưới),
    // vì đây là đồng bộ LẠI đúng giá trị đã lưu, không phải 1 lượt đổi theme mới cần lưu lại.
    _applyDom(theme) {
        this._theme = theme
        document.documentElement.setAttribute('data-theme', theme)
    }

    _dhToggle() {
        const next = this._theme === 'dark' ? 'light' : 'dark'
        this._applyDom(next)
        ClientCookies.set(COOKIE_CONFIG.THEME, next)
        this.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: next }, bubbles: true, composed: true }))
    }

    render() {
        const isDark = this._theme === 'dark'
        return html`
            <web-button type="soft" color="primary" height=${this.height} square rounded="50%" ui=${this.ui}
                @clicked=${this._dhToggle} title=${isDark ? 'Chuyển sang Light' : 'Chuyển sang Dark'}>
                <iconify-icon icon=${isDark ? 'ri:sun-line' : 'ri:moon-line'} width="22px"></iconify-icon>
            </web-button>
        `
    }
}

if (!customElements.get('web-theme')) customElements.define('web-theme', WebTheme)
