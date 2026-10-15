import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { cssInline } from '@/services/tools/util.js';
import { bgTemplate } from '@/packages/adopted/svc-underlay.js';
import { resolveLocale, resolveWhen, resolveValue, resolveEachSource, resolveMount, colorVars } from './tool/recursive-render.js';

// CSS Imports
import boxStyles from './css/web-box.css?inline';
import animeStyles from './css/anime.css?inline';
import './web-cell.js';
import './web-slider.js';
import './web-steps.js';
import './web-tabs.js';
import './web-expansion.js';

// ============================================================================
// OVERVIEW — web-box: the ONE generic recursive container of the
// web-board > web-boxs > web-box > web-cell stack (hook/DESIGN.rst + hook/ARCHITECT.rst).
//
// One instance renders one resolved `node` against a binding context
// `{record, item, index, records, lang}` — decided purely by node shape:
//
//   node.each set        → `_renderEach`      unrolls a collection, re-mounting itself per item
//                           in the shell `node.render` picks (grid/masonry/cards/slider/steps/tabs/expansion).
//   node.children array   → `_renderContainer` recurses into each child (12-col grid or `.jf` flex row).
//   otherwise (leaf)      → `_renderLeaf`      hands off to exactly one `<web-cell>`.
//
// `_mount()` is the recursion boundary: resolveMount() (preset + host/inner style split) for the CHILD,
// host style on the wrapper div, inner style rides along as the child's own `node.style`.
//
// Theme colors: only the ROOT box (`root`, set by web-boxs) writes the 5 color vars + data-theme on its
// host; every nested box/cell inherits them as CSS custom properties through the shadow roots.
// ============================================================================

// Scroll reveal: how long a box must stay on screen before its anime plays (rides out layout shifts at page load).
const REVEAL_SETTLE_MS = 120;
// Boxes revealed together (one screen, one scroll) stagger in the order they come in; a quiet gap starts over at 0.
const REVEAL_BURST_GAP_MS = 300;
let _revealCount = 0;
let _revealReset = null;
function revealSlot() {
    clearTimeout(_revealReset);
    _revealReset = setTimeout(() => { _revealCount = 0; }, REVEAL_BURST_GAP_MS);
    return _revealCount++;
}

// Missing col defaults to 12 (full row) — keeps un-spanned children of a structural grid stacking full-width.
function layoutCls(layout = {}) {
    const col = parseInt(layout?.col);
    const row = parseInt(layout?.row);
    return ['gi', `gi-col-${isNaN(col) ? 12 : col}`, !isNaN(row) ? `gi-row-${row}` : ''].filter(Boolean).join(' ');
}

const EACH_BUILDERS = {
    masonry: '_eachMasonry', cards: '_eachCards', slider: '_eachSlider',
    steps: '_eachNav', tabs: '_eachNav', expansion: '_eachNav',
};

export class WebBox extends LitElement {
    static properties = {
        node:       { type: Object }, // canonical node — already resolveMount()'d by whoever created this <web-box>
        record:     { type: Object }, // ctx.record — default binding target for every `source` path
        records:    { type: Array },  // ctx.records — top-level record list, target of each:'$records'
        item:       {},                // ctx.item — current loop value, reached only via '$item'/'$item.<path>'
        index:      { type: Number }, // ctx.index — also the scroll-reveal stagger position
        presets:    { type: Object },
        theme:      { type: String },
        mainColors: { type: String }, // "primary|secondary|accent|info|warning" — CSS vars by the root only; still forwarded for web-tabs/steps/expansion
        textColor:  { type: String },
        lang:       { type: String }, // 'vi' | 'en' — forward xuống web-cell / nav label i18n
        ui:         { type: String },
        zoom:       { type: Boolean }, // forward xuống web-cell → mode 'gallery'
        _revealed:  { state: true },   // scroll reveal (node props.anime): this box's own element came into view
        loading:    { type: Boolean }, // web-boxs đang tải → leaf hiện skeleton (web-loader)
        root:       { type: Boolean }, // true chỉ ở box do web-boxs mount — chủ sở hữu CSS color vars
    };

    static styles = [unsafeCSS(boxStyles), unsafeCSS(animeStyles)];

    constructor() {
        super();
        this.record  = {};
        this.records = [];
        this.index   = 0;
        this.presets = {};
        this.theme   = 'light';
        this.lang    = 'vi';
        this.ui      = 'modern';
    }

    willUpdate(changed) {
        if (this.root && (changed.has('theme') || changed.has('mainColors') || changed.has('textColor') || changed.has('root'))) {
            this.setAttribute('data-theme', this.theme || 'light');
            for (const [k, v] of Object.entries(colorVars(this.mainColors, this.textColor))) this.style.setProperty(k, v);
        }
    }

    get _ctx() {
        return { record: this.record || {}, item: this.item, index: this.index ?? 0, records: this.records || [], lang: this.lang };
    }

    // ── Scroll reveal (node props.anime / animeQueue) ─────────────────────────
    // Each box with `anime` watches ITS OWN element: the class goes on once that element has stayed on screen for
    // REVEAL_SETTLE_MS — a card below the fold animates when the visitor scrolls to it, not when the section's first
    // pixel shows, and a box only passing through the viewport while the page is still laying out (sections above
    // not sized yet) doesn't play off screen. Boxes that come into view together stagger by animeQueue, in the order
    // they appear (revealSlot); a later scroll starts a fresh stagger instead of waiting index × queue.
    _animeCls() { return this._revealed ? (this.node.props?.anime || '') : ''; }
    _animeStys() {
        if (!this.node.props?.anime) return {};
        const delay = (this._revealSlot || 0) * (parseInt(this.node.props.animeQueue) || 200) + 'ms';
        return { animationDelay: delay, opacity: this._revealed ? '' : '0' };
    }

    updated() {
        if (this.node?.props?.anime && !this._revealed) this._watchReveal();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchReveal();
    }

    _watchReveal() {
        const el = this.renderRoot?.firstElementChild; // the leaf / container div carrying the anime class
        if (!el || this._revealEl === el) return;
        this._unwatchReveal();
        this._revealEl = el;
        this._revealIo = new IntersectionObserver(([entry]) => {
            clearTimeout(this._revealTimer);
            if (!entry.isIntersecting) return;
            this._revealTimer = setTimeout(() => {
                this._revealSlot = revealSlot();
                this._revealed = true;
                this._unwatchReveal();
            }, REVEAL_SETTLE_MS);
        }, { threshold: 0.15 });
        this._revealIo.observe(el);
    }

    _unwatchReveal() {
        clearTimeout(this._revealTimer);
        this._revealIo?.disconnect();
        this._revealIo = null;
        this._revealEl = null;
    }

    // ── Recursion boundary ───────────────────────────────────────────────────
    // `bg` renders here UNLESS `child` carries `each` — an each-node's bg means "behind every item",
    // so it rides through and the per-ITEM `_mount` inside `_renderEach` renders it.
    _mount(child, ctx, cls) {
        const { host, inner, render, props } = resolveMount(child, ctx, this.presets);
        const isEach = child.each !== undefined;
        const mounted = { ...child, preset: undefined, style: inner, render, props, bg: isEach ? child.bg : undefined };
        const bgEl = !isEach && child.bg ? bgTemplate(child.bg) : nothing;
        // width:100% ở inner = leaf muốn lấp đầy hàng flex (button full-bleed); host.width = % đã dời ra wrapper, không phải fill
        const fillCls = inner?.width === '100%' && !host.width ? ' gi-fill' : '';
        return html`
            <div class="${cls}${fillCls}" style="${cssInline(host)}">
                ${bgEl}
                <web-box
                    .node=${mounted} .record=${ctx.record} .records=${ctx.records} .item=${ctx.item} .index=${ctx.index}
                    .presets=${this.presets} .theme=${this.theme} .mainColors=${this.mainColors} .lang=${this.lang} .ui=${this.ui}
                    .zoom=${this.zoom} .loading=${this.loading}
                ></web-box>
            </div>
        `;
    }

    _mountAll(list, template, ctx, cls, offset = 0) {
        return list.map((item, i) => this._mount(template, { ...ctx, item, index: offset + i }, cls));
    }

    // ── Leaf ──────────────────────────────────────────────────────────────────
    // Plain wrapper, NOT another grid — the parent's `_mount` wrapper already carries the span/flex sizing.
    _renderLeaf(ctx) {
        return html`
            <div class="${this._animeCls()}" style="${cssInline(this._animeStys())}">
                <web-cell
                    .mode=${this.node.render} .value=${resolveValue(this.node, ctx)} .props=${this.node.props || {}} .stys=${this.node.style || {}}
                    .record=${ctx.record} .item=${ctx.item} .lang=${this.lang} .ui=${this.ui} .zoom=${this.zoom} .loading=${this.loading}
                ></web-cell>
            </div>
        `;
    }

    // ── Container (static children, no loop) ─────────────────────────────────
    // Children with explicit layout.col → real 12-col grid (spans side by side); none → `.jf` flex row.
    _renderContainer(ctx) {
        const hasCols = this.node.children.some(c => c.layout?.col !== undefined);
        const cls = hasCols ? 'gi-wrap' : `gi-wrap jf jf-${this.node.layout?.justify || 'none'}`;
        return html`
            <div class="${cls} ${this._animeCls()}" style="${cssInline({ ...(this.node.style || {}), ...this._animeStys() })}">
                ${this.node.children.map(child => this._mount(child, ctx, layoutCls(child.layout)))}
            </div>
        `;
    }

    // ── Each ─────────────────────────────────────────────────────────────────
    _renderEach(ctx) {
        const list  = resolveEachSource(this.node.each, ctx);
        const props = this.node.props || {};
        // An each-node never renders as one element — its style/bg/children describe EACH item.
        const template = { children: this.node.children || [], style: this.node.style || {}, bg: this.node.bg, props: { anime: props.anime, animeQueue: props.animeQueue } };
        return this[EACH_BUILDERS[this.node.render] || '_eachGrid'](list, template, props, ctx);
    }

    // props.stretch → mọi item cao bằng item cao nhất cùng hàng (card style cần thêm height:'100%', xem .gi-stretch)
    _eachGrid(list, template, props, ctx, style = '') {
        const cls = `gi gi-col-${props.col || 12}${props.stretch ? ' gi-stretch' : ''}`;
        return html`<div class="gi-wrap" style="${style}">${this._mountAll(list, template, ctx, cls)}</div>`;
    }

    _eachCards(list, template, props, ctx) {
        const style = cssInline({ gap: props.gap, padding: props.padding });
        return this._eachGrid(list, template, props, ctx, style);
    }

    _eachMasonry(list, template, props, ctx) {
        return html`
            <div class="gi-masonry gi-masonry-${props.col || 3}" style="${props.gap ? `--masonry-gap:${props.gap}` : ''}">
                ${this._mountAll(list, template, ctx, 'gi')}
            </div>
        `;
    }

    _eachSlider(list, template, props, ctx) {
        return html`
            <web-slider class="gi-col-12" style="display:none"
                .autoplay=${props.autoplay} .marquee=${!!props.marquee} .reverse=${!!props.reverse} .loop=${props.loop}
                .mode=${props.mode} .vertical=${props.vertical} .slides=${props.slides || 1}
                .spacing=${props.spacing || 0} .nav=${props.nav} .dots=${props.dots} .origin=${props.origin}
                .effect=${props.effect || ''} ?blur=${!!props.blur} .maxHeight=${props.maxHeight || ''}
            >${this._mountAll(list, template, ctx, 'gi gi-col-12')}</web-slider>
        `;
    }

    // tabs/steps/expansion: 1 nav entry per `pack` items; label may be a {vi,en} bag.
    _eachNav(list, template, props, ctx) {
        const kind = this.node.render;
        const pack = props.pack || 1;
        const nav = [];
        for (let i = 0; i < list.length; i += pack) {
            const first = list[i];
            nav.push({
                id:     first[props.idField]    ?? `item-${nav.length}`,
                label:  resolveLocale(first[props.labelField], this.lang) ?? `Item ${nav.length + 1}`,
                icon:   first[props.iconField],
                status: first[props.statusField],
            });
        }
        const cls = `gi gi-col-${pack > 1 ? Math.round(12 / pack) : 12}`;
        const slots = nav.map((n, i) => html`<div slot="${n.id}"><div class="gi-wrap">
            ${this._mountAll(list.slice(i * pack, i * pack + pack), template, ctx, cls, i * pack)}
        </div></div>`);
        const active = props.active || nav[0]?.id || '';
        const size = props.size || 'md';
        if (kind === 'tabs')  return html`<web-tabs .tabs=${nav} .active=${active} .align=${props.align || 'left'} .size=${size} .ui=${this.ui} .theme=${this.theme} .mainColors=${this.mainColors}>${slots}</web-tabs>`;
        if (kind === 'steps') return html`<web-steps .steps=${nav} .active=${active} .size=${size} .ui=${this.ui} .theme=${this.theme} .mainColors=${this.mainColors}>${slots}</web-steps>`;
        return html`<web-expansion .panels=${nav} .active=${props.openFirst ? active : (props.active || '')} ?multiple=${!!props.multiple} .size=${size} .ui=${this.ui} .theme=${this.theme} .mainColors=${this.mainColors}>${slots}</web-expansion>`;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    render() {
        if (!this.node) return nothing;
        const ctx = this._ctx;
        if (!resolveWhen(this.node, ctx)) return nothing;
        if (this.node.each !== undefined) return this._renderEach(ctx);
        if (Array.isArray(this.node.children)) return this._renderContainer(ctx);
        return this._renderLeaf(ctx);
    }
}
if (!customElements.get('web-box')) customElements.define('web-box', WebBox);
