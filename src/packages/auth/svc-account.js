// src/packages/auth/svc-account.js
//
// <svc-account> — auth gate: renders <svc-auth embedded> while signed out, <svc-profile> once
// signed in, swapping in place (no page navigation) on `login-success`/`sign-out` — covers both
// sign-in and sign-up, since svc-auth ends either one signed in.
//
// Also owns the page-wide preferences <svc-profile> asks for: `theme-select`/`lang-select` are applied
// to <html data-theme>/<html lang> + their cookie (same mechanism as BtnLang.astro),
// then re-announced as `theme-change`/`lang-change` so a host can restyle its other panels.
//
// Emits `account-change` { user } whenever the signed-in user is known or changes (first check,
// login, profile save, sign-out → null) — e.g. node.astro puts the avatar onto the account node.
//
// Every active account signs in here and gets its profile — a plain `roles: 'user'` one too (`guestOk`
// defaults to true). What a role unlocks is up to the panels that need one (svc-node's node `roles`).
//
// Standalone like <svc-aide>: by default a movable <web-fab> (the user's avatar once signed in) opens the panel in a
// <web-popover> — drop <svc-account> on any page. `embedded` = just the panel, for a host that brings its own chrome
// (svc-node's account node, the admin pages' gate / popover).
import { LitElement, html, unsafeCSS } from 'lit'
import '@/packages/apex/web-fab.js'
import '@/packages/apex/web-popover.js'
import './svc-auth.js'
import './app/svc-profile.js'
import { auth } from './service/service.js'
import { ClientCookies, COOKIE_CONFIG } from '@/services/core/cookier.js'
import styles from './css/svc-account.css?inline'

const LANGS = ['vi', 'en']

export class SvcAccount extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String },
        // Forwarded to the inner <svc-auth>: true (default) = any active account may sign in, not only
        // one with admin / table permissions — set false only where this panel is an admin gate.
        guestOk: { type: Boolean },
        // true = just the panel (the host brings trigger + popover); false (default) = own <web-fab> + <web-popover>.
        embedded: { type: Boolean, reflect: true },
        // Forwarded to the inner <web-fab> (same x / y as <svc-aide>) — where the host stacks this button.
        x: { type: String },
        y: { type: String },
        _user: { state: true },
        _ready: { state: true }, // false until the initial auth.get() resolves — avoids a login-panel flash for an already-signed-in visitor
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'
        this.guestOk = true
        this.embedded = false
        this.x = '99%'; this.y = '1rem'
        this._user = null
        this._ready = false
    }

    async connectedCallback() {
        super.connectedCallback()
        // A saved choice beats the prop the host passed in; later changes made elsewhere on the page
        // (BtnLang, another svc-account) are followed through the <html> attributes.
        // Theme falls back to <html data-theme> (what the page actually shows — the CSS vars live there,
        // a `theme` prop alone restyles nothing inside shadow roots). Lang doesn't: layouts hardcode <html lang>.
        const theme = ClientCookies.get(COOKIE_CONFIG.THEME) ?? document.documentElement.getAttribute('data-theme')
        const lang = ClientCookies.get(COOKIE_CONFIG.LANGUAGE)
        if (theme === 'dark' || theme === 'light') this.theme = theme
        if (LANGS.includes(lang)) this.lang = lang
        this._observer = new MutationObserver(() => {
            const root = document.documentElement
            const t = root.getAttribute('data-theme'), l = root.getAttribute('lang')
            if (t && t !== this.theme) this.theme = t
            if (LANGS.includes(l) && l !== this.lang) this.lang = l
        })
        this._observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'lang'] })

        this._setUser(await auth.get())
        this._ready = true
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._observer?.disconnect()
    }

    _setUser(user) {
        this._user = user ?? null
        this.dispatchEvent(new CustomEvent('account-change', { detail: { user: this._user }, bubbles: true, composed: true }))
    }

    _onLoginSuccess(e) {
        this._setUser(e.detail.profile)
    }

    _onProfileUpdate(e) {
        e.stopPropagation()
        this._setUser(e.detail.user) // svc-profile's save already refreshed the session cache
    }

    async _onSignOut() {
        await auth.clear()
        this._setUser(null)
    }

    _onThemeSelect(e) {
        e.stopPropagation()
        const { theme } = e.detail
        this.theme = theme
        document.documentElement.setAttribute('data-theme', theme)
        ClientCookies.set(COOKIE_CONFIG.THEME, theme)
        this.dispatchEvent(new CustomEvent('theme-change', { detail: { theme }, bubbles: true, composed: true }))
    }

    _onLangSelect(e) {
        e.stopPropagation()
        const { lang } = e.detail
        this.lang = lang
        document.documentElement.setAttribute('lang', lang)
        ClientCookies.set(COOKIE_CONFIG.LANGUAGE, lang)
        this.dispatchEvent(new CustomEvent('lang-change', { detail: { lang }, bubbles: true, composed: true }))
    }

    render() {
        if (!this._ready) return html``
        if (this.embedded) return this._rbPanel()
        // Signed in: the fab wears the avatar's place (web-fab takes an icon only) — a filled account icon.
        const icon = this._user ? 'ri:account-circle-fill' : 'ri:user-3-line'
        return html`
            <web-popover ui=${this.ui} theme=${this.theme} lang=${this.lang} placement="bottom-end" placementGap="0">
                <web-fab slot="trigger" icon=${icon} size="lg" rounded="50%" x=${this.x} y=${this.y} movable ui="modern" theme=${this.theme}
                    aria-label=${this._user ? (this._user.display_name || this._user.email || 'Account') : 'Sign in'}></web-fab>
                <div class="acc-pop">${this._rbPanel()}</div>
            </web-popover>
        `
    }

    _rbPanel() {
        return this._user
            ? html`<svc-profile .user=${this._user} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                @sign-out=${this._onSignOut} @profile-update=${this._onProfileUpdate}
                @theme-select=${this._onThemeSelect} @lang-select=${this._onLangSelect}></svc-profile>`
            : html`<svc-auth embedded ?guestOk=${this.guestOk} ui=${this.ui} theme=${this.theme} lang=${this.lang} @login-success=${this._onLoginSuccess}></svc-auth>`
    }
}

if (!customElements.get('svc-account')) customElements.define('svc-account', SvcAccount)
export default SvcAccount
