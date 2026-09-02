import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-button.js';
import css from './styles/svc-share.css?inline';
import { buildShareUrl, PLATFORMS } from './tools/service.js';

const LABELS = {
    facebook: 'Facebook',
    x:        'X (Twitter)',
    threads:  'Threads',
};

export class SvcShare extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        ui:         { type: String },
        theme:      { type: String },
        mainColors: { type: String },
        textColor:  { type: String },
        lang:       { type: String },
        title:      { type: String },
        url:        { type: String },
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.title = '';
        this.url = '';
    }

    // ==========================================
    // DATA HEAD
    // ==========================================

    _dhShare(platform) {
        const shareUrl = buildShareUrl(platform, { url: this._comUrl, title: this.title });
        if (!shareUrl) return;
        window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    }

    // ==========================================
    // COMPUTED
    // ==========================================

    get _comUrl() {
        return this.url || (typeof window !== 'undefined' ? window.location.href : '');
    }

    // ==========================================
    // RENDER
    // ==========================================

    render() {
        return html`
            <div class="svc-share">
                ${this._rbButtons()}
            </div>
        `;
    }

    _rbButtons() {
        return PLATFORMS.map(p => html`
            <web-button
                type="ghost"
                square
                rounded="9999px"
                height="28px"
                ui=${this.ui}
                theme=${this.theme}
                title=${LABELS[p.key] ?? p.key}
                @clicked=${() => this._dhShare(p.key)}
            >
                <iconify-icon width="16" icon=${p.icon}></iconify-icon>
            </web-button>
        `);
    }
}

if (!customElements.get('svc-share')) customElements.define('svc-share', SvcShare);
