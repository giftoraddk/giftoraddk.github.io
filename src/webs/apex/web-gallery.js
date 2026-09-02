import { LitElement, html, nothing, unsafeCSS } from 'lit';
import galleryStyles from './styles/web-gallery.css?inline';
import { cssInline } from '@/services/helper.js';
import './web-slider.js';
import './web-loader.js';

/**
 * WebGallery
 *
 * Props:
 * - src:     (String) URL đơn hoặc nhiều URL cách nhau bằng '|' (vd: 'a.jpg|b.jpg|c.jpg')
 * - alt:     (String) Alt text (dùng cho ảnh đơn).
 * - loading: (Boolean) Hiện skeleton loader.
 * - rounded: (String) Border-radius. Mặc định '4px'.
 * - float:   (String) CSS float cho chế độ ảnh đơn. Mặc định 'left'.
 * - cls:     (String) Class bổ sung cho img (chế độ ảnh đơn).
 * - stys:    (Object) Inline styles.
 * - ui:      (String) UI variant 'modern' | 'spatial'. Mặc định 'modern'.
 * - zoom:    (Boolean) Chế độ ảnh đơn: click vào ảnh mở popup zoom thay vì dispatch 'clicked'.
 *
 * Behaviour:
 * - 1 ảnh  → giống web-image; click dispatch event 'clicked' (hoặc mở popup zoom nếu `zoom`).
 * - 2+ ảnh → stack tối đa 3 tấm; click mở popup full-screen với web-slider.
 */
export class WebGallery extends LitElement {
    static properties = {
        src:     { type: String },
        alt:     { type: String },
        href:    { type: String },
        loading: { type: Boolean },
        rounded: { type: String },
        float:   { type: String },
        cls:     { type: String },
        stys:    { type: Object },
        ui:      { type: String },
        reverse: { type: Boolean },
        blur:    { type: Boolean },
        zoom:    { type: Boolean },
        _open:   { state: true },
    };

    static styles = [unsafeCSS(galleryStyles)];

    constructor() {
        super();
        this.src     = '';
        this.alt     = '';
        this.href    = '';
        this.loading = false;
        this.rounded = '4px';
        this.float   = 'left';
        this.cls     = '';
        this.stys    = {};
        this.ui      = 'modern';
        this.reverse = false;
        this.blur    = false;
        this.zoom    = false;
        this._open   = false;
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    updated(changed) {
        if (!changed.has('_open')) return;
        const d = this.shadowRoot?.querySelector('dialog.gallery-dialog');
        if (!d) return;
        if (this._open && !d.open) d.showModal();
        else if (!this._open && d.open) d.close();
    }

    // ==========================================
    // COMPUTED
    // ==========================================

    get _comImages() {
        if (!this.src) return [];
        return this.src.split('|').map(s => s.trim()).filter(Boolean);
    }

    // ==========================================
    // DATA HEAD — user input handlers
    // ==========================================

    _dhClickSingle() {
        if (this.loading) return;
        if (this.zoom) { this._open = true; return; }
        this.dispatchEvent(new CustomEvent('clicked', {
            detail: { name: 'gallery', value: this.src },
            bubbles: true, composed: true,
        }));
    }

    _dhClickStack() {
        if (this.loading) return;
        this._open = true;
    }

    _dhCloseDialog() {
        this._open = false;
    }

    // ==========================================
    // RENDER
    // ==========================================

    render() {
        const imgs = this._comImages;
        if (imgs.length === 0) return nothing;
        if (imgs.length === 1) return html`${this._rbSingle(imgs[0])}${this._rbDialog(imgs)}`;
        return html`${this._rbStack(imgs)}${this._rbDialog(imgs)}`;
    }

    // [1] _rbSingle — chế độ ảnh đơn, giống web-image
    _rbSingle(src) {
        if (this.loading) {
            return html`<web-loader .stys=${{ width: '100%', 'aspect-ratio': '1/1', height: 'auto' }}></web-loader>`;
        }
        const baseStyle = `border-radius:${this.rounded || '4px'};float:${this.float || 'left'}`;
        const inner = this.blur
            ? html`
                <div class="gallery-single blur" style="border-radius:${this.rounded || '4px'};${cssInline(this.stys || {})};display:flex;justify-content:center;align-items:center">
                    <div class="gsb-bg" style="background-image:url(${src})"></div>
                    <img
                        src="${src}"
                        alt="${this.alt || ''}"
                        class="${this.ui || ''} ${this.cls || ''}"
                        @click=${this._dhClickSingle}
                    />
                </div>`
            : html`
                <div class="gallery-single" style="${baseStyle}">
                    <img
                        src="${src}"
                        alt="${this.alt || ''}"
                        class="${this.ui || ''} ${this.cls || ''} image-hover-zoom"
                        style="${cssInline(this.stys || {})}"
                        @click=${this._dhClickSingle}
                    />
                </div>`;
        return (this.href && this.href !== '#')
            ? html`<a href="${this.href}">${inner}</a>`
            : inner;
    }

    // [2] _rbStack — nhiều ảnh: web-slider (nav/dots tắt), click mở popup full-screen
    _rbStack(imgs) {
        return html`
            <div
                class="gallery-stack"
                @click=${this._dhClickStack}
                style="border-radius:${this.rounded || '4px'};${cssInline(this.stys || {})}"
            >
                <web-slider
                    .images=${imgs}
                    ?nav=${false}
                    ?dots=${true}
                    ?loop=${true}
                    .autoplay=${3000}
                    ?reverse=${this.reverse}
                    justify="end"
                    placement="bottom"
                    .ui=${this.ui || 'modern'}
                    ?blur=${this.blur}
                ></web-slider>
            </div>`;
    }

    // [3] _rbDialog — popup full-screen với web-slider
    _rbDialog(imgs) {
        return html`
            <dialog
                class="gallery-dialog"
                @close=${this._dhCloseDialog}
                @click=${(e) => { if (e.target === e.currentTarget) this._dhCloseDialog(); }}
            >
                <div class="popup-inner">
                    <button class="popup-close" @click=${this._dhCloseDialog}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                    <web-slider
                        .images=${imgs}
                        ?nav=${true}
                        ?dots=${true}
                        ?loop=${true}
                        .ui=${this.ui || 'modern'}
                        ?blur=${this.blur}
                    ></web-slider>
                </div>
            </dialog>`;
    }
}

if (!customElements.get('web-gallery')) {
    customElements.define('web-gallery', WebGallery);
}
