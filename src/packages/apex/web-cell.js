import { LitElement, html, nothing, unsafeCSS } from 'lit';
import cellStyles from './css/web-cell.css?inline';
import aStyles from './css/web-a.css?inline';
import animeStyles from './css/anime.css?inline';
import { cssInline, toPrice, humanizeLocation, locationLatLng } from '@/services/tools/util.js';
import { resolveLocale, resolvePath, safeUrl } from './tool/recursive-render.js';
import { iconLabel } from './tool/a11y.js';
import 'iconify-icon';
import './web-button.js';
import './web-dropdown.js';
import './web-rating.js';
import './web-popover.js';
import './web-loader.js';
import './web-gallery.js';
import './web-letters.js';
import './web-google-map.js';
import '@/packages/adopted/svc-player.js';
import '@/packages/adopted/svc-photor.js';

// ============================================================================
// OVERVIEW — web-cell (leaf renderer of the web-board > web-boxs > web-box >
// web-cell recursive stack, see hook/DESIGN.rst + hook/ARCHITECT.rst).
//
// Renders EXACTLY ONE leaf node — `{ mode, value, props, stys }` — resolved
// upstream by web-box (source/preset/deepMerge/host-inner split all happen
// there; web-cell never walks the schema tree). `mode` picks a renderer from
// the registry below; theme colors are NOT re-applied here — the root
// <web-box> sets them once and CSS custom properties inherit through every
// shadow root. Only the node's own `--*` style keys land on this host.
// ============================================================================

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// prefix/suffix: icon khi có iconSize, text span khi không; bỏ margin khi không có text kế bên
const iconPart = (icon, size, side, hasContent = true) => {
    if (!icon) return nothing;
    const m = hasContent ? (side === 'pre' ? 'margin-right:0.375rem;' : 'margin-left:0.375rem;') : '';
    return size
        ? html`<iconify-icon .icon=${icon} aria-hidden="true" style="${m}vertical-align:middle;font-size:${size}"></iconify-icon>`
        : html`<span>${icon}</span>`;
};

// ── Registry ────────────────────────────────────────────────────────────────

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

// Mode-specific props — only the CURRENT mode's entry is evaluated (no URL/location work for a plain <p>).
const MODE_PROPS = {
    icon:         (c, v)    => ({ icon: v }),
    rating:       (c, v)    => ({ value: parseFloat(String(v || '0~0').split('~')[0]) || 0 }),
    badge:        (c, v, d) => ({ content: d }),
    a:            (c, v, d) => ({ content: c.props?.label ?? d, href: c._resolveOrg(c.props?.org) }),
    // alt: props.alt/tip/cap, không có thì lấy title của item/record (ảnh thẻ/hero minh hoạ chính nội dung đó)
    gallery:      (c, v)    => ({ src: v, alt: c.props?.alt || c.props?.tip || c.props?.cap || resolveLocale(c.item?.title ?? c.record?.title, c.lang) || '', href: c._resolveOrg(c.props?.org), zoom: !!c.zoom }),
    'google-map': (c, v)    => ({ address: humanizeLocation(v), ...locationLatLng(v) }),
};

/**
 * WebCell (leaf renderer) — resolves `{mode, value, props}` into the matching
 * `web-<mode>` renderer. `mode` (not `render`) — `render` collides with LitElement.render().
 */
export class WebCell extends LitElement {
    static properties = {
        lang:    { type: String }, // 'vi' | 'en' — resolveLocale() cho value dạng { vi, en }
        record:  { type: Object }, // record hiện tại — href template ({field}) và cell-action detail
        item:    {},               // item của each đang lặp — path '$item.<field>' trong org/stys
        mode:    { type: String }, // tên renderer, vd 'h1' | 'button' | 'gallery' — schema field gốc là `render`
        value:   {},               // giá trị đã resolve (resolveValue trong recursive-render.js)
        props:   { type: Object }, // bag props của node
        loading: { type: Boolean },
        stys:    {},               // inner style đã tách host/inner ở web-box — object, hoặc string path
        ui:      { type: String },
        zoom:    { type: Boolean }, // forward xuống mode 'gallery'
    };

    static styles = [unsafeCSS(cellStyles), unsafeCSS(animeStyles)];

    constructor() {
        super();
        this._vars = [];
        this._onClick = (e) => {
            // A renderer that reports its own value (web-button, web-dropdown, rating…) sends a CustomEvent carrying
            // detail.value; a plain text renderer (span, p, h1…) only lets the native click through, whose `detail` is the
            // click count — its value is then this cell's own text, in the language shown (e.g. a pricing card's button).
            let value = e instanceof CustomEvent ? e.detail?.value : resolveLocale(this.value, this.lang);
            if (e?.detail?.name === 'rating' && this._ratingRaw !== undefined) {
                const [avg, count] = this._ratingRaw.split('~').map(Number);
                value = `${((avg * count + value) / (count + 1)).toFixed(1)}~${count + 1}`;
            }
            this.dispatchEvent(new CustomEvent('cell-action', {
                detail: { action: this.props?.action || e?.detail?.name || 'click', value, info: this.item ?? this.record },
                bubbles: true, composed: true,
            }));
        };
    }

    connectedCallback() {
        super.connectedCallback();
        // On the HOST so the event is caught after it exits the renderer's shadow root
        this.addEventListener('click', this._onClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('click', this._onClick);
    }

    // Cùng quy ước path với source: '$item.<field>' đọc item của each, path thường đọc record
    get _pathCtx() { return { record: this.record, item: this.item }; }

    get _resolvedStys() {
        return typeof this.stys === 'string' ? (resolvePath(this.stys, this._pathCtx) || {}) : (this.stys || {});
    }

    // Node style may carry CSS custom properties (`--card-gap`…) — they must sit on the host to reach the renderer.
    updated(changed) {
        if (!changed.has('stys') && !changed.has('record') && !changed.has('item')) return;
        const next = Object.entries(this._resolvedStys).filter(([k]) => k.startsWith('--'));
        for (const k of this._vars) if (!next.some(([n]) => n === k)) this.style.removeProperty(k);
        for (const [k, v] of next) this.style.setProperty(k, v);
        this._vars = next.map(([k]) => k);
    }

    // props.org: literal URL/path, `{field}` template, or a field path holding a pre-built URL — always
    // passed through safeUrl() since both the template and the field come from record data.
    _resolveOrg(org) {
        if (!org || org === '#') return '#';
        if (org.includes('{')) return safeUrl(org.replace(/\{([^}]+)\}/g, (_, path) => resolvePath(path.trim(), this._pathCtx) ?? ''));
        if (org.startsWith('/') || org.includes('://')) return safeUrl(org);
        const nested = resolvePath(org, this._pathCtx);
        return nested && nested !== '#' ? safeUrl(nested) : '#';
    }

    _cellProps() {
        const { mode, props = {}, ui, loading } = this;
        const value = resolveLocale(this.value, this.lang);
        const display = props.currency !== undefined ? toPrice(value, props.lang, props.currency)
            : props.location ? humanizeLocation(value)
            : value;
        if (mode === 'rating') this._ratingRaw = value || '0~0';
        return {
            cls: '', ui: ui || 'modern',
            ...props, stys: this._resolvedStys, opt: props, loading,
            ...(MODE_PROPS[mode]?.(this, value, display) ?? { content: display }),
        };
    }

    render() {
        if (!this.mode) return nothing;
        return DynamicComponent.render(this.mode.startsWith('web-') ? this.mode : `web-${this.mode}`, this._cellProps());
    }
}
if (!customElements.get('web-cell')) customElements.define('web-cell', WebCell);

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
        iconSize: { type: String },
        label:    { type: String }, // aria-label — cần cho link chỉ có icon (không có content)
    };
    static styles = [unsafeCSS(aStyles)];
    render() {
        if (this.loading) return html`<web-loader width="${randomInt(30, 70)}%" height="1.2rem"></web-loader>`;
        const target = this.target || '_self';
        // Tên truy cập: label > content (chữ hiển thị) > chữ trong slot > tên icon (dự phòng cuối)
        const label = this.label || (this.content || this.textContent.trim() ? '' : iconLabel(this.prefix || this.suffix));
        return html`
            <a href="${safeUrl(this.href)}" target="${target}" rel="${target === '_blank' ? 'noopener noreferrer' : nothing}"
                aria-label=${label || nothing}
                class="${this.ui || ''} ${this.cls || ''}" style="${cssInline(this.stys || {})}">
                ${iconPart(this.prefix, this.iconSize, 'pre', !!this.content)}
                ${this.content || ''}
                ${iconPart(this.suffix, this.iconSize, 'suf', !!this.content)}
                <slot></slot>
            </a>`;
    }
}
if (!customElements.get('web-a')) customElements.define('web-a', WebA);

// ─── RENDERERS ────────────────────────────────────────────────────────────────

// h1–h6 / p / span đều là <web-letters tag=…> — 1 renderer dùng chung, chỉ khác tag + style mặc định.
const lettersRenderer = (tag, baseStys = {}) => (p) => {
    const o = p.opt || {};
    return html`<web-letters tag="${tag}" flex="${p.stys?.flex ?? 'unset'}"
        .content=${p.content} .prefix=${o.prefix} .suffix=${o.suffix} .iconSize=${o.iconSize}
        .cls=${p.cls} .loading=${p.loading} .stys=${{ ...baseStys, ...(p.stys || {}) }} .ui=${p.ui}
        .motion=${o.motion ?? false} .effect=${o.effect ?? 'zoomIn'} .word=${o.word ?? false}
        .loop=${o.loop ?? false} .duration=${o.duration ?? 950} .delay=${o.delay ?? 70}
    ></web-letters>`;
};

const renderers = {
    'web-p':    lettersRenderer('p'),
    'web-span': lettersRenderer('span', { display: 'inline-block' }),
    ...Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(t => [`web-${t}`, lettersRenderer(t)])),

    // props.ariaLabel → aria-label (props.label ở mode 'a' đã là CHỮ hiển thị của link, xem MODE_PROPS.a)
    'web-a': p => html`<web-a .content=${p.content} .label=${p.opt?.ariaLabel} .prefix=${p.opt?.prefix} .suffix=${p.opt?.suffix} .iconSize=${p.opt?.iconSize} .href=${p.href} .target=${p.target} .cls=${p.cls} .loading=${p.loading} .stys=${p.stys} .ui=${p.ui}></web-a>`,

    'web-gallery': p => html`<web-gallery .src=${p.src} .alt=${p.alt} .href=${p.href} .cls=${p.cls} .rounded=${p.rounded} .float=${p.float} .loading=${p.loading} .stys=${p.stys} .ui=${p.ui} ?blur=${!!p.blur} ?zoom=${!!p.zoom}></web-gallery>`,

    'web-google-map': p => html`<web-google-map .address=${p.address} .lat=${p.lat} .lng=${p.lng} .zoom=${p.opt?.zoom} .rounded=${p.opt?.rounded} .height=${p.opt?.height} .stys=${p.stys} .cls=${p.cls}></web-google-map>`,

    // YouTube/Vimeo/TikTok/native video via svc-player (`content` = URL); opt.fill → cover sizing for background video.
    'web-player': p => {
        const o = p.opt || {};
        return html`<svc-player
            .src=${p.content} .poster=${o.poster || ''} .control=${o.control ?? false} .autoPlay=${o.autoPlay ?? false}
            .mute=${o.mute ?? false} .loops=${o.loops ?? false} .fill=${o.fill ?? false} .ratio=${o.ratio ?? (16 / 9)}
            .rounded=${o.rounded ?? '8px'} .ui=${p.ui} style=${cssInline(p.stys || {})}
        ></svc-player>`;
    },

    // display:block — inline icon trong :host block tạo line-box strut, cao thêm ~7px so với flex item
    // Icon trang trí → aria-hidden; có props.ariaLabel (icon mang nghĩa riêng, không có chữ đi kèm) → role="img".
    'web-icon': p => p.loading
        ? html`<web-loader width="24px" height="24px"></web-loader>`
        : html`<iconify-icon icon="${p.icon}" role=${p.opt?.ariaLabel ? 'img' : nothing} aria-label=${p.opt?.ariaLabel || nothing} aria-hidden=${p.opt?.ariaLabel ? nothing : 'true'} class="${p.ui || ''} ${p.cls || ''}" style="${cssInline({ display: 'block', fontSize: p.size || '1.5rem', color: p.color || 'inherit', ...(p.stys || {}) })}"></iconify-icon>`,

    'web-button': p => {
        const o = p.opt || {};
        return html`<web-button
            .type=${o.type || ''} .color=${o.color} .height=${o.height} .rounded=${o.rounded}
            .square=${o.square} .prefix=${o.prefix} .suffix=${o.suffix} .iconSize=${o.iconSize} .label=${o.ariaLabel}
            .fontSize=${o.fontSize} .padding=${o.padding} .loading=${p.loading}
            .disabled=${p.disabled || o.disabled} .stys=${p.stys || {}} .ui=${p.ui}
        >${p.content || o.text}</web-button>`;
    },

    'web-rating': p => html`<web-rating .value=${p.value} .max=${p.max} .half=${p.half ?? true} .size=${p.size} .mask=${p.mask} .color=${p.color} .disabled=${p.disabled} .prefix=${p.opt?.prefix} .suffix=${p.opt?.suffix} .iconSize=${p.opt?.iconSize} .cls=${p.cls} .loading=${p.loading} .stys=${p.stys} .ui=${p.ui}></web-rating>`,

    'web-badge': p => {
        const { color = '', type = 'fill', prefix, suffix, iconSize } = p.opt || {};
        return html`<web-button mode="badge" .color=${color} .type=${type} .loading=${p.loading} .stys=${p.stys || {}} .ui=${p.ui} .prefix=${prefix} .suffix=${suffix} .iconSize=${iconSize}>${p.content}</web-button>`;
    },

    'web-tags': p => {
        const { color = 'primary', type = 'fill', gap = '0.5rem' } = p.opt || {};
        const tags = Array.isArray(p.content) ? p.content : typeof p.content === 'string' ? p.content.split('|').filter(Boolean) : [];
        return html`<div style="display:flex;flex-wrap:wrap;gap:${gap};${cssInline(p.stys || {})}">
            ${tags.map(tag => html`<web-button mode="badge" .color=${color} .type=${type} .ui=${p.ui}>${tag}</web-button>`)}
        </div>`;
    },

    'web-dropdown': p => {
        const { items = [], label = '', icon = '', placement = '', placementGap, ...opt } = p.opt || {};
        const bit = p.content || '';
        const isIcon = typeof bit === 'string' && bit.includes(':');
        return html`<web-dropdown
            .label=${isIcon ? label : (bit || label)} .icon=${isIcon ? bit : (p.icon || icon)} .items=${p.items || items}
            .loading=${p.loading} .cls=${p.cls} .stys=${p.stys} .ui=${p.ui}
            .placement=${placement} .placementGap=${placementGap} .opt=${opt}
        ></web-dropdown>`;
    },

    'svc-photor': p => html`<svc-photor
        .value=${p.content ?? ''} .multiple=${p.opt?.multiple ?? false}
        .placeholder=${p.opt?.placeholder ?? 'Upload ảnh...'} .height=${p.opt?.height ?? '36px'} .ui=${p.ui}
    ></svc-photor>`,

    'web-popover': p => {
        const { placement = '', placementGap } = p.opt || {};
        return html`<web-popover .placement=${placement} .placementGap=${placementGap} .ui=${p.ui} .loading=${p.loading} .stys=${p.stys}>
            <iconify-icon slot="trigger" icon="${p.icon || 'ri:information-line'}" style="cursor:pointer;vertical-align:middle;font-size:${p.iconSize || '1.25rem'};color:${p.iconColor || 'inherit'}"></iconify-icon>
            ${p.content || ''}
        </web-popover>`;
    },
};

for (const [name, render] of Object.entries(renderers)) registerComponent(name, render);
