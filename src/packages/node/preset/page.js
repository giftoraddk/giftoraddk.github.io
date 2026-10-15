// src/packages/node/preset/page.js
//
// The page's theme / lang for a canvas with presets: config.js `theme` / `lang`, else the cookies the account panel
// sets, else <html>'s own. Applied to <html> at once (config `page: false` leaves it alone) — svc-node loads this tiny
// module before the rest of the presets, so a layout without a pre-paint script flashes as little as it can.
import { ClientCookies, COOKIE_CONFIG } from '@/services/core/cookier.js';

export function pagePrefs(cfg = {}) {
    const html = document.documentElement;
    const theme = cfg.theme ?? ClientCookies.get(COOKIE_CONFIG.THEME) ?? html.getAttribute('data-theme') ?? 'light';
    const lang = cfg.lang ?? ClientCookies.get(COOKIE_CONFIG.LANGUAGE) ?? html.getAttribute('lang') ?? 'vi';
    if (cfg.page !== false) {
        html.setAttribute('data-theme', theme);
        html.setAttribute('lang', lang);
    }
    return { theme, lang };
}
