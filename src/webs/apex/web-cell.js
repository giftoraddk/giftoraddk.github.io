import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import animeStyles from './styles/anime.css?inline';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { cssInline, toPrice, humanizeLocation, locationLatLng } from '@/services/helper.js';
import 'iconify-icon';
import './web-button.js';
import './web-dropdown.js';
import './web-rating.js';
import './web-popover.js';
import './web-photor-upload.js';
import './web-loader.js';
import './web-gallery.js';
import './web-letters.js';
import './web-google-map.js';
import '@/webs/media/svc-player.js';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Shared helper: render prefix/suffix as icon (khi có iconSize) hoặc text span
// hasContent: skip margin khi không có text kế bên
const iconPart = (icon, size, side, hasContent = true) => {
    if (!icon) return nothing;
    const m = hasContent ? (side === 'pre' ? 'margin-right:0.375rem;' : 'margin-left:0.375rem;') : '';
    return size
        ? html`<iconify-icon .icon=${icon} style="${m}vertical-align:middle;font-size:${size}"></iconify-icon>`
        : html`<span>${icon}</span>`;
};

/**
 * ============================================================================
 * DYNAMIC COMPONENT REGISTRY
 * Quản lý việc đăng ký và render các component động
 * ============================================================================
 */

const componentRegistry = new Map();

export const registerComponent = (name, renderer) => componentRegistry.set(name, renderer);
export const getComponent     = (name) => componentRegistry.get(name) || null;

export class DynamicComponent {
    static render(name, props = {}) {
        const renderer = getComponent(name);
        if (!renderer) return nothing;
        try { return renderer(props); }
        catch (e) { console.error(`[web-cell] render error [${name}]:`, e); return nothing; }
    }
}

/**
 * WebCell (Cell Renderer)
 * Nội dung: Container trung gian, phân tích 'info' để gọi các hàm render component con tương ứng.
 */
export class WebCell extends LitElement {
    static properties = {
        theme:      { type: String },
        mainColors: { type: String },
        textColor:  { type: String },
        lang:       { type: String }, // 'vi' | 'en' — dùng bởi _resolveLocale() cho field data dạng { vi, en }
        info:       { type: Object },
        loading:    { type: Boolean },
        justify:    { type: String },
        makes:      { type: Array },
        stys:       { type: Object },
        ui:         { type: String },
        zoom:       { type: Boolean }, // forward xuống mode 'gallery' — chỉ web-board bật cho section products
    };

    static styles = [
        css`
            :host { display: block; }
            .jf         { display: flex; flex-wrap: wrap; row-gap: 0.5rem; }
            .jf-left    { justify-content: flex-start; }
            .jf-center  { justify-content: center; }
            .jf-right   { justify-content: flex-end; }
            .jf-between { justify-content: space-between; }
            .jf-none    { display: block; }
            .jf-overflow{ overflow: hidden; }
        `,
        unsafeCSS(animeStyles),
    ];

    updated(changed) {
        super.updated(changed);
        if (changed.has('theme') || changed.has('mainColors') || changed.has('textColor')) {
            this._applyCSS();
        }
    }

    _applyCSS() {
        this.setAttribute('data-theme', this.theme || 'light');
        Object.entries(this._allStyles).forEach(([k, v]) => {
            if (k.startsWith('--')) this.style.setProperty(k, v);
        });
    }

    get _colors() {
        const [primary = '#2ebd85', secondary = '#f5465c', accent = '#a855f7', info = '#00c7d4', warning = '#fbbf24']
            = (this.mainColors || '').split('|').map(c => c.trim());
        return { primary, secondary, accent, info, warning };
    }

    get _allStyles() {
        const c = this._colors;
        return {
            ...this.stys,
            '--color-primary':      c.primary,
            '--color-secondary':    c.secondary,
            '--color-accent':       c.accent,
            '--color-info':         c.info,
            '--color-warning':      c.warning,
            '--color-base-content': this.textColor || 'inherit',
        };
    }

    _nestedValue(obj, path) {
        if (!path || !obj) return undefined;
        return path.split('.').reduce((a, k) => a?.[k], obj);
    }

    // Cho phép field data (hoặc bitLocal) là object đa ngôn ngữ { vi: '...', en: '...' } thay vì
    // string thường — chọn đúng theo this.lang (BtnLang.astro), fallback 'vi' rồi tới key đầu
    // tiên có mặt. String thường đi qua đây không đổi gì (an toàn ngược cho mọi nơi khác dùng
    // web-cell mà chưa cần đa ngôn ngữ).
    _resolveLocale(val) {
        if (val && typeof val === 'object' && !Array.isArray(val) && (val.vi !== undefined || val.en !== undefined)) {
            return val[this.lang || 'vi'] ?? val.vi ?? Object.values(val)[0];
        }
        return val;
    }

    _renderItem(item) {
        const { bit, ext = {}, opt = {} } = item;
        const mode = opt.mode || 'p';
        const displayBit = ext.currency !== undefined ? toPrice(bit, ext.lang, ext.currency)
            : ext.location ? humanizeLocation(bit)
            : bit;
        if (mode === 'rating') this._ratingRaw = bit || '0~0';
        const scoreAvg = mode === 'rating' ? (parseFloat(String(bit || '0~0').split('~')[0]) || 0) : 0;
        // `ext.org` chấp nhận 3 dạng: literal URL/path tĩnh (bắt đầu bằng '/' hoặc chứa '://' — vd
        // CTA "Xem thêm" trỏ cố định 1 trang, không gắn theo item nào), template chứa {field}
        // (vd '/product/{id}' — build URL trực tiếp từ field có sẵn trên item, không cần page gọi
        // tự inject thêm field URL riêng), HOẶC field path tra cứu nguyên 1 URL đã dựng sẵn trong
        // data của item (vd 'meta.url' — xem docs/DESIGN.rst's bảng Cell modes).
        const _resolveOrg = (orgField) => {
            if (!orgField || orgField === '#') return '#';
            if (orgField.includes('{')) {
                return orgField.replace(/\{([^}]+)\}/g, (_, path) => this._nestedValue(this.info, path.trim()) ?? '');
            }
            if (orgField.startsWith('/') || orgField.includes('://')) return orgField;
            const nested = this._nestedValue(this.info, orgField);
            return (nested && nested !== '#') ? nested : '#';
        };
        const modeProps = {
            icon:   { icon: bit },
            rating: { value: scoreAvg },
            badge:  { content: displayBit },
            a:      { content: ext.label ?? displayBit, href: _resolveOrg(ext.org) },
            gallery:{ src: bit, alt: ext.tip || ext.cap || '', href: _resolveOrg(ext.org), zoom: !!this.zoom },
            // bit = field location đầy đủ (vd meta.address, format street~ward~region~country
            // ~lat~lng) — 1 field duy nhất vừa cho địa chỉ hiển thị vừa cho toạ độ map, không
            // cần field lat/lng riêng nữa (xem docs/CHANNEL.rst § rooms Schema).
            'google-map': { address: humanizeLocation(bit), ...locationLatLng(bit) },
        };
        const resolvedStys = typeof opt.stys === 'string'
            ? (this._nestedValue(this.info, opt.stys) || {})
            : (opt.stys || {});
        const props = {
            cls: '', stys: {}, ui: this.ui || 'modern',
            ...opt, stys: resolvedStys, opt, loading: this.loading,
            ...(modeProps[mode] || { content: displayBit }),
        };
        return DynamicComponent.render(mode.startsWith('web-') ? mode : `web-${mode}`, props);
    }

    connectedCallback() {
        super.connectedCallback();
        this._onClickedBound = (e) => {
            const makeAction = Array.isArray(this.makes)
                ? this.makes.find(m => m.opt?.action)?.opt?.action
                : null;
            let value = e?.detail?.value;
            if (e?.detail?.name === 'rating' && this._ratingRaw !== undefined) {
                const [avg, count] = this._ratingRaw.split('~').map(Number);
                const newAvg = (avg * count + value) / (count + 1);
                value = `${newAvg.toFixed(1)}~${count + 1}`;
            }
            this.dispatchEvent(new CustomEvent('cell-action', {
                detail: {
                    action: makeAction || e?.detail?.name || 'click',
                    value,
                    info:   this.info,
                },
                bubbles:  true,
                composed: true,
            }));
        };
        // Listen on the HOST element so the event is caught after it exits the shadow root
        this.addEventListener('clicked', this._onClickedBound);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('clicked', this._onClickedBound);
    }

    render() {
        const info  = this.info  || {};
        const makes = this.makes || [];
        const inlineStyle = cssInline(this._allStyles);
        const jCls = `jf jf-${this.justify || 'none'}`;

        const items = makes.length
            ? makes.map((make) => {
                const val = make.bitLocal !== undefined
                    ? this._resolveLocale(make.bitLocal)
                    : this._resolveLocale(this._nestedValue(info, make.bit));
                return { ...make, bit: val };
            })
            : Object.entries(info)
                .filter(([k]) => !['cls', 'justify'].includes(k))
                .map(([, v]) => ({
                    bit: typeof v === 'object' ? v.bit : v,
                    ext: typeof v === 'object' ? v.ext : {},
                    opt: typeof v === 'object' ? v.opt : { mode: 'p' },
                }));

        return html`
            <div class="${this.theme || ''} ${this.ui || 'modern'} ${jCls}" style="${inlineStyle}">
                ${items.map(item => this._renderItem(item))}
            </div>
        `;
    }
}
customElements.define('web-cell', WebCell);


// ─── WEB-H1 ~ WEB-H6 ─────────────────────────────────────────────────────────

const createH = (tag) => class extends LitElement {
    static properties = {
        content:  { type: String },
        loading:  { type: Boolean },
        cls:      { type: String },
        stys:     { type: Object },
        ui:       { type: String },
        prefix:   { type: String },
        suffix:   { type: String },
        iconSize: { type: String },
    };
    static styles = css`
        :host { display: block; cursor: pointer; }
        .h { margin: 0; padding: 0; line-height: 1.2; font-weight: 700; }
    `;
    _handleClick() {
        if (this.loading) return;
        this.dispatchEvent(new CustomEvent('clicked', {
            detail: { name: tag, value: this.content },
            bubbles: true, composed: true,
        }));
    }
    render() {
        const T = unsafeStatic(tag);
        return staticHtml`
            <${T} class="h ${this.ui || ''} ${this.cls || ''}" style="${cssInline({ ...(this.stys || {}) })}" @click=${this._handleClick}>
                ${iconPart(this.prefix, this.iconSize, 'pre', !!this.content)}
                ${this.loading ? html`<web-loader width="${randomInt(30, 90)}%" height="1em"></web-loader>` : (this.content || '')}
                ${iconPart(this.suffix, this.iconSize, 'suf', !!this.content)}
                <slot></slot>
            </${T}>`;
    }
};

// ─── WEB-P ────────────────────────────────────────────────────────────────────

export class WebP extends LitElement {
    static properties = {
        content:  { type: String },
        loading:  { type: Boolean },
        cls:      { type: String },
        stys:     { type: Object },
        ui:       { type: String },
        prefix:   { type: String },
        suffix:   { type: String },
        iconSize: { type: String },  // fix: was missing, caused icons to never size correctly
    };
    static styles = css`
        :host { display: block; cursor: pointer; }
        p { margin: 0; line-height: 1.25; text-align: justify; }
        .truncate { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
    `;
    _handleClick() {
        if (this.loading) return;
        this.dispatchEvent(new CustomEvent('clicked', {
            detail: { name: 'p', value: this.content },
            bubbles: true, composed: true,
        }));
    }
    render() {
        return html`
            <p class="${this.ui || ''} ${this.cls || ''}" style="${cssInline(this.stys || {})}" @click=${this._handleClick}>
                ${iconPart(this.prefix, this.iconSize, 'pre', !!this.content)}
                ${this.loading ? html`<web-loader width="${randomInt(30, 90)}%" height="1.35rem"></web-loader>` : (this.content || '')}
                ${iconPart(this.suffix, this.iconSize, 'suf', !!this.content)}
                <slot></slot>
            </p>`;
    }
}
customElements.define('web-p', WebP);

// ─── WEB-A ────────────────────────────────────────────────────────────────────

export class WebA extends LitElement {
    static properties = {
        content:  { type: String },
        href:     { type: String },
        target:   { type: String },
        loading:  { type: Boolean },
        cls:      { type: String },
        stys:     { type: Object },
        ui:       { type: String },
        prefix:   { type: String },
        suffix:   { type: String },
        iconSize: { type: String },  // fix: was missing
    };
    static styles = css`
        :host { display: inline; cursor: pointer; }
        a { text-decoration: none; color: inherit; transition: opacity 0.2s; }
        a:hover { opacity: 0.8; }
    `;
    render() {
        if (this.loading) return html`<web-loader width="${randomInt(30, 70)}%" height="1.2rem"></web-loader>`;
        return html`
            <a href="${this.href || '#'}" target="${this.target || '_self'}" class="${this.ui || ''} ${this.cls || ''}" style="${cssInline(this.stys || {})}">
                ${iconPart(this.prefix, this.iconSize, 'pre', !!this.content)}
                ${this.content || ''}
                ${iconPart(this.suffix, this.iconSize, 'suf', !!this.content)}
                <slot></slot>
            </a>`;
    }
}
customElements.define('web-a', WebA);

// ─── RENDERER REGISTRATION ────────────────────────────────────────────────────

// Shared animation props from opt → web-letters
const lettersProps = (p, extraStys = {}) => ({
    content:  p.content,
    prefix:   p.opt?.prefix,
    suffix:   p.opt?.suffix,
    iconSize: p.opt?.iconSize,
    cls:      p.cls,
    loading:  p.loading,
    ui:       p.ui,
    stys:     { ...extraStys, ...(p.stys || {}) },
    motion:   p.opt?.motion   ?? false,
    effect:   p.opt?.effect   ?? 'zoomIn',
    word:     p.opt?.word     ?? false,
    loop:     p.opt?.loop     ?? true,
    duration: p.opt?.duration ?? 950,
    delay:    p.opt?.delay    ?? 70,
    flex:     p.stys?.flex    ?? 'unset'
});

const renderers = [
    {
        name: 'web-p',
        render: p => { const lp = lettersProps(p); return html`<web-letters tag="p"
            .content=${lp.content} .prefix=${lp.prefix} .suffix=${lp.suffix} .iconSize=${lp.iconSize} flex="${lp.flex}"
            .cls=${lp.cls} .loading=${lp.loading} .stys=${lp.stys} .ui=${lp.ui}
            .motion=${lp.motion} .effect=${lp.effect} .word=${lp.word}
            .loop=${lp.loop} .duration=${lp.duration} .delay=${lp.delay}
        ></web-letters>`; },
    },
    {
        name: 'web-span',
        render: p => { const lp = lettersProps(p, { display: 'inline-block' }); return html`<web-letters tag="span" flex="${lp.flex}"
            .content=${lp.content} .prefix=${lp.prefix} .suffix=${lp.suffix} .iconSize=${lp.iconSize}
            .cls=${lp.cls} .loading=${lp.loading} .stys=${lp.stys} .ui=${lp.ui}
            .motion=${lp.motion} .effect=${lp.effect} .word=${lp.word}
            .loop=${lp.loop} .duration=${lp.duration} .delay=${lp.delay}
        ></web-letters>`; },
    },
    {
        name: 'web-a',
        render: p => html`<web-a .content=${p.content} .prefix=${p.opt?.prefix} .suffix=${p.opt?.suffix} .iconSize=${p.opt?.iconSize} .href=${p.href} .target=${p.target} .cls=${p.cls} .loading=${p.loading} .stys=${p.stys} .ui=${p.ui}></web-a>`,
    },
    {
        name: 'web-gallery',
        render: p => html`<web-gallery .src=${p.src} .alt=${p.alt} .href=${p.href} .cls=${p.cls} .rounded=${p.rounded} .float=${p.float} .loading=${p.loading} .stys=${p.stys} .ui=${p.ui} ?blur=${!!p.blur} ?zoom=${!!p.zoom}></web-gallery>`,
    },
    {
        name: 'web-google-map',
        render: p => html`<web-google-map .address=${p.address} .lat=${p.lat} .lng=${p.lng} .zoom=${p.opt?.zoom} .rounded=${p.opt?.rounded} .height=${p.opt?.height} .stys=${p.stys} .cls=${p.cls}></web-google-map>`,
    },
    {
        // Embeds YouTube/Vimeo/TikTok/native video via svc-player. `content` = video URL.
        // opt.fill=true → full-bleed "cover" sizing so it works as a background video
        // inside an absolutely-positioned group (see hero/spatialVideoNeatApex.js).
        // Note: unlike the old raw-iframe mode this replaced, arbitrary non-video
        // embeds (e.g. a Google Maps iframe) are no longer supported here.
        name: 'web-player',
        render: p => {
            const o = p.opt || {};
            return html`<svc-player
                .src=${p.content}
                .poster=${o.poster || ''}
                .control=${o.control ?? false}
                .autoPlay=${o.autoPlay ?? false}
                .mute=${o.mute ?? false}
                .loops=${o.loops ?? false}
                .fill=${o.fill ?? false}
                .ratio=${o.ratio ?? (16 / 9)}
                .rounded=${o.rounded ?? '8px'}
                .ui=${p.ui}
                style=${cssInline(p.stys || {})}
            ></svc-player>`;
        },
    },
    {
        name: 'web-icon',
        render: p => {
            if (p.loading) return html`<web-loader width="24px" height="24px"></web-loader>`;
            return html`<iconify-icon icon="${p.icon}" class="${p.ui || ''} ${p.cls || ''}" style="${cssInline({ fontSize: p.size || '1.5rem', color: p.color || 'inherit', ...(p.stys || {}) })}"></iconify-icon>`;
        },
    },
    {
        name: 'web-button',
        render: p => {
            const o = p.opt || {};
            return html`<web-button
                .type=${o.type || ''} .color=${o.color} .height=${o.height} .rounded=${o.rounded}
                .square=${o.square} .prefix=${o.prefix} .suffix=${o.suffix} .iconSize=${o.iconSize}
                .fontSize=${o.fontSize} .padding=${o.padding} .loading=${p.loading}
                .disabled=${p.disabled || o.disabled} .stys=${p.stys || {}} .ui=${p.ui}
            >${p.content || o.text}</web-button>`;
        },
    },
    {
        name: 'web-rating',
        render: p => html`<web-rating .value=${p.value} .max=${p.max} .half=${p.half ?? true} .size=${p.size} .mask=${p.mask} .color=${p.color} .disabled=${p.disabled} .prefix=${p.opt?.prefix} .suffix=${p.opt?.suffix} .iconSize=${p.opt?.iconSize} .cls=${p.cls} .loading=${p.loading} .stys=${p.stys} .ui=${p.ui}></web-rating>`,
    },
    {
        name: 'web-badge',
        render: p => {
            const { color = '', type = 'fill' } = p.opt || {};
            return html`<web-button mode="badge" .color=${color} .type=${type} .loading=${p.loading} .stys=${p.stys || {}} .ui=${p.ui} .prefix=${p.opt?.prefix} .suffix=${p.opt?.suffix} .iconSize=${p.opt?.iconSize}>${p.content}</web-button>`;
        },
    },
    {
        name: 'web-tags',
        render: p => {
            const { color = 'primary', type = 'fill', gap = '0.5rem' } = p.opt || {};
            const tags = Array.isArray(p.content)
                ? p.content
                : typeof p.content === 'string'
                    ? p.content.split('|').filter(Boolean)
                    : [];
            return html`<div style="display:flex;flex-wrap:wrap;gap:${gap};${cssInline(p.stys || {})}">
                ${tags.map(tag => html`<web-button mode="badge" .color=${color} .type=${type} .ui=${p.ui}>${tag}</web-button>`)}
            </div>`;
        },
    },
    {
        name: 'web-dropdown',
        render: p => {
            const { items = [], label = '', icon = '', placement = '', placementGap, ...opt } = p.opt || {};
            const bit = p.content || '';
            const isIcon = typeof bit === 'string' && bit.includes(':');
            return html`<web-dropdown
                .label=${isIcon ? label : (bit || label)}
                .icon=${isIcon ? bit : (p.icon || icon)}
                .items=${p.items || items}
                .loading=${p.loading} .cls=${p.cls} .stys=${p.stys} .ui=${p.ui}
                .placement=${placement} .placementGap=${placementGap} .opt=${opt}
            ></web-dropdown>`;
        },
    },
    {
        name: 'web-photor-upload',
        render: p => html`<web-photor-upload
            .value=${p.content ?? ''}
            .multiple=${p.opt?.multiple ?? false}
            .placeholder=${p.opt?.placeholder ?? 'Upload ảnh...'}
            .height=${p.opt?.height ?? '36px'}
            .ui=${p.ui}
        ></web-photor-upload>`,
    },
    {
        name: 'web-popover',
        render: p => {
            const { placement = '', placementGap } = p.opt || {};
            return html`<web-popover .placement=${placement} .placementGap=${placementGap} .ui=${p.ui} .loading=${p.loading} .stys=${p.stys}>
                <iconify-icon slot="trigger" icon="${p.icon || 'ri:information-line'}" style="cursor:pointer;vertical-align:middle;font-size:${p.iconSize || '1.25rem'};color:${p.iconColor || 'inherit'}"></iconify-icon>
                ${p.content || ''}
            </web-popover>`;
        },
    },
];

// Register h1-h6: define custom element + renderer trong cùng 1 loop
['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((t) => {
    customElements.define(`web-${t}`, createH(t));
    renderers.push({
        name: `web-${t}`,
        render: p => { const lp = lettersProps(p); return html`<web-letters tag="${t}"
            .content=${lp.content} .prefix=${lp.prefix} .suffix=${lp.suffix} .iconSize=${lp.iconSize}
            .cls=${lp.cls} .loading=${lp.loading} .stys=${lp.stys} .ui=${lp.ui}
            .motion=${lp.motion} .effect=${lp.effect} .word=${lp.word}
            .loop=${lp.loop} .duration=${lp.duration} .delay=${lp.delay}
        ></web-letters>`; },
    });
});

renderers.forEach(r => registerComponent(r.name, r.render));
