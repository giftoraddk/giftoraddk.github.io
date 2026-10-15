/**
 * adopted/tool/player-url.js
 *
 * Pure helpers for `svc-player` — no Lit, no DOM, no network (poster fetch lives in
 * service/player.js).
 *
 * Ported from astro-micro's src/webs/media/tools/service.js (URL part).
 *
 * Exports:
 *   - detectProvider(src)              → 'youtube' | 'vimeo' | 'tiktok' | 'video' | null
 *   - extractId(provider, src)         → provider-specific id string, or '' if not found
 *   - buildEmbedUrl(provider, id, opts) → iframe embed URL string, or '' if id is falsy
 */

const YOUTUBE_HOST_RE = /(?:youtube\.com|youtu\.be)/i;
const VIMEO_HOST_RE   = /vimeo\.com/i;
const TIKTOK_HOST_RE  = /tiktok\.com/i;
const VIDEO_EXT_RE    = /\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i;

const YOUTUBE_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;
const VIMEO_ID_RE   = /vimeo\.com\/(?:video\/)?(\d+)/;
// NOTE: TikTok short links (vm.tiktok.com/..., vt.tiktok.com/...) are detected as
// provider 'tiktok' but have no video id in the URL itself — resolving one requires
// following an HTTP redirect. Not supported here; extractId returns '' for them.
const TIKTOK_ID_RE  = /tiktok\.com\/.*\/video\/(\d+)/;

// ── Provider detection ──────────────────────────────────────────────────────

export function detectProvider(src) {
    if (!src) return null;
    if (YOUTUBE_HOST_RE.test(src)) return 'youtube';
    if (VIMEO_HOST_RE.test(src))   return 'vimeo';
    if (TIKTOK_HOST_RE.test(src))  return 'tiktok';
    if (VIDEO_EXT_RE.test(src))    return 'video';
    return null;
}

// ── ID extraction ────────────────────────────────────────────────────────────

export function extractId(provider, src) {
    if (!src) return '';
    if (provider === 'youtube') {
        const m = src.match(YOUTUBE_ID_RE);
        return m ? m[1] : '';
    }
    if (provider === 'vimeo') {
        const m = src.match(VIMEO_ID_RE);
        return m ? m[1] : '';
    }
    if (provider === 'tiktok') {
        const m = src.match(TIKTOK_ID_RE);
        return m ? m[1] : '';
    }
    return '';
}

// ── Embed URL builder ────────────────────────────────────────────────────────
// NOTE: TikTok's embed/v2 endpoint is unofficial and only supports `autoplay`.
// `mute`/`loops`/`control` are silently ignored for TikTok because the
// endpoint has no query params for them — this is a real platform limitation,
// not an oversight.

export function buildEmbedUrl(provider, id, { autoPlay = false, mute = false, loops = true, control = false } = {}) {
    const on = (v) => (v ? '1' : '0');

    if (!id) return '';

    if (provider === 'youtube') {
        const params = new URLSearchParams({
            autoplay:    on(autoPlay),
            mute:        on(mute),
            loop:        on(loops),
            controls:    on(control),
            enablejsapi: '1',
        });
        return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
    }

    if (provider === 'vimeo') {
        const params = new URLSearchParams({
            autoplay: on(autoPlay),
            muted:    on(mute),
            loop:     on(loops),
            controls: on(control),
        });
        return `https://player.vimeo.com/video/${id}?${params.toString()}`;
    }

    if (provider === 'tiktok') {
        const params = new URLSearchParams({ autoplay: on(autoPlay) });
        return `https://www.tiktok.com/embed/v2/${id}?${params.toString()}`;
    }

    return '';
}
