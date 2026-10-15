import { LitElement, html, nothing, unsafeCSS } from 'lit';
import styles from './css/web-lightbox.css?inline';
import './web-glide.js';
import { a11yTxt } from './tool/a11y.js';

/**
 * WebLightbox — popup xem ảnh lớn toàn màn hình (native <dialog>, top layer). 1 ảnh → ảnh lớn; nhiều ảnh → slider hiệu ứng
 * flipX (web-glide) + nút trước/sau, chấm vị trí, bộ đếm, phím ←/→, vuốt trên cảm ứng. Esc / bấm nền / ✕ để đóng.
 * Dùng bởi web-gallery (ảnh zoom + stack) và trang shop (components/Shop — 1 instance chung cho mọi card).
 *
 * Props:
 * - images: (Array<string> | String 'a|b|c') ảnh cần xem.
 * - index:  (Number) ảnh mở đầu tiên. Mặc định 0.
 * - alt:    (String) mô tả ảnh (đọc cho trình đọc màn hình).
 * - open:   (Boolean) mở / đóng.
 *
 * API: show(images, index = 0, alt = '') — mở với bộ ảnh mới. Event: 'close' khi đóng (bubbles, composed).
 */
export class WebLightbox extends LitElement {
    static properties = {
        images:  { type: Array },
        index:   { type: Number },
        alt:     { type: String },
        open:    { type: Boolean, reflect: true },
        _cur:    { state: true },
    };

    static styles = [unsafeCSS(styles)];

    constructor() {
        super();
        this.images = [];
        this.index  = 0;
        this.alt    = '';
        this.open   = false;
        this._cur   = 0;
        this._x0    = null;
        this._onKey = this._onKey.bind(this);
    }

    show(images, index = 0, alt = '') {
        this.images = images;
        this.index  = index;
        this.alt    = alt;
        this.open   = true;
    }

    get _list() {
        const v = this.images;
        return (Array.isArray(v) ? v : String(v ?? '').split('|')).map((s) => String(s).trim()).filter(Boolean);
    }

    get _glide() { return this.renderRoot?.querySelector('web-glide'); }

    willUpdate(changed) {
        if (changed.has('open') && this.open) this._cur = Math.min(Math.max(Number(this.index) || 0, 0), Math.max(this._list.length - 1, 0));
    }

    updated(changed) {
        if (!changed.has('open')) return;
        const d = this.renderRoot.querySelector('dialog');
        if (!d) return;
        if (this.open && !d.open) {
            d.showModal();
            this._glide?.go(this._cur);
            document.addEventListener('keydown', this._onKey);
        } else if (!this.open && d.open) {
            d.close();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._onKey);
    }

    close() {
        if (!this.open) return;
        this.open = false;
        document.removeEventListener('keydown', this._onKey);
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    _onKey(e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); this._glide?.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this._glide?.prev(); }
    }

    // Vuốt ngang > 40px trên ảnh → chuyển ảnh (chuột kéo cũng được).
    _onDown(e) { this._x0 = e.clientX; }
    _onUp(e) {
        if (this._x0 == null) return;
        const dx = e.clientX - this._x0;
        this._x0 = null;
        if (Math.abs(dx) > 40) dx < 0 ? this._glide?.next() : this._glide?.prev();
    }

    render() {
        const imgs = this._list;
        const many = imgs.length > 1;
        return html`
            <dialog class="lb" aria-label=${this.alt || a11yTxt('open')}
                @cancel=${(e) => { e.preventDefault(); this.close(); }}
                @click=${(e) => { if (e.target === e.currentTarget) this.close(); }}>
                ${this.open && imgs.length ? html`
                    <div class="lb-inner">
                        <div class="lb-top">
                            ${many ? html`<span class="lb-count" aria-live="polite">${this._cur + 1} / ${imgs.length}</span>` : html`<span></span>`}
                            <button type="button" class="lb-btn" aria-label=${a11yTxt('close')} @click=${() => this.close()}>
                                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div class="lb-stage" role="img" aria-label=${this.alt || ''}
                            @pointerdown=${this._onDown} @pointerup=${this._onUp} @pointercancel=${() => { this._x0 = null; }}>
                            <web-glide .images=${imgs} effect="flipX" .autoplay=${0} .duration=${650} ?loop=${true}
                                @glide-change=${(e) => { this._cur = e.detail.index; }}></web-glide>
                            ${many ? html`
                                <button type="button" class="lb-btn lb-nav is-prev" aria-label=${a11yTxt('prev')} @click=${() => this._glide?.prev()}>
                                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                </button>
                                <button type="button" class="lb-btn lb-nav is-next" aria-label=${a11yTxt('next')} @click=${() => this._glide?.next()}>
                                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                </button>` : nothing}
                        </div>
                        ${many ? html`
                            <div class="lb-dots">
                                ${imgs.map((_, i) => html`
                                    <button type="button" class="lb-dot ${i === this._cur ? 'is-on' : ''}" aria-label="${a11yTxt('goto')} ${i + 1}"
                                        aria-current=${i === this._cur ? 'true' : nothing} @click=${() => this._glide?.go(i)}></button>`)}
                            </div>` : nothing}
                    </div>` : nothing}
            </dialog>`;
    }
}

if (!customElements.get('web-lightbox')) {
    customElements.define('web-lightbox', WebLightbox);
}
