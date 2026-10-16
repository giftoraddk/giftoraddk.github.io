// src/services/shared/tags.ts — danh mục quà tặng doanh nghiệp + bảng màu: NGUỒN DUY NHẤT cho menu, route tĩnh
// src/pages/gift/[group].astro, sitemap.xml/llms.txt và bộ lọc sản phẩm theo tag. Trang nào cần danh mục
// thì import hàm ở đây thay vì tự tính lại (Object.keys, nhãn, biến thể tag...).
//
// 5 danh mục — site định vị quà tặng doanh nghiệp B2B (thay hẳn occasions cá nhân cũ: sinh nhật, valentine...).
import { normText } from '@/services/tools/util';

export type Lang = 'vi' | 'en';
export type Localized<K extends string> = Record<Lang, Record<K, string>>;

// ── Danh mục quà tặng doanh nghiệp ─────────────────────────────────────────────────────────────

// Thứ tự ở đây = thứ tự trong menu / sitemap / llms.txt. Thêm danh mục: thêm key ở đây — TypeScript buộc bổ
// sung đủ nhãn vi/en và SEO copy bên dưới (Record<CategoryKey, …> không cho thiếu key).
export const CATEGORY_KEYS = ['employee', 'customer', 'event', 'appreciation', 'tet'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const corporateGiftCategories: Localized<CategoryKey> = {
	vi: {
		employee: 'Quà nhân viên',
		customer: 'Quà khách hàng',
		event: 'Quà sự kiện',
		appreciation: 'Quà tri ân',
		tet: 'Quà Tết',
	},
	en: {
		employee: 'Employee Gifts',
		customer: 'Customer Gifts',
		event: 'Event Gifts',
		appreciation: 'Appreciation Gifts',
		tet: 'Tet Gifts',
	},
};

// SEO/GEO copy riêng từng danh mục (thay vì 1 title/description chung) — mỗi trang trả lời đúng intent tìm
// kiếm/AI Search của danh mục đó, không trùng lặp nội dung giữa các trang /gift/[group].
const CATEGORY_SEO: Record<CategoryKey, { title: string; description: string }> = {
	employee: {
		title: 'Quà Tặng Nhân Viên Ý Nghĩa – Gắn Kết Đội Ngũ',
		description: 'Gợi ý quà tặng nhân viên ý nghĩa, tinh tế cho các dịp lễ, Tết, khen thưởng. Giftora DDK cung cấp quà tặng chất lượng, in logo theo yêu cầu, giao số lượng lớn toàn quốc.',
	},
	customer: {
		title: 'Quà Tặng Khách Hàng Sang Trọng – Tri Ân & Kết Nối',
		description: 'Quà tặng khách hàng cao cấp, tinh tế, giúp doanh nghiệp giữ chân và tri ân khách hàng thân thiết. Giftora DDK có đa dạng mẫu mã, đóng gói sang trọng, giao hàng nhanh.',
	},
	event: {
		title: 'Quà Tặng Sự Kiện Doanh Nghiệp – Ấn Tượng & Chuyên Nghiệp',
		description: 'Quà tặng sự kiện doanh nghiệp (khai trương, hội nghị, roadshow...) ấn tượng, đúng thương hiệu. Giftora DDK hỗ trợ in logo, đóng gói và giao hàng đúng tiến độ sự kiện.',
	},
	appreciation: {
		title: 'Quà Tặng Tri Ân Đối Tác – Chuyên Nghiệp & Tinh Tế',
		description: 'Quà tặng tri ân khách hàng, đối tác thể hiện sự trân trọng và gắn kết lâu dài. Giftora DDK cung cấp set quà tri ân cao cấp, in logo theo yêu cầu, giao hàng toàn quốc.',
	},
	tet: {
		title: 'Quà Tết Doanh Nghiệp – Sang Trọng, Đậm Đà Bản Sắc',
		description: 'Gợi ý quà Tết doanh nghiệp sang trọng, ý nghĩa để biếu tặng nhân viên, khách hàng và đối tác dịp Tết. Giftora DDK có đa dạng set quà Tết cao cấp, giao hàng tận nơi kịp đón năm mới.',
	},
};

/** Type guard — vd thu hẹp Astro.params (`string | undefined`) về CategoryKey. */
export const isCategoryKey = (k: unknown): k is CategoryKey =>
	typeof k === 'string' && (CATEGORY_KEYS as readonly string[]).includes(k);

/** Nhãn song ngữ `{ vi, en }` — dùng thẳng cho field đa ngôn ngữ (menu, I18nText, web-cell). */
export const categoryLabel = (key: CategoryKey) => ({
	vi: corporateGiftCategories.vi[key],
	en: corporateGiftCategories.en[key],
});

/** URL trang danh mục — khớp route src/pages/gift/[group].astro. */
export const categoryPath = (key: CategoryKey) => `/gift/${key}`;

/** title/description SEO của trang danh mục. */
export const categorySeo = (key: CategoryKey) => CATEGORY_SEO[key];

/** Mục menu con "Quà tặng doanh nghiệp" — cùng thứ tự CATEGORY_KEYS. */
export const categoryMenuItems = () => CATEGORY_KEYS.map((key) => ({ text: categoryLabel(key), href: categoryPath(key) }));

/**
 * Mọi dạng tag mà dữ liệu sản phẩm (API) có thể dùng để gắn 1 danh mục — coi như tương đương khi lọc
 * (filterState.active của section sản phẩm): key dash ('client-partner'), key underscore cũ (tương thích
 * ngược), key có khoảng trắng, nhãn tiếng Việt có dấu, không dấu (khoảng trắng / liền / '_' / '-'), nhãn tiếng Anh.
 */
export function categoryTagVariants(key: CategoryKey): string[] {
	const { vi, en } = categoryLabel(key);
	const normVi = normText(vi);
	return [...new Set([
		key,
		key.replace(/-/g, '_'),
		key.replace(/-/g, ' '),
		vi,
		normVi,
		normVi.replace(/\s+/g, ''),
		normVi.replace(/\s+/g, '_'),
		normVi.replace(/\s+/g, '-'),
		en,
	].filter(Boolean))];
}

// Từ khoá (không dấu, chữ thường) nhận diện danh mục từ tag tự do của sản phẩm — tag CHỨA trọn cụm từ (theo ranh giới
// từ) thì thuộc danh mục, vd "Quà Tặng Đồng Nghiệp" → employee, "Quà Tặng Sự Kiện" → event. Bổ sung cho
// categoryTagVariants (khớp nguyên văn) vì tag nhập tay hiếm khi trùng đúng tên danh mục. Record<CategoryKey, …> buộc
// danh mục mới phải có từ khoá.
const CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
	employee: ['nhan vien', 'dong nghiep', 'welcome kit', 'onboarding'],
	customer: ['khach hang', 'doi tac'],
	event: ['su kien', 'hoi nghi', 'hoi thao', 'khai truong', 'roadshow'],
	appreciation: ['tri an', 'cam on', 'nha giao', 'thay co'],
	tet: ['qua tet', 'tet nguyen dan', 'tet am lich', 'nam moi'],
};

const words = (text: string) => ` ${normText(text).replace(/[^a-z0-9]+/g, ' ').trim()} `;
let exactTags: Map<string, CategoryKey> | undefined;

/** Danh mục của 1 tag sản phẩm: khớp nguyên văn (categoryTagVariants) trước, rồi tới từ khoá; không thuộc danh mục nào → []. */
export function categoriesOfTag(tag: string): CategoryKey[] {
	exactTags ??= new Map(CATEGORY_KEYS.flatMap((key) => categoryTagVariants(key).map((v) => [normText(v).trim(), key] as const)));
	const exact = exactTags.get(normText(tag).trim());
	if (exact) return [exact];
	const w = words(tag);
	return CATEGORY_KEYS.filter((key) => CATEGORY_KEYWORDS[key].some((kw) => w.includes(` ${kw} `)));
}

// ── Màu sắc ────────────────────────────────────────────────────────────────────────────────────

export const COLOR_KEYS = ['beige', 'black', 'red', 'pink', 'brown', 'purple', 'white', 'yellow', 'gray', 'blue', 'green'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const colorTypes: Localized<ColorKey> = {
	vi: {
		beige: 'Be',
		black: 'Đen',
		red: 'Đỏ',
		pink: 'Hồng',
		brown: 'Nâu',
		purple: 'Tím',
		white: 'Trắng',
		yellow: 'Vàng',
		gray: 'Xám',
		blue: 'Xanh dương',
		green: 'Xanh lá',
	},
	en: {
		beige: 'Beige',
		black: 'Black',
		red: 'Red',
		pink: 'Pink',
		brown: 'Brown',
		purple: 'Purple',
		white: 'White',
		yellow: 'Yellow',
		gray: 'Gray',
		blue: 'Blue',
		green: 'Green',
	},
};
