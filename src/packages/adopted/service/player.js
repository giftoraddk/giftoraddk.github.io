// src/packages/adopted/service/player.js
//
// Poster/thumbnail của video khi `poster` trống — YouTube dựng URL thẳng, Vimeo/TikTok hỏi oEmbed.

async function _fetchOembedThumbnail(oembedUrl) {
    try {
        const res = await fetch(oembedUrl);
        if (!res.ok) return '';
        const data = await res.json();
        return data.thumbnail_url || '';
    } catch {
        return '';
    }
}

export async function resolvePoster(provider, id, src) {
    if (provider === 'youtube') {
        return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
    }

    if (provider === 'vimeo') {
        return _fetchOembedThumbnail(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(src)}`);
    }

    if (provider === 'tiktok') {
        return _fetchOembedThumbnail(`https://www.tiktok.com/oembed?url=${encodeURIComponent(src)}`);
    }

    return '';
}
