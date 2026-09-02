import { resolve } from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import { copyFileSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import glob from 'fast-glob';

const BANNER = readFileSync(new URL('./LICENSE', import.meta.url), 'utf-8').trim();

const ROOT = './src/webs';
const SRC_ROOT = resolve(__dirname, 'src').replace(/\\/g, '/');

// Vite luôn inline import.meta.env.* ở build lib (khớp env local -> giá trị,
// không khớp envPrefix -> "undefined"). Bundle này được source khác (dùng
// .env riêng) import lại nên phải giữ nguyên literal import.meta.env.* để
// source đó tự resolve ở build của họ: che trước khi Vite transform, khôi
// phục lại sau khi bundle ghi ra file.
const IMPORT_META_ENV_PLACEHOLDER = '__RAW_IMPORT_META_ENV__';

export default defineConfig(async () => {
	const destWebs = resolve(process.cwd(), 'dest/webs');
	if (existsSync(destWebs)) {
		rmSync(destWebs, { recursive: true, force: true });
	}

	const entries = await glob([`${ROOT}/*/*.{js,jsx,ts,tsx}`, `${ROOT}/*/styles/*.css`], {
		absolute: true,
		ignore: [`${ROOT}/trade/**`],
	});

	const input = {};
	entries.forEach((file) => {
		const isCss = file.endsWith('.css');
		const base = file
			.replace(resolve(__dirname, 'src/webs').replace(/\\/g, '/'), '')
			.replace(/^\//, '')
			.replace(/\.[^/.]+$/, '');

		if (isCss) {
			const key = base.replace(/\/styles\//, '/') + '-style';
			input[key] = file;
		} else {
			input[base] = file;
		}
	});

	return {
		base: '/',
		publicDir: false,
		resolve: {
			alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
		},
		plugins: [
			tailwindcss({
				content: ['./src/webs/**/*.{js,jsx,ts,tsx,html}'],
			}),
			{
				name: 'preserve-import-meta-env',
				enforce: 'pre',
				transform(code, id) {
					const normalized = id.replace(/\\/g, '/');
					if (!normalized.startsWith(SRC_ROOT) || !code.includes('import.meta.env')) return null;
					return code.split('import.meta.env').join(IMPORT_META_ENV_PLACEHOLDER);
				},
			},
			{
				name: 'copy-html',
				writeBundle() {
					const srcFile = resolve(__dirname, 'src/webs/index.html');
					const destDir = resolve(process.cwd(), 'dest/webs');
					const destFile = resolve(destDir, 'index.html');
					if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
					if (existsSync(srcFile)) copyFileSync(srcFile, destFile);
				},
			},
			{
				name: 'mega-banner',
				async closeBundle() {
					const destDir = resolve(process.cwd(), 'dest/webs').replace(/\\/g, '/');
					const header = `/*\n${BANNER}\n*/\n`;
					const files = await glob(`${destDir}/**/*.js`, { absolute: true });
					for (const file of files) {
						const content = readFileSync(file, 'utf-8').split(IMPORT_META_ENV_PLACEHOLDER).join('import.meta.env');
						writeFileSync(file, header + content, 'utf-8');
					}
				},
			},
		],
		esbuild: {
			jsx: 'automatic',
			jsxImportSource: 'lit',
			legalComments: 'none',
		},
		css: {
			postcss: {
				plugins: [autoprefixer],
			},
		},
		build: {
			target: 'esnext',
			outDir: resolve(process.cwd(), 'dest'),
			emptyOutDir: false,
			minify: 'terser',
			terserOptions: {
				compress: {
					passes: 3,
					drop_debugger: true,
					pure_getters: true,
					keep_infinity: true,
					booleans_as_integers: false,
				},
				mangle: {
					toplevel: true,
				},
				format: {
					comments: false,
				},
			},
			lib: {
				entry: input,
				formats: ['es'],
			},
			cssCodeSplit: true,
			rollupOptions: {
				output: {
					entryFileNames: `webs/[name].js`,
					chunkFileNames: `webs/chunks/[name].js`,
					assetFileNames: (assetInfo) => {
						const name = assetInfo.name.replace(/-style(\.css)?$/, '');
						const parts = name.split('/');
						if (parts.length > 1) {
							const section = parts[0];
							const filename = parts.slice(1).join('/');
							return `webs/${section}/styles/${filename}.[ext]`;
						}
						return `webs/${name}.[ext]`;
					},
					format: 'es',
					experimentalMinChunkSize: 0,
					manualChunks(id) {
						if (id.includes('/node_modules/')) {
							if (id.includes('/lit/') || id.includes('/@lit/')) return 'lit';
							if (id.includes('/@tiptap/') || id.includes('/prosemirror-')) return 'tiptap';
							if (id.includes('/codemirror/') || id.includes('/@codemirror/') || id.includes('/@lezer/')) return 'codemirror';
							if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
							if (id.includes('/iconify-icon/') || id.includes('/@iconify/')) return 'iconify';
							if (id.includes('/keen-slider/')) return 'keen-slider';
							if (id.includes('/vanilla-calendar-pro/')) return 'calendar';
							if (id.includes('/echarts/') || id.includes('/zrender/')) return 'echarts';
							return 'vendor';
						}
					},
				},
			},
		},
	};
});
