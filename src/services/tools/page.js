// page.js — logic dùng chung của các layout trang (src/layouts/Core.astro, CoreShop.astro): bộ màu tints,
// class bố cục theo kiểu menu, CSS biến màu theo theme từ `variant`. Hàm thuần, chạy lúc build/SSR (frontmatter).
import { resolveTints } from '@/packages/node/tool/tints.js';

/**
 * tints: cặp màu theme [a, b] cho cả layout (vd ['info', 'accent'], cùng định dạng `tints` của svc-node) —
 * quầng sáng 2 góc trên của vùng cuộn (.bg-wrap), a → góc phải, b → góc trái. resolveTints chỉ nhận tên
 * màu theme (TINT_COLORS), sai thì về cặp mặc định — không chèn được CSS tuỳ ý vào style.
 * Con cháu đọc --layout-tint-a/b (vd components/Catalog/catalog.css lấy làm cặp mặc định).
 * svc-underlay (nền blob động) tắt khi bg = null HOẶC đã có tints — tints thay hẳn vai trò nền.
 * @param {string[]|null} tints
 * @param {object|null} bg  props <svc-underlay>; null = tắt underlay
 * @returns {{ tintPair: string[]|null, tintStyle: string|undefined, showUnderlay: boolean }}
 */
export function layoutTints(tints, bg) {
	const tintPair = tints ? resolveTints(tints) : null;
	const tintStyle = tintPair
		? `--layout-tint-a: var(--color-${tintPair[0]}); --layout-tint-b: var(--color-${tintPair[1]});`
		: undefined;
	return { tintPair, tintStyle, showUnderlay: bg !== null && !tintPair };
}

/**
 * Class bố cục theo kiểu menu: menu ngang (top/bottom/mobile) → cột, vùng cuộn là #main-wrap;
 * menu side → hàng, vùng cuộn là <main>.
 * @param {{ type?: string }} menu
 * @returns {{ isHorizontal: boolean, wrapClass: string, screenClass: string }}
 */
export function layoutClasses(menu = {}) {
	const isHorizontal = menu.type === 'top' || menu.type === 'bottom' || menu.type === 'mobile';
	return {
		isHorizontal,
		wrapClass: (isHorizontal ? 'flex-col' : 'flex-row') + ' flex bg-base-100',
		screenClass: ' h-dvh overflow-y-auto overflow-x-hidden bg-wrap',
	};
}

// Giá trị đi thẳng vào <style set:html> — chỉ nhận ký tự hợp lệ của 1 màu CSS (#hex, rgb()/oklch(), tên,
// var(--x), %…): chặn '}' / ';' / '<' nên không chèn được rule khác hay đóng sớm thẻ </style>.
const CSS_COLOR = /^[#\w\s.,%()/-]+$/;
const cssColor = (c) => (CSS_COLOR.test(c) ? c : '');
// URL ảnh nền nằm trong url("…") — bỏ ký tự có thể thoát khỏi chuỗi/thẻ.
const cssUrl = (u) => String(u).replace(/["'()\\<>\s]/g, '');

const pipeVars = (value, keys) =>
	value
		? value
				.split('|')
				.map((c) => cssColor(c.trim()))
				.map((c, i) => (c && keys[i] ? `--color-${keys[i]}: ${c};` : ''))
				.filter(Boolean)
				.join(' ')
		: '';

// key theme cũng nằm trong selector html[data-theme='…'] — chỉ nhận tên dạng 'dark', 'light', 'my-theme'.
const THEME_KEY = /^[\w-]+$/;

// html[data-theme=...] (không chỉ [data-theme=...]) — cùng specificity với [data-theme='dark'] của
// default.css cộng thêm element type, nên override cấp trang luôn thắng bất kể thứ tự stylesheet.
function themeBlock(themeKey, cfg) {
	if (!cfg || !THEME_KEY.test(themeKey)) return '';
	const vars = [
		pipeVars(cfg.mainColors, ['primary', 'secondary', 'accent', 'info', 'warning', 'success', 'error']),
		pipeVars(cfg.bgColors, ['base-100', 'base-200', 'base-300']),
		pipeVars(cfg.textColor, ['base-content']),
		cfg.bgImage ? `--bg-wrap-image: url("${cssUrl(cfg.bgImage)}");` : '',
	]
		.filter(Boolean)
		.join(' ');
	return vars ? `html[data-theme='${themeKey}'] { ${vars} }` : '';
}

/**
 * 1 rule `[data-theme]` cho MỖI theme key trong `variant` (không chỉ theme hiện tại) — đổi data-theme lúc
 * chạy (cookie / BtnTheme, xem anti-flash script trong layout) thì màu đổi theo thuần bằng CSS cascade,
 * cùng cơ chế default.css. Style inline nướng từ 1 theme lúc SSR sẽ đứng yên khi client đổi theme.
 * @param {Record<string, { mainColors?: string, bgColors?: string, textColor?: string, bgImage?: string }>} variant
 * @returns {string} CSS — in qua <style set:html>
 */
export function themeCSS(variant = {}) {
	return Object.entries(variant)
		.filter(([key]) => key !== 'theme')
		.map(([key, cfg]) => themeBlock(key, cfg))
		.filter(Boolean)
		.join('\n');
}
