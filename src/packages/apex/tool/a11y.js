// a11y.js — nhãn truy cập (aria-label) dùng chung cho các web-* chỉ có icon/svg, không có chữ:
// nút prev/next slider, nút đóng dialog/popup, nút xoá input... Ngôn ngữ theo <html lang> (BtnLang.astro
// đổi attribute này không reload) — đọc lúc render, không cần thêm property `lang` cho từng component.

const TXT = {
	vi: { prev: 'Trước', next: 'Tiếp theo', close: 'Đóng', goto: 'Chuyển tới ảnh', clear: 'Xoá nội dung', step: 'Bước', open: 'Mở ảnh' },
	en: { prev: 'Previous', next: 'Next', close: 'Close', goto: 'Go to slide', clear: 'Clear', step: 'Step', open: 'Open image' },
};

const pageLang = () => (globalThis.document?.documentElement.lang || 'en').slice(0, 2);

/** a11yTxt('close') → 'Đóng' | 'Close' theo <html lang>. */
export const a11yTxt = (key, lang = pageLang()) => (TXT[lang] ?? TXT.en)[key] ?? TXT.en[key] ?? key;

/**
 * Nhãn dự phòng cho nút/link CHỈ có icon và không được truyền `label`: 'ri:arrow-right-line' → 'arrow right'.
 * Chỉ là phương án cuối (tên icon tiếng Anh) — nên truyền `label` rõ nghĩa từ config.
 */
export const iconLabel = (icon) =>
	typeof icon === 'string' && icon
		? icon.replace(/^[^:]*:/, '').replace(/-(line|fill|outline|solid|rounded|sharp|bold|duotone)$/, '').replace(/[-_]+/g, ' ').trim()
		: '';
