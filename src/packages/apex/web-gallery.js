import { LitElement, html, nothing, unsafeCSS } from 'lit';
import galleryStyles from './css/web-gallery.css?inline';
import { cssInline } from '@/services/tools/util.js';
import './web-glide.js';
import './web-lightbox.js';
import './web-loader.js';
import { a11yTxt } from './tool/a11y.js';

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
 * - ui:      (String) UI variant 'modern' | 'pastel'. Mặc định 'modern'.
 * - zoom:    (Boolean) Chế độ ảnh đơn: click vào ảnh mở popup zoom thay vì dispatch 'click'.
 *
 * Behaviour:
 * - 1 ảnh  → giống web-image; click dispatch event 'click' (hoặc mở popup zoom nếu `zoom`).
 * - 2+ ảnh → slideshow flipX (web-glide); click mở popup full-screen.
 * Popup = web-lightbox: ảnh lớn, nhiều ảnh thì slider hiệu ứng flipX (nút trước/sau, chấm, phím ←/→, vuốt).
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
        this.dispatchEvent(new CustomEvent('click', {
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

    // Phần tử không phải <button> nhưng bấm được (ảnh zoom, stack) — Enter/Space kích hoạt như click.
    _dhKeyActivate(e, fn) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        fn.call(this);
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
                        role=${this.zoom ? 'button' : nothing} tabindex=${this.zoom ? '0' : nothing}
                        aria-label=${this.zoom && !this.alt ? a11yTxt('open') : nothing}
                        @keydown=${this.zoom ? (e) => this._dhKeyActivate(e, this._dhClickSingle) : null}
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
                        role=${this.zoom ? 'button' : nothing} tabindex=${this.zoom ? '0' : nothing}
                        aria-label=${this.zoom && !this.alt ? a11yTxt('open') : nothing}
                        @keydown=${this.zoom ? (e) => this._dhKeyActivate(e, this._dhClickSingle) : null}
                        @click=${this._dhClickSingle}
                    />
                </div>`;
        return (this.href && this.href !== '#')
            ? html`<a href="${this.href}">${inner}</a>`
            : inner;
    }

    // [2] _rbStack — nhiều ảnh: web-glide (autoplay + hiệu ứng 3D), click mở popup full-screen
    _rbStack(imgs) {
        return html`
            <div
                class="gallery-stack"
                role="button" tabindex="0" aria-label=${this.alt || a11yTxt('open')}
                @keydown=${(e) => this._dhKeyActivate(e, this._dhClickStack)}
                @click=${this._dhClickStack}
                style="border-radius:${this.rounded || '4px'};${cssInline(this.stys || {})}"
            >
                <web-glide
                    .images=${imgs}
                    effect="flipX"
                    .autoplay=${3000}
                    ?loop=${true}
                    ?reverse=${this.reverse}
                    ?blur=${this.blur}
                ></web-glide>
            </div>`;
    }

    // [3] _rbDialog — popup full-screen (web-lightbox: nhiều ảnh → slider flipX). 'close' của lightbox không cho nổi lên
    // ngoài gallery — nơi chứa (vd web-dialog) cũng nghe 'close' và sẽ tự đóng theo.
    _rbDialog(imgs) {
        return html`
            <web-lightbox .images=${imgs} alt=${this.alt || ''} ?open=${this._open}
                @close=${(e) => { e.stopPropagation(); this._dhCloseDialog(); }}></web-lightbox>`;
    }
}

if (!customElements.get('web-gallery')) {
    customElements.define('web-gallery', WebGallery);
}
