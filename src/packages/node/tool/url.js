// URLs from config, the user or a saved node: only http(s) ever reaches an iframe / img src. Parsed with URL, so a
// sneaky form ('/\evil.com', ' javascript:…', 'JaVaScRiPt:') is judged by what the browser would load.
const here = () => globalThis.location?.origin ?? 'http://localhost';

/** `url` resolved against this page → a URL object when it is http(s), else null. */
export function httpUrl(url) {
    if (typeof url !== 'string' || !url.trim()) return null;
    try {
        const u = new URL(url.trim(), here());
        return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
    } catch {
        return null;
    }
}

/** Whether `url` loads a page of this site (its origin) — framed with allow-same-origin it would act as this page. */
export const isSameSite = (url) => httpUrl(url)?.origin === here();
