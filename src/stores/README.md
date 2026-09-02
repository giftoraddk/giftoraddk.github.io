# UI Store

Simple UI state management using Nanostore with Astro cookies.

## Features

- **Sidebar**: Toggle open/close
- **Theme**: Light/Dark/Auto mode with cookie persistence
- **Modal**: Open/close modals
- **Loading**: Global loading state
- **Toast**: Success, error, warning, info notifications

## Quick Start

```typescript
import { uiStore, toggleSidebar, toggleTheme, openModal, addToast } from '@/stores/astroApp';

// Get state
const state = uiStore.get();

// Actions
toggleSidebar();
toggleTheme();
openModal('my-modal');
addToast('success', 'Hello!');

// Subscribe to changes
const unsubscribe = uiStore.subscribe((state) => {
	console.log('State changed:', state);
});
```

## State

```typescript
interface UIState {
	uiSidebar: boolean;
	uiTheme: 'light' | 'dark' | 'auto';
	uiModal: boolean;
	activeModal: string | null;
	uiLoading: boolean;
	toasts: Array<{
		id: string;
		type: 'success' | 'error' | 'warning' | 'info';
		message: string;
	}>;
}
```

## Actions

- `toggleSidebar()` - Toggle sidebar
- `toggleTheme()` - Toggle between light/dark
- `setTheme(theme)` - Set theme (light/dark/auto)
- `openModal(id)` - Open modal
- `closeModal()` - Close modal
- `addToast(type, message)` - Add toast
- `setLoading(loading)` - Set loading state
- `initializeTheme()` - Initialize theme from cookies
- `resetCookies()` - Reset all cookies

## Theme Management

```typescript
// Toggle between light and dark
toggleTheme();

// Set specific theme
setTheme('light'); // Light mode
setTheme('dark'); // Dark mode
setTheme('auto'); // Auto (follows system)

// Initialize theme on app start
initializeTheme();
```