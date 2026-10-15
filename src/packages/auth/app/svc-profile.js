// src/packages/auth/app/svc-profile.js
//
// <svc-profile> — signed-in account panel of <svc-account>, a small stack of views swapped in place:
//
//   home      avatar + name/email, stat tiles, menu (Profile, Edit profile, Dark mode, Language, Settings)
//   profile   Hồ sơ · Email · Tài khoản liên kết · Quyền · Thiết bị
//   edit      avatar upload, name, email, new password (+ send reset email)
//   language  vi / en
//   settings  notifications, sign out other devices, sign out
//
// Receives the profile row via `user` (shape from svc-auth.js's _dfFindOrCreateProfile). Data ops live
// in ../service/profile.js; this element never applies theme/lang itself — it asks its parent:
//
//   theme-select   { theme }  parent applies <html data-theme> + cookie, passes `theme` back down
//   lang-select    { lang }   same for <html lang>
//   profile-update { user }   a save changed the row — parent replaces `user`
//   sign-out                  parent clears the session
import { LitElement, html, nothing, unsafeCSS } from 'lit'
import { keyed } from 'lit/directives/keyed.js'
import 'iconify-icon'
import { parseRoles, accessRows, ACCESS_TXT } from '../tool/roles.js'
import {
    PASSWORD_MIN, saveProfile, saveSettings, uploadAvatar, changeEmail, changePassword, sendPasswordReset,
    listIdentities, linkProvider, touchDevice, signOutOtherDevices, currentDeviceId, fetchProfile,
} from '../service/profile.js'
import styles from '../css/svc-profile.css?inline'
import { txtLingo } from '@/services/tools/util.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TXT_STD = {
    vi: {
        title: 'Tài khoản', back: 'Quay lại',
        statRoles: 'Quyền', statDevices: 'Thiết bị', statLinked: 'Liên kết',
        general: 'Chung', preferences: 'Tuỳ chỉnh',
        profile: 'Hồ sơ', editProfile: 'Chỉnh sửa hồ sơ', darkMode: 'Chế độ tối', language: 'Ngôn ngữ', settings: 'Cài đặt',
        email: 'Email', connected: 'Tài khoản liên kết', role: 'Quyền', devices: 'Thiết bị', status: 'Trạng thái',
        noRole: 'Tài khoản thường — chưa được cấp quyền bảng nào', notActive: 'Tài khoản chưa hoạt động — quyền chưa có hiệu lực',
        linkGoogle: 'Liên kết Google', thisDevice: 'Thiết bị này', signOutOthers: 'Đăng xuất khỏi thiết bị khác',
        name: 'Họ tên', namePh: 'Nhập họ tên', emailPh: 'Nhập email', password: 'Mật khẩu mới', passwordPh: 'Để trống nếu không đổi',
        resetPassword: 'Gửi email đặt lại mật khẩu', save: 'Lưu thay đổi', changeAvatar: 'Đổi ảnh đại diện',
        notifications: 'Thông báo', notificationsSub: 'Nhận email về hoạt động tài khoản', signOut: 'Đăng xuất',
        saved: 'Đã lưu thay đổi', emailSent: 'Đã gửi link xác nhận tới email mới', passwordChanged: 'Đã đổi mật khẩu',
        resetSent: 'Đã gửi email đặt lại mật khẩu tới', othersSignedOut: 'Đã đăng xuất các thiết bị khác',
        errName: 'Vui lòng nhập họ tên', errEmail: 'Email không hợp lệ', errPasswordShort: `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự`,
        errFailed: 'Thao tác thất bại', errUpload: 'Tải ảnh lên thất bại',
    },
    en: {
        title: 'Profile', back: 'Back',
        statRoles: 'Roles', statDevices: 'Devices', statLinked: 'Linked',
        general: 'General', preferences: 'Preferences',
        profile: 'Profile', editProfile: 'Edit profile', darkMode: 'Dark mode', language: 'Language', settings: 'Settings',
        email: 'Email', connected: 'Connected accounts', role: 'Roles', devices: 'Devices', status: 'Status',
        noRole: 'Regular account — no table permissions yet', notActive: 'Account not active — permissions do not apply yet',
        linkGoogle: 'Link Google', thisDevice: 'This device', signOutOthers: 'Sign out other devices',
        name: 'Name', namePh: 'Enter your name', emailPh: 'Enter your email', password: 'New password', passwordPh: 'Leave blank to keep current',
        resetPassword: 'Send password reset email', save: 'Save changes', changeAvatar: 'Change avatar',
        notifications: 'Notifications', notificationsSub: 'Email me about account activity', signOut: 'Sign out',
        saved: 'Changes saved', emailSent: 'Confirmation link sent to the new email', passwordChanged: 'Password changed',
        resetSent: 'Password reset email sent to', othersSignedOut: 'Other devices signed out',
        errName: 'Please enter your name', errEmail: 'Enter a valid email address', errPasswordShort: `Password must be at least ${PASSWORD_MIN} characters`,
        errFailed: 'Something went wrong', errUpload: 'Image upload failed',
    },
}

// Each language labels itself in its own tongue — the list must be readable whichever one is active.
const LANGS = [
    { code: 'vi', label: 'Tiếng Việt', flag: 'circle-flags:vn' },
    { code: 'en', label: 'English', flag: 'circle-flags:us' },
]

const PROVIDER_ICON = { google: 'flat-color-icons:google', github: 'ri:github-fill', email: 'ri:mail-line' }

const _pad = (n) => String(n).padStart(2, '0')

const _initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function _ago(ts, lang) {
    const s = Math.round((ts - Date.now()) / 1000)
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
    for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
        if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit)
    }
    return rtf.format(0, 'minute')
}

export class SvcProfile extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String }, txt: { type: Object },
        user: { type: Object },
        _view: { state: true },
        _identities: { state: true },
        _draft: { state: true },
        _showPw: { state: true },
        _busy: { state: true }, // '' | 'save' | 'avatar' | 'reset' | 'link' | 'others' | 'settings' | 'signout'
        _notice: { state: true }, // { type: 'ok' | 'err', text } — cleared on every view change
        _avatarFailed: { state: true },
    }

    constructor() {
        super()
        this.ui = 'pastel'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.user = null
        this._view = 'home'
        this._identities = []
        this._draft = null
        this._showPw = false
        this._busy = ''
        this._notice = null
        this._avatarFailed = false
        this._loadedFor = null
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    willUpdate(changed) {
        if (changed.has('user') && changed.get('user')?.avatar !== this.user?.avatar) this._avatarFailed = false
    }

    updated(changed) {
        if (changed.has('user') && this.user?.id && this.user.id !== this._loadedFor) this._load()
    }

    /** Once per signed-in user: the row as the Worker has it now (the session cache keeps the roles/status from
     *  sign-in — an admin may have changed them since), linked identities, and this browser stamped into meta.devices. */
    async _load() {
        this._loadedFor = this.user.id
        const fresh = await this._fetch()
        const [identities, user] = await Promise.all([
            listIdentities().catch((e) => { console.warn('[svc-profile] identities:', e.message); return [] }),
            touchDevice(fresh).catch((e) => { console.warn('[svc-profile] device:', e.message); return fresh }),
        ])
        this._identities = identities
        if (user !== this.user) this._emitUser(user)
    }

    _fetch() {
        return fetchProfile(this.user).catch((e) => { console.warn('[svc-profile] profile:', e.message); return this.user })
    }

    /** Re-read on opening Profile — roles are shown there, and the panel may have stayed open for a while. */
    async _refresh() {
        const user = await this._fetch()
        if (user !== this.user) this._emitUser(user)
    }

    _emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
    }

    _emitUser(user) { this._emit('profile-update', { user }) }

    _go(view) {
        this._view = view
        this._notice = null
        if (view === 'profile') this._refresh()
        if (view === 'edit') {
            const u = this.user
            this._draft = { name: u.display_name || '', email: u.email || '', password: '', avatar: u.avatar || '' }
            this._showPw = false
        }
    }

    /** Runs one async action under a busy key, turning a throw into an inline error notice. */
    async _run(key, fn) {
        if (this._busy) return
        this._busy = key
        this._notice = null
        try { await fn() } catch (e) {
            this._notice = { type: 'err', text: e?.message || this._txt.errFailed }
        } finally { this._busy = '' }
    }

    _ok(text) { this._notice = { type: 'ok', text } }

    // ── Actions ──────────────────────────────────────────────────────────────

    _dhTheme() { this._emit('theme-select', { theme: this.theme === 'dark' ? 'light' : 'dark' }) }

    _dhLang(code) { if (code !== this.lang) this._emit('lang-select', { lang: code }) }

    _dhSignOut() {
        if (this._busy) return
        this._busy = 'signout'
        this._emit('sign-out')
    }

    _dhPickAvatar() { this.renderRoot.querySelector('#pf-file')?.click() }

    _dhAvatarFile(e) {
        const file = e.target.files?.[0]
        e.target.value = '' // same file picked twice in a row must still fire `change`
        if (!file) return
        this._run('avatar', async () => {
            try {
                this._draft = { ...this._draft, avatar: await uploadAvatar(file) }
                this._avatarFailed = false
            } catch (err) {
                console.error('[svc-profile] upload:', err)
                throw new Error(this._txt.errUpload)
            }
        })
    }

    _dhDraft(key, e) { this._draft = { ...this._draft, [key]: e.target.value } }

    _dhSave(e) {
        e.preventDefault()
        const t = this._txt, u = this.user, d = this._draft
        const name = d.name.trim(), email = d.email.trim(), password = d.password
        if (!name) return (this._notice = { type: 'err', text: t.errName })
        if (!EMAIL_RE.test(email)) return (this._notice = { type: 'err', text: t.errEmail })
        if (password && password.length < PASSWORD_MIN) return (this._notice = { type: 'err', text: t.errPasswordShort })

        this._run('save', async () => {
            const done = []
            const patch = {}
            if (name !== (u.display_name || '')) patch.display_name = name
            if (d.avatar !== (u.avatar || '')) patch.avatar = d.avatar
            if (Object.keys(patch).length) this._emitUser(await saveProfile(u, patch))
            if (email !== u.email) { await changeEmail(email); done.push(t.emailSent) }
            if (password) {
                await changePassword(password)
                this._draft = { ...this._draft, password: '' }
                done.push(t.passwordChanged)
            }
            this._ok(done.length ? done.join(' · ') : t.saved)
        })
    }

    _dhReset() {
        this._run('reset', async () => {
            await sendPasswordReset(this.user.email)
            this._ok(`${this._txt.resetSent} ${this.user.email}`)
        })
    }

    _dhLink(provider) { this._run('link', () => linkProvider(provider)) }

    _dhSignOutOthers() {
        this._run('others', async () => {
            this._emitUser(await signOutOtherDevices(this.user))
            this._ok(this._txt.othersSignedOut)
        })
    }

    _dhNotifications() {
        const on = this.user.meta?.settings?.notifications !== false
        this._run('settings', async () => this._emitUser(await saveSettings(this.user, { notifications: !on })))
    }

    // ── Pieces ───────────────────────────────────────────────────────────────

    _avatar(src, size) {
        const u = this.user
        return src && !this._avatarFailed
            ? html`<img class="pf-avatar-img" style="--pf-avatar:${size}" src=${src} alt="" referrerpolicy="no-referrer" @error=${() => (this._avatarFailed = true)} />`
            : html`<span class="pf-avatar-img pf-avatar-initials" style="--pf-avatar:${size}">${_initials(u.display_name || u.email)}</span>`
    }

    _switch(on, label) {
        return html`<span class="pf-switch ${on ? 'is-on' : ''}" role="switch" aria-checked=${on ? 'true' : 'false'} aria-label=${label}></span>`
    }

    _row({ icon, label, sub, value, onClick, trail = 'chevron', danger = false, busy = false }) {
        return html`
            <button class="pf-row ${danger ? 'is-danger' : ''}" type="button" ?disabled=${busy} @click=${onClick}>
                <iconify-icon class="pf-row-icon" icon=${icon}></iconify-icon>
                <span class="pf-row-text">
                    <span class="pf-row-label">${label}</span>
                    ${sub ? html`<span class="pf-row-sub">${sub}</span>` : nothing}
                </span>
                ${value ? html`<span class="pf-row-value">${value}</span>` : nothing}
                ${busy ? html`<iconify-icon class="pf-spin" icon="ri:loader-4-line"></iconify-icon>`
                    : trail === 'chevron' ? html`<iconify-icon class="pf-row-chev" icon="ri:arrow-right-s-line"></iconify-icon>`
                    : trail}
            </button>
        `
    }

    _subHead(title) {
        return html`
            <div class="pf-top">
                <button class="pf-back" type="button" aria-label=${this._txt.back} @click=${() => this._go('home')}>
                    <iconify-icon icon="ri:arrow-left-s-line"></iconify-icon>
                </button>
                <h2 class="pf-h1" title=${title}>${title}</h2>
            </div>
        `
    }

    _noticeTpl() {
        const n = this._notice
        return n ? html`<div class="pf-notice is-${n.type}" role=${n.type === 'err' ? 'alert' : 'status'}>${n.text}</div>` : nothing
    }

    get _devices() { return Array.isArray(this.user.meta?.devices) ? this.user.meta.devices : [] }

    // ── Views ────────────────────────────────────────────────────────────────

    _home() {
        const t = this._txt, u = this.user
        const langLabel = LANGS.find((l) => l.code === this.lang)?.label
        // Quyền = số bảng được cấp (không phải số token) — Super Admin: ∞
        const roleCount = parseRoles(u).isAdmin ? '∞' : _pad(accessRows(u).length)
        const stats = [[roleCount, t.statRoles], [_pad(this._devices.length), t.statDevices], [_pad(this._identities.length), t.statLinked]]
        return html`
            <div class="pf-hero">
                <button class="pf-avatar" type="button" aria-label=${t.editProfile} @click=${() => this._go('edit')}>
                    ${this._avatar(u.avatar, '88px')}
                    <span class="pf-badge"><iconify-icon icon="ri:pencil-line"></iconify-icon></span>
                </button>
                <div class="pf-hero-text">
                    <div class="pf-name">${u.display_name || u.email}</div>
                    <div class="pf-mail">${u.email}</div>
                </div>
            </div>

            <div class="pf-stats">
                ${stats.map(([n, label]) => html`<div class="pf-stat"><b>${n}</b><span>${label}</span></div>`)}
            </div>

            <div class="pf-group-title">${t.general}</div>
            ${this._row({ icon: 'ri:id-card-line', label: t.profile, onClick: () => this._go('profile') })}
            ${this._row({ icon: 'ri:edit-line', label: t.editProfile, onClick: () => this._go('edit') })}

            <div class="pf-group-title">${t.preferences}</div>
            ${this._row({ icon: 'ri:moon-line', label: t.darkMode, onClick: () => this._dhTheme(), trail: this._switch(this.theme === 'dark', t.darkMode) })}
            ${this._row({ icon: 'ri:translate-2', label: t.language, value: langLabel, onClick: () => this._go('language') })}
            ${this._row({ icon: 'ri:settings-3-line', label: t.settings, onClick: () => this._go('settings') })}

            <button class="pf-link pf-signout" type="button" ?disabled=${!!this._busy} @click=${this._dhSignOut}>
                <iconify-icon icon=${this._busy === 'signout' ? 'ri:loader-4-line' : 'ri:logout-box-r-line'} class=${this._busy === 'signout' ? 'pf-spin' : ''}></iconify-icon>${t.signOut}
            </button>
        `
    }

    _profile() {
        const t = this._txt, u = this.user
        const hasGoogle = this._identities.some((i) => i.provider === 'google')
        const mine = currentDeviceId()
        return html`
            ${this._subHead(t.profile)}

            <div class="pf-group-title">${t.profile}</div>
            <div class="pf-card pf-identity">
                ${this._avatar(u.avatar, '48px')}
                <div class="pf-hero-text">
                    <div class="pf-strong">${u.display_name || u.email}</div>
                    ${u.username ? html`<div class="pf-muted">@${u.username}</div>` : nothing}
                </div>
            </div>

            <div class="pf-group-title">${t.email}</div>
            <div class="pf-card"><iconify-icon class="pf-row-icon" icon="ri:mail-line"></iconify-icon><span class="pf-ellipsis">${u.email}</span></div>

            <div class="pf-group-title">${t.connected}</div>
            <div class="pf-card pf-list">
                ${this._identities.length ? this._identities.map((i) => html`
                    <div class="pf-item">
                        <iconify-icon class="pf-row-icon" icon=${PROVIDER_ICON[i.provider] || 'ri:links-line'}></iconify-icon>
                        <span class="pf-item-text">
                            <span class="pf-strong pf-cap">${i.provider}</span>
                            ${i.identity_data?.email ? html`<span class="pf-muted pf-ellipsis">${i.identity_data.email}</span>` : nothing}
                        </span>
                    </div>
                `) : html`<div class="pf-item"><iconify-icon class="pf-row-icon" icon=${PROVIDER_ICON[u.meta?.provider] || 'ri:links-line'}></iconify-icon><span class="pf-strong pf-cap">${u.meta?.provider || '—'}</span></div>`}
            </div>
            ${hasGoogle ? nothing : html`
                <button class="pf-btn pf-btn-ghost" type="button" ?disabled=${!!this._busy} @click=${() => this._dhLink('google')}>
                    <iconify-icon icon=${this._busy === 'link' ? 'ri:loader-4-line' : 'flat-color-icons:google'} class=${this._busy === 'link' ? 'pf-spin' : ''}></iconify-icon>${t.linkGoogle}
                </button>
            `}

            <div class="pf-group-title">${t.role}</div>
            ${this._roles(u)}

            <div class="pf-group-title">${t.devices}</div>
            <div class="pf-card pf-list">
                ${this._devices.map((d) => html`
                    <div class="pf-item">
                        <iconify-icon class="pf-row-icon" icon=${d.mobile ? 'ri:smartphone-line' : 'ri:computer-line'}></iconify-icon>
                        <span class="pf-item-text">
                            <span class="pf-strong">${d.name}</span>
                            <span class="pf-muted">${d.id === mine ? t.thisDevice : _ago(d.lastSeen, this.lang)}</span>
                        </span>
                        ${d.id === mine ? html`<span class="pf-dot" aria-hidden="true"></span>` : nothing}
                    </div>
                `)}
            </div>
            ${this._devices.length > 1 ? html`
                <button class="pf-btn pf-btn-ghost is-danger" type="button" ?disabled=${!!this._busy} @click=${this._dhSignOutOthers}>
                    <iconify-icon icon=${this._busy === 'others' ? 'ri:loader-4-line' : 'ri:logout-circle-r-line'} class=${this._busy === 'others' ? 'pf-spin' : ''}></iconify-icon>${t.signOutOthers}
                </button>
            ` : nothing}
            ${this._noticeTpl()}
        `
    }

    /** One row per table: "posts · Biên tập · Duyệt · Của mình" (hook/AUTH_V2.rst) — bundle tables with the same
     *  access fold into their main table's row. The account status only shows when it keeps roles from applying. */
    _roles(u) {
        const t = this._txt, a = ACCESS_TXT[this.lang] ?? ACCESS_TXT.vi
        const inactive = u.status && u.status !== 'active'
            ? html`<div class="pf-muted pf-role-note">${t.notActive} (${u.status})</div>` : nothing
        if (parseRoles(u).isAdmin) return html`
            <div class="pf-card"><iconify-icon class="pf-row-icon" icon="ri:shield-star-line"></iconify-icon><span class="pf-strong">Super Admin</span></div>${inactive}`
        const rows = accessRows(u)
        if (!rows.length) return html`
            <div class="pf-card"><iconify-icon class="pf-row-icon" icon="ri:user-line"></iconify-icon><span class="pf-muted">${t.noRole}</span></div>${inactive}`
        return html`
            <div class="pf-card pf-list">
                ${rows.map((r) => html`
                    <div class="pf-item">
                        <span class="pf-item-text">
                            <span class="pf-strong pf-cap">${r.table}</span>
                            ${r.with.length ? html`<span class="pf-muted pf-ellipsis">+ ${r.with.join(', ')}</span>` : nothing}
                        </span>
                        <span class="pf-access">${[
                            ...r.levels.map((l) => a.levels[l]),
                            r.scope === 'own' ? a.scopes.own : '',
                            r.custom.length ? `+${r.custom.length} ${a.custom}` : '',
                        ].filter(Boolean).join(' · ')}</span>
                    </div>
                `)}
            </div>
            ${inactive}
        `
    }

    _edit() {
        const t = this._txt, d = this._draft
        const uploading = this._busy === 'avatar'
        return html`
            ${this._subHead(t.editProfile)}
            <form class="pf-form" @submit=${this._dhSave} novalidate>
                <button class="pf-avatar pf-avatar-lg" type="button" aria-label=${t.changeAvatar} ?disabled=${!!this._busy} @click=${this._dhPickAvatar}>
                    ${this._avatar(d.avatar, '104px')}
                    <span class="pf-badge"><iconify-icon icon=${uploading ? 'ri:loader-4-line' : 'ri:pencil-line'} class=${uploading ? 'pf-spin' : ''}></iconify-icon></span>
                </button>
                <input id="pf-file" type="file" accept="image/*" hidden @change=${this._dhAvatarFile} />

                <label class="pf-label">${t.name}
                    <span class="pf-field">
                        <iconify-icon icon="ri:user-3-line"></iconify-icon>
                        <input type="text" autocomplete="name" .value=${d.name} placeholder=${t.namePh} @input=${(e) => this._dhDraft('name', e)} />
                    </span>
                </label>

                <label class="pf-label">${t.email}
                    <span class="pf-field">
                        <iconify-icon icon="ri:mail-line"></iconify-icon>
                        <input type="email" autocomplete="email" .value=${d.email} placeholder=${t.emailPh} @input=${(e) => this._dhDraft('email', e)} />
                    </span>
                </label>

                <label class="pf-label">${t.password}
                    <span class="pf-field">
                        <iconify-icon icon="ri:lock-password-line"></iconify-icon>
                        <input type=${this._showPw ? 'text' : 'password'} autocomplete="new-password" .value=${d.password} placeholder=${t.passwordPh} @input=${(e) => this._dhDraft('password', e)} />
                        <button class="pf-eye" type="button" aria-label="toggle password" @click=${() => (this._showPw = !this._showPw)}>
                            <iconify-icon icon=${this._showPw ? 'ri:eye-line' : 'ri:eye-off-line'}></iconify-icon>
                        </button>
                    </span>
                </label>

                <button class="pf-link" type="button" ?disabled=${!!this._busy} @click=${this._dhReset}>
                    <iconify-icon icon=${this._busy === 'reset' ? 'ri:loader-4-line' : 'ri:key-2-line'} class=${this._busy === 'reset' ? 'pf-spin' : ''}></iconify-icon>${t.resetPassword}
                </button>

                ${this._noticeTpl()}

                <button class="pf-btn pf-btn-main" type="submit" ?disabled=${!!this._busy}>
                    ${this._busy === 'save' ? html`<iconify-icon class="pf-spin" icon="ri:loader-4-line"></iconify-icon>` : nothing}${t.save}
                </button>
            </form>
        `
    }

    _language() {
        return html`
            ${this._subHead(this._txt.language)}
            <div class="pf-langs" role="radiogroup" aria-label=${this._txt.language}>
                ${LANGS.map((l) => html`
                    <button class="pf-lang" type="button" role="radio" aria-checked=${l.code === this.lang ? 'true' : 'false'} @click=${() => this._dhLang(l.code)}>
                        <iconify-icon class="pf-flag" icon=${l.flag}></iconify-icon>
                        <span class="pf-lang-label">${l.label}</span>
                        <span class="pf-radio ${l.code === this.lang ? 'is-on' : ''}"></span>
                    </button>
                `)}
            </div>
        `
    }

    _settings() {
        const t = this._txt
        const notify = this.user.meta?.settings?.notifications !== false
        return html`
            ${this._subHead(t.settings)}
            ${this._row({ icon: 'ri:notification-3-line', label: t.notifications, sub: t.notificationsSub, onClick: () => this._dhNotifications(), busy: this._busy === 'settings', trail: this._switch(notify, t.notifications) })}
            ${this._row({ icon: 'ri:moon-line', label: t.darkMode, onClick: () => this._dhTheme(), trail: this._switch(this.theme === 'dark', t.darkMode) })}
            ${this._devices.length > 1 ? this._row({ icon: 'ri:logout-circle-r-line', label: t.signOutOthers, onClick: () => this._dhSignOutOthers(), busy: this._busy === 'others', trail: nothing }) : nothing}
            ${this._row({ icon: 'ri:logout-box-r-line', label: t.signOut, onClick: () => this._dhSignOut(), danger: true, busy: this._busy === 'signout', trail: nothing })}
            ${this._noticeTpl()}
        `
    }

    render() {
        if (!this.user) return html``
        const view = { home: this._home, profile: this._profile, edit: this._edit, language: this._language, settings: this._settings }[this._view] ?? this._home
        // keyed: a fresh .pf-view per view, so its enter animation replays on every switch
        return html`<div class="pf">${keyed(this._view, html`<div class="pf-view">${view.call(this)}</div>`)}</div>`
    }
}

if (!customElements.get('svc-profile')) customElements.define('svc-profile', SvcProfile)
export default SvcProfile
