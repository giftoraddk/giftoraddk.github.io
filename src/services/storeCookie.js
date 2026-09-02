// Cookie options
const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: false,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax',
	maxAge: 60 * 60 * 24 * 365, // 1 year
};

// Client-side cookies (for browser)
export class ClientCookies {
	// Get cookie value
	static get(name) {
		if (typeof document === 'undefined') return undefined;

		const value = document.cookie
			.split('; ')
			.find((row) => row.startsWith(`${name}=`))
			?.split('=')[1];

		return value;
	}

	// Set cookie value
	static set(name, value, options = COOKIE_OPTIONS) {
		if (typeof document === 'undefined') return;

		const secure = options.secure ? '; secure' : '';
		const sameSite = `; samesite=${options.sameSite}`;
		const maxAge = `; max-age=${options.maxAge}`;

		document.cookie = `${name}=${value}; path=${options.path}${secure}${sameSite}${maxAge}`;
	}

	// Check if cookie exists
	static has(name) {
		return this.get(name) !== undefined;
	}

	// Remove cookie
	static remove(name) {
		if (typeof document === 'undefined') return;

		document.cookie = `${name}=; path=/; max-age=0`;
	}

	// Reset all cookies (remove all)
	static removeAll(names) {
		names.forEach((name) => this.remove(name));
	}

	// Get JSON value
	static getJSON(name, defaultValue) {
		const value = this.get(name);
		if (!value) return defaultValue;

		try {
			return JSON.parse(value);
		} catch {
			return defaultValue;
		}
	}

	// Set JSON value
	static setJSON(name, value, options = COOKIE_OPTIONS) {
		const stringValue = JSON.stringify(value);
		this.set(name, stringValue, options);
	}
}

// Common cookie names
export const COOKIE_CONFIG = {
	THEME: 'dark',
	SIDEBAR: false,
	MAIN_COLORS: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24',
	TEXT_COLOR: '#141414',
	BG_COLOR: '#f5f5f5',
	LANGUAGE: 'en',
};

// Export options
export { COOKIE_OPTIONS };
