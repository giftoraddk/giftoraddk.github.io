import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import { copyFileSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import glob from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BANNER = readFileSync(new URL('./LICENSE', import.meta.url), 'utf-8').trim();
const HEADER = `/*\n${BANNER}\n*/\n`;
const ROOT = './src/webs';
const DEST = resolve(process.cwd(), 'dest');
const DEST_WEBS = resolve(DEST, 'webs');
const CONCURRENCY = 6;

const SRC_WEBS = resolve(__dirname, 'src/webs').replace(/\\/g, '/');

if (existsSync(DEST_WEBS)) rmSync(DEST_WEBS, { recursive: true, force: true });

const allEntries = await glob(
	[`${ROOT}/*/*.{js,jsx,ts,tsx}`, `${ROOT}/*/styles/*.css`],
	{ absolute: true, ignore: [`${ROOT}/trade/**`] }
);

const jsFiles = allEntries.filter((f) => !f.endsWith('.css'));
const cssFiles = allEntries.filter((f) => f.endsWith('.css'));

function entryName(file) {
	return file.replace(/\\/g, '/').replace(`${SRC_WEBS}/`, '').replace(/\.[^/.]+$/, '');
}

const sharedConfig = {
	configFile: false,
	logLevel: 'warn',
	base: '/',
	publicDir: false,
	resolve: {
		alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
	},
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'lit',
		legalComments: 'none',
	},
	css: { postcss: { plugins: [autoprefixer] } },
};

const terserOptions = {
	compress: {
		passes: 3,
		drop_debugger: true,
		pure_getters: true,
		keep_infinity: true,
		booleans_as_integers: false,
	},
	mangle: { toplevel: true },
	format: { comments: false },
};

// Build một JS entry thành file standalone hoàn toàn — không có chunks
async function buildJs(file) {
	const name = entryName(file);
	const outFile = resolve(DEST, `webs/${name}.js`);

	await build({
		...sharedConfig,
		plugins: [tailwindcss({ content: ['./src/webs/**/*.{js,jsx,ts,tsx,html}'] })],
		build: {
			target: 'esnext',
			outDir: DEST,
			emptyOutDir: false,
			minify: 'terser',
			terserOptions,
			rollupOptions: {
				input: { [name]: file },
				output: {
					format: 'es',
					entryFileNames: 'webs/[name].js',
					// Không dùng chunkFileNames vì không có shared chunks
				},
			},
		},
	});

	if (existsSync(outFile)) {
		const content = readFileSync(outFile, 'utf-8');
		writeFileSync(outFile, HEADER + content, 'utf-8');
	}
}

// Build tất cả CSS styles trong một lần
async function buildCss() {
	if (!cssFiles.length) return;
	const input = {};
	cssFiles.forEach((file) => {
		const base = entryName(file);
		input[base.replace(/\/styles\//, '/') + '-style'] = file;
	});

	await build({
		...sharedConfig,
		build: {
			target: 'esnext',
			outDir: DEST,
			emptyOutDir: false,
			rollupOptions: {
				input,
				output: {
					assetFileNames: (assetInfo) => {
						const name = assetInfo.name.replace(/-style(\.css)?$/, '');
						const parts = name.split('/');
						if (parts.length > 1) {
							const [section, ...rest] = parts;
							return `webs/${section}/styles/${rest.join('/')}.[ext]`;
						}
						return `webs/${name}.[ext]`;
					},
				},
			},
		},
	});
}

// Chạy tasks theo lô với giới hạn đồng thời
async function runBatched(fns, concurrency) {
	let done = 0;
	for (let i = 0; i < fns.length; i += concurrency) {
		await Promise.all(fns.slice(i, i + concurrency).map((fn) => fn()));
		done = Math.min(done + concurrency, fns.length);
		process.stdout.write(`\r  ${done}/${fns.length} components built`);
	}
	process.stdout.write('\n');
}

console.log(`\nBuilding ${jsFiles.length} components (standalone, no shared chunks)...\n`);
await runBatched(jsFiles.map((f) => () => buildJs(f)), CONCURRENCY);

console.log('Building CSS assets...');
await buildCss();

// Copy index.html
const srcHtml = resolve(__dirname, 'src/webs/index.html');
if (!existsSync(DEST_WEBS)) mkdirSync(DEST_WEBS, { recursive: true });
if (existsSync(srcHtml)) copyFileSync(srcHtml, resolve(DEST_WEBS, 'index.html'));

console.log('\nDone.\n');
