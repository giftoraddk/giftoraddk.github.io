import { LitElement, html, unsafeCSS } from 'lit';
import 'iconify-icon';
import '@/webs/apex/web-button.js';
import css from './styles/svc-engage.css?inline';
import { bumpMeta, fetchCounts, isLiked, markLiked, canTrackView, markViewed } from './tools/service.js';

export class SvcEngage extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        ui:           { type: String },
        theme:        { type: String },
        mainColors:   { type: String },
        textColor:    { type: String },
        lang:         { type: String },
        postId:       { type: String },
        initialViews: { type: Number },
        initialLikes: { type: Number },
        _views:       { state: true },
        _likes:       { state: true },
        _liked:       { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.lang = 'vi';
        this.postId = '';
        this.initialViews = 0;
        this.initialLikes = 0;
        this._views = 0;
        this._likes = 0;
        this._liked = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this._dcInit();
    }

    // ==========================================
    // DATA CORE
    // ==========================================

    async _dcInit() {
        if (!this.postId) return;
        this._views = Number(this.initialViews) || 0;
        this._likes = Number(this.initialLikes) || 0;
        this._liked = await isLiked(this.postId);

        // Static page only has a build-time snapshot — sync with the live DB value
        // so a liked/refreshed post shows the real count, not the stale baked-in one.
        const fresh = await fetchCounts(this.postId);
        if (fresh) {
            this._views = fresh.views;
            this._likes = fresh.likes;
        }

        this._dcTrackView();
    }

    async _dcTrackView() {
        if (!(await canTrackView(this.postId))) return;

        this._views += 1; // optimistic — show the bump immediately instead of waiting on the network round-trip

        try {
            const next = await bumpMeta(this.postId, 'views', 1);
            this._views = next;
            await markViewed(this.postId);
        } catch (err) {
            this._views -= 1;
            console.error('[svc-engage] track view failed', err);
        }
    }

    // ==========================================
    // DATA HEAD
    // ==========================================

    async _dhLike() {
        if (this._liked) return;

        this._liked = true;
        this._likes += 1;

        try {
            const next = await bumpMeta(this.postId, 'likes', 1);
            this._likes = next;
            await markLiked(this.postId);
        } catch (err) {
            console.error('[svc-engage] like failed', err);
            this._liked = false;
            this._likes -= 1;
        }
    }

    // ==========================================
    // RENDER
    // ==========================================

    render() {
        return html`
            <div class="svc-engage">
                ${this._rbLikeButton()}
                ${this._rbViews()}
            </div>
        `;
    }

    _rbLikeButton() {
        return html`
            <web-button
                type=${'soft'}
                color="primary"
                rounded="9999px"
                height="28px"
                fontSize="0.875rem"
                ?disabled=${this._liked}
                ui=${this.ui}
                theme=${this.theme}
                @clicked=${this._dhLike}
            >
                <iconify-icon slot="prefix" width="18" icon=${this._liked ? 'ri:heart-fill' : 'ri:heart-line'}></iconify-icon>
                ${this._likes.toLocaleString('vi-VN')}
            </web-button>
        `;
    }

    _rbViews() {
        return html`
            <span class="engage-views">
                <iconify-icon width="18" icon="ri:eye-line"></iconify-icon>
                ${this._views.toLocaleString('vi-VN')}
            </span>
        `;
    }
}

if (!customElements.get('svc-engage')) customElements.define('svc-engage', SvcEngage);
