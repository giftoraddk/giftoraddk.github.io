// vite.standalone.mjs — bundle nhúng: MỌI component src/packages/<gói>/svc-*.js của các gói trong PACKAGES (hiện: llm)
// → public/embed/<tên thẻ>.js, MỖI file 1 ES module tự đủ (không chunk, import động cũng gộp vào) để thả lên site bất kỳ
// bằng 1 thẻ <script type="module">. Thêm component svc-* mới vào gói = có bundle mới, không phải khai thêm gì. Astro
// copy public/ khi build nên file nằm ở https://<site>/embed/<tên thẻ>.js. Chạy: `pnpm build:embed` (`pnpm build` chạy trước).
//
// Mỗi bundle = embedTheme('<thẻ>') (src/embed/theme.js — bảng màu mặc định gắn trên thẻ) + chính component. Mỗi file
// mang bản lit + web-* riêng; mọi customElements.define đều có guard, nên trang tải nhiều bundle không lỗi định nghĩa trùng.
// Chỉ svc-aide gọi Worker được từ domain khác (route CORS '*', llm lib/cors.ts); các component còn lại cần domain đó
// nằm trong ALLOWED_ORIGIN của worker (và đăng nhập Supabase trên domain đó).
//
// Biến môi trường: CHỈ các khoá trong EMBED_ENV được nhúng vào bundle (đọc từ .env / .env.production như Astro) —
// envPrefix trỏ vào tiền tố không có thật, nên `import.meta.env` (kể cả truy cập động) không bao giờ mang theo các
// PUBLIC_* khác của site (khoá API…). Thêm khoá = thêm vào EMBED_ENV, và chỉ khi nó thật sự công khai.
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { build, loadEnv } from 'vite';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(ROOT, 'public/embed');
const ENTRIES = resolve(ROOT, 'node_modules/.cache/embed'); // entry tạm của từng bundle (node_modules — không vào git)
const MODE = process.env.MODE || 'production';
const PACKAGES = ['llm'];

const EMBED_ENV = ['PUBLIC_LLM_URL', 'PUBLIC_AUTH_URL', 'PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

const env = loadEnv(MODE, ROOT, 'PUBLIC_');
const missing = EMBED_ENV.filter((key) => !env[key]);
if (missing.length) console.warn(`[embed] thiếu ${missing.join(', ')} — bundle sẽ gọi tương đối, chỉ chạy được trên chính site này`);
const define = Object.fromEntries(EMBED_ENV.map((key) => [`import.meta.env.${key}`, JSON.stringify(env[key] ?? '')]));

/** [{ tag: 'svc-aide', file: '/abs/src/packages/llm/svc-aide.js' }, …] — thẻ = tên file (svc-*.js tự define đúng tên đó). */
const components = PACKAGES.flatMap((pkg) => {
	const dir = resolve(ROOT, 'src/packages', pkg);
	return readdirSync(dir)
		.filter((f) => /^svc-[a-z0-9-]+\.js$/.test(f))
		.map((f) => ({ tag: basename(f, '.js'), file: resolve(dir, f).replace(/\\/g, '/') }));
});
if (!components.length) {
	console.log('[embed] không có component svc-*.js nào');
	process.exit(0);
}
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });

// Entry của 1 bundle: bảng màu cho thẻ, rồi component — ghi ra tệp tạm (lib.entry của Vite cần 1 đường dẫn thật).
function entryFile({ tag, file }) {
	const path = resolve(ENTRIES, `${tag}.js`);
	const source = [
		"import { embedTheme } from '@/embed/theme.js';",
		`embedTheme(${JSON.stringify(tag)});`,
		`import ${JSON.stringify(file)};`,
	];
	writeFileSync(path, `${source.join('\n')}\n`);
	return path;
}
mkdirSync(ENTRIES, { recursive: true });

async function buildOne(component) {
	const { tag } = component;
	await build({
		configFile: false,
		root: ROOT,
		mode: MODE,
		logLevel: 'warn',
		base: './',
		publicDir: false,
		envPrefix: 'EMBED_NEVER_', // không khoá nào khớp — xem đầu file
		define,
		resolve: { alias: [{ find: '@', replacement: resolve(ROOT, 'src') }] },
		build: {
			target: 'es2022',
			outDir: OUT,
			emptyOutDir: false,
			copyPublicDir: false,
			minify: 'terser',
			terserOptions: {
				compress: { passes: 3, drop_debugger: true, pure_getters: true, keep_infinity: true },
				format: { comments: false },
			},
			lib: { entry: entryFile(component), formats: ['es'], fileName: () => `${tag}.js` },
			rollupOptions: { checks: { pluginTimings: false }, output: { codeSplitting: false } }, // 1 file — import động cũng gộp vào
		},
	});
	console.log(`  public/embed/${tag}.js`);
}

console.log(`\n[embed] ${components.length} bundle (${MODE}): ${components.map((c) => c.tag).join(', ')}`);
for (const c of components) await buildOne(c);
console.log('');
