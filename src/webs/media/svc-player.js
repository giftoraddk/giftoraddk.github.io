// src/webs/media/svc-player.js
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import styles from './styles/svc-player.css?inline';
import { cssInline, emit } from '@/services/helper.js';
import { detectProvider, extractId, buildEmbedUrl, resolvePoster } from './tools/service.js';

const UNSET_SRC = Symbol('unset-src');

/**
 * SvcPlayer
 *
 * Single-element video embed: YouTube/Vimeo/TikTok/native <video> behind a
 * poster+play-button facade. Facade is skipped when autoPlay=true.
 *
 * Merges what used to be two elements (svc-player facade + svc-embed render)
 * into one — the embed markup has no state of its own, so it lives here as
 * plain render methods (_rbVideo/_rbIframe) instead of a second custom element.
 *
 * Props:
 * - src, poster, control, autoPlay, mute, loops, ratio, fill
 * - ui, theme, mainColors, textColor, rounded
 * - locked — read-only preview: hides the play-button affordance and ignores
 *   clicks/autoPlay, so the facade poster is all that ever renders (used by
 *   player-ext.js's editor NodeView, where the real embed must stay inert).
 *
 * Events:
 * - 'played' — dispatched once, when the real media activates (click or autoPlay)
 */
export class SvcPlayer extends LitElement {
    static styles = [unsafeCSS(styles)];

    static properties = {
        src:        { type: String },
        poster:     { type: String },
        control:    { type: Boolean },
        autoPlay:   { type: Boolean },
        mute:       { type: Boolean },
        loops:      { type: Boolean },
        ratio:      { type: Number },
        fill:       { type: Boolean, reflect: true },
        ui:         { type: String },
        theme:      { type: String },
        mainColors: { type: String },
        textColor:  { type: String },
        rounded:    { type: String },
        locked:     { type: Boolean },
        _active:         { state: true },
        _resolvedPoster: { state: true },
    };

    constructor() {
        super();
        this.src = '';
        this.poster = '';
        this.control = false;
        this.autoPlay = false;
        this.mute = false;
        this.loops = false;
        this.ratio = 16 / 9;
        this.fill = false;
        this.ui = 'modern';
        this.theme = '';
        this.mainColors = '';
        this.textColor = '';
        this.rounded = '8px';
        this.locked = false;
        this._active = false;
        this._resolvedPoster = '';
        this._lastSrc = UNSET_SRC;
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('message', this._dhYtMessage);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('message', this._dhYtMessage);
    }

    willUpdate() {
        if (this.src === this._lastSrc) return;
        this._lastSrc = this.src;
        this._active = false;
        this._resolvedPoster = '';
        this._dfResolvePoster();
        if (this.autoPlay) this._dhActivate();
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme);
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme');
        }
    }

    // ==========================================
    // DATA FOOTER — async resolution
    // ==========================================

    /**
     * Flow tự resolve poster: this.src -> _resolvedPoster (thumbnail của provider)
     */
    async _dfResolvePoster() {
        // [1] CHECK: Có `poster` prop rồi thì khỏi tự resolve; không nhận diện được provider thì
        //     cũng không có gì để gọi
        if (this.poster) return;
        const provider = this._comProvider;
        if (!provider) return;

        // [3] EXECUTE: Gọi resolvePoster (fetch oEmbed hoặc build URL tĩnh tuỳ provider)
        const requestedSrc = this.src;
        const poster = await resolvePoster(provider, this._comId, requestedSrc);
        // src đổi trong lúc đang await (user paste link khác liên tiếp) — bỏ kết quả cũ, tránh
        // poster của video A hiện nhầm lên khi src đã đổi sang video B
        if (this.src !== requestedSrc) return;
        this._resolvedPoster = poster;
    }

    // ==========================================
    // DATA HEAD
    // ==========================================

    // Direct video files (mp4/webm/...) have no thumbnail API to resolve a poster
    // from, unlike YouTube/Vimeo/TikTok — `preload="metadata"` alone often isn't
    // enough to paint a visible frame (some browsers fetch just the duration/size
    // box, no sample data). Nudging currentTime forces the browser to decode+paint
    // one real frame, fetching only a small byte range instead of the whole file.
    // Guarded so the resulting 'loadedmetadata' from the seek doesn't re-trigger itself.
    _dhSeekPosterFrame(e) {
        const video = e.target;
        if (video.dataset.posterSeeked) return;
        video.dataset.posterSeeked = '1';
        try { video.currentTime = Math.min(0.1, video.duration || 0.1); } catch {}
    }

    _dhActivate() {
        if (this._active || !this._comProvider || this.locked) return;
        this._active = true;
        emit(this, 'played', { provider: this._comProvider, src: this.src });
    }

    // Loops a single YouTube video via postMessage (enablejsapi=1, see buildEmbedUrl) —
    // NOT the loop=1&playlist=<id> URL trick, which makes YouTube show playlist
    // prev/next chrome that `controls=0` can't hide.
    _dhYtLoad = (e) => {
        if (this.loops && this._comProvider === 'youtube') {
            e.target.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
        }
    };

    _dhYtMessage = (e) => {
        if (!this.loops || this._comProvider !== 'youtube') return;
        const iframe = this.renderRoot?.querySelector('iframe.embed-media');
        if (!iframe || e.source !== iframe.contentWindow) return;
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        // Without loading the official iframe_api wrapper script, the player only ever
        // posts raw 'infoDelivery' messages (info.playerState) — 'onStateChange' is a
        // name the wrapper script synthesizes on the parent page, never sent by the
        // iframe itself, so listening for it directly never fires. 0 = ENDED.
        if (msg.event !== 'infoDelivery' || msg.info?.playerState !== 0) return;
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    };

    // ==========================================
    // COMPUTED
    // ==========================================

    get _comProvider() {
        return detectProvider(this.src);
    }

    get _comId() {
        return extractId(this._comProvider, this.src);
    }

    get _comPoster() {
        return this.poster || this._resolvedPoster;
    }

    get _comBoxStyle() {
        return cssInline({
            aspectRatio:        this.fill ? '' : (this.ratio || (16 / 9)),
            borderRadius:       this.rounded || '8px',
            '--color-primary':  this.mainColors ? (this.mainColors.split('|')[0] || '').trim() : '',
            color:              this.textColor || '',
        });
    }

    // ==========================================
    // RENDER
    // ==========================================

    render() {
        const provider = this._comProvider;
        if (!provider) return nothing;
        return html`
            <div class="svc-player-box" style="${this._comBoxStyle}">
                ${this._active ? this._rbActive(provider) : this._rbFacade()}
            </div>`;
    }

    // [1] _rbFacade — poster/dark bg + play button, click activates real media
    // When locked, the play-button affordance is hidden entirely — it can't
    // do anything (clicks are inert, see _dhActivate), so showing it would be misleading.
    _rbFacade() {
        const poster = this._comPoster;
        const useVideoPoster = !poster && this._comProvider === 'video';
        return html`
            <button
                type="button"
                class="facade ${this.ui === 'spatial' ? 'spatial' : ''}"
                aria-label="Play video"
                @click=${this._dhActivate}
            >
                ${poster ? html`<img class="facade-poster" src="${poster}" alt="" />` : nothing}
                ${useVideoPoster ? html`
                    <video
                        class="facade-poster"
                        src="${this.src}"
                        preload="metadata"
                        muted
                        playsinline
                        @loadedmetadata=${this._dhSeekPosterFrame}
                    ></video>` : nothing}
                <div class="facade-scrim"></div>
                ${this.locked ? nothing : html`
                    <div class="facade-play">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>`}
            </button>`;
    }

    // [2] _rbActive — render the real media once activated (click or autoPlay).
    // Always autoplay here: _active only ever flips to true via an explicit play
    // intent (a facade click, or the `autoPlay` prop auto-activating on mount) —
    // by the time we're rendering the real media, the user/caller already asked
    // for playback to start. `autoPlay` itself only controls whether the facade
    // is skipped entirely at mount, not the resulting media's own autoplay.
    _rbActive(provider) {
        return provider === 'video' ? this._rbVideo() : this._rbIframe(provider);
    }

    // [2a] _rbVideo — native <video> for self-hosted files
    _rbVideo() {
        return html`
            <!-- Both attribute and property binding: browsers check the live 'muted' property (not just the attribute) when enforcing the autoplay-requires-muted policy. -->
            <video
                class="embed-media"
                src="${this.src}"
                ?controls=${this.control}
                autoplay
                ?muted=${this.mute}
                .muted=${this.mute}
                ?loop=${this.loops}
                playsinline
            ></video>`;
    }

    // [2b] _rbIframe — YouTube/Vimeo/TikTok embed
    _rbIframe(provider) {
        const embedUrl = buildEmbedUrl(provider, this._comId, {
            autoPlay: true,
            mute:     this.mute,
            loops:    this.loops,
            control:  this.control,
        });
        if (!embedUrl) return nothing;
        return html`
            <iframe
                class="embed-media"
                src="${embedUrl}"
                title="${provider} video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen
                @load=${this._dhYtLoad}
            ></iframe>`;
    }
}

if (!customElements.get('svc-player')) {
    customElements.define('svc-player', SvcPlayer);
}
