// src/modules/system/docs.js — dữ liệu trang /system/docs (src/pages/system/docs.astro): đoạn mã mẫu, mục lục, bảng
// thuộc tính svc-aide, bảng tool MCP (llm src/mcp.ts TOOLS), câu lệnh mẫu cho AI. Tách khỏi frontmatter vì trình
// biên dịch Astro không nhận HTML trong template literal ở đó. Chuỗi trong `attrs` / `tools` là HTML (set:html) — chỉ
// văn bản tĩnh viết ở đây, không bao giờ dữ liệu người dùng.

/**
 * @param {{ site: string, released: { id: string }[] }} ctx — origin của site (nơi có /embed/svc-aide.js), các ngành đã mở.
 * Đoạn mã render sẵn với ngành mở đầu tiên (`sector`) — khách chọn lĩnh vực ở đầu trang, script của docs.astro đổi
 * `division="<ngành>.consult"` trong mọi khối [data-sector-code] và link [data-sector-href] theo lựa chọn.
 */
export function docsContent({ site, released }) {
	const embedUrl = `${site}/embed/svc-aide.js`;
	const sector = released[0]?.id ?? 'ecommerce';

	const snippet = [
		`<script type="module" src="${embedUrl}"></script>`,
		`<svc-aide division="${sector}.consult" owner="YOUR_HUB_ID"></svc-aide>`,
	].join('\n');

	// Mẫu có chú thích / dữ liệu theo ngôn ngữ — { vi, en }, trang in cả hai, CSS .i18n-* hiện đúng bản.
	const inline = (comment) => [
		`<!-- ${comment} -->`,
		'<div style="height: 560px; max-width: 420px">',
		`  <svc-aide embedded division="${sector}.consult" owner="YOUR_HUB_ID"></svc-aide>`,
		'</div>',
	].join('\n');
	const snippetInline = {
		vi: inline('Khung chat nằm ngay trong trang (không nút nổi) — tự lấp đầy khung chứa'),
		en: inline('The chat sits right in the page (no floating button) — it fills its container'),
	};

	const theme = ([accent, surface, text]) => [
		'svc-aide {',
		`  --color-primary: #e11d48;      /* ${accent} */`,
		`  --color-base-100: #ffffff;     /* ${surface} */`,
		`  --color-base-content: #1f2937; /* ${text} */`,
		'  --font-sans: "Inter", system-ui, sans-serif;',
		'}',
	].join('\n');
	const snippetTheme = {
		vi: theme(['màu nhấn: nút, viền focus', 'nền panel', 'chữ']),
		en: theme(['accent: buttons, focus ring', 'panel background', 'text']),
	};

	const apiSample = {
		vi: JSON.stringify([
			{ id: 'sp-001', name: 'Áo khoác gió', description: 'Chống nước, 3 màu, size S–XL. Giá 450.000đ.', tags: ['ao-khoac'] },
			{ id: 'faq-ship', question: 'Bao lâu thì nhận hàng?', answer: 'Nội thành 1–2 ngày, tỉnh 3–5 ngày.' },
		], null, 2),
		en: JSON.stringify([
			{ id: 'sku-001', name: 'Windbreaker jacket', description: 'Waterproof, 3 colors, sizes S–XL. $39.', tags: ['jackets'] },
			{ id: 'faq-shipping', question: 'How long does delivery take?', answer: '1–2 days in the city, 3–5 days elsewhere.' },
		], null, 2),
	};

	const toc = [
		{ id: 'overview', icon: 'ri:compass-3-line', text: { vi: 'Tổng quan', en: 'Overview' } },
		{ id: 'quickstart', icon: 'ri:flashlight-line', text: { vi: 'Bắt đầu nhanh', en: 'Quick start' } },
		{ id: 'embed', icon: 'ri:code-s-slash-line', text: { vi: 'Nhúng trợ lý', en: 'Embed the assistant' } },
		{ id: 'knowledge', icon: 'ri:book-open-line', text: { vi: 'Nạp kiến thức', en: 'Load knowledge' } },
		{ id: 'mcp', icon: 'ri:plug-line', text: { vi: 'MCP — cài tự động', en: 'MCP — auto install' } },
		{ id: 'pro', icon: 'ri:team-line', text: { vi: 'Thư ký & 9 phòng ban', en: 'Secretary & 9 departments' } },
		{ id: 'security', icon: 'ri:shield-keyhole-line', text: { vi: 'Token & bảo mật', en: 'Tokens & security' } },
		{ id: 'troubleshoot', icon: 'ri:tools-line', text: { vi: 'Khắc phục sự cố', en: 'Troubleshooting' } },
	];

	const attrs = [
		['owner', { vi: 'BẮT BUỘC — hub id của bạn (trong email mua gói). Trợ lý CHỈ trả lời từ kho kiến thức này. Thiếu owner thì trợ lý không chạy trên site của bạn (kiến thức chung chỉ dành cho site của nền tảng).', en: 'REQUIRED — your hub id (in the purchase email). The assistant answers ONLY from this knowledge base. Without it the assistant does not run on your site (the shared knowledge is for the platform\'s own sites).' }],
		['division', { vi: `Phòng Tư vấn của lĩnh vực bạn chọn: <code>&lt;ngành&gt;.consult</code> — chọn ở <b>Lĩnh vực của bạn</b> đầu trang, đoạn mã tự đổi. Đang mở: ${released.map((s) => `<code>${s.id}.consult</code>`).join(', ')}.`, en: `The Consult of the sector you pick: <code>&lt;sector&gt;.consult</code> — choose it under <b>Your sector</b> at the top, the code follows. Open now: ${released.map((s) => `<code>${s.id}.consult</code>`).join(', ')}.` }],
		['theme', { vi: '<code>dark</code> (mặc định) hoặc <code>light</code>.', en: '<code>dark</code> (default) or <code>light</code>.' }],
		['lang', { vi: '<code>vi</code> (mặc định) hoặc <code>en</code> — chữ trên giao diện; trợ lý trả lời theo ngôn ngữ khách hỏi.', en: '<code>vi</code> (default) or <code>en</code> — the interface text; answers follow the visitor\'s language.' }],
		['x, y', { vi: 'Vị trí nút nổi, mặc định <code>99%</code> / <code>65%</code> (như background-position).', en: 'Floating button position, default <code>99%</code> / <code>65%</code> (like background-position).' }],
		['types', { vi: 'Chỉ dùng kiến thức các loại này, nối bằng <code>|</code> — vd <code>product|faq</code>. Trống = mọi loại.', en: 'Only use these knowledge types, joined with <code>|</code> — e.g. <code>product|faq</code>. Empty = every type.' }],
		['embedded', { vi: 'Không có nút nổi — chỉ khung chat, lấp đầy phần tử chứa nó.', en: 'No floating button — just the chat panel, filling its container.' }],
	];

	const tools = [
		['hub_info', { vi: 'Hub của token: owner, gói, nguồn đã lưu, số dòng kiến thức theo loại.', en: 'The token\'s hub: owner, plan, saved sources, knowledge rows per type.' }],
		['list_knowledge', { vi: 'Các dòng gần đây — lọc theo loại, trạng thái, ngành, phòng.', en: 'Recent rows — filter by type, status, sector, department.' }],
		['import_url', { vi: 'Đọc 1 API JSON và chép vào kiến thức (tự đoán cột; <code>dryRun</code> để xem trước).', en: 'Read a JSON API and copy it into knowledge (fields guessed; <code>dryRun</code> to preview).' }],
		['upsert_knowledge', { vi: 'Ghi các mục AI tự soạn — cùng <code>id</code> thì cập nhật.', en: 'Write items the AI shaped itself — the same <code>id</code> updates.' }],
		['reindex_knowledge', { vi: 'Lập lại chỉ mục tìm kiếm (vector + từ khoá) cho các dòng còn chờ.', en: 'Rebuild the search index (vector + keyword) for pending rows.' }],
		['delete_knowledge', { vi: 'Xoá dòng theo id — chỉ của hub mình.', en: 'Delete rows by id — your own hub\'s only.' }],
	];

	const prompts = [
		{ vi: 'Gọi hub_info của astro-knowledge, cho tôi biết đang có bao nhiêu kiến thức.', en: 'Call hub_info on astro-knowledge and tell me how much knowledge there is.' },
		{ vi: 'Nạp https://api.cuahang.vn/products vào trợ lý, loại product — chạy dryRun trước cho tôi xem cách map.', en: 'Load https://api.myshop.com/products into the assistant as type product — dryRun first so I can check the mapping.' },
		{ vi: 'Đọc file chinh-sach-doi-tra.md này, tách thành các mục FAQ tự đủ ý rồi upsert_knowledge với loại faq.', en: 'Read this returns-policy.md, split it into self-contained FAQ items and upsert_knowledge them as type faq.' },
	];

	return { sector, snippet, snippetInline, snippetTheme, apiSample, toc, attrs, tools, prompts };
}
