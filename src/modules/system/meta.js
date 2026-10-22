// src/modules/system/meta.js — thuần, không import gì: meta SEO của 2 trang / (bán hàng) và /system/docs (hướng
// dẫn), cùng nhãn nút CTA — module dữ liệu (index.js) dựng section từ đây, còn script client của trang so `cell-action`
// với đúng các nhãn này mà không kéo theo cả cấu hình section. sitemap.xml / llms.txt đọc meta qua landing/pages.js.

// Tên miền của AI Operations — URL tuyệt đối trên trang / và /system/docs: JSON-LD, đoạn nhúng (/embed/svc-aide.js), lệnh script cài
// MCP (/mcp/install.*). Cùng giá trị SITE_URL của llm (wrangler.jsonc — email token) và site.domain
// (services/tools/site.ts — canonical / sitemap); đổi tên miền thì đổi cả 3.
export const SITE = 'https://chatzui.com'

export const PRODUCT = { vi: 'AI Operations', en: 'AI Operations' }
export const TAGLINE = {
	vi: 'Chuyên môn đúng lĩnh vực, giải pháp thực chiến, cam kết hiệu quả thiết thực.',
	en: 'Domain-specific expertise. Battle-tested solutions. A commitment to measurable results.',
}

// Meta = tiếng Anh (site.defaultLang): <title>/description chỉ có 1 bản. `title` không lặp tên sản phẩm — Head/Base.astro tự
// nối " • {site.subtitle}" (= AI Operations) vào sau. Nội dung trang đủ vi + en — nút VI/EN ở bar
// (UtilityBar → BtnLang) đổi <html lang>, cookie giữ lựa chọn.
// path = '/': chatzui.com chỉ chạy AI Operations nên trang bán hàng là gốc domain (pages/index.astro); /system chuyển về đây.
export const page = {
	path: '/',
	lang: 'en',
	name: 'AI Operations',
	title: 'Domain-specific expertise. Battle-tested solutions. A commitment to measurable results.',
	description: 'Starter: an AI consultant (svc-aide) that answers your customers 24/7 from your own knowledge, embedded with one script tag and loaded over API or MCP. Pro: adds an AI Secretary (svc-talk) running all 9 departments.',
	indexable: true,
}

export const docsPage = {
	path: '/system/docs/',
	lang: 'en',
	name: 'AI Operations Guide',
	title: 'Guide — embed the assistant, load knowledge, auto-install MCP',
	description: 'How to embed svc-aide on your website, load knowledge from an API or by AI over MCP (one-click install for Claude, Cursor, VS Code), and run the Secretary and 9 departments on Pro.',
	indexable: true,
}

// Trang mua gói: bảng giá + thanh toán (PayPal) + quản lý gói đã mua + tài khoản nổi — pages/system/pricing.astro.
// Không index: trang thao tác (đăng nhập / thanh toán), nội dung giá đã nằm ở /system.
export const pricingPage = {
	path: '/system/pricing/',
	lang: 'en',
	name: 'AI Operations Pricing',
	title: 'Plans & checkout',
	description: 'Choose Starter or Pro, pay with PayPal, and manage the plan you bought.',
	indexable: false,
}

// Trang extension Zap Share: giới thiệu + bảng giá VietQR (VND, trả trước) + khoá bản quyền — pages/system/extension/zap-share.astro
// (hook/ZAP-SHARE.rst §10). Chưa index tới khi có link Chrome Web Store (zap/products.js `storeUrl`).
export const zapSharePage = {
	path: '/system/extension/zap-share/',
	lang: 'en',
	name: 'Zap Share',
	title: 'Zap Share – Cross-post to Facebook, Instagram, Threads, LinkedIn & X (Chrome extension)',
	description: 'Chrome extension to cross-post the page you are on to Facebook (profile, Page, Group), Instagram, Threads, LinkedIn and X in one click — many posts at once, scheduled up to 7 days, content never leaves your browser. 3 free posts.',
	indexable: false,
}

// Trang extension Zap Support: giới thiệu + bảng giá VietQR + khoá bản quyền — pages/system/extension/zap-support.astro
// (hook/ZAP-SUPPORT.rst §13). Chưa index tới khi có link Chrome Web Store (zap/products.js `storeUrl`).
export const zapSupportPage = {
	path: '/system/extension/zap-support/',
	lang: 'en',
	name: 'Zap Support',
	title: 'Zap Support – AI Auto Reply for Messenger, Zalo & Web Chat (Chrome extension)',
	description: 'AI chatbot Chrome extension that answers customers 24/7 on Messenger, Zalo, Facebook Business Suite and any web chat from your own product knowledge — with your GPT, Claude or Gemini key, or an AI on your computer. 1-day free trial.',
	indexable: false,
}

// Trang quản lý chung đơn chuyển khoản + bản quyền của các extension zap-* (đối soát, thu hồi, khoá) — pages/system/extension/manage.astro.
export const extensionManagePage = {
	path: '/system/extension/manage/',
	lang: 'en',
	name: 'Extension manager',
	title: 'Extensions — orders & licenses',
	description: 'Check Zap extension bank transfers, take back unpaid time and suspend licenses.',
	indexable: false,
}

/** /system/pricing mở sẵn thanh toán cho `planId` (kỳ mặc định: năm — đổi được ngay trên thẻ gói). */
export const pricingHref = (planId) => (planId ? `/system/pricing?plan=${encodeURIComponent(planId)}` : '/system/pricing')

// Nút CTA trong các section (web-cell phát `cell-action` với value = chữ trên nút, theo ngôn ngữ đang hiện) → hành động.
// `href` = chuyển trang; `scroll` = cuộn tới section id; `demo` = mở trợ lý thử ngay góc màn hình.
export const CTA = {
	// Vào thẳng không gian làm việc AI-Ecommerce — chế độ dùng thử: đăng nhập là chạy Thư ký + 9 phòng ban (config-sector.js).
	trial: { label: { vi: 'Bắt đầu miễn phí. Đi xa hơn', en: 'Start Free. Go Further' }, href: '/system/ecommerce' },
	docs: { label: { vi: 'Khám phá hướng dẫn', en: 'Explore the Guide' }, href: '/system/docs' },
	pricing: { label: { vi: 'Xem bảng giá', en: 'See pricing' }, scroll: 'pricingTabPlansApex' },
	demo: { label: { vi: 'Hỏi thử trợ lý', en: 'Ask the assistant' }, demo: true },
	starter: { label: { vi: 'Chọn Starter', en: 'Choose Starter' }, href: pricingHref('starter') },
	pro: { label: { vi: 'Chọn Pro', en: 'Choose Pro' }, href: pricingHref('pro') },
	workspace: { label: { vi: 'Xem không gian làm việc', en: 'See the workspace' }, href: '/system/ecommerce' },
}

/** The CTA a clicked label belongs to (either language), or null. */
export const ctaOf = (label) => Object.values(CTA).find((c) => c.label.vi === label || c.label.en === label) ?? null

// Trang không gian làm việc từng ngành (pages/system/[sector].astro, 1 trang / SECTOR_FACES) — meta SEO tiếng Anh như
// `page`. Mỗi ngành là 1 "mục con" của trang chủ: tên ngắn = nhãn menu Workspace (Google lấy <title> / chữ link làm tên
// sitelink), mô tả nói rõ ngành + việc AI làm. Ngành chưa phát hành (SECTOR_FACES `released: false`) vẫn noindex.
const SECTOR_SEO = {
	ecommerce: {
		title: 'AI-Ecommerce — AI workspace for online stores',
		description: 'An AI Secretary and 9 AI departments for online stores: product research, listings, SEO content, customer service and fulfilment. Try it free.',
	},
	education: {
		title: 'AI-Education — AI workspace for schools & training',
		description: 'An AI Secretary and 9 AI departments for schools and training centres: course design, enrolment marketing, scheduling and learner support. Try it free.',
	},
	fnb: {
		title: 'AI-F&B — AI workspace for restaurants & cafés',
		description: 'An AI Secretary and 9 AI departments for restaurants, cafés and food brands: menu development, marketing, ordering, kitchen operations and food safety. Try it free.',
	},
	healthcare: {
		title: 'AI-Healthcare — AI workspace for clinics',
		description: 'An AI Secretary and 9 AI departments for clinics and health services: service design, patient communication, scheduling and compliance.',
	},
	realestate: {
		title: 'AI-Real Estate — AI workspace for agencies',
		description: 'An AI Secretary and 9 AI departments for real-estate agencies and developers: listings, lead nurturing, viewings and deal follow-up.',
	},
}

export const sectorPath = (id) => `/system/${id}/`

/** Meta SEO của /system/<id>/ — { path, title, description } (ngành lạ → mô tả chung). */
export function sectorPage(id) {
	const seo = SECTOR_SEO[id] ?? { title: `${id} — AI workspace`, description: page.description }
	return { path: sectorPath(id), ...seo }
}
