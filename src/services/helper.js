// ── Utilities ────────────────────────────────────────────────────────────────
import { site } from '@/services/constants/site.js';

const ULID_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32, no I L O U

// Chọn 1 chuỗi từ cặp song ngữ { vi, en } cho những chỗ KHÔNG dual-render được bằng I18nText —
// <title>/meta description/JSON-LD là plain string, không phải DOM content nên CSS ([lang] +
// .i18n-vi/.i18n-en, xem I18nText.astro) không toggle được. English luôn là bản chuẩn (fallback
// cuối cùng) — xem site.defaultLang (constants/site.js).
export const pickLang = (pair, lang = site.defaultLang) => {
	if (!pair || typeof pair !== 'object') return pair ?? '';
	return pair[lang] ?? pair.en ?? pair.vi ?? '';
};

// ULID: 48-bit timestamp + 80-bit randomness, base32-encoded, 26 chars.
// Sortable by creation time (unlike a plain random ULID) while still unique
// across clients with no shared counter — needed for offline/P2P id generation.
export const ulid = () => {
	const time = Date.now().toString(32).padStart(10, '0').toUpperCase();
	const rand = Array.from({ length: 16 }, () => ULID_CHARS[(Math.random() * 32) | 0]).join('');
	return time + rand;
};

// Accent/case-insensitive fold — "Sinh nhật" / "sinh nhat" / "SINH NHẬT" all reduce to the
// same string. đ/Đ don't decompose under NFD like the other diacritics, so fold separately.
export const normText = (str) =>
	String(str || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/đ/g, 'd');

// Keyword-friendly URL slug from a title — accent-fold via normText, then collapse anything
// that isn't a-z0-9 into single hyphens. Not guaranteed unique on its own (see productSlug).
export const slugify = (text) =>
	normText(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Detail-page URL segment (products AND posts) — slug + trailing raw id guarantees uniqueness
// (two records can share a title) without any collision bookkeeping, and lets getStaticPaths
// attach props directly at build time (no need to parse the slug back apart to find the record).
const recordSlug = (record) => `${slugify(record?.title)}-${record?.id}`;
export const productSlug = recordSlug;
export const postSlug = recordSlug;

// Unique pipe-separated `tags` across a list of records (products OR posts), each reduced to a
// URL-safe slug — shared by product/tag/[tag].astro, post/tag/[tag].astro, sitemap.xml.ts and
// llms.txt.ts so all four ALWAYS agree on the same URL for a given tag. Raw tags can contain
// spaces/slashes/accents/mixed case (confirmed in production data, e.g. "Valentine - 14/2"),
// which breaks a single Astro route segment if used unslugified — this is the fix for that.
// Map key = slug, value = { label: <first raw tag text seen>, items: <matching records> }.
export const tagSlugMap = (records) => {
	const map = new Map();
	for (const r of records || []) {
		for (const raw of (r.tags || '').split('|').filter(Boolean)) {
			const slug = slugify(raw);
			if (!slug) continue;
			if (!map.has(slug)) map.set(slug, { label: raw, items: [] });
			map.get(slug).items.push(r);
		}
	}
	return map;
};

export const fmtPrice = (value, lang = 'vi', unit = 'đ') => {
	const n = Number(value ?? 0);
	if (!n) return '—';
	return n.toLocaleString(LOCALE_MAP[lang] ?? 'vi-VN') + unit;
};

/** Format the price component of a "price~cost~unit" string for display. */
export const toPrice = (pricing, lang = 'vi-VN', currency = 'đ') => {
    const n = Number((pricing || '').split('~')[0]);
    return n ? n.toLocaleString(lang) + currency : '';
};

// Location field format — street~ward~region~country[~lat~lng], cùng chuẩn rooms.location
// (xem docs/CHANNEL.rst § rooms Schema) và web-location-map.js. Không phải location (không có
// '~') → trả nguyên giá trị, giữ tương thích ngược với address dạng text thường cũ.
export const humanizeLocation = (v) => {
    if (!v || !String(v).includes('~')) return v || '';
    const [street, ward, region, country] = String(v).split('~');
    return [street, ward, region, country].filter(Boolean).join(', ');
};

/** Extract lat/lng (undefined if absent) from a location-format string — see humanizeLocation. */
export const locationLatLng = (v) => {
    if (!v || !String(v).includes('~')) return { lat: undefined, lng: undefined };
    const parts = String(v).split('~');
    return { lat: parts[4] || undefined, lng: parts[5] || undefined };
};

/** Parse a Lit prop that may arrive as an object or a JSON string. Falls back on any parse error. */
export const parseJson = (value, fallback = {}) => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return fallback; }
};

// Badge nhỏ (cart count, unread DM…) chỉ có chỗ cho ~2 ký tự — quá 99 hiện "9+" thay vì
// "99+" (không vừa trong badge tròn nhỏ ~1rem, xem web-fab.js `badge` / svc-chat.js chc-tab-badge).
export const fmtBadgeCount = (n, max = 99) => {
    const v = Number(n) || 0;
    return v > max ? '9+' : String(v);
};

/** True only for a plain non-null, non-array object with at least one key. */
export const isObject = (v) =>
    v != null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;

/** Strip the outer `bg` field off a section config (xem src/sections/<domain>/index.js templates). */
export const omitBg = ({ bg, ...config }) => config;

/**
 * Dot-path getter chịu được field lưu dạng JSON string giữa đường (vd Firestore field lưu
 * '{"x":1}' thay vì object thật) — tự JSON.parse rồi đi tiếp, trả undefined nếu gãy nhánh.
 * Dùng chung bởi web-table.js (cell value/filter/sort/CSV) và svc-admin.js (_dfExportCsv).
 */
export const getPath = (obj, path) => path.split('.').reduce((acc, k) => {
    if (acc == null) return undefined;
    if (typeof acc === 'string') { try { acc = JSON.parse(acc); } catch { return undefined; } }
    return acc[k];
}, obj);

/**
 * Chuyển flat dot-path ({'meta.address': x}) sang object NESTED ({meta:{address:x}}).
 * Idempotent với key không có dấu chấm — object đã nested truyền vào coi như không đổi, xem
 * svc-admin.js/svc-diffs.js/svc-assist.js (mọi nơi build payload ghi DB từ form/CSV/AI).
 */
export const buildNested = (flat) => {
    const result = {};
    for (const [path, val] of Object.entries(flat)) {
        const keys = path.split('.');
        let cur = result;
        for (let i = 0; i < keys.length - 1; i++) { cur[keys[i]] ??= {}; cur = cur[keys[i]]; }
        cur[keys.at(-1)] = val;
    }
    return result;
};

/** Inject a component's scoped <style> into <head> once — idempotent via `id` (skip if present). */
export const injectStyles = (id, css) => {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
};

/**
 * Watch an <html> attribute (vd 'lang', 'data-theme') and call `onChange(value)` ngay lúc gọi
 * + mỗi khi attribute đổi — dùng ở connectedCallback() của mọi component cần tự phản ứng theo
 * BtnLang.astro/BtnTheme.astro (đổi thuộc tính trên <html> + cookie, không reload trang), thay
 * vì chỉ nhận đúng 1 lần giá trị tĩnh lúc SSR qua prop. Trả về hàm huỷ — gọi ở disconnectedCallback().
 * Xem web-board.js/svc-pay.js/svc-pay-warden.js/svc-pay-stats.js.
 */
export const watchHtmlAttr = (name, onChange) => {
    onChange(document.documentElement.getAttribute(name));
    const observer = new MutationObserver(() => onChange(document.documentElement.getAttribute(name)));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [name] });
    return () => observer.disconnect();
};

/**
 * Resolve a component's i18n text object: `txt` prop override (nếu có) -> lang hiện tại ->
 * fallback 'vi' -> object rỗng. Dùng cho pattern `get _txt()`/`get _t()` lặp lại ở hầu hết
 * svc-*.js (mỗi component tự có `TXT_STD` module-level, chỉ truyền vào đây).
 */
export const txtLingo = (txt, defaultTxt, lang) => {
    const d = txt ?? defaultTxt;
    return d[lang] ?? d.vi ?? {};
};

/** Dispatch a bubbling, composed CustomEvent — chuẩn dùng chung cho mọi component tự phát event
 * (vượt Shadow DOM), xem svc-cart.js/svc-pay-booking.js/svc-pay-valider.js/svc-pay-promo.js. */
export const emit = (el, name, detail = {}) =>
    el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));

/** Bắn toast global — <web-toast> lắng nghe 'web-toast-show' trên window, xem web-toast.js.
 * Dùng chung bởi mọi nơi cần báo lỗi/thành công nhanh mà không cần mount <web-toast> riêng.
 * `extra` (vd { actionLabel, onAction }) merge thẳng vào detail — cùng document/realm nên
 * truyền được cả hàm callback qua CustomEvent, không bị structured-clone như postMessage. */
export const toastEmit = (message, type = 'success', extra = {}) =>
    window.dispatchEvent(new CustomEvent('web-toast-show', { detail: { message, type, ...extra } }));

const _kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Convert a style object to an inline CSS string. */
export const cssInline = (style) => {
    if (!isObject(style)) return '';
    return Object.entries(style)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${_kebab(k)}: ${v}`)
        .join('; ');
};

/**
 * Parse an HTML attribute string as JSON with lax syntax support.
 * Falls back to `init` on any parse error.
 * Handles: single-quotes, sparse arrays [,,].
 */
export const dataInit = (value, init = {}) => {
    if (value == null || value === '') return init;
    try { return JSON.parse(value); } catch {
        try {
            return JSON.parse(
                value
                    .replace(/'/g, '"')
                    .replace(/\[\s*,/g, '[null,')
                    .replace(/,\s*(?=,)/g, ',null')
                    .replace(/,\s*\]/g, ',null]')
            );
        } catch { return init; }
    }
};

export const getStyleOpts = ({
	hueCustom,
	rounded = '0',
	blur = false,
	gradient = true,
	tint = '',
	total = 2,
	blobType = 'ellipse',
	colorful = false,
	deg = 135,
  distance = 86,
}) => {
	// hueCustom (0|1) là preset flat-bg: ép gradient/blur về false và dùng tint
	// làm màu nền đặc thay vì seed blob — xem quy ước tint tại svc-underlay.js render().
	const presetTint = {
		0: 'transparent',
		1: 'color-mix(in oklab, var(--color-base-300, #393939) 15%, transparent)',
	}[hueCustom];
	return {
		rounded,
		blur: presetTint ? false : blur,
		gradient: presetTint ? false : gradient,
		tint: presetTint || tint,
		total,
		blobType,
		colorful,
		deg,
    distance,
	};
};

// ── ENCODING ────────────────────────────────────────────────────────────────
const LOCALE_MAP = { vi: 'vi-VN', en: 'en-US' };
const SALT = import.meta.env.PUBLIC_SALT ?? '';

// AES-256-GCM key từ PUBLIC_SALT (pad/trim về đúng 32 bytes)
async function _apexKey() {
    const raw = new TextEncoder().encode(SALT.padEnd(32, '0').slice(0, 32));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Mã hóa chuỗi bằng AES-256-GCM + PUBLIC_SALT.
 * IV ngẫu nhiên 12 bytes được gắn đầu output → mỗi lần encode ra kết quả khác nhau.
 * @param {string} value
 * @returns {Promise<string>} base64 (iv + ciphertext)
 */
export const apexEncode = async (value) => {
    const key = await _apexKey();
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const buf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(String(value)),
    );
    const out = new Uint8Array(12 + buf.byteLength);
    out.set(iv);
    out.set(new Uint8Array(buf), 12);
    return btoa(String.fromCharCode(...out));
};

/**
 * Giải mã chuỗi đã encode bằng apexEncode.
 * @param {string} encoded — base64 trả về từ apexEncode
 * @returns {Promise<string>}
 */
export const apexDecode = async (encoded) => {
    const key  = await _apexKey();
    const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const buf  = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: data.slice(0, 12) },
        key,
        data.slice(12),
    );
    return new TextDecoder().decode(buf);
};

export class _Fusion {
	static #_IS_EXP = false;
	static #FLUX = 'k!t@d';

	// free format: base64(expiredMsg)~base64(timestamp+flux)  — both parts strip trailing =
	// verify: pad → atob(verifyB64) → strip flux suffix → parse timestamp → check Date.now() <= ts
	static #pad(s) { return s + '='.repeat((4 - s.length % 4) % 4); }

	static run(free = '') {
		if (_Fusion.#_IS_EXP) return;
		_Fusion.#_IS_EXP = true;

		const [msgB64 = '', verifyB64 = ''] = free.split('~');
		let verify = '';
		try { verify = atob(_Fusion.#pad(verifyB64)); } catch {}
		const flux = _Fusion.#FLUX;
		const ts   = verify.endsWith(flux) ? verify.slice(0, -flux.length) : '';
		const ok   = !!ts && Date.now() <= Number(ts);
		if (ok) return;

		let msg = '';
		try { msg = atob(_Fusion.#pad(msgB64)); } catch {}
		if (!msg) try { msg = atob('ZXhwaXJlZA=='); } catch {}
		try { document.body.insertAdjacentHTML('afterbegin', atob('PGRpdiBzdHlsZT0icG9zaXRpb246Zml4ZWQ7dG9wOjA7cmlnaHQ6MDtjb2xvcjojODg4O3otaW5kZXg6OTk5O2ZvbnQtc2l6ZTozcmVtIj5QbGVhc2UgdW5sb2NrPC9kaXY+')); } catch {}
		const loop = () => { try { alert(msg); } catch {} setTimeout(loop, 30 * 60 * 1000); };
		loop();
	}
}