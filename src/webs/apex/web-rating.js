import { LitElement, html, unsafeCSS } from 'lit';
import { cssInline } from '@/services/helper.js';
import ratingStyles from './styles/web-rating.css?inline';
import maskStyles from './styles/mask.css?inline';

export class WebRating extends LitElement {
    static properties = {
        value:    { type: Number },
        max:      { type: Number },
        half:     { type: Boolean }, // enable half-star mode
        disabled: { type: Boolean },
        color:    { type: String },
        mask:     { type: String }, // any mask-* class: mask-star-2, mask-heart, mask-diamond …
        size:     { type: String }, // xs, sm, md, lg, xl
        cls:      { type: String },
        stys:     { type: Object },
        loading:  { type: Boolean },
        ui:       { type: String }, // modern | spatial
        prefix:   { type: String },
        suffix:   { type: String },
        iconSize: { type: String },
    };

    static get uiConfigs() {
        return {
            modern:  { wrap: 'modern rating',       star: 'mask' },
            spatial: { wrap: 'spatial rating glass', star: 'mask opacity-80' },
        };
    }

    static styles = [unsafeCSS(ratingStyles), unsafeCSS(maskStyles)];

    constructor() {
        super();
        this.value    = 0;
        this.max      = 5;
        this.half     = true;
        this.disabled = false;
        this.color    = 'primary';
        this.mask     = 'mask-star-2';
        this.size     = 'md';
        this.cls      = '';
        this.stys     = {};
        this.ui       = 'modern';
    }

    render() {
        if (this.loading) {
            return html`<web-loader width="120px" height="24px" mb="0"></web-loader>`;
        }

        const max   = this.max || 5;
        const half  = this.half;
        const raw   = this.value || 0;
        // Round to nearest 0.5 in half mode, nearest 1 in full mode
        const value = half ? Math.round(raw * 2) / 2 : Math.round(raw);

        const uiCfg      = this.constructor.uiConfigs[this.ui || 'modern'];
        const starBase   = `${uiCfg.star} ${this.mask} color-${this.color}`;
        const wrapClass  = `${uiCfg.wrap} rating-${this.size}${half ? ' rating-half' : ''} ${this.cls}`.trim();
        const inlineStyle = cssInline(this.stys || {});
        const groupName  = `rating-${Math.random().toString(36).slice(2, 9)}`;

        const inputs = [];
        for (let i = 1; i <= max; i++) {
            if (half) {
                const hv = i - 0.5;
                inputs.push(html`<input type="radio" name="${groupName}"
                    class="${starBase} mask-half-1"
                    .value="${hv}" ?checked="${value === hv}" ?disabled="${this.disabled}"
                    @change="${() => this._handleChange(hv)}" />`);
                inputs.push(html`<input type="radio" name="${groupName}"
                    class="${starBase} mask-half-2"
                    .value="${i}"  ?checked="${value === i}"  ?disabled="${this.disabled}"
                    @change="${() => this._handleChange(i)}" />`);
            } else {
                inputs.push(html`<input type="radio" name="${groupName}"
                    class="${starBase}"
                    .value="${i}" ?checked="${value === i}" ?disabled="${this.disabled}"
                    @change="${() => this._handleChange(i)}" />`);
            }
        }

        const prefIcon = this.iconSize && this.prefix;
        const suffIcon = this.iconSize && this.suffix;

        return html`
            <div class="${wrapClass}" style="${inlineStyle}">
                ${this.prefix
                    ? (prefIcon
                        ? html`<iconify-icon .icon=${this.prefix} style="margin-right:.375rem;vertical-align:middle;font-size:${this.iconSize};"></iconify-icon>`
                        : html`<span class="prefix-rating">${this.prefix}</span>`)
                    : ''}
                ${inputs}
                ${this.suffix
                    ? (suffIcon
                        ? html`<iconify-icon .icon=${this.suffix} style="margin-left:.375rem;vertical-align:middle;font-size:${this.iconSize};"></iconify-icon>`
                        : html`<span class="suffix-rating">${this.suffix}</span>`)
                    : ''}
            </div>
        `;
    }

    _handleChange(val) {
        if (this.disabled) return;
        this.value = val;
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: val },
            bubbles: true,
            composed: true,
        }));
    }
}

if (!customElements.get('web-rating')) {
    customElements.define('web-rating', WebRating);
}
