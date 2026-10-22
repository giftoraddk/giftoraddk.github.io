// Khung chung của giftoraddk.com (trang chủ, /gift/*, /product/*, /post/*): giao diện (variant), bar, menu, footer — gom
// trong `chrome` để trang chỉ cần <Core {...chrome}> / <CoreShop {...chrome} shop={shop}>. Kèm cấu hình cửa hàng (`shop`) và
// khung `tintsChrome` (trang chủ, trang mua sắm, dịch vụ, chính sách). Công ty + mạng xã hội: modules/company.js.
// Menu và getStaticPaths của từng route tĩnh dùng chung nguồn — luôn khớp nhau:
// [group].astro ↔ CATEGORY_KEYS (services/shared/tags.ts) + budgetTiers,
// service/[slug].astro ↔ giftServices, policy/[slug].astro ↔ policyDocs.
import { categoryMenuItems } from '@/services/shared/tags';
import { company, companyBar, companyContact, companySocials } from '@/modules/company.js';
import { policies as policyDocs } from '@/modules/gift/policies';
import { budgetTiers, budgetPath } from '@/modules/gift/budget.js';
import { services as giftServices } from '@/modules/gift/services.js';

// ── Shop identity ─────────────────────────────────────────────────────────────────
// Người bán = công ty (modules/company.js) — KHÔNG gõ lại tên / SĐT / địa chỉ ở đây, mọi thứ dựng từ `company` để hoá đơn,
// footer, JSON-LD luôn cùng 1 dữ liệu. Chuỗi `~` không được chứa '~' / '|' (ô của invoice.seller — auth/worker invoices.ts).
const cell = (v) => String(v ?? '').replace(/[~|]/g, ' ').trim();

export const shop = {
	// user id người bán — #pay-factor (CoreShop), quyền người bán ở trang đơn (/product/invoice). Phải khớp var SELLER_IDS
	// của Worker auth (src/packages/auth/worker/wrangler.jsonc) — Worker không đọc được file này nên sửa cả 2 nơi.
	sellerId: '01JUU9AA1EB3J1NRZEGPQXJY3B',
	// name~phone~address~email~taxCode — format `seller` của svc-pay (pay/service _buildSellerSlot)
	seller: [company.name.vi, company.hotline, company.address, company.email, company.taxNumber].map(cell).join('~'),
	// Tài khoản nhận tiền — chủ tài khoản / ngân hàng chỉ có ở đây
	wallet: {
		bank: {
			accountNo: '00951018802',
			accountName: 'LE THI KIM DAN',
			bankName: 'TPBank',
			bin: '970423',
		},
	},
	vietqr: {
		clientId: '6d04884c-5a4c-4c07-ab9f-a4285b853e2b',
		apiKey: 'a10eeaa5-472b-4c01-bf26-6dcb9adf460e',
	},
  cashDisabled: true
};

// ── UI Common ─────────────────────────────────────────────────────────────────────
export const variant = {
	theme: 'light', // set default
	light: {
		ui: 'pastel',
		mainColors: '#0b2d5b|#d4af37|#c1e5a9|#a1a6d3|#e2a9db', // primary|secondary|accent|info|warning|success|error
		bgColors: '#ffffff|#f2f2f2|#f7f2eb', // --color-base-100|--color-base-200|--color-base-300
		textColor: '#0b2d5b', // --color-base-content
		bgImage: '/images/common/gift-light-blur.webp', // bgImage ex: /images/common/bg-light.jpg
	},
	dark: {
		ui: 'pastel',
		mainColors: '#d4af37|#0b2d5b|#c1e5a9|#a1a6d3|#e2a9db', // primary|secondary|accent|info|warning|success|error
		bgColors: '#000000|#0d0d0d|#222222', // --color-base-100|--color-base-200|--color-base-300
		textColor: '#d4af37', // --color-base-content
		bgImage: '/images/common/gift-dark-blur.webp', // bgImage ex: /images/common/bg-light.jpg
	},
	bg:   { blur: true, quality: 'medium', concept: 'bubbles', tint: '#ff8fa3', deg: 180, speed: 0.9, size: '2~5', push: true, pushRadius: 180, pushStrength: 60 },
};

// ── bar + menus + footer ─────────────────────────────────────────────────────────────────
export const contact = companyContact({
	vi: 'Chuyên cung cấp giải pháp quà tặng chuyên nghiệp, giúp doanh nghiệp chọn đúng quà, đúng ngân sách và đúng dấu ấn thương hiệu. Từ món quà nhỏ đến những kết nối lớn.',
	en: 'Specializing in professional gift solutions, helping businesses choose the right gift, the right budget and the right brand impression. From small gifts to big connections.',
});
export const bar = companyBar(contact);
export const socials = companySocials;

export const menuSpecials = [
	{
		iconMobile: 'ri:home-line',
		text: { vi: 'Hỗ trợ khách hàng', en: 'Customer support' },
		full: true, // chiếm trọn hàng ngang trong grid cột của footer
		items: [
			// cùng giờ với companyHours (modules/company.js — openingHoursSpecification của trang chủ)
			{ text: { vi: 'Thời gian làm việc: 8:00 - 17:30 từ thứ 2 đến thứ 6. Thứ 7 từ 8:00 - 12:00 (Nghỉ chủ nhật và các ngày lễ)', en: 'Working hours: 8:00 AM - 5:30 PM, Monday to Friday. Saturday from 8:00 AM - 12:00 PM (Closed on Sundays and public holidays)' } },
		],
	},
];

export const menuItems = [
	{ iconMobile: 'ri:home-line', text: { vi: 'Trang chủ', en: 'Home' }, href: '/' },
	{
		iconMobile: 'ri:building-4-line',
		text: { vi: 'Quà tặng doanh nghiệp', en: 'Corporate Gifts' },
		items: categoryMenuItems(),
	},
	{
		iconMobile: 'ri:price-tag-3-line',
		text: { vi: 'Theo ngân sách', en: 'By Budget' },
		items: budgetTiers.map((tier) => ({ text: tier.label, href: budgetPath(tier.key) })),
	},
	{
		iconMobile: 'ri:gift-2-line',
		text: { vi: 'Dịch vụ', en: 'Services' },
		items: giftServices.map((svc) => ({ text: svc.title, href: `/gift/service/${svc.slug}` })),
	},
];

// footer dùng menuItems trước, menuSpecials xếp dưới cùng (chiếm trọn hàng) — menu top nav vẫn giữ nguyên menuItems
export const footerMenuItems = [...menuItems, ...menuSpecials];

// 4 chính sách công ty (thanh toán, vận chuyển, đổi trả/hoàn tiền, bảo mật) — nội dung song ngữ
// đầy đủ tại src/modules/gift/policies.js, render tại src/pages/gift/policy/[slug].astro
export const policies = policyDocs.map((doc) => ({ text: doc.title, href: `/gift/policy/${doc.slug}` }));

/** Props chung của Core / CoreShop cho mọi trang giftoraddk.com dùng menu gift. */
export const chrome = {
	menu: { type: 'top', position: 'prefix', menuItems },
	footer: { columns: footerMenuItems, policies, socials, contact, bg: { blur: true }, grid: 'grid-cols-1 sm:grid-cols-3' },
	bar,
	bg: variant.bg,
	theme: variant.theme,
	variant,
};

// Khung kiểu tints — trang chủ '/', 3 trang mua sắm (/gift/shop, /gift/<danh mục>, /gift/<ngân sách>), /gift/service/<slug>,
// /gift/policy/<slug>: chỉ 1 lớp glow
// tints [primary, secondary] trên nền base-100 — tắt <svc-underlay> của layout (bg: null) và của footer (footer.bg: null),
// bỏ ảnh nền bg-wrap (bỏ bgImage khỏi variant → không có --bg-wrap-image, xem services/tools/page.js themeCSS).
// Underlay theo từng section của <web-board> tắt riêng ở nội dung trang — bọc sections bằng tintsSections() bên dưới.
const withoutBgImage = ({ bgImage, ...cfg }) => cfg;
export const tintsChrome = {
	...chrome,
	bg: null,
	footer: { ...chrome.footer, bg: null },
	tints: ['primary', 'secondary'],
	variant: { ...variant, light: withoutBgImage(variant.light), dark: withoutBgImage(variant.dark) },
};

// ── Kiểu tints ────────────────────────────────────────────────────────────────
// Nền trang chỉ còn 1 lớp glow tints của layout (tintsChrome ở trên) — bỏ mọi `bg` (blob <svc-underlay>,
// web-board/web-box render từ config.bg) của section. `bg` ở card (`each`) hoặc khung con (vd khung slider) đổi thành
// bề mặt trung tính: base-100 gần đặc + viền mảnh, bo góc theo bg.rounded, không đổ bóng (giống panel svc-node).
const PANEL = {
	background: 'color-mix(in oklab, var(--color-base-100) 92%, transparent)',
	border: '1px solid color-mix(in oklab, var(--color-base-content) 9%, transparent)',
};
function tintsConfig(node, isRoot = true) {
	if (Array.isArray(node)) return node.map((n) => tintsConfig(n, false));
	if (!node || typeof node !== 'object') return node;
	const { bg, children, ...rest } = node;
	const out = children === undefined ? rest : { ...rest, children: tintsConfig(children, false) };
	// bg ở gốc config không có `each` = nền cả section (recursive-render.js sectionBg) → bỏ hẳn, glow layout xuyên qua.
	const sectionBg = isRoot && node.each === undefined;
	if (bg && !sectionBg) out.style = { ...PANEL, borderRadius: bg.rounded ?? '1rem', ...node.style };
	return out;
}
export const tintsSections = (sections) => sections.map((sec) => (sec.config ? { ...sec, config: tintsConfig(sec.config) } : sec));
