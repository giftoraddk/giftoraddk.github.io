import { LitElement, html, nothing, unsafeCSS } from 'lit';
import mapStyles from './styles/web-google-map.css?inline';
import { cssInline } from '@/services/helper.js';

/**
 * WebGoogleMap
 *
 * Props:
 * - address: (String) Địa chỉ dạng text — dùng khi không có lat/lng.
 * - lat/lng: (String) Toạ độ — ưu tiên hơn address nếu cả 2 đều có.
 * - zoom:    (Number) Mức zoom. Mặc định 15.
 * - rounded: (String) Border-radius. Mặc định '12px'.
 * - height:  (String) Chiều cao. Mặc định '320px'.
 * - stys:    (Object) Inline styles bổ sung.
 * - cls:     (String) Class bổ sung.
 *
 * Nhúng Google Maps qua iframe embed cổ điển (``output=embed``) — không cần API key,
 * không dùng Maps JS SDK. Không có address lẫn lat/lng hợp lệ → không render gì (nothing),
 * giống quy ước web-gallery.js khi thiếu src.
 */
export class WebGoogleMap extends LitElement {
    static properties = {
        address: { type: String },
        lat:     { type: String },
        lng:     { type: String },
        zoom:    { type: Number },
        rounded: { type: String },
        height:  { type: String },
        stys:    { type: Object },
        cls:     { type: String },
    };

    static styles = [unsafeCSS(mapStyles)];

    constructor() {
        super();
        this.address = '';
        this.lat     = '';
        this.lng     = '';
        this.zoom    = 15;
        this.rounded = '12px';
        this.height  = '320px';
        this.stys    = {};
        this.cls     = '';
    }

    get _src() {
        const zoom = this.zoom || 15;
        if (this.lat && this.lng) return `https://maps.google.com/maps?q=${this.lat},${this.lng}&z=${zoom}&output=embed`;
        if (this.address) return `https://maps.google.com/maps?q=${encodeURIComponent(this.address)}&z=${zoom}&output=embed`;
        return '';
    }

    render() {
        const src = this._src;
        if (!src) return nothing;
        const style = `width:100%;height:${this.height};border:0;border-radius:${this.rounded};${cssInline(this.stys || {})}`;
        return html`
            <iframe
                class="${this.cls || ''}"
                style="${style}"
                src="${src}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
        `;
    }
}

if (!customElements.get('web-google-map')) customElements.define('web-google-map', WebGoogleMap);
