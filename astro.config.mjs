// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import { unified } from '@astrojs/markdown-remark';
import vercel from '@astrojs/vercel';
import { site } from './src/services/tools/site.ts';

// 'ssg' (mặc định) — mọi route bake tĩnh lúc build.
// 'isr' (`PUBLIC_RENDER=isr pnpm build`, xem package.json "build:isr") — các route ở PUBLIC_RENDER_ROUTES chuyển
// sang on-demand + cache theo thời gian (Vercel ISR, xem renderModeIntegration bên dưới); mọi route khác vẫn tĩnh 100%.
// Biến PUBLIC_ nên client cũng đọc được qua import.meta.env.PUBLIC_RENDER.
const PUBLIC_RENDER = process.env.PUBLIC_RENDER === 'isr' ? 'isr' : 'ssg';

// Route có biến thể ISR ở `_render-modes/<tên>.isr.astro` cạnh nó. Route đã có file (bản SSG) → ISR đè lên; route
// CHƯA có file → chỉ tồn tại ở chế độ ISR. Không gộp được bằng 1 `export const prerender = <biểu thức>` vì SSG cần
// getStaticPaths còn ISR đọc Astro.params lúc request — xem Context trong từng file .isr.astro.
const PUBLIC_RENDER_ROUTES = [
	'product/[slug].astro',
	'product/tag/[tag].astro',
	'post/[slug].astro',
	'post/tag/[tag].astro',
];

// Trang đọc posts/products (fetchCollection) mà CÙNG 1 file chạy được cả 2 chế độ (không dùng props của getStaticPaths)
// — PUBLIC_RENDER=isr chỉ cần bật on-demand qua hook astro:route:setup, không cần biến thể .isr.astro. Thiếu các trang
// này thì trang chủ / danh sách / shop / sitemap đứng yên ở dữ liệu lúc build: bài/sản phẩm mới không có link nào dẫn tới.
// Trang có getStaticPaths ở đây chỉ dùng nó để liệt kê params — on-demand thì Astro bỏ qua nó, trang tự trả 404 với
// params lạ (Astro.isPrerendered).
const PUBLIC_RENDER_PAGES = [
	'index.astro',
	'product/index.astro',
	'product/tag/index.astro',
	'post/index.astro',
	'post/tag/index.astro',
	'gift/shop.astro',
	'gift/[budget].astro',
	'gift/[occasions].astro',
	'sitemap.xml.ts',
	'rss.xml.ts',
	'llms.txt.ts',
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src/pages');

/**
 * PUBLIC_RENDER=isr: trước khi Astro quét route, chép biến thể `_render-modes/*.isr.astro` vào chỗ từng route trong
 * PUBLIC_RENDER_ROUTES (nội dung SSG gốc sao lưu trong bộ nhớ; route chưa có file thì ghi nhận để xoá) — trả lại
 * nguyên trạng ngay khi build xong, lỗi, hay bị Ctrl+C. PUBLIC_RENDER mặc định ('ssg') → no-op hoàn toàn.
 */
function renderModeIntegration() {
	/** @type {Map<string, string | null>} rel → nội dung gốc, null = file do integration tạo */
	const backups = new Map();

	const restore = () => {
		for (const [rel, content] of backups) {
			const target = path.join(pagesDir, rel);
			if (content === null) fs.rmSync(target, { force: true });
			else fs.writeFileSync(target, content);
		}
		backups.clear();
	};

	return {
		name: 'render-mode',
		hooks: {
			/** @param {{ command: 'dev' | 'build' | 'preview' | 'sync' }} opts */
			'astro:config:setup': ({ command }) => {
				if (command !== 'build' || PUBLIC_RENDER !== 'isr') return;

				for (const rel of PUBLIC_RENDER_ROUTES) {
					const target = path.join(pagesDir, rel);
					const variant = path.join(path.dirname(target), '_render-modes', path.basename(target).replace(/\.astro$/, '.isr.astro'));
					if (!fs.existsSync(variant)) continue;

					backups.set(rel, fs.existsSync(target) ? fs.readFileSync(target, 'utf-8') : null);
					fs.copyFileSync(variant, target);
				}

				process.once('exit', restore);
				process.once('SIGINT', () => { restore(); process.exit(1); });
			},
			/** @param {{ route: import('astro').RouteOptions }} opts */
			'astro:route:setup': ({ route }) => {
				if (PUBLIC_RENDER !== 'isr') return;
				if (PUBLIC_RENDER_PAGES.some((rel) => route.component === `src/pages/${rel}`)) route.prerender = false;
			},
			'astro:build:done': restore,
		},
	};
}

/**
 * Chỉ giữ trong dist/ các trang thuộc mục cấp 1 của src/pages có trong `site.pages` (services/tools/site.ts — giftoraddk.com
 * chỉ bán quà tặng). Astro không có tuỳ chọn loại route khỏi build, và đổi tên src/pages lúc build bị Windows chặn
 * (EPERM khi IDE / watcher đang giữ thư mục) — nên mọi route vẫn render như thường, rồi astro:build:done xoá đầu ra cấp 1
 * của các mục ngoài danh sách (dist/gift, dist/rss.xml…). src/ không bị đụng tới; tên trùng 1 mục của public/ thì giữ.
 * Chỉ cho build tĩnh: `dev` và build ISR (route on-demand nằm ở function, không ở dist) vẫn đủ mọi trang.
 * `site.pages` rỗng = giữ tất cả.
 */
function pageScopeIntegration() {
	return {
		name: 'page-scope',
		hooks: {
			/** @param {{ dir: URL, logger: import('astro').AstroIntegrationLogger }} opts */
			'astro:build:done': ({ dir, logger }) => {
				if (!site.pages.length || PUBLIC_RENDER === 'isr') return;
				const outDir = fileURLToPath(dir);
				const publicNames = new Set(fs.readdirSync(path.join(__dirname, 'public')));
				const dropped = [];
				for (const name of fs.readdirSync(pagesDir)) {
					if (name.startsWith('_') || name.startsWith('.') || site.pages.includes(name)) continue;
					const out = name.replace(/\.(astro|mdx?|[jt]s)$/, ''); // 'gift' → 'gift', 'rss.xml.ts' → 'rss.xml'
					if (publicNames.has(out) || !fs.existsSync(path.join(outDir, out))) continue;
					fs.rmSync(path.join(outDir, out), { recursive: true, force: true });
					dropped.push(out);
				}
				logger.info(`kept: ${site.pages.join(', ')} — dropped: ${dropped.join(', ') || '(none)'}`);
			},
		},
	};
}

// https://astro.build/config
export default defineConfig({
	// URL gốc thật — Astro.site/Astro.url lúc build lấy từ đây; thiếu nó canonical/og:url (Head/Base.astro)
	// rơi về origin của server build. Cùng nguồn site.domain mà sitemap.xml/robots.txt/llms.txt dùng.
	site: site.domain,
	integrations: [mdx(), pageScopeIntegration(), renderModeIntegration()],
	markdown: {
		processor: unified({ remarkPlugins: [remarkGfm] }),
		shikiConfig: {
			theme: 'github-dark',
		},
	},
	devToolbar: {
    enabled: false
  },
	// experimental: {
	// 	svgo: true,
	// },
	output: 'static',
	outDir: './docs',
	// Khu quản trị chỉ có 1 trang động pages/admin/[table].astro — /admin/ về trang đầu tiên của modules/admin PAGES.
	redirects: {
		'/admin': '/admin/users/',
		// Trang chủ Giftora nằm ở gốc '/' (src/pages/index.astro) — link cũ /gift/ chuyển về đó.
		'/gift': '/',
	},
	// Chỉ route `export const prerender = false` (các route ISR do renderModeIntegration chép vào) chạy qua adapter —
	// mọi route khác vẫn build tĩnh. Adapter chỉ gắn ở chế độ ISR nên `pnpm build` mặc định không nạp nó.
	// expiration 1 giờ — dữ liệu sản phẩm / bài viết cập nhật trong vòng 1 giờ.
	adapter: PUBLIC_RENDER === 'isr' ? vercel({ isr: { expiration: 60 * 60 } }) : undefined,
	// Uncomment the line below if you want to deploy to a subdirectory like /mvp/
	// base: '/mvp/',
	server: {
		host: true, // Listens on all network interfaces
		port: 5000,
	},
	build: {
		inlineStylesheets: 'never',
	},
	vite: {
		plugins: [tailwindcss()],
		// resolve: {
		// 	alias: {
		// 		'@': resolve('./src'),
		// 	},
		// },
		build: {
			minify: 'terser',
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
					},
					assetFileNames: (assetInfo) => {
						const name = assetInfo.name || 'asset';
						const info = name.split('.');
						const ext = info[info.length - 1];
						if (/\.(css)$/.test(name)) {
							return `assets/css/[name].[ext]`;
						}
						if (/\.(js)$/.test(name)) {
							return `assets/js/[name].[ext]`;
						}
						return `assets/[name].[ext]`;
					},
					chunkFileNames: 'assets/js/[name].js',
					entryFileNames: 'assets/js/[name].js',
				},
			},
		},
	},
	// Disable HTML minification
	compressHTML: false,
  // experimental: {
  //   collectionStorage: {
  //     type: 'chunked',
  //     chunkSize: 1024 * 1024, // reduce the size of chunks
  //   },
  // },
});
