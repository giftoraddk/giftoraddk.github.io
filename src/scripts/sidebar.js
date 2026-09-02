// Sidebar management script
import { toggleSidebar, uiStore, initializeApp } from '../stores/astroApp.js';

class SidebarManager {
	constructor() {
		this.sidebar = null;
		this.isInitialized = false;

		this.init();
	}

	init() {
		// Wait for DOM to be ready
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => this.setup());
		} else {
			this.setup();
		}
	}

	setup() {
		this.sidebar = document.getElementById('sidebar');

		if (!this.sidebar) {
			console.warn('Sidebar element not found');
			return;
		}

		this.isInitialized = true;

		// Initialize app (theme, etc.)
		initializeApp();

		// Subscribe to store changes
		this.unsubscribe = uiStore.subscribe((state) => {
			this.updateSidebar(state.uiSidebar);
		});

		// Initialize sidebar state
		const initialState = uiStore.get();
		this.updateSidebar(initialState.uiSidebar);

		// Add event listeners
		this.addEventListeners();

		console.log('Sidebar manager initialized');
	}

	updateSidebar(isOpen) {
		if (!this.isInitialized) return;

		// Update sidebar width and opacity
		this.sidebar.style.width = isOpen ? '240px' : '0px';
		this.sidebar.style.opacity = isOpen ? '1' : '0';
		this.sidebar.style.visibility = isOpen ? 'visible' : 'hidden';
	}

	addEventListeners() {
		// Keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			// Ctrl/Cmd + B to toggle sidebar
			if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
				e.preventDefault();
				toggleSidebar();
			}

			// Escape to close sidebar
			if (e.key === 'Escape') {
				const state = uiStore.get();
				if (state.uiSidebar) {
					toggleSidebar();
				}
			}
		});

		// Close sidebar on outside click (optional)
		document.addEventListener('click', (e) => {
			const state = uiStore.get();
			if (state.uiSidebar && !this.sidebar.contains(e.target)) {
				// Uncomment the line below if you want to close sidebar on outside click
				// toggleSidebar();
			}
		});
	}

	destroy() {
		if (this.unsubscribe) {
			this.unsubscribe();
		}
		this.isInitialized = false;
	}
}

// Initialize sidebar manager
const sidebarManager = new SidebarManager();

// Make functions available globally for debugging
window.sidebarManager = sidebarManager;
window.toggleSidebar = toggleSidebar;

// Import tests in development mode
if (import.meta.env.DEV) {
	import('./test-cookies.js').then(({ CookieTester }) => {
		console.log('🧪 Cookie tester loaded');
	});

	import('./test-sidebar-init.js').then(({ SidebarInitTester }) => {
		console.log('🧪 Sidebar init tester loaded');
	});

	import('./test-theme.js').then(({ ThemeTester }) => {
		console.log('🎨 Theme tester loaded');
	});
}

// Export for use in other modules
export { sidebarManager, SidebarManager };
