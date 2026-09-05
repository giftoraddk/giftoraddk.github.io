import { LitElement, html, unsafeCSS } from 'lit';
import glideStyles from './styles/web-glide.css?inline';

/**
 * WebGlide — slideshow tối giản: 1 ảnh/lần, autoplay, hiệu ứng chuyển cảnh 3D.
 *
 * Props:
 * - images:   (Array<string>) danh sách URL ảnh.
 * - effect:   (String) 'slide' | 'fade' | 'flipX' | 'flipY' | 'cube3d'. Mặc định 'slide'.
 * - autoplay: (Number) ms giữa mỗi lần chuyển. 0 = tắt. Mặc định 3000.
 * - duration: (Number) ms thời lượng transition. Mặc định 600.
 * - loop:     (Boolean) nối vòng. Mặc định true.
 * - reverse:  (Boolean) chạy ngược chiều.
 * - blur:     (Boolean) nền blur lấp letterbox khi tỉ lệ ảnh khác container.
 */
export class WebGlide extends LitElement {
    static properties = {
        images:   { type: Array },
        effect:   { type: String },
        autoplay: { type: Number },
        duration: { type: Number },
        loop:     { type: Boolean },
        reverse:  { type: Boolean },
        blur:     { type: Boolean },
        _current: { state: true },
    };

    static styles = [unsafeCSS(glideStyles)];

    constructor() {
        super();
        this.images   = [];
        this.effect   = 'slide';
        this.autoplay = 3000;
        this.duration = 600;
        this.loop     = true;
        this.reverse  = false;
        this.blur     = false;
        this._current = 0;
        this._timer   = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._play();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stop();
    }

    updated(changed) {
        if (changed.has('images') && this._current >= (this.images?.length || 0)) this._current = 0;
        if (changed.has('images') || changed.has('autoplay') || changed.has('reverse')) this._play();
    }

    _play() {
        this._stop();
        const n = this.images?.length || 0;
        if (n < 2 || !this.autoplay) return;
        const dir = this.reverse ? -1 : 1;
        this._timer = setInterval(() => {
            this._current = ((this._current + dir) % n + n) % n;
        }, Math.max(500, Number(this.autoplay) || 3000));
    }

    _stop() {
        clearInterval(this._timer);
        this._timer = null;
    }

    // Khoảng cách ngắn nhất tới current, có tính vòng lặp — chỉ slide |d|<=1 mới cần render.
    _delta(i, n) {
        let d = i - this._current;
        if (this.loop) {
            if (d > n / 2) d -= n;
            if (d < -n / 2) d += n;
        }
        return d;
    }

    _styleFor(d) {
        const dur = `${this.duration}ms`;
        switch (this.effect) {
            case 'fade':
                return `opacity:${d === 0 ? 1 : 0};transition:opacity ${dur} ease`;
            case 'flipX':
                return `transform:rotateY(${d * 90}deg);opacity:${d === 0 ? 1 : 0};transition:transform ${dur} ease,opacity ${dur} ease`;
            case 'flipY':
                return `transform:rotateX(${d * 90}deg);opacity:${d === 0 ? 1 : 0};transition:transform ${dur} ease,opacity ${dur} ease`;
            case 'cube3d':
                return `transform-origin:${d >= 0 ? 'left' : 'right'} center;transform:translateX(${d * 100}%) rotateY(${d * -90}deg);transition:transform ${dur} ease;filter:brightness(${d === 0 ? 1 : 0.7})`;
            default:
                return `transform:translateX(${d * 100}%);transition:transform ${dur} ease`;
        }
    }

    render() {
        const n = this.images?.length || 0;
        if (!n) return null;
        return html`
            <div class="web-glide fx-${this.effect}" @mouseenter=${this._stop} @mouseleave=${() => this._play()}>
                ${this.images.map((src, i) => {
                    const d = this._delta(i, n);
                    if (Math.abs(d) > 1) return '';
                    return html`
                        <div class="glide-slide" style=${this._styleFor(d)}>
                            ${this.blur ? html`<div class="glide-bg" style="background-image:url(${src})"></div>` : ''}
                            <img src="${src}" alt="" />
                        </div>`;
                })}
            </div>`;
    }
}

if (!customElements.get('web-glide')) {
    customElements.define('web-glide', WebGlide);
}
