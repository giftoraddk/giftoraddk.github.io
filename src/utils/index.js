export function sluglify(text) {
	return text.replace(/\s+/g, '-');
}

export function unsluglify(text) {
	return text.replace(/-/g, ' ');
}

/**
 * Xây dựng một URL an toàn từ một đường dẫn hoặc URL tương đối.
 * @param path - Đường dẫn hoặc URL tương đối (ví dụ: '/logo.png' hoặc 'https://example.com/image.png')
 * @param base - URL cơ sở để xây dựng URL tuyệt đối. Mặc định là Astro.site hoặc Astro.url.origin.
 * @returns URL tuyệt đối dưới dạng chuỗi.
 */
export function safeURL(path, base) {
	try {
		// Nếu path đã là một URL tuyệt đối, trả về trực tiếp
		const url = new URL(path);
		return url.href;
	} catch {
		// Nếu path là URL tương đối, xây dựng URL tuyệt đối từ base
		try {
			const origin = base ?? (typeof Astro !== 'undefined' ? Astro.site ?? Astro.url.origin : 'http://localhost');
			const url = new URL(path, origin);
			return url.href;
		} catch {
			// Nếu có lỗi, trả về một URL mặc định
			return '/logo.png';
		}
	}
}

export const ulid = () => {
	return (
		// Timestamp for uniqueness
		Date.now().toString(36) + Math.random().toString(36).slice(2, 10) // Random part for randomness
	);
};
export const hexToRgba = (opacity, hex = '#34c85e') => {
	const bigint = parseInt(hex.slice(1), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export const debounce = (fn, wait) => {
	let t;
	return function () {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(this, arguments), wait);
	};
};

export const deepClone = (data) => {
	return JSON.parse(JSON.stringify(data));
};

export const watchField = (field, callback, maxWaitTime = 500) => {
	const intervalTime = 100;
	let elapsedTime = 0;
	const checkInterval = setInterval(() => {
		if (field || (elapsedTime += intervalTime) >= maxWaitTime) {
			clearInterval(checkInterval);
			callback(field); // Pass `field` as an argument to callback
		}
	}, intervalTime);
};

export const unionArray = (arr1, arr2, key = 'id') => {
	const map = new Map(arr1.map((item) => [item[key], item]));
	arr2.forEach((item) => map.set(item[key], { ...map.get(item[key]), ...item }));
	return [...map.values()];
};

export const isObject = (obj) => {
	return obj && typeof obj === 'object' && Object.keys(obj).length !== 0 && !Array.isArray(obj);
};

export const isList = (arr) => {
	return arr !== null && Array.isArray(arr) && arr.length > 0 && !arr.every((item) => !isObject(item));
};

export const isImageLink = (str) => {
	const regex = /\.(jpeg|jpg|gif|png|svg|webp|bmp|ico)$/i;
	return regex.test(str);
};

export const textTransform = (str, lowCase = false) => {
	if (!str) return '';

	// Split the input string into words
	let words = str.split(/(?=[A-Z])/);

	// Capitalize the first letter of each word and join them with a space
	let result = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

	if (lowCase) return result.toLowerCase();

	return result;
};
export const camelToCap = (txt) => {
	const capitalized = txt.replace(/([a-z])([A-Z])/g, '$1 $2');
	return capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
};

// Chuyển đổi camelCase thành kebab-case cho CSS properties
export const camelToKebab = (str) => {
	return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

/** Rút chuỗi hiển thị từ 1 field có thể là string thường HOẶC object đa ngôn ngữ { vi, en }
 *  (xem I18nText.astro) — dùng ở nơi cần 1 string chắc chắn (vd .charAt(0) làm fallback icon). */
export const plainText = (t) => (t && typeof t === 'object') ? (t.en ?? t.vi ?? Object.values(t)[0] ?? '') : (t ?? '');

export const cssInline = (style) => {
	if (!style || typeof style !== 'object') return '';

	return Object.entries(style)
		.filter(([_, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value]) => `${camelToKebab(key)}: ${value}`)
		.join('; ');
};