/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: {
		files: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}', './src/webs/**/*.{js,jsx,ts,tsx,html}', './src/utils/attrs/opt.js'],
	},
	theme: {
		extend: {
			fontFamily: {
				display: ['Merienda', 'serif'],
				sans: ['Reddit Sans', 'system-ui', 'sans-serif'],
			},
		},
	},
};
