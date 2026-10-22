// src/packages/adopted/tool/share.js
//
// Ported from astro-micro's src/webs/socials/tools/service.js (phần share) — builder URL chia sẻ
// theo nền tảng, thuần (không state), dùng bởi svc-share.

const BUILDERS = {
    facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x:        (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    threads:  (url, title) => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`,
};

export function buildShareUrl(platform, { url, title }) {
    const build = BUILDERS[platform];
    return build ? build(url, title) : '';
}

export const PLATFORMS = [
    { key: 'facebook', icon: 'ri:facebook-fill',     label: 'Facebook' },
    { key: 'x',        icon: 'ri:twitter-x-fill',    label: 'X (Twitter)' },
    { key: 'threads',  icon: 'simple-icons:threads', label: 'Threads' },
];
