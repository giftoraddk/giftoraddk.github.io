// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import { unified } from '@astrojs/markdown-remark';
import { site } from './src/services/constants/site.js';
import vercel from '@astrojs/vercel';
// import node from '@astrojs/node';

// Thư mục con của src/pages/ muốn loại khỏi `pnpm build` (production) — vẫn hoạt động bình
// thường lúc `pnpm dev`/`pnpm preview` (chỉ áp dụng khi command === 'build', xem
// excludePagesIntegration bên dưới). Ghi tên thư mục tương đối tới src/pages/, vd 'channel' loại
// toàn bộ src/pages/channel/**.
const excludePages = ['channel', 'doc', 'landing', 'shop', 'talent', 'ui', 'software'];

// 'ssg' (mặc định) — mọi route bake tĩnh lúc build, đúng như trước giờ.
// 'isr' (`PUBLIC_RENDER=isr pnpm build`, xem package.json "build:isr") — 4 route data-động ở
// PUBLIC_RENDER_ROUTES chuyển sang on-demand + cache theo thời gian (Vercel ISR, xem
// renderModeIntegration bên dưới), mọi route khác KHÔNG đổi, vẫn tĩnh 100%.
const PUBLIC_RENDER = process.env.PUBLIC_RENDER === 'isr' ? 'isr' : 'ssg';

// 4 route có 2 biến thể ([slug/tag].astro = SSG mặc định, _render-modes/[slug/tag].isr.astro =
// ISR) — xem Context trong mỗi file .isr.astro để hiểu vì sao SSG/ISR cần code khác nhau (không
// gộp bằng 1 `export const prerender = <biểu thức>` được, xem renderModeIntegration).
const PUBLIC_RENDER_ROUTES = [
	'product/[slug].astro',
	'product/tag/[tag].astro',
	'post/[slug].astro',
	'post/tag/[tag].astro',
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir  = path.join(__dirname, 'src/pages');
const stashDir  = path.join(__dirname, '.astro-build-stash');

/**
 * Move các thư mục trong `excludePages` ra khỏi src/pages/ TRƯỚC khi Astro quét route (nên các
 * trang đó không được build luôn, không phải build-rồi-xoá-output) — restore lại ngay khi build
 * xong (thành công hay lỗi) để working tree không bao giờ ở trạng thái thiếu thư mục. Chỉ chạy
 * khi `astro build` (command === 'build') — `pnpm dev` luôn thấy đủ trang để code/preview.
 */
function excludePagesIntegration() {
	/** @type {string[]} */
	let moved = [];

	const restore = () => {
		for (const name of moved) {
			const from = path.join(stashDir, name);
			if (fs.existsSync(from)) fs.renameSync(from, path.join(pagesDir, name));
		}
		moved = [];
	};

	return {
		name: 'exclude-pages',
		hooks: {
			/** @param {{ command: 'dev' | 'build' | 'preview' | 'sync' }} opts */
			'astro:config:setup': ({ command }) => {
				if (command !== 'build' || !excludePages.length) return;

				fs.mkdirSync(stashDir, { recursive: true });
				moved = excludePages.filter((name) => fs.existsSync(path.join(pagesDir, name)));
				for (const name of moved) {
					fs.renameSync(path.join(pagesDir, name), path.join(stashDir, name));
				}

				// An toàn khi build bị Ctrl+C hoặc crash giữa chừng — vẫn trả file về chỗ cũ.
				process.once('exit', restore);
				process.once('SIGINT', () => { restore(); process.exit(1); });
			},
			'astro:build:done': restore,
		},
	};
}

/**
 * PUBLIC_RENDER=isr: trước khi Astro quét route, đè nội dung 4 file trong PUBLIC_RENDER_ROUTES bằng
 * biến thể `_render-modes/*.isr.astro` tương ứng (sao lưu nội dung SSG gốc trong bộ nhớ) — restore
 * lại nguyên trạng ngay khi build xong (thành công hay lỗi), same safety net như
 * excludePagesIntegration. PUBLIC_RENDER mặc định ('ssg') khiến hàm này no-op hoàn toàn — không
 * đụng file nào, `pnpm build` giữ nguyên hành vi như trước khi có tính năng này.
 */
function renderModeIntegration() {
	/** @type {Map<string, string>} */
	const backups = new Map();

	const restore = () => {
		for (const [rel, content] of backups) {
			fs.writeFileSync(path.join(pagesDir, rel), content);
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
					const target  = path.join(pagesDir, rel);
					const variant = path.join(path.dirname(target), '_render-modes', path.basename(target).replace(/\.astro$/, '.isr.astro'));
					if (!fs.existsSync(target) || !fs.existsSync(variant)) continue;

					backups.set(rel, fs.readFileSync(target, 'utf-8'));
					fs.copyFileSync(variant, target);
				}

				// An toàn khi build bị Ctrl+C hoặc crash giữa chừng — vẫn trả file về chỗ cũ.
				process.once('exit', restore);
				process.once('SIGINT', () => { restore(); process.exit(1); });
			},
			'astro:build:done': restore,
		},
	};
}

// https://astro.build/config
export default defineConfig({
	// Bắt buộc phải set — không có `site`, Astro.site là undefined và safeURL()
	// (Head/Base.astro's canonical/og:image) rơi về Astro.url.origin, mặc định
	// "http://localhost:4321" lúc build static — khiến og:image/canonical sai domain.
	site: site.domain,
	integrations: [mdx(), excludePagesIntegration(), renderModeIntegration()],
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
	outDir: './doc',
	// Only routes with `export const prerender = false` (e.g. the fake CRUD mock under
	// /api/products, or the 4 ISR routes swapped in by renderModeIntegration when
	// PUBLIC_RENDER=isr) run through an adapter — everything else stays a fully static build.
	// Adapter is only attached in ISR mode so the default `pnpm build` never even loads it.
	// adapter: node({ mode: 'standalone' }),
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
  experimental: {
    collectionStorage: {
      type: 'chunked',
      chunkSize: 1024 * 1024, // reduce the size of chunks
    },
  },
});
