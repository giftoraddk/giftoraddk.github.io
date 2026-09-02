# 🎨 Astro UI Components Library

A comprehensive CSS component library built with Tailwind CSS and inspired by ApexUI, designed for seamless integration with Astro projects. This library provides a complete set of modern, accessible, and customizable UI components with built-in theme support.

## ✨ Features

- 🚀 **Easy Integration**: Import with just 2 lines of code
- 🎨 **Multiple Themes**: Built-in light, dark, and custom themes
- 📱 **Responsive Design**: Mobile-first approach with Tailwind CSS
- ♿ **Accessibility**: WCAG compliant components
- 🎯 **TypeScript Support**: Full TypeScript definitions
- 🔧 **Highly Customizable**: Easy to extend and modify
- 📦 **Tree Shaking**: Import only what you need

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd astro-web

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Basic Usage

#### Import All Components

```css
@import 'tailwindcss';
@import 'components';
```

#### Import Individual Components

```css
@import 'tailwindcss';
@import 'components/button';
@import 'components/input';
@import 'components/modal';
@import 'components/table';
```

## 📁 Project Structure

```
src/styles/
├── components/              # Core UI Components
│   ├── button.css          # Button variants and styles
│   ├── input.css           # Form input components
│   ├── modal.css           # Modal and dialog components
│   ├── table.css           # Table and data display
│   ├── tabs.css            # Tab navigation
│   ├── pagination.css      # Pagination controls
│   ├── alert.css           # Alert and notification
│   ├── badge.css           # Badge and label
│   ├── avatar.css          # User avatar
│   ├── breadcrumb.css      # Navigation breadcrumb
│   ├── collapse.css        # Collapsible content
│   ├── loading.css         # Loading indicators
│   ├── menu.css            # Dropdown menus
│   ├── progress.css        # Progress bars
│   ├── swap.css            # Toggle/swap components
│   └── index.css           # Main components import
├── themes/                 # Theme System
│   ├── dark.css            # Dark theme
│   ├── index.css           # Theme imports
│   └── light.css           # Light theme (default)
├── utilities/              # Utility Classes
│   ├── glass.css           # Glass morphism effects
│   ├── join.css            # Element joining utilities
│   ├── radius.css          # Border radius utilities
│   ├── typography.css      # Text styling utilities
│   └── index.css           # Utility imports
├── basic/                  # Base Styles
│   └── custom.css          # Custom base styles
└── common/index.css              # Global CSS variables
```

## 🎨 Theme System

### Theme Switching

Switch themes dynamically using the `data-theme` attribute:

```html
<!-- Light Theme (Default) -->
<html data-theme="light">
	<body>
		<div class="bg-base-100 text-base-content">
			<!-- Your content -->
		</div>
	</body>
</html>

<!-- Dark Theme -->
<html data-theme="dark">
	<body>
		<div class="bg-base-100 text-base-content">
			<!-- Your content -->
		</div>
	</body>
</html>
```

### Color System

The library uses a semantic color system with CSS custom properties:

#### Base Colors

- `--color-base-100`: Primary background color
- `--color-base-200`: Secondary background color
- `--color-base-300`: Tertiary background color
- `--color-base-content`: Primary text color

#### Semantic Colors

- `--color-primary`: Primary brand color
- `--color-secondary`: Secondary brand color
- `--color-accent`: Accent color for highlights
- `--color-neutral`: Neutral color for subtle elements
- `--color-info`: Information color
- `--color-success`: Success color
- `--color-warning`: Warning color
- `--color-error`: Error color

### Tailwind Classes

```css
/* Background Colors */
.bg-base-100     /* Primary background */
/* Primary background */
/* Primary background */
/* Primary background */
.bg-base-200     /* Secondary background */
.bg-base-300     /* Tertiary background */

/* Text Colors */
.text-base-content    /* Primary text */
.text-primary         /* Primary brand text */
.text-secondary       /* Secondary brand text */
.text-accent          /* Accent text */

/* Border Colors */
.border-base-300      /* Default border */
.border-primary       /* Primary border */
.border-secondary /* Secondary border */
```
