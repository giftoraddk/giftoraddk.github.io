import { atom } from 'nanostores';
import { ClientCookies, COOKIE_CONFIG } from '@/services/storeCookie.js';

export type Theme = 'light' | 'dark' | 'auto';

export interface UIState {
	uiLoading: boolean;
	uiSidebar: boolean;
	uiTheme: Theme;
	uiMainColors: string;
	uiTextColor: string;
	uiBgColor: string;
}

// Initial state from cookies with fallbacks
const initialState: UIState = {
	uiLoading: false,
	uiSidebar: ClientCookies.get(COOKIE_CONFIG.SIDEBAR) !== 'false',
	uiTheme: (ClientCookies.get(COOKIE_CONFIG.THEME) as Theme) || 'light',
	uiMainColors: ClientCookies.get(COOKIE_CONFIG.MAIN_COLORS) || '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24',
	uiTextColor: ClientCookies.get(COOKIE_CONFIG.TEXT_COLOR) || '#141414',
	uiBgColor: ClientCookies.get(COOKIE_CONFIG.BG_COLOR) || '#f5f5f5',
};

export const uiStore = atom<UIState>(initialState);

// Compact actions to update store state
export const actions = {
	set: <K extends keyof UIState>(key: K, value: UIState[K]) => {
		uiStore.set({ ...uiStore.get(), [key]: value });
		if (key === 'uiSidebar') ClientCookies.set(COOKIE_CONFIG.SIDEBAR, String(value));
		if (key === 'uiTheme') {
			ClientCookies.set(COOKIE_CONFIG.THEME, String(value));
			applyTheme(value as Theme);
		}
	},
	toggleSidebar: () => actions.set('uiSidebar', !uiStore.get().uiSidebar),
	setLoading: (loading: boolean) => actions.set('uiLoading', loading),
	setTheme: (theme: Theme) => actions.set('uiTheme', theme),
};

// Helper to apply theme to document root
export const applyTheme = (theme: Theme) => {
	const root = document.documentElement;
	const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	root.setAttribute('data-theme', isDark ? 'dark' : 'light');
	root.classList.toggle('dark', isDark);
};

// Auto-initialize theme on import if in browser
if (typeof window !== 'undefined') {
	applyTheme(uiStore.get().uiTheme);
}

export const { toggleSidebar, setLoading, setTheme } = actions;
export default uiStore;
