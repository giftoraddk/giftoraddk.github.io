// Menu + SEO khu Everyday (/radar/*) — cùng vai trò modules/post/index.js: mọi trang truyền `menuItems` vào
// layouts/CoreMobile.astro (thanh menu đáy Nav/Mobile.astro trên mọi màn hình). Mục menu lấy từ PAGES/DOMAINS của
// packages/radar/everyday/tool/domains.js (1 nguồn với svc-everyday): Hub + 4 trang list (thời tiết đã ẩn) + Trending
// (/radar/app — bản đồ trend <svc-radar>, xem công khai; nút action chỉ hiện với admin). Link không kèm ?country=:
// svc-everyday tự dò quốc gia theo vị trí / nhớ lựa chọn tay (tool/countries.js).
import { PAGES, DOMAINS } from '@/packages/radar/everyday/tool/domains.js';

export const HUB = {
	path: '/radar/',
	title: 'Everyday',
	label: { vi: 'Everyday', en: 'Everyday' },
	desc: 'Quán ăn, khách sạn, phim và dịch vụ theo quốc gia: Việt Nam, Nhật Bản, Hàn Quốc, Mỹ, Anh, Trung Quốc, Đài Loan — cập nhật tự động mỗi ngày.',
	image: '/images/common/island.jpg',
};

export const TRENDING = {
	path: '/radar/app/',
	title: 'Trending',
	label: { vi: 'Trending', en: 'Trending' },
	desc: 'Bản đồ trend theo quốc gia và lĩnh vực — sản phẩm, video, chủ đề đang lên, cập nhật liên tục.',
	tints: ['primary', 'secondary'], // = TINT_DEFAULT (packages/node/tool/tints.js) — màu canvas mặc định của svc-radar
};

// Ảnh OG từng trang list (public/images/common) — đổi tại đây, trang chi tiết dùng chung ảnh của trang list.
const IMAGES = {
	food: '/images/common/foods.jpg',
	hotel: '/images/common/sea.jpg',
	service: '/images/common/cars.jpg',
	movie: '/images/common/dark.jpg',
};

export const pagePath = (domain) => `/radar/${domain}/`;
export const pageImage = (domain) => IMAGES[domain] ?? HUB.image;

/** Mục con của Everyday (sitelinks của Google): path + tên + mô tả — 1 nguồn cho JSON-LD (components/Everyday/Seo.astro),
 *  sitemap.xml và llms.txt. Tên = <title> của trang con, nên đặt ngắn, đúng nhãn menu. */
export const SECTIONS = [
	...Object.keys(PAGES).map((id) => ({ path: pagePath(id), name: PAGES[id].label.vi, desc: PAGES[id].desc })),
	{ path: TRENDING.path, name: TRENDING.title, desc: TRENDING.desc },
];

export const menuItems = [
	{ text: HUB.label, href: HUB.path, iconMobile: 'ri:home-5-line' },
	...Object.keys(PAGES).map((id) => ({ text: PAGES[id].label, href: pagePath(id), iconMobile: DOMAINS[id].icon })),
	{ text: TRENDING.label, href: TRENDING.path, iconMobile: 'ri:fire-line' },
];

// Cặp màu layout (CoreMobile.astro `tints` → màu bottom sheet của menu) theo lĩnh vực của trang — hub dùng cặp mặc định (của weather, domain vẫn còn trong DOMAINS).
export const tintsOf = (domain) => DOMAINS[domain]?.tints ?? DOMAINS.weather.tints;
