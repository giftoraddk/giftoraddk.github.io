import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-ranger.css?inline'

// Single-thumb range slider — wraps a native <input type="range"> (free keyboard/touch/a11y
// support) and re-styles its track/thumb via CSS custom properties computed here (--wr-fill for
// the filled portion, --wr-color for theming). `ticks` takes explicit value-space positions
// (not just an even step) so a caller can mark meaningful boundaries (eg. budget tier cutoffs)
// rather than every native `step` increment.
export class WebRanger extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        min:        { type: Number },
        max:        { type: Number },
        step:       { type: Number },
        value:      { type: Number },
        disabled:   { type: Boolean },
        ticks:      { type: Array },      // explicit tick positions in value-space, eg [0, 200000, 500000]
        showValue:  { type: Boolean },    // floating value bubble above the thumb
        showMinMax: { type: Boolean },    // min/max labels under the track
        format:     { attribute: false }, // (value) => string — optional display formatter, raw value if unset
        color:      { type: String },
        ui:         { type: String },     // modern | spatial
        theme:      { type: String },
    }

    static get uiConfigs() {
        return {
            modern:  { wrap: 'modern web-ranger' },
            spatial: { wrap: 'spatial web-ranger' },
        }
    }

    constructor() {
        super()
        this.min = 0
        this.max = 100
        this.step = 1
        this.value = 0
        this.disabled = false
        this.ticks = []
        this.showValue = true
        this.showMinMax = true
        this.format = null
        this.color = 'primary'
        this.ui = 'modern'
        this.theme = ''
    }

    updated(changed) {
        if (changed.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changed.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
    }

    _pctOf(v) {
        const span = this.max - this.min
        return span > 0 ? Math.min(100, Math.max(0, ((v - this.min) / span) * 100)) : 0
    }

    _display(v) {
        return typeof this.format === 'function' ? this.format(v) : v
    }

    _handleInput(e) {
        e.stopPropagation() // native `input` is composed — would otherwise also bubble out under our own CustomEvent name below
        this.value = Number(e.target.value)
        this._emit('input')
    }

    _handleChange(e) {
        e.stopPropagation() // see _handleInput
        this.value = Number(e.target.value)
        this._emit('change')
    }

    _emit(name) {
        this.dispatchEvent(new CustomEvent(name, {
            detail: { value: this.value },
            bubbles: true,
            composed: true,
        }))
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        const pct = this._pctOf(this.value)
        // Center the value bubble over the native thumb — the thumb's own travel range shrinks
        // by half its width at each end, so a plain `left:${pct}%` would drift outside the thumb
        // near 0%/100%. 18 below must match the thumb width set in web-ranger.css.
        const thumbSize = 18
        const offset = thumbSize / 2 - (pct / 100) * thumbSize

        return html`
            <div class="${uiConfig.wrap} ${this.disabled ? 'disabled' : ''}" style="--wr-color: var(--color-${this.color || 'primary'})">
                ${this.showValue ? html`
                    <div class="wr-value" style="left: calc(${pct}% + ${offset}px)">${this._display(this.value)}</div>
                ` : ''}
                <div class="wr-track-wrap">
                    <input
                        type="range"
                        class="wr-input"
                        style="--wr-fill: ${pct}%"
                        min=${this.min}
                        max=${this.max}
                        step=${this.step}
                        .value=${String(this.value)}
                        ?disabled=${this.disabled}
                        @input=${this._handleInput}
                        @change=${this._handleChange}
                    />
                    ${this.ticks?.length ? html`
                        <div class="wr-ticks">
                            ${this.ticks.map((t) => html`<span class="wr-tick" style="left: ${this._pctOf(t)}%"></span>`)}
                        </div>
                    ` : ''}
                </div>
                ${this.showMinMax ? html`
                    <div class="wr-minmax">
                        <span>${this._display(this.min)}</span>
                        <span>${this._display(this.max)}</span>
                    </div>
                ` : ''}
            </div>
        `
    }
}

if (!customElements.get('web-ranger')) {
    customElements.define('web-ranger', WebRanger)
}

export default WebRanger
