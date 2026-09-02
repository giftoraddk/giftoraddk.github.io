import { LitElement, html, unsafeCSS } from 'lit'
import '@/webs/apex/web-text.js'
import '@/webs/apex/web-location-map.js'
import css from './styles/web-location.css?inline'

const TXT_STD = {
    vi: {
        basic:    'Cơ bản',
        map:      'Bản đồ',
        streetPh: 'Địa chỉ (số nhà, tên đường)',
        wardPh:   'Phường / Xã',
        regionPh: 'Tỉnh / Thành phố',
    },
    en: {
        basic:    'Basic',
        map:      'Map',
        streetPh: 'Address (house number, street name)',
        wardPh:   'Ward / Commune',
        regionPh: 'Province / City',
    },
}

const COUNTRY_DEFAULT = 'việt nam'

function _encode({ street = '', ward = '', region = '', country = COUNTRY_DEFAULT } = {}) {
    return `${street}~${ward}~${region}~${country}`
}

function _decode(str = '') {
    const [street = '', ward = '', region = '', country = COUNTRY_DEFAULT] = str.split('~')
    return { street, ward, region, country }
}

export class WebLocation extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(css)]

    static properties = {
        value:        { type: String, reflect: true },
        apiKey:       { type: String },
        theme:        { type: String },
        ui:           { type: String },
        disabled:     { type: Boolean },
        txt:   { type: Object },
        lang:  { type: String },
        _mode:        { state: true },
        _parts:       { state: true },
    }

    static get uiConfigs() {
        return {
            modern:  { wrap: 'modern web-location' },
            spatial: { wrap: 'spatial web-location' },
        }
    }

    constructor() {
        super()
        this.value        = ''
        this.apiKey       = 'AIzaSyAAq_3rBXv_JZgDNmNZMuIARuTCkkyf1VY'
        this.theme        = ''
        this.ui           = 'modern'
        this.disabled     = false
        this.txt   = null
        this.lang  = 'vi'
        this._mode        = 'basic'
        this._parts       = { street: '', ward: '', region: '', country: COUNTRY_DEFAULT }
    }

    // ── LIFECYCLE ──────────────────────────────────────────────────────────────

    willUpdate(changed) {
        if (changed.has('value') && this.value) {
            this._parts = _decode(this.value)
        }
    }

    updated(changed) {
        if (changed.has('theme') && this.theme)  this.setAttribute('data-theme', this.theme)
        if (changed.has('theme') && !this.theme) this.removeAttribute('data-theme')
    }

    // ── DATA HEAD ──────────────────────────────────────────────────────────────

    _dhField(key, e) {
        const val = e.detail?.value ?? e.target?.value ?? ''
        this._parts = { ...this._parts, [key]: val }
        this._dfEmit()
    }

    _dhMode(mode) {
        this._mode = mode
    }

    _dhAddressChange(e) {
        // web-address emits ~ format on every change
        const raw = e.detail?.value ?? ''
        if (raw && raw !== this.value) {
            this.value  = raw
            this._parts = _decode(raw)
            this._emit(raw)
        }
    }

    _dhAddressConfirmed(e) {
        // web-address confirmed — e.detail.value is the ~ format string
        const raw = e.detail?.value ?? ''
        this.value  = raw
        this._parts = _decode(raw)
        this._emit(raw)
    }

    // ── DATA FOOTER ──────────────────────────────────────────────────────────

    _dfEmit() {
        this.value = _encode(this._parts)
        this._emit(this.value)
    }

    // ── HELPER ────────────────────────────────────────────────────────────────

    _emit(value) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value },
            bubbles: true,
            composed: true,
        }))
    }

    get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

    // ── RENDER BODY ──────────────────────────────────────────────────────────

    _rbModeToggle() {
        return html`
            <div class="mode-tabs">
                <button class="mode-tab ${this._mode === 'basic' ? 'active' : ''}"
                    @click=${() => this._dhMode('basic')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    ${this._txt.basic}
                </button>
                <button class="mode-tab ${this._mode === 'advanced' ? 'active' : ''}"
                    @click=${() => this._dhMode('advanced')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${this._txt.map}
                </button>
            </div>
        `
    }

    _rbBasic() {
        const p = this._parts
        return html`
            <div class="basic-fields">
                <div class="field-full">
                    <web-text
                        .ui=${this.ui}
                        .theme=${this.theme}
                        .value=${p.street}
                        placeholder="${this._txt.streetPh}"
                        ?disabled=${this.disabled}
                        clearable
                        @input=${e  => this._dhField('street', e)}
                        @change=${e => this._dhField('street', e)}
                    ></web-text>
                </div>
                <div class="field-row">
                    <div>
                        <web-text
                            .ui=${this.ui}
                            .theme=${this.theme}
                            .value=${p.ward}
                            placeholder="${this._txt.wardPh}"
                            ?disabled=${this.disabled}
                            clearable
                            @input=${e  => this._dhField('ward', e)}
                            @change=${e => this._dhField('ward', e)}
                        ></web-text>
                    </div>
                    <div>
                        <web-text
                            .ui=${this.ui}
                            .theme=${this.theme}
                            .value=${p.region}
                            placeholder="${this._txt.regionPh}"
                            ?disabled=${this.disabled}
                            clearable
                            @input=${e  => this._dhField('region', e)}
                            @change=${e => this._dhField('region', e)}
                        ></web-text>
                    </div>
                </div>
            </div>
        `
    }

    _rbAdvanced() {
        return html`
            <web-location-map
                .ui=${this.ui}
                .theme=${this.theme}
                .value=${this.value}
                ?disabled=${this.disabled}
                @change=${this._dhAddressChange}
                @address-confirmed=${this._dhAddressConfirmed}
            ></web-location-map>
        `
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        const cfg = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
            <div class="${cfg.wrap}">
                ${this._rbModeToggle()}
                <div class="mode-panel ${this._mode === 'basic' ? 'active' : ''}">${this._rbBasic()}</div>
                <div class="mode-panel ${this._mode === 'advanced' ? 'active' : ''}">${this._rbAdvanced()}</div>
            </div>
        `
    }
}

if (!customElements.get('web-location')) {
    customElements.define('web-location', WebLocation)
}

export default WebLocation
