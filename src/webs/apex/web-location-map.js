import { LitElement, html, unsafeCSS } from 'lit'
import '@/webs/apex/web-text.js'
import css from './styles/web-location-map.css?inline'

// ── Leaflet loader ────────────────────────────────────────────────────────────
const LEAFLET_V   = '1.9.4'
const LEAFLET_JS  = `https://unpkg.com/leaflet@${LEAFLET_V}/dist/leaflet.js`
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_V}/dist/leaflet.css`

let _leafletReady = null

function _loadLeaflet() {
    if (window.L) return Promise.resolve()
    if (_leafletReady) return _leafletReady
    _leafletReady = new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = LEAFLET_JS
        s.onload  = resolve
        s.onerror = () => { _leafletReady = null; reject() }
        document.head.appendChild(s)
    })
    return _leafletReady
}

// Leaflet CSS is injected into document.head once (map lives in light DOM dialog)
let _leafletCssInjected = false
function _injectLeafletCss() {
    if (_leafletCssInjected) return
    _leafletCssInjected = true
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = LEAFLET_CSS
    document.head.appendChild(link)
}

// ── Nominatim reverse geocoding ───────────────────────────────────────────────
async function _reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi&addressdetails=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
    if (!res.ok) throw new Error('Nominatim error')
    return res.json()
}

function _parseNominatim(data) {
    const a = data.address ?? {}
    const house  = a.house_number ?? ''
    const road   = a.road ?? a.pedestrian ?? a.footway ?? ''
    const street = [house, road].filter(Boolean).join(' ').toLowerCase()
    const ward   = (a.suburb ?? a.quarter ?? a.neighbourhood ?? a.village ?? '')
        .toLowerCase().replace(/^(phường|xã|thị trấn)\s+/i, '')

    // Always scan display_name from the end for the last "Thành phố/Tỉnh X" segment.
    // \b cannot be used here — it doesn't match Vietnamese (non-ASCII) characters.
    // a.state is unreliable: Nominatim maps it to the municipality level (Thủ Đức)
    // rather than the province (Hồ Chí Minh), so display_name is the primary source.
    const dnParts = (data.display_name ?? '').split(',').map(s => s.trim())
    const regionRaw = [...dnParts].reverse().find(p => /^(thành phố|tỉnh)\s+/i.test(p))
        ?? a.state ?? a.city ?? ''
    const region = regionRaw.toLowerCase().replace(/^(thành phố|tỉnh)\s+/i, '')

    const country = (a.country ?? 'việt nam').toLowerCase()
    return { street, ward, region, country }
}

// ── Native <dialog> stylesheet (injected once into document.head) ─────────────
const DIALOG_CSS = `
.wlmap-modal {
    position: fixed; inset: 0; margin: 0; padding: 0; border: none;
    width: 100dvw; height: 100dvh;
    max-width: 100dvw; max-height: 100dvh;
    background: transparent;
}
.wlmap-modal[open] {
    display: flex; flex-direction: column;
}
.wlmap-modal::backdrop {
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(6px);
}
.wlmap-modal-inner {
    display: flex; flex-direction: column;
    height: 100%; width: 100%;
    background: var(--color-base-100, #0d0d0d);
}
.wlmap-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid color-mix(in oklab, var(--color-base-300, #393939) 60%, transparent);
    flex-shrink: 0;
}
.wlmap-modal-title {
    font-size: 16px; font-weight: 700;
    color: var(--color-base-content, #fff);
    font-family: var(--font-sans, system-ui);
}
.wlmap-modal-close {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; padding: 0;
    background: transparent;
    border: 1px solid color-mix(in oklab, var(--color-base-300, #393939) 60%, transparent);
    border-radius: 50%; cursor: pointer;
    color: var(--color-base-content, #fff); opacity: .6;
    transition: opacity .2s, background .2s;
}
.wlmap-modal-close:hover { opacity: 1; background: rgba(255,255,255,.08); }
.wlmap-modal-close svg { width: 16px; height: 16px; }
.wlmap-modal-map { flex: 1; min-height: 0; }
.wlmap-modal-footer {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; flex-shrink: 0;
    border-top: 1px solid color-mix(in oklab, var(--color-base-300, #393939) 60%, transparent);
    min-height: 60px;
}
.wlmap-modal-addr {
    flex: 1; min-width: 0;
    font-size: 13px; font-family: var(--font-sans, system-ui);
    color: var(--color-base-content, #fff);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wlmap-modal-confirm {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 18px; height: 34px; flex-shrink: 0;
    color: var(--color-primary, #2ebd85);
    border: 1px solid var(--color-primary, #2ebd85); border-radius: 8px;
    font-size: 13px; font-weight: 700; font-family: var(--font-sans, system-ui);
    cursor: pointer; transition: opacity .2s;
}
.wlmap-modal-confirm:hover { opacity: .85; }
.wlmap-modal-confirm svg { width: 14px; height: 14px; }
.wlmap-pin {
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--color-primary, #2ebd85);
    border: 2.5px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,.45);
}
`

let _dialogCssInjected = false
function _injectDialogCss() {
    if (_dialogCssInjected) return
    _dialogCssInjected = true
    const s = document.createElement('style')
    s.textContent = DIALOG_CSS
    document.head.appendChild(s)
}

const TXT_STD = {
    vi: {
        dialogTitle: 'Chọn vị trí',
        close:       'Đóng',
        confirmAddr: 'Xác nhận địa chỉ',
        geocoding:   'Đang xác định địa chỉ...',
        clearAddr:   'Xóa địa chỉ',
        addrPh:      'Nhập địa chỉ...',
        pickOnMap:   'Chọn vị trí trên bản đồ',
    },
    en: {
        dialogTitle: 'Pick a location',
        close:       'Close',
        confirmAddr: 'Confirm address',
        geocoding:   'Locating address...',
        clearAddr:   'Clear address',
        addrPh:      'Enter address...',
        pickOnMap:   'Pick location on map',
    },
}

export class WebLocationMap extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(css)]

    static properties = {
        value:        { type: String, reflect: true },
        placeholder:  { type: String },
        disabled:     { type: Boolean },
        geo:          { type: Boolean }, // true: value kèm lat~lng (street~ward~region~country~lat~lng)
        theme:        { type: String },
        ui:           { type: String },
        txt:   { type: Object },
        lang:  { type: String },
        _display:    { state: true },
        _parsed:     { state: true },
        _coords:     { state: true },
        _suggested:  { state: true },
        _geocoding:  { state: true },
        _confirmed:  { state: true },
    }

    static get uiConfigs() {
        return {
            modern:  { wrap: 'modern web-location-map' },
            spatial: { wrap: 'spatial web-location-map' },
        }
    }

    constructor() {
        super()
        this.value        = ''
        this.placeholder  = ''
        this.disabled     = false
        this.geo          = false
        this.theme        = ''
        this.ui           = 'modern'
        this.txt   = null
        this.lang  = 'vi'
        this._display    = ''
        this._parsed     = { street: '', ward: '', region: '', country: 'việt nam' }
        this._coords     = null
        this._suggested  = ''
        this._geocoding  = false
        this._confirmed  = false
        // private refs
        this._map      = null
        this._marker   = null
        this._dialogEl = null   // native <dialog> element in document.body
    }

    // ── LIFECYCLE ──────────────────────────────────────────────────────────────

    willUpdate(changed) {
        if (changed.has('value') && this.value?.includes('~')) {
            const [street = '', ward = '', region = '', country = 'việt nam', lat = '', lng = ''] = this.value.split('~')
            this._parsed  = { street, ward, region, country }
            this._display = [street, ward, region].filter(Boolean).join(', ')
            // geo: khôi phục lại pin + trạng thái "đã xác nhận" từ value đã lưu (vd mở lại
            // form sửa room) — không có nhánh này thì map luôn mở ở vị trí mặc định dù value
            // đã có toạ độ sẵn.
            if (this.geo && lat !== '' && lng !== '') {
                this._coords    = { lat: parseFloat(lat), lng: parseFloat(lng) }
                this._suggested = this._display
                this._confirmed = true
            }
        }
    }

    updated(changed) {
        if (changed.has('theme') && this.theme)  this.setAttribute('data-theme', this.theme)
        if (changed.has('theme') && !this.theme) this.removeAttribute('data-theme')
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._dialogEl?.remove()
        this._dialogEl = null
    }

    // ── DATA HEAD ──────────────────────────────────────────────────────────────

    _dhInput(e) {
        const val = e.detail?.value ?? e.target?.value ?? ''
        if (!val) {
            this._dhClear()
            return
        }
        this._display   = val
        this._confirmed = false
        this._parsed    = { street: val, ward: '', region: '', country: 'việt nam' }
        this.value      = this._comValueStr
        this._emit('input')
        this._emit('change')
    }

    _dhConfirm() {
        if (!this._suggested) return
        this._confirmed = true
        this.value      = this._comValueStr
        this._display   = this._suggested
        this._emit('change')
        this._emit('address-confirmed', { coords: this._coords, parsed: this._parsed })
    }

    _dhClear() {
        this._display   = ''
        this._parsed    = { street: '', ward: '', region: '', country: 'việt nam' }
        this._coords    = null
        this._suggested = ''
        this._confirmed = false
        this._geocoding = false
        this.value      = ''
        this._emit('change')
    }

    _dhPickOpen() {
        this._dfEnsureDialog()
        if (this.theme) this._dialogEl.setAttribute('data-theme', this.theme)
        this._dialogEl.showModal()
        this._dfInitMap()
    }

    _dhCloseMap() {
        this._dialogEl?.close()
    }

    // ── DATA FOOTER ──────────────────────────────────────────────────────────

    _dfEnsureDialog() {
        if (this._dialogEl) return
        _injectDialogCss()

        const dlg = document.createElement('dialog')
        dlg.className = 'wlmap-modal'
        dlg.innerHTML = `
            <div class="wlmap-modal-inner">
                <div class="wlmap-modal-header">
                    <span class="wlmap-modal-title">${this._txt.dialogTitle}</span>
                    <form method="dialog" style="margin:0">
                        <button type="submit" class="wlmap-modal-close" aria-label="${this._txt.close}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </form>
                </div>
                <div class="wlmap-modal-map" id="wlmap-map-canvas"></div>
                <div class="wlmap-modal-footer" id="wlmap-footer" style="display:none"></div>
            </div>
        `

        document.body.appendChild(dlg)
        this._dialogEl = dlg
    }

    _dfUpdateFooter() {
        if (!this._dialogEl) return
        const footer = this._dialogEl.querySelector('#wlmap-footer')
        if (!footer) return

        if (this._suggested && !this._geocoding) {
            footer.style.display = 'flex'
            footer.innerHTML = `
                <span class="wlmap-modal-addr">${this._suggested}</span>
                <form method="dialog" style="margin:0;display:contents">
                    <button type="submit" class="wlmap-modal-confirm" id="wlmap-confirm-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        ${this._txt.confirmAddr}
                    </button>
                </form>
            `
            footer.querySelector('#wlmap-confirm-btn').addEventListener('click', () => this._dhConfirm())
        } else {
            footer.style.display = 'none'
            footer.innerHTML = ''
        }
    }

    async _dfInitMap() {
        try { await _loadLeaflet() } catch { return }
        _injectLeafletCss()

        const el = this._dialogEl?.querySelector('#wlmap-map-canvas')
        if (!el) return

        const L = window.L

        if (this._map) {
            setTimeout(() => this._map.invalidateSize(), 50)
            if (this._coords) this._map.panTo([this._coords.lat, this._coords.lng])
            return
        }

        const center = this._coords ? [this._coords.lat, this._coords.lng] : [10.7769, 106.7009]

        this._map = L.map(el, { zoomControl: true }).setView(center, 15)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(this._map)

        const icon = L.divIcon({
            html: '<div class="wlmap-pin"></div>',
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        })

        this._marker = L.marker(center, { icon, draggable: true }).addTo(this._map)

        this._map.on('click', e => {
            this._dfSetLocation(e.latlng.lat, e.latlng.lng)
        })

        this._marker.on('dragend', e => {
            const ll = e.target.getLatLng()
            this._dfSetLocation(ll.lat, ll.lng)
        })

        // Chưa có pin nào (tạo mới, hoặc sửa 1 vị trí chưa từng lưu) — tự xin quyền vị trí
        // trình duyệt để gợi ý pin gần đúng vị trí hiện tại, user vẫn kéo sửa lại được. Từ
        // chối/lỗi/không hỗ trợ → im lặng bỏ qua, giữ bản đồ mặc định (không toast lỗi). Đã có
        // pin sẵn (this._coords, khôi phục từ `value` trong willUpdate()) → không tự xin lại.
        if (!this._coords && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => { if (!this._coords) this._dfSetLocation(pos.coords.latitude, pos.coords.longitude) },
                () => {},
                { timeout: 8000 },
            )
        }

        setTimeout(() => this._map.invalidateSize(), 80)
    }

    async _dfSetLocation(lat, lng) {
        this._coords    = { lat, lng }
        this._geocoding = true
        this._suggested = ''
        this._dfUpdateFooter()

        if (this._marker) this._marker.setLatLng([lat, lng])
        if (this._map)    this._map.panTo([lat, lng])

        try {
            const data      = await _reverseGeocode(lat, lng)
            this._suggested = data.display_name ?? ''
            this._parsed    = _parseNominatim(data)
            this._display   = this._suggested
        } catch {
            this._suggested = ''
        } finally {
            this._geocoding = false
            this._dfUpdateFooter()
        }
    }

    // ── HELPER ────────────────────────────────────────────────────────────────

    _emit(name, extra = {}) {
        this.dispatchEvent(new CustomEvent(name, {
            detail: { value: this.value, ...extra },
            bubbles: true,
            composed: true,
        }))
    }

    // ── COMPUTED ──────────────────────────────────────────────────────────────

    get _comValueStr() {
        const { street = '', ward = '', region = '', country = 'việt nam' } = this._parsed || {}
        const base = `${street}~${ward}~${region}~${country}`
        if (!this.geo) return base
        return `${base}~${this._coords?.lat ?? ''}~${this._coords?.lng ?? ''}`
    }

    get _comCoords() {
        if (!this._coords) return '—'
        return `${this._coords.lat.toFixed(5)}, ${this._coords.lng.toFixed(5)}`
    }

    get _comSuggested() {
        if (this._geocoding) return this._txt.geocoding
        return this._suggested || '—'
    }

    get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        const cfg        = this.constructor.uiConfigs[this.ui || 'modern']
        const hasConfirm = this._suggested && !this._geocoding && !this._confirmed

        return html`
            <div class="${cfg.wrap}">

                <div class="addr-row">
                    <web-text
                        class="addr-input"
                        .ui=${this.ui}
                        .theme=${this.theme}
                        .value=${this._display}
                        .placeholder=${this.placeholder || this._txt.addrPh}
                        ?disabled=${this.disabled}
                        clearable
                        @input=${this._dhInput}
                        @change=${this._dhInput}
                    ></web-text>

                    <web-text
                        class="coords-text"
                        .ui=${this.ui}
                        .theme=${this.theme}
                        .value=${this._comCoords}
                        prefix="📍"
                        disabled
                        style="cursor:pointer"
                        @click=${this._dhPickOpen}
                    ></web-text>
                </div>

                <div class="suggest-row">
                    <span class="suggest-text ${this._geocoding ? 'pulse' : ''}">
                        ${this._comSuggested}
                    </span>
                    <div class="suggest-actions">
                        ${this._confirmed ? html`
                            <button class="btn-icon clear" title="${this._txt.clearAddr}"
                                @click=${this._dhClear}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                                    stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        ` : hasConfirm ? html`
                            <button class="btn-icon confirm" title="${this._txt.confirmAddr}"
                                @click=${this._dhConfirm}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                                    stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="btn-icon pick" title="${this._txt.pickOnMap}"
                            @click=${this._dhPickOpen}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>

            </div>
        `
    }
}

if (!customElements.get('web-location-map')) {
    customElements.define('web-location-map', WebLocationMap)
}

export default WebLocationMap
